import React from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Song } from '@/types';

/**
 * Context value interface for stable actions that rarely change.
 * Contains handlers, session info, and admin status.
 */
export interface AppActionsContextValue {
    handleUpdateSong: (song: Song) => void;
    session: Session | null;
    currentBandId: string | null;
    isAdmin: boolean;
    isSaving: boolean;
    lastSaved: Date | null;
}

/**
 * React Context for stable application actions.
 * Separating actions from data prevents cascade re-renders when data changes.
 */
export const AppActionsContext = React.createContext<AppActionsContextValue | null>(null);

AppActionsContext.displayName = 'AppActionsContext';
