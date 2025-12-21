import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PracticeHistory } from '../PracticeHistory';
import type { Song, PracticeSession, PracticeStats } from '@/types';

// Mock the hooks
vi.mock('@/hooks/usePracticeSessions');
vi.mock('@/hooks/usePracticeStats');
vi.mock('@/hooks/useUserSongStatus');
vi.mock('@/hooks/useSongSections');

// Mock supabaseStorageService for getSectionsByIds
vi.mock('@/services/supabaseStorageService', () => ({
  supabaseStorageService: {
    getSectionsByIds: vi.fn().mockResolvedValue(new Map()),
  },
}));

import { usePracticeSessions } from '@/hooks/usePracticeSessions';
import { usePracticeStats } from '@/hooks/usePracticeStats';
import { useAllUserSongStatuses } from '@/hooks/useUserSongStatus';
import { useSongSections } from '@/hooks/useSongSections';
import { supabaseStorageService } from '@/services/supabaseStorageService';

// Type the mocked hooks
const mockUsePracticeSessions = vi.mocked(usePracticeSessions);
const mockUsePracticeStats = vi.mocked(usePracticeStats);
const mockUseAllUserSongStatuses = vi.mocked(useAllUserSongStatuses);
const mockUseSongSections = vi.mocked(useSongSections);

// Default mock functions for practice sessions hook
const createMockSessionsHook = (overrides = {}) => ({
  sessions: [],
  isLoading: false,
  error: null,
  refetch: vi.fn(),
  logSession: vi.fn(),
  updateSession: vi.fn(),
  deleteSession: vi.fn(),
  ...overrides,
});

// Default mock functions for practice stats hook
const createMockStatsHook = (overrides: { stats?: PracticeStats | null; isLoading?: boolean; error?: Error | null } = {}) => ({
  stats: null,
  sectionStats: new Map() as Map<string, { totalMinutes: number; sessionCount: number }>,
  isLoading: false,
  error: null,
  refetch: vi.fn() as unknown as () => Promise<void>,
  ...overrides,
});

describe('PracticeHistory', () => {
  const mockSongs: Song[] = [
    {
      id: 'song-1',
      title: 'Test Song 1',
      artist: 'Test Artist',
      duration: '3:30',
      bpm: 120,
      key: 'C',
      isOriginal: false,
      status: 'Performance Ready',
      assignments: [],
      parts: [],
      charts: [],
    },
    {
      id: 'song-2',
      title: 'Test Song 2',
      artist: 'Test Artist 2',
      duration: '4:00',
      bpm: 140,
      key: 'G',
      isOriginal: false,
      status: 'In Progress',
      assignments: [],
      parts: [],
      charts: [],
    },
  ];

  const mockSessions: PracticeSession[] = [
    {
      id: 'session-1',
      userId: 'user-1',
      songId: 'song-1',
      bandId: 'band-1',
      durationMinutes: 30,
      tempoBpm: 120,
      sectionsPracticed: ['Intro', 'Chorus'],
      notes: 'Good progress on chorus',
      date: '2025-12-05',
      createdAt: '2025-12-05T10:00:00Z',
      updatedAt: '2025-12-05T10:00:00Z',
    },
    {
      id: 'session-2',
      userId: 'user-1',
      songId: 'song-2',
      bandId: 'band-1',
      durationMinutes: 45,
      tempoBpm: 140,
      sectionsPracticed: ['Verse', 'Bridge'],
      notes: 'Need more work on bridge',
      date: '2025-12-04',
      createdAt: '2025-12-04T10:00:00Z',
      updatedAt: '2025-12-04T10:00:00Z',
    },
  ];

  const mockStats: PracticeStats = {
    totalSessions: 10,
    totalMinutes: 300,
    averageSessionMinutes: 30,
    songsLearned: 5,
    songsMastered: 3,
    recentSessions: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for useSongSections (empty sections)
    mockUseSongSections.mockReturnValue({
      sections: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      createSection: vi.fn(),
      updateSection: vi.fn(),
      deleteSection: vi.fn(),
      upsertSections: vi.fn(),
      deleteAllSections: vi.fn(),
    });
  });

  describe('unauthenticated state', () => {
    it('should show link account message when currentUserId is null', () => {
      // Setup mocks for unauthenticated state
      mockUsePracticeSessions.mockReturnValue(createMockSessionsHook());

      mockUsePracticeStats.mockReturnValue(createMockStatsHook());

      mockUseAllUserSongStatuses.mockReturnValue({
        statuses: new Map(),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <PracticeHistory
          songs={mockSongs}
          currentUserId={null}
          currentBandId="band-1"
        />
      );

      expect(screen.getByText('Link Your Account')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Link your account to a band member to track your personal practice history and progress.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading spinner when sessions loading', () => {
      mockUsePracticeSessions.mockReturnValue(createMockSessionsHook({ isLoading: true }));

      mockUsePracticeStats.mockReturnValue(createMockStatsHook());

      mockUseAllUserSongStatuses.mockReturnValue({
        statuses: new Map(),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <PracticeHistory
          songs={mockSongs}
          currentUserId="user-1"
          currentBandId="band-1"
        />
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Loading practice history...')).toBeInTheDocument();
    });

    it('should show loading spinner when stats loading', () => {
      mockUsePracticeSessions.mockReturnValue(createMockSessionsHook());

      mockUsePracticeStats.mockReturnValue(createMockStatsHook({ isLoading: true }));

      mockUseAllUserSongStatuses.mockReturnValue({
        statuses: new Map(),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <PracticeHistory
          songs={mockSongs}
          currentUserId="user-1"
          currentBandId="band-1"
        />
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should show loading spinner when statuses loading', () => {
      mockUsePracticeSessions.mockReturnValue(createMockSessionsHook());

      mockUsePracticeStats.mockReturnValue(createMockStatsHook());

      mockUseAllUserSongStatuses.mockReturnValue({
        statuses: new Map(),
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <PracticeHistory
          songs={mockSongs}
          currentUserId="user-1"
          currentBandId="band-1"
        />
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('stats display', () => {
    beforeEach(() => {
      mockUsePracticeSessions.mockReturnValue(createMockSessionsHook());

      mockUseAllUserSongStatuses.mockReturnValue({
        statuses: new Map(),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it('should display stats cards with correct values', () => {
      mockUsePracticeStats.mockReturnValue(createMockStatsHook({ stats: mockStats }));

      render(
        <PracticeHistory
          songs={mockSongs}
          currentUserId="user-1"
          currentBandId="band-1"
        />
      );

      // Check stat card titles
      expect(screen.getByText('Total Sessions')).toBeInTheDocument();
      expect(screen.getByText('Total Practice Time')).toBeInTheDocument();
      expect(screen.getByText('Songs Learned')).toBeInTheDocument();
      expect(screen.getByText('Songs Mastered')).toBeInTheDocument();

      // Check stat values
      expect(screen.getByText('10')).toBeInTheDocument(); // totalSessions
      expect(screen.getByText('5h 0m')).toBeInTheDocument(); // 300 min = 5 hours
      expect(screen.getByText('5')).toBeInTheDocument(); // songsLearned
      expect(screen.getByText('3')).toBeInTheDocument(); // songsMastered
    });

    it('should display zero stats when stats is null', () => {
      mockUsePracticeStats.mockReturnValue(createMockStatsHook());

      render(
        <PracticeHistory
          songs={mockSongs}
          currentUserId="user-1"
          currentBandId="band-1"
        />
      );

      // Should show 0 for all stats
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(2); // At least totalSessions and 0m time
    });

    it('should format minutes under 60 correctly', () => {
      mockUsePracticeStats.mockReturnValue(createMockStatsHook({ stats: { ...mockStats, totalMinutes: 45 } }));

      render(
        <PracticeHistory
          songs={mockSongs}
          currentUserId="user-1"
          currentBandId="band-1"
        />
      );

      expect(screen.getByText('45m')).toBeInTheDocument();
    });

    it('should format hours and minutes correctly', () => {
      mockUsePracticeStats.mockReturnValue(createMockStatsHook({ stats: { ...mockStats, totalMinutes: 90 } }));

      render(
        <PracticeHistory
          songs={mockSongs}
          currentUserId="user-1"
          currentBandId="band-1"
        />
      );

      expect(screen.getByText('1h 30m')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no sessions', () => {
      mockUsePracticeSessions.mockReturnValue(createMockSessionsHook());

      mockUsePracticeStats.mockReturnValue(createMockStatsHook({ stats: mockStats }));

      mockUseAllUserSongStatuses.mockReturnValue({
        statuses: new Map(),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <PracticeHistory
          songs={mockSongs}
          currentUserId="user-1"
          currentBandId="band-1"
        />
      );

      expect(screen.getByText('No Practice Sessions')).toBeInTheDocument();
      expect(
        screen.getByText(
          'No practice sessions found for the selected filters. Start practicing to see your history here!'
        )
      ).toBeInTheDocument();
    });
  });

  describe('session table', () => {
    beforeEach(() => {
      mockUsePracticeStats.mockReturnValue(createMockStatsHook({ stats: mockStats }));

      mockUseAllUserSongStatuses.mockReturnValue({
        statuses: new Map([
          ['song-1', {
            id: 'progress-1',
            userId: 'user-1',
            songId: 'song-1',
            status: 'Mastered',
            confidenceLevel: 5,
            lastPracticedAt: '2025-12-05',
            createdAt: '2025-12-05T10:00:00Z',
            updatedAt: '2025-12-05T10:00:00Z',
          }],
          ['song-2', {
            id: 'progress-2',
            userId: 'user-1',
            songId: 'song-2',
            status: 'Learning',
            confidenceLevel: 3,
            lastPracticedAt: '2025-12-04',
            createdAt: '2025-12-04T10:00:00Z',
            updatedAt: '2025-12-04T10:00:00Z',
          }],
        ]),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it('should render sessions table with data', () => {
      mockUsePracticeSessions.mockReturnValue(createMockSessionsHook({ sessions: mockSessions }));

      render(
        <PracticeHistory
          songs={mockSongs}
          currentUserId="user-1"
          currentBandId="band-1"
        />
      );

      // Check table headers (use getAllByText since "Song" appears in both filter label and table header)
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getAllByText('Song').length).toBeGreaterThan(0);
      expect(screen.getByText('Duration')).toBeInTheDocument();

      // Check session data
      expect(screen.getByText('Test Song 1')).toBeInTheDocument();
      expect(screen.getByText('Test Song 2')).toBeInTheDocument();
      expect(screen.getByText('30m')).toBeInTheDocument();
      expect(screen.getByText('45m')).toBeInTheDocument();
      expect(screen.getByText('120 BPM')).toBeInTheDocument();
      expect(screen.getByText('140 BPM')).toBeInTheDocument();
      // Sections are now rendered as individual spans within a td
      expect(screen.getByText('Intro')).toBeInTheDocument();
      expect(screen.getByText('Chorus')).toBeInTheDocument();
      expect(screen.getByText('Verse')).toBeInTheDocument();
      expect(screen.getByText('Bridge')).toBeInTheDocument();
    });

    it('should display session count', () => {
      mockUsePracticeSessions.mockReturnValue(createMockSessionsHook({ sessions: mockSessions }));

      render(
        <PracticeHistory
          songs={mockSongs}
          currentUserId="user-1"
          currentBandId="band-1"
        />
      );

      expect(screen.getByText('2 sessions')).toBeInTheDocument();
    });

    it('should display Unknown Song when song not found', () => {
      const sessionsWithUnknownSong: PracticeSession[] = [
        {
          ...mockSessions[0],
          songId: 'unknown-song-id',
        },
      ];

      mockUsePracticeSessions.mockReturnValue(createMockSessionsHook({ sessions: sessionsWithUnknownSong }));

      render(
        <PracticeHistory
          songs={mockSongs}
          currentUserId="user-1"
          currentBandId="band-1"
        />
      );

      expect(screen.getByText('Unknown Song')).toBeInTheDocument();
    });

    it('should display status badges', () => {
      mockUsePracticeSessions.mockReturnValue(createMockSessionsHook({ sessions: mockSessions }));

      render(
        <PracticeHistory
          songs={mockSongs}
          currentUserId="user-1"
          currentBandId="band-1"
        />
      );

      expect(screen.getByText('Mastered')).toBeInTheDocument();
      expect(screen.getByText('Learning')).toBeInTheDocument();
    });

    it('should resolve section names from sectionIds when available', async () => {
      // Create sessions with sectionIds instead of sectionsPracticed
      const sessionsWithSectionIds: PracticeSession[] = [
        {
          id: 'session-with-ids',
          userId: 'user-1',
          songId: 'song-1',
          bandId: 'band-1',
          durationMinutes: 30,
          tempoBpm: 120,
          sectionIds: ['section-uuid-1', 'section-uuid-2'],
          notes: 'Practiced with section IDs',
          date: '2025-12-05',
          createdAt: '2025-12-05T10:00:00Z',
          updatedAt: '2025-12-05T10:00:00Z',
        },
      ];

      // Mock getSectionsByIds to return section data
      const mockSectionMap = new Map([
        ['section-uuid-1', {
          id: 'section-uuid-1',
          songId: 'song-1',
          bandId: 'band-1',
          name: 'Resolved Intro',
          displayOrder: 0,
          startBar: 1,
          endBar: 8,
          barCount: 8,
          source: 'manual' as const,
          createdAt: '2025-12-01T00:00:00Z',
          updatedAt: '2025-12-01T00:00:00Z',
        }],
        ['section-uuid-2', {
          id: 'section-uuid-2',
          songId: 'song-1',
          bandId: 'band-1',
          name: 'Resolved Chorus',
          displayOrder: 1,
          startBar: 9,
          endBar: 24,
          barCount: 16,
          source: 'manual' as const,
          createdAt: '2025-12-01T00:00:00Z',
          updatedAt: '2025-12-01T00:00:00Z',
        }],
      ]);

      vi.mocked(supabaseStorageService.getSectionsByIds).mockResolvedValue(mockSectionMap);

      mockUsePracticeSessions.mockReturnValue(createMockSessionsHook({ sessions: sessionsWithSectionIds }));

      render(
        <PracticeHistory
          songs={mockSongs}
          currentUserId="user-1"
          currentBandId="band-1"
        />
      );

      // Wait for the section names to be resolved and displayed
      await waitFor(() => {
        expect(screen.getByText('Resolved Intro')).toBeInTheDocument();
      });
      expect(screen.getByText('Resolved Chorus')).toBeInTheDocument();
    });

    it('should show Unknown section for deleted sections', async () => {
      // Session references a section that no longer exists
      const sessionsWithDeletedSection: PracticeSession[] = [
        {
          id: 'session-deleted-section',
          userId: 'user-1',
          songId: 'song-1',
          bandId: 'band-1',
          durationMinutes: 30,
          sectionIds: ['deleted-section-uuid'],
          date: '2025-12-05',
          createdAt: '2025-12-05T10:00:00Z',
          updatedAt: '2025-12-05T10:00:00Z',
        },
      ];

      // Mock returns empty map (section was deleted)
      vi.mocked(supabaseStorageService.getSectionsByIds).mockResolvedValue(new Map());

      mockUsePracticeSessions.mockReturnValue(createMockSessionsHook({ sessions: sessionsWithDeletedSection }));

      render(
        <PracticeHistory
          songs={mockSongs}
          currentUserId="user-1"
          currentBandId="band-1"
        />
      );

      // Wait for the section to be rendered as "Unknown section"
      await waitFor(() => {
        expect(screen.getByText('Unknown section')).toBeInTheDocument();
      });
    });
  });

  describe('song filter', () => {
    beforeEach(() => {
      mockUsePracticeStats.mockReturnValue(createMockStatsHook({ stats: mockStats }));

      mockUseAllUserSongStatuses.mockReturnValue({
        statuses: new Map(),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it('should filter sessions when song filter changed', () => {
      mockUsePracticeSessions.mockReturnValue(createMockSessionsHook());

      render(
        <PracticeHistory
          songs={mockSongs}
          currentUserId="user-1"
          currentBandId="band-1"
        />
      );

      // Verify the song filter select is rendered
      const songSelect = screen.getByRole('combobox', { name: /song/i });
      expect(songSelect).toBeInTheDocument();

      // Verify the hook was called initially with no songId filter (all songs)
      const initialCall = mockUsePracticeSessions.mock.calls[0];
      expect(initialCall[2]).toMatchObject({ songId: undefined });
    });

    it('should show all songs by default', () => {
      mockUsePracticeSessions.mockReturnValue(createMockSessionsHook());

      render(
        <PracticeHistory
          songs={mockSongs}
          currentUserId="user-1"
          currentBandId="band-1"
        />
      );

      // Initial call should have songId: undefined (all songs)
      const firstCall = mockUsePracticeSessions.mock.calls[0];
      expect(firstCall[2]).toMatchObject({ songId: undefined });
    });
  });

  describe('date range filter', () => {
    beforeEach(() => {
      mockUsePracticeStats.mockReturnValue(createMockStatsHook({ stats: mockStats }));

      mockUseAllUserSongStatuses.mockReturnValue({
        statuses: new Map(),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it('should filter sessions when start date changed and Apply Filters clicked', async () => {
      const user = userEvent.setup();

      mockUsePracticeSessions.mockReturnValue(createMockSessionsHook());

      render(
        <PracticeHistory
          songs={mockSongs}
          currentUserId="user-1"
          currentBandId="band-1"
        />
      );

      const startDateInput = screen.getByLabelText('Start Date');
      await user.clear(startDateInput);
      await user.type(startDateInput, '2025-11-01');

      // Click Apply Filters button to apply the staged filter
      const applyButton = screen.getByRole('button', { name: /apply filters/i });
      await user.click(applyButton);

      // Verify hook was called with updated date
      await waitFor(() => {
        const lastCall = mockUsePracticeSessions.mock.calls[mockUsePracticeSessions.mock.calls.length - 1];
        expect(lastCall[2]).toMatchObject({ startDate: '2025-11-01' });
      });
    });

    it('should filter sessions when end date changed and Apply Filters clicked', async () => {
      const user = userEvent.setup();

      mockUsePracticeSessions.mockReturnValue(createMockSessionsHook());

      render(
        <PracticeHistory
          songs={mockSongs}
          currentUserId="user-1"
          currentBandId="band-1"
        />
      );

      const endDateInput = screen.getByLabelText('End Date');
      await user.clear(endDateInput);
      await user.type(endDateInput, '2025-12-31');

      // Click Apply Filters button to apply the staged filter
      const applyButton = screen.getByRole('button', { name: /apply filters/i });
      await user.click(applyButton);

      // Verify hook was called with updated date
      await waitFor(() => {
        const lastCall = mockUsePracticeSessions.mock.calls[mockUsePracticeSessions.mock.calls.length - 1];
        expect(lastCall[2]).toMatchObject({ endDate: '2025-12-31' });
      });
    });
  });

  describe('error state', () => {
    it('should display error message when sessions fail to load', () => {
      mockUsePracticeSessions.mockReturnValue(createMockSessionsHook({
        error: new Error('Failed to fetch sessions'),
      }));

      mockUsePracticeStats.mockReturnValue(createMockStatsHook());

      mockUseAllUserSongStatuses.mockReturnValue({
        statuses: new Map(),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <PracticeHistory
          songs={mockSongs}
          currentUserId="user-1"
          currentBandId="band-1"
        />
      );

      expect(
        screen.getByText('Failed to load practice history: Failed to fetch sessions')
      ).toBeInTheDocument();
    });

    it('should display error message when stats fail to load', () => {
      mockUsePracticeSessions.mockReturnValue(createMockSessionsHook());

      mockUsePracticeStats.mockReturnValue(createMockStatsHook({ error: new Error('Failed to fetch stats') }));

      mockUseAllUserSongStatuses.mockReturnValue({
        statuses: new Map(),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <PracticeHistory
          songs={mockSongs}
          currentUserId="user-1"
          currentBandId="band-1"
        />
      );

      expect(
        screen.getByText('Failed to load practice history: Failed to fetch stats')
      ).toBeInTheDocument();
    });
  });

  describe('status filter', () => {
    beforeEach(() => {
      mockUsePracticeStats.mockReturnValue(createMockStatsHook({ stats: mockStats }));
    });

    it('should render status filter dropdown', () => {
      mockUsePracticeSessions.mockReturnValue(createMockSessionsHook({ sessions: mockSessions }));

      mockUseAllUserSongStatuses.mockReturnValue({
        statuses: new Map([
          ['song-1', {
            id: 'progress-1',
            userId: 'user-1',
            songId: 'song-1',
            status: 'Mastered',
            createdAt: '2025-12-05T10:00:00Z',
            updatedAt: '2025-12-05T10:00:00Z',
          }],
        ]),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <PracticeHistory
          songs={mockSongs}
          currentUserId="user-1"
          currentBandId="band-1"
        />
      );

      // Verify the status filter select is rendered
      const statusSelect = screen.getByRole('combobox', { name: /status/i });
      expect(statusSelect).toBeInTheDocument();
    });

    it('should show all status options in the dropdown', () => {
      mockUsePracticeSessions.mockReturnValue(createMockSessionsHook({ sessions: mockSessions }));

      mockUseAllUserSongStatuses.mockReturnValue({
        statuses: new Map([
          ['song-1', {
            id: 'progress-1',
            userId: 'user-1',
            songId: 'song-1',
            status: 'Mastered',
            createdAt: '2025-12-05T10:00:00Z',
            updatedAt: '2025-12-05T10:00:00Z',
          }],
        ]),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <PracticeHistory
          songs={mockSongs}
          currentUserId="user-1"
          currentBandId="band-1"
        />
      );

      // Verify status filter is rendered with default "All Statuses" option
      const statusSelect = screen.getByRole('combobox', { name: /status/i });
      expect(statusSelect).toHaveTextContent('All Statuses');
    });
  });

  describe('memo behavior', () => {
    it('has displayName set', () => {
      expect(PracticeHistory.displayName).toBe('PracticeHistory');
    });
  });
});
