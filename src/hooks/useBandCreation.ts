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

      isCreatingBandRef.current = true;

      // LAYER 1: Cancel pending auto-save BEFORE changing band context
      cancelPendingSave();

      // LAYER 2: Set loading guard to block new auto-saves
      isLoadingBandRef.current = true;

      try {
        // Create the new band
        const { data: newBand, error: createError } = await supabase
          .from('bands')
          .insert({
            name: bandName,
            created_by: session.user.id,
          })
          .select()
          .single();

        if (createError || !newBand) {
          console.error('Error creating band:', createError);
          throw new Error(createError?.message || 'Failed to create band');
        }

        // Add user to the band as admin
        const { error: joinError } = await supabase
          .from('user_bands')
          .insert({
            user_id: session.user.id,
            band_id: newBand.id,
            role: 'admin',
          });

        if (joinError) {
          console.error('Error joining band:', joinError);
          // Try to clean up the band we just created
          const { error: cleanupError } = await supabase
            .from('bands')
            .delete()
            .eq('id', newBand.id);

          if (cleanupError) {
            console.error('Failed to cleanup orphaned band:', cleanupError);
          }

          throw new Error('Failed to join the new band');
        }

        // Update local state with new band
        const newBandEntry = { id: newBand.id, name: newBand.name };
        setUserBands(prev => [...prev, newBandEntry]);

        // Switch to the new band
        currentBandIdRef.current = newBand.id;
        setCurrentBandId(newBand.id);
        setCurrentBandName(newBand.name);
        setIsAdmin(true); // Creator is always admin

        // Update storage service context
        StorageService.setCurrentBand?.(newBand.id);

        // Persist to localStorage (with Safari private browsing protection)
        try {
          localStorage.setItem(STORAGE_KEYS.SELECTED_BAND, newBand.id);
        } catch {
          // Graceful fallback - persistence won't work but app continues
        }

        // Reload data for the new band (will be empty initially)
        // Check if user switched bands during creation before loading
        if (currentBandIdRef.current !== newBand.id) {
          return;
        }

        setIsLoading(true);
        try {
          const data = await StorageService.load();

          // Verify band context hasn't changed during async load
          if (currentBandIdRef.current !== newBand.id) {
            return;
          }

          const appData = withDefaults(data);
          setSongs(appData.songs);
          setMembers(appData.members);
          setAvailableRoles(appData.roles);
          setEvents(appData.events);

          // Track which band this data belongs to (Layer 3)
          loadedBandIdRef.current = newBand.id;

          toast.success(`Created "${bandName}" successfully!`);
        } catch (loadError) {
          console.error('Error loading new band data:', loadError);
          // Reset to defaults to avoid leaking previous band's data
          setSongs(INITIAL_SONGS);
          setMembers(DEFAULT_MEMBERS);
          setAvailableRoles(DEFAULT_ROLES);
          setEvents(DEFAULT_EVENTS);

          // Track the band even on error (defaults are still for this band)
          loadedBandIdRef.current = newBand.id;

          toast.success(`Created "${bandName}"! Some data may need to refresh.`);
        } finally {
          setIsLoading(false);
          // Clear loading guard only after load completes
          isLoadingBandRef.current = false;
        }
      } finally {
        isCreatingBandRef.current = false;
        // If we never got to loading data, reset the loading guard
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
