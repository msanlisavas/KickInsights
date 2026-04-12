// Mock chrome.storage.local
const mockStorage = {};
global.chrome = {
  storage: {
    local: {
      get: jest.fn((keys, cb) => {
        const result = {};
        const keyList = Array.isArray(keys) ? keys : [keys];
        keyList.forEach(k => { if (mockStorage[k] !== undefined) result[k] = mockStorage[k]; });
        if (cb) cb(result);
        return Promise.resolve(result);
      }),
      set: jest.fn((items, cb) => {
        Object.assign(mockStorage, items);
        if (cb) cb();
        return Promise.resolve();
      }),
      remove: jest.fn((keys, cb) => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        keyList.forEach(k => delete mockStorage[k]);
        if (cb) cb();
        return Promise.resolve();
      }),
    },
  },
};

// Make KI_CONSTANTS available as a global (mimics browser content script loading order)
global.KI_CONSTANTS = require('../src/shared/constants.js').KI_CONSTANTS;

const { KI_Storage } = require('../src/shared/storage.js');

beforeEach(() => {
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  jest.clearAllMocks();
});

describe('KI_Storage', () => {
  describe('saveSession', () => {
    test('saves a session and retrieves it', async () => {
      const session = {
        channelName: 'testStreamer',
        sessionId: '2026-04-12T18:00:00Z',
        startTime: '2026-04-12T18:00:00Z',
        endTime: '2026-04-12T20:00:00Z',
        duration: 7200,
        snapshots: [],
        censuses: [],
        summary: { avgKickCount: 3000, avgEstimatedCount: 8000, peakEstimated: 10000, totalUniqueChatters: 500 },
      };
      await KI_Storage.saveSession(session);
      const sessions = await KI_Storage.getSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].channelName).toBe('testStreamer');
    });
  });

  describe('getCalibrationProfile', () => {
    test('returns default profile if none exists', async () => {
      const profile = await KI_Storage.getCalibrationProfile('newChannel');
      expect(profile.learnedParticipationRate).toBe(0.05);
      expect(profile.censusHistory).toEqual([]);
    });

    test('returns saved profile', async () => {
      const profile = {
        channelName: 'savedChannel',
        learnedParticipationRate: 0.07,
        censusHistory: [{ timestamp: '2026-04-12T19:00:00Z', uniqueUsers: 100, derivedRate: 0.07 }],
        lastUpdated: '2026-04-12T19:00:00Z',
      };
      await KI_Storage.saveCalibrationProfile(profile);
      const result = await KI_Storage.getCalibrationProfile('savedChannel');
      expect(result.learnedParticipationRate).toBe(0.07);
    });
  });

  describe('getSettings', () => {
    test('returns defaults when no settings saved', async () => {
      const settings = await KI_Storage.getSettings();
      expect(settings.participationRate).toBe(0.05);
      expect(settings.rollingWindowMs).toBe(300000);
    });
  });

  describe('pruneOldSessions', () => {
    test('removes sessions older than retention period but keeps summaries', async () => {
      const oldSession = {
        channelName: 'old',
        sessionId: '2026-01-01T00:00:00Z',
        startTime: '2026-01-01T00:00:00Z',
        endTime: '2026-01-01T02:00:00Z',
        duration: 7200,
        snapshots: [{ time: '2026-01-01T00:05:00Z', kickCount: 100, estimatedCount: 200, uniqueChatters: 10, chatRate: 5 }],
        censuses: [],
        summary: { avgKickCount: 100, avgEstimatedCount: 200, peakEstimated: 250, totalUniqueChatters: 50 },
      };
      const recentSession = {
        channelName: 'recent',
        sessionId: '2026-04-11T00:00:00Z',
        startTime: '2026-04-11T00:00:00Z',
        endTime: '2026-04-11T02:00:00Z',
        duration: 7200,
        snapshots: [{ time: '2026-04-11T00:05:00Z', kickCount: 500, estimatedCount: 1000, uniqueChatters: 50, chatRate: 20 }],
        censuses: [],
        summary: { avgKickCount: 500, avgEstimatedCount: 1000, peakEstimated: 1200, totalUniqueChatters: 200 },
      };
      await KI_Storage.saveSession(oldSession);
      await KI_Storage.saveSession(recentSession);

      await KI_Storage.pruneOldSessions(new Date('2026-04-12T00:00:00Z'));

      const sessions = await KI_Storage.getSessions();
      const old = sessions.find(s => s.channelName === 'old');
      const recent = sessions.find(s => s.channelName === 'recent');

      expect(recent.snapshots).toHaveLength(1);
      expect(old.snapshots).toEqual([]);
      expect(old.summary.avgKickCount).toBe(100);
    });
  });
});
