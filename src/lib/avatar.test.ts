import { describe, it, expect } from 'vitest';
import {
  getAvatarColor,
  getNextAvatarColor,
  validateAvatarColor,
  isValidAvatarColor,
  getInitials,
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

    it('handles negative indices by treating them as 0', () => {
      expect(getNextAvatarColor(-1)).toBe(AVATAR_COLORS[0]);
      expect(getNextAvatarColor(-100)).toBe(AVATAR_COLORS[0]);
      expect(getNextAvatarColor(-0.5)).toBe(AVATAR_COLORS[0]);
    });

    it('handles floating point indices by flooring', () => {
      expect(getNextAvatarColor(1.9)).toBe(AVATAR_COLORS[1]);
      expect(getNextAvatarColor(2.1)).toBe(AVATAR_COLORS[2]);
    });

    it('always returns a valid AvatarColorClass', () => {
      for (let i = 0; i < 20; i++) {
        const color = getNextAvatarColor(i);
        expect(AVATAR_COLORS).toContain(color);
      }
    });
  });

  describe('isValidAvatarColor (type guard)', () => {
    it('returns true for valid avatar colors', () => {
      expect(isValidAvatarColor('bg-red-500')).toBe(true);
      expect(isValidAvatarColor('bg-blue-500')).toBe(true);
      expect(isValidAvatarColor('bg-muted')).toBe(true);
    });

    it('returns false for invalid strings', () => {
      expect(isValidAvatarColor('bg-evil-class')).toBe(false);
      expect(isValidAvatarColor('invalid')).toBe(false);
      expect(isValidAvatarColor('')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isValidAvatarColor(null)).toBe(false);
      expect(isValidAvatarColor(undefined)).toBe(false);
      expect(isValidAvatarColor(123)).toBe(false);
      expect(isValidAvatarColor({})).toBe(false);
      expect(isValidAvatarColor([])).toBe(false);
    });

    it('narrows type correctly in conditionals', () => {
      const maybeColor: unknown = 'bg-red-500';
      if (isValidAvatarColor(maybeColor)) {
        // TypeScript should recognize maybeColor as AvatarColorClass here
        const color: string = maybeColor;
        expect(color).toBe('bg-red-500');
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

  describe('getInitials', () => {
    it('returns first character uppercase for single word name', () => {
      expect(getInitials('Alice')).toBe('A');
      expect(getInitials('bob')).toBe('B');
      expect(getInitials('CHARLIE')).toBe('C');
    });

    it('returns first and last word initials for two word name', () => {
      expect(getInitials('Alice Smith')).toBe('AS');
      expect(getInitials('bob jones')).toBe('BJ');
      expect(getInitials('CHARLIE BROWN')).toBe('CB');
    });

    it('returns first and last word initials for three+ word name', () => {
      expect(getInitials('Alice B. Smith')).toBe('AS');
      expect(getInitials('John Paul Jones')).toBe('JJ');
      expect(getInitials('Mary Jane Watson Parker')).toBe('MP');
    });

    it('returns "?" for empty string', () => {
      expect(getInitials('')).toBe('?');
    });

    it('returns "?" for whitespace only', () => {
      expect(getInitials(' ')).toBe('?');
      expect(getInitials('   ')).toBe('?');
      expect(getInitials('\t')).toBe('?');
      expect(getInitials('\n')).toBe('?');
    });

    it('handles names with extra spaces gracefully', () => {
      expect(getInitials('  Alice  Smith  ')).toBe('AS');
      expect(getInitials('Alice    Smith')).toBe('AS');
      expect(getInitials('  Bob  ')).toBe('B');
    });

    it('returns uppercase initials for lowercase input', () => {
      expect(getInitials('alice')).toBe('A');
      expect(getInitials('alice smith')).toBe('AS');
      expect(getInitials('alice b. smith')).toBe('AS');
    });

    it('handles special characters in names', () => {
      expect(getInitials("O'Brien")).toBe('O');
      expect(getInitials("Mary O'Brien")).toBe('MO');
      expect(getInitials('Jean-Luc Picard')).toBe('JP');
    });

    it('handles names with middle initials', () => {
      expect(getInitials('John F. Kennedy')).toBe('JK');
      expect(getInitials('Martin Luther King Jr.')).toBe('MJ');
    });
  });
});
