import React from 'react';
import { AppActionsContext, type AppActionsContextValue } from './AppActionsContext';
import { AppDataContext, type AppDataContextValue } from './AppDataContext';

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
 * Combined hook for backwards compatibility.
 * Prefer useAppActions or useAppData for new code to benefit from render optimization.
 * @throws Error if used outside of the App component tree
 * @returns Combined actions and data context values
 */
export const useAppContext = (): AppActionsContextValue & AppDataContextValue => {
    const actions = useAppActions();
    const data = useAppData();
    return { ...actions, ...data };
};
