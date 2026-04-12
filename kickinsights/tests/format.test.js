const { KI_Format } = require('../src/shared/format.js');

describe('KI_Format', () => {
  describe('compactNumber', () => {
    test('returns "0" for zero', () => {
      expect(KI_Format.compactNumber(0)).toBe('0');
    });

    test('returns number as-is below 1000', () => {
      expect(KI_Format.compactNumber(999)).toBe('999');
    });

    test('formats thousands with K suffix', () => {
      expect(KI_Format.compactNumber(3200)).toBe('3.2K');
    });

    test('formats tens of thousands', () => {
      expect(KI_Format.compactNumber(28500)).toBe('28.5K');
    });

    test('formats millions with M suffix', () => {
      expect(KI_Format.compactNumber(1500000)).toBe('1.5M');
    });

    test('drops trailing zero after decimal', () => {
      expect(KI_Format.compactNumber(5000)).toBe('5K');
    });
  });

  describe('formatDuration', () => {
    test('formats seconds to h:mm:ss', () => {
      expect(KI_Format.formatDuration(3661)).toBe('1:01:01');
    });

    test('formats zero', () => {
      expect(KI_Format.formatDuration(0)).toBe('0:00:00');
    });

    test('formats minutes only', () => {
      expect(KI_Format.formatDuration(125)).toBe('0:02:05');
    });
  });

  describe('formatDate', () => {
    test('formats ISO string to readable date', () => {
      const result = KI_Format.formatDate('2026-04-12T18:00:00Z');
      expect(result).toMatch(/Apr/);
      expect(result).toMatch(/12/);
      expect(result).toMatch(/2026/);
    });
  });
});
