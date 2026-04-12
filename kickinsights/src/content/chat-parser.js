if (typeof KI_ChatParser !== 'undefined') { /* already loaded */ } else
var KI_ChatParser = class KI_ChatParser {
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
    // Kick uses virtualized chat with [data-index] divs.
    // If the node itself doesn't have data-index, check children.
    const msgNode = node.hasAttribute && node.hasAttribute('data-index')
      ? node
      : node.querySelector && node.querySelector('[data-index]');

    const target = msgNode || node;

    // Kick renders usernames as <button> elements inside chat messages
    const buttonEl = target.querySelector && target.querySelector('button');
    if (buttonEl) {
      const text = buttonEl.textContent.trim();
      if (text.length > 0 && text.length < 40) {
        return text;
      }
    }

    // Fallback: try common username selectors
    const usernameEl =
      target.querySelector && (
        target.querySelector('[class*="chat-entry-username"]') ||
        target.querySelector('[data-chat-entry-user-id]') ||
        target.querySelector('[class*="username"]')
      );

    if (usernameEl) {
      return usernameEl.textContent.trim() || null;
    }

    // Fallback: link elements
    const linkEl = target.querySelector && target.querySelector('a');
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
