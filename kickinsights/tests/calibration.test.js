const { KI_Calibration } = require('../src/content/calibration.js');

describe('KI_Calibration', () => {
  describe('computeWeightedRate', () => {
    test('returns default rate when no census history', () => {
      const rate = KI_Calibration.computeWeightedRate([], 0.05);
      expect(rate).toBe(0.05);
    });

    test('returns the derived rate from a single census', () => {
      const history = [
        { timestamp: '2026-04-12T19:00:00Z', derivedRate: 0.07 },
      ];
      const rate = KI_Calibration.computeWeightedRate(history, 0.05);
      expect(rate).toBeCloseTo(0.07);
    });

    test('weights recent censuses more heavily', () => {
      const history = [
        { timestamp: '2026-04-10T19:00:00Z', derivedRate: 0.03 },
        { timestamp: '2026-04-12T19:00:00Z', derivedRate: 0.09 },
      ];
      const rate = KI_Calibration.computeWeightedRate(history, 0.05);
      expect(rate).toBeGreaterThan(0.06);
      expect(rate).toBeLessThan(0.09);
    });

    test('handles three censuses with increasing recency weight', () => {
      const history = [
        { timestamp: '2026-04-08T19:00:00Z', derivedRate: 0.04 },
        { timestamp: '2026-04-10T19:00:00Z', derivedRate: 0.06 },
        { timestamp: '2026-04-12T19:00:00Z', derivedRate: 0.08 },
      ];
      const rate = KI_Calibration.computeWeightedRate(history, 0.05);
      expect(rate).toBeGreaterThan(0.06);
    });
  });

  describe('deriveCensusRate', () => {
    test('calculates participation rate from census data', () => {
      const result = KI_Calibration.deriveCensusRate(500, 200, 3000);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
    });

    test('returns a rate clamped between 0.01 and 0.5', () => {
      const low = KI_Calibration.deriveCensusRate(1000, 2, 5000);
      expect(low).toBeGreaterThanOrEqual(0.01);

      const high = KI_Calibration.deriveCensusRate(100, 90, 200);
      expect(high).toBeLessThanOrEqual(0.5);
    });
  });

  describe('getTrend', () => {
    test('returns "stable" for single census', () => {
      const history = [{ derivedRate: 0.05 }];
      expect(KI_Calibration.getTrend(history)).toBe('stable');
    });

    test('returns "trending up" when rates increase', () => {
      const history = [
        { derivedRate: 0.03 },
        { derivedRate: 0.05 },
        { derivedRate: 0.07 },
      ];
      expect(KI_Calibration.getTrend(history)).toBe('trending up');
    });

    test('returns "trending down" when rates decrease', () => {
      const history = [
        { derivedRate: 0.09 },
        { derivedRate: 0.06 },
        { derivedRate: 0.03 },
      ];
      expect(KI_Calibration.getTrend(history)).toBe('trending down');
    });

    test('returns "stable" when rates fluctuate within 10%', () => {
      const history = [
        { derivedRate: 0.050 },
        { derivedRate: 0.051 },
        { derivedRate: 0.049 },
      ];
      expect(KI_Calibration.getTrend(history)).toBe('stable');
    });
  });
});
