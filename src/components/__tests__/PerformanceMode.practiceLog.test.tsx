import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PerformanceMode } from '../PerformanceMode';
import { supabaseStorageService } from '@/services/supabaseStorageService';
import { toast } from '../ui/Toast';
import type { Song, PracticeSession } from '@/types';

// Mock dependencies
vi.mock('@/services/supabaseStorageService', () => ({
  supabaseStorageService: {
    logPracticeSession: vi.fn(),
    updateUserSongStatus: vi.fn(),
  },
}));

vi.mock('../ui/Toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock useUserSongStatus hook - returns null status by default (no existing status)
vi.mock('@/hooks/useUserSongStatus', () => ({
  useUserSongStatus: vi.fn(() => ({
    status: null,
    isLoading: false,
    error: null,
    updateStatus: vi.fn(),
    refetch: vi.fn(),
  })),
}));

// Mock LazyAlphaTab to avoid rendering issues in tests
vi.mock('../LazyAlphaTab', () => ({
  LazyAlphaTab: () => <div>Mocked AlphaTab</div>,
}));

// Mock SmartTabEditor to avoid rendering issues in tests
vi.mock('../SmartTabEditor', () => ({
  SmartTabEditor: () => <div>Mocked SmartTabEditor</div>,
}));

describe('PerformanceMode - Practice Log Dialog', () => {
  const mockSong: Song = {
    id: 'song-1',
    title: 'Test Song',
    artist: 'Test Artist',
    duration: '3:30',
    bpm: 120,
    key: 'C',
    isOriginal: false,
    status: 'In Progress',
    assignments: [],
    parts: [
      { id: 'part-1', name: 'Intro', instrument: 'All', content: 'Intro part' },
      { id: 'part-2', name: 'Verse 1', instrument: 'All', content: 'Verse 1 part' },
      { id: 'part-3', name: 'Chorus', instrument: 'All', content: 'Chorus part' },
    ],
    charts: [
      {
        id: 'chart-1',
        name: 'Main Chart',
        instrument: 'All',
        type: 'TEXT',
        content: 'Test chart content',
        annotations: [],
      },
    ],
  };

  const defaultProps = {
    songs: [mockSong],
    onExit: vi.fn(),
    currentUserId: 'user-1',
    currentBandId: 'band-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('button visibility based on auth state', () => {
    it('should not show Log Practice button when not authenticated', () => {
      render(<PerformanceMode {...defaultProps} currentUserId={undefined} />);
      expect(screen.queryByText('Log Practice')).not.toBeInTheDocument();
    });

    it('should show Log Practice button when authenticated', () => {
      render(<PerformanceMode {...defaultProps} />);
      expect(screen.getByText('Log Practice')).toBeInTheDocument();
    });
  });

  describe('dialog open/close behavior', () => {
    it('should open dialog when Log Practice button clicked', async () => {
      const user = userEvent.setup();
      render(<PerformanceMode {...defaultProps} />);

      const logButton = screen.getByText('Log Practice');
      await user.click(logButton);

      expect(screen.getByText('Log Practice Session')).toBeInTheDocument();
      expect(screen.getByText(`Record your practice session for ${mockSong.title}`)).toBeInTheDocument();
    });

    it('should close dialog when Cancel button clicked', async () => {
      const user = userEvent.setup();
      render(<PerformanceMode {...defaultProps} />);

      // Open dialog
      await user.click(screen.getByText('Log Practice'));
      expect(screen.getByText('Log Practice Session')).toBeInTheDocument();

      // Close dialog
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      // Dialog should be closed (content not visible)
      await waitFor(() => {
        expect(screen.queryByText('Log Practice Session')).not.toBeInTheDocument();
      });
    });
  });

  describe('form field interactions', () => {
    it('should allow duration input to be changed', async () => {
      const user = userEvent.setup();
      render(<PerformanceMode {...defaultProps} />);

      await user.click(screen.getByText('Log Practice'));

      const durationInput = screen.getByLabelText(/Duration \(minutes\)/);
      expect(durationInput).toHaveValue(30); // Default value

      await user.clear(durationInput);
      await user.type(durationInput, '45');

      expect(durationInput).toHaveValue(45);
    });

    it('should allow tempo input to be changed', async () => {
      const user = userEvent.setup();
      render(<PerformanceMode {...defaultProps} />);

      await user.click(screen.getByText('Log Practice'));

      const tempoInput = screen.getByLabelText(/Tempo \(BPM\)/);
      expect(tempoInput).toHaveValue(120); // Default from song BPM

      await user.clear(tempoInput);
      await user.type(tempoInput, '100');

      expect(tempoInput).toHaveValue(100);
    });

    it('should toggle section buttons', async () => {
      const user = userEvent.setup();
      render(<PerformanceMode {...defaultProps} />);

      await user.click(screen.getByText('Log Practice'));

      const introButton = screen.getByRole('button', { name: 'Intro' });
      const verse1Button = screen.getByRole('button', { name: 'Verse 1' });

      // Toggle Intro on
      await user.click(introButton);
      expect(introButton).toHaveClass('bg-amber-600');

      // Toggle Verse 1 on
      await user.click(verse1Button);
      expect(verse1Button).toHaveClass('bg-amber-600');

      // Toggle Intro off
      await user.click(introButton);
      expect(introButton).toHaveClass('bg-zinc-800');
    });

    it('should have status select field', async () => {
      const user = userEvent.setup();
      render(<PerformanceMode {...defaultProps} />);

      await user.click(screen.getByText('Log Practice'));

      // Verify status select exists with default value
      const statusSelect = screen.getByRole('combobox', { name: /Learning Status/i });
      expect(statusSelect).toBeInTheDocument();
      expect(statusSelect).toHaveTextContent('Not Started');
    });

    it('should change confidence level', async () => {
      const user = userEvent.setup();
      render(<PerformanceMode {...defaultProps} />);

      await user.click(screen.getByText('Log Practice'));

      // Click confidence level 5
      const confidenceButtons = screen.getAllByRole('button', { name: /^[1-5]$/ });
      const level5Button = confidenceButtons.find(btn => btn.textContent === '5');
      expect(level5Button).toBeDefined();

      await user.click(level5Button!);

      // Level 5 should be highlighted
      expect(level5Button).toHaveClass('bg-amber-600');
    });

    it('should allow notes input to be changed', async () => {
      const user = userEvent.setup();
      render(<PerformanceMode {...defaultProps} />);

      await user.click(screen.getByText('Log Practice'));

      const notesInput = screen.getByLabelText(/Notes/);
      await user.click(notesInput);
      await user.paste('Worked on timing in the chorus');

      expect(notesInput).toHaveValue('Worked on timing in the chorus');
    });
  });

  describe('validation', () => {
    it('should show validation error for invalid duration (zero)', async () => {
      const user = userEvent.setup();
      render(<PerformanceMode {...defaultProps} />);

      await user.click(screen.getByText('Log Practice'));

      const durationInput = screen.getByLabelText(/Duration \(minutes\)/);
      await user.clear(durationInput);
      await user.type(durationInput, '0');

      const saveButton = screen.getByRole('button', { name: /Save Practice Log/ });
      await user.click(saveButton);

      expect(toast.error).toHaveBeenCalledWith('Duration must be greater than 0');
      expect(supabaseStorageService.logPracticeSession).not.toHaveBeenCalled();
    });

    it('should show validation error for empty duration', async () => {
      const user = userEvent.setup();
      render(<PerformanceMode {...defaultProps} />);

      await user.click(screen.getByText('Log Practice'));

      const durationInput = screen.getByLabelText(/Duration \(minutes\)/);
      await user.clear(durationInput);

      const saveButton = screen.getByRole('button', { name: /Save Practice Log/ });
      await user.click(saveButton);

      expect(toast.error).toHaveBeenCalledWith('Duration must be greater than 0');
      expect(supabaseStorageService.logPracticeSession).not.toHaveBeenCalled();
    });

    it('should show error when missing currentUserId', async () => {
      render(<PerformanceMode {...defaultProps} currentUserId={undefined} />);

      // Button should not be visible when not authenticated
      expect(screen.queryByText('Log Practice')).not.toBeInTheDocument();
    });

    it('should show error when missing currentBandId', async () => {
      const user = userEvent.setup();
      render(<PerformanceMode {...defaultProps} currentBandId={null} />);

      await user.click(screen.getByText('Log Practice'));

      const saveButton = screen.getByRole('button', { name: /Save Practice Log/ });
      await user.click(saveButton);

      expect(toast.error).toHaveBeenCalledWith('Missing required information to log practice session');
      expect(supabaseStorageService.logPracticeSession).not.toHaveBeenCalled();
    });
  });

  describe('successful submission', () => {
    it('should call service methods with correct data', async () => {
      const user = userEvent.setup();
      vi.mocked(supabaseStorageService.logPracticeSession).mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        songId: 'song-1',
        bandId: 'band-1',
        durationMinutes: 45,
        tempoBpm: 100,
        sectionsPracticed: ['Intro', 'Chorus'],
        notes: 'Good practice session',
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      vi.mocked(supabaseStorageService.updateUserSongStatus).mockResolvedValue({
        id: 'progress-1',
        userId: 'user-1',
        songId: 'song-1',
        status: 'Learning',
        confidenceLevel: 4,
        lastPracticedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      render(<PerformanceMode {...defaultProps} />);

      await user.click(screen.getByText('Log Practice'));

      // Fill out form
      const durationInput = screen.getByLabelText(/Duration \(minutes\)/);
      await user.clear(durationInput);
      await user.type(durationInput, '45');

      const tempoInput = screen.getByLabelText(/Tempo \(BPM\)/);
      await user.clear(tempoInput);
      await user.type(tempoInput, '100');

      // Toggle sections
      await user.click(screen.getByRole('button', { name: 'Intro' }));
      await user.click(screen.getByRole('button', { name: 'Chorus' }));

      // Add notes
      const notesInput = screen.getByLabelText(/Notes/);
      await user.click(notesInput);
      await user.paste('Good practice session');

      // Note: Radix UI Select interactions are complex to test, so we test with default values

      // Change confidence
      const confidenceButtons = screen.getAllByRole('button', { name: /^[1-5]$/ });
      const level4Button = confidenceButtons.find(btn => btn.textContent === '4');
      await user.click(level4Button!);

      // Submit
      const saveButton = screen.getByRole('button', { name: /Save Practice Log/ });
      await user.click(saveButton);

      await waitFor(() => {
        expect(supabaseStorageService.logPracticeSession).toHaveBeenCalledWith({
          userId: 'user-1',
          songId: 'song-1',
          bandId: 'band-1',
          durationMinutes: 45,
          tempoBpm: 100,
          sectionsPracticed: ['Intro', 'Chorus'],
          notes: 'Good practice session',
          date: expect.any(String),
        });

        expect(supabaseStorageService.updateUserSongStatus).toHaveBeenCalledWith(
          'user-1',
          'song-1',
          'Not Started',
          4
        );

        expect(toast.success).toHaveBeenCalledWith('Practice session logged successfully');
      });
    });

    it('should close dialog after successful save', async () => {
      const user = userEvent.setup();
      vi.mocked(supabaseStorageService.logPracticeSession).mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        songId: 'song-1',
        bandId: 'band-1',
        durationMinutes: 30,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      vi.mocked(supabaseStorageService.updateUserSongStatus).mockResolvedValue({
        id: 'progress-1',
        userId: 'user-1',
        songId: 'song-1',
        status: 'Not Started',
        confidenceLevel: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      render(<PerformanceMode {...defaultProps} />);

      await user.click(screen.getByText('Log Practice'));

      const saveButton = screen.getByRole('button', { name: /Save Practice Log/ });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.queryByText('Log Practice Session')).not.toBeInTheDocument();
      });
    });

    it('should reset form after successful save', async () => {
      const user = userEvent.setup();
      vi.mocked(supabaseStorageService.logPracticeSession).mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        songId: 'song-1',
        bandId: 'band-1',
        durationMinutes: 45,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      vi.mocked(supabaseStorageService.updateUserSongStatus).mockResolvedValue({
        id: 'progress-1',
        userId: 'user-1',
        songId: 'song-1',
        status: 'Learning',
        confidenceLevel: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      render(<PerformanceMode {...defaultProps} />);

      // Open dialog and modify fields
      await user.click(screen.getByText('Log Practice'));

      const durationInput = screen.getByLabelText(/Duration \(minutes\)/);
      await user.clear(durationInput);
      await user.type(durationInput, '45');

      await user.click(screen.getByRole('button', { name: 'Intro' }));

      // Save
      await user.click(screen.getByRole('button', { name: /Save Practice Log/ }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });

      // Reopen dialog
      await user.click(screen.getByText('Log Practice'));

      // Form should be reset to defaults
      const reopenedDurationInput = screen.getByLabelText(/Duration \(minutes\)/);
      expect(reopenedDurationInput).toHaveValue(30);

      const introButton = screen.getByRole('button', { name: 'Intro' });
      expect(introButton).toHaveClass('bg-zinc-800'); // Not selected
    });
  });

  describe('loading state', () => {
    it('should show loading state on save button while saving', async () => {
      const user = userEvent.setup();

      // Create a promise that we can resolve later
      let resolvePromise: (value: PracticeSession) => void;
      const promise = new Promise<PracticeSession>(resolve => {
        resolvePromise = resolve;
      });

      vi.mocked(supabaseStorageService.logPracticeSession).mockReturnValue(promise);
      vi.mocked(supabaseStorageService.updateUserSongStatus).mockResolvedValue({
        id: 'progress-1',
        userId: 'user-1',
        songId: 'song-1',
        status: 'Not Started',
        confidenceLevel: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      render(<PerformanceMode {...defaultProps} />);

      await user.click(screen.getByText('Log Practice'));

      const saveButton = screen.getByRole('button', { name: /Save Practice Log/ });
      await user.click(saveButton);

      // Button should show loading text
      expect(screen.getByText('Saving...')).toBeInTheDocument();

      // Button should be disabled
      expect(saveButton).toBeDisabled();

      // Resolve the promise
      resolvePromise!({
        id: 'session-1',
        userId: 'user-1',
        songId: 'song-1',
        bandId: 'band-1',
        durationMinutes: 30,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should show error toast on save failure (logPracticeSession)', async () => {
      // Suppress console.error for this error test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const user = userEvent.setup();
      vi.mocked(supabaseStorageService.logPracticeSession).mockRejectedValue(
        new Error('Database connection failed')
      );

      render(<PerformanceMode {...defaultProps} />);

      await user.click(screen.getByText('Log Practice'));

      const saveButton = screen.getByRole('button', { name: /Save Practice Log/ });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to log practice session');
      });

      // Dialog should remain open on error
      expect(screen.getByText('Log Practice Session')).toBeInTheDocument();

      consoleError.mockRestore();
    });

    it('should show error toast on save failure (updateUserSongStatus)', async () => {
      // Suppress console.error for this error test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const user = userEvent.setup();
      vi.mocked(supabaseStorageService.logPracticeSession).mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        songId: 'song-1',
        bandId: 'band-1',
        durationMinutes: 30,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      vi.mocked(supabaseStorageService.updateUserSongStatus).mockRejectedValue(
        new Error('Status update failed')
      );

      render(<PerformanceMode {...defaultProps} />);

      await user.click(screen.getByText('Log Practice'));

      // Change confidence to trigger status update (status only updates if changed)
      const confidenceButtons = screen.getAllByRole('button', { name: /^[1-5]$/ });
      const level5Button = confidenceButtons.find(btn => btn.textContent === '5');
      await user.click(level5Button!);

      const saveButton = screen.getByRole('button', { name: /Save Practice Log/ });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to log practice session');
      });

      // Dialog should remain open on error
      expect(screen.getByText('Log Practice Session')).toBeInTheDocument();

      consoleError.mockRestore();
    });

    it('should reset loading state after error', async () => {
      // Suppress console.error for this error test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const user = userEvent.setup();
      vi.mocked(supabaseStorageService.logPracticeSession).mockRejectedValue(
        new Error('Save failed')
      );

      render(<PerformanceMode {...defaultProps} />);

      await user.click(screen.getByText('Log Practice'));

      const saveButton = screen.getByRole('button', { name: /Save Practice Log/ });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      // Button should not be disabled after error
      expect(saveButton).not.toBeDisabled();
      expect(screen.getByText('Save Practice Log')).toBeInTheDocument();

      consoleError.mockRestore();
    });
  });

  describe('default values', () => {
    it('should initialize with default duration of 30 minutes', async () => {
      const user = userEvent.setup();
      render(<PerformanceMode {...defaultProps} />);

      await user.click(screen.getByText('Log Practice'));

      const durationInput = screen.getByLabelText(/Duration \(minutes\)/);
      expect(durationInput).toHaveValue(30);
    });

    it('should initialize tempo with song BPM', async () => {
      const user = userEvent.setup();
      render(<PerformanceMode {...defaultProps} />);

      await user.click(screen.getByText('Log Practice'));

      const tempoInput = screen.getByLabelText(/Tempo \(BPM\)/);
      expect(tempoInput).toHaveValue(mockSong.bpm);
    });

    it('should initialize with no sections selected', async () => {
      const user = userEvent.setup();
      render(<PerformanceMode {...defaultProps} />);

      await user.click(screen.getByText('Log Practice'));

      const introButton = screen.getByRole('button', { name: 'Intro' });
      const verse1Button = screen.getByRole('button', { name: 'Verse 1' });
      const chorusButton = screen.getByRole('button', { name: 'Chorus' });

      expect(introButton).toHaveClass('bg-zinc-800');
      expect(verse1Button).toHaveClass('bg-zinc-800');
      expect(chorusButton).toHaveClass('bg-zinc-800');
    });

    it('should initialize with default status "Not Started"', async () => {
      const user = userEvent.setup();
      render(<PerformanceMode {...defaultProps} />);

      await user.click(screen.getByText('Log Practice'));

      const statusSelect = screen.getByRole('combobox', { name: /Learning Status/i });
      expect(statusSelect).toHaveTextContent('Not Started');
    });

    it('should initialize with default confidence level of 3', async () => {
      const user = userEvent.setup();
      render(<PerformanceMode {...defaultProps} />);

      await user.click(screen.getByText('Log Practice'));

      const confidenceButtons = screen.getAllByRole('button', { name: /^[1-5]$/ });
      const level3Button = confidenceButtons.find(btn => btn.textContent === '3');

      expect(level3Button).toHaveClass('bg-amber-600');
    });
  });

  describe('sections display', () => {
    it('should not show sections when song has no parts', async () => {
      const user = userEvent.setup();
      const songWithoutParts: Song = { ...mockSong, parts: [] };
      render(<PerformanceMode {...defaultProps} songs={[songWithoutParts]} />);

      await user.click(screen.getByText('Log Practice'));

      expect(screen.queryByText('Sections Practiced')).not.toBeInTheDocument();
    });

    it('should show all song parts as section buttons', async () => {
      const user = userEvent.setup();
      render(<PerformanceMode {...defaultProps} />);

      await user.click(screen.getByText('Log Practice'));

      expect(screen.getByText('Sections Practiced')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Intro' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Verse 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Chorus' })).toBeInTheDocument();
    });
  });
});
