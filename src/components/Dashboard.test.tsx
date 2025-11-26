import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Dashboard } from './Dashboard';
import type { Song, BandEvent, BandMember } from '@/types';

// Wrap component with Router for useNavigate
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const createMockSong = (overrides: Partial<Song> = {}): Song => ({
  id: '1',
  title: 'Test Song',
  artist: 'Test Artist',
  duration: '3:30',
  bpm: 120,
  key: 'C',
  isOriginal: false,
  status: 'In Progress',
  assignments: [],
  parts: [],
  charts: [],
  ...overrides,
});

const createMockGig = (overrides: Partial<BandEvent> = {}): BandEvent => ({
  id: '1',
  title: 'Test Gig',
  date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
  type: 'GIG',
  ...overrides,
});

const mockMembers: BandMember[] = [
  { id: '1', name: 'Billy', roles: ['Lead Guitar'] },
  { id: '2', name: 'Dusty', roles: ['Bass Guitar'] },
];

describe('Dashboard', () => {
  const defaultProps = {
    songs: [] as Song[],
    members: mockMembers,
    onNavigateToSong: vi.fn(),
    events: [] as BandEvent[],
  };

  describe('rendering', () => {
    it('renders header', () => {
      renderWithRouter(<Dashboard {...defaultProps} />);
      expect(screen.getByText('Band Overview')).toBeInTheDocument();
    });

    it('renders fallback subtitle when no gig scheduled', () => {
      renderWithRouter(<Dashboard {...defaultProps} />);
      expect(screen.getByText('Road to the next gig')).toBeInTheDocument();
    });

    it('renders stat cards', () => {
      renderWithRouter(<Dashboard {...defaultProps} />);
      expect(screen.getByText('Band Readiness')).toBeInTheDocument();
      expect(screen.getByText('Coming Up')).toBeInTheDocument();
    });

    it('renders Practice Queue section', () => {
      renderWithRouter(<Dashboard {...defaultProps} />);
      expect(screen.getByText('Practice Queue')).toBeInTheDocument();
    });

    it('renders Coming Up section', () => {
      renderWithRouter(<Dashboard {...defaultProps} />);
      expect(screen.getByText('Coming Up')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      renderWithRouter(<Dashboard {...defaultProps} />);
      expect(screen.getByRole('button', { name: /Start Practice/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Gig Mode/ })).toBeInTheDocument();
    });
  });

  describe('stat calculations', () => {
    it('shows correct total count', () => {
      const songs = [
        createMockSong({ id: '1', status: 'Performance Ready', assignments: [{ memberId: '1', role: 'Guitar' }] }),
        createMockSong({ id: '2', status: 'Performance Ready', assignments: [{ memberId: '1', role: 'Guitar' }] }),
        createMockSong({ id: '3', status: 'Performance Ready', assignments: [{ memberId: '1', role: 'Guitar' }] }),
      ];
      renderWithRouter(<Dashboard {...defaultProps} songs={songs} />);
      // Band Readiness card shows "3 songs in setlist"
      expect(screen.getByText('3 songs in setlist')).toBeInTheDocument();
    });

    it('shows correct readiness percentage', () => {
      const songs = [
        createMockSong({ id: '1', status: 'Performance Ready' }),
        createMockSong({ id: '2', status: 'Performance Ready' }),
        createMockSong({ id: '3', status: 'In Progress' }),
        createMockSong({ id: '4', status: 'To Learn' }),
      ];
      renderWithRouter(<Dashboard {...defaultProps} songs={songs} />);
      // 2 out of 4 = 50%
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('shows readiness legend counts', () => {
      const songs = [
        createMockSong({ id: '1', status: 'Performance Ready', assignments: [{ memberId: '1', role: 'Guitar' }] }),
        createMockSong({ id: '2', status: 'In Progress', assignments: [{ memberId: '1', role: 'Guitar' }] }),
        createMockSong({ id: '3', status: 'To Learn', assignments: [{ memberId: '1', role: 'Guitar' }] }),
      ];
      renderWithRouter(<Dashboard {...defaultProps} songs={songs} />);
      // The Band Readiness card shows percentage and "gig ready" text
      expect(screen.getByText('Band Readiness')).toBeInTheDocument();
      expect(screen.getByText('gig ready')).toBeInTheDocument();
      expect(screen.getByText('33')).toBeInTheDocument(); // 33% ready
    });
  });

  describe('next gig display', () => {
    it('shows fallback text when no future gigs', () => {
      renderWithRouter(<Dashboard {...defaultProps} events={[]} />);
      // No gig = shows fallback subtitle
      expect(screen.getByText('Road to the next gig')).toBeInTheDocument();
    });

    it('shows countdown badge when future gig exists', () => {
      const futureGig = createMockGig({ title: 'Summer Festival' });
      renderWithRouter(<Dashboard {...defaultProps} events={[futureGig]} />);
      // Should show gig title somewhere on the page (may appear multiple times)
      const titles = screen.getAllByText('Summer Festival');
      expect(titles.length).toBeGreaterThanOrEqual(1);
      // Should show "days" text in countdown badge
      expect(screen.getByText(/days?/)).toBeInTheDocument();
    });

    it('ignores past gigs', () => {
      const pastGig = createMockGig({
        title: 'Past Event',
        date: '2020-01-01',
      });
      renderWithRouter(<Dashboard {...defaultProps} events={[pastGig]} />);
      // Past gig = shows fallback subtitle
      expect(screen.getByText('Road to the next gig')).toBeInTheDocument();
    });

    it('shows nearest future gig when multiple exist', () => {
      const nearGig = createMockGig({
        id: '1',
        title: 'Near Gig',
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      const farGig = createMockGig({
        id: '2',
        title: 'Far Gig',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      renderWithRouter(<Dashboard {...defaultProps} events={[farGig, nearGig]} />);
      // Near Gig should appear (may appear multiple times in countdown + timeline)
      const nearGigElements = screen.getAllByText('Near Gig');
      expect(nearGigElements.length).toBeGreaterThanOrEqual(1);
    });

    it('ignores non-GIG events for countdown', () => {
      const practice = createMockGig({
        title: 'Practice Session',
        type: 'PRACTICE',
      });
      renderWithRouter(<Dashboard {...defaultProps} events={[practice]} />);
      // Non-GIG event = shows fallback subtitle
      expect(screen.getByText('Road to the next gig')).toBeInTheDocument();
    });
  });

  describe('upcoming timeline', () => {
    it('shows events in timeline', () => {
      const futureGig = createMockGig({
        title: 'Venue Gig',
        location: 'The Blue Note',
      });
      renderWithRouter(<Dashboard {...defaultProps} events={[futureGig]} />);
      // Event title appears multiple times (countdown, stat card, timeline)
      const venueGigElements = screen.getAllByText('Venue Gig');
      expect(venueGigElements.length).toBeGreaterThanOrEqual(1);
      // Location appears in timeline
      expect(screen.getByText(/The Blue Note/)).toBeInTheDocument();
    });

    it('shows song deadlines in timeline', () => {
      const songWithDeadline = createMockSong({
        id: '1',
        title: 'Deadline Song',
        status: 'In Progress',
        targetDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      renderWithRouter(<Dashboard {...defaultProps} songs={[songWithDeadline]} />);
      expect(screen.getByText(/Deadline Song due/)).toBeInTheDocument();
    });

    it('shows empty state when no upcoming events', () => {
      renderWithRouter(<Dashboard {...defaultProps} />);
      expect(screen.getByText('No upcoming events')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no songs', () => {
      renderWithRouter(<Dashboard {...defaultProps} songs={[]} />);
      expect(screen.getByText('No songs yet')).toBeInTheDocument();
      expect(
        screen.getByText(/Add your first song to start tracking your setlist/)
      ).toBeInTheDocument();
    });

    it('renders add song button in empty state', () => {
      renderWithRouter(<Dashboard {...defaultProps} songs={[]} />);
      // Multiple "Add Song" buttons exist - one in header, one in empty state
      const addButtons = screen.getAllByRole('button', { name: /Add Song/ });
      expect(addButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('needs attention section', () => {
    it('shows songs that need attention', () => {
      const songs = [
        createMockSong({
          id: '1',
          title: 'Song One',
          status: 'In Progress',
          charts: [], // No charts = needs attention
        }),
      ];
      renderWithRouter(<Dashboard {...defaultProps} songs={songs} />);
      expect(screen.getByText('Song One')).toBeInTheDocument();
    });

    it('shows "All caught up" when all songs are ready', () => {
      const songs = [
        createMockSong({ id: '1', status: 'Performance Ready' }),
        createMockSong({ id: '2', status: 'Performance Ready' }),
      ];
      renderWithRouter(<Dashboard {...defaultProps} songs={songs} />);
      expect(screen.getByText('All caught up!')).toBeInTheDocument();
    });

    it('shows issue indicators for songs', () => {
      const songs = [
        createMockSong({
          id: '1',
          title: 'Problem Song',
          status: 'In Progress',
          charts: [], // No charts issue
          assignments: [], // Unassigned issue
        }),
      ];
      renderWithRouter(<Dashboard {...defaultProps} songs={songs} />);
      // Issues are shown as subtle inline text with "·" separator
      // Check song appears and has an Edit link
      expect(screen.getByText('Problem Song')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Edit/ })).toBeInTheDocument();
    });

    it('shows maximum 5 songs needing attention', () => {
      const songs = Array.from({ length: 10 }, (_, i) =>
        createMockSong({
          id: `${i}`,
          title: `Song ${i + 1}`,
          status: 'In Progress',
          charts: [], // Makes them need attention
        })
      );
      renderWithRouter(<Dashboard {...defaultProps} songs={songs} />);
      expect(screen.getByText('Song 1')).toBeInTheDocument();
      // Song 6+ should not be visible (max 5)
      expect(screen.queryByText('Song 6')).not.toBeInTheDocument();
    });

    it('shows status badge for each song', () => {
      const songs = [
        createMockSong({ id: '1', status: 'In Progress', charts: [] }),
        createMockSong({ id: '2', status: 'To Learn', charts: [] }),
      ];
      renderWithRouter(<Dashboard {...defaultProps} songs={songs} />);
      // Status text appears in both song badges and the Band Readiness legend
      const inProgressElements = screen.getAllByText('In Progress');
      const toLearnElements = screen.getAllByText('To Learn');
      expect(inProgressElements.length).toBeGreaterThanOrEqual(1);
      expect(toLearnElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('assignment warnings', () => {
    it('shows unassigned count when songs have no assignments', () => {
      const songs = [
        createMockSong({ id: '1', assignments: [] }),
        createMockSong({ id: '2', assignments: [] }),
      ];
      renderWithRouter(<Dashboard {...defaultProps} songs={songs} />);
      // The Band Readiness card shows "X songs need role assignments"
      expect(screen.getByText(/songs need role assignments/)).toBeInTheDocument();
    });

    it('shows "All Assigned" when all songs have assignments', () => {
      const songs = [
        createMockSong({
          id: '1',
          status: 'Performance Ready',
          assignments: [{ memberId: '1', role: 'Lead Guitar' }],
        }),
      ];
      renderWithRouter(<Dashboard {...defaultProps} songs={songs} />);
      expect(screen.getByText('All songs have role assignments')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onNavigateToSong when edit link clicked', () => {
      const onNavigateToSong = vi.fn();
      const songs = [
        createMockSong({
          id: 'song-123',
          title: 'Clickable Song',
          charts: [], // Makes it appear in needs attention
        }),
      ];
      renderWithRouter(
        <Dashboard {...defaultProps} songs={songs} onNavigateToSong={onNavigateToSong} />
      );

      const editLink = screen.getByRole('button', { name: /Edit/ });
      fireEvent.click(editLink);
      expect(onNavigateToSong).toHaveBeenCalledWith('song-123');
    });

    it('has practice button for songs needing attention', () => {
      const songs = [
        createMockSong({
          id: '1',
          title: 'Test Song',
          charts: [], // Makes it appear in needs attention
        }),
      ];
      renderWithRouter(<Dashboard {...defaultProps} songs={songs} />);

      const practiceButton = screen.getByRole('button', { name: /Practice Test Song/ });
      expect(practiceButton).toBeInTheDocument();
    });
  });

  describe('memo behavior', () => {
    it('has displayName set', () => {
      expect(Dashboard.displayName).toBe('Dashboard');
    });
  });
});
