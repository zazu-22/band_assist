import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SetlistItem } from './SetlistItem';
import type { Song } from '@/types';

// Mock song data
const createMockSong = (overrides: Partial<Song> = {}): Song => ({
  id: '1',
  title: 'Sharp Dressed Man',
  artist: 'ZZ Top',
  key: 'E',
  bpm: 128,
  duration: '4:15',
  status: 'Performance Ready',
  isOriginal: false,
  assignments: [],
  parts: [],
  charts: [],
  ...overrides,
});

// Default props for the new touch-sortable interface
const createDefaultProps = (overrides = {}) => ({
  song: createMockSong(),
  index: 0,
  isDragging: false,
  isDropTarget: false,
  transformStyle: {},
  itemRef: vi.fn(),
  dragHandleProps: {
    onMouseDown: vi.fn(),
    onTouchStart: vi.fn(),
    'aria-label': 'Drag to reorder',
  },
  itemProps: {
    onKeyDown: vi.fn(),
    tabIndex: 0,
    role: 'listitem',
    'aria-grabbed': undefined as boolean | undefined,
    'aria-dropeffect': 'none' as const,
  },
  onSelect: vi.fn(),
  onDelete: vi.fn(),
  ...overrides,
});

describe('SetlistItem', () => {
  describe('Rendering', () => {
    it('renders song title', () => {
      render(<SetlistItem {...createDefaultProps()} />);
      expect(screen.getByText('Sharp Dressed Man')).toBeInTheDocument();
    });

    it('renders song key', () => {
      render(<SetlistItem {...createDefaultProps()} />);
      expect(screen.getByText('E')).toBeInTheDocument();
    });

    it('renders song BPM with font-mono', () => {
      render(<SetlistItem {...createDefaultProps()} />);
      const bpmElement = screen.getByText('128 BPM');
      expect(bpmElement).toBeInTheDocument();
      expect(bpmElement).toHaveClass('font-mono', 'tabular-nums');
    });

    it('renders duration on desktop', () => {
      render(<SetlistItem {...createDefaultProps()} />);
      const durationElement = screen.getByText('4:15');
      expect(durationElement).toBeInTheDocument();
      expect(durationElement).toHaveClass('font-mono', 'tabular-nums');
      // Hidden on mobile
      expect(durationElement).toHaveClass('hidden', 'md:block');
    });

    it('renders track number with font-mono', () => {
      render(<SetlistItem {...createDefaultProps({ index: 2 })} />);
      const trackNum = screen.getByText('3'); // 0-indexed + 1
      expect(trackNum).toBeInTheDocument();
      expect(trackNum).toHaveClass('font-mono', 'tabular-nums');
    });

    it('renders StatusBadge with correct status', () => {
      render(<SetlistItem {...createDefaultProps()} />);
      // SongStatusBadges renders the status text with "Band: " prefix
      expect(screen.getByText(/Performance Ready/)).toBeInTheDocument();
    });

    it('renders delete button with correct aria-label when isAdmin', () => {
      render(<SetlistItem {...createDefaultProps({ isAdmin: true })} />);
      const deleteBtn = screen.getByLabelText('Delete Sharp Dressed Man');
      expect(deleteBtn).toBeInTheDocument();
    });

    it('does not render delete button when not isAdmin', () => {
      render(<SetlistItem {...createDefaultProps({ isAdmin: false })} />);
      expect(screen.queryByLabelText('Delete Sharp Dressed Man')).not.toBeInTheDocument();
    });

    it('renders drag handle with aria-label', () => {
      render(<SetlistItem {...createDefaultProps()} />);
      expect(screen.getByLabelText('Drag to reorder')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('has left border accent styling', () => {
      const { container } = render(<SetlistItem {...createDefaultProps()} />);
      const item = container.querySelector('li');
      expect(item).toHaveClass('border-l-[3px]', 'border-l-primary/60');
    });

    it('has hover background class', () => {
      const { container } = render(<SetlistItem {...createDefaultProps()} />);
      const item = container.querySelector('li');
      expect(item).toHaveClass('hover:bg-muted/30');
    });

    it('has staggered animation class', () => {
      const { container } = render(<SetlistItem {...createDefaultProps()} />);
      const item = container.querySelector('li');
      expect(item).toHaveClass('animate-slide-in-from-bottom', 'animation-forwards');
    });

    it('applies correct animation delay based on index', () => {
      const { container } = render(<SetlistItem {...createDefaultProps({ index: 3 })} />);
      const item = container.querySelector('li');
      expect(item).toHaveStyle({ animationDelay: '150ms' });
    });

    it('has opacity-0 and group-hover:opacity-100 on delete button', () => {
      render(<SetlistItem {...createDefaultProps({ isAdmin: true })} />);
      const deleteBtn = screen.getByLabelText('Delete Sharp Dressed Man');
      expect(deleteBtn).toHaveClass('opacity-0', 'group-hover:opacity-100');
    });

    it('has motion-reduce class for accessibility', () => {
      const { container } = render(<SetlistItem {...createDefaultProps()} />);
      const item = container.querySelector('li');
      expect(item).toHaveClass('motion-reduce:transition-none');
    });
  });

  describe('Drag States', () => {
    it('shows cursor-grabbing when being dragged', () => {
      const { container } = render(<SetlistItem {...createDefaultProps({ isDragging: true })} />);
      const item = container.querySelector('li');
      expect(item).toHaveClass('cursor-grabbing');
    });

    it('does not have cursor-grabbing when not being dragged', () => {
      const { container } = render(<SetlistItem {...createDefaultProps({ isDragging: false })} />);
      const item = container.querySelector('li');
      expect(item).not.toHaveClass('cursor-grabbing');
    });

    it('shows drop target ring when isDropTarget is true', () => {
      const { container } = render(<SetlistItem {...createDefaultProps({ isDropTarget: true })} />);
      const item = container.querySelector('li');
      expect(item).toHaveClass('ring-2', 'ring-primary');
    });

    it('does not show drop target ring when isDropTarget is false', () => {
      const { container } = render(<SetlistItem {...createDefaultProps({ isDropTarget: false })} />);
      const item = container.querySelector('li');
      expect(item).not.toHaveClass('ring-2');
    });

    it('drag handle has cursor-grab class', () => {
      render(<SetlistItem {...createDefaultProps()} />);
      const dragHandle = screen.getByLabelText('Drag to reorder');
      expect(dragHandle).toHaveClass('cursor-grab', 'active:cursor-grabbing');
    });

    it('applies transformStyle to the item', () => {
      const transformStyle = { transform: 'translateY(100px)', zIndex: 100 };
      const { container } = render(<SetlistItem {...createDefaultProps({ transformStyle })} />);
      const item = container.querySelector('li');
      expect(item).toHaveStyle({ transform: 'translateY(100px)', zIndex: '100' });
    });
  });

  describe('Interactions', () => {
    it('calls onSelect when song title is clicked', () => {
      const onSelect = vi.fn();
      render(<SetlistItem {...createDefaultProps({ onSelect })} />);

      const titleButton = screen.getByText('Sharp Dressed Man').closest('button');
      fireEvent.click(titleButton!);

      expect(onSelect).toHaveBeenCalledWith('1');
    });

    it('calls onDelete when delete button is clicked', () => {
      const onDelete = vi.fn();
      render(<SetlistItem {...createDefaultProps({ onDelete, isAdmin: true })} />);

      const deleteBtn = screen.getByLabelText('Delete Sharp Dressed Man');
      fireEvent.click(deleteBtn);

      expect(onDelete).toHaveBeenCalledWith('1');
    });

    it('calls dragHandleProps.onMouseDown when mouse down on drag handle', () => {
      const onMouseDown = vi.fn();
      const dragHandleProps = {
        onMouseDown,
        onTouchStart: vi.fn(),
        'aria-label': 'Drag to reorder',
      };
      render(<SetlistItem {...createDefaultProps({ dragHandleProps })} />);

      const dragHandle = screen.getByLabelText('Drag to reorder');
      fireEvent.mouseDown(dragHandle);

      expect(onMouseDown).toHaveBeenCalled();
    });

    it('calls dragHandleProps.onTouchStart when touch starts on drag handle', () => {
      const onTouchStart = vi.fn();
      const dragHandleProps = {
        onMouseDown: vi.fn(),
        onTouchStart,
        'aria-label': 'Drag to reorder',
      };
      render(<SetlistItem {...createDefaultProps({ dragHandleProps })} />);

      const dragHandle = screen.getByLabelText('Drag to reorder');
      fireEvent.touchStart(dragHandle);

      expect(onTouchStart).toHaveBeenCalled();
    });

    it('calls itemProps.onKeyDown when key is pressed on item', () => {
      const onKeyDown = vi.fn();
      const itemProps = {
        onKeyDown,
        tabIndex: 0,
        role: 'listitem',
        'aria-grabbed': undefined as boolean | undefined,
        'aria-dropeffect': 'none' as const,
      };
      const { container } = render(<SetlistItem {...createDefaultProps({ itemProps })} />);

      const item = container.querySelector('li');
      fireEvent.keyDown(item!, { key: 'Enter' });

      expect(onKeyDown).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA role on list item', () => {
      const { container } = render(<SetlistItem {...createDefaultProps()} />);
      const item = container.querySelector('li');
      expect(item).toHaveAttribute('role', 'listitem');
    });

    it('has tabIndex for keyboard navigation', () => {
      const { container } = render(<SetlistItem {...createDefaultProps()} />);
      const item = container.querySelector('li');
      expect(item).toHaveAttribute('tabindex', '0');
    });

    it('has aria-grabbed when being dragged', () => {
      const itemProps = {
        onKeyDown: vi.fn(),
        tabIndex: 0,
        role: 'listitem',
        'aria-grabbed': true as boolean | undefined,
        'aria-dropeffect': 'move' as const,
      };
      const { container } = render(<SetlistItem {...createDefaultProps({ itemProps })} />);
      const item = container.querySelector('li');
      expect(item).toHaveAttribute('aria-grabbed', 'true');
    });

    it('has focus-visible ring for keyboard focus', () => {
      const { container } = render(<SetlistItem {...createDefaultProps()} />);
      const item = container.querySelector('li');
      expect(item).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-primary');
    });

    it('drag handle meets 44px minimum touch target', () => {
      render(<SetlistItem {...createDefaultProps()} />);
      const dragHandle = screen.getByLabelText('Drag to reorder');
      expect(dragHandle).toHaveClass('min-h-[44px]', 'min-w-[44px]');
    });
  });

  describe('Different Song Statuses', () => {
    it('renders In Progress status', () => {
      render(
        <SetlistItem
          {...createDefaultProps({
            song: createMockSong({ status: 'In Progress' }),
          })}
        />
      );
      expect(screen.getByText(/In Progress/)).toBeInTheDocument();
    });

    it('renders To Learn status', () => {
      render(
        <SetlistItem
          {...createDefaultProps({
            song: createMockSong({ status: 'To Learn' }),
          })}
        />
      );
      expect(screen.getByText(/To Learn/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles long song titles with truncation', () => {
      render(
        <SetlistItem
          {...createDefaultProps({
            song: createMockSong({
              title: 'This Is A Very Long Song Title That Should Be Truncated',
            }),
          })}
        />
      );
      const title = screen.getByText('This Is A Very Long Song Title That Should Be Truncated');
      expect(title).toHaveClass('truncate');
    });

    it('displays first track number correctly', () => {
      render(<SetlistItem {...createDefaultProps({ index: 0 })} />);
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('displays double-digit track number correctly', () => {
      render(<SetlistItem {...createDefaultProps({ index: 9 })} />);
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });
});
