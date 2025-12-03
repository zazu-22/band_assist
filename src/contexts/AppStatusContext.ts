import React from 'react';

/**
 * Context value interface for frequently-changing status indicators.
 * Contains save status and timestamps that update on every auto-save cycle.
 * Separated from actions to prevent unnecessary re-renders of action consumers.
 */
export interface AppStatusContextValue {
    isSaving: boolean;
    lastSaved: Date | null;
}

/**
 * React Context for save status indicators.
 * This context changes frequently (on every auto-save), so it's separated
 * from actions to prevent cascade re-renders in components that don't need
 * to display save status.
 */
export const AppStatusContext = React.createContext<AppStatusContextValue | null>(null);

AppStatusContext.displayName = 'AppStatusContext';
