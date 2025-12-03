import React from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Song } from '@/types';

/**
 * Context value interface for stable actions that rarely change.
 * Contains handlers, session info, and admin status.
 *
 * Note: isSaving and lastSaved have been moved to AppStatusContext
 * as they change frequently (on every auto-save) and would otherwise
 * cause unnecessary re-renders of action consumers.
 */
export interface AppActionsContextValue {
    handleUpdateSong: (song: Song) => void;
    session: Session | null;
    currentBandId: string | null;
    isAdmin: boolean;
}

/**
 * React Context for stable application actions.
 * Separating actions from data prevents cascade re-renders when data changes.
 */
export const AppActionsContext = React.createContext<AppActionsContextValue | null>(null);

AppActionsContext.displayName = 'AppActionsContext';
