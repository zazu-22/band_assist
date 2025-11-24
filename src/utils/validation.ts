/**
 * Email validation utilities
 * Provides practical web-standard email validation with clear error messages
 */

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates email addresses according to practical web standards.
 *
 * Checks:
 * - Length limits (RFC 5321: 254 chars total, 64 local, 253 domain)
 * - Valid characters and structure
 * - Domain contains TLD
 * - No leading/trailing/consecutive dots
 *
 * Note: Does not validate all RFC 5322 edge cases (quoted strings, IP addresses)
 * as these are rarely used in practice and often indicate abuse.
 *
 * @param email - Email address to validate
 * @returns Object with isValid flag and optional error message
 */
export function validateEmail(email: string): EmailValidationResult {
  const trimmed = email.trim().toLowerCase();

  // Length validation (RFC 5321)
  if (!trimmed) {
    return { isValid: false, error: 'Email address is required' };
  }

  if (trimmed.length > 254) {
    return { isValid: false, error: 'Email address is too long (max 254 characters)' };
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return { isValid: false, error: 'Email must contain exactly one @ symbol' };
  }

  const [local, domain] = parts;

  // Local part validation
  if (!local || local.length > 64) {
    return { isValid: false, error: 'Invalid email format' };
  }

  // Domain validation
  if (!domain || domain.length > 253) {
    return { isValid: false, error: 'Email domain is invalid' };
  }

  // Domain must have at least one dot (TLD required)
  if (!domain.includes('.')) {
    return {
      isValid: false,
      error: 'Email domain must include a top-level domain (e.g., .com, .org)',
    };
  }

  // Structural validation - prevent leading/trailing/consecutive dots
  if (
    local.startsWith('.') ||
    local.endsWith('.') ||
    local.includes('..') ||
    domain.startsWith('.') ||
    domain.endsWith('.') ||
    domain.includes('..')
  ) {
    return { isValid: false, error: 'Invalid email format' };
  }

  // Pattern matching (more restrictive than RFC 5322 for security)
  // Allows: letters, numbers, dots, underscores, hyphens, plus signs
  const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  return { isValid: true };
}

/**
 * Normalizes email for storage (lowercase, trimmed)
 *
 * @param email - Email address to normalize
 * @returns Normalized email address
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  isValid: boolean;
  error?: string;
  strength?: 'weak' | 'medium' | 'strong';
}

/**
 * Password requirement hint text for UI display
 */
export const PASSWORD_HINT = 'Must be at least 8 characters with at least 3 of: uppercase, lowercase, numbers, special characters';

/**
 * Validates password strength and security requirements.
 *
 * Requirements:
 * - Minimum 8 characters (matches Supabase configuration)
 * - At least 3 of: uppercase, lowercase, numbers, special characters
 * - No common patterns (password, 12345, qwerty, abc123)
 *
 * @param password - Password to validate
 * @returns Object with isValid flag, optional error message, and strength rating
 */
export function validatePassword(password: string): PasswordValidationResult {
  // Enforce 8 character minimum (matches Supabase config)
  if (password.length < 8) {
    return {
      isValid: false,
      error: 'Password must be at least 8 characters long',
      strength: 'weak',
    };
  }

  // Check for character type diversity
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/'`~;]/.test(password);

  const complexityScore = [hasUpperCase, hasLowerCase, hasNumber, hasSpecial].filter(Boolean)
    .length;

  if (complexityScore < 3) {
    return {
      isValid: false,
      error: 'Password must include at least 3 of: uppercase, lowercase, numbers, special characters',
      strength: 'weak',
    };
  }

  // Check for common patterns
  const commonPatterns = [
    'password',
    'pass123',
    '12345678',
    '123456',
    'qwerty',
    'abc123',
    'letmein',
    'welcome',
    'admin',
    'user',
  ];

  const lowerPassword = password.toLowerCase();
  for (const pattern of commonPatterns) {
    if (lowerPassword.includes(pattern)) {
      return {
        isValid: false,
        error: 'Password contains common patterns and is too easy to guess',
        strength: 'weak',
      };
    }
  }

  // Determine strength based on length and complexity
  const strength = complexityScore === 4 && password.length >= 16 ? 'strong' : 'medium';

  return {
    isValid: true,
    strength,
  };
}
