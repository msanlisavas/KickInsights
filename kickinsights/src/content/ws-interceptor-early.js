/**
 * Early WebSocket Interceptor — runs in MAIN world at document_start.
 * Patches WebSocket BEFORE Kick's scripts connect, so we capture
 * every single Pusher chat message in real-time.
 */
(() => {
  const OriginalWebSocket = window.WebSocket;

  function interceptMessage(event) {
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
    } catch (e) {
      // Not JSON or not a chat event — ignore
    }
  }

  // Patch WebSocket constructor to add our listener to every new instance
  window.WebSocket = function(...args) {
    const ws = new OriginalWebSocket(...args);

    ws.addEventListener('message', interceptMessage);

    return ws;
  };

  // Copy static properties and prototype
  window.WebSocket.prototype = OriginalWebSocket.prototype;
  window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  window.WebSocket.OPEN = OriginalWebSocket.OPEN;
  window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
  window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;

  // Preserve instanceof checks
  Object.defineProperty(window.WebSocket, Symbol.hasInstance, {
    value: (instance) => instance instanceof OriginalWebSocket,
  });
})();
