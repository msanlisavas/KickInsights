const { KI_Census } = require('../src/content/census.js');

describe('KI_Census', () => {
  let census;

  beforeEach(() => {
    census = new KI_Census(60000);
  });

  describe('start/stop lifecycle', () => {
    test('is not active by default', () => {
      expect(census.isActive()).toBe(false);
    });

    test('becomes active after start', () => {
      census.start(100000);
      expect(census.isActive()).toBe(true);
    });

    test('records start time', () => {
      census.start(100000);
      expect(census.getStartTime()).toBe(100000);
    });

    test('becomes inactive after stop', () => {
      census.start(100000);
      census.stop();
      expect(census.isActive()).toBe(false);
    });
  });

  describe('recording users', () => {
    test('counts unique users during census', () => {
      census.start(100000);
      census.recordUser('alice', 110000);
      census.recordUser('bob', 120000);
      census.recordUser('alice', 130000);
      expect(census.getUniqueUserCount()).toBe(2);
    });

    test('ignores users recorded before census started', () => {
      census.start(100000);
      census.recordUser('early', 90000);
      expect(census.getUniqueUserCount()).toBe(0);
    });

    test('ignores users recorded after census window', () => {
      census.start(100000);
      census.recordUser('late', 200000);
      expect(census.getUniqueUserCount()).toBe(0);
    });
  });

  describe('getResult', () => {
    test('returns census result after stop', () => {
      census.start(100000);
      census.recordUser('a', 110000);
      census.recordUser('b', 120000);
      census.recordUser('c', 130000);
      census.stop();

      const result = census.getResult();
      expect(result.uniqueUsers).toBe(3);
      expect(result.startTime).toBe(100000);
    });

    test('returns null if census was never started', () => {
      expect(census.getResult()).toBeNull();
    });
  });

  describe('getRemainingMs', () => {
    test('returns remaining time in census window', () => {
      census.start(100000);
      expect(census.getRemainingMs(130000)).toBe(30000);
    });

    test('returns 0 when window has elapsed', () => {
      census.start(100000);
      expect(census.getRemainingMs(200000)).toBe(0);
    });
  });
});
