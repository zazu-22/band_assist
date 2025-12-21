import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SectionPicker } from '../SectionPicker';
import type { SongSection } from '@/types';

// Mock sections for testing
const mockSections: SongSection[] = [
  {
    id: 'section-1',
    songId: 'song-1',
    bandId: 'band-1',
    name: 'Intro',
    startBar: 1,
    endBar: 8,
    barCount: 8,
    displayOrder: 1,
    source: 'manual',
    createdAt: '2025-12-01T00:00:00Z',
    updatedAt: '2025-12-01T00:00:00Z',
  },
  {
    id: 'section-2',
    songId: 'song-1',
    bandId: 'band-1',
    name: 'Verse 1',
    startBar: 9,
    endBar: 24,
    barCount: 16,
    displayOrder: 2,
    source: 'manual',
    createdAt: '2025-12-01T00:00:00Z',
    updatedAt: '2025-12-01T00:00:00Z',
  },
  {
    id: 'section-3',
    songId: 'song-1',
    bandId: 'band-1',
    name: 'Chorus',
    startBar: 25,
    endBar: 40,
    barCount: 16,
    displayOrder: 3,
    source: 'manual',
    createdAt: '2025-12-01T00:00:00Z',
    updatedAt: '2025-12-01T00:00:00Z',
  },
];

// Mock the useSongSections hook
vi.mock('@/hooks/useSongSections', () => ({
  useSongSections: vi.fn(),
}));

import { useSongSections } from '@/hooks/useSongSections';
const mockUseSongSections = vi.mocked(useSongSections);

describe('SectionPicker', () => {
  const defaultProps = {
    songId: 'song-1',
    bandId: 'band-1',
    selectedSectionIds: [],
    onSelectionChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock returns sections
    mockUseSongSections.mockReturnValue({
      sections: mockSections,
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

  describe('rendering', () => {
    it('should render nothing when songId is null', () => {
      const { container } = render(
        <SectionPicker {...defaultProps} songId={null} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should show loading state when loading sections', () => {
      mockUseSongSections.mockReturnValue({
        sections: [],
        isLoading: true,
        error: null,
        refetch: vi.fn(),
        createSection: vi.fn(),
        updateSection: vi.fn(),
        deleteSection: vi.fn(),
        upsertSections: vi.fn(),
        deleteAllSections: vi.fn(),
      });

      render(<SectionPicker {...defaultProps} />);

      expect(screen.getByText('Loading sections...')).toBeInTheDocument();
    });

    it('should show error state when loading fails', () => {
      mockUseSongSections.mockReturnValue({
        sections: [],
        isLoading: false,
        error: new Error('Failed to load'),
        refetch: vi.fn(),
        createSection: vi.fn(),
        updateSection: vi.fn(),
        deleteSection: vi.fn(),
        upsertSections: vi.fn(),
        deleteAllSections: vi.fn(),
      });

      render(<SectionPicker {...defaultProps} />);

      expect(screen.getByText('Failed to load sections')).toBeInTheDocument();
    });

    it('should show empty state when no sections exist', () => {
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

      render(<SectionPicker {...defaultProps} />);

      expect(screen.getByText('No sections defined for this song')).toBeInTheDocument();
    });

    it('should render section chips when sections exist', () => {
      render(<SectionPicker {...defaultProps} />);

      expect(screen.getByRole('checkbox', { name: 'Intro' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Verse 1' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Chorus' })).toBeInTheDocument();
    });

    it('should render with correct ARIA attributes', () => {
      render(<SectionPicker {...defaultProps} />);

      const group = screen.getByRole('group', { name: 'Select sections practiced' });
      expect(group).toBeInTheDocument();

      const introChip = screen.getByRole('checkbox', { name: 'Intro' });
      expect(introChip).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('selection behavior', () => {
    it('should show selected state for selected sections', () => {
      render(
        <SectionPicker {...defaultProps} selectedSectionIds={['section-1', 'section-3']} />
      );

      const introChip = screen.getByRole('checkbox', { name: 'Intro' });
      const verse1Chip = screen.getByRole('checkbox', { name: 'Verse 1' });
      const chorusChip = screen.getByRole('checkbox', { name: 'Chorus' });

      expect(introChip).toHaveAttribute('aria-checked', 'true');
      expect(verse1Chip).toHaveAttribute('aria-checked', 'false');
      expect(chorusChip).toHaveAttribute('aria-checked', 'true');
    });

    it('should call onSelectionChange with added section when clicking unselected chip', async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();

      render(
        <SectionPicker
          {...defaultProps}
          selectedSectionIds={['section-1']}
          onSelectionChange={onSelectionChange}
        />
      );

      const verse1Chip = screen.getByRole('checkbox', { name: 'Verse 1' });
      await user.click(verse1Chip);

      expect(onSelectionChange).toHaveBeenCalledWith(['section-1', 'section-2']);
    });

    it('should call onSelectionChange with removed section when clicking selected chip', async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();

      render(
        <SectionPicker
          {...defaultProps}
          selectedSectionIds={['section-1', 'section-2']}
          onSelectionChange={onSelectionChange}
        />
      );

      const introChip = screen.getByRole('checkbox', { name: 'Intro' });
      await user.click(introChip);

      expect(onSelectionChange).toHaveBeenCalledWith(['section-2']);
    });

    it('should allow selecting multiple sections', async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();

      render(
        <SectionPicker
          {...defaultProps}
          selectedSectionIds={[]}
          onSelectionChange={onSelectionChange}
        />
      );

      const introChip = screen.getByRole('checkbox', { name: 'Intro' });
      await user.click(introChip);

      expect(onSelectionChange).toHaveBeenCalledWith(['section-1']);
    });
  });

  describe('keyboard navigation', () => {
    it('should toggle section on Enter key', async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();

      render(
        <SectionPicker
          {...defaultProps}
          selectedSectionIds={[]}
          onSelectionChange={onSelectionChange}
        />
      );

      const introChip = screen.getByRole('checkbox', { name: 'Intro' });
      introChip.focus();
      await user.keyboard('{Enter}');

      expect(onSelectionChange).toHaveBeenCalledWith(['section-1']);
    });

    it('should toggle section on Space key', async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();

      render(
        <SectionPicker
          {...defaultProps}
          selectedSectionIds={['section-1']}
          onSelectionChange={onSelectionChange}
        />
      );

      const introChip = screen.getByRole('checkbox', { name: 'Intro' });
      introChip.focus();
      await user.keyboard(' ');

      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });

    it('should allow Tab navigation between chips', async () => {
      const user = userEvent.setup();

      render(<SectionPicker {...defaultProps} />);

      const introChip = screen.getByRole('checkbox', { name: 'Intro' });
      const verse1Chip = screen.getByRole('checkbox', { name: 'Verse 1' });

      introChip.focus();
      expect(document.activeElement).toBe(introChip);

      await user.tab();
      expect(document.activeElement).toBe(verse1Chip);
    });
  });

  describe('displayName', () => {
    it('should have displayName set', () => {
      expect(SectionPicker.displayName).toBe('SectionPicker');
    });
  });

  describe('className prop', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <SectionPicker {...defaultProps} className="custom-class" />
      );

      const group = container.querySelector('.custom-class');
      expect(group).toBeInTheDocument();
    });
  });
});
