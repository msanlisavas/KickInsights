global.KI_Format = require('../src/shared/format.js').KI_Format;
const { KI_SummaryCard } = require('../src/popup/summary-card.js');

describe('KI_SummaryCard', () => {
  describe('buildData', () => {
    test('extracts summary data from a session', () => {
      const session = {
        channelName: 'testStreamer',
        startTime: '2026-04-12T18:00:00Z',
        endTime: '2026-04-12T20:00:00Z',
        duration: 7200,
        snapshots: [
          { time: '2026-04-12T18:00:00Z', kickCount: 3000, estimatedCount: 8000, uniqueChatters: 400, chatRate: 40 },
          { time: '2026-04-12T19:00:00Z', kickCount: 3500, estimatedCount: 9000, uniqueChatters: 450, chatRate: 50 },
          { time: '2026-04-12T20:00:00Z', kickCount: 3200, estimatedCount: 8500, uniqueChatters: 420, chatRate: 45 },
        ],
        censuses: [
          { time: '2026-04-12T19:30:00Z', uniqueUsers: 1200, kickCountAtTime: 3300, derivedRate: 0.06 },
        ],
        summary: {
          avgKickCount: 3233,
          avgEstimatedCount: 8500,
          peakEstimated: 9000,
          totalUniqueChatters: 800,
        },
      };

      const data = KI_SummaryCard.buildData(session);

      expect(data.channelName).toBe('testStreamer');
      expect(data.date).toMatch(/Apr/);
      expect(data.duration).toBe('2:00:00');
      expect(data.avgKick).toBe('3.2K');
      expect(data.avgEstimated).toBe('8.5K');
      expect(data.peakEstimated).toBe('9K');
      expect(data.censusCount).toBe(1);
    });
  });
});
