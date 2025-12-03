import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Gap between sortable items in pixels.
 * Must match the space-y-3 utility (0.75rem = 12px) used in the consuming component.
 * If the CSS changes, this value must be updated accordingly.
 */
const ITEM_GAP_PX = 12;

// =============================================================================
// TYPES
// =============================================================================

interface DragState {
  isDragging: boolean;
  draggedIndex: number | null;
  targetIndex: number | null;
  currentY: number;
  startY: number;
}

interface UseTouchSortableOptions<T> {
  items: T[];
  onReorder: (fromIndex: number, toIndex: number) => void;
}

interface ItemProps {
  ref: (el: HTMLElement | null) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  tabIndex: number;
  role: string;
  'aria-grabbed': boolean | undefined;
  'aria-dropeffect': 'move' | 'none';
}

interface DragHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  'aria-label': string;
}

interface UseTouchSortableReturn {
  dragState: DragState;
  getItemProps: (index: number) => ItemProps;
  getDragHandleProps: (index: number) => DragHandleProps;
  getTransformStyle: (index: number) => React.CSSProperties;
  liveRegionProps: {
    role: 'status';
    'aria-live': 'polite';
    'aria-atomic': true;
    className: string;
  };
  announcement: string;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * useTouchSortable - Touch/mouse/keyboard-enabled list reordering
 *
 * Provides drag and drop functionality that works across:
 * - Touch devices (iOS Safari, Chrome Android)
 * - Mouse (desktop browsers)
 * - Keyboard (accessibility)
 *
 * Follows the touch handling pattern from ResizablePanel.tsx
 */
export function useTouchSortable<T>({
  items,
  onReorder,
}: UseTouchSortableOptions<T>): UseTouchSortableReturn {
  // === State ===
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedIndex: null,
    targetIndex: null,
    currentY: 0,
    startY: 0,
  });

  const [announcement, setAnnouncement] = useState('');

  // Track keyboard grab state separately (for grab-then-move pattern)
  const [keyboardGrabbed, setKeyboardGrabbed] = useState<number | null>(null);

  // === Refs ===
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());
  const itemRectsRef = useRef<DOMRect[]>([]);
  const dragStateRef = useRef(dragState);

  // Sync state to ref for event handlers (avoids stale closures)
  useEffect(() => {
    dragStateRef.current = dragState;
  });

  // === Helper: Calculate target index from Y position ===
  const calculateTargetIndex = useCallback((clientY: number): number => {
    const rects = itemRectsRef.current;
    const { draggedIndex } = dragStateRef.current;

    if (rects.length === 0 || draggedIndex === null) return 0;

    // Find the item whose midpoint the cursor is above
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      const midpoint = rect.top + rect.height / 2;

      if (clientY < midpoint) {
        return i;
      }
    }

    return rects.length - 1;
  }, []);

  // === Core drag handlers ===

  const handleDragStart = useCallback(
    (index: number, clientY: number) => {
      // Capture all item positions at start of drag
      const rects: DOMRect[] = [];
      for (let i = 0; i < items.length; i++) {
        const el = itemRefs.current.get(i);
        if (el) {
          rects.push(el.getBoundingClientRect());
        }
      }
      itemRectsRef.current = rects;

      setDragState({
        isDragging: true,
        draggedIndex: index,
        targetIndex: index,
        currentY: clientY,
        startY: clientY,
      });

      setAnnouncement(
        `Grabbed item ${index + 1} of ${items.length}. Use arrow keys to move, Space to drop, Escape to cancel.`
      );
    },
    [items.length]
  );

  const handleDragMove = useCallback(
    (clientY: number) => {
      const { isDragging, draggedIndex } = dragStateRef.current;
      if (!isDragging || draggedIndex === null) return;

      const newTargetIndex = calculateTargetIndex(clientY);

      setDragState(prev => ({
        ...prev,
        currentY: clientY,
        targetIndex: newTargetIndex,
      }));
    },
    [calculateTargetIndex]
  );

  const handleDragEnd = useCallback(() => {
    const { draggedIndex, targetIndex } = dragStateRef.current;

    if (draggedIndex !== null && targetIndex !== null && draggedIndex !== targetIndex) {
      onReorder(draggedIndex, targetIndex);
      setAnnouncement(`Dropped item at position ${targetIndex + 1}.`);
    } else {
      setAnnouncement('Reorder cancelled.');
    }

    setDragState({
      isDragging: false,
      draggedIndex: null,
      targetIndex: null,
      currentY: 0,
      startY: 0,
    });
  }, [onReorder]);

  const handleDragCancel = useCallback(() => {
    setAnnouncement('Reorder cancelled.');
    setDragState({
      isDragging: false,
      draggedIndex: null,
      targetIndex: null,
      currentY: 0,
      startY: 0,
    });
  }, []);

  // === Mouse event handlers ===

  const handleMouseDown = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.preventDefault();
      handleDragStart(index, e.clientY);
    },
    [handleDragStart]
  );

  // === Touch event handlers ===

  const handleTouchStart = useCallback(
    (index: number, e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        // Don't preventDefault here - let the browser decide if it's a scroll
        handleDragStart(index, e.touches[0].clientY);
      }
    },
    [handleDragStart]
  );

  // === Keyboard handlers ===

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      // If we're in keyboard grab mode for this item
      if (keyboardGrabbed === index) {
        switch (e.key) {
          case 'ArrowUp':
          case 'ArrowLeft':
            e.preventDefault();
            if (index > 0) {
              onReorder(index, index - 1);
              setKeyboardGrabbed(index - 1);
              setAnnouncement(`Moved item to position ${index}.`);
            }
            break;

          case 'ArrowDown':
          case 'ArrowRight':
            e.preventDefault();
            if (index < items.length - 1) {
              onReorder(index, index + 1);
              setKeyboardGrabbed(index + 1);
              setAnnouncement(`Moved item to position ${index + 2}.`);
            }
            break;

          case ' ':
          case 'Enter':
            e.preventDefault();
            setKeyboardGrabbed(null);
            setAnnouncement(`Dropped item at position ${index + 1}.`);
            break;

          case 'Escape':
            e.preventDefault();
            setKeyboardGrabbed(null);
            setAnnouncement('Reorder cancelled.');
            break;
        }
      } else {
        // Not grabbed - Space/Enter grabs the item
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          setKeyboardGrabbed(index);
          setAnnouncement(
            `Grabbed item ${index + 1} of ${items.length}. Use arrow keys to move, Space to drop, Escape to cancel.`
          );
        }
      }
    },
    [keyboardGrabbed, items.length, onReorder]
  );

  // === Global event listeners (active only while dragging) ===

  useEffect(() => {
    if (!dragState.isDragging) return;

    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientY);
    const onMouseUp = () => handleDragEnd();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleDragMove(e.touches[0].clientY);
      }
    };
    const onTouchEnd = () => handleDragEnd();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDragCancel();
      }
    };

    // Register global listeners
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);
    document.addEventListener('keydown', onKeyDown);

    // Visual feedback during drag
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
      document.removeEventListener('keydown', onKeyDown);

      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, [dragState.isDragging, handleDragMove, handleDragEnd, handleDragCancel]);

  // === Return value builders ===

  const getItemProps = useCallback(
    (index: number): ItemProps => ({
      ref: (el: HTMLElement | null) => {
        if (el) {
          itemRefs.current.set(index, el);
        } else {
          itemRefs.current.delete(index);
        }
      },
      onKeyDown: (e: React.KeyboardEvent) => handleKeyDown(index, e),
      tabIndex: 0,
      role: 'listitem',
      'aria-grabbed':
        dragState.isDragging && dragState.draggedIndex === index
          ? true
          : keyboardGrabbed === index
            ? true
            : undefined,
      'aria-dropeffect': dragState.isDragging || keyboardGrabbed !== null ? 'move' : 'none',
    }),
    [handleKeyDown, dragState.isDragging, dragState.draggedIndex, keyboardGrabbed]
  );

  const getDragHandleProps = useCallback(
    (index: number): DragHandleProps => ({
      onMouseDown: (e: React.MouseEvent) => handleMouseDown(index, e),
      onTouchStart: (e: React.TouchEvent) => handleTouchStart(index, e),
      'aria-label': 'Drag to reorder',
    }),
    [handleMouseDown, handleTouchStart]
  );

  const getTransformStyle = useCallback(
    (index: number): React.CSSProperties => {
      const { isDragging, draggedIndex, targetIndex, currentY, startY } = dragState;

      if (!isDragging || draggedIndex === null || targetIndex === null) {
        return { transition: 'transform 150ms ease' };
      }

      // Get item height for shift calculations
      const itemHeight = itemRectsRef.current[0]?.height ?? 60;
      const shiftAmount = itemHeight + ITEM_GAP_PX;

      // Dragged item follows cursor
      if (index === draggedIndex) {
        return {
          transform: `translateY(${currentY - startY}px)`,
          zIndex: 100,
          position: 'relative',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          opacity: 0.95,
          pointerEvents: 'none',
          transition: 'box-shadow 150ms ease, opacity 150ms ease',
        };
      }

      // Other items shift to make room
      // If dragging down: items between old and new position shift up
      if (draggedIndex < targetIndex && index > draggedIndex && index <= targetIndex) {
        return {
          transform: `translateY(-${shiftAmount}px)`,
          transition: 'transform 150ms ease',
        };
      }

      // If dragging up: items between new and old position shift down
      if (draggedIndex > targetIndex && index >= targetIndex && index < draggedIndex) {
        return {
          transform: `translateY(${shiftAmount}px)`,
          transition: 'transform 150ms ease',
        };
      }

      return { transition: 'transform 150ms ease' };
    },
    [dragState]
  );

  const liveRegionProps = useMemo(
    () =>
      ({
        role: 'status',
        'aria-live': 'polite',
        'aria-atomic': true,
        className: 'sr-only',
      }) as const,
    []
  );

  return {
    dragState,
    getItemProps,
    getDragHandleProps,
    getTransformStyle,
    liveRegionProps,
    announcement,
  };
}
