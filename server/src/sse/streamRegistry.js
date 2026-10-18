/**
 * Resumable, deduplicated SSE stream registry.
 *
 * Each logical turn owns a channel keyed by `${sessionId}:${turnIndex}`.
 * - The first request becomes the producer that calls the LLM.
 * - Reconnects within `sse.dedupWindowMs` attach to the same channel and replay
 *   buffered events after Last-Event-ID, so a flaky network never triggers a
 *   second (paid) generation.
 * - Completed channels are retained briefly for late reconnects.
 */
const config = require('../config/env');
const logger = require('../utils/logger');
const metrics = require('../utils/metrics');

const channels = new Map();

function formatFrame(id, event) {
  // Keep `data: {"type":...` compact and stable: existing clients and tests
  // depend on this prefix. `id:` enables Last-Event-ID resume.
  return `id: ${id}\ndata: ${JSON.stringify(event)}\n\n`;
}

class StreamChannel {
  constructor(key, meta = {}) {
    this.key = key;
    this.meta = meta;
    this.events = [];
    this.seq = 0;
    this.subscribers = new Map(); // res -> { heartbeat, lastEventId }
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
    this.completedAt = null;
    this.completed = false;
    this.failed = false;
    this.producerConnected = true;
  }

  isReusable() {
    if (!this.completedAt) return true;
    return Date.now() - this.completedAt <= config.sse.dedupWindowMs;
  }

  _record(event) {
    this.seq += 1;
    const record = { id: this.seq, event };
    this.events.push(record);
    if (this.events.length > config.sse.maxBufferedEvents) {
      this.events.splice(0, this.events.length - config.sse.maxBufferedEvents);
    }
    this.lastActivity = Date.now();
    return record;
  }

  _write(res, record) {
    if (!res || res.writableEnded) return false;
    try {
      res.write(formatFrame(record.id, record.event));
      if (typeof res.flush === 'function') res.flush();
      return true;
    } catch (err) {
      logger.warn('SSE write failed; dropping subscriber', { streamKey: this.key, error: err.message });
      metrics.inc('prepai_sse_write_errors_total');
      this._detach(res);
      return false;
    }
  }

  attach(res, lastEventId = 0, { heartbeat = true } = {}) {
    const numericLast = Number(lastEventId);
    const from = Number.isFinite(numericLast) && numericLast > 0 ? numericLast : 0;

    let heartbeatTimer = null;
    if (heartbeat && config.sse.heartbeatMs > 0) {
      heartbeatTimer = setInterval(() => {
        if (!res.writableEnded) {
          try {
            // SSE comment frame: keeps LB/proxy idle timers alive without
            // triggering the client's message handler.
            res.write(': ping\n\n');
            if (typeof res.flush === 'function') res.flush();
          } catch {
            this._detach(res);
          }
        }
      }, config.sse.heartbeatMs);
      if (heartbeatTimer.unref) heartbeatTimer.unref();
    }

    this.subscribers.set(res, { heartbeat: heartbeatTimer, lastEventId: from });

    // Replay buffered events the client has not seen.
    for (const record of this.events) {
      if (record.id > from) this._write(res, record);
    }

    res.once('close', () => this._detach(res));
    res.once('error', () => this._detach(res));

    if (this.completed) {
      this._endSubscriber(res);
    }

    return { replayed: this.events.filter((r) => r.id > from).length, from };
  }

  publish(event) {
    const record = this._record(event);
    for (const res of [...this.subscribers.keys()]) {
      this._write(res, record);
    }
    return record.id;
  }

  complete(finalEvent) {
    if (this.completed) return;
    if (finalEvent) this.publish(finalEvent);
    this.completed = true;
    this.completedAt = Date.now();
    this.producerConnected = false;
    this._endAll();
  }

  fail(errorMessage) {
    this.failed = true;
    this.publish({ type: 'error', error: errorMessage || 'Stream failed' });
    this.completed = true;
    this.completedAt = Date.now();
    this.producerConnected = false;
    this._endAll();
  }

  producerDisconnected() {
    this.producerConnected = false;
  }

  _endSubscriber(res) {
    const sub = this.subscribers.get(res);
    if (sub?.heartbeat) clearInterval(sub.heartbeat);
    this.subscribers.delete(res);
    try {
      if (!res.writableEnded) res.end();
    } catch {
      // ignore
    }
  }

  _endAll() {
    for (const res of [...this.subscribers.keys()]) {
      this._endSubscriber(res);
    }
  }

  _detach(res) {
    const sub = this.subscribers.get(res);
    if (sub?.heartbeat) clearInterval(sub.heartbeat);
    this.subscribers.delete(res);
  }

  snapshot() {
    return {
      key: this.key,
      seq: this.seq,
      buffered: this.events.length,
      subscribers: this.subscribers.size,
      completed: this.completed,
      failed: this.failed,
      ageMs: Date.now() - this.createdAt,
      lastActivityMs: Date.now() - this.lastActivity,
    };
  }
}

/**
 * Open or reuse a channel.
 * @returns {{ channel: StreamChannel, isNew: boolean }}
 */
function open(streamKey, meta = {}) {
  const existing = channels.get(streamKey);
  if (existing && existing.isReusable()) {
    metrics.inc('prepai_sse_stream_attached_total');
    return { channel: existing, isNew: false };
  }

  const channel = new StreamChannel(streamKey, meta);
  channels.set(streamKey, channel);
  metrics.inc('prepai_sse_stream_created_total');
  return { channel, isNew: true };
}

function get(streamKey) {
  return channels.get(streamKey) || null;
}

function cleanup() {
  const now = Date.now();
  const retention = Math.max(config.sse.dedupWindowMs * 2, 60000);
  for (const [key, channel] of channels) {
    if (channel.completedAt && now - channel.completedAt > retention) {
      channels.delete(key);
    }
  }
}

const cleanupTimer = setInterval(cleanup, 60000);
if (cleanupTimer.unref) cleanupTimer.unref();

function getStats() {
  return {
    channels: channels.size,
    active: [...channels.values()].filter((c) => !c.completed).length,
    channelsDetail: [...channels.values()].slice(0, 50).map((c) => c.snapshot()),
    dedupWindowMs: config.sse.dedupWindowMs,
  };
}

function closeAll() {
  for (const channel of channels.values()) {
    channel._endAll();
  }
  channels.clear();
}

module.exports = {
  open,
  get,
  cleanup,
  getStats,
  closeAll,
  StreamChannel,
  formatFrame,
};
