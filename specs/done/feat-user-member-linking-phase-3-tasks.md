# Task Breakdown: User-Member Linking Phase 3 - Personalized Experience

Generated: 2025-12-10
Source: specs/pending/feat-user-member-linking-phase-3.md

## Overview

This task breakdown implements Phase 3 of User-Member Linking, which creates a personalized band experience by:
1. Auto-selecting preferred tracks when opening Guitar Pro files
2. Personalizing the Practice Queue on Dashboard using user's learning status
3. Adding a "My Songs" view showing songs assigned to the current user

**Prerequisites**: Phase 1 (User-Member Linking Foundation) ✅ and Phase 2 (Personal Practice Tracking) ✅ are complete.

---

## Phase 1: Database & Type Foundation

### Task 1.1: Add `preferred_instrument` Migration

**Description**: Create Supabase migration to add preferred_instrument column to band_members table
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: None (must be done first)

**File to Create**: `supabase/migrations/022_add_preferred_instrument.sql`

**Implementation**:
```sql
-- supabase/migrations/022_add_preferred_instrument.sql

-- Add preferred_instrument column to band_members
ALTER TABLE band_members ADD COLUMN preferred_instrument TEXT;

-- Comment
COMMENT ON COLUMN band_members.preferred_instrument IS 'User preferred instrument for auto-selecting GP tracks (e.g., "Lead Guitar", "Bass Guitar")';
```

**Post-Migration Steps**:
1. Run migration locally: `supabase db push` or `supabase migration up`
2. Regenerate TypeScript types: `npm run types:generate`

**Acceptance Criteria**:
- [ ] Migration file created in `supabase/migrations/`
- [ ] Migration applies successfully to local database
- [ ] Column appears in band_members table
- [ ] Column accepts TEXT values
- [ ] Existing rows have NULL for the new column

---

### Task 1.2: Update TypeScript Types

**Description**: Add preferredInstrument field to BandMember interface in types.ts
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.1 (migration applied)
**Can run parallel with**: None

**File to Modify**: `src/types.ts`

**Implementation**:
Find the `BandMember` interface and add the new field:

```typescript
// src/types.ts - Update BandMember interface

export interface BandMember {
  id: string;
  name: string;
  roles: string[];
  avatarColor?: AvatarColorClass;
  userId?: string | null;
  preferredInstrument?: string | null; // NEW: For auto-selecting GP tracks
}
```

**Acceptance Criteria**:
- [ ] `preferredInstrument` field added to `BandMember` interface
- [ ] Field is optional (`?`) and allows `string | null`
- [ ] TypeScript compilation succeeds
- [ ] No existing code breaks from this change

---

### Task 1.3: Update Supabase Storage Service

**Description**: Ensure the storage service handles preferredInstrument in member CRUD operations
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.1, Task 1.2
**Can run parallel with**: None

**File to Modify**: `src/services/supabaseStorageService.ts`

**Implementation Details**:
The `SupabaseStorageService` class needs to handle the new column in:
1. Member fetch operations (should auto-include via `*` select)
2. Member update operations (saveMember, updateMember)
3. Member creation operations (addMember)

Check these methods and ensure `preferred_instrument` maps to `preferredInstrument`:

```typescript
// In saveMember or updateMember method - ensure preferredInstrument is included:
const memberData = {
  name: member.name,
  roles: member.roles,
  avatar_color: member.avatarColor,
  user_id: member.userId,
  preferred_instrument: member.preferredInstrument, // NEW
};

// In member fetch/mapping - ensure snake_case to camelCase conversion:
const mapMemberFromDb = (dbMember: DbBandMember): BandMember => ({
  id: dbMember.id,
  name: dbMember.name,
  roles: dbMember.roles,
  avatarColor: dbMember.avatar_color,
  userId: dbMember.user_id,
  preferredInstrument: dbMember.preferred_instrument, // NEW
});
```

**Acceptance Criteria**:
- [ ] `preferredInstrument` field is saved to database when provided
- [ ] `preferredInstrument` field is loaded from database
- [ ] Field correctly maps between camelCase (JS) and snake_case (DB)
- [ ] Existing member operations continue to work
- [ ] Null values are handled correctly

---

## Phase 2: Track Matching Utility

### Task 2.1: Create Track Matcher Utility

**Description**: Create trackMatcher.ts with fuzzy matching logic for GP track names
**Size**: Medium
**Priority**: High
**Dependencies**: None (pure utility)
**Can run parallel with**: Task 1.1, 1.2, 1.3

**File to Create**: `src/lib/trackMatcher.ts`

**Implementation**:
```typescript
// src/lib/trackMatcher.ts (NEW)

import type { TrackInfo } from '@/components/AlphaTabRenderer';

/**
 * Search patterns for matching role names to GP track names.
 * Keys are Band Assist role names, values are lowercase search terms.
 */
const INSTRUMENT_PATTERNS: Record<string, string[]> = {
  'Lead Guitar': ['lead', 'guitar 1', 'gtr 1', 'electric guitar', 'acoustic guitar'],
  'Rhythm Guitar': ['rhythm', 'guitar 2', 'gtr 2'],
  'Bass Guitar': ['bass'],
  'Drums': ['drum', 'percussion', 'beat'],
  'Synthesizer': ['synth', 'key', 'piano', 'organ'],
  'Lead Vocals': ['vocal', 'voice', 'vox'],
  'Backing Vocals': ['backing', 'harmony', 'bgv'],
};

/**
 * Find track index matching user's preferred instrument.
 * Returns null if no match found.
 */
export function findMatchingTrackIndex(
  tracks: TrackInfo[],
  preferredInstrument: string | null | undefined
): number | null {
  if (!preferredInstrument || tracks.length === 0) return null;

  const patterns = INSTRUMENT_PATTERNS[preferredInstrument];
  if (!patterns) {
    // Fallback: try direct substring match on instrument name
    const lowerPref = preferredInstrument.toLowerCase();
    const idx = tracks.findIndex(t => t.name.toLowerCase().includes(lowerPref));
    return idx !== -1 ? idx : null;
  }

  const lowerTrackNames = tracks.map(t => t.name.toLowerCase());

  for (const pattern of patterns) {
    const idx = lowerTrackNames.findIndex(name => name.includes(pattern));
    if (idx !== -1) return idx;
  }

  // Try generic "guitar" match for guitar instruments
  if (preferredInstrument.toLowerCase().includes('guitar')) {
    const idx = lowerTrackNames.findIndex(name => name.includes('guitar') || name.includes('gtr'));
    if (idx !== -1) return idx;
  }

  return null;
}
```

**Acceptance Criteria**:
- [ ] Function exported and importable
- [ ] Returns null when preferredInstrument is null/undefined
- [ ] Returns null when tracks array is empty
- [ ] Matches "Lead Guitar" to tracks named "Lead", "Guitar 1", "Gtr 1", "Electric Guitar"
- [ ] Matches "Bass Guitar" to tracks named "Bass"
- [ ] Matches "Drums" to tracks named "Drums", "Percussion"
- [ ] Falls back to substring match for unknown instrument names
- [ ] Case-insensitive matching

---

### Task 2.2: Write Track Matcher Unit Tests

**Description**: Create unit tests for trackMatcher.ts
**Size**: Medium
**Priority**: Medium
**Dependencies**: Task 2.1
**Can run parallel with**: Phase 1 tasks

**File to Create**: `src/lib/trackMatcher.test.ts`

**Implementation**:
```typescript
// src/lib/trackMatcher.test.ts

import { describe, it, expect } from 'vitest';
import { findMatchingTrackIndex } from './trackMatcher';
import type { TrackInfo } from '@/components/AlphaTabRenderer';

const createTrack = (name: string, index: number = 0): TrackInfo => ({
  index,
  name,
  // Add other required TrackInfo fields with defaults
});

describe('findMatchingTrackIndex', () => {
  describe('returns null for invalid inputs', () => {
    it('returns null when preferredInstrument is null', () => {
      const tracks = [createTrack('Lead Guitar', 0)];
      expect(findMatchingTrackIndex(tracks, null)).toBeNull();
    });

    it('returns null when preferredInstrument is undefined', () => {
      const tracks = [createTrack('Lead Guitar', 0)];
      expect(findMatchingTrackIndex(tracks, undefined)).toBeNull();
    });

    it('returns null when tracks array is empty', () => {
      expect(findMatchingTrackIndex([], 'Lead Guitar')).toBeNull();
    });
  });

  describe('matches Lead Guitar', () => {
    it('matches track named "Lead"', () => {
      const tracks = [createTrack('Bass', 0), createTrack('Lead', 1)];
      expect(findMatchingTrackIndex(tracks, 'Lead Guitar')).toBe(1);
    });

    it('matches track named "Guitar 1"', () => {
      const tracks = [createTrack('Drums', 0), createTrack('Guitar 1', 1)];
      expect(findMatchingTrackIndex(tracks, 'Lead Guitar')).toBe(1);
    });

    it('matches track named "Electric Guitar"', () => {
      const tracks = [createTrack('Electric Guitar', 0)];
      expect(findMatchingTrackIndex(tracks, 'Lead Guitar')).toBe(0);
    });
  });

  describe('matches Bass Guitar', () => {
    it('matches track named "Bass"', () => {
      const tracks = [createTrack('Lead', 0), createTrack('Bass', 1)];
      expect(findMatchingTrackIndex(tracks, 'Bass Guitar')).toBe(1);
    });
  });

  describe('matches Drums', () => {
    it('matches track named "Drums"', () => {
      const tracks = [createTrack('Guitar', 0), createTrack('Drums', 1)];
      expect(findMatchingTrackIndex(tracks, 'Drums')).toBe(1);
    });

    it('matches track named "Percussion"', () => {
      const tracks = [createTrack('Percussion', 0)];
      expect(findMatchingTrackIndex(tracks, 'Drums')).toBe(0);
    });
  });

  describe('case insensitive matching', () => {
    it('matches regardless of track name case', () => {
      const tracks = [createTrack('BASS', 0)];
      expect(findMatchingTrackIndex(tracks, 'Bass Guitar')).toBe(0);
    });
  });

  describe('fallback matching', () => {
    it('uses substring match for unknown instruments', () => {
      const tracks = [createTrack('Violin', 0), createTrack('Cello', 1)];
      expect(findMatchingTrackIndex(tracks, 'Violin')).toBe(0);
    });

    it('tries generic guitar match for guitar instruments', () => {
      const tracks = [createTrack('Guitar Track', 0)];
      expect(findMatchingTrackIndex(tracks, 'Rhythm Guitar')).toBe(0);
    });
  });

  describe('returns null when no match', () => {
    it('returns null when instrument not found', () => {
      const tracks = [createTrack('Piano', 0), createTrack('Strings', 1)];
      expect(findMatchingTrackIndex(tracks, 'Bass Guitar')).toBeNull();
    });
  });
});
```

**Acceptance Criteria**:
- [ ] All tests pass
- [ ] Tests cover null/undefined inputs
- [ ] Tests cover empty tracks array
- [ ] Tests cover each known instrument type
- [ ] Tests cover case insensitivity
- [ ] Tests cover fallback matching
- [ ] Tests cover no-match scenario

---

## Phase 3: Settings UI for Preferred Instrument

### Task 3.1: Add Preferred Instrument Selector to LinkAccountSection

**Description**: Add UI in Settings to select preferred instrument after linking account
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.2, Task 1.3
**Can run parallel with**: Task 2.1, 2.2

**File to Modify**: `src/components/LinkAccountSection.tsx`

**Implementation Details**:
Add after the linked member display section:

```tsx
// src/components/LinkAccountSection.tsx - Add after linked member display

// Add imports at top:
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives';

// Add state and handler:
const [isSavingPreference, setIsSavingPreference] = useState(false);

const handlePreferredInstrumentChange = async (value: string) => {
  if (!linkedMember) return;

  setIsSavingPreference(true);
  try {
    // Update the member with new preferred instrument
    // value of '' means "None" was selected, convert to null
    const preferredInstrument = value === '' ? null : value;
    await onUpdateMember({
      ...linkedMember,
      preferredInstrument,
    });
  } catch (error) {
    console.error('Failed to save preferred instrument:', error);
    // Consider adding toast notification here
  } finally {
    setIsSavingPreference(false);
  }
};

// Add UI after linked member info display:
{linkedMember && (
  <div className="mt-4 pt-4 border-t border-border">
    <Label htmlFor="preferred-instrument">Preferred Instrument</Label>
    <Select
      value={linkedMember.preferredInstrument || ''}
      onValueChange={handlePreferredInstrumentChange}
      disabled={isSavingPreference}
    >
      <SelectTrigger id="preferred-instrument" className="mt-1.5">
        <SelectValue placeholder="Select your instrument..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">None</SelectItem>
        {availableRoles.map(role => (
          <SelectItem key={role} value={role}>
            {role}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <p className="text-xs text-muted-foreground mt-1">
      Auto-selects matching track when opening Guitar Pro files
    </p>
  </div>
)}
```

**Props Requirements**:
- Need access to `linkedMember` (already available from useLinkedMember hook)
- Need access to `availableRoles` (band's roles list)
- Need `onUpdateMember` callback to save changes

**Acceptance Criteria**:
- [ ] Preferred Instrument dropdown appears only when user has linked account
- [ ] Dropdown lists "None" plus all band roles
- [ ] Current preference is selected by default
- [ ] Selecting a role saves to database
- [ ] Selecting "None" clears the preference (sets to null)
- [ ] Loading state shown while saving
- [ ] Error handling for failed saves

---

## Phase 4: Auto-Select Track on GP File Load

### Task 4.1: Add Auto-Select to Practice Room

**Description**: Auto-select matching track when GP file loads in Practice Room
**Size**: Medium
**Priority**: High
**Dependencies**: Task 2.1, Task 1.2
**Can run parallel with**: Task 4.2

**File to Modify**: `src/components/PracticeRoom.tsx`

**Implementation Details**:
1. Import the track matcher utility
2. Get linkedMember from useLinkedMember hook (if not already available)
3. Add track auto-selection in the tracks loaded handler

```tsx
// src/components/PracticeRoom.tsx

// Add import:
import { findMatchingTrackIndex } from '@/lib/trackMatcher';

// Ensure linkedMember is available (may need to pass as prop or use hook)
// Option A: Use hook directly
const { linkedMember } = useLinkedMember(bandId);
// Option B: Receive as prop from App.tsx

// Modify handleTracksLoaded callback:
const handleTracksLoaded = useCallback((tracks: TrackInfo[]) => {
  setAvailableTracks(tracks);

  // Auto-select track if user has preferred instrument
  if (linkedMember?.preferredInstrument && alphaTabHandle.current) {
    const matchingIndex = findMatchingTrackIndex(tracks, linkedMember.preferredInstrument);
    if (matchingIndex !== null) {
      alphaTabHandle.current.renderTrack(matchingIndex);
      // Optionally set the track index in state
      setSelectedTrackIndex(matchingIndex);
    }
  }
}, [linkedMember?.preferredInstrument]);
```

**Acceptance Criteria**:
- [ ] When GP file loads, matching track is auto-selected
- [ ] Auto-selection only happens if user has preferred instrument set
- [ ] If no match found, defaults to first track (existing behavior)
- [ ] Manual track selection still works after auto-selection
- [ ] Auto-selection happens once on file load, not repeatedly

---

### Task 4.2: Add Auto-Select to Song Detail

**Description**: Auto-select matching track when viewing GP chart in Song Detail
**Size**: Medium
**Priority**: High
**Dependencies**: Task 2.1, Task 1.2
**Can run parallel with**: Task 4.1

**File to Modify**: `src/components/SongDetail.tsx`

**Implementation Details**:
Same pattern as Practice Room:

```tsx
// src/components/SongDetail.tsx

// Add import:
import { findMatchingTrackIndex } from '@/lib/trackMatcher';

// Ensure linkedMember is available

// Modify tracks loaded handler similar to PracticeRoom:
const handleTracksLoaded = useCallback((tracks: TrackInfo[]) => {
  setAvailableTracks(tracks);

  // Auto-select track if user has preferred instrument
  if (linkedMember?.preferredInstrument && alphaTabHandle.current) {
    const matchingIndex = findMatchingTrackIndex(tracks, linkedMember.preferredInstrument);
    if (matchingIndex !== null) {
      alphaTabHandle.current.renderTrack(matchingIndex);
    }
  }
}, [linkedMember?.preferredInstrument]);
```

**Acceptance Criteria**:
- [ ] When viewing GP chart in Song Detail, matching track is auto-selected
- [ ] Auto-selection only happens if user has preferred instrument set
- [ ] If no match found, defaults to first track
- [ ] Manual track selection still works
- [ ] Works consistently with Practice Room behavior

---

## Phase 5: Personalized Dashboard Urgency

### Task 5.1: Extend Urgency Weights and Calculation

**Description**: Update Dashboard urgency calculation to include user learning status
**Size**: Large
**Priority**: High
**Dependencies**: Phase 2 complete (user_song_status exists)
**Can run parallel with**: Phase 4 tasks

**File to Modify**: `src/components/Dashboard.tsx`

**Implementation Details**:

1. Extend URGENCY_WEIGHTS constant:

```typescript
// src/components/Dashboard.tsx - Extend URGENCY_WEIGHTS

export const URGENCY_WEIGHTS = {
  // Existing weights (keep these)
  NO_CHARTS: 30,
  NO_BACKING_TRACK: 5,
  UNASSIGNED: 20,
  OVERDUE: 50,
  DUE_WITHIN_3_DAYS: 40,
  DUE_WITHIN_7_DAYS: 25,
  STATUS_TO_LEARN: 15,
  STATUS_IN_PROGRESS: 5,

  // NEW: User learning status weights
  USER_NOT_STARTED: 60,      // I haven't started this song yet
  USER_LEARNING: 30,         // I'm actively learning this
  USER_BAND_READY_NOT_ME: 40, // Band is Performance Ready but I'm not Mastered
} as const;
```

2. Update calculateSongUrgency function signature and logic:

```typescript
// src/components/Dashboard.tsx - Extend calculateSongUrgency

export function calculateSongUrgency(
  song: Song,
  today: Date,
  userStatus?: UserSongProgress | null,
  isAssignedToUser?: boolean
): SongWithUrgency {
  const issues: SongIssue[] = [];
  let score = 0;

  // Skip performance ready songs UNLESS user isn't mastered
  if (song.status === 'Performance Ready') {
    // But add penalty if user isn't mastered
    if (userStatus && userStatus.status !== 'Mastered') {
      score += URGENCY_WEIGHTS.USER_BAND_READY_NOT_ME;
      issues.push({ label: 'You: not mastered', severity: 'medium' });
    } else {
      return { song, score: 0, issues: [] };
    }
  }

  // ... existing logic for NO_CHARTS, NO_BACKING_TRACK, UNASSIGNED, target dates ...
  // Keep all existing weight calculations

  // NEW: User learning status scoring
  if (isAssignedToUser && userStatus) {
    switch (userStatus.status) {
      case 'Not Started':
        score += URGENCY_WEIGHTS.USER_NOT_STARTED;
        issues.push({ label: 'You: not started', severity: 'high' });
        break;
      case 'Learning':
        score += URGENCY_WEIGHTS.USER_LEARNING;
        issues.push({ label: 'You: learning', severity: 'medium' });
        break;
      // Learned and Mastered don't add urgency
    }
  } else if (isAssignedToUser && !userStatus) {
    // Assigned but never tracked = not started
    score += URGENCY_WEIGHTS.USER_NOT_STARTED;
    issues.push({ label: 'You: not started', severity: 'high' });
  }

  return { song, score, issues };
}
```

3. Update where calculateSongUrgency is called to pass user data:

```typescript
// In the component, when calculating urgencies:
const urgentSongs = useMemo(() => {
  return songs
    .map(song => {
      const userStatus = userStatuses?.get(song.id);
      const isAssigned = linkedMember
        ? song.assignments.some(a => a.memberId === linkedMember.id)
        : false;
      return calculateSongUrgency(song, today, userStatus, isAssigned);
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);
}, [songs, today, userStatuses, linkedMember]);
```

**Acceptance Criteria**:
- [ ] New urgency weights added for user-specific statuses
- [ ] calculateSongUrgency accepts optional userStatus and isAssignedToUser
- [ ] Songs user hasn't started get USER_NOT_STARTED weight
- [ ] Songs user is learning get USER_LEARNING weight
- [ ] Performance Ready songs show urgency if user isn't mastered
- [ ] Existing urgency logic continues to work
- [ ] No regressions in urgency calculation

---

### Task 5.2: Update Dashboard Props and Data Flow

**Description**: Update Dashboard component props to accept user data
**Size**: Medium
**Priority**: High
**Dependencies**: Task 5.1
**Can run parallel with**: None

**File to Modify**: `src/components/Dashboard.tsx`

**Implementation Details**:

1. Update DashboardProps interface:

```typescript
// src/components/Dashboard.tsx - Update props interface

interface DashboardProps {
  songs: Song[];
  members: BandMember[];
  events?: BandEvent[];
  onNavigateToSong: (songId: string) => void;
  // NEW: For personalized urgency
  currentUserId?: string | null;
  linkedMember?: BandMember | null;
  userStatuses?: Map<string, UserSongProgress>;
}
```

2. Use props in component:

```typescript
export const Dashboard: React.FC<DashboardProps> = ({
  songs,
  members,
  events = [],
  onNavigateToSong,
  currentUserId,
  linkedMember,
  userStatuses,
}) => {
  // ... use these in urgency calculation
};
```

**Acceptance Criteria**:
- [ ] DashboardProps includes new optional props
- [ ] Component compiles with TypeScript
- [ ] Props are optional so Dashboard works without them (backward compatible)
- [ ] Existing Dashboard usage doesn't break

---

### Task 5.3: Pass User Data to Dashboard from App.tsx

**Description**: Wire up user data from App.tsx to Dashboard component
**Size**: Medium
**Priority**: High
**Dependencies**: Task 5.2
**Can run parallel with**: None

**File to Modify**: `src/App.tsx`

**Implementation Details**:

```tsx
// src/App.tsx - Pass user data to Dashboard

// Ensure hooks are used (may already be present):
const { linkedMember } = useLinkedMember(currentBandId);
const { statuses: userStatuses } = useAllUserSongStatuses(currentUserId, currentBandId);

// In route rendering for Dashboard:
<Dashboard
  songs={songs}
  members={members}
  events={events}
  onNavigateToSong={handleNavigateToSong}
  currentUserId={currentUserId}
  linkedMember={linkedMember}
  userStatuses={userStatuses}
/>
```

**Acceptance Criteria**:
- [ ] Dashboard receives currentUserId prop
- [ ] Dashboard receives linkedMember prop
- [ ] Dashboard receives userStatuses Map prop
- [ ] Dashboard displays personalized urgency when user is linked
- [ ] Dashboard still works when user is not linked (graceful fallback)

---

## Phase 6: My Songs View

### Task 6.1: Create MySongs Component

**Description**: Create new MySongs component showing user's assigned songs
**Size**: Large
**Priority**: High
**Dependencies**: Phase 5 complete (urgency calculation)
**Can run parallel with**: Task 6.2

**File to Create**: `src/components/MySongs.tsx`

**Implementation**:
```tsx
// src/components/MySongs.tsx (NEW)

import React, { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Play, ArrowRight } from 'lucide-react';
import { Button, Card, CardContent } from '@/components/primitives';
import { EmptyState, StatusBadge } from '@/components/ui';
import { calculateSongUrgency } from '@/components/Dashboard';
import { getLocalToday, formatDaysUntil } from '@/lib/dateUtils';
import { getPracticeRoute, getSongDetailRoute } from '@/routes';
import type { Song, BandMember, UserSongProgress } from '@/types';

interface MySongsProps {
  songs: Song[];
  linkedMember: BandMember | null;
  userStatuses: Map<string, UserSongProgress>;
}

export const MySongs: React.FC<MySongsProps> = memo(function MySongs({
  songs,
  linkedMember,
  userStatuses,
}) {
  const navigate = useNavigate();
  const today = useMemo(() => getLocalToday(), []);

  // Filter to songs assigned to current user
  const mySongs = useMemo(() => {
    if (!linkedMember) return [];

    return songs.filter(song =>
      song.assignments.some(a => a.memberId === linkedMember.id)
    );
  }, [songs, linkedMember]);

  // Sort by urgency (using existing Dashboard logic)
  const sortedSongs = useMemo(() => {
    return [...mySongs]
      .map(song => ({
        song,
        urgency: calculateSongUrgency(
          song,
          today,
          userStatuses.get(song.id),
          true // isAssignedToUser
        ),
      }))
      .sort((a, b) => b.urgency.score - a.urgency.score);
  }, [mySongs, today, userStatuses]);

  // Stats
  const stats = useMemo(() => {
    const statuses = mySongs.map(s => userStatuses.get(s.id)?.status || 'Not Started');
    return {
      total: mySongs.length,
      notStarted: statuses.filter(s => s === 'Not Started').length,
      learning: statuses.filter(s => s === 'Learning').length,
      learned: statuses.filter(s => s === 'Learned').length,
      mastered: statuses.filter(s => s === 'Mastered').length,
    };
  }, [mySongs, userStatuses]);

  if (!linkedMember) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Music}
          title="Link your account"
          description="Link your account to a band member in Settings to see your assigned songs."
          action={{
            label: 'Go to Settings',
            onClick: () => navigate('/settings'),
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-6">
      <header>
        <h2 className="text-3xl font-bold font-serif">My Songs</h2>
        <p className="text-muted-foreground">
          {stats.total} songs assigned to {linkedMember.name}
        </p>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats.notStarted}</p>
            <p className="text-xs text-muted-foreground">Not Started</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats.learning}</p>
            <p className="text-xs text-muted-foreground">Learning</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats.learned}</p>
            <p className="text-xs text-muted-foreground">Learned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats.mastered}</p>
            <p className="text-xs text-muted-foreground">Mastered</p>
          </CardContent>
        </Card>
      </div>

      {/* Song List */}
      {sortedSongs.length === 0 ? (
        <EmptyState
          icon={Music}
          title="No assignments"
          description="You haven't been assigned to any songs yet."
        />
      ) : (
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {sortedSongs.map(({ song }) => {
              const userStatus = userStatuses.get(song.id);
              const assignment = song.assignments.find(a => a.memberId === linkedMember.id);

              return (
                <div
                  key={song.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{song.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {assignment?.role} • {song.artist}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {song.targetDate && (
                      <span className="text-xs text-muted-foreground">
                        {formatDaysUntil(song.targetDate)}
                      </span>
                    )}
                    <StatusBadge status={userStatus?.status || 'Not Started'} />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(getSongDetailRoute(song.id))}
                    >
                      <ArrowRight size={16} />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => navigate(getPracticeRoute(song.id))}
                    >
                      <Play size={14} className="mr-1" />
                      Practice
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
});

MySongs.displayName = 'MySongs';
```

**Acceptance Criteria**:
- [ ] Component displays only songs assigned to linked member
- [ ] Shows role assignment for each song
- [ ] Shows user's learning status badge
- [ ] Songs sorted by urgency (highest first)
- [ ] Quick stats show counts by learning status
- [ ] Navigate to song detail via ArrowRight button
- [ ] Navigate to practice room via Practice button
- [ ] Shows empty state when no assignments
- [ ] Shows link prompt when user not linked

---

### Task 6.2: Add MY_SONGS Route

**Description**: Add MY_SONGS route to routes.ts and navigation
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 6.1

**File to Modify**: `src/routes.ts`

**Implementation**:
```typescript
// src/routes.ts - Add MY_SONGS route

export const ROUTES = {
  // ... existing routes
  DASHBOARD: '/',
  MY_SONGS: '/my-songs', // NEW
  PRACTICE: '/practice',
  // ... rest of routes
} as const;

export const NAV_ITEMS = [
  { id: 'DASHBOARD', path: ROUTES.DASHBOARD, label: 'Dashboard' },
  { id: 'MY_SONGS', path: ROUTES.MY_SONGS, label: 'My Songs' }, // NEW - after Dashboard
  { id: 'PRACTICE', path: ROUTES.PRACTICE, label: 'Practice Room' },
  // ... rest of nav items
] as const;
```

**Also update navigation icon map if needed** in `src/components/layout/Sidebar.tsx`:
```typescript
const iconMap: Record<NavItemId, LucideIcon> = {
  DASHBOARD: LayoutDashboard,
  MY_SONGS: Music, // NEW
  PRACTICE: Headphones,
  // ... rest
};
```

**Acceptance Criteria**:
- [ ] MY_SONGS route constant added
- [ ] Route appears in NAV_ITEMS between Dashboard and Practice Room
- [ ] Icon configured for sidebar navigation
- [ ] Route path is '/my-songs'

---

### Task 6.3: Wire MySongs Route in App.tsx

**Description**: Add MySongs component to App.tsx routing
**Size**: Medium
**Priority**: High
**Dependencies**: Task 6.1, Task 6.2
**Can run parallel with**: None

**File to Modify**: `src/App.tsx`

**Implementation**:
```tsx
// src/App.tsx

// Add import at top:
import { MySongs } from '@/components/MySongs';

// Ensure hooks are used:
const { linkedMember } = useLinkedMember(currentBandId);
const { statuses: userStatuses } = useAllUserSongStatuses(currentUserId, currentBandId);

// Add route in the routing section:
<Route
  path={ROUTES.MY_SONGS}
  element={
    <MySongs
      songs={songs}
      linkedMember={linkedMember}
      userStatuses={userStatuses || new Map()}
    />
  }
/>
```

**Acceptance Criteria**:
- [ ] MySongs component imported
- [ ] Route configured at ROUTES.MY_SONGS path
- [ ] Component receives songs, linkedMember, and userStatuses props
- [ ] Navigation to /my-songs shows MySongs component
- [ ] Works when logged in and user has linked member
- [ ] Shows appropriate empty state when user not linked

---

## Phase 7: Testing & Polish

### Task 7.1: Integration Test - Settings Preference

**Description**: Test that preferred instrument saves and persists
**Size**: Small
**Priority**: Medium
**Dependencies**: Phase 3 complete
**Can run parallel with**: Task 7.2, 7.3

**Test Scenarios**:
1. Navigate to Settings > Team tab
2. Link account to a band member (if not already)
3. Select a preferred instrument from dropdown
4. Verify it saves (loading state, then selected value shown)
5. Refresh page
6. Return to Settings > Team tab
7. Verify preference persisted

**Acceptance Criteria**:
- [ ] Preference selector appears after linking
- [ ] Selection triggers save
- [ ] Value persists after page refresh

---

### Task 7.2: Integration Test - Track Auto-Selection

**Description**: Test track auto-selection in Practice Room and Song Detail
**Size**: Medium
**Priority**: Medium
**Dependencies**: Phase 4 complete
**Can run parallel with**: Task 7.1, 7.3

**Test Scenarios**:
1. Set preferred instrument to "Lead Guitar"
2. Open a song with GP file that has multiple tracks (including guitar)
3. Verify the guitar track is auto-selected (not track 0)
4. Change track manually
5. Navigate away and back
6. Verify auto-selection happens again on load
7. Test with GP file that has no matching track - should default to track 0

**Acceptance Criteria**:
- [ ] Auto-selection works on initial load
- [ ] Manual selection still works
- [ ] Defaults to track 0 when no match
- [ ] Works in both Practice Room and Song Detail

---

### Task 7.3: Integration Test - My Songs View

**Description**: Test My Songs view functionality
**Size**: Medium
**Priority**: Medium
**Dependencies**: Phase 6 complete
**Can run parallel with**: Task 7.1, 7.2

**Test Scenarios**:
1. Navigate to /my-songs without linked account - see link prompt
2. Link account, return to My Songs - see assigned songs
3. Verify only songs where user is assigned appear
4. Verify songs sorted by urgency (not started at top)
5. Click Practice button - navigates to Practice Room
6. Click arrow button - navigates to Song Detail
7. Verify stats cards show correct counts

**Acceptance Criteria**:
- [ ] Empty state shows when not linked
- [ ] Only assigned songs appear
- [ ] Urgency sorting works
- [ ] Navigation buttons work
- [ ] Stats are accurate

---

## Dependency Graph

```
Task 1.1 (Migration)
    ↓
Task 1.2 (Types) ──────────────────┐
    ↓                              │
Task 1.3 (Storage Service)         │
    ↓                              │
Task 3.1 (Settings UI) ◄───────────┤
                                   │
Task 2.1 (Track Matcher) ──────────┼──► Task 4.1 (Practice Room Auto-Select)
    ↓                              │          ↓
Task 2.2 (Track Matcher Tests)     │    Task 4.2 (Song Detail Auto-Select)
                                   │
                                   └──► Task 5.1 (Urgency Weights)
                                            ↓
                                       Task 5.2 (Dashboard Props)
                                            ↓
                                       Task 5.3 (App.tsx Wiring)
                                            ↓
                                   Task 6.1 (MySongs Component) ◄── Task 6.2 (Routes)
                                            ↓
                                       Task 6.3 (App.tsx MySongs Route)
                                            ↓
                              Task 7.1, 7.2, 7.3 (Integration Tests)
```

---

## Parallel Execution Opportunities

### Parallel Group 1 (Foundation)
- Task 1.1 must run first
- After 1.1: Tasks 1.2 and 2.1 can run in parallel

### Parallel Group 2 (Features)
After Phase 1 and Task 2.1 complete:
- Tasks 3.1, 4.1, 4.2, 5.1 can all start in parallel
- Task 6.2 can start immediately (no dependencies)

### Parallel Group 3 (Integration)
After Phase 5 and 6:
- Tasks 7.1, 7.2, 7.3 can all run in parallel

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| GP track names don't match patterns | Medium | Low | Fallback to substring match; manual selection available |
| Dashboard performance with user lookups | Low | Medium | Map-based O(1) lookups; statuses already loaded |
| TypeScript type mismatches | Low | Medium | Types derived from database; regenerate after migration |
| User confusion about "preferred instrument" | Low | Low | Clear UI description text |

---

## Summary

| Phase | Tasks | Effort |
|-------|-------|--------|
| 1. Database & Types | 3 tasks | Small |
| 2. Track Matcher | 2 tasks | Medium |
| 3. Settings UI | 1 task | Medium |
| 4. Auto-Select Track | 2 tasks | Medium |
| 5. Dashboard Urgency | 3 tasks | Large |
| 6. My Songs View | 3 tasks | Large |
| 7. Testing | 3 tasks | Medium |
| **Total** | **17 tasks** | |

**Critical Path**: 1.1 → 1.2 → 5.1 → 5.2 → 5.3 → 6.1 → 6.3 → 7.3
