import { describe, it, expect } from 'vitest';
import {
  getBandStatusVariant,
  getUserStatusVariant,
  BAND_STATUS_VARIANT_MAP,
  USER_STATUS_VARIANT_MAP,
  USER_STATUS_OPTIONS,
  BAND_STATUS_OPTIONS,
  type BandStatus,
  type UserStatusVariant,
} from './statusConfig';
import type { UserSongStatus } from '@/types';

// =============================================================================
// getBandStatusVariant
// =============================================================================

describe('getBandStatusVariant', () => {
  it('returns "success" for Performance Ready', () => {
    expect(getBandStatusVariant('Performance Ready')).toBe('success');
  });

  it('returns "info" for In Progress', () => {
    expect(getBandStatusVariant('In Progress')).toBe('info');
  });

  it('returns "warning" for To Learn', () => {
    expect(getBandStatusVariant('To Learn')).toBe('warning');
  });

  it('returns "warning" as fallback for unknown status', () => {
    // TypeScript would normally prevent this, but runtime data could be unexpected
    expect(getBandStatusVariant('Unknown Status' as BandStatus)).toBe('warning');
    expect(getBandStatusVariant('' as BandStatus)).toBe('warning');
  });

  it('maps all statuses in BAND_STATUS_VARIANT_MAP correctly', () => {
    const expectedMappings: Record<BandStatus, string> = {
      'Performance Ready': 'success',
      'In Progress': 'info',
      'To Learn': 'warning',
    };

    for (const [status, variant] of Object.entries(expectedMappings)) {
      expect(getBandStatusVariant(status as BandStatus)).toBe(variant);
    }
  });
});

// =============================================================================
// getUserStatusVariant
// =============================================================================

describe('getUserStatusVariant', () => {
  it('returns "user-success" for Mastered', () => {
    expect(getUserStatusVariant('Mastered')).toBe('user-success');
  });

  it('returns "user-info" for Learned', () => {
    expect(getUserStatusVariant('Learned')).toBe('user-info');
  });

  it('returns "user-warning" for Learning', () => {
    expect(getUserStatusVariant('Learning')).toBe('user-warning');
  });

  it('returns "outline" for Not Started', () => {
    expect(getUserStatusVariant('Not Started')).toBe('outline');
  });

  it('returns "outline" for undefined status', () => {
    expect(getUserStatusVariant(undefined)).toBe('outline');
  });

  it('returns "outline" as fallback for unknown status', () => {
    expect(getUserStatusVariant('Unknown' as UserSongStatus)).toBe('outline');
    expect(getUserStatusVariant('' as UserSongStatus)).toBe('outline');
  });

  it('maps all statuses in USER_STATUS_VARIANT_MAP correctly', () => {
    const expectedMappings: Record<UserSongStatus, UserStatusVariant> = {
      'Mastered': 'user-success',
      'Learned': 'user-info',
      'Learning': 'user-warning',
      'Not Started': 'outline',
    };

    for (const [status, variant] of Object.entries(expectedMappings)) {
      expect(getUserStatusVariant(status as UserSongStatus)).toBe(variant);
    }
  });
});

// =============================================================================
// BAND_STATUS_VARIANT_MAP
// =============================================================================

describe('BAND_STATUS_VARIANT_MAP', () => {
  it('contains all three band statuses', () => {
    expect(Object.keys(BAND_STATUS_VARIANT_MAP)).toHaveLength(3);
    expect(BAND_STATUS_VARIANT_MAP).toHaveProperty('Performance Ready');
    expect(BAND_STATUS_VARIANT_MAP).toHaveProperty('In Progress');
    expect(BAND_STATUS_VARIANT_MAP).toHaveProperty('To Learn');
  });

  it('maps to semantic color variants', () => {
    expect(BAND_STATUS_VARIANT_MAP['Performance Ready']).toBe('success');
    expect(BAND_STATUS_VARIANT_MAP['In Progress']).toBe('info');
    expect(BAND_STATUS_VARIANT_MAP['To Learn']).toBe('warning');
  });
});

// =============================================================================
// USER_STATUS_VARIANT_MAP
// =============================================================================

describe('USER_STATUS_VARIANT_MAP', () => {
  it('contains all four user statuses', () => {
    expect(Object.keys(USER_STATUS_VARIANT_MAP)).toHaveLength(4);
    expect(USER_STATUS_VARIANT_MAP).toHaveProperty('Mastered');
    expect(USER_STATUS_VARIANT_MAP).toHaveProperty('Learned');
    expect(USER_STATUS_VARIANT_MAP).toHaveProperty('Learning');
    expect(USER_STATUS_VARIANT_MAP).toHaveProperty('Not Started');
  });

  it('maps to user-specific color variants', () => {
    expect(USER_STATUS_VARIANT_MAP['Mastered']).toBe('user-success');
    expect(USER_STATUS_VARIANT_MAP['Learned']).toBe('user-info');
    expect(USER_STATUS_VARIANT_MAP['Learning']).toBe('user-warning');
    expect(USER_STATUS_VARIANT_MAP['Not Started']).toBe('outline');
  });
});

// =============================================================================
// USER_STATUS_OPTIONS
// =============================================================================

describe('USER_STATUS_OPTIONS', () => {
  it('contains all four user status options', () => {
    expect(USER_STATUS_OPTIONS).toHaveLength(4);
  });

  it('has correct value/label pairs', () => {
    const values = USER_STATUS_OPTIONS.map(opt => opt.value);
    expect(values).toContain('Not Started');
    expect(values).toContain('Learning');
    expect(values).toContain('Learned');
    expect(values).toContain('Mastered');
  });

  it('uses status as both value and label', () => {
    for (const option of USER_STATUS_OPTIONS) {
      expect(option.value).toBe(option.label);
    }
  });

  it('is ordered from least to most progress', () => {
    expect(USER_STATUS_OPTIONS[0].value).toBe('Not Started');
    expect(USER_STATUS_OPTIONS[1].value).toBe('Learning');
    expect(USER_STATUS_OPTIONS[2].value).toBe('Learned');
    expect(USER_STATUS_OPTIONS[3].value).toBe('Mastered');
  });
});

// =============================================================================
// BAND_STATUS_OPTIONS
// =============================================================================

describe('BAND_STATUS_OPTIONS', () => {
  it('contains all three band status options', () => {
    expect(BAND_STATUS_OPTIONS).toHaveLength(3);
  });

  it('has correct value/label pairs', () => {
    const values = BAND_STATUS_OPTIONS.map(opt => opt.value);
    expect(values).toContain('To Learn');
    expect(values).toContain('In Progress');
    expect(values).toContain('Performance Ready');
  });

  it('uses status as both value and label', () => {
    for (const option of BAND_STATUS_OPTIONS) {
      expect(option.value).toBe(option.label);
    }
  });

  it('is ordered from least to most ready', () => {
    expect(BAND_STATUS_OPTIONS[0].value).toBe('To Learn');
    expect(BAND_STATUS_OPTIONS[1].value).toBe('In Progress');
    expect(BAND_STATUS_OPTIONS[2].value).toBe('Performance Ready');
  });
});
