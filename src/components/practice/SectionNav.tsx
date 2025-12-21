import React, { memo, useMemo, useCallback, useRef } from 'react';
import type { SongSection } from '@/types';
import { Button } from '@/components/primitives/button';
import { ScrollableContainer } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface SectionNavProps {
  sections: SongSection[];
  /** Current bar position in the song (1-indexed) */
  currentBar?: number;
  /** Total number of bars in the song (reserved for future bar indicator) */
  totalBars: number;
  /** Called when user clicks a section to navigate to it */
  onSectionClick: (section: SongSection) => void;
  /** Optional className for the container */
  className?: string;
}

// Note: totalBars is passed but not currently used - reserved for future
// visual indicator showing bar position within section

/**
 * Section navigation pills for the Practice Room.
 * Shows section buttons above the chart area with current section highlighted.
 *
 * Keyboard shortcuts (when focused):
 * - 1-9: Jump directly to section 1-9
 * - ArrowLeft: Navigate to previous section
 * - ArrowRight: Navigate to next section
 */
export const SectionNav: React.FC<SectionNavProps> = memo(function SectionNav({
  sections,
  currentBar,
  totalBars: _totalBars, // Reserved for future bar indicator
  onSectionClick,
  className,
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine current section based on bar position
  const currentSectionId = useMemo(() => {
    if (!currentBar || sections.length === 0) return null;

    // Find section that contains current bar
    const current = sections.find(
      s => currentBar >= s.startBar && currentBar <= s.endBar
    );
    return current?.id ?? null;
  }, [currentBar, sections]);

  // Find current section index for arrow key navigation
  const currentSectionIndex = useMemo(() => {
    if (!currentSectionId || sections.length === 0) return -1;
    return sections.findIndex(s => s.id === currentSectionId);
  }, [currentSectionId, sections]);

  // Keyboard event handler for section navigation shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Check if an input field has focus - if so, ignore shortcuts
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement
      ) {
        return;
      }

      // Number keys 1-9 jump to sections
      if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key, 10) - 1;
        if (index < sections.length) {
          e.preventDefault();
          e.stopPropagation(); // Prevent AlphaTab from capturing
          onSectionClick(sections[index]);
        }
        return;
      }

      // Arrow keys navigate relative to current section
      if (e.key === 'ArrowLeft' && currentSectionIndex > 0) {
        e.preventDefault();
        e.stopPropagation();
        onSectionClick(sections[currentSectionIndex - 1]);
        return;
      }

      if (e.key === 'ArrowRight' && currentSectionIndex < sections.length - 1) {
        e.preventDefault();
        e.stopPropagation();
        onSectionClick(sections[currentSectionIndex + 1]);
        return;
      }
    },
    [sections, currentSectionIndex, onSectionClick]
  );

  if (sections.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn('border-b border-border bg-card/50', className)}
      tabIndex={0} // Make focusable for keyboard events
      onKeyDown={handleKeyDown}
      role="navigation"
      aria-label="Section navigation. Press 1-9 to jump to sections, arrow keys to navigate."
    >
      <ScrollableContainer fadeClassName="from-card/50">
        <div className="flex items-center gap-1.5 px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mr-2 shrink-0">
            Sections
          </span>
          {sections.map((section, index) => {
            const isCurrent = section.id === currentSectionId;
            // Show number key hint for sections 1-9
            const keyHint = index < 9 ? ` [${index + 1}]` : '';

            return (
              <Button
                key={section.id}
                variant={isCurrent ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onSectionClick(section)}
                className={cn(
                  'h-7 px-3 text-xs font-medium whitespace-nowrap transition-all',
                  isCurrent
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
                title={`${section.name} (bars ${section.startBar}-${section.endBar})${keyHint}`}
              >
                {section.name}
              </Button>
            );
          })}
        </div>
      </ScrollableContainer>
    </div>
  );
});

SectionNav.displayName = 'SectionNav';

/**
 * Calculate seek percentage for AlphaTab from a section
 *
 * @param section - The section to navigate to
 * @param totalBars - Total number of bars in the song
 * @returns Percentage (0-1) for AlphaTab seekTo()
 */
export function calculateSectionSeekPercentage(
  section: SongSection,
  totalBars: number
): number {
  if (totalBars <= 0) return 0;

  // Bar-based calculation: percentage = (startBar - 1) / totalBars
  // Subtract 1 because bars are 1-indexed but percentage is 0-indexed
  const percentage = (section.startBar - 1) / totalBars;

  // Clamp to valid range
  return Math.max(0, Math.min(1, percentage));
}
