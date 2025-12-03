import React from 'react';
import type { Song, BandMember, BandEvent } from '@/types';

/**
 * Context value interface for frequently-changing application data.
 * Contains songs, members, roles, events and their setters.
 */
export interface AppDataContextValue {
    songs: Song[];
    setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
    members: BandMember[];
    setMembers: React.Dispatch<React.SetStateAction<BandMember[]>>;
    availableRoles: string[];
    setAvailableRoles: React.Dispatch<React.SetStateAction<string[]>>;
    events: BandEvent[];
    setEvents: React.Dispatch<React.SetStateAction<BandEvent[]>>;
}

/**
 * React Context for frequently-changing application data.
 * Separating data from actions prevents cascade re-renders when actions change.
 */
export const AppDataContext = React.createContext<AppDataContextValue | null>(null);

AppDataContext.displayName = 'AppDataContext';
