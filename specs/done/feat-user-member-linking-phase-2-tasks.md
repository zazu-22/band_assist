# Task Breakdown: User-Member Linking Phase 2 - Personal Practice Tracking

**Generated:** 2025-12-05
**Source:** specs/pending/feat-user-member-linking-phase-2.md

---

## Overview

Enable users to track their individual practice sessions, log progress on specific songs, and maintain a personal "learned" status separate from the band's overall song status. This builds on Phase 1's user-member linking foundation.

---

## Phase 1: Database Foundation

### Task 1.1: Create Database Migration for Practice Tables

**Description:** Create Supabase migration adding `user_song_status` and `practice_sessions` tables with proper constraints, indexes, and RLS policies.

**Size:** Medium
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 1.2 (TypeScript Types)

**Technical Requirements:**
- Create `user_song_status` table for personal learning progress
- Create `practice_sessions` table for practice logs
- Add proper indexes for efficient queries
- Enable RLS with user-owned-data policies
- Add band admin read-only policy for aggregate viewing

**Implementation:**

Create file: `supabase/migrations/YYYYMMDDHHMMSS_add_practice_tracking.sql`

```sql
-- Personal song status (separate from band-wide status)
CREATE TABLE user_song_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('Not Started', 'Learning', 'Learned', 'Mastered')),
  confidence_level INTEGER CHECK (confidence_level >= 1 AND confidence_level <= 5), -- 1-5 scale
  last_practiced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, song_id)
);

-- Practice session logs
CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  tempo_bpm INTEGER, -- Practiced tempo (may differ from song's target BPM)
  sections_practiced JSONB, -- Array of section names practiced, e.g., ["Intro", "Solo 1"]
  notes TEXT, -- Free-form practice notes
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_practice_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX idx_practice_sessions_song_id ON practice_sessions(song_id);
CREATE INDEX idx_practice_sessions_date ON practice_sessions(date DESC);
CREATE INDEX idx_user_song_status_user_id ON user_song_status(user_id);
CREATE INDEX idx_user_song_status_song_id ON user_song_status(song_id);

-- Enable RLS
ALTER TABLE user_song_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can manage their own data
CREATE POLICY user_song_status_select_own
ON user_song_status FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY user_song_status_insert_own
ON user_song_status FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_song_status_update_own
ON user_song_status FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY user_song_status_delete_own
ON user_song_status FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY practice_sessions_select_own
ON practice_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY practice_sessions_insert_own
ON practice_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY practice_sessions_update_own
ON practice_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY practice_sessions_delete_own
ON practice_sessions FOR DELETE
USING (auth.uid() = user_id);

-- Band admins can view aggregate practice data (read-only)
CREATE POLICY practice_sessions_select_band_admin
ON practice_sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_bands
    WHERE user_bands.user_id = auth.uid()
      AND user_bands.band_id = practice_sessions.band_id
      AND user_bands.role = 'admin'
  )
);
```

**Acceptance Criteria:**
- [ ] Migration runs successfully with no errors
- [ ] `user_song_status` table created with all columns and constraints
- [ ] `practice_sessions` table created with all columns and constraints
- [ ] Indexes created for `user_id`, `song_id`, and `date` columns
- [ ] RLS enabled on both tables
- [ ] Users can only access their own data
- [ ] Band admins can read (not write) practice sessions for their band
- [ ] CHECK constraints enforce valid status values and positive duration
- [ ] UNIQUE constraint prevents duplicate user+song status entries

---

### Task 1.2: Add TypeScript Types for Practice Tracking

**Description:** Add TypeScript types for `UserSongStatus`, `UserSongProgress`, `PracticeSession`, and `PracticeStats` to maintain type safety throughout the application.

**Size:** Small
**Priority:** High
**Dependencies:** None
**Can run parallel with:** Task 1.1 (Database Migration)

**Technical Requirements:**
- Add types to `src/types.ts`
- Ensure types match database schema exactly
- Add type helper functions if needed

**Implementation:**

Add to `src/types.ts`:

```typescript
// Personal song status enum
export type UserSongStatus = 'Not Started' | 'Learning' | 'Learned' | 'Mastered';

// Personal song progress tracking
export interface UserSongProgress {
  id: string;
  userId: string;
  songId: string;
  status: UserSongStatus;
  confidenceLevel?: number; // 1-5 scale
  lastPracticedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Individual practice session record
export interface PracticeSession {
  id: string;
  userId: string;
  songId: string;
  bandId: string;
  durationMinutes: number;
  tempoBpm?: number;
  sectionsPracticed?: string[]; // e.g., ["Intro", "Chorus", "Solo 1"]
  notes?: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

// Aggregate stats for display
export interface PracticeStats {
  totalSessions: number;
  totalMinutes: number;
  averageSessionMinutes: number;
  songsLearned: number;
  songsMastered: number;
  recentSessions: PracticeSession[];
}

// Filter options for querying practice sessions
export interface PracticeFilters {
  songId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}
```

**Acceptance Criteria:**
- [ ] `UserSongStatus` type has all 4 status values
- [ ] `UserSongProgress` interface matches database `user_song_status` schema
- [ ] `PracticeSession` interface matches database `practice_sessions` schema
- [ ] `PracticeStats` interface provides all aggregate fields needed for UI
- [ ] `PracticeFilters` interface supports filtering practice sessions
- [ ] Types pass TypeScript strict mode compilation
- [ ] No `any` types used

---

### Task 1.3: Regenerate Database Types

**Description:** Run Supabase type generation to update `src/types/database.types.ts` with the new tables.

**Size:** Small
**Priority:** High
**Dependencies:** Task 1.1 (Database Migration must be applied first)
**Can run parallel with:** None

**Technical Requirements:**
- Apply migration to database
- Run `npm run types:generate` (or equivalent supabase type gen command)
- Verify generated types match expected schema

**Implementation:**

```bash
# Apply migration (if not already applied)
npx supabase db push

# Regenerate types
npm run types:generate
```

The generated types in `src/types/database.types.ts` should include:

```typescript
// src/types/database.types.ts (partial - auto-generated)
export type Database = {
  public: {
    Tables: {
      // ... existing tables
      user_song_status: {
        Row: {
          id: string;
          user_id: string;
          song_id: string;
          status: string;
          confidence_level: number | null;
          last_practiced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          song_id: string;
          status: string;
          confidence_level?: number | null;
          last_practiced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          song_id?: string;
          status?: string;
          confidence_level?: number | null;
          last_practiced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      practice_sessions: {
        Row: {
          id: string;
          user_id: string;
          song_id: string;
          band_id: string;
          duration_minutes: number;
          tempo_bpm: number | null;
          sections_practiced: Json | null;
          notes: string | null;
          date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          song_id: string;
          band_id: string;
          duration_minutes: number;
          tempo_bpm?: number | null;
          sections_practiced?: Json | null;
          notes?: string | null;
          date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          song_id?: string;
          band_id?: string;
          duration_minutes?: number;
          tempo_bpm?: number | null;
          sections_practiced?: Json | null;
          notes?: string | null;
          date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
```

**Acceptance Criteria:**
- [ ] Migration applied successfully to database
- [ ] Type generation command runs without errors
- [ ] `database.types.ts` contains `user_song_status` table definition
- [ ] `database.types.ts` contains `practice_sessions` table definition
- [ ] All column types match the migration schema
- [ ] TypeScript compilation succeeds with new types

---

## Phase 2: Service Layer

### Task 2.1: Implement Practice Session Service Methods

**Description:** Add service methods to `supabaseStorageService.ts` for logging and querying practice sessions.

**Size:** Large
**Priority:** High
**Dependencies:** Task 1.1, Task 1.2, Task 1.3
**Can run parallel with:** Task 2.2 (User Song Status Service)

**Technical Requirements:**
- Implement `logPracticeSession()` for creating new sessions
- Implement `getPracticeSessions()` with filtering support
- Handle validation and error cases
- Transform database rows to TypeScript types

**Implementation:**

Add to `src/services/supabaseStorageService.ts`:

```typescript
import type { PracticeSession, PracticeFilters } from '../types';

/**
 * Log a practice session for a user
 * @throws Error if validation fails or database operation fails
 */
async function logPracticeSession(
  session: Omit<PracticeSession, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PracticeSession> {
  // Validate session data
  if (session.durationMinutes <= 0) {
    throw new Error('Practice duration must be greater than 0 minutes');
  }

  const { data, error } = await supabase
    .from('practice_sessions')
    .insert({
      user_id: session.userId,
      song_id: session.songId,
      band_id: session.bandId,
      duration_minutes: session.durationMinutes,
      tempo_bpm: session.tempoBpm ?? null,
      sections_practiced: session.sectionsPracticed ?? null,
      notes: session.notes ?? null,
      date: session.date,
    })
    .select()
    .single();

  if (error) {
    console.error('Error logging practice session:', error);
    throw new Error('Failed to save practice session');
  }

  // Also update last_practiced_at in user_song_status
  await supabase
    .from('user_song_status')
    .upsert({
      user_id: session.userId,
      song_id: session.songId,
      status: 'Learning', // Default status, won't overwrite existing
      last_practiced_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,song_id',
      ignoreDuplicates: false,
    })
    .select();

  return transformPracticeSession(data);
}

/**
 * Get practice sessions for a user with optional filters
 */
async function getPracticeSessions(
  userId: string,
  bandId: string,
  filters?: PracticeFilters
): Promise<PracticeSession[]> {
  let query = supabase
    .from('practice_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('band_id', bandId)
    .order('date', { ascending: false });

  if (filters?.songId) {
    query = query.eq('song_id', filters.songId);
  }

  if (filters?.startDate) {
    query = query.gte('date', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('date', filters.endDate);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching practice sessions:', error);
    throw new Error('Failed to load practice sessions');
  }

  return (data || []).map(transformPracticeSession);
}

/**
 * Transform database row to PracticeSession type
 */
function transformPracticeSession(row: Database['public']['Tables']['practice_sessions']['Row']): PracticeSession {
  return {
    id: row.id,
    userId: row.user_id,
    songId: row.song_id,
    bandId: row.band_id,
    durationMinutes: row.duration_minutes,
    tempoBpm: row.tempo_bpm ?? undefined,
    sectionsPracticed: (row.sections_practiced as string[] | null) ?? undefined,
    notes: row.notes ?? undefined,
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

**Acceptance Criteria:**
- [ ] `logPracticeSession()` validates duration > 0
- [ ] `logPracticeSession()` inserts record into `practice_sessions` table
- [ ] `logPracticeSession()` updates `last_practiced_at` in `user_song_status`
- [ ] `getPracticeSessions()` returns sessions ordered by date descending
- [ ] `getPracticeSessions()` filters by songId when provided
- [ ] `getPracticeSessions()` filters by date range when provided
- [ ] `getPracticeSessions()` limits results when limit provided
- [ ] Both methods handle database errors gracefully
- [ ] Return types match TypeScript interfaces

---

### Task 2.2: Implement User Song Status Service Methods

**Description:** Add service methods for managing user's personal song status (Not Started, Learning, Learned, Mastered).

**Size:** Medium
**Priority:** High
**Dependencies:** Task 1.1, Task 1.2, Task 1.3
**Can run parallel with:** Task 2.1 (Practice Session Service)

**Technical Requirements:**
- Implement `updateUserSongStatus()` with upsert logic
- Implement `getUserSongStatus()` for single song lookup
- Implement `getAllUserSongStatuses()` for batch retrieval

**Implementation:**

Add to `src/services/supabaseStorageService.ts`:

```typescript
import type { UserSongProgress, UserSongStatus } from '../types';

/**
 * Update user's learning status for a song
 * Uses upsert to handle both insert and update cases
 */
async function updateUserSongStatus(
  userId: string,
  songId: string,
  status: UserSongStatus,
  confidence?: number
): Promise<UserSongProgress> {
  const { data, error } = await supabase
    .from('user_song_status')
    .upsert({
      user_id: userId,
      song_id: songId,
      status,
      confidence_level: confidence ?? null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,song_id',
    })
    .select()
    .single();

  if (error) {
    console.error('Error updating user song status:', error);
    throw new Error('Failed to update song status');
  }

  return transformUserSongProgress(data);
}

/**
 * Get user's learning status for a specific song
 * Returns null if no status exists yet
 */
async function getUserSongStatus(
  userId: string,
  songId: string
): Promise<UserSongProgress | null> {
  const { data, error } = await supabase
    .from('user_song_status')
    .select('*')
    .eq('user_id', userId)
    .eq('song_id', songId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user song status:', error);
    throw new Error('Failed to load song status');
  }

  return data ? transformUserSongProgress(data) : null;
}

/**
 * Get all song statuses for a user in a band
 * Returns a Map keyed by songId for efficient lookups
 */
async function getAllUserSongStatuses(
  userId: string,
  bandId: string
): Promise<Map<string, UserSongProgress>> {
  // First get all song IDs for this band
  const { data: songs, error: songsError } = await supabase
    .from('songs')
    .select('id')
    .eq('band_id', bandId);

  if (songsError) {
    console.error('Error fetching songs:', songsError);
    throw new Error('Failed to load songs');
  }

  const songIds = songs?.map(s => s.id) || [];

  if (songIds.length === 0) {
    return new Map();
  }

  // Get user's statuses for these songs
  const { data, error } = await supabase
    .from('user_song_status')
    .select('*')
    .eq('user_id', userId)
    .in('song_id', songIds);

  if (error) {
    console.error('Error fetching user song statuses:', error);
    throw new Error('Failed to load song statuses');
  }

  const statusMap = new Map<string, UserSongProgress>();
  (data || []).forEach(row => {
    statusMap.set(row.song_id, transformUserSongProgress(row));
  });

  return statusMap;
}

/**
 * Transform database row to UserSongProgress type
 */
function transformUserSongProgress(
  row: Database['public']['Tables']['user_song_status']['Row']
): UserSongProgress {
  return {
    id: row.id,
    userId: row.user_id,
    songId: row.song_id,
    status: row.status as UserSongStatus,
    confidenceLevel: row.confidence_level ?? undefined,
    lastPracticedAt: row.last_practiced_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

**Acceptance Criteria:**
- [ ] `updateUserSongStatus()` creates new record if none exists
- [ ] `updateUserSongStatus()` updates existing record if found
- [ ] `updateUserSongStatus()` updates `updated_at` timestamp
- [ ] `getUserSongStatus()` returns null for non-existent status
- [ ] `getUserSongStatus()` returns correct data for existing status
- [ ] `getAllUserSongStatuses()` returns empty Map for band with no songs
- [ ] `getAllUserSongStatuses()` returns Map keyed by songId
- [ ] All methods handle database errors gracefully
- [ ] Return types match TypeScript interfaces

---

### Task 2.3: Implement Practice Statistics Calculator

**Description:** Add service method to calculate aggregate practice statistics for dashboard display.

**Size:** Medium
**Priority:** Medium
**Dependencies:** Task 2.1, Task 2.2
**Can run parallel with:** Task 3.1 (Custom Hooks)

**Technical Requirements:**
- Calculate total sessions and minutes
- Calculate average session duration
- Count songs by learning status
- Fetch recent sessions for preview
- Support optional date range filtering

**Implementation:**

Add to `src/services/supabaseStorageService.ts`:

```typescript
import type { PracticeStats } from '../types';

/**
 * Calculate aggregate practice statistics for a user
 */
async function calculatePracticeStats(
  userId: string,
  bandId: string,
  dateRange?: { start: string; end: string }
): Promise<PracticeStats> {
  // Build query for practice sessions
  let sessionsQuery = supabase
    .from('practice_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('band_id', bandId);

  if (dateRange?.start) {
    sessionsQuery = sessionsQuery.gte('date', dateRange.start);
  }
  if (dateRange?.end) {
    sessionsQuery = sessionsQuery.lte('date', dateRange.end);
  }

  const { data: sessions, error: sessionsError } = await sessionsQuery;

  if (sessionsError) {
    console.error('Error fetching sessions for stats:', sessionsError);
    throw new Error('Failed to calculate practice statistics');
  }

  // Get song IDs for this band
  const { data: songs, error: songsError } = await supabase
    .from('songs')
    .select('id')
    .eq('band_id', bandId);

  if (songsError) {
    console.error('Error fetching songs:', songsError);
    throw new Error('Failed to load songs');
  }

  const songIds = songs?.map(s => s.id) || [];

  // Get user's song statuses
  const { data: statuses, error: statusError } = await supabase
    .from('user_song_status')
    .select('*')
    .eq('user_id', userId)
    .in('song_id', songIds);

  if (statusError) {
    console.error('Error fetching statuses:', statusError);
    throw new Error('Failed to load song statuses');
  }

  // Calculate statistics
  const totalSessions = sessions?.length || 0;
  const totalMinutes = sessions?.reduce((sum, s) => sum + s.duration_minutes, 0) || 0;
  const averageSessionMinutes = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;

  const songsLearned = (statuses || []).filter(
    s => s.status === 'Learned' || s.status === 'Mastered'
  ).length;
  const songsMastered = (statuses || []).filter(s => s.status === 'Mastered').length;

  // Get recent sessions (last 5)
  const recentSessions = (sessions || [])
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .map(transformPracticeSession);

  return {
    totalSessions,
    totalMinutes,
    averageSessionMinutes,
    songsLearned,
    songsMastered,
    recentSessions,
  };
}
```

**Acceptance Criteria:**
- [ ] Returns correct `totalSessions` count
- [ ] Returns correct `totalMinutes` sum
- [ ] `averageSessionMinutes` is correctly calculated (rounded)
- [ ] `averageSessionMinutes` is 0 when no sessions exist
- [ ] `songsLearned` counts both 'Learned' and 'Mastered' statuses
- [ ] `songsMastered` counts only 'Mastered' status
- [ ] `recentSessions` returns up to 5 most recent sessions
- [ ] `recentSessions` is sorted by date descending
- [ ] Date range filtering works correctly
- [ ] Handles empty data gracefully

---

## Phase 3: Custom Hooks

### Task 3.1: Create usePracticeSessions Hook

**Description:** Create a custom React hook for fetching and managing practice sessions with loading and error states.

**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.1
**Can run parallel with:** Task 3.2 (useUserSongStatus Hook)

**Technical Requirements:**
- Fetch sessions on mount and filter changes
- Handle loading and error states
- Provide refetch function for manual refresh
- Clean up properly on unmount

**Implementation:**

Create file: `src/hooks/usePracticeSessions.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { PracticeSession, PracticeFilters } from '../types';
import { supabaseStorageService } from '../services/supabaseStorageService';

interface UsePracticeSessionsResult {
  sessions: PracticeSession[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePracticeSessions(
  userId: string | null,
  bandId: string | null,
  filters?: PracticeFilters
): UsePracticeSessionsResult {
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!userId || !bandId) {
      setSessions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await supabaseStorageService.getPracticeSessions(
        userId,
        bandId,
        filters
      );
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load practice sessions'));
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId, bandId, JSON.stringify(filters)]);

  useEffect(() => {
    load();
  }, [load]);

  return { sessions, isLoading, error, refetch: load };
}
```

**Acceptance Criteria:**
- [ ] Returns empty sessions when userId or bandId is null
- [ ] Sets `isLoading` to true during fetch
- [ ] Sets `isLoading` to false after fetch completes
- [ ] Sets `error` when fetch fails
- [ ] Clears `error` on successful fetch
- [ ] `refetch` function triggers new fetch
- [ ] Re-fetches when userId changes
- [ ] Re-fetches when bandId changes
- [ ] Re-fetches when filters change
- [ ] Properly typed return values

---

### Task 3.2: Create useUserSongStatus Hook

**Description:** Create a custom React hook for fetching and managing a user's personal song status.

**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.2
**Can run parallel with:** Task 3.1 (usePracticeSessions Hook)

**Technical Requirements:**
- Fetch status for a single song or all songs in a band
- Handle loading and error states
- Provide update function for changing status
- Support optimistic updates

**Implementation:**

Create file: `src/hooks/useUserSongStatus.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { UserSongProgress, UserSongStatus } from '../types';
import { supabaseStorageService } from '../services/supabaseStorageService';

interface UseUserSongStatusResult {
  status: UserSongProgress | null;
  isLoading: boolean;
  error: Error | null;
  updateStatus: (status: UserSongStatus, confidence?: number) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useUserSongStatus(
  userId: string | null,
  songId: string | null
): UseUserSongStatusResult {
  const [status, setStatus] = useState<UserSongProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!userId || !songId) {
      setStatus(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await supabaseStorageService.getUserSongStatus(userId, songId);
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load song status'));
    } finally {
      setIsLoading(false);
    }
  }, [userId, songId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = useCallback(
    async (newStatus: UserSongStatus, confidence?: number) => {
      if (!userId || !songId) return;

      // Optimistic update
      const previousStatus = status;
      setStatus(prev =>
        prev
          ? { ...prev, status: newStatus, confidenceLevel: confidence }
          : null
      );

      try {
        const updated = await supabaseStorageService.updateUserSongStatus(
          userId,
          songId,
          newStatus,
          confidence
        );
        setStatus(updated);
        setError(null);
      } catch (err) {
        // Revert optimistic update on error
        setStatus(previousStatus);
        setError(err instanceof Error ? err : new Error('Failed to update song status'));
        throw err; // Re-throw so caller can handle
      }
    },
    [userId, songId, status]
  );

  return { status, isLoading, error, updateStatus, refetch: load };
}

// Hook for getting all song statuses in a band
interface UseAllUserSongStatusesResult {
  statuses: Map<string, UserSongProgress>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAllUserSongStatuses(
  userId: string | null,
  bandId: string | null
): UseAllUserSongStatusesResult {
  const [statuses, setStatuses] = useState<Map<string, UserSongProgress>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!userId || !bandId) {
      setStatuses(new Map());
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await supabaseStorageService.getAllUserSongStatuses(userId, bandId);
      setStatuses(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load song statuses'));
    } finally {
      setIsLoading(false);
    }
  }, [userId, bandId]);

  useEffect(() => {
    load();
  }, [load]);

  return { statuses, isLoading, error, refetch: load };
}
```

**Acceptance Criteria:**
- [ ] `useUserSongStatus` returns null when userId or songId is null
- [ ] `useUserSongStatus` fetches status on mount
- [ ] `updateStatus` performs optimistic update
- [ ] `updateStatus` reverts on error
- [ ] `updateStatus` re-throws errors for caller handling
- [ ] `useAllUserSongStatuses` returns empty Map when userId or bandId is null
- [ ] `useAllUserSongStatuses` returns Map keyed by songId
- [ ] Both hooks handle loading states correctly
- [ ] Both hooks handle error states correctly
- [ ] Both hooks provide refetch function

---

### Task 3.3: Create usePracticeStats Hook

**Description:** Create a custom React hook for fetching aggregate practice statistics.

**Size:** Small
**Priority:** Medium
**Dependencies:** Task 2.3
**Can run parallel with:** Task 4.1 (Practice Log Dialog)

**Technical Requirements:**
- Fetch stats on mount and filter changes
- Support date range filtering
- Handle loading and error states

**Implementation:**

Create file: `src/hooks/usePracticeStats.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { PracticeStats } from '../types';
import { supabaseStorageService } from '../services/supabaseStorageService';

interface UsePracticeStatsResult {
  stats: PracticeStats | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePracticeStats(
  userId: string | null,
  bandId: string | null,
  dateRange?: { start: string; end: string }
): UsePracticeStatsResult {
  const [stats, setStats] = useState<PracticeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!userId || !bandId) {
      setStats(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await supabaseStorageService.calculatePracticeStats(
        userId,
        bandId,
        dateRange
      );
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load practice statistics'));
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, bandId, dateRange?.start, dateRange?.end]);

  useEffect(() => {
    load();
  }, [load]);

  return { stats, isLoading, error, refetch: load };
}
```

**Acceptance Criteria:**
- [ ] Returns null stats when userId or bandId is null
- [ ] Fetches stats on mount
- [ ] Re-fetches when userId changes
- [ ] Re-fetches when bandId changes
- [ ] Re-fetches when dateRange changes
- [ ] Handles loading states correctly
- [ ] Handles error states correctly
- [ ] Provides refetch function

---

## Phase 4: UI Components

### Task 4.1: Add Practice Log Dialog to Performance Mode

**Description:** Add a "Log Practice" button and dialog to Performance Mode (Practice Room) for users to record their practice sessions.

**Size:** Large
**Priority:** High
**Dependencies:** Task 2.1, Task 2.2, Task 3.1, Task 3.2
**Can run parallel with:** None

**Technical Requirements:**
- Add "Log Practice" button visible only to authenticated users
- Create dialog with all required fields
- Validate inputs before submission
- Show loading state during save
- Handle success and error cases with toast notifications
- Update user song status as part of practice log

**Implementation:**

Modify `src/components/PerformanceMode.tsx`:

```tsx
import { useState } from 'react';
import { Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './primitives/dialog';
import { Button } from './primitives/button';
import { Input } from './primitives/input';
import { Textarea } from './primitives/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './primitives/select';
import { useToast } from './ui/Toast';
import type { UserSongStatus } from '../types';
import { supabaseStorageService } from '../services/supabaseStorageService';

// Inside PerformanceMode component:

// State for practice log dialog
const [showPracticeLogDialog, setShowPracticeLogDialog] = useState(false);
const [practiceLog, setPracticeLog] = useState({
  duration: 30,
  tempoBpm: song?.bpm || undefined,
  sections: [] as string[],
  notes: '',
  status: 'Learning' as UserSongStatus,
  confidence: 3,
});
const [isSaving, setIsSaving] = useState(false);

const { toast } = useToast();

// Handler for saving practice log
const handleSavePracticeLog = async () => {
  if (!currentUserId || !song || !currentBandId) return;

  if (practiceLog.duration <= 0) {
    toast({
      title: 'Invalid Duration',
      description: 'Practice duration must be greater than 0 minutes',
      variant: 'destructive',
    });
    return;
  }

  setIsSaving(true);
  try {
    // Log the practice session
    await supabaseStorageService.logPracticeSession({
      userId: currentUserId,
      songId: song.id,
      bandId: currentBandId,
      durationMinutes: practiceLog.duration,
      tempoBpm: practiceLog.tempoBpm,
      sectionsPracticed: practiceLog.sections.length > 0 ? practiceLog.sections : undefined,
      notes: practiceLog.notes || undefined,
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    });

    // Update user song status
    await supabaseStorageService.updateUserSongStatus(
      currentUserId,
      song.id,
      practiceLog.status,
      practiceLog.confidence
    );

    toast({
      title: 'Practice Logged',
      description: `Logged ${practiceLog.duration} minutes of practice on ${song.title}`,
    });

    setShowPracticeLogDialog(false);
    // Reset form for next time
    setPracticeLog({
      duration: 30,
      tempoBpm: song.bpm || undefined,
      sections: [],
      notes: '',
      status: 'Learning',
      confidence: 3,
    });
  } catch (error) {
    console.error('Error saving practice log:', error);
    toast({
      title: 'Failed to Save',
      description: 'Your practice session was not saved. Please try again.',
      variant: 'destructive',
    });
  } finally {
    setIsSaving(false);
  }
};

// Get available sections from song parts
const availableSections = song?.parts?.map(p => p.name) || [];

// Section toggle handler
const toggleSection = (section: string) => {
  setPracticeLog(prev => ({
    ...prev,
    sections: prev.sections.includes(section)
      ? prev.sections.filter(s => s !== section)
      : [...prev.sections, section],
  }));
};

// JSX for the button and dialog (add to controls area):
{currentUserId && (
  <>
    <Button
      variant="outline"
      onClick={() => setShowPracticeLogDialog(true)}
    >
      <Clock className="h-4 w-4 mr-2" />
      Log Practice
    </Button>

    <Dialog open={showPracticeLogDialog} onOpenChange={setShowPracticeLogDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Practice Session</DialogTitle>
          <DialogDescription>
            Track your progress on {song?.title}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Duration */}
          <div>
            <label className="text-sm font-medium">Duration (minutes)</label>
            <Input
              type="number"
              min="1"
              value={practiceLog.duration}
              onChange={(e) =>
                setPracticeLog({ ...practiceLog, duration: parseInt(e.target.value, 10) || 0 })
              }
            />
          </div>

          {/* Tempo */}
          <div>
            <label className="text-sm font-medium">Practice Tempo (BPM)</label>
            <Input
              type="number"
              min="1"
              placeholder={`Song tempo: ${song?.bpm || 'Unknown'}`}
              value={practiceLog.tempoBpm || ''}
              onChange={(e) =>
                setPracticeLog({
                  ...practiceLog,
                  tempoBpm: e.target.value ? parseInt(e.target.value, 10) : undefined,
                })
              }
            />
          </div>

          {/* Sections */}
          {availableSections.length > 0 && (
            <div>
              <label className="text-sm font-medium">Sections Practiced</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {availableSections.map((section) => (
                  <Button
                    key={section}
                    variant={practiceLog.sections.includes(section) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleSection(section)}
                  >
                    {section}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              placeholder="What did you work on? What needs improvement?"
              value={practiceLog.notes}
              onChange={(e) => setPracticeLog({ ...practiceLog, notes: e.target.value })}
            />
          </div>

          {/* Status */}
          <div>
            <label className="text-sm font-medium">My Status</label>
            <Select
              value={practiceLog.status}
              onValueChange={(status: UserSongStatus) =>
                setPracticeLog({ ...practiceLog, status })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Not Started">Not Started</SelectItem>
                <SelectItem value="Learning">Learning</SelectItem>
                <SelectItem value="Learned">Learned</SelectItem>
                <SelectItem value="Mastered">Mastered</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Confidence */}
          <div>
            <label className="text-sm font-medium">Confidence (1-5)</label>
            <div className="flex gap-2 mt-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <Button
                  key={level}
                  variant={practiceLog.confidence === level ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPracticeLog({ ...practiceLog, confidence: level })}
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowPracticeLogDialog(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSavePracticeLog} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Practice Log'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
)}
```

**Acceptance Criteria:**
- [ ] "Log Practice" button visible only when user is authenticated
- [ ] Dialog opens when button clicked
- [ ] Duration field validates > 0
- [ ] Tempo field is optional with placeholder showing song tempo
- [ ] Sections are toggleable buttons populated from song.parts
- [ ] Notes field is optional textarea
- [ ] Status dropdown shows all 4 status options
- [ ] Confidence level is selectable 1-5 scale
- [ ] Save button shows loading state during save
- [ ] Success toast shown on successful save
- [ ] Error toast shown on failure
- [ ] Dialog closes on successful save
- [ ] Form resets after successful save
- [ ] Both practice session and user song status are updated

---

### Task 4.2: Create Practice History Page Component

**Description:** Create a new page component for viewing practice history with stats, filters, and session list.

**Size:** Large
**Priority:** High
**Dependencies:** Task 3.1, Task 3.2, Task 3.3
**Can run parallel with:** Task 4.3 (Personal Status Badges)

**Technical Requirements:**
- Display aggregate statistics in stat cards
- Show filterable list of practice sessions
- Support date range filtering
- Support song filtering
- Responsive layout for mobile and desktop

**Implementation:**

Create file: `src/components/PracticeHistory.tsx`

```tsx
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './primitives/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './primitives/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './primitives/table';
import { Badge } from './primitives/badge';
import { Input } from './primitives/input';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { EmptyState } from './ui/EmptyState';
import { usePracticeSessions } from '../hooks/usePracticeSessions';
import { usePracticeStats } from '../hooks/usePracticeStats';
import { useAllUserSongStatuses } from '../hooks/useUserSongStatus';
import type { Song, UserSongStatus } from '../types';
import { Music, Clock, Target, Trophy, CalendarDays } from 'lucide-react';

interface PracticeHistoryProps {
  songs: Song[];
  currentUserId: string | null;
  currentBandId: string | null;
}

// Helper functions
function formatMinutesToHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getStatusVariant(status: UserSongStatus): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'Mastered':
      return 'default';
    case 'Learned':
      return 'secondary';
    case 'Learning':
      return 'outline';
    default:
      return 'outline';
  }
}

export const PracticeHistory: React.FC<PracticeHistoryProps> = ({
  songs,
  currentUserId,
  currentBandId,
}) => {
  const [selectedSongFilter, setSelectedSongFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    start: getDateDaysAgo(30),
    end: getTodayDate(),
  });

  // Build filters object
  const filters = useMemo(
    () => ({
      songId: selectedSongFilter !== 'all' ? selectedSongFilter : undefined,
      startDate: dateRange.start,
      endDate: dateRange.end,
    }),
    [selectedSongFilter, dateRange]
  );

  // Fetch data
  const { sessions, isLoading: sessionsLoading, error: sessionsError } = usePracticeSessions(
    currentUserId,
    currentBandId,
    filters
  );
  const { stats, isLoading: statsLoading, error: statsError } = usePracticeStats(
    currentUserId,
    currentBandId,
    dateRange
  );
  const { statuses } = useAllUserSongStatuses(currentUserId, currentBandId);

  // Create song lookup map
  const songMap = useMemo(
    () => new Map(songs.map((s) => [s.id, s])),
    [songs]
  );

  const getSongTitle = (songId: string) => songMap.get(songId)?.title || 'Unknown Song';

  const getStatusForSong = (songId: string): UserSongStatus => {
    return statuses.get(songId)?.status || 'Not Started';
  };

  const isLoading = sessionsLoading || statsLoading;
  const error = sessionsError || statsError;

  if (!currentUserId) {
    return (
      <EmptyState
        icon={<Music className="h-12 w-12" />}
        title="Link Your Account"
        description="Link your account to a band member to track your practice sessions."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<Music className="h-12 w-12" />}
        title="Error Loading Data"
        description={error.message}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Practice History</h1>
        <p className="text-muted-foreground">
          Track your progress and practice sessions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Total Sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalSessions || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Total Practice Time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatMinutesToHours(stats?.totalMinutes || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Songs Learned
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.songsLearned || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Songs Mastered
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.songsMastered || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 flex flex-wrap gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Song</label>
            <Select value={selectedSongFilter} onValueChange={setSelectedSongFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Songs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Songs</SelectItem>
                {songs.map((song) => (
                  <SelectItem key={song.id} value={song.id}>
                    {song.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">From</label>
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              className="w-[160px]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">To</label>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              className="w-[160px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <EmptyState
              icon={<Music className="h-8 w-8" />}
              title="No Practice Sessions"
              description="Start logging your practice to see your progress here!"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Song</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="hidden md:table-cell">Tempo</TableHead>
                    <TableHead className="hidden lg:table-cell">Sections</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(session.date)}
                      </TableCell>
                      <TableCell>{getSongTitle(session.songId)}</TableCell>
                      <TableCell>{session.durationMinutes} min</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {session.tempoBpm ? `${session.tempoBpm} BPM` : '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {session.sectionsPracticed?.join(', ') || 'All'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(getStatusForSong(session.songId))}>
                          {getStatusForSong(session.songId)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-xs truncate">
                        {session.notes || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
```

**Acceptance Criteria:**
- [ ] Shows "Link Your Account" message when user not authenticated
- [ ] Displays loading spinner while fetching data
- [ ] Displays error message on fetch failure
- [ ] Stats cards show correct values (sessions, time, learned, mastered)
- [ ] Song filter dropdown includes "All Songs" and all band songs
- [ ] Date range inputs filter sessions correctly
- [ ] Sessions table displays all relevant columns
- [ ] Sessions are sorted by date descending
- [ ] Status badge shows correct variant based on status
- [ ] Empty state shown when no sessions exist
- [ ] Responsive layout hides less important columns on mobile
- [ ] Uses existing project primitives and UI components

---

### Task 4.3: Add Personal Status Badges to Song Lists

**Description:** Update song list displays to show personal learning status alongside band status.

**Size:** Medium
**Priority:** Medium
**Dependencies:** Task 3.2
**Can run parallel with:** Task 4.2 (Practice History Page)

**Technical Requirements:**
- Show both band status and personal status badges
- Fetch user statuses efficiently (batch fetch)
- Handle case where user has no status for a song
- Use consistent badge styling

**Implementation:**

The personal status badge should be added wherever songs are displayed (SetlistManager, Dashboard, etc.). Here's an example integration pattern:

```tsx
// src/components/SongStatusBadges.tsx (NEW - reusable component)
import { Badge } from './primitives/badge';
import type { Song, UserSongProgress, UserSongStatus } from '../types';

interface SongStatusBadgesProps {
  song: Song;
  userStatus?: UserSongProgress | null;
  showBandStatus?: boolean;
}

function getBandStatusVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'Ready':
      return 'default';
    case 'In Progress':
      return 'secondary';
    case 'Needs Work':
      return 'destructive';
    default:
      return 'outline';
  }
}

function getUserStatusVariant(status: UserSongStatus): 'default' | 'secondary' | 'outline' {
  switch (status) {
    case 'Mastered':
      return 'default';
    case 'Learned':
      return 'secondary';
    default:
      return 'outline';
  }
}

export const SongStatusBadges: React.FC<SongStatusBadgesProps> = ({
  song,
  userStatus,
  showBandStatus = true,
}) => {
  return (
    <div className="flex gap-2 flex-wrap">
      {showBandStatus && (
        <Badge variant={getBandStatusVariant(song.status)}>
          Band: {song.status}
        </Badge>
      )}
      {userStatus && (
        <Badge variant={getUserStatusVariant(userStatus.status)}>
          You: {userStatus.status}
        </Badge>
      )}
    </div>
  );
};
```

Example usage in a song list:

```tsx
// In any component displaying songs (e.g., SetlistManager.tsx)
import { useAllUserSongStatuses } from '../hooks/useUserSongStatus';
import { SongStatusBadges } from './SongStatusBadges';

// Inside component:
const { statuses } = useAllUserSongStatuses(currentUserId, currentBandId);

// In JSX:
{songs.map(song => (
  <div key={song.id}>
    <span>{song.title}</span>
    <SongStatusBadges
      song={song}
      userStatus={statuses.get(song.id)}
    />
  </div>
))}
```

**Acceptance Criteria:**
- [ ] `SongStatusBadges` component created as reusable UI component
- [ ] Shows band status with appropriate variant (Ready=default, In Progress=secondary, etc.)
- [ ] Shows user status when available
- [ ] Does not show user status badge when no status exists
- [ ] Status badge variants are visually distinguishable
- [ ] Component integrates into SetlistManager song display
- [ ] Component integrates into Dashboard song display (if songs shown)
- [ ] Performance: Batch fetch all statuses rather than per-song queries

---

### Task 4.4: Add Practice History Route

**Description:** Add routing configuration and navigation for the Practice History page.

**Size:** Small
**Priority:** High
**Dependencies:** Task 4.2
**Can run parallel with:** None

**Technical Requirements:**
- Add route to App.tsx
- Add navigation item to sidebar/nav
- Pass required props to PracticeHistory component

**Implementation:**

Update `src/routes.ts`:

```typescript
// Add to ROUTES object:
export const ROUTES = {
  // ... existing routes
  PRACTICE_HISTORY: '/practice-history',
};

// Add to NAV_ITEMS array (if using a nav items config):
export const NAV_ITEMS = [
  // ... existing items
  {
    id: 'practice-history' as const,
    label: 'Practice History',
    path: ROUTES.PRACTICE_HISTORY,
    icon: 'history', // or appropriate icon name
  },
];

// Update getPageTitle function:
export const getPageTitle = (pathname: string): string => {
  // ... existing cases
  if (pathname === ROUTES.PRACTICE_HISTORY) return 'Practice History';
  // ...
};
```

Update `src/App.tsx`:

```tsx
import { PracticeHistory } from './components/PracticeHistory';
import { ROUTES } from './routes';

// Inside Routes component:
<Route
  path={ROUTES.PRACTICE_HISTORY}
  element={
    <PracticeHistory
      songs={songs}
      currentUserId={session?.user?.id || null}
      currentBandId={currentBandId}
    />
  }
/>
```

Update `src/components/Navigation.tsx` (or wherever nav items are rendered):

```tsx
import { History } from 'lucide-react';

// Add icon mapping:
const iconMap: Record<NavItemId, LucideIcon> = {
  // ... existing mappings
  'practice-history': History,
};
```

**Acceptance Criteria:**
- [ ] Route `/practice-history` is configured in App.tsx
- [ ] Navigation item added to sidebar/mobile nav
- [ ] Page title updates correctly when navigating to route
- [ ] PracticeHistory component receives all required props
- [ ] Navigation works on both desktop and mobile
- [ ] Route is accessible only to authenticated users

---

## Phase 5: Testing & Polish

### Task 5.1: Add Unit Tests for Service Methods

**Description:** Write comprehensive unit tests for all practice tracking service methods.

**Size:** Medium
**Priority:** High
**Dependencies:** Task 2.1, Task 2.2, Task 2.3
**Can run parallel with:** Task 5.2 (Hook Tests)

**Technical Requirements:**
- Test happy path for all service methods
- Test error handling for all methods
- Test edge cases (empty data, invalid inputs)
- Mock Supabase client for isolation

**Implementation:**

Create file: `src/services/__tests__/practiceTracking.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabaseStorageService } from '../supabaseStorageService';

// Mock Supabase client
vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
    })),
  },
}));

describe('Practice Tracking Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logPracticeSession', () => {
    it('should log a valid practice session', async () => {
      // Setup mock return value
      const mockSession = {
        id: 'session-1',
        user_id: 'user-1',
        song_id: 'song-1',
        band_id: 'band-1',
        duration_minutes: 30,
        tempo_bpm: 120,
        sections_practiced: ['Intro', 'Verse'],
        notes: 'Worked on timing',
        date: '2025-12-05',
        created_at: '2025-12-05T10:00:00Z',
        updated_at: '2025-12-05T10:00:00Z',
      };

      // ... mock implementation and assertions
    });

    it('should reject duration <= 0', async () => {
      await expect(
        supabaseStorageService.logPracticeSession({
          userId: 'user-1',
          songId: 'song-1',
          bandId: 'band-1',
          durationMinutes: 0,
          date: '2025-12-05',
        })
      ).rejects.toThrow('Practice duration must be greater than 0');
    });

    it('should update last_practiced_at in user_song_status', async () => {
      // Test that upsert is called on user_song_status table
    });
  });

  describe('getPracticeSessions', () => {
    it('should return sessions ordered by date descending', async () => {
      // Test ordering
    });

    it('should filter by songId when provided', async () => {
      // Test songId filter
    });

    it('should filter by date range when provided', async () => {
      // Test date range filter
    });

    it('should return empty array when no sessions exist', async () => {
      // Test empty result
    });
  });

  describe('updateUserSongStatus', () => {
    it('should create new status if none exists', async () => {
      // Test insert path
    });

    it('should update existing status', async () => {
      // Test update path
    });
  });

  describe('getUserSongStatus', () => {
    it('should return null when no status exists', async () => {
      // Test null return
    });

    it('should return status when exists', async () => {
      // Test data return
    });
  });

  describe('calculatePracticeStats', () => {
    it('should calculate correct totals', async () => {
      // Test aggregation
    });

    it('should return zeros for empty data', async () => {
      // Test empty case
    });

    it('should count learned songs correctly', async () => {
      // Test learned = Learned OR Mastered
    });
  });
});
```

**Acceptance Criteria:**
- [ ] All service methods have at least 2 test cases
- [ ] Error handling is tested for each method
- [ ] Edge cases are covered (empty data, null inputs)
- [ ] Tests are isolated (mocked Supabase client)
- [ ] Tests run successfully with `npm test`
- [ ] Code coverage > 80% for service methods

---

### Task 5.2: Add Unit Tests for Custom Hooks

**Description:** Write unit tests for practice tracking custom hooks using React Testing Library.

**Size:** Medium
**Priority:** High
**Dependencies:** Task 3.1, Task 3.2, Task 3.3
**Can run parallel with:** Task 5.1 (Service Tests)

**Technical Requirements:**
- Test hooks in isolation
- Test loading states
- Test error handling
- Test data updates and refetch

**Implementation:**

Create file: `src/hooks/__tests__/usePracticeSessions.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePracticeSessions } from '../usePracticeSessions';

// Mock service
vi.mock('../../services/supabaseStorageService', () => ({
  supabaseStorageService: {
    getPracticeSessions: vi.fn(),
  },
}));

import { supabaseStorageService } from '../../services/supabaseStorageService';

describe('usePracticeSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty sessions when userId is null', async () => {
    const { result } = renderHook(() =>
      usePracticeSessions(null, 'band-1')
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sessions).toEqual([]);
    expect(supabaseStorageService.getPracticeSessions).not.toHaveBeenCalled();
  });

  it('should fetch sessions on mount', async () => {
    const mockSessions = [
      { id: '1', durationMinutes: 30, date: '2025-12-05' },
    ];
    vi.mocked(supabaseStorageService.getPracticeSessions).mockResolvedValue(
      mockSessions as any
    );

    const { result } = renderHook(() =>
      usePracticeSessions('user-1', 'band-1')
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sessions).toEqual(mockSessions);
  });

  it('should set error on fetch failure', async () => {
    vi.mocked(supabaseStorageService.getPracticeSessions).mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(() =>
      usePracticeSessions('user-1', 'band-1')
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error?.message).toBe('Network error');
  });

  it('should refetch when refetch called', async () => {
    vi.mocked(supabaseStorageService.getPracticeSessions).mockResolvedValue([]);

    const { result } = renderHook(() =>
      usePracticeSessions('user-1', 'band-1')
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(supabaseStorageService.getPracticeSessions).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(supabaseStorageService.getPracticeSessions).toHaveBeenCalledTimes(2);
  });
});
```

Similar test files should be created for:
- `src/hooks/__tests__/useUserSongStatus.test.ts`
- `src/hooks/__tests__/usePracticeStats.test.ts`

**Acceptance Criteria:**
- [ ] All hooks have tests for null/undefined inputs
- [ ] Loading state transitions are tested
- [ ] Error handling is tested
- [ ] Refetch functionality is tested
- [ ] `updateStatus` optimistic update and rollback are tested
- [ ] Tests run successfully with `npm test`

---

### Task 5.3: Add Component Tests for Practice Log Dialog

**Description:** Write component tests for the Practice Log Dialog in Performance Mode.

**Size:** Small
**Priority:** Medium
**Dependencies:** Task 4.1
**Can run parallel with:** Task 5.4 (Practice History Tests)

**Technical Requirements:**
- Test dialog opens and closes
- Test form validation
- Test submit behavior
- Test loading states

**Implementation:**

Create/update file: `src/components/__tests__/PerformanceMode.practiceLog.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PerformanceMode } from '../PerformanceMode';

// Mock dependencies
vi.mock('../../services/supabaseStorageService', () => ({
  supabaseStorageService: {
    logPracticeSession: vi.fn(),
    updateUserSongStatus: vi.fn(),
  },
}));

vi.mock('../ui/Toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

import { supabaseStorageService } from '../../services/supabaseStorageService';

describe('PerformanceMode Practice Log', () => {
  const mockSong = {
    id: 'song-1',
    title: 'Test Song',
    bpm: 120,
    parts: [{ name: 'Intro' }, { name: 'Verse' }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not show Log Practice button when not authenticated', () => {
    render(
      <PerformanceMode
        song={mockSong}
        currentUserId={null}
        currentBandId="band-1"
      />
    );

    expect(screen.queryByText('Log Practice')).not.toBeInTheDocument();
  });

  it('should show Log Practice button when authenticated', () => {
    render(
      <PerformanceMode
        song={mockSong}
        currentUserId="user-1"
        currentBandId="band-1"
      />
    );

    expect(screen.getByText('Log Practice')).toBeInTheDocument();
  });

  it('should open dialog when button clicked', async () => {
    render(
      <PerformanceMode
        song={mockSong}
        currentUserId="user-1"
        currentBandId="band-1"
      />
    );

    await userEvent.click(screen.getByText('Log Practice'));

    expect(screen.getByText('Log Practice Session')).toBeInTheDocument();
  });

  it('should show validation error for invalid duration', async () => {
    render(
      <PerformanceMode
        song={mockSong}
        currentUserId="user-1"
        currentBandId="band-1"
      />
    );

    await userEvent.click(screen.getByText('Log Practice'));

    const durationInput = screen.getByLabelText(/duration/i);
    await userEvent.clear(durationInput);
    await userEvent.type(durationInput, '0');

    await userEvent.click(screen.getByText('Save Practice Log'));

    // Verify error toast or validation message
  });

  it('should save practice log successfully', async () => {
    vi.mocked(supabaseStorageService.logPracticeSession).mockResolvedValue({} as any);
    vi.mocked(supabaseStorageService.updateUserSongStatus).mockResolvedValue({} as any);

    render(
      <PerformanceMode
        song={mockSong}
        currentUserId="user-1"
        currentBandId="band-1"
      />
    );

    await userEvent.click(screen.getByText('Log Practice'));
    await userEvent.click(screen.getByText('Save Practice Log'));

    await waitFor(() => {
      expect(supabaseStorageService.logPracticeSession).toHaveBeenCalled();
      expect(supabaseStorageService.updateUserSongStatus).toHaveBeenCalled();
    });
  });
});
```

**Acceptance Criteria:**
- [ ] Test Log Practice button visibility based on auth state
- [ ] Test dialog open/close behavior
- [ ] Test form field interactions
- [ ] Test validation error display
- [ ] Test successful submission
- [ ] Test error handling display
- [ ] Tests run successfully with `npm test`

---

### Task 5.4: Add Component Tests for Practice History Page

**Description:** Write component tests for the Practice History page component.

**Size:** Small
**Priority:** Medium
**Dependencies:** Task 4.2
**Can run parallel with:** Task 5.3 (Practice Log Tests)

**Technical Requirements:**
- Test empty state display
- Test stats card display
- Test filtering behavior
- Test session table rendering

**Implementation:**

Create file: `src/components/__tests__/PracticeHistory.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PracticeHistory } from '../PracticeHistory';

// Mock hooks
vi.mock('../../hooks/usePracticeSessions', () => ({
  usePracticeSessions: vi.fn(),
}));

vi.mock('../../hooks/usePracticeStats', () => ({
  usePracticeStats: vi.fn(),
}));

vi.mock('../../hooks/useUserSongStatus', () => ({
  useAllUserSongStatuses: vi.fn(),
}));

import { usePracticeSessions } from '../../hooks/usePracticeSessions';
import { usePracticeStats } from '../../hooks/usePracticeStats';
import { useAllUserSongStatuses } from '../../hooks/useUserSongStatus';

describe('PracticeHistory', () => {
  const mockSongs = [
    { id: 'song-1', title: 'Song One', status: 'Ready' },
    { id: 'song-2', title: 'Song Two', status: 'In Progress' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePracticeSessions).mockReturnValue({
      sessions: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(usePracticeStats).mockReturnValue({
      stats: {
        totalSessions: 10,
        totalMinutes: 300,
        averageSessionMinutes: 30,
        songsLearned: 5,
        songsMastered: 2,
        recentSessions: [],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(useAllUserSongStatuses).mockReturnValue({
      statuses: new Map(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('should show link account message when not authenticated', () => {
    render(
      <PracticeHistory
        songs={mockSongs}
        currentUserId={null}
        currentBandId="band-1"
      />
    );

    expect(screen.getByText('Link Your Account')).toBeInTheDocument();
  });

  it('should show loading spinner when loading', () => {
    vi.mocked(usePracticeSessions).mockReturnValue({
      sessions: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <PracticeHistory
        songs={mockSongs}
        currentUserId="user-1"
        currentBandId="band-1"
      />
    );

    expect(screen.getByRole('status')).toBeInTheDocument(); // LoadingSpinner
  });

  it('should display stats cards with correct values', () => {
    render(
      <PracticeHistory
        songs={mockSongs}
        currentUserId="user-1"
        currentBandId="band-1"
      />
    );

    expect(screen.getByText('10')).toBeInTheDocument(); // Total sessions
    expect(screen.getByText('5h')).toBeInTheDocument(); // Total time (300 min = 5h)
    expect(screen.getByText('5')).toBeInTheDocument(); // Songs learned
    expect(screen.getByText('2')).toBeInTheDocument(); // Songs mastered
  });

  it('should show empty state when no sessions', () => {
    render(
      <PracticeHistory
        songs={mockSongs}
        currentUserId="user-1"
        currentBandId="band-1"
      />
    );

    expect(screen.getByText('No Practice Sessions')).toBeInTheDocument();
  });

  it('should filter sessions when song filter changed', async () => {
    render(
      <PracticeHistory
        songs={mockSongs}
        currentUserId="user-1"
        currentBandId="band-1"
      />
    );

    // Open song filter dropdown and select a song
    const songFilter = screen.getByRole('combobox');
    await userEvent.click(songFilter);
    await userEvent.click(screen.getByText('Song One'));

    // Verify hook was called with filter
    await waitFor(() => {
      expect(usePracticeSessions).toHaveBeenCalledWith(
        'user-1',
        'band-1',
        expect.objectContaining({ songId: 'song-1' })
      );
    });
  });
});
```

**Acceptance Criteria:**
- [ ] Test unauthenticated state display
- [ ] Test loading state display
- [ ] Test stats cards show correct values
- [ ] Test empty state when no sessions
- [ ] Test session table rendering with data
- [ ] Test song filter changes fetch parameters
- [ ] Test date range filter changes fetch parameters
- [ ] Tests run successfully with `npm test`

---

## Summary

### Phase Overview

| Phase | Tasks | Description |
|-------|-------|-------------|
| Phase 1 | 1.1-1.3 | Database Foundation - Migration, TypeScript types, type generation |
| Phase 2 | 2.1-2.3 | Service Layer - Practice sessions, user song status, stats calculator |
| Phase 3 | 3.1-3.3 | Custom Hooks - usePracticeSessions, useUserSongStatus, usePracticeStats |
| Phase 4 | 4.1-4.4 | UI Components - Practice log dialog, history page, status badges, routing |
| Phase 5 | 5.1-5.4 | Testing & Polish - Service tests, hook tests, component tests |

### Parallel Execution Opportunities

The following tasks can be executed in parallel:

**Phase 1:**
- Task 1.1 (Migration) || Task 1.2 (TypeScript Types)

**Phase 2:**
- Task 2.1 (Practice Session Service) || Task 2.2 (User Song Status Service)

**Phase 3:**
- Task 3.1 (usePracticeSessions) || Task 3.2 (useUserSongStatus)
- Task 3.3 (usePracticeStats) || Task 4.1 (Practice Log Dialog)

**Phase 4:**
- Task 4.2 (Practice History Page) || Task 4.3 (Personal Status Badges)

**Phase 5:**
- Task 5.1 (Service Tests) || Task 5.2 (Hook Tests)
- Task 5.3 (Practice Log Tests) || Task 5.4 (Practice History Tests)

### Critical Path

1. Task 1.1 (Migration) → Task 1.3 (Type Gen) → Task 2.1/2.2 (Services)
2. Task 2.1/2.2 → Task 3.1/3.2 (Hooks) → Task 4.1/4.2 (UI Components)
3. Task 4.2 → Task 4.4 (Routing)

### Total Tasks: 16

| Size | Count |
|------|-------|
| Small | 5 |
| Medium | 8 |
| Large | 3 |
