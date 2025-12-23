import React, { useState, useCallback, memo } from 'react';
import {
  StickyNote,
  Lightbulb,
  AlertTriangle,
  HelpCircle,
  Filter,
  Plus,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/primitives/button';
import { Checkbox } from '@/components/primitives/checkbox';
import { Label } from '@/components/primitives/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/primitives/collapsible';
import type { SongAnnotation, AnnotationType, SongSection } from '@/types';
import { AnnotationMarker } from './AnnotationMarker';
import { AnnotationBubble } from './AnnotationBubble';
import { cn } from '@/lib/utils';

/** Filter options for the panel */
export interface PanelFilters {
  types: AnnotationType[];
  showResolved: boolean;
}

interface AnnotationPanelProps {
  annotations: SongAnnotation[];
  sections?: SongSection[];
  currentUserId?: string;
  filters: PanelFilters;
  onFiltersChange: (filters: PanelFilters) => void;
  onCreateNew?: (barIndex?: number) => void;
  onEdit?: (annotation: SongAnnotation) => void;
  onDelete?: (annotationId: string) => void;
  onToggleResolve?: (annotationId: string, resolved: boolean) => void;
  onAnnotationClick?: (annotation: SongAnnotation) => void;
  isLoading?: boolean;
  className?: string;
}

const TYPE_OPTIONS: { type: AnnotationType; label: string; Icon: React.ElementType }[] = [
  { type: 'note', label: 'Notes', Icon: StickyNote },
  { type: 'cue', label: 'Cues', Icon: Lightbulb },
  { type: 'warning', label: 'Warnings', Icon: AlertTriangle },
  { type: 'question', label: 'Questions', Icon: HelpCircle },
];

/**
 * Sidebar panel that lists all annotations for a song.
 * Provides filtering by type and resolved status.
 */
export const AnnotationPanel = memo(function AnnotationPanel({
  annotations,
  sections = [],
  currentUserId,
  filters,
  onFiltersChange,
  onCreateNew,
  onEdit,
  onDelete,
  onToggleResolve,
  onAnnotationClick,
  isLoading = false,
  className,
}: AnnotationPanelProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [togglingResolveId, setTogglingResolveId] = useState<string | null>(null);

  // Get section name by ID
  const getSectionName = useCallback((sectionId?: string) => {
    if (!sectionId) return undefined;
    return sections.find(s => s.id === sectionId)?.name;
  }, [sections]);

  // Filter annotations
  const filteredAnnotations = annotations.filter(annotation => {
    // Filter by type (if types array is empty, show all)
    if (filters.types.length > 0 && !filters.types.includes(annotation.annotationType)) {
      return false;
    }
    // Filter by resolved status
    if (!filters.showResolved && annotation.isResolved) {
      return false;
    }
    return true;
  });

  // Group by bar for better organization
  const groupedByBar = filteredAnnotations.reduce<Record<number, SongAnnotation[]>>((acc, annotation) => {
    const bar = annotation.barIndex;
    if (!acc[bar]) acc[bar] = [];
    acc[bar].push(annotation);
    return acc;
  }, {});

  const handleToggleType = (type: AnnotationType) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types: newTypes });
  };

  const handleToggleResolve = async (annotationId: string, currentResolved: boolean) => {
    if (!onToggleResolve) return;
    setTogglingResolveId(annotationId);
    try {
      await onToggleResolve(annotationId, !currentResolved);
    } finally {
      setTogglingResolveId(null);
    }
  };

  // Count annotations by type for filter badges
  const typeCounts = annotations.reduce<Record<AnnotationType, number>>((acc, a) => {
    acc[a.annotationType] = (acc[a.annotationType] || 0) + 1;
    return acc;
  }, { note: 0, cue: 0, warning: 0, question: 0 });

  const unresolvedQuestions = annotations.filter(a => a.annotationType === 'question' && !a.isResolved).length;

  return (
    <div className={cn('flex flex-col h-full bg-card border border-border rounded-xl', className)}>
      {/* Header */}
      <div className="p-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <StickyNote size={18} />
            Annotations
            <span className="text-xs text-muted-foreground font-normal">
              ({filteredAnnotations.length})
            </span>
          </h3>
          {onCreateNew && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCreateNew()}
              className="gap-1"
            >
              <Plus size={14} />
              Add
            </Button>
          )}
        </div>

        {/* Quick stats */}
        {unresolvedQuestions > 0 && (
          <div className="text-xs text-green-600 dark:text-green-400 mb-2">
            {unresolvedQuestions} unresolved question{unresolvedQuestions !== 1 ? 's' : ''}
          </div>
        )}

        {/* Filters toggle */}
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-1">
                <Filter size={14} />
                Filters
                {(filters.types.length > 0 || !filters.showResolved) && (
                  <span className="text-xs text-primary ml-1">
                    (active)
                  </span>
                )}
              </span>
              {isFiltersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3">
            {/* Type filters */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase">Types</Label>
              <div className="flex flex-wrap gap-2">
                {TYPE_OPTIONS.map(({ type, label, Icon }) => (
                  <button
                    key={type}
                    onClick={() => handleToggleType(type)}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors',
                      'border',
                      filters.types.length === 0 || filters.types.includes(type)
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-muted border-muted-foreground/20 text-muted-foreground'
                    )}
                  >
                    <Icon size={12} />
                    {label}
                    <span className="opacity-60">({typeCounts[type]})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Resolved filter */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-resolved"
                checked={filters.showResolved}
                onCheckedChange={(checked: boolean | 'indeterminate') =>
                  onFiltersChange({ ...filters, showResolved: checked === true })
                }
              />
              <Label htmlFor="show-resolved" className="text-sm cursor-pointer flex items-center gap-1">
                {filters.showResolved ? <Eye size={14} /> : <EyeOff size={14} />}
                Show resolved
              </Label>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Annotation List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filteredAnnotations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <StickyNote size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No annotations found</p>
            {onCreateNew && (
              <Button
                variant="link"
                size="sm"
                onClick={() => onCreateNew()}
                className="mt-2"
              >
                Create one
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedByBar)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([barIndex, barAnnotations]) => (
                <div key={barIndex}>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 px-2">
                    Bar {Number(barIndex) + 1}
                  </div>
                  <div className="space-y-2">
                    {barAnnotations.map(annotation => {
                      const isExpanded = expandedId === annotation.id;
                      const isAuthor = currentUserId === annotation.authorId;

                      return (
                        <div key={annotation.id}>
                          {/* Collapsed view */}
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedId(isExpanded ? null : annotation.id);
                              onAnnotationClick?.(annotation);
                            }}
                            className={cn(
                              'w-full text-left p-2 rounded-lg transition-colors',
                              'hover:bg-muted/50',
                              'flex items-start gap-2',
                              isExpanded && 'bg-muted/30'
                            )}
                          >
                            <AnnotationMarker
                              type={annotation.annotationType}
                              isResolved={annotation.isResolved}
                              size="sm"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                'text-sm truncate',
                                annotation.isResolved && 'text-muted-foreground'
                              )}>
                                {annotation.content}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Beat {annotation.beatIndex + 1}
                                {getSectionName(annotation.sectionId) && (
                                  <> | {getSectionName(annotation.sectionId)}</>
                                )}
                              </p>
                            </div>
                          </button>

                          {/* Expanded view */}
                          {isExpanded && (
                            <div className="mt-2 ml-2">
                              <AnnotationBubble
                                annotation={annotation}
                                isAuthor={isAuthor}
                                sectionName={getSectionName(annotation.sectionId)}
                                authorName={annotation.authorName}
                                onEdit={isAuthor && onEdit ? () => onEdit(annotation) : undefined}
                                onDelete={isAuthor && onDelete ? () => onDelete(annotation.id) : undefined}
                                onToggleResolve={
                                  annotation.annotationType === 'question' && onToggleResolve
                                    ? () => handleToggleResolve(annotation.id, annotation.isResolved)
                                    : undefined
                                }
                                isTogglingResolve={togglingResolveId === annotation.id}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
});

AnnotationPanel.displayName = 'AnnotationPanel';
