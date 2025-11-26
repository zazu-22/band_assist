import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Dashboard } from './Dashboard';
import type { Song, BandEvent } from '@/types';

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

describe('Dashboard', () => {
  const defaultProps = {
    songs: [] as Song[],
    onNavigateToSong: vi.fn(),
    events: [] as BandEvent[],
  };

  describe('rendering', () => {
    it('renders header', () => {
      renderWithRouter(<Dashboard {...defaultProps} />);
      expect(screen.getByText('Band Overview')).toBeInTheDocument();
      expect(screen.getByText('Road to the next gig')).toBeInTheDocument();
    });

    it('renders stat cards', () => {
      renderWithRouter(<Dashboard {...defaultProps} />);
      expect(screen.getByText('Total Setlist')).toBeInTheDocument();
      expect(screen.getByText('Stage Ready')).toBeInTheDocument();
      expect(screen.getByText('To Learn')).toBeInTheDocument();
      expect(screen.getByText('Next Gig')).toBeInTheDocument();
    });

    it('renders Setlist Progress section', () => {
      renderWithRouter(<Dashboard {...defaultProps} />);
      expect(screen.getByText('Setlist Progress')).toBeInTheDocument();
    });

    it("renders Billy's Wisdom section", () => {
      renderWithRouter(<Dashboard {...defaultProps} />);
      expect(screen.getByText("Billy's Wisdom")).toBeInTheDocument();
    });
  });

  describe('stat calculations', () => {
    it('shows correct total count', () => {
      const songs = [
        createMockSong({ id: '1' }),
        createMockSong({ id: '2' }),
        createMockSong({ id: '3' }),
      ];
      renderWithRouter(<Dashboard {...defaultProps} songs={songs} />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('shows correct stage ready count', () => {
      const songs = [
        createMockSong({ id: '1', status: 'Performance Ready' }),
        createMockSong({ id: '2', status: 'Performance Ready' }),
        createMockSong({ id: '3', status: 'In Progress' }),
      ];
      renderWithRouter(<Dashboard {...defaultProps} songs={songs} />);
      expect(screen.getByText('2')).toBeInTheDocument(); // Stage Ready count
    });

    it('shows correct to learn count', () => {
      const songs = [
        createMockSong({ id: '1', status: 'To Learn' }),
        createMockSong({ id: '2', status: 'To Learn' }),
        createMockSong({ id: '3', status: 'In Progress' }),
        createMockSong({ id: '4', status: 'Performance Ready' }),
      ];
      renderWithRouter(<Dashboard {...defaultProps} songs={songs} />);
      // Look for the "To Learn" stat card value
      const statCards = screen.getAllByText('2');
      expect(statCards.length).toBeGreaterThan(0);
    });
  });

  describe('next gig display', () => {
    it('shows "No gigs set" when no future gigs', () => {
      renderWithRouter(<Dashboard {...defaultProps} events={[]} />);
      expect(screen.getByText('No gigs set')).toBeInTheDocument();
    });

    it('shows next gig title when future gig exists', () => {
      const futureGig = createMockGig({ title: 'Summer Festival' });
      renderWithRouter(<Dashboard {...defaultProps} events={[futureGig]} />);
      expect(screen.getByText('Summer Festival')).toBeInTheDocument();
    });

    it('ignores past gigs', () => {
      const pastGig = createMockGig({
        title: 'Past Event',
        date: '2020-01-01',
      });
      renderWithRouter(<Dashboard {...defaultProps} events={[pastGig]} />);
      expect(screen.getByText('No gigs set')).toBeInTheDocument();
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
      expect(screen.getByText('Near Gig')).toBeInTheDocument();
    });

    it('ignores non-GIG events', () => {
      const practice = createMockGig({
        title: 'Practice Session',
        type: 'PRACTICE',
      });
      renderWithRouter(<Dashboard {...defaultProps} events={[practice]} />);
      expect(screen.getByText('No gigs set')).toBeInTheDocument();
    });

    it('formats gig date correctly', () => {
      // Use a fixed future date string
      const futureDateStr = '2025-12-15';
      // Parse the same way Dashboard does: new Date(dateString) then toLocaleDateString
      // This ensures we're testing with the same timezone behavior
      const parsedDate = new Date(futureDateStr);
      const expectedMonth = parsedDate.toLocaleDateString(undefined, { month: 'short' });
      const expectedDay = parsedDate.getDate().toString();

      const futureGig = createMockGig({
        title: 'Test Gig',
        date: futureDateStr,
      });
      renderWithRouter(<Dashboard {...defaultProps} events={[futureGig]} />);

      // The date should be formatted matching the same parsing behavior as Dashboard
      expect(screen.getByText(new RegExp(`${expectedMonth}.*${expectedDay}`))).toBeInTheDocument();
    });

    it('includes location in gig subtitle when provided', () => {
      const futureGig = createMockGig({
        title: 'Venue Gig',
        location: 'The Blue Note',
      });
      renderWithRouter(<Dashboard {...defaultProps} events={[futureGig]} />);
      expect(screen.getByText(/The Blue Note/)).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no songs', () => {
      renderWithRouter(<Dashboard {...defaultProps} songs={[]} />);
      expect(screen.getByText('No songs yet')).toBeInTheDocument();
      expect(
        screen.getByText(/Add your first song to start building your setlist/)
      ).toBeInTheDocument();
    });

    it('renders add song button in empty state', () => {
      renderWithRouter(<Dashboard {...defaultProps} songs={[]} />);
      expect(screen.getByRole('button', { name: 'Add Song' })).toBeInTheDocument();
    });
  });

  describe('song list', () => {
    it('renders song items', () => {
      const songs = [
        createMockSong({ id: '1', title: 'Song One', artist: 'Artist One' }),
        createMockSong({ id: '2', title: 'Song Two', artist: 'Artist Two' }),
      ];
      renderWithRouter(<Dashboard {...defaultProps} songs={songs} />);
      expect(screen.getByText('Song One')).toBeInTheDocument();
      expect(screen.getByText('Song Two')).toBeInTheDocument();
      expect(screen.getByText('Artist One')).toBeInTheDocument();
    });

    it('shows maximum 5 songs', () => {
      const songs = Array.from({ length: 10 }, (_, i) =>
        createMockSong({ id: `${i}`, title: `Song ${i + 1}` })
      );
      renderWithRouter(<Dashboard {...defaultProps} songs={songs} />);
      expect(screen.getByText('Song 1')).toBeInTheDocument();
      expect(screen.getByText('Song 5')).toBeInTheDocument();
      expect(screen.queryByText('Song 6')).not.toBeInTheDocument();
    });

    it('shows BPM in song item', () => {
      const songs = [createMockSong({ bpm: 140 })];
      renderWithRouter(<Dashboard {...defaultProps} songs={songs} />);
      expect(screen.getByText('140')).toBeInTheDocument();
    });

    it('shows dash when BPM is not set', () => {
      const songs = [createMockSong({ bpm: 0 })];
      renderWithRouter(<Dashboard {...defaultProps} songs={songs} />);
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('shows status badge for each song', () => {
      const songs = [
        createMockSong({ id: '1', status: 'Performance Ready' }),
        createMockSong({ id: '2', status: 'In Progress' }),
      ];
      renderWithRouter(<Dashboard {...defaultProps} songs={songs} />);
      expect(screen.getByText('Performance Ready')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onNavigateToSong when song clicked', () => {
      const onNavigateToSong = vi.fn();
      const songs = [createMockSong({ id: 'song-123', title: 'Clickable Song' })];
      renderWithRouter(
        <Dashboard {...defaultProps} songs={songs} onNavigateToSong={onNavigateToSong} />
      );

      fireEvent.click(screen.getByText('Clickable Song'));
      expect(onNavigateToSong).toHaveBeenCalledWith('song-123');
    });

    it('song items are keyboard accessible', () => {
      const songs = [createMockSong({ id: '1', title: 'Test Song' })];
      renderWithRouter(<Dashboard {...defaultProps} songs={songs} />);

      const songButton = screen.getByRole('button', { name: /Test Song/ });
      expect(songButton).toBeInTheDocument();
    });
  });

  describe('memo behavior', () => {
    it('has displayName set', () => {
      expect(Dashboard.displayName).toBe('Dashboard');
    });
  });
});
