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
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import * as fc from 'fast-check';
import { AppActionsContext, type AppActionsContextValue } from './AppActionsContext';
import { AppDataContext, type AppDataContextValue } from './AppDataContext';
import { useAppActions, useAppData } from './hooks';
import type { Song, BandMember, BandEvent } from '@/types';

/**
 * Type definition for test setters exposed via callback pattern.
 * This replaces the global window object pattern for better test isolation.
 */
interface TestSetters {
    setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
    setMembers: React.Dispatch<React.SetStateAction<BandMember[]>>;
    setAvailableRoles: React.Dispatch<React.SetStateAction<string[]>>;
    setEvents: React.Dispatch<React.SetStateAction<BandEvent[]>>;
    setSession: React.Dispatch<React.SetStateAction<AppActionsContextValue['session']>>;
    setCurrentBandId: React.Dispatch<React.SetStateAction<string | null>>;
    setIsAdmin: React.Dispatch<React.SetStateAction<boolean>>;
}

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
    // Generate date from timestamp to avoid invalid Date values
    date: fc.integer({ min: 946684800000, max: 4102444800000 }).map(ts => new Date(ts).toISOString().split('T')[0]), // 2000-2100
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

// Generator for actions state changes (isSaving and lastSaved moved to status context)
const actionsChangeArbitrary = fc.oneof(
    fc.record({ type: fc.constant('session' as const), value: fc.constant(null) }),
    fc.record({ type: fc.constant('currentBandId' as const), value: fc.option(fc.uuid(), { nil: null }) }),
    fc.record({ type: fc.constant('isAdmin' as const), value: fc.boolean() })
);

/**
 * Test provider that simulates the App.tsx context structure
 * with proper memoization as specified in the design document.
 *
 * Uses a callback pattern (onSettersReady) instead of global window object
 * to expose state setters for testing. This provides better test isolation
 * and prevents namespace pollution.
 */
const TestContextProvider: React.FC<{
    children: React.ReactNode;
    onActionsRefChange?: (ref: AppActionsContextValue) => void;
    onDataRefChange?: (ref: AppDataContextValue) => void;
    onSettersReady?: (setters: TestSetters) => void;
}> = ({ children, onActionsRefChange, onDataRefChange, onSettersReady }) => {
    // Data state
    const [songs, setSongs] = useState<Song[]>([]);
    const [members, setMembers] = useState<BandMember[]>([]);
    const [availableRoles, setAvailableRoles] = useState<string[]>([]);
    const [events, setEvents] = useState<BandEvent[]>([]);

    // Actions state (isSaving and lastSaved moved to AppStatusContext)
    const [session, setSession] = useState<AppActionsContextValue['session']>(null);
    const [currentBandId, setCurrentBandId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

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
        }),
        [handleUpdateSong, session, currentBandId, isAdmin]
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

    // Expose state setters via callback pattern instead of window object
    // Using ref to ensure stable callback reference
    const settersRef = useRef<TestSetters>({
        setSongs,
        setMembers,
        setAvailableRoles,
        setEvents,
        setSession,
        setCurrentBandId,
        setIsAdmin,
    });

    useEffect(() => {
        onSettersReady?.(settersRef.current);
    }, [onSettersReady]);

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
                    let testSetters: TestSetters | null = null;

                    const { result } = renderHook(
                        () => ({
                            actions: useAppActions(),
                            data: useAppData(),
                        }),
                        {
                            wrapper: ({ children }) => (
                                <TestContextProvider
                                    onActionsRefChange={(ref) => actionsRefs.push(ref)}
                                    onSettersReady={(setters) => { testSetters = setters; }}
                                >
                                    {children}
                                </TestContextProvider>
                            ),
                        }
                    );

                    // Get initial actions reference
                    const initialActionsRef = result.current.actions;

                    // Apply data changes using callback-provided setters
                    if (!testSetters) throw new Error('Test setters not initialized');

                    for (const change of dataChanges) {
                        act(() => {
                            switch (change.type) {
                                case 'songs':
                                    testSetters!.setSongs(change.value as Song[]);
                                    break;
                                case 'members':
                                    testSetters!.setMembers(change.value as BandMember[]);
                                    break;
                                case 'roles':
                                    testSetters!.setAvailableRoles(change.value as string[]);
                                    break;
                                case 'events':
                                    testSetters!.setEvents(change.value as BandEvent[]);
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
     * *For any* sequence of actions state changes (session, currentBandId, isAdmin),
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
                    let testSetters: TestSetters | null = null;

                    const { result } = renderHook(
                        () => ({
                            actions: useAppActions(),
                            data: useAppData(),
                        }),
                        {
                            wrapper: ({ children }) => (
                                <TestContextProvider
                                    onDataRefChange={(ref) => dataRefs.push(ref)}
                                    onSettersReady={(setters) => { testSetters = setters; }}
                                >
                                    {children}
                                </TestContextProvider>
                            ),
                        }
                    );

                    // Get initial data reference
                    const initialDataRef = result.current.data;

                    // Apply actions changes using callback-provided setters
                    if (!testSetters) throw new Error('Test setters not initialized');

                    for (const change of actionsChanges) {
                        act(() => {
                            switch (change.type) {
                                case 'session':
                                    testSetters!.setSession(change.value);
                                    break;
                                case 'currentBandId':
                                    testSetters!.setCurrentBandId(change.value);
                                    break;
                                case 'isAdmin':
                                    testSetters!.setIsAdmin(change.value);
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
                    let testSetters: TestSetters | null = null;

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
                                <TestContextProvider
                                    onSettersReady={(setters) => { testSetters = setters; }}
                                >
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

                    if (!testSetters) throw new Error('Test setters not initialized');

                    // Apply data changes - should NOT cause ActionsOnlyConsumer to re-render
                    for (const change of dataChanges) {
                        act(() => {
                            switch (change.type) {
                                case 'songs':
                                    testSetters!.setSongs(change.value as Song[]);
                                    break;
                                case 'members':
                                    testSetters!.setMembers(change.value as BandMember[]);
                                    break;
                                case 'roles':
                                    testSetters!.setAvailableRoles(change.value as string[]);
                                    break;
                                case 'events':
                                    testSetters!.setEvents(change.value as BandEvent[]);
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
                                    testSetters!.setSession(change.value);
                                    break;
                                case 'currentBandId':
                                    testSetters!.setCurrentBandId(change.value);
                                    break;
                                case 'isAdmin':
                                    testSetters!.setIsAdmin(change.value);
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
