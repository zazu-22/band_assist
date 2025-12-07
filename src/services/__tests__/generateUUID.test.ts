import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateUUID } from '../supabaseStorageService';

describe('generateUUID', () => {
  // UUID v4 format regex: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // where y is one of [8, 9, a, b]
  const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  describe('with crypto.randomUUID available', () => {
    it('should generate valid UUID v4 format', () => {
      const uuid = generateUUID();
      expect(uuid).toMatch(UUID_V4_REGEX);
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUUID());
      }
      // All 100 UUIDs should be unique
      expect(uuids.size).toBe(100);
    });
  });

  describe('with crypto.getRandomValues fallback', () => {
    let originalRandomUUID: typeof crypto.randomUUID | undefined;

    beforeEach(() => {
      // Save original and remove randomUUID to test fallback
      originalRandomUUID = crypto.randomUUID;
      // @ts-expect-error - intentionally removing for test
      delete crypto.randomUUID;
    });

    afterEach(() => {
      // Restore original
      if (originalRandomUUID) {
        crypto.randomUUID = originalRandomUUID;
      }
    });

    it('should generate valid UUID v4 format using getRandomValues', () => {
      const uuid = generateUUID();
      expect(uuid).toMatch(UUID_V4_REGEX);
    });

    it('should generate unique UUIDs using getRandomValues', () => {
      const uuids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUUID());
      }
      expect(uuids.size).toBe(100);
    });

    it('should set correct version (4) and variant bits', () => {
      const uuid = generateUUID();
      const parts = uuid.split('-');

      // Version is in the 3rd group, first character should be '4'
      expect(parts[2][0]).toBe('4');

      // Variant is in the 4th group, first character should be 8, 9, a, or b
      expect(['8', '9', 'a', 'b']).toContain(parts[3][0].toLowerCase());
    });
  });

  describe('with Math.random fallback', () => {
    let originalRandomUUID: typeof crypto.randomUUID | undefined;
    let originalGetRandomValues: typeof crypto.getRandomValues | undefined;

    beforeEach(() => {
      // Save originals and remove crypto methods to test Math.random fallback
      originalRandomUUID = crypto.randomUUID;
      originalGetRandomValues = crypto.getRandomValues;
      // @ts-expect-error - intentionally removing for test
      delete crypto.randomUUID;
      // @ts-expect-error - intentionally removing for test
      delete crypto.getRandomValues;
    });

    afterEach(() => {
      // Restore originals
      if (originalRandomUUID) {
        crypto.randomUUID = originalRandomUUID;
      }
      if (originalGetRandomValues) {
        crypto.getRandomValues = originalGetRandomValues;
      }
    });

    it('should generate valid UUID v4 format using Math.random', () => {
      const uuid = generateUUID();
      expect(uuid).toMatch(UUID_V4_REGEX);
    });

    it('should generate UUIDs with correct structure', () => {
      const uuid = generateUUID();
      const parts = uuid.split('-');

      expect(parts).toHaveLength(5);
      expect(parts[0]).toHaveLength(8);
      expect(parts[1]).toHaveLength(4);
      expect(parts[2]).toHaveLength(4);
      expect(parts[3]).toHaveLength(4);
      expect(parts[4]).toHaveLength(12);
    });

    it('should set correct version (4) in Math.random fallback', () => {
      // Run multiple times to ensure consistency
      for (let i = 0; i < 10; i++) {
        const uuid = generateUUID();
        const parts = uuid.split('-');
        expect(parts[2][0]).toBe('4');
      }
    });

    it('should set correct variant bits in Math.random fallback', () => {
      // Run multiple times to ensure consistency
      for (let i = 0; i < 10; i++) {
        const uuid = generateUUID();
        const parts = uuid.split('-');
        expect(['8', '9', 'a', 'b']).toContain(parts[3][0].toLowerCase());
      }
    });
  });
});
