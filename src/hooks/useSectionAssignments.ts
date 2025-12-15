import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabaseStorageService } from '@/services/supabaseStorageService';
import type { SectionAssignment, SectionAssignmentInput, AssignmentStatusSummary } from '@/types';

interface UseSectionAssignmentsResult {
  /** All assignments for the song, keyed by section ID */
  assignmentsBySection: Map<string, SectionAssignment[]>;
  /** All assignments as a flat array */
  allAssignments: SectionAssignment[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Create a new assignment */
  createAssignment: (input: SectionAssignmentInput) => Promise<SectionAssignment>;
  /** Update an existing assignment */
  updateAssignment: (id: string, updates: Partial<Omit<SectionAssignmentInput, 'sectionId' | 'bandId'>>) => Promise<SectionAssignment>;
  /** Delete an assignment */
  deleteAssignment: (id: string) => Promise<void>;
  /** Get assignments for a specific section */
  getAssignmentsForSection: (sectionId: string) => SectionAssignment[];
  /** Get status summary for a section (for SectionCard header display) */
  getStatusSummary: (sectionId: string) => AssignmentStatusSummary;
  /** Get current user's assignment for a section (if any) */
  getUserAssignmentForSection: (sectionId: string, userId: string, members: Array<{ id: string; userId?: string | null }>) => SectionAssignment | undefined;
  /** Refetch all assignments */
  refetch: () => Promise<void>;
}

/**
 * Manages section assignment state for a given song and band, exposing CRUD operations, derived views, and helpers.
 *
 * @param songId - The song ID whose section assignments should be loaded; when `undefined`, assignments are cleared.
 * @param bandId - The band ID used to validate loading; when `null`, assignments are cleared.
 * @returns An object containing:
 *  - `assignmentsBySection`: a Map of sectionId -> SectionAssignment[] grouped by section,
 *  - `allAssignments`: flat list of all SectionAssignment objects,
 *  - `isLoading`: loading state flag,
 *  - `error`: any loading error or `null`,
 *  - `createAssignment`, `updateAssignment`, `deleteAssignment`: async functions to mutate assignments,
 *  - `getAssignmentsForSection`: returns assignments for a specific section,
 *  - `getStatusSummary`: returns counts of `playing`, `resting`, `optional`, and `total` for a section,
 *  - `getUserAssignmentForSection`: finds a user's assignment in a section based on member linkage,
 *  - `refetch`: function to reload assignments.
 */
export function useSectionAssignments(songId: string | undefined, bandId: string | null): UseSectionAssignmentsResult {
  const [allAssignments, setAllAssignments] = useState<SectionAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Group assignments by section ID
  const assignmentsBySection = useMemo(() => {
    const map = new Map<string, SectionAssignment[]>();
    allAssignments.forEach(assignment => {
      const existing = map.get(assignment.sectionId) || [];
      map.set(assignment.sectionId, [...existing, assignment]);
    });
    return map;
  }, [allAssignments]);

  const fetchAssignments = useCallback(async () => {
    if (!songId || !bandId) {
      setAllAssignments([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const assignments = await supabaseStorageService.getSongSectionAssignments(songId);
      setAllAssignments(assignments);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load assignments');
      setError(error);
      console.error('Error fetching section assignments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [songId, bandId]);

  useEffect(() => {
    void fetchAssignments();
  }, [fetchAssignments]);

  const createAssignment = useCallback(async (input: SectionAssignmentInput): Promise<SectionAssignment> => {
    const newAssignment = await supabaseStorageService.createSectionAssignment(input);
    setAllAssignments(prev => [...prev, newAssignment]);
    return newAssignment;
  }, []);

  const updateAssignment = useCallback(async (
    id: string,
    updates: Partial<Omit<SectionAssignmentInput, 'sectionId' | 'bandId'>>
  ): Promise<SectionAssignment> => {
    const updated = await supabaseStorageService.updateSectionAssignment(id, updates);
    setAllAssignments(prev => prev.map(a => a.id === id ? updated : a));
    return updated;
  }, []);

  const deleteAssignment = useCallback(async (id: string): Promise<void> => {
    await supabaseStorageService.deleteSectionAssignment(id);
    setAllAssignments(prev => prev.filter(a => a.id !== id));
  }, []);

  const getAssignmentsForSection = useCallback((sectionId: string): SectionAssignment[] => {
    return assignmentsBySection.get(sectionId) || [];
  }, [assignmentsBySection]);

  const getStatusSummary = useCallback((sectionId: string): AssignmentStatusSummary => {
    const sectionAssignments = assignmentsBySection.get(sectionId) || [];
    return {
      playing: sectionAssignments.filter(a => a.status === 'playing').length,
      resting: sectionAssignments.filter(a => a.status === 'resting').length,
      optional: sectionAssignments.filter(a => a.status === 'optional').length,
      total: sectionAssignments.length,
    };
  }, [assignmentsBySection]);

  const getUserAssignmentForSection = useCallback((
    sectionId: string,
    userId: string,
    members: Array<{ id: string; userId?: string | null }>
  ): SectionAssignment | undefined => {
    // Find the member linked to this user
    const userMember = members.find(m => m.userId === userId);
    if (!userMember) return undefined;

    const sectionAssignments = assignmentsBySection.get(sectionId) || [];
    return sectionAssignments.find(a => a.memberId === userMember.id);
  }, [assignmentsBySection]);

  return {
    assignmentsBySection,
    allAssignments,
    isLoading,
    error,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    getAssignmentsForSection,
    getStatusSummary,
    getUserAssignmentForSection,
    refetch: fetchAssignments,
  };
}