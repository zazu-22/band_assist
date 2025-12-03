import React from 'react';
import { AppActionsContext, type AppActionsContextValue } from './AppActionsContext';
import { AppDataContext, type AppDataContextValue } from './AppDataContext';
import { AppStatusContext, type AppStatusContextValue } from './AppStatusContext';

/**
 * Hook for components that only need stable actions.
 * Use this for components that don't need to react to data changes.
 * @throws Error if used outside of the App component tree
 * @returns The actions context value
 */
export const useAppActions = (): AppActionsContextValue => {
    const context = React.useContext(AppActionsContext);
    if (!context) {
        throw new Error(
            'useAppActions must be used within App component (inside AppActionsContext.Provider)'
        );
    }
    return context;
};

/**
 * Hook for components that need access to application data.
 * Use this for components that display or modify songs, members, roles, or events.
 * @throws Error if used outside of the App component tree
 * @returns The data context value
 */
export const useAppData = (): AppDataContextValue => {
    const context = React.useContext(AppDataContext);
    if (!context) {
        throw new Error(
            'useAppData must be used within App component (inside AppDataContext.Provider)'
        );
    }
    return context;
};

/**
 * Hook for components that need access to save status.
 * Use this for components that display saving indicators (e.g., "Saving...", "Last saved at...").
 * This context changes frequently (on every auto-save), so only use it where needed.
 * @throws Error if used outside of the App component tree
 * @returns The status context value
 */
export const useAppStatus = (): AppStatusContextValue => {
    const context = React.useContext(AppStatusContext);
    if (!context) {
        throw new Error(
            'useAppStatus must be used within App component (inside AppStatusContext.Provider)'
        );
    }
    return context;
};

/**
 * Combined hook for backwards compatibility.
 * Prefer useAppActions, useAppData, or useAppStatus for new code to benefit from render optimization.
 * @throws Error if used outside of the App component tree
 * @returns Combined actions, data, and status context values
 */
export const useAppContext = (): AppActionsContextValue & AppDataContextValue & AppStatusContextValue => {
    const actions = useAppActions();
    const data = useAppData();
    const status = useAppStatus();
    return { ...actions, ...data, ...status };
};
