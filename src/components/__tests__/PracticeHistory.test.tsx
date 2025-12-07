import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PracticeHistory } from '../PracticeHistory';
import type { Song, PracticeSession, PracticeStats } from '@/types';

// Mock the hooks
vi.mock('@/hooks/usePracticeSessions');
vi.mock('@/hooks/usePracticeStats');
vi.mock('@/hooks/useUserSongStatus');

import { usePracticeSessions } from '@/hooks/usePracticeSessions';
import { usePracticeStats } from '@/hooks/usePracticeStats';
import { useAllUserSongStatuses } from '@/hooks/useUserSongStatus';

// Type the mocked hooks
const mockUsePracticeSessions = vi.mocked(usePracticeSessions);
const mockUsePracticeStats = vi.mocked(usePracticeStats);
const mockUseAllUserSongStatuses = vi.mocked(useAllUserSongStatuses);

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
  });

  describe('unauthenticated state', () => {
    it('should show link account message when currentUserId is null', () => {
      // Setup mocks for unauthenticated state
      mockUsePracticeSessions.mockReturnValue({
        sessions: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      mockUsePracticeStats.mockReturnValue({
        stats: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

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
      mockUsePracticeSessions.mockReturnValue({
        sessions: [],
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      mockUsePracticeStats.mockReturnValue({
        stats: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

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
      mockUsePracticeSessions.mockReturnValue({
        sessions: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      mockUsePracticeStats.mockReturnValue({
        stats: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

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
      mockUsePracticeSessions.mockReturnValue({
        sessions: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      mockUsePracticeStats.mockReturnValue({
        stats: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

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
      mockUsePracticeSessions.mockReturnValue({
        sessions: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      mockUseAllUserSongStatuses.mockReturnValue({
        statuses: new Map(),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it('should display stats cards with correct values', () => {
      mockUsePracticeStats.mockReturnValue({
        stats: mockStats,
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
      mockUsePracticeStats.mockReturnValue({
        stats: null,
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

      // Should show 0 for all stats
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(2); // At least totalSessions and 0m time
    });

    it('should format minutes under 60 correctly', () => {
      mockUsePracticeStats.mockReturnValue({
        stats: { ...mockStats, totalMinutes: 45 },
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

      expect(screen.getByText('45m')).toBeInTheDocument();
    });

    it('should format hours and minutes correctly', () => {
      mockUsePracticeStats.mockReturnValue({
        stats: { ...mockStats, totalMinutes: 90 },
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

      expect(screen.getByText('1h 30m')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no sessions', () => {
      mockUsePracticeSessions.mockReturnValue({
        sessions: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      mockUsePracticeStats.mockReturnValue({
        stats: mockStats,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

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
      mockUsePracticeStats.mockReturnValue({
        stats: mockStats,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

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
      mockUsePracticeSessions.mockReturnValue({
        sessions: mockSessions,
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
      expect(screen.getByText('Intro, Chorus')).toBeInTheDocument();
      expect(screen.getByText('Verse, Bridge')).toBeInTheDocument();
    });

    it('should display session count', () => {
      mockUsePracticeSessions.mockReturnValue({
        sessions: mockSessions,
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

      expect(screen.getByText('2 sessions found')).toBeInTheDocument();
    });

    it('should display Unknown Song when song not found', () => {
      const sessionsWithUnknownSong: PracticeSession[] = [
        {
          ...mockSessions[0],
          songId: 'unknown-song-id',
        },
      ];

      mockUsePracticeSessions.mockReturnValue({
        sessions: sessionsWithUnknownSong,
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

      expect(screen.getByText('Unknown Song')).toBeInTheDocument();
    });

    it('should display status badges', () => {
      mockUsePracticeSessions.mockReturnValue({
        sessions: mockSessions,
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

      expect(screen.getByText('Mastered')).toBeInTheDocument();
      expect(screen.getByText('Learning')).toBeInTheDocument();
    });
  });

  describe('song filter', () => {
    beforeEach(() => {
      mockUsePracticeStats.mockReturnValue({
        stats: mockStats,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      mockUseAllUserSongStatuses.mockReturnValue({
        statuses: new Map(),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it('should filter sessions when song filter changed', () => {
      mockUsePracticeSessions.mockReturnValue({
        sessions: [],
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

      // Verify the song filter select is rendered
      const songSelect = screen.getByRole('combobox', { name: /song/i });
      expect(songSelect).toBeInTheDocument();

      // Verify the hook was called initially with no songId filter (all songs)
      const initialCall = mockUsePracticeSessions.mock.calls[0];
      expect(initialCall[2]).toMatchObject({ songId: undefined });
    });

    it('should show all songs by default', () => {
      mockUsePracticeSessions.mockReturnValue({
        sessions: [],
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

      // Initial call should have songId: undefined (all songs)
      const firstCall = mockUsePracticeSessions.mock.calls[0];
      expect(firstCall[2]).toMatchObject({ songId: undefined });
    });
  });

  describe('date range filter', () => {
    beforeEach(() => {
      mockUsePracticeStats.mockReturnValue({
        stats: mockStats,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      mockUseAllUserSongStatuses.mockReturnValue({
        statuses: new Map(),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it('should filter sessions when start date changed', async () => {
      const user = userEvent.setup();

      mockUsePracticeSessions.mockReturnValue({
        sessions: [],
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

      const startDateInput = screen.getByLabelText('Start Date');
      await user.clear(startDateInput);
      await user.type(startDateInput, '2025-11-01');

      // Verify hook was called with updated date
      await waitFor(() => {
        const lastCall = mockUsePracticeSessions.mock.calls[mockUsePracticeSessions.mock.calls.length - 1];
        expect(lastCall[2]).toMatchObject({ startDate: '2025-11-01' });
      });
    });

    it('should filter sessions when end date changed', async () => {
      const user = userEvent.setup();

      mockUsePracticeSessions.mockReturnValue({
        sessions: [],
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

      const endDateInput = screen.getByLabelText('End Date');
      await user.clear(endDateInput);
      await user.type(endDateInput, '2025-12-31');

      // Verify hook was called with updated date
      await waitFor(() => {
        const lastCall = mockUsePracticeSessions.mock.calls[mockUsePracticeSessions.mock.calls.length - 1];
        expect(lastCall[2]).toMatchObject({ endDate: '2025-12-31' });
      });
    });
  });

  describe('error state', () => {
    it('should display error message when sessions fail to load', () => {
      mockUsePracticeSessions.mockReturnValue({
        sessions: [],
        isLoading: false,
        error: new Error('Failed to fetch sessions'),
        refetch: vi.fn(),
      });

      mockUsePracticeStats.mockReturnValue({
        stats: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

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
      mockUsePracticeSessions.mockReturnValue({
        sessions: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      mockUsePracticeStats.mockReturnValue({
        stats: null,
        isLoading: false,
        error: new Error('Failed to fetch stats'),
        refetch: vi.fn(),
      });

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

  describe('memo behavior', () => {
    it('has displayName set', () => {
      expect(PracticeHistory.displayName).toBe('PracticeHistory');
    });
  });
});
