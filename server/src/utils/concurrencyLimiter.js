/**
 * In-process FIFO semaphore used to cap concurrent LLM calls per instance.
 *
 * Why not p-limit: we need bounded queueing, acquisition timeouts, metrics and
 * a shutdown drain hook. This implementation is dependency-free and testable.
 */

class QueueTimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'QueueTimeoutError';
    this.code = 'LLM_QUEUE_TIMEOUT';
  }
}

class QueueFullError extends Error {
  constructor(message) {
    super(message);
    this.name = 'QueueFullError';
    this.code = 'LLM_QUEUE_FULL';
  }
}

class Semaphore {
  constructor({
    name = 'semaphore',
    maxConcurrent = 10,
    maxQueue = 100,
    acquireTimeoutMs = 15000,
    onChange = null,
  } = {}) {
    this.name = name;
    this.maxConcurrent = Math.max(1, maxConcurrent);
    this.maxQueue = Math.max(0, maxQueue);
    this.acquireTimeoutMs = Math.max(100, acquireTimeoutMs);
    this.active = 0;
    this.queue = [];
    this.totalAcquired = 0;
    this.totalRejected = 0;
    this.totalTimedOut = 0;
    this.peakActive = 0;
    this.onChange = typeof onChange === 'function' ? onChange : null;
  }

  #emit(event) {
    if (!this.onChange) return;
    try {
      this.onChange(this.stats(), event);
    } catch {
      // Observability must never break the semaphore.
    }
  }

  acquire() {
    if (this.active < this.maxConcurrent) {
      this.active++;
      this.totalAcquired++;
      this.peakActive = Math.max(this.peakActive, this.active);
      this.#emit('acquired');
      return Promise.resolve(this.#makeRelease());
    }

    if (this.queue.length >= this.maxQueue) {
      this.totalRejected++;
      this.#emit('rejected');
      return Promise.reject(
        new QueueFullError(`${this.name} queue is full (${this.maxQueue}). Shedding load.`)
      );
    }

    return new Promise((resolve, reject) => {
      const waiter = {
        resolve,
        reject,
        timer: null,
      };

      waiter.timer = setTimeout(() => {
        const index = this.queue.indexOf(waiter);
        if (index !== -1) this.queue.splice(index, 1);
        this.totalTimedOut++;
        this.#emit('timeout');
        reject(new QueueTimeoutError(`${this.name} acquisition timed out after ${this.acquireTimeoutMs}ms.`));
      }, this.acquireTimeoutMs);
      if (waiter.timer.unref) waiter.timer.unref();

      this.queue.push(waiter);
      this.#emit('queued');
    });
  }

  #makeRelease() {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active = Math.max(0, this.active - 1);
      this.#emit('released');
      this.#dispatch();
    };
  }

  #dispatch() {
    while (this.active < this.maxConcurrent && this.queue.length > 0) {
      const waiter = this.queue.shift();
      if (waiter.timer) clearTimeout(waiter.timer);
      this.active++;
      this.totalAcquired++;
      this.peakActive = Math.max(this.peakActive, this.active);
      this.#emit('dispatched');
      waiter.resolve(this.#makeRelease());
    }
  }

  /**
   * Reject all queued waiters (used on graceful shutdown so requests fail fast
   * instead of hanging until the LB timeout).
   */
  drain(reason = 'Server is shutting down') {
    const queued = this.queue.splice(0, this.queue.length);
    queued.forEach((waiter) => {
      if (waiter.timer) clearTimeout(waiter.timer);
      waiter.reject(new QueueTimeoutError(reason));
    });
    this.#emit('drained');
    return queued.length;
  }

  stats() {
    return {
      name: this.name,
      maxConcurrent: this.maxConcurrent,
      active: this.active,
      queued: this.queue.length,
      maxQueue: this.maxQueue,
      totalAcquired: this.totalAcquired,
      totalRejected: this.totalRejected,
      totalTimedOut: this.totalTimedOut,
      peakActive: this.peakActive,
    };
  }
}

module.exports = {
  Semaphore,
  QueueTimeoutError,
  QueueFullError,
};
