/**
 * Enterprise Incident & Problem Tracker
 * Captures, categorizes, and tracks real-time system issues (5xx errors, LLM rate limits,
 * model timeouts, auth anomalies, slow queries) and auto-mitigation events.
 */

const crypto = require('crypto');
const logger = require('./logger');

class IncidentTracker {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.incidents = [];
    this.counters = {
      total: 0,
      active: 0,
      byCategory: {
        LLM_RATE_LIMIT_429: 0,
        LLM_TIMEOUT: 0,
        LLM_FALLBACK_TRIGGERED: 0,
        API_5XX: 0,
        CLIENT_4XX: 0,
        AUTH_ANOMALY: 0,
        DATABASE_SLOW: 0,
        SSE_DISCONNECT: 0,
        OTHER: 0,
      },
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
    };
  }

  recordIncident({
    category = 'OTHER',
    message,
    severity = 'medium',
    endpoint = '',
    method = '',
    statusCode = null,
    details = {},
    autoMitigated = false,
    mitigationNotes = '',
  }) {
    const id = `inc_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const incident = {
      id,
      timestamp,
      category,
      message,
      severity,
      endpoint,
      method,
      statusCode,
      details,
      autoMitigated,
      mitigationNotes: mitigationNotes || (autoMitigated ? 'Automatically mitigated via resilient multi-tier fallback' : 'Action required'),
      resolved: autoMitigated, // Auto-mitigated incidents start as resolved/handled
      resolvedAt: autoMitigated ? timestamp : null,
    };

    // Update counters
    this.counters.total++;
    if (!incident.resolved) {
      this.counters.active++;
    }

    if (this.counters.byCategory[category] !== undefined) {
      this.counters.byCategory[category]++;
    } else {
      this.counters.byCategory.OTHER++;
    }

    if (this.counters.bySeverity[severity] !== undefined) {
      this.counters.bySeverity[severity]++;
    }

    // Maintain circular window
    if (this.incidents.length >= this.maxSize) {
      const removed = this.incidents.shift();
      if (removed && !removed.resolved) {
        this.counters.active = Math.max(0, this.counters.active - 1);
      }
    }
    this.incidents.push(incident);

    logger.warn(`[INCIDENT_LOG] ${category} [${severity.toUpperCase()}]: ${message}`, {
      incidentId: id,
      endpoint,
      statusCode,
      autoMitigated,
    });

    return incident;
  }

  resolveIncident(id, resolutionNotes = '') {
    const inc = this.incidents.find((i) => i.id === id);
    if (inc && !inc.resolved) {
      inc.resolved = true;
      inc.resolvedAt = new Date().toISOString();
      if (resolutionNotes) {
        inc.mitigationNotes = resolutionNotes;
      }
      this.counters.active = Math.max(0, this.counters.active - 1);
      return inc;
    }
    return null;
  }

  getIncidents({ limit = 50, category, severity, unresolvedOnly = false } = {}) {
    let list = [...this.incidents].reverse();

    if (unresolvedOnly) {
      list = list.filter((i) => !i.resolved);
    }
    if (category) {
      list = list.filter((i) => i.category === category);
    }
    if (severity) {
      list = list.filter((i) => i.severity === severity);
    }

    return list.slice(0, Math.min(limit, this.maxSize));
  }

  getStats() {
    return {
      totalRecorded: this.counters.total,
      activeUnresolved: this.counters.active,
      byCategory: { ...this.counters.byCategory },
      bySeverity: { ...this.counters.bySeverity },
      recentSampleCount: this.incidents.length,
      latestIncident: this.incidents.length > 0 ? this.incidents[this.incidents.length - 1] : null,
    };
  }
}

const incidentTracker = new IncidentTracker(100);

module.exports = incidentTracker;
