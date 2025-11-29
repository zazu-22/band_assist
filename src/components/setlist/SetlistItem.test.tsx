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

// Default props
const createDefaultProps = (overrides = {}) => ({
  song: createMockSong(),
  index: 0,
  isDragged: false,
  onSelect: vi.fn(),
  onDelete: vi.fn(),
  onDragStart: vi.fn(),
  onDragOver: vi.fn(),
  onDrop: vi.fn(),
  onDragEnd: vi.fn(),
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
      // StatusBadge renders the status text
      expect(screen.getByText('Performance Ready')).toBeInTheDocument();
    });

    it('renders delete button with correct aria-label', () => {
      render(<SetlistItem {...createDefaultProps()} />);
      const deleteBtn = screen.getByLabelText('Delete Sharp Dressed Man');
      expect(deleteBtn).toBeInTheDocument();
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
      render(<SetlistItem {...createDefaultProps()} />);
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
    it('hides item when being dragged', () => {
      const { container } = render(<SetlistItem {...createDefaultProps({ isDragged: true })} />);
      const item = container.querySelector('li');
      expect(item).toHaveClass('opacity-0', 'h-0', 'overflow-hidden');
    });

    it('is visible when not being dragged', () => {
      const { container } = render(<SetlistItem {...createDefaultProps({ isDragged: false })} />);
      const item = container.querySelector('li');
      expect(item).not.toHaveClass('h-0');
    });

    it('drag handle has cursor-grab and touch-none classes', () => {
      render(<SetlistItem {...createDefaultProps()} />);
      const dragHandle = screen.getByLabelText('Drag to reorder');
      expect(dragHandle).toHaveClass('cursor-grab', 'active:cursor-grabbing', 'touch-none');
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
      render(<SetlistItem {...createDefaultProps({ onDelete })} />);

      const deleteBtn = screen.getByLabelText('Delete Sharp Dressed Man');
      fireEvent.click(deleteBtn);

      expect(onDelete).toHaveBeenCalledWith('1');
    });

    it('calls onDragStart when dragging begins', () => {
      const onDragStart = vi.fn();
      const { container } = render(<SetlistItem {...createDefaultProps({ onDragStart })} />);

      const item = container.querySelector('li');
      fireEvent.dragStart(item!);

      expect(onDragStart).toHaveBeenCalledWith(expect.any(Object), 0);
    });

    it('calls onDragOver when dragging over item', () => {
      const onDragOver = vi.fn();
      const { container } = render(<SetlistItem {...createDefaultProps({ onDragOver })} />);

      const item = container.querySelector('li');
      fireEvent.dragOver(item!);

      expect(onDragOver).toHaveBeenCalled();
    });

    it('calls onDrop when item is dropped', () => {
      const onDrop = vi.fn();
      const { container } = render(<SetlistItem {...createDefaultProps({ onDrop })} />);

      const item = container.querySelector('li');
      fireEvent.drop(item!);

      expect(onDrop).toHaveBeenCalled();
    });

    it('calls onDragEnd when dragging ends', () => {
      const onDragEnd = vi.fn();
      const { container } = render(<SetlistItem {...createDefaultProps({ onDragEnd })} />);

      const item = container.querySelector('li');
      fireEvent.dragEnd(item!);

      expect(onDragEnd).toHaveBeenCalled();
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
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    it('renders To Learn status', () => {
      render(
        <SetlistItem
          {...createDefaultProps({
            song: createMockSong({ status: 'To Learn' }),
          })}
        />
      );
      expect(screen.getByText('To Learn')).toBeInTheDocument();
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
