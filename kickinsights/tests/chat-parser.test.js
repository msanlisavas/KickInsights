const { KI_ChatParser } = require('../src/content/chat-parser.js');

describe('KI_ChatParser', () => {
  let parser;

  beforeEach(() => {
    parser = new KI_ChatParser();
  });

  describe('processMessage', () => {
    test('records a chat message with username and timestamp', () => {
      parser.processMessage('user1', 1000);
      const events = parser.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ username: 'user1', timestamp: 1000 });
    });

    test('records multiple messages from different users', () => {
      parser.processMessage('user1', 1000);
      parser.processMessage('user2', 1500);
      parser.processMessage('user3', 2000);
      expect(parser.getEvents()).toHaveLength(3);
    });

    test('records duplicate usernames as separate events', () => {
      parser.processMessage('user1', 1000);
      parser.processMessage('user1', 2000);
      expect(parser.getEvents()).toHaveLength(2);
    });
  });

  describe('getUniqueChatterCount', () => {
    test('counts unique usernames within time window', () => {
      const now = 300000;
      parser.processMessage('user1', 100000);
      parser.processMessage('user2', 200000);
      parser.processMessage('user1', 250000);
      parser.processMessage('user3', 290000);
      expect(parser.getUniqueChatterCount(now, 300000)).toBe(3);
    });

    test('excludes messages outside the window', () => {
      const now = 600000;
      const window = 300000;
      parser.processMessage('user1', 100000);
      parser.processMessage('user2', 400000);
      expect(parser.getUniqueChatterCount(now, window)).toBe(1);
    });
  });

  describe('getChatRate', () => {
    test('calculates messages per minute', () => {
      const now = 120000;
      const window = 120000;
      parser.processMessage('user1', 10000);
      parser.processMessage('user2', 30000);
      parser.processMessage('user1', 60000);
      parser.processMessage('user3', 90000);
      expect(parser.getChatRate(now, window)).toBe(2);
    });

    test('returns 0 when no messages in window', () => {
      expect(parser.getChatRate(100000, 100000)).toBe(0);
    });
  });

  describe('pruneOldEvents', () => {
    test('removes events outside the window', () => {
      parser.processMessage('user1', 1000);
      parser.processMessage('user2', 5000);
      parser.processMessage('user3', 9000);
      parser.pruneOldEvents(10000, 5000);
      expect(parser.getEvents()).toHaveLength(2);
    });
  });

  describe('extractUsernameFromNode', () => {
    test('extracts username from a button element (Kick format)', () => {
      const node = document.createElement('div');
      node.setAttribute('data-index', '42');
      node.innerHTML = '<div class="group"><button>wexcoon</button><span>:</span><span>hello</span></div>';
      const username = KI_ChatParser.extractUsernameFromNode(node);
      expect(username).toBe('wexcoon');
    });

    test('extracts username from chat-entry-username fallback', () => {
      const node = document.createElement('div');
      node.innerHTML = '<span class="chat-entry-username" data-chat-entry-user-id="123">TestUser</span><span>hello</span>';
      const username = KI_ChatParser.extractUsernameFromNode(node);
      expect(username).toBe('TestUser');
    });

    test('falls back to link-like elements with user text', () => {
      const node = document.createElement('div');
      node.innerHTML = '<a class="something">StreamFan</a><span>hey everyone</span>';
      const username = KI_ChatParser.extractUsernameFromNode(node);
      expect(username).toBe('StreamFan');
    });

    test('returns null for nodes without username patterns', () => {
      const node = document.createElement('div');
      node.textContent = 'just some text';
      const username = KI_ChatParser.extractUsernameFromNode(node);
      expect(username).toBeNull();
    });
  });
});
