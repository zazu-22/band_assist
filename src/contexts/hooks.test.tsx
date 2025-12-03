import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { useAppActions, useAppData, useAppStatus, useAppContext } from './hooks';
import { AppActionsContext, type AppActionsContextValue } from './AppActionsContext';
import { AppDataContext, type AppDataContextValue } from './AppDataContext';
import { AppStatusContext, type AppStatusContextValue } from './AppStatusContext';

// Mock data for testing
const mockActionsValue: AppActionsContextValue = {
    handleUpdateSong: vi.fn(),
    session: null,
    currentBandId: 'band-123',
    isAdmin: true,
};

const mockDataValue: AppDataContextValue = {
    songs: [{ id: '1', title: 'Test Song' }] as AppDataContextValue['songs'],
    setSongs: vi.fn(),
    members: [{ id: '1', name: 'Test Member', roles: [] }],
    setMembers: vi.fn(),
    availableRoles: ['Guitar', 'Bass'],
    setAvailableRoles: vi.fn(),
    events: [],
    setEvents: vi.fn(),
};

const mockStatusValue: AppStatusContextValue = {
    isSaving: false,
    lastSaved: new Date('2025-01-01'),
};

// Wrapper components for testing
const ActionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AppActionsContext.Provider value={mockActionsValue}>{children}</AppActionsContext.Provider>
);

const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AppDataContext.Provider value={mockDataValue}>{children}</AppDataContext.Provider>
);

const StatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AppStatusContext.Provider value={mockStatusValue}>{children}</AppStatusContext.Provider>
);

const AllProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AppActionsContext.Provider value={mockActionsValue}>
        <AppDataContext.Provider value={mockDataValue}>
            <AppStatusContext.Provider value={mockStatusValue}>
                {children}
            </AppStatusContext.Provider>
        </AppDataContext.Provider>
    </AppActionsContext.Provider>
);

describe('useAppActions', () => {
    it('returns only actions context values', () => {
        const { result } = renderHook(() => useAppActions(), {
            wrapper: ActionsProvider,
        });

        expect(result.current).toEqual(mockActionsValue);
        expect(result.current.handleUpdateSong).toBe(mockActionsValue.handleUpdateSong);
        expect(result.current.session).toBe(mockActionsValue.session);
        expect(result.current.currentBandId).toBe('band-123');
        expect(result.current.isAdmin).toBe(true);
    });

    it('throws descriptive error when used outside provider', () => {
        expect(() => {
            renderHook(() => useAppActions());
        }).toThrow('useAppActions must be used within App component (inside AppActionsContext.Provider)');
    });
});

describe('useAppData', () => {
    it('returns only data context values', () => {
        const { result } = renderHook(() => useAppData(), {
            wrapper: DataProvider,
        });

        expect(result.current).toEqual(mockDataValue);
        expect(result.current.songs).toEqual(mockDataValue.songs);
        expect(result.current.setSongs).toBe(mockDataValue.setSongs);
        expect(result.current.members).toEqual(mockDataValue.members);
        expect(result.current.setMembers).toBe(mockDataValue.setMembers);
        expect(result.current.availableRoles).toEqual(['Guitar', 'Bass']);
        expect(result.current.setAvailableRoles).toBe(mockDataValue.setAvailableRoles);
        expect(result.current.events).toEqual([]);
        expect(result.current.setEvents).toBe(mockDataValue.setEvents);
    });

    it('throws descriptive error when used outside provider', () => {
        expect(() => {
            renderHook(() => useAppData());
        }).toThrow('useAppData must be used within App component (inside AppDataContext.Provider)');
    });
});

describe('useAppStatus', () => {
    it('returns only status context values', () => {
        const { result } = renderHook(() => useAppStatus(), {
            wrapper: StatusProvider,
        });

        expect(result.current).toEqual(mockStatusValue);
        expect(result.current.isSaving).toBe(false);
        expect(result.current.lastSaved).toEqual(new Date('2025-01-01'));
    });

    it('throws descriptive error when used outside provider', () => {
        expect(() => {
            renderHook(() => useAppStatus());
        }).toThrow('useAppStatus must be used within App component (inside AppStatusContext.Provider)');
    });
});

describe('useAppContext', () => {
    it('returns combined actions, data, and status values', () => {
        const { result } = renderHook(() => useAppContext(), {
            wrapper: AllProviders,
        });

        // Actions values
        expect(result.current.handleUpdateSong).toBe(mockActionsValue.handleUpdateSong);
        expect(result.current.session).toBe(mockActionsValue.session);
        expect(result.current.currentBandId).toBe('band-123');
        expect(result.current.isAdmin).toBe(true);

        // Data values
        expect(result.current.songs).toEqual(mockDataValue.songs);
        expect(result.current.setSongs).toBe(mockDataValue.setSongs);
        expect(result.current.members).toEqual(mockDataValue.members);
        expect(result.current.setMembers).toBe(mockDataValue.setMembers);
        expect(result.current.availableRoles).toEqual(['Guitar', 'Bass']);
        expect(result.current.setAvailableRoles).toBe(mockDataValue.setAvailableRoles);
        expect(result.current.events).toEqual([]);
        expect(result.current.setEvents).toBe(mockDataValue.setEvents);

        // Status values
        expect(result.current.isSaving).toBe(false);
        expect(result.current.lastSaved).toEqual(new Date('2025-01-01'));
    });

    it('throws error when AppActionsContext is missing', () => {
        expect(() => {
            renderHook(() => useAppContext(), {
                wrapper: DataProvider,
            });
        }).toThrow('useAppActions must be used within App component (inside AppActionsContext.Provider)');
    });

    it('throws error when AppDataContext is missing', () => {
        expect(() => {
            renderHook(() => useAppContext(), {
                wrapper: ActionsProvider,
            });
        }).toThrow('useAppData must be used within App component (inside AppDataContext.Provider)');
    });
});
