import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LogPracticeModal } from '../LogPracticeModal';
import type { Song, PracticeSession, UserSongProgress } from '@/types';

// Mock getTodayDateString to return a consistent date for testing
vi.mock('@/lib/dateUtils', () => ({
  getTodayDateString: () => '2025-12-08',
}));

// Mock useSongSections hook for SectionPicker
vi.mock('@/hooks/useSongSections', () => ({
  useSongSections: vi.fn(),
}));

import { useSongSections } from '@/hooks/useSongSections';
const mockUseSongSections = vi.mocked(useSongSections);

// Default mock return value (empty sections)
const defaultSectionsMock = {
  sections: [],
  isLoading: false,
  error: null,
  refetch: vi.fn(),
  createSection: vi.fn(),
  updateSection: vi.fn(),
  deleteSection: vi.fn(),
  upsertSections: vi.fn(),
  deleteAllSections: vi.fn(),
};

// Mock sections for integration tests
const mockSectionsData = [
  {
    id: 'section-1',
    name: 'Intro',
    songId: 'song-1',
    bandId: 'band-1',
    displayOrder: 0,
    startBar: 1,
    endBar: 8,
    barCount: 8,
    source: 'manual' as const,
    createdAt: '2025-12-01T00:00:00Z',
    updatedAt: '2025-12-01T00:00:00Z',
  },
  {
    id: 'section-2',
    name: 'Verse 1',
    songId: 'song-1',
    bandId: 'band-1',
    displayOrder: 1,
    startBar: 9,
    endBar: 16,
    barCount: 8,
    source: 'manual' as const,
    createdAt: '2025-12-01T00:00:00Z',
    updatedAt: '2025-12-01T00:00:00Z',
  },
];

const mockSongs: Song[] = [
  {
    id: 'song-1',
    title: 'Test Song 1',
    artist: 'Test Artist 1',
    isOriginal: false,
    status: 'In Progress',
    duration: '3:30',
    bpm: 120,
    key: 'C Major',
    charts: [],
    assignments: [],
    parts: [],
  },
  {
    id: 'song-2',
    title: 'Test Song 2',
    artist: 'Test Artist 2',
    isOriginal: false,
    status: 'Performance Ready',
    duration: '4:00',
    bpm: 140,
    key: 'G Minor',
    charts: [],
    assignments: [],
    parts: [],
  },
];

// Single song for auto-selection tests
const singleSong: Song[] = [mockSongs[0]];

const mockEditSession: PracticeSession = {
  id: 'session-1',
  userId: 'user-1',
  bandId: 'band-1',
  songId: 'song-1',
  date: '2025-12-05',
  durationMinutes: 45,
  tempoBpm: 120,
  sectionsPracticed: ['Intro', 'Verse 1'],
  notes: 'Great progress today',
  createdAt: '2025-12-05T10:00:00Z',
  updatedAt: '2025-12-05T10:00:00Z',
};

describe('LogPracticeModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    songs: mockSongs,
    currentBandId: 'band-1',
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Set default mock for useSongSections (empty sections)
    mockUseSongSections.mockReturnValue(defaultSectionsMock);
  });

  describe('rendering', () => {
    it('should render the modal when open', () => {
      render(<LogPracticeModal {...defaultProps} />);

      expect(screen.getByText('Log Practice Session')).toBeInTheDocument();
      expect(screen.getByText('Record a practice session for tracking')).toBeInTheDocument();
    });

    it('should not render content when closed', () => {
      render(<LogPracticeModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Log Practice Session')).not.toBeInTheDocument();
    });

    it('should show edit mode title when editSession is provided', () => {
      render(<LogPracticeModal {...defaultProps} editSession={mockEditSession} />);

      expect(screen.getByText('Edit Practice Session')).toBeInTheDocument();
      expect(screen.getByText('Update the details of your practice session')).toBeInTheDocument();
    });

    it('should render all form fields', () => {
      render(<LogPracticeModal {...defaultProps} />);

      expect(screen.getByLabelText(/song/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/duration/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tempo/i)).toBeInTheDocument();
      // Note: Sections are now rendered via SectionPicker after song selection
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('should auto-select song when only one song is available', () => {
      render(<LogPracticeModal {...defaultProps} songs={singleSong} />);

      // The select trigger should show the song title when auto-selected
      expect(screen.getByRole('combobox', { name: /song/i })).toHaveTextContent('Test Song 1');
    });

    it('should render notes field as a textarea', () => {
      render(<LogPracticeModal {...defaultProps} />);

      const notesField = screen.getByLabelText(/notes/i);
      expect(notesField.tagName.toLowerCase()).toBe('textarea');
    });
  });

  describe('edit mode pre-population', () => {
    it('should pre-populate form fields with editSession data', () => {
      render(<LogPracticeModal {...defaultProps} editSession={mockEditSession} />);

      // Check song is selected
      expect(screen.getByRole('combobox', { name: /song/i })).toHaveTextContent('Test Song 1');

      // Check other fields
      expect(screen.getByLabelText(/date/i)).toHaveValue('2025-12-05');
      expect(screen.getByLabelText(/duration/i)).toHaveValue(45);
      expect(screen.getByLabelText(/tempo/i)).toHaveValue(120);
      // Note: Section pre-population is now via SectionPicker (not text input)
      // The legacy sectionsPracticed is not shown in the UI
      expect(screen.getByLabelText(/notes/i)).toHaveValue('Great progress today');
    });

    it('should show Save Changes button in edit mode', () => {
      render(<LogPracticeModal {...defaultProps} editSession={mockEditSession} />);

      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('should show Log Session button in create mode', () => {
      render(<LogPracticeModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /log session/i })).toBeInTheDocument();
    });
  });

  describe('validation errors', () => {
    it('should show error when song is not selected', async () => {
      const user = userEvent.setup();
      render(<LogPracticeModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /log session/i });
      await user.click(submitButton);

      expect(screen.getByText('Please select a song')).toBeInTheDocument();
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    // Use single song to auto-select and test other validations
    it('should show error when duration is empty', async () => {
      const user = userEvent.setup();
      render(<LogPracticeModal {...defaultProps} songs={singleSong} />);

      // Clear duration
      const durationInput = screen.getByLabelText(/duration/i);
      await user.clear(durationInput);

      const submitButton = screen.getByRole('button', { name: /log session/i });
      await user.click(submitButton);

      expect(screen.getByText('Duration must be greater than 0 minutes')).toBeInTheDocument();
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    it('should validate duration is required and positive', () => {
      render(<LogPracticeModal {...defaultProps} />);

      // Check duration input has proper attributes for HTML validation
      const durationInput = screen.getByLabelText(/duration/i);
      expect(durationInput).toHaveAttribute('type', 'number');
      expect(durationInput).toHaveAttribute('min', '1');
      // Default value should be 30
      expect(durationInput).toHaveValue(30);
    });

    it('should have min/max attributes on duration input', () => {
      render(<LogPracticeModal {...defaultProps} />);

      const durationInput = screen.getByLabelText(/duration/i);
      expect(durationInput).toHaveAttribute('min', '1');
      expect(durationInput).toHaveAttribute('max', '480');
    });

    it('should have min/max attributes on tempo input', () => {
      render(<LogPracticeModal {...defaultProps} />);

      const tempoInput = screen.getByLabelText(/tempo/i);
      expect(tempoInput).toHaveAttribute('min', '1');
      expect(tempoInput).toHaveAttribute('max', '300');
    });

    it('should have max attribute on date input', () => {
      render(<LogPracticeModal {...defaultProps} />);

      const dateInput = screen.getByLabelText(/date/i);
      expect(dateInput).toHaveAttribute('max', '2025-12-08'); // mocked today
    });
  });

  describe('successful submission', () => {
    it('should call onSubmit with correct data for new session', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<LogPracticeModal {...defaultProps} songs={singleSong} onSubmit={onSubmit} />);

      // Fill in optional fields
      const tempoInput = screen.getByLabelText(/tempo/i);
      await user.type(tempoInput, '120');

      // Note: Sections are now selected via SectionPicker component
      // When no sections exist (empty mock), the picker shows "No sections defined"
      // We skip testing section selection here - see integration tests for SectionPicker

      const notesInput = screen.getByLabelText(/notes/i);
      await user.type(notesInput, 'Good session');

      // Submit
      const submitButton = screen.getByRole('button', { name: /log session/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          songId: 'song-1',
          durationMinutes: 30, // default value
          tempoBpm: 120,
          sectionsPracticed: undefined, // No legacy sections entered
          sectionIds: undefined, // No sections selected via picker
          notes: 'Good session',
          date: '2025-12-08', // mocked today
        });
      });
    });

    it('should call onSubmit without optional fields when empty', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<LogPracticeModal {...defaultProps} songs={singleSong} onSubmit={onSubmit} />);

      // Submit without filling optional fields
      const submitButton = screen.getByRole('button', { name: /log session/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          songId: 'song-1',
          durationMinutes: 30,
          tempoBpm: undefined,
          sectionsPracticed: undefined,
          notes: undefined,
          date: '2025-12-08',
        });
      });
    });

    it('should call onClose after successful submission', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();
      render(<LogPracticeModal {...defaultProps} songs={singleSong} onSubmit={onSubmit} onClose={onClose} />);

      // Submit
      const submitButton = screen.getByRole('button', { name: /log session/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should show error message when submission fails', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'));
      render(<LogPracticeModal {...defaultProps} songs={singleSong} onSubmit={onSubmit} />);

      // Submit
      const submitButton = screen.getByRole('button', { name: /log session/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should show generic error message when submission fails without error message', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockRejectedValue('unknown error');
      render(<LogPracticeModal {...defaultProps} songs={singleSong} onSubmit={onSubmit} />);

      // Submit
      const submitButton = screen.getByRole('button', { name: /log session/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to save practice session')).toBeInTheDocument();
      });
    });
  });

  describe('cancel behavior', () => {
    it('should call onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<LogPracticeModal {...defaultProps} onClose={onClose} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('displayName', () => {
    it('should have displayName set', () => {
      expect(LogPracticeModal.displayName).toBe('LogPracticeModal');
    });
  });

  describe('status and confidence fields', () => {
    // Create mock song statuses for testing
    const mockSongStatuses = new Map<string, UserSongProgress>([
      [
        'song-1',
        {
          id: 'status-1',
          userId: 'user-1',
          songId: 'song-1',
          status: 'Learning',
          confidenceLevel: 3,
          createdAt: '2025-12-01T00:00:00Z',
          updatedAt: '2025-12-01T00:00:00Z',
        },
      ],
      [
        'song-2',
        {
          id: 'status-2',
          userId: 'user-1',
          songId: 'song-2',
          status: 'Mastered',
          confidenceLevel: 5,
          createdAt: '2025-12-01T00:00:00Z',
          updatedAt: '2025-12-01T00:00:00Z',
        },
      ],
    ]);

    it('should render Learning Status dropdown', () => {
      render(<LogPracticeModal {...defaultProps} />);

      expect(screen.getByLabelText(/learning status/i)).toBeInTheDocument();
    });

    it('should render Confidence Level selector with 5 buttons', () => {
      render(<LogPracticeModal {...defaultProps} />);

      expect(screen.getByText('Confidence Level')).toBeInTheDocument();
      // Check all 5 confidence buttons exist with accessible names
      expect(screen.getByRole('button', { name: /confidence level 1/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confidence level 2/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confidence level 3/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confidence level 4/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confidence level 5/i })).toBeInTheDocument();
    });

    it('should pre-populate status from songStatuses when song is auto-selected', () => {
      render(
        <LogPracticeModal
          {...defaultProps}
          songs={singleSong}
          songStatuses={mockSongStatuses}
        />
      );

      // The status dropdown should show "Learning" (the status for song-1)
      expect(screen.getByRole('combobox', { name: /learning status/i })).toHaveTextContent('Learning');
    });

    it('should default to Not Started when no status exists for song', () => {
      const emptySongStatuses = new Map<string, UserSongProgress>();
      render(
        <LogPracticeModal
          {...defaultProps}
          songs={singleSong}
          songStatuses={emptySongStatuses}
        />
      );

      expect(screen.getByRole('combobox', { name: /learning status/i })).toHaveTextContent('Not Started');
    });

    it('should allow selecting a confidence level', async () => {
      const user = userEvent.setup();
      render(<LogPracticeModal {...defaultProps} songs={singleSong} />);

      const confidenceButton3 = screen.getByRole('button', { name: /confidence level 3/i });
      await user.click(confidenceButton3);

      // Button 3 should have the selected styling (scale-105 class indicates selection)
      expect(confidenceButton3).toHaveClass('scale-105');
    });

    it('should call onStatusChange when confidence is changed on submit', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const onStatusChange = vi.fn().mockResolvedValue(undefined);

      render(
        <LogPracticeModal
          {...defaultProps}
          songs={singleSong}
          onSubmit={onSubmit}
          songStatuses={mockSongStatuses}
          onStatusChange={onStatusChange}
        />
      );

      // Change confidence from 3 to 4 (simpler than changing dropdown)
      const confidenceButton4 = screen.getByRole('button', { name: /confidence level 4/i });
      await user.click(confidenceButton4);

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /log session/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onStatusChange).toHaveBeenCalledWith('song-1', 'Learning', 4);
      });
    });

    it('should not call onStatusChange when status is unchanged', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const onStatusChange = vi.fn().mockResolvedValue(undefined);

      render(
        <LogPracticeModal
          {...defaultProps}
          songs={singleSong}
          onSubmit={onSubmit}
          songStatuses={mockSongStatuses}
          onStatusChange={onStatusChange}
        />
      );

      // Submit without changing status
      const submitButton = screen.getByRole('button', { name: /log session/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });

      // onStatusChange should NOT be called since status didn't change
      expect(onStatusChange).not.toHaveBeenCalled();
    });

    it('should call onStatusChange when only confidence is changed', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const onStatusChange = vi.fn().mockResolvedValue(undefined);

      render(
        <LogPracticeModal
          {...defaultProps}
          songs={singleSong}
          onSubmit={onSubmit}
          songStatuses={mockSongStatuses}
          onStatusChange={onStatusChange}
        />
      );

      // Change confidence from 3 to 5
      const confidenceButton5 = screen.getByRole('button', { name: /confidence level 5/i });
      await user.click(confidenceButton5);

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /log session/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onStatusChange).toHaveBeenCalledWith('song-1', 'Learning', 5);
      });
    });

    it('should show correct status when single song is auto-selected with different statuses', () => {
      // Test with a song that has Mastered status
      const masteredSong: Song[] = [mockSongs[1]]; // song-2 has Mastered status

      render(
        <LogPracticeModal
          {...defaultProps}
          songs={masteredSong}
          songStatuses={mockSongStatuses}
        />
      );

      // Status should be Mastered (song-2's status)
      expect(screen.getByRole('combobox', { name: /learning status/i })).toHaveTextContent('Mastered');
    });

    it('should pre-populate status in edit mode from songStatuses', () => {
      render(
        <LogPracticeModal
          {...defaultProps}
          editSession={mockEditSession}
          songStatuses={mockSongStatuses}
        />
      );

      // Should show the status for the session's song (song-1 = Learning)
      expect(screen.getByRole('combobox', { name: /learning status/i })).toHaveTextContent('Learning');
    });
  });

  describe('SectionPicker integration', () => {
    it('should submit session with selected section IDs', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);

      // Mock useSongSections to return sections
      mockUseSongSections.mockReturnValue({
        ...defaultSectionsMock,
        sections: mockSectionsData,
      });

      render(<LogPracticeModal {...defaultProps} songs={singleSong} onSubmit={onSubmit} />);

      // Select sections via SectionPicker chips
      const introChip = screen.getByRole('checkbox', { name: 'Intro' });
      await user.click(introChip);

      const verse1Chip = screen.getByRole('checkbox', { name: 'Verse 1' });
      await user.click(verse1Chip);

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /log session/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            sectionIds: ['section-1', 'section-2'],
          })
        );
      });
    });

    it('should pre-populate sections in edit mode', () => {
      // Create session with sectionIds
      const sessionWithSections: PracticeSession = {
        ...mockEditSession,
        sectionIds: ['section-1', 'section-2'],
      };

      // Mock useSongSections to return sections
      mockUseSongSections.mockReturnValue({
        ...defaultSectionsMock,
        sections: mockSectionsData,
      });

      render(<LogPracticeModal {...defaultProps} editSession={sessionWithSections} />);

      // Verify both sections are selected (aria-checked="true")
      const introChip = screen.getByRole('checkbox', { name: 'Intro' });
      const verse1Chip = screen.getByRole('checkbox', { name: 'Verse 1' });

      expect(introChip).toHaveAttribute('aria-checked', 'true');
      expect(verse1Chip).toHaveAttribute('aria-checked', 'true');
    });

    it('should show empty state when song has no sections', () => {
      // Mock useSongSections to return empty sections
      mockUseSongSections.mockReturnValue({
        ...defaultSectionsMock,
        sections: [],
      });

      render(<LogPracticeModal {...defaultProps} songs={singleSong} />);

      // Section picker should show empty state
      expect(screen.getByText('No sections defined for this song')).toBeInTheDocument();
    });

    it('should render section chips when song has sections', () => {
      // Mock useSongSections to return sections
      mockUseSongSections.mockReturnValue({
        ...defaultSectionsMock,
        sections: mockSectionsData,
      });

      render(<LogPracticeModal {...defaultProps} songs={singleSong} />);

      // Section picker should show section chips
      expect(screen.getByRole('checkbox', { name: 'Intro' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Verse 1' })).toBeInTheDocument();
    });
  });
});
