class KI_Census {
  constructor(durationMs) {
    this._durationMs = durationMs;
    this._active = false;
    this._startTime = null;
    this._users = new Set();
    this._result = null;
  }

  start(nowMs) {
    this._active = true;
    this._startTime = nowMs;
    this._users = new Set();
    this._result = null;
  }

  stop() {
    this._active = false;
    this._result = {
      uniqueUsers: this._users.size,
      startTime: this._startTime,
      users: [...this._users],
    };
  }

  isActive() {
    return this._active;
  }

  getStartTime() {
    return this._startTime;
  }

  recordUser(username, timestampMs) {
    if (!this._active) return;
    if (timestampMs < this._startTime) return;
    if (timestampMs > this._startTime + this._durationMs) return;
    this._users.add(username);
  }

  getUniqueUserCount() {
    return this._users.size;
  }

  getResult() {
    return this._result;
  }

  getRemainingMs(nowMs) {
    if (!this._active || !this._startTime) return 0;
    const remaining = (this._startTime + this._durationMs) - nowMs;
    return Math.max(0, remaining);
  }
}

if (typeof module !== 'undefined') module.exports = { KI_Census };
