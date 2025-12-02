# Infrastructure: Service Layer Testing

| Field | Value |
| ----- | ----- |
| **Status** | Backlog |
| **Priority** | High |
| **Type** | Infrastructure |
| **Created** | 2025-12-02 |

---

## Summary

Critical data persistence service layer (`supabaseStorageService.ts`, `migrationService.ts`, `storageService.ts`) has zero test coverage. These services handle all CRUD operations, file uploads, data migrations, and band context management - core functionality that affects every feature but lacks safety net for refactoring or bug fixes.

## Problem

**Current State:**
- `/src/services/` directory: 6 TypeScript files, 0 test files
- `supabaseStorageService.ts`: 800+ lines, handles all Supabase database and storage operations
- `migrationService.ts`: 200+ lines, migrates data from localStorage to Supabase
- Zero coverage for:
  - Save/load operations (CRUD)
  - File upload/download to Supabase Storage
  - Data migration with Base64 → Storage URL conversion
  - Error handling (network failures, validation errors)
  - Multi-band context switching
  - Realtime subscription management

**Risk Assessment:**
1. **Data Loss Risk**: No tests for save operations - bugs could corrupt user data
2. **Migration Risk**: Migration service untested - users could lose data during localStorage → Supabase migration
3. **Regression Risk**: Refactoring service layer is dangerous without test safety net
4. **Security Risk**: File upload validation untested - potential for malicious uploads
5. **Performance Risk**: No benchmarks for large dataset operations

**Real-world bugs that tests would have caught:**
- Band context not set before save → saves to wrong band
- Race condition in band switching → stale data loaded
- Base64 file upload exceeding size limit → migration hangs
- Invalid data types → Supabase insert fails silently

## Proposed Solution

Add comprehensive test suite with 80%+ coverage for service layer.

### Testing Strategy

**1. Test Environment Setup:**

```typescript
// services/__tests__/setup.ts
import { createClient } from '@supabase/supabase-js';

// Use Supabase local instance or test project
export const TEST_SUPABASE_URL = process.env.VITE_TEST_SUPABASE_URL || 'http://localhost:54321';
export const TEST_SUPABASE_ANON_KEY = process.env.VITE_TEST_SUPABASE_ANON_KEY || 'test-anon-key';

// Create test client
export const testSupabase = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY);

// Seed test data
export const seedTestData = async () => {
  // Create test band
  const { data: band } = await testSupabase
    .from('bands')
    .insert({ name: 'Test Band' })
    .select()
    .single();

  return { band };
};

// Clean up after tests
export const cleanupTestData = async () => {
  await testSupabase.from('songs').delete().neq('id', '');
  await testSupabase.from('members').delete().neq('id', '');
  await testSupabase.from('events').delete().neq('id', '');
  await testSupabase.from('bands').delete().neq('id', '');
};
```

**2. SupabaseStorageService Tests:**

```typescript
// services/__tests__/supabaseStorageService.test.ts
import { SupabaseStorageService } from '../supabaseStorageService';
import { seedTestData, cleanupTestData } from './setup';

describe('SupabaseStorageService', () => {
  let service: SupabaseStorageService;
  let testBandId: string;

  beforeEach(async () => {
    service = new SupabaseStorageService();
    const { band } = await seedTestData();
    testBandId = band.id;
    service.setCurrentBand(testBandId);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('save()', () => {
    it('should save songs to Supabase', async () => {
      const songs = [
        { id: '1', title: 'Test Song', artist: 'Test Artist', status: 'ready' }
      ];

      await service.save(songs, [], [], []);

      const loaded = await service.load();
      expect(loaded.songs).toHaveLength(1);
      expect(loaded.songs[0].title).toBe('Test Song');
    });

    it('should save members with avatar colors', async () => {
      const members = [
        { id: '1', name: 'John Doe', roles: ['vocals'], avatarColor: '#FF5733' }
      ];

      await service.save([], members, [], []);

      const loaded = await service.load();
      expect(loaded.members).toHaveLength(1);
      expect(loaded.members[0].avatarColor).toBe('#FF5733');
    });

    it('should save events with dates', async () => {
      const events = [
        {
          id: '1',
          title: 'Rehearsal',
          date: '2025-12-15',
          time: '19:00',
          type: 'practice',
          location: 'Studio',
          notes: null
        }
      ];

      await service.save([], [], [], events);

      const loaded = await service.load();
      expect(loaded.events).toHaveLength(1);
      expect(loaded.events[0].date).toBe('2025-12-15');
    });

    it('should throw error if band not set', async () => {
      const newService = new SupabaseStorageService();

      await expect(
        newService.save([], [], [], [])
      ).rejects.toThrow('No band selected');
    });

    it('should handle large datasets efficiently', async () => {
      // Create 100 songs
      const songs = Array.from({ length: 100 }, (_, i) => ({
        id: `song-${i}`,
        title: `Song ${i}`,
        artist: 'Test Artist',
        status: 'ready'
      }));

      const startTime = Date.now();
      await service.save(songs, [], [], []);
      const duration = Date.now() - startTime;

      // Should complete in under 2 seconds
      expect(duration).toBeLessThan(2000);

      const loaded = await service.load();
      expect(loaded.songs).toHaveLength(100);
    });
  });

  describe('load()', () => {
    it('should load empty data for new band', async () => {
      const data = await service.load();

      expect(data.songs).toEqual([]);
      expect(data.members).toEqual([]);
      expect(data.events).toEqual([]);
      expect(data.roles).toEqual([]);
    });

    it('should load songs with charts and assignments', async () => {
      const songs = [
        {
          id: '1',
          title: 'Test Song',
          artist: 'Test Artist',
          status: 'ready',
          charts: [
            { id: 'chart-1', name: 'Guitar', fileUrl: 'https://example.com/chart.gp' }
          ],
          assignments: [
            { memberId: 'member-1', role: 'guitar' }
          ]
        }
      ];

      await service.save(songs, [], [], []);
      const loaded = await service.load();

      expect(loaded.songs[0].charts).toHaveLength(1);
      expect(loaded.songs[0].assignments).toHaveLength(1);
    });

    it('should handle network errors gracefully', async () => {
      // Mock network failure
      jest.spyOn(service as any, 'supabase').mockReturnValue({
        from: () => ({
          select: () => Promise.reject(new Error('Network error'))
        })
      });

      await expect(service.load()).rejects.toThrow('Network error');
    });
  });

  describe('uploadFile()', () => {
    it('should upload file to Supabase Storage', async () => {
      const file = new File(['test content'], 'test.gp', { type: 'application/octet-stream' });
      const path = 'charts/test.gp';

      const url = await service.uploadFile(file, path);

      expect(url).toContain('test.gp');
      expect(url).toContain(testBandId);
    });

    it('should validate file size', async () => {
      // Create 20MB file (exceeds limit)
      const largeFile = new File(
        [new ArrayBuffer(20 * 1024 * 1024)],
        'large.gp'
      );

      await expect(
        service.uploadFile(largeFile, 'charts/large.gp')
      ).rejects.toThrow('File size exceeds limit');
    });

    it('should validate file type', async () => {
      const invalidFile = new File(['<script>alert("xss")</script>'], 'hack.html', {
        type: 'text/html'
      });

      await expect(
        service.uploadFile(invalidFile, 'charts/hack.html')
      ).rejects.toThrow('Invalid file type');
    });

    it('should handle upload errors', async () => {
      // Mock storage error
      jest.spyOn(service as any, 'supabase').mockReturnValue({
        storage: {
          from: () => ({
            upload: () => Promise.reject(new Error('Storage quota exceeded'))
          })
        }
      });

      const file = new File(['test'], 'test.gp');

      await expect(
        service.uploadFile(file, 'charts/test.gp')
      ).rejects.toThrow('Storage quota exceeded');
    });
  });

  describe('setCurrentBand()', () => {
    it('should switch band context', async () => {
      // Create two bands with different data
      const { band: band1 } = await seedTestData();
      const { band: band2 } = await seedTestData();

      // Save songs to band1
      service.setCurrentBand(band1.id);
      await service.save([{ id: '1', title: 'Band 1 Song' }], [], [], []);

      // Save songs to band2
      service.setCurrentBand(band2.id);
      await service.save([{ id: '2', title: 'Band 2 Song' }], [], [], []);

      // Load band1 data
      service.setCurrentBand(band1.id);
      const band1Data = await service.load();
      expect(band1Data.songs[0].title).toBe('Band 1 Song');

      // Load band2 data
      service.setCurrentBand(band2.id);
      const band2Data = await service.load();
      expect(band2Data.songs[0].title).toBe('Band 2 Song');
    });
  });
});
```

**3. MigrationService Tests:**

```typescript
// services/__tests__/migrationService.test.ts
import { MigrationService } from '../migrationService';
import { localStorageService } from '../localStorageService';

describe('MigrationService', () => {
  let progressUpdates: any[] = [];

  beforeEach(() => {
    progressUpdates = [];
    jest.clearAllMocks();
  });

  describe('migrateFromLocalStorage()', () => {
    it('should migrate songs with Base64 charts to Supabase Storage', async () => {
      // Mock localStorage data with Base64 chart
      const base64Chart = 'data:application/octet-stream;base64,R0lGODlhAQABAIAA';
      jest.spyOn(localStorageService, 'load').mockReturnValue({
        songs: [
          {
            id: '1',
            title: 'Test Song',
            charts: [{ id: 'chart-1', name: 'Guitar', fileUrl: base64Chart }]
          }
        ],
        members: [],
        events: [],
        roles: []
      });

      const migration = new MigrationService((progress) => {
        progressUpdates.push(progress);
      });

      const result = await migration.migrateFromLocalStorage();

      expect(result.success).toBe(true);
      expect(result.songsCount).toBe(1);
      expect(result.filesUploaded).toBe(1);

      // Verify chart URL updated to Supabase Storage URL
      const songs = await supabaseStorageService.load();
      expect(songs.songs[0].charts[0].fileUrl).not.toContain('data:');
      expect(songs.songs[0].charts[0].fileUrl).toContain('supabase');
    });

    it('should report progress during migration', async () => {
      jest.spyOn(localStorageService, 'load').mockReturnValue({
        songs: [{ id: '1', title: 'Song 1' }, { id: '2', title: 'Song 2' }],
        members: [],
        events: [],
        roles: []
      });

      const migration = new MigrationService((progress) => {
        progressUpdates.push(progress);
      });

      await migration.migrateFromLocalStorage();

      expect(progressUpdates).toContainEqual(
        expect.objectContaining({ phase: 'loading' })
      );
      expect(progressUpdates).toContainEqual(
        expect.objectContaining({ phase: 'uploading_files' })
      );
      expect(progressUpdates).toContainEqual(
        expect.objectContaining({ phase: 'saving_data' })
      );
      expect(progressUpdates).toContainEqual(
        expect.objectContaining({ phase: 'complete' })
      );
    });

    it('should handle migration errors gracefully', async () => {
      jest.spyOn(localStorageService, 'load').mockImplementation(() => {
        throw new Error('localStorage corrupted');
      });

      const migration = new MigrationService((progress) => {
        progressUpdates.push(progress);
      });

      const result = await migration.migrateFromLocalStorage();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('localStorage corrupted');
      expect(progressUpdates).toContainEqual(
        expect.objectContaining({ phase: 'error' })
      );
    });

    it('should skip empty charts during migration', async () => {
      jest.spyOn(localStorageService, 'load').mockReturnValue({
        songs: [
          {
            id: '1',
            title: 'Song with empty chart',
            charts: [{ id: 'chart-1', name: 'Guitar', fileUrl: '' }]
          }
        ],
        members: [],
        events: [],
        roles: []
      });

      const migration = new MigrationService();
      const result = await migration.migrateFromLocalStorage();

      expect(result.filesUploaded).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });
});
```

**4. Integration Tests:**

```typescript
// services/__tests__/integration.test.ts
describe('Service Layer Integration', () => {
  it('should handle full CRUD lifecycle', async () => {
    const service = new SupabaseStorageService();
    const { band } = await seedTestData();
    service.setCurrentBand(band.id);

    // Create
    const song = { id: '1', title: 'New Song', artist: 'Artist', status: 'learning' };
    await service.save([song], [], [], []);

    // Read
    let data = await service.load();
    expect(data.songs).toHaveLength(1);

    // Update
    const updatedSong = { ...song, title: 'Updated Song' };
    await service.save([updatedSong], [], [], []);
    data = await service.load();
    expect(data.songs[0].title).toBe('Updated Song');

    // Delete
    await service.save([], [], [], []);
    data = await service.load();
    expect(data.songs).toHaveLength(0);
  });
});
```

### Test Configuration

**Package.json scripts:**
```json
{
  "scripts": {
    "test:services": "vitest run services/",
    "test:services:watch": "vitest watch services/",
    "test:services:coverage": "vitest run --coverage services/"
  }
}
```

**Vitest config:**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/services/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/services/**/*.ts'],
      exclude: ['src/services/**/*.test.ts', 'src/services/__tests__/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    }
  }
});
```

## Files Likely Affected

- `/Users/jason/code/personal/band_assist/src/services/__tests__/setup.ts` - Test setup and utilities
- `/Users/jason/code/personal/band_assist/src/services/__tests__/supabaseStorageService.test.ts` - SupabaseStorageService tests
- `/Users/jason/code/personal/band_assist/src/services/__tests__/migrationService.test.ts` - MigrationService tests
- `/Users/jason/code/personal/band_assist/src/services/__tests__/integration.test.ts` - Integration tests
- `/Users/jason/code/personal/band_assist/src/services/__tests__/storageService.test.ts` - StorageService facade tests
- `/Users/jason/code/personal/band_assist/vitest.config.ts` - Add coverage thresholds
- `/Users/jason/code/personal/band_assist/package.json` - Add test scripts
- `/Users/jason/code/personal/band_assist/.github/workflows/ci.yml` - Add service tests to CI

## Acceptance Criteria

- [ ] Test setup created with Supabase test environment
- [ ] SupabaseStorageService tests: 80%+ line coverage
- [ ] MigrationService tests: 80%+ line coverage
- [ ] StorageService facade tests: 80%+ line coverage
- [ ] All CRUD operations tested (create, read, update, delete)
- [ ] File upload/download operations tested
- [ ] Error handling tested (network failures, validation errors)
- [ ] Multi-band context switching tested
- [ ] Large dataset performance tested (100+ songs)
- [ ] Test data cleanup after each test
- [ ] CI pipeline runs service tests automatically
- [ ] Coverage report generated and tracked

## Testing Strategy

**Unit Testing:**
- Test each service method in isolation
- Mock Supabase client for fast, deterministic tests
- Cover happy path and error cases
- Use test fixtures for complex data structures

**Integration Testing:**
- Test service interactions (migration → storage)
- Use real Supabase local instance or test project
- Test full CRUD lifecycle
- Verify data integrity across operations

**Performance Testing:**
```typescript
describe('Performance', () => {
  it('should handle 1000 songs efficiently', async () => {
    const songs = Array.from({ length: 1000 }, (_, i) => ({
      id: `song-${i}`,
      title: `Song ${i}`
    }));

    const start = performance.now();
    await service.save(songs, [], [], []);
    const saveTime = performance.now() - start;

    const loadStart = performance.now();
    await service.load();
    const loadTime = performance.now() - loadStart;

    expect(saveTime).toBeLessThan(5000); // <5s save
    expect(loadTime).toBeLessThan(2000); // <2s load
  });
});
```

**CI Integration:**
```yaml
# .github/workflows/ci.yml
- name: Run Service Tests
  run: npm run test:services
  env:
    VITE_TEST_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
    VITE_TEST_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
    flags: services
```

**Manual Testing:**
1. Run full test suite: `npm run test:services`
2. Check coverage: `npm run test:services:coverage`
3. Verify coverage thresholds met (80%+)
4. Test with real Supabase project (staging)
5. Load test with large datasets (1000+ songs)
6. Test error scenarios (network disconnect, quota exceeded)
7. Verify no data corruption after tests
