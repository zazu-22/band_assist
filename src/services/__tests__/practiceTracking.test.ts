import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { SupabaseStorageService } from '../supabaseStorageService';

// Mock the Supabase client module
vi.mock('../supabaseClient', () => ({
  getSupabaseClient: vi.fn(),
  isSupabaseConfigured: vi.fn(() => true),
}));

// Import after mocking to get mocked version
import { getSupabaseClient } from '../supabaseClient';

/**
 * Unit tests for practice tracking service methods
 *
 * These tests verify the functionality of:
 * - logPracticeSession: Log a new practice session
 * - getPracticeSessions: Retrieve practice sessions with filters
 * - updateUserSongStatus: Create or update user's song learning status
 * - getUserSongStatus: Get user's status for a specific song
 * - getAllUserSongStatuses: Get all statuses for a user in a band
 * - calculatePracticeStats: Calculate aggregate practice statistics
 *
 * Test Strategy:
 * - Uses mocked Supabase client for isolated unit testing
 * - Tests both success and error paths
 * - Validates input validation logic
 * - Verifies correct Supabase query construction
 * - Tests edge cases (empty data, null values)
 */

describe('Practice Tracking Service Methods', () => {
  let mockSupabase: {
    from: Mock;
    auth: { getSession: Mock };
  };
  let service: SupabaseStorageService;

  // Helper to create a chainable query mock that's also awaitable
  const createQueryMock = (resolvedData?: unknown, resolvedError?: unknown) => {
    // Create a promise that resolves to the data/error
    const promise = Promise.resolve({
      data: resolvedData !== undefined ? resolvedData : null,
      error: resolvedError !== undefined ? resolvedError : null
    });

    const queryMock = {
      // Chainable methods
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      // Terminal methods
      single: vi.fn(),
      maybeSingle: vi.fn(),
      // Make it awaitable
      then: promise.then.bind(promise),
      catch: promise.catch.bind(promise),
    };

    return queryMock;
  };

  beforeEach(() => {
    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn(),
      auth: {
        getSession: vi.fn(),
      },
    };

    // Mock getSupabaseClient to return our mock
    vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as never);

    // Create service instance and set band ID
    service = new SupabaseStorageService();
    service.setCurrentBand('test-band-id');
  });

  describe('logPracticeSession', () => {
    const validSession = {
      userId: 'user-123',
      songId: 'song-456',
      bandId: 'band-789',
      durationMinutes: 30,
      tempoBpm: 120,
      sectionsPracticed: ['Intro', 'Verse 1'],
      notes: 'Great progress today',
      date: '2025-12-05',
    };

    it('should log a valid practice session', async () => {
      // Arrange
      const mockInsertedSession = {
        id: 'session-123',
        user_id: validSession.userId,
        song_id: validSession.songId,
        band_id: validSession.bandId,
        duration_minutes: validSession.durationMinutes,
        tempo_bpm: validSession.tempoBpm,
        sections_practiced: validSession.sectionsPracticed,
        notes: validSession.notes,
        date: validSession.date,
        created_at: '2025-12-05T10:00:00Z',
        updated_at: '2025-12-05T10:00:00Z',
      };

      const mockSessionQuery = createQueryMock();
      const mockStatusQuery = createQueryMock();

      mockSupabase.from
        .mockReturnValueOnce(mockSessionQuery)
        .mockReturnValueOnce(mockStatusQuery);

      mockSessionQuery.single.mockResolvedValueOnce({ data: mockInsertedSession, error: null });
      mockStatusQuery.upsert.mockResolvedValueOnce({ data: null, error: null });

      // Act
      const result = await service.logPracticeSession(validSession);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('practice_sessions');
      expect(mockSessionQuery.insert).toHaveBeenCalledWith({
        user_id: validSession.userId,
        song_id: validSession.songId,
        band_id: validSession.bandId,
        duration_minutes: validSession.durationMinutes,
        tempo_bpm: validSession.tempoBpm,
        sections_practiced: validSession.sectionsPracticed,
        notes: validSession.notes,
        date: validSession.date,
      });
      expect(mockSessionQuery.select).toHaveBeenCalled();
      expect(mockSessionQuery.single).toHaveBeenCalled();

      // Verify result transformation
      expect(result).toEqual({
        id: mockInsertedSession.id,
        userId: mockInsertedSession.user_id,
        songId: mockInsertedSession.song_id,
        bandId: mockInsertedSession.band_id,
        durationMinutes: mockInsertedSession.duration_minutes,
        tempoBpm: mockInsertedSession.tempo_bpm,
        sectionsPracticed: mockInsertedSession.sections_practiced,
        notes: mockInsertedSession.notes,
        date: mockInsertedSession.date,
        createdAt: mockInsertedSession.created_at,
        updatedAt: mockInsertedSession.updated_at,
      });
    });

    it('should reject duration <= 0', async () => {
      // Arrange
      const invalidSession = { ...validSession, durationMinutes: 0 };

      // Act & Assert
      await expect(service.logPracticeSession(invalidSession)).rejects.toThrow(
        'Practice duration must be greater than 0 minutes'
      );

      // Verify no database calls were made
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should reject negative duration', async () => {
      // Arrange
      const invalidSession = { ...validSession, durationMinutes: -5 };

      // Act & Assert
      await expect(service.logPracticeSession(invalidSession)).rejects.toThrow(
        'Practice duration must be greater than 0 minutes'
      );
    });

    it('should update last_practiced_at in user_song_status', async () => {
      // Arrange
      const mockInsertedSession = {
        id: 'session-123',
        user_id: validSession.userId,
        song_id: validSession.songId,
        band_id: validSession.bandId,
        duration_minutes: validSession.durationMinutes,
        tempo_bpm: null,
        sections_practiced: null,
        notes: null,
        date: validSession.date,
        created_at: '2025-12-05T10:00:00Z',
        updated_at: '2025-12-05T10:00:00Z',
      };

      const mockSessionQuery = createQueryMock();
      const mockStatusQuery = createQueryMock();

      mockSupabase.from
        .mockReturnValueOnce(mockSessionQuery)
        .mockReturnValueOnce(mockStatusQuery);

      mockSessionQuery.single.mockResolvedValueOnce({ data: mockInsertedSession, error: null });

      // Act
      await service.logPracticeSession(validSession);

      // Assert - verify update was called with just last_practiced_at (no status override)
      expect(mockSupabase.from).toHaveBeenCalledWith('user_song_status');
      expect(mockStatusQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          last_practiced_at: expect.any(String),
        })
      );
      // Verify eq filters were chained for user_id and song_id
      expect(mockStatusQuery.eq).toHaveBeenCalledWith('user_id', validSession.userId);
      expect(mockStatusQuery.eq).toHaveBeenCalledWith('song_id', validSession.songId);
    });

    it('should handle database error', async () => {
      // Arrange
      const mockSessionQuery = createQueryMock();
      mockSupabase.from.mockReturnValueOnce(mockSessionQuery);

      mockSessionQuery.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed', code: 'PGRST301' },
      });

      // Act & Assert
      await expect(service.logPracticeSession(validSession)).rejects.toThrow(
        'Failed to save practice session'
      );
    });

    it('should handle optional fields as null', async () => {
      // Arrange
      const minimalSession = {
        userId: 'user-123',
        songId: 'song-456',
        bandId: 'band-789',
        durationMinutes: 15,
        date: '2025-12-05',
      };

      const mockInsertedSession = {
        id: 'session-123',
        user_id: minimalSession.userId,
        song_id: minimalSession.songId,
        band_id: minimalSession.bandId,
        duration_minutes: minimalSession.durationMinutes,
        tempo_bpm: null,
        sections_practiced: null,
        notes: null,
        date: minimalSession.date,
        created_at: '2025-12-05T10:00:00Z',
        updated_at: '2025-12-05T10:00:00Z',
      };

      const mockSessionQuery = createQueryMock();
      const mockStatusQuery = createQueryMock();

      mockSupabase.from
        .mockReturnValueOnce(mockSessionQuery)
        .mockReturnValueOnce(mockStatusQuery);

      mockSessionQuery.single.mockResolvedValueOnce({ data: mockInsertedSession, error: null });
      mockStatusQuery.upsert.mockResolvedValueOnce({ data: null, error: null });

      // Act
      const result = await service.logPracticeSession(minimalSession);

      // Assert
      expect(mockSessionQuery.insert).toHaveBeenCalledWith({
        user_id: minimalSession.userId,
        song_id: minimalSession.songId,
        band_id: minimalSession.bandId,
        duration_minutes: minimalSession.durationMinutes,
        tempo_bpm: null,
        sections_practiced: null,
        notes: null,
        date: minimalSession.date,
      });
      expect(result.tempoBpm).toBeUndefined();
      expect(result.sectionsPracticed).toBeUndefined();
      expect(result.notes).toBeUndefined();
    });
  });

  describe('getPracticeSessions', () => {
    const userId = 'user-123';
    const bandId = 'band-789';

    it('should return sessions ordered by date descending', async () => {
      // Arrange
      const mockSessions = [
        {
          id: 'session-1',
          user_id: userId,
          song_id: 'song-1',
          band_id: bandId,
          duration_minutes: 30,
          tempo_bpm: 120,
          sections_practiced: ['Intro'],
          notes: 'Good',
          date: '2025-12-05',
          created_at: '2025-12-05T10:00:00Z',
          updated_at: '2025-12-05T10:00:00Z',
        },
        {
          id: 'session-2',
          user_id: userId,
          song_id: 'song-2',
          band_id: bandId,
          duration_minutes: 45,
          tempo_bpm: null,
          sections_practiced: null,
          notes: null,
          date: '2025-12-04',
          created_at: '2025-12-04T10:00:00Z',
          updated_at: '2025-12-04T10:00:00Z',
        },
      ];

      const mockQuery = createQueryMock(mockSessions);
      mockSupabase.from.mockReturnValueOnce(mockQuery);

      // Act
      const result = await service.getPracticeSessions(userId, bandId);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('practice_sessions');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', userId);
      expect(mockQuery.eq).toHaveBeenCalledWith('band_id', bandId);
      expect(mockQuery.order).toHaveBeenCalledWith('date', { ascending: false });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('session-1');
    });

    it('should filter by songId when provided', async () => {
      // Arrange
      const filters = { songId: 'song-specific' };
      const mockQuery = createQueryMock([]);
      mockSupabase.from.mockReturnValueOnce(mockQuery);

      // Act
      await service.getPracticeSessions(userId, bandId, filters);

      // Assert
      expect(mockQuery.eq).toHaveBeenCalledWith('song_id', 'song-specific');
    });

    it('should filter by date range when provided', async () => {
      // Arrange
      const filters = {
        startDate: '2025-12-01',
        endDate: '2025-12-31',
      };
      const mockQuery = createQueryMock([]);
      mockSupabase.from.mockReturnValueOnce(mockQuery);

      // Act
      await service.getPracticeSessions(userId, bandId, filters);

      // Assert
      expect(mockQuery.gte).toHaveBeenCalledWith('date', '2025-12-01');
      expect(mockQuery.lte).toHaveBeenCalledWith('date', '2025-12-31');
    });

    it('should return empty array when no sessions', async () => {
      // Arrange
      const mockQuery = createQueryMock([]);
      mockSupabase.from.mockReturnValueOnce(mockQuery);

      // Act
      const result = await service.getPracticeSessions(userId, bandId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should apply limit when provided', async () => {
      // Arrange
      const filters = { limit: 10 };
      const mockQuery = createQueryMock([]);
      mockSupabase.from.mockReturnValueOnce(mockQuery);

      // Act
      await service.getPracticeSessions(userId, bandId, filters);

      // Assert
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it('should apply multiple filters together', async () => {
      // Arrange
      const filters = {
        songId: 'song-123',
        startDate: '2025-12-01',
        endDate: '2025-12-31',
        limit: 5,
      };
      const mockQuery = createQueryMock([]);
      mockSupabase.from.mockReturnValueOnce(mockQuery);

      // Act
      await service.getPracticeSessions(userId, bandId, filters);

      // Assert
      expect(mockQuery.eq).toHaveBeenCalledWith('song_id', 'song-123');
      expect(mockQuery.gte).toHaveBeenCalledWith('date', '2025-12-01');
      expect(mockQuery.lte).toHaveBeenCalledWith('date', '2025-12-31');
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
    });

    it('should handle database error', async () => {
      // Arrange
      const mockQuery = createQueryMock(null, { message: 'Query failed', code: 'PGRST301' });
      mockSupabase.from.mockReturnValueOnce(mockQuery);

      // Act & Assert
      await expect(service.getPracticeSessions(userId, bandId)).rejects.toThrow(
        'Failed to load practice sessions'
      );
    });
  });

  describe('updateUserSongStatus', () => {
    const userId = 'user-123';
    const songId = 'song-456';

    it('should create new status if none exists', async () => {
      // Arrange
      const mockStatus = {
        id: 'status-123',
        user_id: userId,
        song_id: songId,
        status: 'Learning',
        confidence_level: 3,
        last_practiced_at: null,
        created_at: '2025-12-05T10:00:00Z',
        updated_at: '2025-12-05T10:00:00Z',
      };

      const mockQuery = createQueryMock();
      mockSupabase.from.mockReturnValueOnce(mockQuery);
      mockQuery.single.mockResolvedValueOnce({ data: mockStatus, error: null });

      // Act
      const result = await service.updateUserSongStatus(userId, songId, 'Learning', 3);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('user_song_status');
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        {
          user_id: userId,
          song_id: songId,
          status: 'Learning',
          confidence_level: 3,
          updated_at: expect.any(String),
        },
        {
          onConflict: 'user_id,song_id',
        }
      );
      expect(result).toEqual({
        id: mockStatus.id,
        userId: mockStatus.user_id,
        songId: mockStatus.song_id,
        status: mockStatus.status,
        confidenceLevel: mockStatus.confidence_level,
        lastPracticedAt: undefined,
        createdAt: mockStatus.created_at,
        updatedAt: mockStatus.updated_at,
      });
    });

    it('should update existing status', async () => {
      // Arrange
      const mockStatus = {
        id: 'status-123',
        user_id: userId,
        song_id: songId,
        status: 'Learned',
        confidence_level: 4,
        last_practiced_at: '2025-12-05T09:00:00Z',
        created_at: '2025-12-01T10:00:00Z',
        updated_at: '2025-12-05T10:00:00Z',
      };

      const mockQuery = createQueryMock();
      mockSupabase.from.mockReturnValueOnce(mockQuery);
      mockQuery.single.mockResolvedValueOnce({ data: mockStatus, error: null });

      // Act
      const result = await service.updateUserSongStatus(userId, songId, 'Learned', 4);

      // Assert
      expect(mockQuery.upsert).toHaveBeenCalled();
      expect(result.status).toBe('Learned');
      expect(result.confidenceLevel).toBe(4);
    });

    it('should handle status without confidence level', async () => {
      // Arrange
      const mockStatus = {
        id: 'status-123',
        user_id: userId,
        song_id: songId,
        status: 'Mastered',
        confidence_level: null,
        last_practiced_at: null,
        created_at: '2025-12-05T10:00:00Z',
        updated_at: '2025-12-05T10:00:00Z',
      };

      const mockQuery = createQueryMock();
      mockSupabase.from.mockReturnValueOnce(mockQuery);
      mockQuery.single.mockResolvedValueOnce({ data: mockStatus, error: null });

      // Act
      const result = await service.updateUserSongStatus(userId, songId, 'Mastered');

      // Assert
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          confidence_level: null,
        }),
        expect.any(Object)
      );
      expect(result.confidenceLevel).toBeUndefined();
    });

    it('should handle database error', async () => {
      // Arrange
      const mockQuery = createQueryMock();
      mockSupabase.from.mockReturnValueOnce(mockQuery);
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Upsert failed', code: 'PGRST301' },
      });

      // Act & Assert
      await expect(service.updateUserSongStatus(userId, songId, 'Learning')).rejects.toThrow(
        'Failed to update song status'
      );
    });
  });

  describe('getUserSongStatus', () => {
    const userId = 'user-123';
    const songId = 'song-456';

    it('should return null when no status exists', async () => {
      // Arrange
      const mockQuery = createQueryMock();
      mockSupabase.from.mockReturnValueOnce(mockQuery);
      mockQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      // Act
      const result = await service.getUserSongStatus(userId, songId);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('user_song_status');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', userId);
      expect(mockQuery.eq).toHaveBeenCalledWith('song_id', songId);
      expect(mockQuery.maybeSingle).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return status when exists', async () => {
      // Arrange
      const mockStatus = {
        id: 'status-123',
        user_id: userId,
        song_id: songId,
        status: 'Learning',
        confidence_level: 3,
        last_practiced_at: '2025-12-05T09:00:00Z',
        created_at: '2025-12-01T10:00:00Z',
        updated_at: '2025-12-05T10:00:00Z',
      };

      const mockQuery = createQueryMock();
      mockSupabase.from.mockReturnValueOnce(mockQuery);
      mockQuery.maybeSingle.mockResolvedValueOnce({ data: mockStatus, error: null });

      // Act
      const result = await service.getUserSongStatus(userId, songId);

      // Assert
      expect(result).toEqual({
        id: mockStatus.id,
        userId: mockStatus.user_id,
        songId: mockStatus.song_id,
        status: mockStatus.status,
        confidenceLevel: mockStatus.confidence_level,
        lastPracticedAt: mockStatus.last_practiced_at,
        createdAt: mockStatus.created_at,
        updatedAt: mockStatus.updated_at,
      });
    });

    it('should handle database error', async () => {
      // Arrange
      const mockQuery = createQueryMock();
      mockSupabase.from.mockReturnValueOnce(mockQuery);
      mockQuery.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Query failed', code: 'PGRST301' },
      });

      // Act & Assert
      await expect(service.getUserSongStatus(userId, songId)).rejects.toThrow(
        'Failed to load song status'
      );
    });
  });

  describe('getAllUserSongStatuses', () => {
    const userId = 'user-123';
    const bandId = 'band-789';

    it('should return empty Map when no songs in band', async () => {
      // Arrange
      const mockSongsQuery = createQueryMock([]);
      mockSupabase.from.mockReturnValueOnce(mockSongsQuery);

      // Act
      const result = await service.getAllUserSongStatuses(userId, bandId);

      // Assert
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should return Map keyed by songId', async () => {
      // Arrange
      const mockSongs = [{ id: 'song-1' }, { id: 'song-2' }, { id: 'song-3' }];

      const mockStatuses = [
        {
          id: 'status-1',
          user_id: userId,
          song_id: 'song-1',
          status: 'Learning',
          confidence_level: 3,
          last_practiced_at: '2025-12-05T09:00:00Z',
          created_at: '2025-12-01T10:00:00Z',
          updated_at: '2025-12-05T10:00:00Z',
        },
        {
          id: 'status-2',
          user_id: userId,
          song_id: 'song-3',
          status: 'Learned',
          confidence_level: 4,
          last_practiced_at: '2025-12-04T09:00:00Z',
          created_at: '2025-12-01T10:00:00Z',
          updated_at: '2025-12-04T10:00:00Z',
        },
      ];

      const mockSongsQuery = createQueryMock(mockSongs);
      const mockStatusQuery = createQueryMock(mockStatuses);

      mockSupabase.from
        .mockReturnValueOnce(mockSongsQuery)
        .mockReturnValueOnce(mockStatusQuery);

      // Act
      const result = await service.getAllUserSongStatuses(userId, bandId);

      // Assert
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.has('song-1')).toBe(true);
      expect(result.has('song-3')).toBe(true);
      expect(result.has('song-2')).toBe(false); // No status for this song

      const status1 = result.get('song-1');
      expect(status1?.status).toBe('Learning');
      expect(status1?.confidenceLevel).toBe(3);

      const status3 = result.get('song-3');
      expect(status3?.status).toBe('Learned');
      expect(status3?.confidenceLevel).toBe(4);
    });

    it('should handle database error fetching songs', async () => {
      // Arrange
      const mockQuery = createQueryMock(null, { message: 'Failed to fetch songs', code: 'PGRST301' });
      mockSupabase.from.mockReturnValueOnce(mockQuery);

      // Act & Assert
      await expect(service.getAllUserSongStatuses(userId, bandId)).rejects.toThrow(
        'Failed to load songs'
      );
    });

    it('should handle database error fetching statuses', async () => {
      // Arrange
      const mockSongs = [{ id: 'song-1' }];

      const mockSongsQuery = createQueryMock(mockSongs);
      const mockStatusQuery = createQueryMock(null, { message: 'Failed to fetch statuses', code: 'PGRST301' });

      mockSupabase.from
        .mockReturnValueOnce(mockSongsQuery)
        .mockReturnValueOnce(mockStatusQuery);

      // Act & Assert
      await expect(service.getAllUserSongStatuses(userId, bandId)).rejects.toThrow(
        'Failed to load song statuses'
      );
    });
  });

  describe('calculatePracticeStats', () => {
    const userId = 'user-123';
    const bandId = 'band-789';

    it('should calculate correct totals', async () => {
      // Arrange
      const mockSessions = [
        {
          id: 'session-1',
          user_id: userId,
          song_id: 'song-1',
          band_id: bandId,
          duration_minutes: 30,
          tempo_bpm: 120,
          sections_practiced: ['Intro'],
          notes: 'Good',
          date: '2025-12-05',
          created_at: '2025-12-05T10:00:00Z',
          updated_at: '2025-12-05T10:00:00Z',
        },
        {
          id: 'session-2',
          user_id: userId,
          song_id: 'song-2',
          band_id: bandId,
          duration_minutes: 45,
          tempo_bpm: null,
          sections_practiced: null,
          notes: null,
          date: '2025-12-04',
          created_at: '2025-12-04T10:00:00Z',
          updated_at: '2025-12-04T10:00:00Z',
        },
        {
          id: 'session-3',
          user_id: userId,
          song_id: 'song-1',
          band_id: bandId,
          duration_minutes: 15,
          tempo_bpm: null,
          sections_practiced: null,
          notes: null,
          date: '2025-12-03',
          created_at: '2025-12-03T10:00:00Z',
          updated_at: '2025-12-03T10:00:00Z',
        },
      ];

      const mockSongs = [{ id: 'song-1' }, { id: 'song-2' }];

      const mockStatuses = [
        {
          id: 'status-1',
          user_id: userId,
          song_id: 'song-1',
          status: 'Learned',
          confidence_level: 4,
          last_practiced_at: '2025-12-05T09:00:00Z',
          created_at: '2025-12-01T10:00:00Z',
          updated_at: '2025-12-05T10:00:00Z',
        },
        {
          id: 'status-2',
          user_id: userId,
          song_id: 'song-2',
          status: 'Mastered',
          confidence_level: 5,
          last_practiced_at: '2025-12-04T09:00:00Z',
          created_at: '2025-12-01T10:00:00Z',
          updated_at: '2025-12-04T10:00:00Z',
        },
      ];

      const mockSessionsQuery = createQueryMock(mockSessions);
      const mockSongsQuery = createQueryMock(mockSongs);
      const mockStatusQuery = createQueryMock(mockStatuses);

      mockSupabase.from
        .mockReturnValueOnce(mockSessionsQuery)
        .mockReturnValueOnce(mockSongsQuery)
        .mockReturnValueOnce(mockStatusQuery);

      // Act
      const result = await service.calculatePracticeStats(userId, bandId);

      // Assert
      expect(result.totalSessions).toBe(3);
      expect(result.totalMinutes).toBe(90); // 30 + 45 + 15
      expect(result.averageSessionMinutes).toBe(30); // 90 / 3
      expect(result.songsLearned).toBe(2); // Both Learned and Mastered
      expect(result.songsMastered).toBe(1);
      expect(result.recentSessions).toHaveLength(3);
      expect(result.recentSessions[0].id).toBe('session-1'); // Most recent
    });

    it('should return zeros for empty data', async () => {
      // Arrange
      const mockSessionsQuery = createQueryMock([]);
      const mockSongsQuery = createQueryMock([]);
      const mockStatusQuery = createQueryMock([]);

      mockSupabase.from
        .mockReturnValueOnce(mockSessionsQuery)
        .mockReturnValueOnce(mockSongsQuery)
        .mockReturnValueOnce(mockStatusQuery);

      // Act
      const result = await service.calculatePracticeStats(userId, bandId);

      // Assert
      expect(result).toEqual({
        totalSessions: 0,
        totalMinutes: 0,
        averageSessionMinutes: 0,
        songsLearned: 0,
        songsMastered: 0,
        recentSessions: [],
      });
    });

    it('should count learned songs correctly', async () => {
      // Arrange
      const mockStatuses = [
        {
          id: 'status-1',
          user_id: userId,
          song_id: 'song-1',
          status: 'Not Started',
          confidence_level: null,
          last_practiced_at: null,
          created_at: '2025-12-01T10:00:00Z',
          updated_at: '2025-12-01T10:00:00Z',
        },
        {
          id: 'status-2',
          user_id: userId,
          song_id: 'song-2',
          status: 'Learning',
          confidence_level: 2,
          last_practiced_at: '2025-12-04T09:00:00Z',
          created_at: '2025-12-01T10:00:00Z',
          updated_at: '2025-12-04T10:00:00Z',
        },
        {
          id: 'status-3',
          user_id: userId,
          song_id: 'song-3',
          status: 'Learned',
          confidence_level: 4,
          last_practiced_at: '2025-12-05T09:00:00Z',
          created_at: '2025-12-01T10:00:00Z',
          updated_at: '2025-12-05T10:00:00Z',
        },
        {
          id: 'status-4',
          user_id: userId,
          song_id: 'song-4',
          status: 'Mastered',
          confidence_level: 5,
          last_practiced_at: '2025-12-05T09:00:00Z',
          created_at: '2025-12-01T10:00:00Z',
          updated_at: '2025-12-05T10:00:00Z',
        },
      ];

      const mockSongs = [
        { id: 'song-1' },
        { id: 'song-2' },
        { id: 'song-3' },
        { id: 'song-4' },
      ];

      const mockSessionsQuery = createQueryMock([]);
      const mockSongsQuery = createQueryMock(mockSongs);
      const mockStatusQuery = createQueryMock(mockStatuses);

      mockSupabase.from
        .mockReturnValueOnce(mockSessionsQuery)
        .mockReturnValueOnce(mockSongsQuery)
        .mockReturnValueOnce(mockStatusQuery);

      // Act
      const result = await service.calculatePracticeStats(userId, bandId);

      // Assert
      expect(result.songsLearned).toBe(2); // Learned + Mastered
      expect(result.songsMastered).toBe(1); // Only Mastered
    });

    it('should filter by date range when provided', async () => {
      // Arrange
      const dateRange = { start: '2025-12-01', end: '2025-12-31' };

      const mockSessionsQuery = createQueryMock([]);
      const mockSongsQuery = createQueryMock([]);
      const mockStatusQuery = createQueryMock([]);

      mockSupabase.from
        .mockReturnValueOnce(mockSessionsQuery)
        .mockReturnValueOnce(mockSongsQuery)
        .mockReturnValueOnce(mockStatusQuery);

      // Act
      await service.calculatePracticeStats(userId, bandId, dateRange);

      // Assert
      expect(mockSessionsQuery.gte).toHaveBeenCalledWith('date', '2025-12-01');
      expect(mockSessionsQuery.lte).toHaveBeenCalledWith('date', '2025-12-31');
    });

    it('should limit recent sessions to 5', async () => {
      // Arrange
      const mockSessions = Array.from({ length: 10 }, (_, i) => ({
        id: `session-${i}`,
        user_id: userId,
        song_id: 'song-1',
        band_id: bandId,
        duration_minutes: 30,
        tempo_bpm: null,
        sections_practiced: null,
        notes: null,
        date: `2025-12-${String(10 - i).padStart(2, '0')}`,
        created_at: '2025-12-05T10:00:00Z',
        updated_at: '2025-12-05T10:00:00Z',
      }));

      const mockSessionsQuery = createQueryMock(mockSessions);
      const mockSongsQuery = createQueryMock([]);
      const mockStatusQuery = createQueryMock([]);

      mockSupabase.from
        .mockReturnValueOnce(mockSessionsQuery)
        .mockReturnValueOnce(mockSongsQuery)
        .mockReturnValueOnce(mockStatusQuery);

      // Act
      const result = await service.calculatePracticeStats(userId, bandId);

      // Assert
      expect(result.recentSessions).toHaveLength(5);
    });

    it('should handle database error fetching sessions', async () => {
      // Arrange
      const mockQuery = createQueryMock(null, { message: 'Failed to fetch sessions', code: 'PGRST301' });
      mockSupabase.from.mockReturnValueOnce(mockQuery);

      // Act & Assert
      await expect(service.calculatePracticeStats(userId, bandId)).rejects.toThrow(
        'Failed to calculate practice statistics'
      );
    });
  });
});
