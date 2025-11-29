import { describe, it, expect } from 'vitest';
import { validateEmail, normalizeEmail, validatePassword, PASSWORD_HINT } from './validation';

describe('validateEmail', () => {
  describe('valid emails', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.org',
      'user+tag@example.co.uk',
      'user_name@domain.io',
      'user-name@domain.net',
      'a@b.co',
      '123@numbers.com',
    ];

    validEmails.forEach(email => {
      it(`accepts "${email}"`, () => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });
  });

  describe('invalid emails - structure', () => {
    it('rejects empty string', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email address is required');
    });

    it('rejects whitespace only', () => {
      const result = validateEmail('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email address is required');
    });

    it('rejects email without @', () => {
      const result = validateEmail('testexample.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email must contain exactly one @ symbol');
    });

    it('rejects email with multiple @', () => {
      const result = validateEmail('test@@example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email must contain exactly one @ symbol');
    });

    it('rejects email without domain TLD', () => {
      const result = validateEmail('test@localhost');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email domain must include a top-level domain (e.g., .com, .org)');
    });
  });

  describe('invalid emails - dots', () => {
    it('rejects leading dot in local part', () => {
      const result = validateEmail('.test@example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    it('rejects trailing dot in local part', () => {
      const result = validateEmail('test.@example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    it('rejects consecutive dots in local part', () => {
      const result = validateEmail('test..user@example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    it('rejects leading dot in domain', () => {
      const result = validateEmail('test@.example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    it('rejects trailing dot in domain', () => {
      const result = validateEmail('test@example.com.');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    it('rejects consecutive dots in domain', () => {
      const result = validateEmail('test@example..com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });
  });

  describe('invalid emails - length', () => {
    it('rejects email longer than 254 characters', () => {
      const longLocal = 'a'.repeat(250);
      const result = validateEmail(`${longLocal}@b.com`);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email address is too long (max 254 characters)');
    });

    it('rejects local part longer than 64 characters', () => {
      const longLocal = 'a'.repeat(65);
      const result = validateEmail(`${longLocal}@example.com`);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });
  });

  describe('invalid emails - characters', () => {
    it('rejects email with spaces', () => {
      const result = validateEmail('test user@example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please enter a valid email address');
    });

    it('rejects email with special characters in wrong place', () => {
      const result = validateEmail('test<>@example.com');
      expect(result.isValid).toBe(false);
    });
  });

  describe('normalization during validation', () => {
    it('validates with leading/trailing whitespace (trimmed)', () => {
      const result = validateEmail('  test@example.com  ');
      expect(result.isValid).toBe(true);
    });

    it('validates case-insensitively', () => {
      const result = validateEmail('TEST@EXAMPLE.COM');
      expect(result.isValid).toBe(true);
    });
  });
});

describe('normalizeEmail', () => {
  it('trims whitespace', () => {
    expect(normalizeEmail('  test@example.com  ')).toBe('test@example.com');
  });

  it('converts to lowercase', () => {
    expect(normalizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
  });

  it('handles already normalized email', () => {
    expect(normalizeEmail('test@example.com')).toBe('test@example.com');
  });

  it('handles mixed case and whitespace', () => {
    expect(normalizeEmail('  Test.User@Example.COM  ')).toBe('test.user@example.com');
  });
});

describe('validatePassword', () => {
  describe('length requirements', () => {
    it('rejects password shorter than 8 characters', () => {
      const result = validatePassword('Ab1!xyz');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must be at least 8 characters long');
      expect(result.strength).toBe('weak');
    });

    it('accepts password with exactly 8 characters', () => {
      const result = validatePassword('Abcd12!@');
      expect(result.isValid).toBe(true);
    });
  });

  describe('complexity requirements', () => {
    it('rejects password without enough character types', () => {
      const result = validatePassword('abcdefgh');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Password must include at least 3 of: uppercase, lowercase, numbers, special characters'
      );
      expect(result.strength).toBe('weak');
    });

    it('accepts password with 3 character types (lowercase, uppercase, number)', () => {
      const result = validatePassword('Abcdefg1');
      expect(result.isValid).toBe(true);
    });

    it('accepts password with 3 character types (lowercase, uppercase, special)', () => {
      const result = validatePassword('Abcdefg!');
      expect(result.isValid).toBe(true);
    });

    it('accepts password with 3 character types (lowercase, number, special)', () => {
      const result = validatePassword('abcdefg1!');
      expect(result.isValid).toBe(true);
    });

    it('accepts password with all 4 character types', () => {
      const result = validatePassword('Abcdef1!');
      expect(result.isValid).toBe(true);
    });
  });

  describe('common patterns', () => {
    const commonPasswords = [
      'password123!A',
      'Pass123letmein',
      '12345678Ab!',
      'Qwerty123!',
      'Abc123abc!',
      'Welcomeback1!',
      'Admin123!!',
      'User1234!!',
    ];

    commonPasswords.forEach(password => {
      it(`rejects common pattern in "${password}"`, () => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Password contains common patterns and is too easy to guess');
      });
    });
  });

  describe('strength rating', () => {
    it('rates weak for failing passwords', () => {
      const result = validatePassword('weak');
      expect(result.strength).toBe('weak');
    });

    it('rates medium for valid passwords under 16 chars', () => {
      const result = validatePassword('Secure1!abc');
      expect(result.isValid).toBe(true);
      expect(result.strength).toBe('medium');
    });

    it('rates strong for 16+ char passwords with all 4 types', () => {
      const result = validatePassword('VerySecure1234!@#$');
      expect(result.isValid).toBe(true);
      expect(result.strength).toBe('strong');
    });

    it('rates medium for 16+ char passwords with only 3 types', () => {
      // Note: Avoiding common patterns like 12345
      const result = validatePassword('VerySecurePwd789');
      expect(result.isValid).toBe(true);
      expect(result.strength).toBe('medium');
    });
  });

  describe('special characters', () => {
    const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '+', '='];

    specialChars.forEach(char => {
      it(`accepts special character "${char}"`, () => {
        const result = validatePassword(`Abcdef1${char}`);
        expect(result.isValid).toBe(true);
      });
    });
  });
});

describe('PASSWORD_HINT', () => {
  it('exports the password hint constant', () => {
    expect(PASSWORD_HINT).toBe(
      'Must be at least 8 characters with at least 3 of: uppercase, lowercase, numbers, special characters'
    );
  });
});
