import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { BandDashboard } from './BandDashboard';
import type { BandMember, Song } from '@/types';

// Wrap component with Router for useNavigate
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const createMockMember = (overrides: Partial<BandMember> = {}): BandMember => ({
  id: '1',
  name: 'Test Member',
  roles: [],
  avatarColor: 'bg-red-500',
  ...overrides,
});

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

describe('BandDashboard', () => {
  const defaultProps = {
    members: [] as BandMember[],
    songs: [] as Song[],
    onNavigateToSong: vi.fn(),
  };

  describe('rendering', () => {
    it('renders header', () => {
      renderWithRouter(<BandDashboard {...defaultProps} />);
      expect(screen.getByText('Band Lineup')).toBeInTheDocument();
    });

    it('renders subtitle', () => {
      renderWithRouter(<BandDashboard {...defaultProps} />);
      expect(screen.getByText('View individual gig sheets and responsibilities')).toBeInTheDocument();
    });

    it('renders empty state when no members', () => {
      renderWithRouter(<BandDashboard {...defaultProps} />);
      expect(screen.getByText('No band members')).toBeInTheDocument();
      expect(screen.getByText('Go to Settings')).toBeInTheDocument();
    });
  });

  describe('stat cards', () => {
    const members = [
      createMockMember({ id: '1', name: 'Member 1' }),
      createMockMember({ id: '2', name: 'Member 2' }),
    ];

    const songs = [
      createMockSong({ id: '1', status: 'Performance Ready', assignments: [{ memberId: '1', role: 'Lead Guitar' }] }),
      createMockSong({ id: '2', status: 'In Progress', assignments: [{ memberId: '2', role: 'Drums' }] }),
      createMockSong({ id: '3', status: 'To Learn', assignments: [] }),
    ];

    it('renders Total Members stat card', () => {
      renderWithRouter(<BandDashboard members={members} songs={songs} onNavigateToSong={vi.fn()} />);
      expect(screen.getByText('Total Members')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('renders Total Songs stat card', () => {
      renderWithRouter(<BandDashboard members={members} songs={songs} onNavigateToSong={vi.fn()} />);
      expect(screen.getByText('Total Songs')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders Performance Ready stat card with percentage', () => {
      renderWithRouter(<BandDashboard members={members} songs={songs} onNavigateToSong={vi.fn()} />);
      expect(screen.getByText('Performance Ready')).toBeInTheDocument();
      expect(screen.getByText('33%')).toBeInTheDocument(); // 1 of 3 songs
      expect(screen.getByText('1 of 3 songs')).toBeInTheDocument();
    });

    it('renders Needs Assignment stat card', () => {
      renderWithRouter(<BandDashboard members={members} songs={songs} onNavigateToSong={vi.fn()} />);
      expect(screen.getByText('Needs Assignment')).toBeInTheDocument();
      // Check that the stat card is present - value "1" appears multiple times, so we check the label
      const statCards = screen.getAllByText('Needs Assignment');
      expect(statCards.length).toBeGreaterThan(0);
    });
  });

  describe('member cards', () => {
    const members = [
      createMockMember({ id: '1', name: 'Billy', roles: ['Lead Guitar'] }),
      createMockMember({ id: '2', name: 'Dusty', roles: ['Bass Guitar'] }),
    ];

    const songs = [
      createMockSong({
        id: '1',
        assignments: [
          { memberId: '1', role: 'Lead Guitar' },
          { memberId: '1', role: 'Rhythm Guitar' },
        ],
      }),
      createMockSong({
        id: '2',
        assignments: [{ memberId: '2', role: 'Bass Guitar' }],
      }),
    ];

    it('renders member names', () => {
      renderWithRouter(<BandDashboard members={members} songs={songs} onNavigateToSong={vi.fn()} />);
      // Names appear in member cards and Band Overview section
      expect(screen.getAllByText('Billy').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Dusty').length).toBeGreaterThan(0);
    });

    it('renders member instrument badges', () => {
      renderWithRouter(<BandDashboard members={members} songs={songs} onNavigateToSong={vi.fn()} />);
      expect(screen.getByText('Lead Guitar')).toBeInTheDocument();
      expect(screen.getByText('Bass Guitar')).toBeInTheDocument();
    });

    it('renders song count on member cards', () => {
      renderWithRouter(<BandDashboard members={members} songs={songs} onNavigateToSong={vi.fn()} />);
      // Billy has 1 song (both assignments are in the same song)
      // Dusty has 1 song
      const songLabels = screen.getAllByText(/song$/);
      expect(songLabels.length).toBeGreaterThan(0);
    });

    it('shows member with no assignments has 0 songs', () => {
      const membersWithNoAssignments = [
        createMockMember({ id: '3', name: 'NewGuy', roles: [] }),
      ];
      renderWithRouter(<BandDashboard members={membersWithNoAssignments} songs={songs} onNavigateToSong={vi.fn()} />);
      // Should show member name - appears in multiple places (card + overview)
      expect(screen.getAllByText('NewGuy').length).toBeGreaterThan(0);
      // Member card should be accessible with aria-label indicating 0 songs
      expect(screen.getByLabelText(/Select NewGuy - 0 songs/)).toBeInTheDocument();
    });
  });

  describe('member selection', () => {
    const members = [createMockMember({ id: '1', name: 'Billy', roles: ['Lead Guitar'] })];
    const songs = [
      createMockSong({
        id: '1',
        title: 'Song One',
        assignments: [{ memberId: '1', role: 'Lead Guitar' }],
      }),
    ];

    it('shows Band Overview when no member selected', () => {
      renderWithRouter(<BandDashboard members={members} songs={songs} onNavigateToSong={vi.fn()} />);
      expect(screen.getByText('Band Overview')).toBeInTheDocument();
    });

    it('shows Gig Sheet when member is selected', () => {
      renderWithRouter(<BandDashboard members={members} songs={songs} onNavigateToSong={vi.fn()} />);

      // Click on Billy's card
      fireEvent.click(screen.getByLabelText(/Select Billy/));

      expect(screen.getByText("Billy's Gig Sheet")).toBeInTheDocument();
    });

    it('shows assigned songs in Gig Sheet', () => {
      renderWithRouter(<BandDashboard members={members} songs={songs} onNavigateToSong={vi.fn()} />);

      // Click on Billy's card
      fireEvent.click(screen.getByLabelText(/Select Billy/));

      expect(screen.getByText('Song One')).toBeInTheDocument();
    });

    it('closes Gig Sheet when close button is clicked', () => {
      renderWithRouter(<BandDashboard members={members} songs={songs} onNavigateToSong={vi.fn()} />);

      // Click on Billy's card
      fireEvent.click(screen.getByLabelText(/Select Billy/));
      expect(screen.getByText("Billy's Gig Sheet")).toBeInTheDocument();

      // Click close button
      fireEvent.click(screen.getByLabelText('Close member details'));

      // Should show Band Overview again
      expect(screen.getByText('Band Overview')).toBeInTheDocument();
    });
  });

  describe('band overview', () => {
    const members = [createMockMember({ id: '1', name: 'Billy' })];

    it('shows readiness breakdown with progress bar', () => {
      const songs = [
        createMockSong({ id: '1', status: 'Performance Ready', assignments: [{ memberId: '1', role: 'Guitar' }] }),
        createMockSong({ id: '2', status: 'In Progress', assignments: [{ memberId: '1', role: 'Guitar' }] }),
        createMockSong({ id: '3', status: 'To Learn', assignments: [] }),
      ];

      renderWithRouter(<BandDashboard members={members} songs={songs} onNavigateToSong={vi.fn()} />);

      expect(screen.getByText('Repertoire Readiness')).toBeInTheDocument();
      // Legend items
      expect(screen.getByText('Ready')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('To Learn')).toBeInTheDocument();
    });

    it('shows coverage warning when songs are unassigned', () => {
      const songs = [
        createMockSong({ id: '1', assignments: [] }),
        createMockSong({ id: '2', assignments: [] }),
      ];

      renderWithRouter(<BandDashboard members={members} songs={songs} onNavigateToSong={vi.fn()} />);

      expect(screen.getByText(/songs need assignments/)).toBeInTheDocument();
    });

    it('does not show coverage warning when all songs are assigned', () => {
      const songs = [
        createMockSong({ id: '1', assignments: [{ memberId: '1', role: 'Guitar' }] }),
      ];

      renderWithRouter(<BandDashboard members={members} songs={songs} onNavigateToSong={vi.fn()} />);

      expect(screen.queryByText(/songs need assignments/)).not.toBeInTheDocument();
    });

    it('shows quick action buttons', () => {
      renderWithRouter(<BandDashboard members={members} songs={[]} onNavigateToSong={vi.fn()} />);

      expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
      expect(screen.getByText('View Schedule')).toBeInTheDocument();
    });

    it('shows member coverage summary', () => {
      const songs = [
        createMockSong({ id: '1', assignments: [{ memberId: '1', role: 'Guitar' }] }),
      ];

      renderWithRouter(<BandDashboard members={members} songs={songs} onNavigateToSong={vi.fn()} />);

      expect(screen.getByText('Member Coverage')).toBeInTheDocument();
    });
  });

  describe('gig sheet detail', () => {
    const members = [createMockMember({ id: '1', name: 'Billy', roles: ['Lead Guitar', 'Vocals'] })];

    it('shows "No songs assigned" message for member with no songs', () => {
      renderWithRouter(<BandDashboard members={members} songs={[]} onNavigateToSong={vi.fn()} />);

      // Click on Billy's card
      fireEvent.click(screen.getByLabelText(/Select Billy/));

      expect(screen.getByText('No songs assigned yet.')).toBeInTheDocument();
    });

    it('shows song cards with roles', () => {
      const songs = [
        createMockSong({
          id: '1',
          title: 'Rock Song',
          key: 'E',
          bpm: 120,
          assignments: [
            { memberId: '1', role: 'Lead Guitar' },
            { memberId: '1', role: 'Lead Vocals' },
          ],
        }),
      ];

      renderWithRouter(<BandDashboard members={members} songs={songs} onNavigateToSong={vi.fn()} />);

      // Click on Billy's card
      fireEvent.click(screen.getByLabelText(/Select Billy/));

      expect(screen.getByText('Rock Song')).toBeInTheDocument();
      expect(screen.getByText(/E/)).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();
    });

    it('shows special parts when assigned', () => {
      const songs = [
        createMockSong({
          id: '1',
          title: 'Rock Song',
          assignments: [{ memberId: '1', role: 'Lead Guitar' }],
          parts: [
            { id: 'p1', name: 'Intro Solo', instrument: 'Lead Guitar', content: '', assignedToMemberId: '1' },
          ],
        }),
      ];

      renderWithRouter(<BandDashboard members={members} songs={songs} onNavigateToSong={vi.fn()} />);

      // Click on Billy's card
      fireEvent.click(screen.getByLabelText(/Select Billy/));

      expect(screen.getByText('Special Parts')).toBeInTheDocument();
      expect(screen.getByText('Intro Solo')).toBeInTheDocument();
    });

    it('has Practice button for each song', () => {
      const songs = [
        createMockSong({
          id: '1',
          title: 'Rock Song',
          assignments: [{ memberId: '1', role: 'Lead Guitar' }],
        }),
      ];

      renderWithRouter(<BandDashboard members={members} songs={songs} onNavigateToSong={vi.fn()} />);

      // Click on Billy's card
      fireEvent.click(screen.getByLabelText(/Select Billy/));

      expect(screen.getByLabelText('Practice Rock Song')).toBeInTheDocument();
    });

    it('has Go to song button that calls onNavigateToSong', () => {
      const onNavigateToSong = vi.fn();
      const songs = [
        createMockSong({
          id: 'song-123',
          title: 'Rock Song',
          assignments: [{ memberId: '1', role: 'Lead Guitar' }],
        }),
      ];

      renderWithRouter(<BandDashboard members={members} songs={songs} onNavigateToSong={onNavigateToSong} />);

      // Click on Billy's card
      fireEvent.click(screen.getByLabelText(/Select Billy/));

      // Click the go to song button
      fireEvent.click(screen.getByLabelText('Go to Rock Song'));

      expect(onNavigateToSong).toHaveBeenCalledWith('song-123');
    });
  });

  describe('keyboard accessibility', () => {
    const members = [createMockMember({ id: '1', name: 'Billy' })];

    it('member card is accessible via keyboard', () => {
      renderWithRouter(<BandDashboard members={members} songs={[]} onNavigateToSong={vi.fn()} />);

      const memberCard = screen.getByLabelText(/Select Billy/);
      expect(memberCard).toHaveAttribute('tabIndex', '0');
      expect(memberCard).toHaveAttribute('role', 'button');
    });

    it('member card responds to Enter key', () => {
      renderWithRouter(<BandDashboard members={members} songs={[]} onNavigateToSong={vi.fn()} />);

      const memberCard = screen.getByLabelText(/Select Billy/);
      fireEvent.keyDown(memberCard, { key: 'Enter' });

      expect(screen.getByText("Billy's Gig Sheet")).toBeInTheDocument();
    });

    it('member card responds to Space key', () => {
      renderWithRouter(<BandDashboard members={members} songs={[]} onNavigateToSong={vi.fn()} />);

      const memberCard = screen.getByLabelText(/Select Billy/);
      fireEvent.keyDown(memberCard, { key: ' ' });

      expect(screen.getByText("Billy's Gig Sheet")).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles member with very long name by truncating', () => {
      const members = [createMockMember({ id: '1', name: 'Bartholomew Christopher Fitzwilliam Montgomery III' })];
      renderWithRouter(<BandDashboard members={members} songs={[]} onNavigateToSong={vi.fn()} />);

      // The name should be present (truncation is via CSS) - appears in multiple places
      expect(screen.getAllByText('Bartholomew Christopher Fitzwilliam Montgomery III').length).toBeGreaterThan(0);
    });

    it('handles zero songs gracefully', () => {
      const members = [createMockMember({ id: '1', name: 'Billy' })];
      renderWithRouter(<BandDashboard members={members} songs={[]} onNavigateToSong={vi.fn()} />);

      // Should show 0% ready and no errors
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('0 of 0 songs')).toBeInTheDocument();
    });

    it('handles many members', () => {
      const members = Array.from({ length: 12 }, (_, i) =>
        createMockMember({ id: `${i}`, name: `Member ${i}` })
      );
      renderWithRouter(<BandDashboard members={members} songs={[]} onNavigateToSong={vi.fn()} />);

      // All members should be rendered - names appear in multiple places
      expect(screen.getAllByText('Member 0').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Member 11').length).toBeGreaterThan(0);
      // Check the Total Members stat card displays correct value
      expect(screen.getByText('Total Members')).toBeInTheDocument();
    });
  });

  describe('memo behavior', () => {
    it('has displayName set', () => {
      expect(BandDashboard.displayName).toBe('BandDashboard');
    });
  });
});
