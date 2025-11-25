import React, { useRef, useState, useEffect, useCallback } from 'react';
import { GripVertical } from 'lucide-react';

interface ResizablePanelProps {
  children: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
  side?: 'left' | 'right';
  className?: string;
}

/**
 * A resizable panel component with drag handle, keyboard support, and localStorage persistence.
 * Supports both mouse and touch interactions.
 */
export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  defaultWidth = 256,
  minWidth = 180,
  maxWidth = 480,
  storageKey,
  side = 'left',
  className = '',
}) => {
  // === State ===
  const [width, setWidth] = useState(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(`sdb_panel_${storageKey}`);
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed)) {
            return Math.max(minWidth, Math.min(maxWidth, parsed));
          }
        }
      } catch {
        // localStorage may be unavailable or quota exceeded
      }
    }
    return defaultWidth;
  });

  const [isResizing, setIsResizing] = useState(false);

  // === Refs ===
  const panelRef = useRef<HTMLDivElement>(null);

  // Track initial position and width for accurate delta calculation
  const dragStartRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Use refs to avoid stale closures in event handlers
  // These refs keep current values accessible in event listeners without re-registering
  const widthRef = useRef(width);
  widthRef.current = width;

  const minWidthRef = useRef(minWidth);
  minWidthRef.current = minWidth;

  const maxWidthRef = useRef(maxWidth);
  maxWidthRef.current = maxWidth;

  const sideRef = useRef(side);
  sideRef.current = side;

  // === Event Handlers (defined before useEffect for clarity) ===

  // Start resize - works for both mouse and touch
  const handleDragStart = useCallback((clientX: number) => {
    dragStartRef.current = { startX: clientX, startWidth: widthRef.current };
    setIsResizing(true);
  }, []);

  // Handle resize movement - works for both mouse and touch
  const handleDragMove = useCallback((clientX: number) => {
    if (!dragStartRef.current) return;

    const delta =
      sideRef.current === 'left'
        ? clientX - dragStartRef.current.startX
        : dragStartRef.current.startX - clientX;

    const newWidth = dragStartRef.current.startWidth + delta;
    setWidth(Math.max(minWidthRef.current, Math.min(maxWidthRef.current, newWidth)));
  }, []);

  // End resize - persist to localStorage
  const handleDragEnd = useCallback(() => {
    setIsResizing(false);
    dragStartRef.current = null;

    if (storageKey) {
      try {
        localStorage.setItem(`sdb_panel_${storageKey}`, String(widthRef.current));
      } catch {
        // localStorage may be unavailable or quota exceeded
      }
    }
  }, [storageKey]);

  // Mouse event handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleDragStart(e.clientX);
    },
    [handleDragStart]
  );

  // Touch event handlers (for tablets/iPads)
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        handleDragStart(e.touches[0].clientX);
      }
    },
    [handleDragStart]
  );

  // === Effects ===

  // Global event listeners for drag (active only while resizing)
  useEffect(() => {
    if (!isResizing) return;

    // Mouse events
    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientX);
    const onMouseUp = () => handleDragEnd();

    // Touch events
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleDragMove(e.touches[0].clientX);
      }
    };
    const onTouchEnd = () => handleDragEnd();

    // Register listeners
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);

    // Visual feedback during resize
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    // Prevent text selection on touch devices
    document.body.style.webkitUserSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, [isResizing, handleDragMove, handleDragEnd]);

  // === Render ===

  const handlePosition = side === 'left' ? 'right-0' : 'left-0';

  return (
    <div
      ref={panelRef}
      className={`relative shrink-0 motion-reduce:transition-none ${className}`}
      style={{ width }}
    >
      {children}

      {/* Resize handle - supports both mouse and touch */}
      <div
        className={`
          absolute top-0 ${handlePosition} w-2 h-full cursor-col-resize
          hover:bg-amber-500/50 active:bg-amber-500 transition-colors group
          touch-none
          ${isResizing ? 'bg-amber-500' : 'bg-transparent'}
        `}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        aria-valuenow={width}
        aria-valuemin={minWidth}
        aria-valuemax={maxWidth}
        tabIndex={0}
        onKeyDown={e => {
          // Keyboard resize support (Arrow keys)
          const step = e.shiftKey ? 50 : 10;
          let newWidth: number | null = null;

          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            newWidth = Math.max(minWidth, widthRef.current - step);
            setWidth(newWidth);
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            newWidth = Math.min(maxWidth, widthRef.current + step);
            setWidth(newWidth);
          }

          // Persist keyboard resize to localStorage
          if (newWidth !== null && storageKey) {
            try {
              localStorage.setItem(`sdb_panel_${storageKey}`, String(newWidth));
            } catch {
              // localStorage may be unavailable or quota exceeded
            }
          }
        }}
      >
        <div
          className={`
            absolute top-1/2 -translate-y-1/2
            ${side === 'left' ? 'translate-x-1/2' : '-translate-x-1/2'}
            opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity
            bg-zinc-700 rounded p-0.5
          `}
        >
          <GripVertical size={12} className="text-zinc-400" />
        </div>
      </div>
    </div>
  );
};
