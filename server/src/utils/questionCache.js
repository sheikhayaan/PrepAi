/**
 * In-Memory LRU/TTL Cache for Generated Opening Questions
 * Prevents redundant LLM API calls and cost blowup for identical interview configurations
 */

class QuestionCache {
  constructor(ttlMs = 60 * 60 * 1000, maxSize = 200) {
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  _getKey({ sessionType, companyTier, targetCompany, seniorityLevel }) {
    const norm = (str) => (str || '').trim().toLowerCase();
    return `${norm(sessionType)}:${norm(companyTier)}:${norm(targetCompany)}:${norm(seniorityLevel)}`;
  }

  get(params) {
    const key = this._getKey(params);
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.question;
  }

  set(params, question) {
    if (!question) return;
    const key = this._getKey(params);

    // Evict oldest if capacity reached
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      question,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  clear() {
    this.cache.clear();
  }
}

const questionCache = new QuestionCache();
module.exports = questionCache;
