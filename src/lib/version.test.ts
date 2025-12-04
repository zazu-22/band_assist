import { describe, it, expect } from 'vitest';

describe('__APP_VERSION__', () => {
  it('is defined', () => {
    expect(__APP_VERSION__).toBeDefined();
  });

  it('is a non-empty string', () => {
    expect(typeof __APP_VERSION__).toBe('string');
    expect(__APP_VERSION__.length).toBeGreaterThan(0);
  });

  it('follows semver format', () => {
    // Matches patterns like: 0.1.0, 1.0.0, 2.3.4-alpha.1, etc.
    const semverRegex = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
    expect(__APP_VERSION__).toMatch(semverRegex);
  });
});
