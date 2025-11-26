import { describe, it, expect } from 'vitest';
import {
  getAvatarColor,
  getNextAvatarColor,
  validateAvatarColor,
  DEFAULT_AVATAR_COLOR,
  AVATAR_COLORS,
} from './avatar';

describe('avatar utilities', () => {
  describe('getAvatarColor', () => {
    it('returns the color when given a valid AvatarColorClass', () => {
      expect(getAvatarColor('bg-red-500')).toBe('bg-red-500');
      expect(getAvatarColor('bg-blue-500')).toBe('bg-blue-500');
      expect(getAvatarColor('bg-muted')).toBe('bg-muted');
    });

    it('returns default color when given undefined', () => {
      expect(getAvatarColor(undefined)).toBe(DEFAULT_AVATAR_COLOR);
    });

    it('returns default color when given empty string', () => {
      expect(getAvatarColor('')).toBe(DEFAULT_AVATAR_COLOR);
    });

    it('returns default color for invalid/arbitrary strings (CSS injection prevention)', () => {
      expect(getAvatarColor('bg-evil-class')).toBe(DEFAULT_AVATAR_COLOR);
      expect(getAvatarColor('<script>alert(1)</script>')).toBe(DEFAULT_AVATAR_COLOR);
      expect(getAvatarColor('javascript:void(0)')).toBe(DEFAULT_AVATAR_COLOR);
      expect(getAvatarColor('bg-red-500 bg-blue-500')).toBe(DEFAULT_AVATAR_COLOR);
    });

    it('returns default color for legacy color values not in allowed list', () => {
      expect(getAvatarColor('bg-gray-500')).toBe(DEFAULT_AVATAR_COLOR);
      expect(getAvatarColor('red')).toBe(DEFAULT_AVATAR_COLOR);
      expect(getAvatarColor('#ff0000')).toBe(DEFAULT_AVATAR_COLOR);
    });
  });

  describe('validateAvatarColor', () => {
    it('returns the color when given a valid AvatarColorClass', () => {
      expect(validateAvatarColor('bg-red-500')).toBe('bg-red-500');
      expect(validateAvatarColor('bg-blue-500')).toBe('bg-blue-500');
      expect(validateAvatarColor('bg-muted')).toBe('bg-muted');
    });

    it('returns undefined when given undefined', () => {
      expect(validateAvatarColor(undefined)).toBeUndefined();
    });

    it('returns undefined when given null', () => {
      expect(validateAvatarColor(null)).toBeUndefined();
    });

    it('returns undefined when given empty string', () => {
      expect(validateAvatarColor('')).toBeUndefined();
    });

    it('returns undefined for invalid strings (prevents CSS injection)', () => {
      expect(validateAvatarColor('bg-evil-class')).toBeUndefined();
      expect(validateAvatarColor('<script>alert(1)</script>')).toBeUndefined();
      expect(validateAvatarColor('javascript:void(0)')).toBeUndefined();
    });

    it('returns undefined for legacy color values', () => {
      expect(validateAvatarColor('bg-gray-500')).toBeUndefined();
      expect(validateAvatarColor('red')).toBeUndefined();
    });
  });

  describe('getNextAvatarColor', () => {
    it('returns first color for index 0', () => {
      expect(getNextAvatarColor(0)).toBe(AVATAR_COLORS[0]);
    });

    it('cycles through colors based on index', () => {
      for (let i = 0; i < AVATAR_COLORS.length; i++) {
        expect(getNextAvatarColor(i)).toBe(AVATAR_COLORS[i]);
      }
    });

    it('wraps around when index exceeds array length', () => {
      const length = AVATAR_COLORS.length;
      expect(getNextAvatarColor(length)).toBe(AVATAR_COLORS[0]);
      expect(getNextAvatarColor(length + 1)).toBe(AVATAR_COLORS[1]);
      expect(getNextAvatarColor(length * 2)).toBe(AVATAR_COLORS[0]);
    });

    it('handles large indices correctly', () => {
      const index = 1000;
      const expectedColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
      expect(getNextAvatarColor(index)).toBe(expectedColor);
    });

    it('always returns a valid AvatarColorClass', () => {
      for (let i = 0; i < 20; i++) {
        const color = getNextAvatarColor(i);
        expect(AVATAR_COLORS).toContain(color);
      }
    });
  });

  describe('AVATAR_COLORS constant', () => {
    it('contains expected number of colors', () => {
      expect(AVATAR_COLORS.length).toBeGreaterThan(0);
      expect(AVATAR_COLORS.length).toBe(9); // Current count
    });

    it('does not contain the default muted color', () => {
      expect(AVATAR_COLORS).not.toContain('bg-muted');
    });

    it('all colors are valid Tailwind bg classes', () => {
      for (const color of AVATAR_COLORS) {
        expect(color).toMatch(/^bg-[a-z]+-\d+$/);
      }
    });
  });

  describe('DEFAULT_AVATAR_COLOR constant', () => {
    it('is bg-muted', () => {
      expect(DEFAULT_AVATAR_COLOR).toBe('bg-muted');
    });
  });
});
