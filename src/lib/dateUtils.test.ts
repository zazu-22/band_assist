import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseLocalDate,
  getLocalToday,
  daysBetween,
  formatDaysUntil,
} from './dateUtils';

describe('dateUtils', () => {
  describe('parseLocalDate', () => {
    it('parses YYYY-MM-DD as local midnight', () => {
      const date = parseLocalDate('2025-01-15');
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(0); // January is 0
      expect(date.getDate()).toBe(15);
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
      expect(date.getSeconds()).toBe(0);
    });

    it('handles month boundaries correctly', () => {
      const date = parseLocalDate('2025-02-01');
      expect(date.getMonth()).toBe(1); // February
      expect(date.getDate()).toBe(1);
    });

    it('handles leap years', () => {
      const date = parseLocalDate('2024-02-29');
      expect(date.getMonth()).toBe(1);
      expect(date.getDate()).toBe(29);
    });

    it('handles year boundaries', () => {
      const lastDayOf2024 = parseLocalDate('2024-12-31');
      expect(lastDayOf2024.getFullYear()).toBe(2024);
      expect(lastDayOf2024.getMonth()).toBe(11);
      expect(lastDayOf2024.getDate()).toBe(31);

      const firstDayOf2025 = parseLocalDate('2025-01-01');
      expect(firstDayOf2025.getFullYear()).toBe(2025);
      expect(firstDayOf2025.getMonth()).toBe(0);
      expect(firstDayOf2025.getDate()).toBe(1);
    });

    it('throws for invalid format', () => {
      expect(() => parseLocalDate('2025/01/15')).toThrow('Invalid date format');
      expect(() => parseLocalDate('Jan 15, 2025')).toThrow('Invalid date format');
      expect(() => parseLocalDate('15-01-2025')).toThrow('Invalid date format');
      expect(() => parseLocalDate('2025-1-15')).toThrow('Invalid date format');
      expect(() => parseLocalDate('2025-01')).toThrow('Invalid date format');
    });

    it('throws for empty or null input', () => {
      expect(() => parseLocalDate('')).toThrow('Invalid date format');
      // @ts-expect-error Testing runtime behavior with null
      expect(() => parseLocalDate(null)).toThrow('Invalid date format');
      // @ts-expect-error Testing runtime behavior with undefined
      expect(() => parseLocalDate(undefined)).toThrow('Invalid date format');
    });

    it('throws for invalid dates that would roll over', () => {
      expect(() => parseLocalDate('2025-02-30')).toThrow('Invalid date');
      expect(() => parseLocalDate('2025-04-31')).toThrow('Invalid date');
      expect(() => parseLocalDate('2025-13-01')).toThrow('Invalid date');
      expect(() => parseLocalDate('2023-02-29')).toThrow('Invalid date'); // 2023 is not a leap year
    });

    it('preserves the exact date regardless of timezone', () => {
      // This test verifies the core fix: the date should always be the 15th,
      // never the 14th due to UTC parsing issues
      const date = parseLocalDate('2025-01-15');
      expect(date.getDate()).toBe(15);
    });
  });

  describe('getLocalToday', () => {
    it('returns today at midnight', () => {
      const today = getLocalToday();
      expect(today.getHours()).toBe(0);
      expect(today.getMinutes()).toBe(0);
      expect(today.getSeconds()).toBe(0);
      expect(today.getMilliseconds()).toBe(0);
    });

    it('returns the current date', () => {
      const today = getLocalToday();
      const now = new Date();
      expect(today.getFullYear()).toBe(now.getFullYear());
      expect(today.getMonth()).toBe(now.getMonth());
      expect(today.getDate()).toBe(now.getDate());
    });

    it('returns a new Date object each time', () => {
      const today1 = getLocalToday();
      const today2 = getLocalToday();
      expect(today1).not.toBe(today2); // Different object references
      expect(today1.getTime()).toBe(today2.getTime()); // Same value
    });
  });

  describe('daysBetween', () => {
    it('returns 0 for same day', () => {
      const date = new Date(2025, 0, 15, 14, 30); // Jan 15, 2:30 PM
      expect(daysBetween(date, date)).toBe(0);
    });

    it('returns 0 for same day with different times', () => {
      const morning = new Date(2025, 0, 15, 8, 0);
      const evening = new Date(2025, 0, 15, 20, 0);
      expect(daysBetween(morning, evening)).toBe(0);
    });

    it('returns positive days for future dates', () => {
      const from = new Date(2025, 0, 15);
      const to = new Date(2025, 0, 18);
      expect(daysBetween(from, to)).toBe(3);
    });

    it('returns negative days for past dates', () => {
      const from = new Date(2025, 0, 18);
      const to = new Date(2025, 0, 15);
      expect(daysBetween(from, to)).toBe(-3);
    });

    it('returns 1 for tomorrow', () => {
      const today = new Date(2025, 0, 15);
      const tomorrow = new Date(2025, 0, 16);
      expect(daysBetween(today, tomorrow)).toBe(1);
    });

    it('returns -1 for yesterday', () => {
      const today = new Date(2025, 0, 15);
      const yesterday = new Date(2025, 0, 14);
      expect(daysBetween(today, yesterday)).toBe(-1);
    });

    it('ignores time components', () => {
      const from = new Date(2025, 0, 15, 23, 59, 59);
      const to = new Date(2025, 0, 16, 0, 0, 1);
      expect(daysBetween(from, to)).toBe(1);
    });

    it('handles month boundaries', () => {
      const jan31 = new Date(2025, 0, 31);
      const feb1 = new Date(2025, 1, 1);
      expect(daysBetween(jan31, feb1)).toBe(1);
    });

    it('handles year boundaries', () => {
      const dec31 = new Date(2024, 11, 31);
      const jan1 = new Date(2025, 0, 1);
      expect(daysBetween(dec31, jan1)).toBe(1);
    });

    it('handles leap year correctly', () => {
      const feb28 = new Date(2024, 1, 28);
      const mar1 = new Date(2024, 2, 1);
      expect(daysBetween(feb28, mar1)).toBe(2); // Feb 29 is in between
    });

    it('handles large date ranges', () => {
      const start = new Date(2020, 0, 1);
      const end = new Date(2025, 0, 1);
      // 5 years including leap years
      expect(daysBetween(start, end)).toBe(1827);
    });
  });

  describe('formatDaysUntil', () => {
    let mockDate: Date;

    beforeEach(() => {
      // Mock getLocalToday by mocking Date
      mockDate = new Date(2025, 0, 15, 0, 0, 0); // Jan 15, 2025
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns "Today" for current date', () => {
      expect(formatDaysUntil('2025-01-15')).toBe('Today');
    });

    it('returns "Tomorrow" for next day', () => {
      expect(formatDaysUntil('2025-01-16')).toBe('Tomorrow');
    });

    it('returns "Yesterday" for previous day', () => {
      expect(formatDaysUntil('2025-01-14')).toBe('Yesterday');
    });

    it('returns "in Xd" for future dates', () => {
      expect(formatDaysUntil('2025-01-17')).toBe('in 2d');
      expect(formatDaysUntil('2025-01-20')).toBe('in 5d');
      expect(formatDaysUntil('2025-02-14')).toBe('in 30d');
    });

    it('returns "Xd ago" for past dates', () => {
      expect(formatDaysUntil('2025-01-13')).toBe('2d ago');
      expect(formatDaysUntil('2025-01-10')).toBe('5d ago');
      expect(formatDaysUntil('2024-12-16')).toBe('30d ago');
    });

    it('handles month boundaries', () => {
      // Jan 15 -> Feb 15 = 31 days
      expect(formatDaysUntil('2025-02-15')).toBe('in 31d');
    });

    it('handles year boundaries', () => {
      // Jan 15, 2025 -> Jan 15, 2024 = 366 days (2024 is leap year)
      expect(formatDaysUntil('2024-01-15')).toBe('366d ago');
    });
  });

  describe('integration: parseLocalDate with daysBetween', () => {
    it('works correctly together', () => {
      const dateStr = '2025-01-20';
      const parsed = parseLocalDate(dateStr);

      // Set mock time to Jan 15, 2025
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 0, 15));

      const days = daysBetween(getLocalToday(), parsed);
      expect(days).toBe(5);

      vi.useRealTimers();
    });
  });
});
