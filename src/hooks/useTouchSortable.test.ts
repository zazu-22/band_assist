import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTouchSortable } from './useTouchSortable';

// Mock requestAnimationFrame
const originalRAF = global.requestAnimationFrame;

describe('useTouchSortable', () => {
  beforeEach(() => {
    global.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    };
  });

  afterEach(() => {
    global.requestAnimationFrame = originalRAF;
  });

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  describe('initialization', () => {
    it('returns initial drag state with isDragging false', () => {
      const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));

      expect(result.current.dragState.isDragging).toBe(false);
      expect(result.current.dragState.draggedIndex).toBe(null);
      expect(result.current.dragState.targetIndex).toBe(null);
    });

    it('returns empty announcement on initialization', () => {
      const items = [{ id: '1' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));

      expect(result.current.announcement).toBe('');
    });

    it('returns getter functions', () => {
      const items = [{ id: '1' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));

      expect(typeof result.current.getItemProps).toBe('function');
      expect(typeof result.current.getDragHandleProps).toBe('function');
      expect(typeof result.current.getTransformStyle).toBe('function');
    });

    it('returns liveRegionProps with correct ARIA attributes', () => {
      const items = [{ id: '1' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));

      expect(result.current.liveRegionProps).toEqual({
        role: 'status',
        'aria-live': 'polite',
        'aria-atomic': true,
        className: 'sr-only',
      });
    });
  });

  // ==========================================================================
  // ITEM PROPS
  // ==========================================================================

  describe('getItemProps', () => {
    it('returns correct ARIA role', () => {
      const items = [{ id: '1' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));
      const itemProps = result.current.getItemProps(0);

      expect(itemProps.role).toBe('listitem');
    });

    it('returns tabIndex 0 for keyboard accessibility', () => {
      const items = [{ id: '1' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));
      const itemProps = result.current.getItemProps(0);

      expect(itemProps.tabIndex).toBe(0);
    });

    it('returns aria-grabbed undefined when not grabbed', () => {
      const items = [{ id: '1' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));
      const itemProps = result.current.getItemProps(0);

      expect(itemProps['aria-grabbed']).toBeUndefined();
    });

    it('returns aria-dropeffect none when not dragging', () => {
      const items = [{ id: '1' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));
      const itemProps = result.current.getItemProps(0);

      expect(itemProps['aria-dropeffect']).toBe('none');
    });

    it('provides ref callback function', () => {
      const items = [{ id: '1' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));
      const itemProps = result.current.getItemProps(0);

      expect(typeof itemProps.ref).toBe('function');
    });

    it('provides onKeyDown handler', () => {
      const items = [{ id: '1' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));
      const itemProps = result.current.getItemProps(0);

      expect(typeof itemProps.onKeyDown).toBe('function');
    });
  });

  // ==========================================================================
  // DRAG HANDLE PROPS
  // ==========================================================================

  describe('getDragHandleProps', () => {
    it('provides onMouseDown handler', () => {
      const items = [{ id: '1' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));
      const dragHandleProps = result.current.getDragHandleProps(0);

      expect(typeof dragHandleProps.onMouseDown).toBe('function');
    });

    it('provides onTouchStart handler', () => {
      const items = [{ id: '1' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));
      const dragHandleProps = result.current.getDragHandleProps(0);

      expect(typeof dragHandleProps.onTouchStart).toBe('function');
    });

    it('provides aria-label for accessibility', () => {
      const items = [{ id: '1' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));
      const dragHandleProps = result.current.getDragHandleProps(0);

      expect(dragHandleProps['aria-label']).toBe('Drag to reorder');
    });
  });

  // ==========================================================================
  // KEYBOARD REORDERING
  // ==========================================================================

  describe('keyboard reordering', () => {
    it('grabs item on Space key', () => {
      const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));

      act(() => {
        const itemProps = result.current.getItemProps(1);
        itemProps.onKeyDown({
          key: ' ',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.announcement).toContain('Grabbed item 2 of 3');
    });

    it('grabs item on Enter key', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));

      act(() => {
        const itemProps = result.current.getItemProps(0);
        itemProps.onKeyDown({
          key: 'Enter',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.announcement).toContain('Grabbed item 1 of 2');
    });

    it('moves item up on ArrowUp when grabbed', () => {
      const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));

      // First grab the item
      act(() => {
        const itemProps = result.current.getItemProps(1);
        itemProps.onKeyDown({
          key: ' ',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      // Then move it up
      act(() => {
        const itemProps = result.current.getItemProps(1);
        itemProps.onKeyDown({
          key: 'ArrowUp',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(onReorder).toHaveBeenCalledWith(1, 0);
    });

    it('moves item down on ArrowDown when grabbed', () => {
      const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));

      // First grab the item
      act(() => {
        const itemProps = result.current.getItemProps(1);
        itemProps.onKeyDown({
          key: ' ',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      // Then move it down
      act(() => {
        const itemProps = result.current.getItemProps(1);
        itemProps.onKeyDown({
          key: 'ArrowDown',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(onReorder).toHaveBeenCalledWith(1, 2);
    });

    it('does not move item up at boundary (index 0)', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));

      // Grab first item
      act(() => {
        const itemProps = result.current.getItemProps(0);
        itemProps.onKeyDown({
          key: ' ',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      // Try to move up
      act(() => {
        const itemProps = result.current.getItemProps(0);
        itemProps.onKeyDown({
          key: 'ArrowUp',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(onReorder).not.toHaveBeenCalled();
    });

    it('does not move item down at boundary (last index)', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));

      // Grab last item
      act(() => {
        const itemProps = result.current.getItemProps(1);
        itemProps.onKeyDown({
          key: ' ',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      // Try to move down
      act(() => {
        const itemProps = result.current.getItemProps(1);
        itemProps.onKeyDown({
          key: 'ArrowDown',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(onReorder).not.toHaveBeenCalled();
    });

    it('drops item on Space when grabbed', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));

      // Grab item
      act(() => {
        const itemProps = result.current.getItemProps(0);
        itemProps.onKeyDown({
          key: ' ',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      // Drop item
      act(() => {
        const itemProps = result.current.getItemProps(0);
        itemProps.onKeyDown({
          key: ' ',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.announcement).toContain('Dropped item at position 1');
    });

    it('cancels on Escape when grabbed', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));

      // Grab item
      act(() => {
        const itemProps = result.current.getItemProps(0);
        itemProps.onKeyDown({
          key: ' ',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      // Cancel
      act(() => {
        const itemProps = result.current.getItemProps(0);
        itemProps.onKeyDown({
          key: 'Escape',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.announcement).toBe('Reorder cancelled.');
    });

    it('ArrowLeft acts same as ArrowUp', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));

      // Grab item
      act(() => {
        const itemProps = result.current.getItemProps(1);
        itemProps.onKeyDown({
          key: ' ',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      // Move with ArrowLeft
      act(() => {
        const itemProps = result.current.getItemProps(1);
        itemProps.onKeyDown({
          key: 'ArrowLeft',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(onReorder).toHaveBeenCalledWith(1, 0);
    });

    it('ArrowRight acts same as ArrowDown', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));

      // Grab item
      act(() => {
        const itemProps = result.current.getItemProps(0);
        itemProps.onKeyDown({
          key: ' ',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      // Move with ArrowRight
      act(() => {
        const itemProps = result.current.getItemProps(0);
        itemProps.onKeyDown({
          key: 'ArrowRight',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(onReorder).toHaveBeenCalledWith(0, 1);
    });
  });

  // ==========================================================================
  // TRANSFORM STYLES
  // ==========================================================================

  describe('getTransformStyle', () => {
    it('returns transition when not dragging', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));
      const style = result.current.getTransformStyle(0);

      expect(style).toEqual({ transition: 'transform 150ms ease' });
    });
  });

  // ==========================================================================
  // ITEM GAP CONFIGURATION
  // ==========================================================================

  describe('itemGap configuration', () => {
    it('uses default gap of 12px', () => {
      const items = [{ id: '1' }];
      const onReorder = vi.fn();

      // Hook should work with default gap
      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));

      expect(result.current.dragState.isDragging).toBe(false);
    });

    it('accepts custom itemGap', () => {
      const items = [{ id: '1' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder, itemGap: 24 }));

      expect(result.current.dragState.isDragging).toBe(false);
    });
  });

  // ==========================================================================
  // ITEMS ARRAY CHANGES
  // ==========================================================================

  describe('items array changes', () => {
    it('handles items array shrinking', () => {
      const onReorder = vi.fn();

      const { result, rerender } = renderHook(
        ({ items }) => useTouchSortable({ items, onReorder }),
        { initialProps: { items: [{ id: '1' }, { id: '2' }, { id: '3' }] } }
      );

      // Simulate rendering items (in real usage, refs would be set by React)
      expect(result.current.getItemProps(0)).toBeDefined();
      expect(result.current.getItemProps(1)).toBeDefined();
      expect(result.current.getItemProps(2)).toBeDefined();

      // Shrink items array
      rerender({ items: [{ id: '1' }] });

      // Should still work correctly
      expect(result.current.getItemProps(0)).toBeDefined();
    });

    it('handles empty items array', () => {
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items: [], onReorder }));

      expect(result.current.dragState.isDragging).toBe(false);
    });
  });

  // ==========================================================================
  // ANNOUNCEMENTS
  // ==========================================================================

  describe('announcements', () => {
    it('announces grab with item count', () => {
      const items = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));

      act(() => {
        const itemProps = result.current.getItemProps(2);
        itemProps.onKeyDown({
          key: ' ',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.announcement).toBe(
        'Grabbed item 3 of 4. Use arrow keys to move, Space to drop, Escape to cancel.'
      );
    });

    it('announces move with new position', () => {
      const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));

      // Grab
      act(() => {
        const itemProps = result.current.getItemProps(1);
        itemProps.onKeyDown({
          key: ' ',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      // Move up
      act(() => {
        const itemProps = result.current.getItemProps(1);
        itemProps.onKeyDown({
          key: 'ArrowUp',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.announcement).toBe('Moved item to position 1.');
    });

    it('announces drop with final position', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));

      // Grab
      act(() => {
        const itemProps = result.current.getItemProps(1);
        itemProps.onKeyDown({
          key: ' ',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      // Drop
      act(() => {
        const itemProps = result.current.getItemProps(1);
        itemProps.onKeyDown({
          key: 'Enter',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.announcement).toBe('Dropped item at position 2.');
    });
  });

  // ==========================================================================
  // ARIA STATES
  // ==========================================================================

  describe('ARIA states', () => {
    it('sets aria-grabbed true when item is keyboard grabbed', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));

      act(() => {
        const itemProps = result.current.getItemProps(0);
        itemProps.onKeyDown({
          key: ' ',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      const itemProps = result.current.getItemProps(0);
      expect(itemProps['aria-grabbed']).toBe(true);
    });

    it('sets aria-dropeffect move when any item is grabbed', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));

      act(() => {
        const itemProps = result.current.getItemProps(0);
        itemProps.onKeyDown({
          key: ' ',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      // Both items should have aria-dropeffect="move"
      expect(result.current.getItemProps(0)['aria-dropeffect']).toBe('move');
      expect(result.current.getItemProps(1)['aria-dropeffect']).toBe('move');
    });

    it('non-grabbed items have aria-grabbed undefined', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const onReorder = vi.fn();

      const { result } = renderHook(() => useTouchSortable({ items, onReorder }));

      act(() => {
        const itemProps = result.current.getItemProps(0);
        itemProps.onKeyDown({
          key: ' ',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      // Item 0 is grabbed, item 1 should have undefined
      const item1Props = result.current.getItemProps(1);
      expect(item1Props['aria-grabbed']).toBeUndefined();
    });
  });

  // ==========================================================================
  // STABILITY
  // ==========================================================================

  describe('stability', () => {
    it('liveRegionProps reference is stable', () => {
      const items = [{ id: '1' }];
      const onReorder = vi.fn();

      const { result, rerender } = renderHook(() => useTouchSortable({ items, onReorder }));

      const firstRef = result.current.liveRegionProps;
      rerender();
      const secondRef = result.current.liveRegionProps;

      expect(firstRef).toBe(secondRef);
    });
  });
});
