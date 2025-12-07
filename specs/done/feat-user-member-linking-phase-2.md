# User-Member Linking: Phase 2 - Personal Practice Tracking

| Field       | Value                                       |
| ----------- | ------------------------------------------- |
| **Status**  | Done                                        |
| **Authors** | Claude (AI Assistant)                       |
| **Created** | 2025-12-02                                  |
| **Updated** | 2025-12-07                                  |
| **Completed** | 2025-12-07                                |
| **Priority**| High                                        |
| **Type**    | Feature                                     |

---

## Summary

Enable users to track their individual practice sessions, log progress on specific songs, and maintain a personal "learned" status separate from the band's overall song status. This phase builds on Phase 1's user-member linking foundation.

---

## Problem

- No way for individual band members to track their personal practice time
- Song status is band-wide (e.g., "In Progress"), but members learn at different rates
- Users cannot see their practice history or identify which songs need more work
- No data to support personalized practice recommendations
- Cannot track which sections of a song have been mastered vs still need work

---

## Proposed Solution

Create a `practice_sessions` table to log individual practice activities, and add a `user_song_status` table for personal learning progress. Integrate practice logging into the Practice Room (Performance Mode), and create a personal practice history view.

### Database Schema

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

### TypeScript Types

```typescript
// src/types.ts

export type UserSongStatus = 'Not Started' | 'Learning' | 'Learned' | 'Mastered';

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
```

### Database Types Update

```typescript
// src/types/database.types.ts
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

### UI: Practice Logging in Performance Mode

Add a "Log Practice" button to Performance Mode (Practice Room):

```tsx
// src/components/PerformanceMode.tsx (add to controls area)

<Button
  variant="outline"
  onClick={() => setShowPracticeLogDialog(true)}
  disabled={!currentUserId}
>
  <Clock className="h-4 w-4 mr-2" />
  Log Practice
</Button>

{/* Practice Log Dialog */}
<Dialog open={showPracticeLogDialog} onOpenChange={setShowPracticeLogDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Log Practice Session</DialogTitle>
      <DialogDescription>
        Track your progress on {song.title}
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Duration (minutes)</label>
        <Input
          type="number"
          min="1"
          value={practiceLog.duration}
          onChange={(e) => setPracticeLog({ ...practiceLog, duration: parseInt(e.target.value, 10) })}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Practice Tempo (BPM)</label>
        <Input
          type="number"
          min="1"
          placeholder={`Song tempo: ${song.bpm || 'Unknown'}`}
          value={practiceLog.tempoBpm}
          onChange={(e) => setPracticeLog({ ...practiceLog, tempoBpm: parseInt(e.target.value, 10) })}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Sections Practiced</label>
        <MultiSelect
          options={song.parts.map(p => ({ value: p.name, label: p.name }))}
          selected={practiceLog.sections}
          onChange={(sections) => setPracticeLog({ ...practiceLog, sections })}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Notes</label>
        <Textarea
          placeholder="What did you work on? What needs improvement?"
          value={practiceLog.notes}
          onChange={(e) => setPracticeLog({ ...practiceLog, notes: e.target.value })}
        />
      </div>
      <div>
        <label className="text-sm font-medium">My Status</label>
        <Select
          value={practiceLog.status}
          onValueChange={(status) => setPracticeLog({ ...practiceLog, status })}
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
      <div>
        <label className="text-sm font-medium">Confidence (1-5)</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(level => (
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
      <Button variant="outline" onClick={() => setShowPracticeLogDialog(false)}>
        Cancel
      </Button>
      <Button onClick={handleSavePracticeLog}>
        Save Practice Log
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### UI: Practice History View

Add a new route for viewing practice history:

```tsx
// src/components/PracticeHistory.tsx (NEW)

export const PracticeHistory: React.FC = () => {
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [stats, setStats] = useState<PracticeStats | null>(null);
  const [selectedSongFilter, setSelectedSongFilter] = useState<string | 'all'>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: getDateDaysAgo(30),
    end: getTodayDate(),
  });

  // Fetch sessions and calculate stats
  useEffect(() => {
    loadPracticeSessions();
  }, [selectedSongFilter, dateRange]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Practice History</h1>
        <p className="text-muted-foreground">
          Track your progress and practice sessions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalSessions || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Practice Time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatMinutesToHours(stats?.totalMinutes || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Songs Learned</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.songsLearned || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Songs Mastered</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.songsMastered || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 flex gap-4">
          <Select value={selectedSongFilter} onValueChange={setSelectedSongFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Songs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Songs</SelectItem>
              {songs.map(song => (
                <SelectItem key={song.id} value={song.id}>
                  {song.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Song</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Tempo</TableHead>
                <TableHead>Sections</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map(session => (
                <TableRow key={session.id}>
                  <TableCell>{formatDate(session.date)}</TableCell>
                  <TableCell>{getSongTitle(session.songId)}</TableCell>
                  <TableCell>{session.durationMinutes} min</TableCell>
                  <TableCell>{session.tempoBpm || '—'}</TableCell>
                  <TableCell>
                    {session.sectionsPracticed?.join(', ') || 'All'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(session.status)}>
                      {getStatusForSession(session)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {session.notes || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
```

### Personal Status Badge in Song Lists

Update song list displays to show personal status alongside band status:

```tsx
// src/components/SongList.tsx (or wherever songs are displayed)

<div className="flex gap-2">
  <Badge variant={getBandStatusVariant(song.status)}>
    Band: {song.status}
  </Badge>
  {userSongStatus && (
    <Badge variant={getUserStatusVariant(userSongStatus.status)}>
      You: {userSongStatus.status}
    </Badge>
  )}
</div>
```

### Service Layer Methods

The following service methods must be implemented in `src/services/supabaseStorageService.ts`:

```typescript
/**
 * Log a practice session for a user
 * @throws Error if user is not linked to a member or validation fails
 */
async function logPracticeSession(
  session: Omit<PracticeSession, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PracticeSession> {
  // 1. Validate session data (duration > 0, valid songId, etc.)
  // 2. Insert into practice_sessions table
  // 3. Update user_song_status.last_practiced_at
  // 4. Return created session
}

/**
 * Update user's learning status for a song
 */
async function updateUserSongStatus(
  userId: string,
  songId: string,
  status: UserSongStatus,
  confidence?: number
): Promise<UserSongProgress> {
  // Upsert user_song_status (INSERT ON CONFLICT UPDATE)
}

/**
 * Get practice sessions for a user, optionally filtered
 */
async function getPracticeSessions(
  userId: string,
  bandId: string,
  filters?: {
    songId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<PracticeSession[]> {
  // Query practice_sessions with optional filters and date range
}

/**
 * Calculate aggregate practice statistics for a user
 */
async function calculatePracticeStats(
  userId: string,
  bandId: string,
  dateRange?: { start: string; end: string }
): Promise<PracticeStats> {
  // 1. Count total sessions
  // 2. Sum total minutes
  // 3. Calculate average session duration
  // 4. Count songs learned (user_song_status)
  // 5. Count songs mastered
  // 6. Fetch recent sessions
}

/**
 * Get user's learning status for a specific song
 */
async function getUserSongStatus(
  userId: string,
  songId: string
): Promise<UserSongProgress | null> {
  // Query user_song_status for specific user + song
}

/**
 * Get all song statuses for a user in a band
 */
async function getAllUserSongStatuses(
  userId: string,
  bandId: string
): Promise<Map<string, UserSongProgress>> {
  // Query all user_song_status records, return as Map keyed by songId
}
```

### Error Handling

All operations must handle the following error scenarios:

| Error Scenario | User-Facing Message | Technical Handling |
|----------------|---------------------|-------------------|
| User not linked to member | "Link your account to a band member to track practice" | Check if user has linked member before showing practice log UI |
| Invalid duration (≤0) | "Practice duration must be greater than 0 minutes" | Validate input before submission |
| Song not found | "This song no longer exists" | Handle foreign key violations gracefully |
| Network failure | "Connection lost. Your practice session was not saved. Please try again." | Catch network errors, allow retry with same data |
| Database constraint violation | "Failed to save practice session. Please try again." | Log error details, show generic message to user |
| Empty practice sessions | "No practice sessions found. Start logging your practice to see your progress!" | Show empty state with encouragement |

### State Management

**React State Structure:**

```typescript
// In PerformanceMode.tsx
const [showPracticeLogDialog, setShowPracticeLogDialog] = useState(false);
const [practiceLog, setPracticeLog] = useState({
  duration: 30,
  tempoBpm: song.bpm || undefined,
  sections: [],
  notes: '',
  status: 'Learning' as UserSongStatus,
  confidence: 3,
});
const [isSaving, setIsSaving] = useState(false);

// In PracticeHistory.tsx
const [sessions, setSessions] = useState<PracticeSession[]>([]);
const [stats, setStats] = useState<PracticeStats | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [selectedSongFilter, setSelectedSongFilter] = useState<string | 'all'>('all');
const [dateRange, setDateRange] = useState({
  start: getDateDaysAgo(30),
  end: getTodayDate(),
});
```

**Data Fetching Pattern:**

```typescript
// Custom hook: src/hooks/usePracticeSessions.ts
export function usePracticeSessions(
  userId: string | null,
  bandId: string | null,
  filters?: PracticeFilters
) {
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId || !bandId) return;

    async function load() {
      try {
        setIsLoading(true);
        const data = await getPracticeSessions(userId, bandId, filters);
        setSessions(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [userId, bandId, JSON.stringify(filters)]);

  return { sessions, isLoading, error, refetch: load };
}
```

**Optimistic Updates:**

When logging a practice session:

1. Show loading state on "Save" button
2. Optimistically update local state (add session to list)
3. Make API call
4. On success: Show success toast, close dialog
5. On failure: Revert optimistic update, show error message

---

## Database Changes

1. Create `user_song_status` table for personal learning progress
   - `user_id` (FK to auth.users)
   - `song_id` (FK to songs)
   - `status` (enum: Not Started, Learning, Learned, Mastered)
   - `confidence_level` (1-5 scale, nullable)
   - `last_practiced_at` (timestamp, nullable)
   - Unique constraint on `(user_id, song_id)`

2. Create `practice_sessions` table for practice logs
   - `user_id` (FK to auth.users)
   - `song_id` (FK to songs)
   - `band_id` (FK to bands)
   - `duration_minutes` (integer, required)
   - `tempo_bpm` (integer, nullable)
   - `sections_practiced` (JSONB array, nullable)
   - `notes` (text, nullable)
   - `date` (date, default today)

3. Add indexes on `user_id`, `song_id`, and `date` for efficient queries
4. Enable RLS with policies allowing users to manage their own data
5. Add read-only policy for band admins to view aggregate practice data

---

## Files Likely Affected

- `/supabase/migrations/YYYYMMDDHHMMSS_add_practice_tracking.sql` (NEW)
- `/src/types/database.types.ts` (regenerate)
- `/src/types.ts` (add UserSongProgress, PracticeSession, PracticeStats)
- `/src/components/PerformanceMode.tsx` (add practice log dialog)
- `/src/components/PracticeHistory.tsx` (NEW - practice history view)
- `/src/components/SongList.tsx` (add personal status badges)
- `/src/components/Dashboard.tsx` (add practice stats widgets)
- `/src/services/supabaseStorageService.ts` (add practice session CRUD methods)
- `/src/hooks/usePracticeSessions.ts` (NEW - custom hook for fetching practice data)
- `/src/hooks/useUserSongStatus.ts` (NEW - custom hook for personal song status)
- `/src/hooks/usePracticeStats.ts` (NEW - custom hook for aggregate statistics)
- `/src/App.tsx` (add route for /practice-history)
- `/src/lib/practiceStats.ts` (NEW - helper functions for stats calculations)

---

## Acceptance Criteria

- [x] Migration creates `user_song_status` and `practice_sessions` tables
- [ ] RLS policies correctly restrict access to user's own data
- [x] Performance Mode shows "Log Practice" button for authenticated users
- [x] Practice log dialog captures all required fields
- [x] Saving a practice session updates both `practice_sessions` and `user_song_status`
- [x] Practice History route displays sessions in a table
- [x] Practice stats are calculated correctly (total sessions, time, learned songs)
- [x] Users can filter practice history by song and date range
- [x] Song lists show both band status and personal status badges
- [x] Personal status persists across sessions
- [ ] Practice sessions are scoped to the current band
- [ ] Non-linked users see graceful messaging (e.g., "Link your account to track practice")
- [ ] Code follows project conventions (component hierarchy, imports, performance patterns)

---

## Dependencies

- **Requires**: Phase 1 (User-Member Linking Foundation) must be completed
  - Needs `user_id` in auth context
  - Needs `currentBandId` for scoping sessions

---

## Follow-up Phases

- **Phase 3**: Personalized Experience (uses practice data for smart recommendations)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Users forget to log practice sessions | Add quick-log buttons with pre-filled defaults |
| Practice data grows large over time | Add date indexes; consider archiving old sessions |
| Non-linked users confused by hidden features | Show clear messaging to link account |
| Sections list not matching song structure | Dynamically populate from song.parts |

---

## Success Criteria

- [ ] Database schema supports practice logging with no performance issues
- [ ] All TypeScript types match database schema
- [ ] Practice logging UI is intuitive and fast to use
- [ ] Practice history view provides useful insights
- [ ] Personal status is visible throughout the app
- [ ] No existing functionality is broken
- [ ] Code quality matches or exceeds existing codebase standards
