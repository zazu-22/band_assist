import { useState, useEffect, useCallback } from 'react';
import type { SongSection, SongSectionInput } from '../types';
import { supabaseStorageService } from '../services/supabaseStorageService';

/** Input data for creating a new section */
export interface CreateSectionInput {
  name: string;
  startBar: number;
  endBar: number;
  startTick?: number;
  endTick?: number;
  color?: string;
}

/** Input data for updating an existing section */
export interface UpdateSectionInput {
  name?: string;
  startBar?: number;
  endBar?: number;
  startTick?: number;
  endTick?: number;
  color?: string;
}

interface UseSongSectionsResult {
  sections: SongSection[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createSection: (input: CreateSectionInput) => Promise<SongSection>;
  updateSection: (sectionId: string, updates: UpdateSectionInput) => Promise<SongSection>;
  deleteSection: (sectionId: string) => Promise<void>;
  upsertSections: (sections: SongSectionInput[]) => Promise<SongSection[]>;
  deleteAllSections: () => Promise<void>;
}

/**
 * Manage and provide song sections for a specific song.
 *
 * Automatically fetches sections when songId or bandId changes.
 * Provides CRUD operations for section management.
 *
 * @param songId - The song ID to fetch sections for, or null if no song selected
 * @param bandId - The band ID for the current context, or null if no band selected
 * @returns An object with sections, loading state, error, and CRUD operations
 */
export function useSongSections(
  songId: string | null,
  bandId: string | null
): UseSongSectionsResult {
  const [sections, setSections] = useState<SongSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!songId || !bandId) {
      setSections([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await supabaseStorageService.getSongSections(songId);
      setSections(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load song sections'));
      setSections([]);
    } finally {
      setIsLoading(false);
    }
  }, [songId, bandId]);

  useEffect(() => {
    load();
  }, [load]);

  const createSection = useCallback(
    async (input: CreateSectionInput): Promise<SongSection> => {
      if (!songId || !bandId) {
        throw new Error('Song and band must be selected to create a section');
      }

      // Calculate display order as the next available index
      const displayOrder = sections.length;

      const sectionInput: SongSectionInput = {
        songId,
        bandId,
        name: input.name,
        displayOrder,
        startBar: input.startBar,
        endBar: input.endBar,
        startTick: input.startTick,
        endTick: input.endTick,
        source: 'manual',
        color: input.color,
      };

      const section = await supabaseStorageService.createSection(sectionInput);

      // Refetch to ensure correct ordering
      await load();

      return section;
    },
    [songId, bandId, sections.length, load]
  );

  const updateSection = useCallback(
    async (sectionId: string, updates: UpdateSectionInput): Promise<SongSection> => {
      if (!songId || !bandId) {
        throw new Error('Song and band must be selected to update a section');
      }

      const partialInput: Partial<SongSectionInput> = {};
      if (updates.name !== undefined) partialInput.name = updates.name;
      if (updates.startBar !== undefined) partialInput.startBar = updates.startBar;
      if (updates.endBar !== undefined) partialInput.endBar = updates.endBar;
      if (updates.startTick !== undefined) partialInput.startTick = updates.startTick;
      if (updates.endTick !== undefined) partialInput.endTick = updates.endTick;
      if (updates.color !== undefined) partialInput.color = updates.color;

      const updated = await supabaseStorageService.updateSection(sectionId, partialInput);

      // Refetch to ensure data consistency
      await load();

      return updated;
    },
    [songId, bandId, load]
  );

  const deleteSection = useCallback(
    async (sectionId: string): Promise<void> => {
      if (!songId || !bandId) {
        throw new Error('Song and band must be selected to delete a section');
      }

      await supabaseStorageService.deleteSection(sectionId);

      // Refetch to update the list and reorder display_order if needed
      await load();
    },
    [songId, bandId, load]
  );

  const upsertSections = useCallback(
    async (newSections: SongSectionInput[]): Promise<SongSection[]> => {
      if (!songId || !bandId) {
        throw new Error('Song and band must be selected to upsert sections');
      }

      const result = await supabaseStorageService.upsertSections(songId, bandId, newSections);

      // Refetch to get all sections including manual ones
      await load();

      return result;
    },
    [songId, bandId, load]
  );

  const deleteAllSections = useCallback(async (): Promise<void> => {
    if (!songId || !bandId) {
      throw new Error('Song and band must be selected to delete sections');
    }

    await supabaseStorageService.deleteAllSections(songId);

    // Refetch (will return empty array)
    await load();
  }, [songId, bandId, load]);

  return {
    sections,
    isLoading,
    error,
    refetch: load,
    createSection,
    updateSection,
    deleteSection,
    upsertSections,
    deleteAllSections,
  };
}
