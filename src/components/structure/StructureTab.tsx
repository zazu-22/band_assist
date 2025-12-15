import React, { useState, useCallback, useMemo, memo } from 'react';
import type { Song, SongSection } from '@/types';
import { useSongSections } from '@/hooks/useSongSections';
import { useAppActions } from '@/contexts';
import { SectionList } from './SectionList';
import { SectionForm, type SectionFormData } from './SectionForm';
import { ConfirmDialog, toast } from '@/components/ui';
import { Button } from '@/components/primitives/button';
import { Card, CardContent, CardHeader } from '@/components/primitives/card';
import { Plus, RefreshCw, Layers } from 'lucide-react';
import { extractSectionsFromScore, scoreHasSectionMarkers, type AlphaTabScore } from '@/lib/sectionExtractor';

interface StructureTabProps {
  song: Song;
  /** Optional callback when sections change (for parent component sync) */
  onSectionsChange?: (sections: SongSection[]) => void;
  /** Optional AlphaTab score for section extraction */
  alphaTabScore?: AlphaTabScore | null;
}

/**
 * Main container for the STRUCTURE tab in SongDetail.
 * Provides section CRUD operations and GP extraction functionality.
 */
export const StructureTab: React.FC<StructureTabProps> = memo(function StructureTab({
  song,
  onSectionsChange,
  alphaTabScore,
}) {
  const { currentBandId } = useAppActions();

  // Section data and operations
  const {
    sections,
    isLoading,
    error,
    createSection,
    updateSection,
    deleteSection,
    upsertSections,
    // deleteAllSections - available but not currently exposed in UI
    refetch,
  } = useSongSections(song.id, currentBandId);

  // Form dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SongSection | null>(null);

  // Confirm dialogs
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    section: SongSection | null;
  }>({ isOpen: false, section: null });

  const [extractConfirm, setExtractConfirm] = useState<{
    isOpen: boolean;
    hasManualSections: boolean;
  }>({ isOpen: false, hasManualSections: false });

  // Check if song has any GP charts
  const hasGpChart = useMemo(
    () => song.charts.some(c => c.type === 'GP'),
    [song.charts]
  );

  // Check if score has section markers
  const canExtractSections = useMemo(() => {
    return alphaTabScore ? scoreHasSectionMarkers(alphaTabScore) : false;
  }, [alphaTabScore]);

  // Check if there are manual sections
  const hasManualSections = useMemo(
    () => sections.some(s => s.source === 'manual'),
    [sections]
  );

  // Notify parent when sections change
  React.useEffect(() => {
    if (onSectionsChange) {
      onSectionsChange(sections);
    }
  }, [sections, onSectionsChange]);

  // --- Handlers ---

  const handleAddSection = useCallback(() => {
    setEditingSection(null);
    setIsFormOpen(true);
  }, []);

  const handleEditSection = useCallback((section: SongSection) => {
    setEditingSection(section);
    setIsFormOpen(true);
  }, []);

  const handleDeleteSection = useCallback((section: SongSection) => {
    setDeleteConfirm({ isOpen: true, section });
  }, []);

  const handleFormClose = useCallback(() => {
    setIsFormOpen(false);
    setEditingSection(null);
  }, []);

  const handleFormSubmit = useCallback(
    async (data: SectionFormData) => {
      if (editingSection) {
        await updateSection(editingSection.id, data);
        toast.success('Section updated');
      } else {
        await createSection(data);
        toast.success('Section created');
      }
    },
    [editingSection, updateSection, createSection]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirm.section) return;

    try {
      await deleteSection(deleteConfirm.section.id);
      toast.success('Section deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete section');
    } finally {
      setDeleteConfirm({ isOpen: false, section: null });
    }
  }, [deleteConfirm.section, deleteSection]);

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirm({ isOpen: false, section: null });
  }, []);

  const performExtraction = useCallback(async () => {
    if (!alphaTabScore || !currentBandId) {
      toast.error('Cannot extract sections: no score available');
      return;
    }

    try {
      const extractedSections = extractSectionsFromScore(
        alphaTabScore,
        song.id,
        currentBandId
      );

      if (extractedSections.length === 0) {
        toast.info('No section markers found in the Guitar Pro file');
        return;
      }

      await upsertSections(extractedSections);
      toast.success(`Extracted ${extractedSections.length} sections from GP file`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to extract sections');
    }
  }, [alphaTabScore, currentBandId, song.id, upsertSections]);

  const handleExtractFromGp = useCallback(() => {
    if (hasManualSections) {
      setExtractConfirm({ isOpen: true, hasManualSections: true });
    } else {
      // No manual sections, proceed directly
      void performExtraction();
    }
  }, [hasManualSections, performExtraction]);

  const handleConfirmExtract = useCallback(async () => {
    setExtractConfirm({ isOpen: false, hasManualSections: false });
    await performExtraction();
  }, [performExtraction]);

  const handleCancelExtract = useCallback(() => {
    setExtractConfirm({ isOpen: false, hasManualSections: false });
  }, []);

  // --- Render ---

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-destructive mb-4">{error.message}</p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw size={16} className="mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-primary" />
              <h3 className="text-lg font-serif text-foreground">Song Structure</h3>
            </div>
            <div className="flex items-center gap-2">
              {hasGpChart && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExtractFromGp}
                  disabled={!canExtractSections && !alphaTabScore}
                  title={
                    alphaTabScore
                      ? canExtractSections
                        ? 'Extract sections from Guitar Pro markers'
                        : 'No section markers found in GP file'
                      : 'Load a GP chart to extract sections'
                  }
                >
                  <RefreshCw size={14} className="mr-1" />
                  Extract from GP
                </Button>
              )}
              <Button size="sm" onClick={handleAddSection}>
                <Plus size={14} className="mr-1" />
                Add Section
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SectionList
            sections={sections}
            isLoading={isLoading}
            onEdit={handleEditSection}
            onDelete={handleDeleteSection}
            hasGpChart={hasGpChart}
          />
        </CardContent>
      </Card>

      {/* Section counts summary */}
      {sections.length > 0 && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground px-1">
          <span>
            {sections.length} {sections.length === 1 ? 'section' : 'sections'}
          </span>
          <span className="text-border">|</span>
          <span>
            {sections.filter(s => s.source === 'gp_marker').length} from GP
          </span>
          <span className="text-border">|</span>
          <span>
            {sections.filter(s => s.source === 'manual').length} manual
          </span>
        </div>
      )}

      {/* Section Form Dialog */}
      <SectionForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        section={editingSection}
        existingSections={sections}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Section"
        message={`Are you sure you want to delete "${deleteConfirm.section?.name}"? This action cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      {/* Extract Confirmation Dialog (when manual sections exist) */}
      <ConfirmDialog
        isOpen={extractConfirm.isOpen}
        title="Re-extract Sections"
        message={`This will replace all ${sections.filter(s => s.source === 'gp_marker').length} GP-extracted sections. Your ${sections.filter(s => s.source === 'manual').length} manually created sections will be preserved. Continue?`}
        variant="warning"
        confirmLabel="Extract"
        cancelLabel="Cancel"
        onConfirm={handleConfirmExtract}
        onCancel={handleCancelExtract}
      />
    </div>
  );
});

StructureTab.displayName = 'StructureTab';
