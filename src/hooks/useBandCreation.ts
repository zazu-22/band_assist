import { useState, useRef, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { toast } from '@/components/ui';
import { getSupabaseClient } from '@/services/supabaseClient';
import { StorageService } from '@/services/storageService';
import { STORAGE_KEYS } from '@/services/localStorageService';
import {
  INITIAL_SONGS,
  DEFAULT_MEMBERS,
  DEFAULT_ROLES,
  DEFAULT_EVENTS,
  withDefaults,
} from '@/constants';
import type { Song, BandMember, BandEvent } from '@/types';

// Max band name length - must match SQL function create_band_with_admin (c_max_name_length)
// and CreateBandDialog (MAX_BAND_NAME_LENGTH)
const MAX_BAND_NAME_LENGTH = 100;

interface UseBandCreationParams {
  session: Session | null;
  cancelPendingSave: () => void;
  isLoadingBandRef: React.MutableRefObject<boolean>;
  currentBandIdRef: React.MutableRefObject<string | null>;
  loadedBandIdRef: React.MutableRefObject<string | null>;
  setUserBands: React.Dispatch<React.SetStateAction<Array<{ id: string; name: string }>>>;
  setCurrentBandId: React.Dispatch<React.SetStateAction<string | null>>;
  setCurrentBandName: React.Dispatch<React.SetStateAction<string>>;
  setIsAdmin: React.Dispatch<React.SetStateAction<boolean>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
  setMembers: React.Dispatch<React.SetStateAction<BandMember[]>>;
  setAvailableRoles: React.Dispatch<React.SetStateAction<string[]>>;
  setEvents: React.Dispatch<React.SetStateAction<BandEvent[]>>;
}

interface UseBandCreationReturn {
  isDialogOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  createBand: (bandName: string) => Promise<void>;
}

/**
 * Custom hook for band creation functionality.
 * Manages the create band dialog state and handles band creation logic.
 */
export function useBandCreation({
  session,
  cancelPendingSave,
  isLoadingBandRef,
  currentBandIdRef,
  loadedBandIdRef,
  setUserBands,
  setCurrentBandId,
  setCurrentBandName,
  setIsAdmin,
  setIsLoading,
  setSongs,
  setMembers,
  setAvailableRoles,
  setEvents,
}: UseBandCreationParams): UseBandCreationReturn {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const isCreatingBandRef = useRef(false);

  const openDialog = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  const createBand = useCallback(
    async (bandName: string) => {
      // Prevent concurrent band creation attempts
      if (isCreatingBandRef.current) {
        return;
      }

      if (!session) {
        throw new Error('You must be logged in to create a band');
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Database connection unavailable');
      }

      // Client-side validation (mirrors server-side validation in create_band_with_admin RPC)
      const trimmedName = bandName.trim();
      if (!trimmedName) {
        throw new Error('Band name is required');
      }
      if (trimmedName.length > MAX_BAND_NAME_LENGTH) {
        throw new Error(`Band name cannot exceed ${MAX_BAND_NAME_LENGTH} characters`);
      }

      isCreatingBandRef.current = true;

      // LAYER 1: Cancel pending auto-save BEFORE changing band context
      cancelPendingSave();

      // LAYER 2: Set loading guard to block new auto-saves
      isLoadingBandRef.current = true;

      try {
        // Create band and add user as admin atomically using RPC function
        // This prevents orphaned bands if user_bands insert would fail
        // Note: Type assertion used because migration may not be applied yet
        type CreateBandResult = { band_id: string; band_name: string; created_at: string };
        const { data: rpcResult, error: createError } = await supabase.rpc(
          'create_band_with_admin' as never,
          { p_band_name: bandName } as never
        ) as { data: CreateBandResult[] | null; error: { message: string } | null };

        if (createError) {
          console.error('Error creating band:', createError);
          throw new Error(createError.message || 'Failed to create band');
        }

        if (!rpcResult || rpcResult.length === 0) {
          console.error('Error creating band: RPC returned empty result', { rpcResult });
          throw new Error('Failed to create band: no data returned');
        }

        const newBand = rpcResult[0];

        // Update local state with new band
        const newBandEntry = { id: newBand.band_id, name: newBand.band_name };
        setUserBands(prev => [...prev, newBandEntry]);

        // Switch to the new band
        currentBandIdRef.current = newBand.band_id;
        setCurrentBandId(newBand.band_id);
        setCurrentBandName(newBand.band_name);
        setIsAdmin(true); // Creator is always admin

        // Update storage service context
        StorageService.setCurrentBand?.(newBand.band_id);

        // Persist to localStorage (with Safari private browsing protection)
        try {
          localStorage.setItem(STORAGE_KEYS.SELECTED_BAND, newBand.band_id);
        } catch {
          // Graceful fallback - persistence won't work but app continues
        }

        // Reload data for the new band (will be empty initially)
        // Check if user switched bands during creation before loading
        if (currentBandIdRef.current !== newBand.band_id) {
          return;
        }

        setIsLoading(true);
        try {
          const data = await StorageService.load();

          // Verify band context hasn't changed during async load
          if (currentBandIdRef.current !== newBand.band_id) {
            return;
          }

          const appData = withDefaults(data);
          setSongs(appData.songs);
          setMembers(appData.members);
          setAvailableRoles(appData.roles);
          setEvents(appData.events);

          // Track which band this data belongs to (Layer 3)
          loadedBandIdRef.current = newBand.band_id;

          toast.success(`Created "${bandName}" successfully!`);
        } catch (loadError) {
          console.error('Error loading new band data:', loadError);
          // Reset to defaults to avoid leaking previous band's data
          setSongs(INITIAL_SONGS);
          setMembers(DEFAULT_MEMBERS);
          setAvailableRoles(DEFAULT_ROLES);
          setEvents(DEFAULT_EVENTS);

          // Track the band even on error (defaults are still for this band)
          loadedBandIdRef.current = newBand.band_id;

          toast.success(`Created "${bandName}"! Some data may need to refresh.`);
        } finally {
          setIsLoading(false);
          // Clear loading guard only after load completes
          isLoadingBandRef.current = false;
        }
      } finally {
        isCreatingBandRef.current = false;
        // Edge case: Reset loading guard if error occurred between lines 105-150
        // (after isLoadingBandRef.current = true but before entering inner try block).
        // The inner finally resets it on success/load-error; this handles RPC errors.
        if (isLoadingBandRef.current) {
          isLoadingBandRef.current = false;
        }
      }
    },
    [
      session,
      cancelPendingSave,
      isLoadingBandRef,
      currentBandIdRef,
      loadedBandIdRef,
      setUserBands,
      setCurrentBandId,
      setCurrentBandName,
      setIsAdmin,
      setIsLoading,
      setSongs,
      setMembers,
      setAvailableRoles,
      setEvents,
    ]
  );

  return {
    isDialogOpen,
    openDialog,
    closeDialog,
    createBand,
  };
}
