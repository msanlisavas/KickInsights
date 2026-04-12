/**
 * WebSocket Interceptor for KickInsights.
 *
 * Intercepts Kick's Pusher WebSocket messages to capture every chat message
 * in real-time, bypassing DOM virtualization issues entirely.
 *
 * This script injects a small hook into the page context (required because
 * content scripts can't access page-level WebSocket instances directly).
 * Chat events are forwarded to the content script via window.postMessage.
 */
const KI_WSInterceptor = {
  _started: false,

  start() {
    if (this._started) return;
    this._started = true;

    // Inject the interceptor into the page context
    const script = document.createElement('script');
    script.textContent = `(${this._pageScript.toString()})();`;
    (document.head || document.documentElement).appendChild(script);
    script.remove();

    console.log('[KickInsights] WebSocket interceptor injected');
  },

  /**
   * This function runs in the PAGE context (not content script).
   * It patches WebSocket to intercept Pusher chat messages.
   */
  _pageScript() {
    const OriginalWebSocket = window.WebSocket;
    const origAddEventListener = OriginalWebSocket.prototype.addEventListener;

    // Patch addEventListener to intercept 'message' handlers
    OriginalWebSocket.prototype.addEventListener = function(type, listener, options) {
      if (type === 'message') {
        const wrappedListener = function(event) {
          try {
            const data = JSON.parse(event.data);
            // Pusher chat message events
            if (data.event === 'App\\Events\\ChatMessageEvent' ||
                data.event === 'App\\Events\\ChatMessageSentEvent') {
              const payload = JSON.parse(data.data);
              const username = payload.sender?.username ||
                               payload.user?.username ||
                               payload.username;
              if (username) {
                window.postMessage({
                  type: 'KI_CHAT_MESSAGE',
                  username: username,
                  timestamp: Date.now(),
                }, '*');
              }
            }
          } catch (e) {
            // Not JSON or not a chat event — ignore
          }
          return listener.call(this, event);
        };
        return origAddEventListener.call(this, type, wrappedListener, options);
      }
      return origAddEventListener.call(this, type, listener, options);
    };

    // Also patch onmessage setter for WebSocket instances
    const origOnMessageDesc = Object.getOwnPropertyDescriptor(OriginalWebSocket.prototype, 'onmessage');
    if (origOnMessageDesc && origOnMessageDesc.set) {
      Object.defineProperty(OriginalWebSocket.prototype, 'onmessage', {
        set(fn) {
          const wrapped = function(event) {
            try {
              const data = JSON.parse(event.data);
              if (data.event === 'App\\Events\\ChatMessageEvent' ||
                  data.event === 'App\\Events\\ChatMessageSentEvent') {
                const payload = JSON.parse(data.data);
                const username = payload.sender?.username ||
                                 payload.user?.username ||
                                 payload.username;
                if (username) {
                  window.postMessage({
                    type: 'KI_CHAT_MESSAGE',
                    username: username,
                    timestamp: Date.now(),
                  }, '*');
                }
              }
            } catch (e) {}
            return fn.call(this, event);
          };
          origOnMessageDesc.set.call(this, wrapped);
        },
        get() {
          return origOnMessageDesc.get ? origOnMessageDesc.get.call(this) : undefined;
        },
        configurable: true,
      });
    }
  },
};

if (typeof module !== 'undefined') module.exports = { KI_WSInterceptor };
