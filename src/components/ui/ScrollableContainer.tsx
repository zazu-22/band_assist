import { memo, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Minimum scroll distance (in pixels) before showing fade indicators.
 * This threshold prevents flickering when content is at the edge of the
 * scrollable area with minor floating-point variations.
 */
const SCROLL_FADE_THRESHOLD_PX = 4;

// =============================================================================
// SCROLLABLE CONTAINER WITH FADE INDICATORS
// =============================================================================

export interface ScrollableContainerProps {
  children: React.ReactNode;
  /** Additional classes for the scrollable content area */
  className?: string;
  /** Gradient start color class (e.g., 'from-card', 'from-background') */
  fadeClassName?: string;
  /** Whether to show chevron indicators in the fade areas */
  showChevrons?: boolean;
  /** ARIA role for accessibility (e.g., 'region') */
  role?: string;
  /** ARIA label for screen reader context */
  'aria-label'?: string;
}

/**
 * A horizontally scrollable container with fade gradient overlays
 * that indicate when more content is available to scroll.
 *
 * Features:
 * - Touch-friendly horizontal scrolling
 * - Gradient fade indicators on left/right when content overflows
 * - Optional chevron icons in fade areas
 * - Responsive to container and content size changes
 * - Hidden scrollbar for clean appearance
 *
 * @example
 * ```tsx
 * <ScrollableContainer className="flex gap-2" fadeClassName="from-card">
 *   {tabs.map(tab => (
 *     <button key={tab}>{tab}</button>
 *   ))}
 * </ScrollableContainer>
 * ```
 */
export const ScrollableContainer = memo(function ScrollableContainer({
  children,
  className,
  fadeClassName = 'from-card',
  showChevrons = true,
  role,
  'aria-label': ariaLabel,
}: ScrollableContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  // Track if initial check has been done to avoid re-running on each render.
  // Note: This ref intentionally persists across effect re-runs. If checkScroll
  // were to change (currently stable due to empty deps), the initial check would
  // not re-run. This is acceptable since checkScroll only reads from scrollRef.
  const hasInitialized = useRef(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const hasOverflow = scrollWidth > clientWidth;

    setShowLeftFade(hasOverflow && scrollLeft > SCROLL_FADE_THRESHOLD_PX);
    setShowRightFade(hasOverflow && scrollLeft < scrollWidth - clientWidth - SCROLL_FADE_THRESHOLD_PX);
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Set up scroll listener
    const handleScroll = () => checkScroll();
    el.addEventListener('scroll', handleScroll, { passive: true });

    // Set up resize observer to detect content/container size changes.
    // The ResizeObserver callback invokes checkScroll() which updates state.
    // This is intentional: ResizeObserver fires asynchronously after layout
    // changes, similar to event handlers, and is safe to call setState from.
    const resizeObserver = new ResizeObserver(() => {
      checkScroll();
    });
    resizeObserver.observe(el);

    // Initial check after layout settles (deferred to avoid sync setState in effect body)
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      requestAnimationFrame(() => {
        checkScroll();
      });
    }

    return () => {
      el.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [checkScroll]);

  return (
    <div className="relative min-w-0 flex-1" role={role} aria-label={ariaLabel}>
      {/* Left fade indicator */}
      <div
        className={cn(
          'pointer-events-none absolute left-0 top-0 bottom-0 w-8 z-10',
          'bg-gradient-to-r to-transparent transition-opacity duration-200 will-change-[opacity]',
          fadeClassName,
          showLeftFade ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden="true"
      >
        {showChevrons && showLeftFade && (
          <ChevronLeft
            size={16}
            className="absolute left-1 top-1/2 -translate-y-1/2 text-muted-foreground opacity-70"
          />
        )}
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className={cn('overflow-x-auto scrollbar-hide touch-pan-x', className)}
      >
        {children}
      </div>

      {/* Right fade indicator */}
      <div
        className={cn(
          'pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10',
          'bg-gradient-to-l to-transparent transition-opacity duration-200 will-change-[opacity]',
          fadeClassName,
          showRightFade ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden="true"
      >
        {showChevrons && showRightFade && (
          <ChevronRight
            size={16}
            className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground opacity-70"
          />
        )}
      </div>
    </div>
  );
});

ScrollableContainer.displayName = 'ScrollableContainer';
