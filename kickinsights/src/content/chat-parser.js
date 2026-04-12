class KI_ChatParser {
  constructor() {
    this._events = [];
  }

  processMessage(username, timestamp) {
    this._events.push({ username, timestamp });
  }

  getEvents() {
    return this._events;
  }

  getUniqueChatterCount(now, windowMs) {
    const cutoff = now - windowMs;
    const usernames = new Set();
    for (const event of this._events) {
      if (event.timestamp >= cutoff) {
        usernames.add(event.username);
      }
    }
    return usernames.size;
  }

  getChatRate(now, windowMs) {
    const cutoff = now - windowMs;
    let count = 0;
    for (const event of this._events) {
      if (event.timestamp >= cutoff) {
        count++;
      }
    }
    const minutes = windowMs / 60000;
    return minutes > 0 ? Math.round(count / minutes) : 0;
  }

  pruneOldEvents(now, windowMs) {
    const cutoff = now - windowMs;
    this._events = this._events.filter(e => e.timestamp >= cutoff);
  }

  static extractUsernameFromNode(node) {
    const usernameEl =
      node.querySelector('[class*="chat-entry-username"]') ||
      node.querySelector('[data-chat-entry-user-id]') ||
      node.querySelector('[class*="username"]');

    if (usernameEl) {
      return usernameEl.textContent.trim() || null;
    }

    const linkEl = node.querySelector('a');
    if (linkEl && linkEl.textContent.trim().length > 0 && linkEl.textContent.trim().length < 40) {
      return linkEl.textContent.trim();
    }

    return null;
  }

  reset() {
    this._events = [];
  }
}

if (typeof module !== 'undefined') module.exports = { KI_ChatParser };
