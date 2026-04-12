global.KI_CONSTANTS = require('../src/shared/constants.js').KI_CONSTANTS;
const { KI_EstimationEngine } = require('../src/content/estimation-engine.js');

describe('KI_EstimationEngine', () => {
  describe('estimate', () => {
    test('calculates estimated viewers from unique chatters and participation rate', () => {
      const result = KI_EstimationEngine.estimate(100, 0.03);
      expect(result.estimatedViewers).toBeCloseTo(3333, 0);
    });

    test('returns 0 when no chatters', () => {
      const result = KI_EstimationEngine.estimate(0, 0.03);
      expect(result.estimatedViewers).toBe(0);
    });

    test('returns a range with low and high', () => {
      const result = KI_EstimationEngine.estimate(100, 0.03);
      expect(result.low).toBeLessThan(result.estimatedViewers);
      expect(result.high).toBeGreaterThan(result.estimatedViewers);
    });

    test('high uses optimistic rate (lower rate = more viewers)', () => {
      const result = KI_EstimationEngine.estimate(100, 0.03);
      // optimistic rate = 0.03 * 0.5 = 0.015 → 100/0.015 = 6667
      expect(result.high).toBeCloseTo(6667, 0);
    });

    test('low uses pessimistic rate (higher rate = fewer viewers)', () => {
      const result = KI_EstimationEngine.estimate(100, 0.03);
      // pessimistic rate = 0.03 * 2.0 = 0.06 → 100/0.06 = 1667
      expect(result.low).toBeCloseTo(1667, 0);
    });
  });

  describe('confidence', () => {
    test('returns "low" for fewer than 20 unique chatters', () => {
      const result = KI_EstimationEngine.estimate(10, 0.03);
      expect(result.confidence).toBe('low');
    });

    test('returns "medium" for 20-100 unique chatters', () => {
      const result = KI_EstimationEngine.estimate(50, 0.03);
      expect(result.confidence).toBe('medium');
    });

    test('returns "high" for more than 100 unique chatters', () => {
      const result = KI_EstimationEngine.estimate(150, 0.03);
      expect(result.confidence).toBe('high');
    });

    test('returns "medium" at exactly 20 chatters', () => {
      const result = KI_EstimationEngine.estimate(20, 0.03);
      expect(result.confidence).toBe('medium');
    });

    test('returns "high" at exactly 101 chatters', () => {
      const result = KI_EstimationEngine.estimate(101, 0.03);
      expect(result.confidence).toBe('high');
    });
  });
});
