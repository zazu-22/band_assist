import { useState, useEffect, useCallback } from 'react';
import type { SongAnnotation, SongAnnotationInput, SongAnnotationUpdate, AnnotationType } from '../types';
import { supabaseStorageService } from '../services/supabaseStorageService';

/** Input data for creating a new annotation (simplified for hook consumers) */
export interface CreateAnnotationInput {
  barIndex: number;
  beatIndex?: number;
  trackIndex?: number;
  content: string;
  annotationType: AnnotationType;
  sectionId?: string;
  visibleDuringPlayback?: boolean;
}

/** Filter options for the annotation list */
export interface AnnotationFilters {
  types?: AnnotationType[];
  showResolved?: boolean;
  sectionId?: string;
}

interface UseAnnotationsResult {
  annotations: SongAnnotation[];
  filteredAnnotations: SongAnnotation[];
  isLoading: boolean;
  error: Error | null;
  filters: AnnotationFilters;
  setFilters: (filters: AnnotationFilters) => void;
  refetch: () => Promise<void>;
  createAnnotation: (input: CreateAnnotationInput) => Promise<SongAnnotation>;
  updateAnnotation: (annotationId: string, updates: SongAnnotationUpdate) => Promise<SongAnnotation>;
  deleteAnnotation: (annotationId: string) => Promise<void>;
  resolveAnnotation: (annotationId: string, resolved: boolean) => Promise<SongAnnotation>;
}

/**
 * Manage and provide song annotations for a specific song.
 *
 * Automatically fetches annotations when songId or bandId changes.
 * Provides CRUD operations and real-time subscription.
 *
 * @param songId - The song ID to fetch annotations for, or null if no song selected
 * @param bandId - The band ID for the current context, or null if no band selected
 * @returns An object with annotations, loading state, error, filters, and CRUD operations
 */
export function useAnnotations(
  songId: string | null,
  bandId: string | null
): UseAnnotationsResult {
  const [annotations, setAnnotations] = useState<SongAnnotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<AnnotationFilters>({
    showResolved: true,
  });

  // Load annotations
  const load = useCallback(async () => {
    if (!songId || !bandId) {
      setAnnotations([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await supabaseStorageService.getAnnotations(songId);
      setAnnotations(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load annotations'));
      setAnnotations([]);
    } finally {
      setIsLoading(false);
    }
  }, [songId, bandId]);

  // Initial load
  useEffect(() => {
    load();
  }, [load]);

  // Real-time subscription
  useEffect(() => {
    if (!songId || !bandId) return;

    const unsubscribe = supabaseStorageService.subscribeToAnnotations(
      songId,
      bandId,
      {
        onInsert: (annotation) => {
          setAnnotations(prev => {
            // Avoid duplicates (in case we created it locally)
            if (prev.some(a => a.id === annotation.id)) {
              return prev;
            }
            // Insert in sorted order by bar/beat
            const newAnnotations = [...prev, annotation];
            return newAnnotations.sort((a, b) => {
              if (a.barIndex !== b.barIndex) return a.barIndex - b.barIndex;
              return a.beatIndex - b.beatIndex;
            });
          });
        },
        onUpdate: (annotation) => {
          setAnnotations(prev =>
            prev.map(a => a.id === annotation.id ? annotation : a)
          );
        },
        onDelete: (id) => {
          setAnnotations(prev => prev.filter(a => a.id !== id));
        },
      }
    );

    return () => unsubscribe();
  }, [songId, bandId]);

  // Filter annotations based on current filters
  const filteredAnnotations = annotations.filter(annotation => {
    // Filter by type
    if (filters.types && filters.types.length > 0) {
      if (!filters.types.includes(annotation.annotationType)) {
        return false;
      }
    }

    // Filter by resolved status
    if (!filters.showResolved && annotation.isResolved) {
      return false;
    }

    // Filter by section
    if (filters.sectionId && annotation.sectionId !== filters.sectionId) {
      return false;
    }

    return true;
  });

  const createAnnotation = useCallback(
    async (input: CreateAnnotationInput): Promise<SongAnnotation> => {
      if (!songId || !bandId) {
        throw new Error('Song and band must be selected to create an annotation');
      }

      const fullInput: SongAnnotationInput = {
        songId,
        bandId,
        barIndex: input.barIndex,
        beatIndex: input.beatIndex ?? 0,
        trackIndex: input.trackIndex ?? 0,
        content: input.content,
        annotationType: input.annotationType,
        sectionId: input.sectionId,
        visibleDuringPlayback: input.visibleDuringPlayback ?? true,
      };

      const annotation = await supabaseStorageService.createAnnotation(fullInput);

      // Optimistically add to local state (real-time will confirm)
      setAnnotations(prev => {
        const newAnnotations = [...prev, annotation];
        return newAnnotations.sort((a, b) => {
          if (a.barIndex !== b.barIndex) return a.barIndex - b.barIndex;
          return a.beatIndex - b.beatIndex;
        });
      });

      return annotation;
    },
    [songId, bandId]
  );

  const updateAnnotation = useCallback(
    async (annotationId: string, updates: SongAnnotationUpdate): Promise<SongAnnotation> => {
      if (!songId || !bandId) {
        throw new Error('Song and band must be selected to update an annotation');
      }

      const updated = await supabaseStorageService.updateAnnotation(annotationId, updates);

      // Optimistically update local state (real-time will confirm)
      setAnnotations(prev =>
        prev.map(a => a.id === annotationId ? updated : a)
      );

      return updated;
    },
    [songId, bandId]
  );

  const deleteAnnotation = useCallback(
    async (annotationId: string): Promise<void> => {
      if (!songId || !bandId) {
        throw new Error('Song and band must be selected to delete an annotation');
      }

      await supabaseStorageService.deleteAnnotation(annotationId);

      // Optimistically remove from local state (real-time will confirm)
      setAnnotations(prev => prev.filter(a => a.id !== annotationId));
    },
    [songId, bandId]
  );

  const resolveAnnotation = useCallback(
    async (annotationId: string, resolved: boolean): Promise<SongAnnotation> => {
      return updateAnnotation(annotationId, { isResolved: resolved });
    },
    [updateAnnotation]
  );

  return {
    annotations,
    filteredAnnotations,
    isLoading,
    error,
    filters,
    setFilters,
    refetch: load,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    resolveAnnotation,
  };
}
