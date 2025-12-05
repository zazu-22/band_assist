import { useState, useEffect, useCallback } from 'react';
import { BandMember } from '../types';
import { supabaseStorageService, getUnlinkedMembers } from '../services/supabaseStorageService';
import { supabase } from '../services/supabaseClient';

interface UseLinkedMemberResult {
  linkedMember: BandMember | null;
  unlinkedMembers: BandMember[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage linked member state
 *
 * Fetches the band member linked to the current user in the specified band,
 * along with all unlinked members available for claiming.
 *
 * Automatically refetches when bandId changes. Returns null/empty arrays when
 * bandId is null or user is not authenticated.
 *
 * @param bandId - Current band ID
 * @returns Linked member, unlinked members, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { linkedMember, unlinkedMembers, isLoading, error, refetch } = useLinkedMember(currentBandId);
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *
 *   return (
 *     <div>
 *       {linkedMember ? (
 *         <div>Linked to: {linkedMember.name}</div>
 *       ) : (
 *         <select>
 *           {unlinkedMembers.map(m => <option key={m.id}>{m.name}</option>)}
 *         </select>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useLinkedMember(bandId: string | null): UseLinkedMemberResult {
  const [linkedMember, setLinkedMember] = useState<BandMember | null>(null);
  const [unlinkedMembers, setUnlinkedMembers] = useState<BandMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLinkedMember = useCallback(async () => {
    if (!bandId) {
      setLinkedMember(null);
      setUnlinkedMembers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if Supabase is configured
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLinkedMember(null);
        setUnlinkedMembers([]);
        setIsLoading(false);
        return;
      }

      // Fetch linked member and unlinked members in parallel
      const [linked, unlinked] = await Promise.all([
        supabaseStorageService.getLinkedMemberForUser(user.id, bandId),
        getUnlinkedMembers(bandId),
      ]);

      setLinkedMember(linked);
      setUnlinkedMembers(unlinked);
    } catch (err) {
      console.error('Error fetching linked member:', err);
      setError(err instanceof Error ? err.message : 'Failed to load member information');
    } finally {
      setIsLoading(false);
    }
  }, [bandId]);

  useEffect(() => {
    fetchLinkedMember();
  }, [fetchLinkedMember]);

  return {
    linkedMember,
    unlinkedMembers,
    isLoading,
    error,
    refetch: fetchLinkedMember,
  };
}
