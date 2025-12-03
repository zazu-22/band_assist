/**
 * Property-based tests for context isolation
 *
 * **Feature: perf-context-splitting, Property 1: Data changes preserve actions context reference**
 * **Feature: perf-context-splitting, Property 2: Actions changes preserve data context reference**
 * **Feature: perf-context-splitting, Property 3: Context memoization stability**
 * **Feature: perf-context-splitting, Property 4: Render isolation**
 *
 * These tests verify that the split context architecture properly isolates
 * data changes from actions changes, preventing cascade re-renders.
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import * as fc from 'fast-check';
import { AppActionsContext, type AppActionsContextValue } from './AppActionsContext';
import { AppDataContext, type AppDataContextValue } from './AppDataContext';
import { useAppActions, useAppData } from './hooks';
import type { Song, BandMember, BandEvent } from '@/types';

// Arbitrary generators for domain types matching src/types.ts
const songArbitrary: fc.Arbitrary<Song> = fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    artist: fc.string({ maxLength: 100 }),
    duration: fc.string({ minLength: 1, maxLength: 10 }),
    bpm: fc.integer({ min: 40, max: 300 }),
    key: fc.string({ minLength: 1, maxLength: 5 }),
    isOriginal: fc.boolean(),
    status: fc.constantFrom(
        'To Learn' as const,
        'In Progress' as const,
        'Performance Ready' as const
    ),
    assignments: fc.constant([]),
    parts: fc.constant([]),
    charts: fc.constant([]),
});

const memberArbitrary: fc.Arbitrary<BandMember> = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    roles: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
});

const eventArbitrary: fc.Arbitrary<BandEvent> = fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    date: fc.date().map(d => d.toISOString().split('T')[0]), // YYYY-MM-DD format
    type: fc.constantFrom('PRACTICE' as const, 'GIG' as const, 'OTHER' as const),
});

const rolesArbitrary = fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
    minLength: 1,
    maxLength: 10,
});

// Generator for data state changes
const dataChangeArbitrary = fc.oneof(
    fc.record({ type: fc.constant('songs' as const), value: fc.array(songArbitrary, { maxLength: 5 }) }),
    fc.record({ type: fc.constant('members' as const), value: fc.array(memberArbitrary, { maxLength: 5 }) }),
    fc.record({ type: fc.constant('roles' as const), value: rolesArbitrary }),
    fc.record({ type: fc.constant('events' as const), value: fc.array(eventArbitrary, { maxLength: 5 }) })
);

// Generator for actions state changes
const actionsChangeArbitrary = fc.oneof(
    fc.record({ type: fc.constant('session' as const), value: fc.constant(null) }),
    fc.record({ type: fc.constant('currentBandId' as const), value: fc.option(fc.uuid(), { nil: null }) }),
    fc.record({ type: fc.constant('isAdmin' as const), value: fc.boolean() }),
    fc.record({ type: fc.constant('isSaving' as const), value: fc.boolean() }),
    fc.record({ type: fc.constant('lastSaved' as const), value: fc.option(fc.date(), { nil: null }) })
);

/**
 * Test provider that simulates the App.tsx context structure
 * with proper memoization as specified in the design document.
 */
const TestContextProvider: React.FC<{
    children: React.ReactNode;
    onActionsRefChange?: (ref: AppActionsContextValue) => void;
    onDataRefChange?: (ref: AppDataContextValue) => void;
}> = ({ children, onActionsRefChange, onDataRefChange }) => {
    // Data state
    const [songs, setSongs] = useState<Song[]>([]);
    const [members, setMembers] = useState<BandMember[]>([]);
    const [availableRoles, setAvailableRoles] = useState<string[]>([]);
    const [events, setEvents] = useState<BandEvent[]>([]);

    // Actions state
    const [session, setSession] = useState<AppActionsContextValue['session']>(null);
    const [currentBandId, setCurrentBandId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    const handleUpdateSong = useCallback((song: Song) => {
        setSongs(prev => prev.map(s => (s.id === song.id ? song : s)));
    }, []);

    // Memoized context values matching App.tsx implementation
    const actionsContextValue = useMemo<AppActionsContextValue>(
        () => ({
            handleUpdateSong,
            session,
            currentBandId,
            isAdmin,
            isSaving,
            lastSaved,
        }),
        [handleUpdateSong, session, currentBandId, isAdmin, isSaving, lastSaved]
    );

    const dataContextValue = useMemo<AppDataContextValue>(
        () => ({
            songs,
            setSongs,
            members,
            setMembers,
            availableRoles,
            setAvailableRoles,
            events,
            setEvents,
        }),
        [songs, members, availableRoles, events]
    );

    // Track reference changes
    useEffect(() => {
        onActionsRefChange?.(actionsContextValue);
    }, [actionsContextValue, onActionsRefChange]);

    useEffect(() => {
        onDataRefChange?.(dataContextValue);
    }, [dataContextValue, onDataRefChange]);

    // Expose state setters for testing
    React.useEffect(() => {
        (window as unknown as Record<string, unknown>).__testSetters = {
            setSongs,
            setMembers,
            setAvailableRoles,
            setEvents,
            setSession,
            setCurrentBandId,
            setIsAdmin,
            setIsSaving,
            setLastSaved,
        };
    }, []);

    return (
        <AppActionsContext.Provider value={actionsContextValue}>
            <AppDataContext.Provider value={dataContextValue}>{children}</AppDataContext.Provider>
        </AppActionsContext.Provider>
    );
};

describe('Context Isolation Property Tests', () => {
    /**
     * **Feature: perf-context-splitting, Property 1: Data changes preserve actions context reference**
     *
     * *For any* sequence of data state changes (songs, members, roles, events),
     * the actions context object reference SHALL remain unchanged.
     *
     * **Validates: Requirements 2.3**
     */
    it('Property 1: Data changes preserve actions context reference', () => {
        fc.assert(
            fc.property(
                fc.array(dataChangeArbitrary, { minLength: 1, maxLength: 10 }),
                (dataChanges) => {
                    const actionsRefs: AppActionsContextValue[] = [];

                    const { result } = renderHook(
                        () => ({
                            actions: useAppActions(),
                            data: useAppData(),
                        }),
                        {
                            wrapper: ({ children }) => (
                                <TestContextProvider
                                    onActionsRefChange={(ref) => actionsRefs.push(ref)}
                                >
                                    {children}
                                </TestContextProvider>
                            ),
                        }
                    );

                    // Get initial actions reference
                    const initialActionsRef = result.current.actions;

                    // Apply data changes
                    const setters = (window as unknown as Record<string, Record<string, unknown>>).__testSetters;

                    for (const change of dataChanges) {
                        act(() => {
                            switch (change.type) {
                                case 'songs':
                                    (setters.setSongs as React.Dispatch<React.SetStateAction<Song[]>>)(change.value as Song[]);
                                    break;
                                case 'members':
                                    (setters.setMembers as React.Dispatch<React.SetStateAction<BandMember[]>>)(change.value as BandMember[]);
                                    break;
                                case 'roles':
                                    (setters.setAvailableRoles as React.Dispatch<React.SetStateAction<string[]>>)(change.value as string[]);
                                    break;
                                case 'events':
                                    (setters.setEvents as React.Dispatch<React.SetStateAction<BandEvent[]>>)(change.value as BandEvent[]);
                                    break;
                            }
                        });
                    }

                    // Verify actions context reference is unchanged
                    expect(result.current.actions).toBe(initialActionsRef);
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * **Feature: perf-context-splitting, Property 2: Actions changes preserve data context reference**
     *
     * *For any* sequence of actions state changes (session, currentBandId, isAdmin, isSaving, lastSaved),
     * the data context object reference SHALL remain unchanged.
     *
     * **Validates: Requirements 2.4**
     */
    it('Property 2: Actions changes preserve data context reference', () => {
        fc.assert(
            fc.property(
                fc.array(actionsChangeArbitrary, { minLength: 1, maxLength: 10 }),
                (actionsChanges) => {
                    const dataRefs: AppDataContextValue[] = [];

                    const { result } = renderHook(
                        () => ({
                            actions: useAppActions(),
                            data: useAppData(),
                        }),
                        {
                            wrapper: ({ children }) => (
                                <TestContextProvider
                                    onDataRefChange={(ref) => dataRefs.push(ref)}
                                >
                                    {children}
                                </TestContextProvider>
                            ),
                        }
                    );

                    // Get initial data reference
                    const initialDataRef = result.current.data;

                    // Apply actions changes
                    const setters = (window as unknown as Record<string, Record<string, unknown>>).__testSetters;

                    for (const change of actionsChanges) {
                        act(() => {
                            switch (change.type) {
                                case 'session':
                                    (setters.setSession as React.Dispatch<React.SetStateAction<AppActionsContextValue['session']>>)(change.value);
                                    break;
                                case 'currentBandId':
                                    (setters.setCurrentBandId as React.Dispatch<React.SetStateAction<string | null>>)(change.value);
                                    break;
                                case 'isAdmin':
                                    (setters.setIsAdmin as React.Dispatch<React.SetStateAction<boolean>>)(change.value);
                                    break;
                                case 'isSaving':
                                    (setters.setIsSaving as React.Dispatch<React.SetStateAction<boolean>>)(change.value);
                                    break;
                                case 'lastSaved':
                                    (setters.setLastSaved as React.Dispatch<React.SetStateAction<Date | null>>)(change.value);
                                    break;
                            }
                        });
                    }

                    // Verify data context reference is unchanged
                    expect(result.current.data).toBe(initialDataRef);
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * **Feature: perf-context-splitting, Property 3: Context memoization stability**
     *
     * *For any* context (actions or data), when none of its dependencies change between renders,
     * the context object reference SHALL remain the same.
     *
     * **Validates: Requirements 2.1, 2.2**
     */
    it('Property 3: Context memoization stability', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 20 }), // Number of render cycles
                (renderCycles) => {
                    const actionsRefs: AppActionsContextValue[] = [];
                    const dataRefs: AppDataContextValue[] = [];

                    const { result, rerender } = renderHook(
                        () => ({
                            actions: useAppActions(),
                            data: useAppData(),
                        }),
                        {
                            wrapper: ({ children }) => (
                                <TestContextProvider
                                    onActionsRefChange={(ref) => actionsRefs.push(ref)}
                                    onDataRefChange={(ref) => dataRefs.push(ref)}
                                >
                                    {children}
                                </TestContextProvider>
                            ),
                        }
                    );

                    // Get initial references
                    const initialActionsRef = result.current.actions;
                    const initialDataRef = result.current.data;

                    // Trigger multiple re-renders without changing any dependencies
                    for (let i = 0; i < renderCycles; i++) {
                        rerender();
                    }

                    // Verify both context references remain stable
                    expect(result.current.actions).toBe(initialActionsRef);
                    expect(result.current.data).toBe(initialDataRef);
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * **Feature: perf-context-splitting, Property 4: Render isolation**
     *
     * *For any* component that consumes only one context type, when the other context type changes,
     * the component SHALL NOT re-render.
     *
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
     */
    it('Property 4: Render isolation', () => {
        fc.assert(
            fc.property(
                fc.array(dataChangeArbitrary, { minLength: 1, maxLength: 5 }),
                fc.array(actionsChangeArbitrary, { minLength: 1, maxLength: 5 }),
                (dataChanges, actionsChanges) => {
                    // Track render counts for components consuming only one context type
                    let actionsOnlyRenderCount = 0;
                    let dataOnlyRenderCount = 0;

                    // Component that only consumes actions context
                    const ActionsOnlyConsumer: React.FC = () => {
                        useAppActions();
                        actionsOnlyRenderCount++;
                        return null;
                    };

                    // Component that only consumes data context
                    const DataOnlyConsumer: React.FC = () => {
                        useAppData();
                        dataOnlyRenderCount++;
                        return null;
                    };

                    renderHook(
                        () => null,
                        {
                            wrapper: ({ children }) => (
                                <TestContextProvider>
                                    <ActionsOnlyConsumer />
                                    <DataOnlyConsumer />
                                    {children}
                                </TestContextProvider>
                            ),
                        }
                    );

                    // Record initial render counts (both should be 1 after initial render)
                    const initialActionsRenderCount = actionsOnlyRenderCount;
                    const initialDataRenderCount = dataOnlyRenderCount;

                    const setters = (window as unknown as Record<string, Record<string, unknown>>).__testSetters;

                    // Apply data changes - should NOT cause ActionsOnlyConsumer to re-render
                    for (const change of dataChanges) {
                        act(() => {
                            switch (change.type) {
                                case 'songs':
                                    (setters.setSongs as React.Dispatch<React.SetStateAction<Song[]>>)(change.value as Song[]);
                                    break;
                                case 'members':
                                    (setters.setMembers as React.Dispatch<React.SetStateAction<BandMember[]>>)(change.value as BandMember[]);
                                    break;
                                case 'roles':
                                    (setters.setAvailableRoles as React.Dispatch<React.SetStateAction<string[]>>)(change.value as string[]);
                                    break;
                                case 'events':
                                    (setters.setEvents as React.Dispatch<React.SetStateAction<BandEvent[]>>)(change.value as BandEvent[]);
                                    break;
                            }
                        });
                    }

                    // ActionsOnlyConsumer should NOT have re-rendered from data changes
                    expect(actionsOnlyRenderCount).toBe(initialActionsRenderCount);

                    // DataOnlyConsumer WILL re-render from data changes (expected behavior)
                    // We just verify it's >= initial (it should have re-rendered)
                    expect(dataOnlyRenderCount).toBeGreaterThanOrEqual(initialDataRenderCount);

                    // Record counts after data changes
                    const afterDataChangesActionsCount = actionsOnlyRenderCount;
                    const afterDataChangesDataCount = dataOnlyRenderCount;

                    // Apply actions changes - should NOT cause DataOnlyConsumer to re-render
                    for (const change of actionsChanges) {
                        act(() => {
                            switch (change.type) {
                                case 'session':
                                    (setters.setSession as React.Dispatch<React.SetStateAction<AppActionsContextValue['session']>>)(change.value);
                                    break;
                                case 'currentBandId':
                                    (setters.setCurrentBandId as React.Dispatch<React.SetStateAction<string | null>>)(change.value);
                                    break;
                                case 'isAdmin':
                                    (setters.setIsAdmin as React.Dispatch<React.SetStateAction<boolean>>)(change.value);
                                    break;
                                case 'isSaving':
                                    (setters.setIsSaving as React.Dispatch<React.SetStateAction<boolean>>)(change.value);
                                    break;
                                case 'lastSaved':
                                    (setters.setLastSaved as React.Dispatch<React.SetStateAction<Date | null>>)(change.value);
                                    break;
                            }
                        });
                    }

                    // DataOnlyConsumer should NOT have re-rendered from actions changes
                    expect(dataOnlyRenderCount).toBe(afterDataChangesDataCount);

                    // ActionsOnlyConsumer WILL re-render from actions changes (expected behavior)
                    expect(actionsOnlyRenderCount).toBeGreaterThanOrEqual(afterDataChangesActionsCount);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
});
