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
