import React, { memo } from 'react';
import { Edit3, Trash2, Music2, FileText } from 'lucide-react';
import type { SongSection } from '@/types';
import { Button } from '@/components/primitives/button';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  section: SongSection;
  onEdit: (section: SongSection) => void;
  onDelete: (section: SongSection) => void;
}

/**
 * Displays a single song section with its metadata.
 * Shows name, bar range, source indicator, and action buttons.
 */
export const SectionCard: React.FC<SectionCardProps> = memo(function SectionCard({
  section,
  onEdit,
  onDelete,
}) {
  const isGpMarker = section.source === 'gp_marker';

  return (
    <div
      className={cn(
        'group bg-card border border-border rounded-lg p-4',
        'hover:border-primary/50 transition-colors',
        'border-l-[3px]',
        isGpMarker ? 'border-l-info' : 'border-l-primary'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Section Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-foreground truncate">{section.name}</h4>
            {/* Source indicator */}
            <span
              className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide',
                isGpMarker
                  ? 'bg-info/10 text-info'
                  : 'bg-muted text-muted-foreground'
              )}
              title={isGpMarker ? 'Extracted from Guitar Pro file' : 'Manually created'}
            >
              {isGpMarker ? (
                <>
                  <Music2 size={10} />
                  GP
                </>
              ) : (
                <>
                  <FileText size={10} />
                  Manual
                </>
              )}
            </span>
          </div>

          {/* Bar range */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="font-mono tabular-nums">
              Bars {section.startBar}-{section.endBar}
            </span>
            <span className="text-xs">
              ({section.barCount} {section.barCount === 1 ? 'bar' : 'bars'})
            </span>
          </div>

          {/* Color indicator if present */}
          {section.color && (
            <div className="mt-2 flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full border border-border"
                style={{ backgroundColor: section.color }}
                title={`Section color: ${section.color}`}
              />
              <span className="text-xs text-muted-foreground">{section.color}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(section)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`Edit section ${section.name}`}
          >
            <Edit3 size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(section)}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            aria-label={`Delete section ${section.name}`}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
});

SectionCard.displayName = 'SectionCard';
