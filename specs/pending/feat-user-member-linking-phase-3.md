# User-Member Linking: Phase 3 - Personalized Experience

| Field       | Value                                       |
| ----------- | ------------------------------------------- |
| **Status**  | Pending                                     |
| **Authors** | Claude (AI Assistant)                       |
| **Created** | 2025-12-02                                  |
| **Updated** | 2025-12-05                                  |
| **Priority**| High                                        |
| **Type**    | Feature                                     |

---

## Summary

Leverage user-member linking and practice tracking data to create a personalized band management experience. This includes a "My Songs" dashboard showing the user's assignments, auto-defaulting to preferred tracks in AlphaTab, personal song notes separate from band annotations, and a smart practice queue.

---

## Problem

- Users must manually search for songs they're assigned to
- AlphaTab always opens to track 0, even if user plays a different instrument
- No way to add personal notes without cluttering band-wide annotations
- Users don't have guidance on which songs to prioritize for practice
- Dashboard shows the same view for all band members regardless of their role
- No personalized "to-do" list based on assignments and learning status

---

## Proposed Solution

Build on Phase 1 (user-member linking) and Phase 2 (practice tracking) to create personalized views and intelligent defaults throughout the app. Add a personal notes system, smart practice recommendations, and role-based UI customization.

### Database Schema

```sql
-- Personal song notes (separate from band annotations)
CREATE TABLE user_song_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  chart_id UUID REFERENCES songs(id), -- Optional: link to specific chart
  line_index INTEGER, -- Optional: link to specific line in text chart
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_song_notes_user_song ON user_song_notes(user_id, song_id);
CREATE INDEX idx_user_song_notes_created ON user_song_notes(created_at DESC);

-- Enable RLS
ALTER TABLE user_song_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own notes
CREATE POLICY user_song_notes_select_own
ON user_song_notes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY user_song_notes_insert_own
ON user_song_notes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_song_notes_update_own
ON user_song_notes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY user_song_notes_delete_own
ON user_song_notes FOR DELETE
USING (auth.uid() = user_id);

-- User preferences table (for personalized AlphaTab and UI settings)
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  preferred_instrument TEXT, -- e.g., "Lead Guitar", "Bass Guitar"
  preferred_track_index INTEGER DEFAULT 0, -- AlphaTab track preference
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, band_id)
);

-- Index for efficient lookups
CREATE INDEX idx_user_preferences_user_band ON user_preferences(user_id, band_id);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- User can read/write their own preferences
CREATE POLICY user_preferences_select_own
ON user_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY user_preferences_insert_own
ON user_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_preferences_update_own
ON user_preferences FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY user_preferences_delete_own
ON user_preferences FOR DELETE
USING (auth.uid() = user_id);
```

### TypeScript Types

```typescript
// src/types.ts

export interface UserPreferences {
  id: string;
  userId: string;
  bandId: string;
  preferredInstrument?: string;
  preferredTrackIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserSongNote {
  id: string;
  userId: string;
  songId: string;
  noteText: string;
  chartId?: string; // Optional link to specific chart
  lineIndex?: number; // Optional link to specific line
  createdAt: string;
  updatedAt: string;
}

export interface PracticeQueueItem {
  song: Song;
  userStatus: UserSongProgress;
  assignment?: Assignment; // User's assignment for this song
  urgencyScore: number; // Calculated score for sorting
  daysUntilTarget?: number; // Days until song.targetDate
  daysSinceLastPractice?: number;
  reason: string; // Why this song is in the queue (e.g., "Assigned, not started")
}

export interface MySongsFilter {
  showAssignedOnly: boolean;
  showInProgressOnly: boolean;
  hideCompleted: boolean;
  sortBy: 'urgency' | 'targetDate' | 'lastPracticed' | 'title';
}
```

### Database Types Update

```typescript
// src/types/database.types.ts
export type Database = {
  public: {
    Tables: {
      // ... existing tables
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          band_id: string;
          preferred_instrument: string | null;
          preferred_track_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          band_id: string;
          preferred_instrument?: string | null;
          preferred_track_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          band_id?: string;
          preferred_instrument?: string | null;
          preferred_track_index?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_song_notes: {
        Row: {
          id: string;
          user_id: string;
          song_id: string;
          note_text: string;
          chart_id: string | null;
          line_index: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          song_id: string;
          note_text: string;
          chart_id?: string | null;
          line_index?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          song_id?: string;
          note_text?: string;
          chart_id?: string | null;
          line_index?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
```

### UI: "My Songs" Dashboard

Add a new dashboard view showing only the user's assigned songs:

```tsx
// src/components/MySongs.tsx (NEW)

export const MySongs: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [myAssignments, setMyAssignments] = useState<Assignment[]>([]);
  const [userStatuses, setUserStatuses] = useState<Map<string, UserSongProgress>>(new Map());
  const [filter, setFilter] = useState<MySongsFilter>({
    showAssignedOnly: true,
    showInProgressOnly: false,
    hideCompleted: false,
    sortBy: 'urgency',
  });

  // Get current user's member record
  const currentMember = useMemo(() => {
    return members.find(m => m.userId === currentUserId);
  }, [members, currentUserId]);

  // Filter songs assigned to current user
  const mySongs = useMemo(() => {
    return songs.filter(song => {
      if (!currentMember) return false;

      // Check if user is assigned to this song
      const isAssigned = song.assignments.some(a => a.memberId === currentMember.id);
      if (filter.showAssignedOnly && !isAssigned) return false;

      // Check user's learning status
      const status = userStatuses.get(song.id);
      if (filter.showInProgressOnly && status?.status !== 'Learning') return false;
      if (filter.hideCompleted && (status?.status === 'Learned' || status?.status === 'Mastered')) {
        return false;
      }

      return true;
    });
  }, [songs, currentMember, userStatuses, filter]);

  // Sort by selected criteria
  const sortedSongs = useMemo(() => {
    return [...mySongs].sort((a, b) => {
      switch (filter.sortBy) {
        case 'urgency':
          return calculateUrgency(b) - calculateUrgency(a);
        case 'targetDate':
          return compareTargetDates(a.targetDate, b.targetDate);
        case 'lastPracticed':
          return compareLastPracticed(
            userStatuses.get(b.id),
            userStatuses.get(a.id)
          );
        case 'title':
        default:
          return a.title.localeCompare(b.title);
      }
    });
  }, [mySongs, filter.sortBy, userStatuses]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Songs</h1>
        <p className="text-muted-foreground">
          Songs assigned to you in {bandName}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Assigned</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{myAssignments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Learning</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {Array.from(userStatuses.values()).filter(s => s.status === 'Learning').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Learned</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {Array.from(userStatuses.values()).filter(s => s.status === 'Learned').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Mastered</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {Array.from(userStatuses.values()).filter(s => s.status === 'Mastered').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Checkbox
                id="assigned-only"
                checked={filter.showAssignedOnly}
                onCheckedChange={(checked) =>
                  setFilter({ ...filter, showAssignedOnly: !!checked })
                }
              />
              <label htmlFor="assigned-only" className="text-sm">
                Assigned to me only
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="in-progress"
                checked={filter.showInProgressOnly}
                onCheckedChange={(checked) =>
                  setFilter({ ...filter, showInProgressOnly: !!checked })
                }
              />
              <label htmlFor="in-progress" className="text-sm">
                In progress only
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="hide-completed"
                checked={filter.hideCompleted}
                onCheckedChange={(checked) =>
                  setFilter({ ...filter, hideCompleted: !!checked })
                }
              />
              <label htmlFor="hide-completed" className="text-sm">
                Hide completed
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Sort by:</label>
            <Select
              value={filter.sortBy}
              onValueChange={(value) =>
                setFilter({ ...filter, sortBy: value as MySongsFilter['sortBy'] })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgency">Urgency</SelectItem>
                <SelectItem value="targetDate">Target Date</SelectItem>
                <SelectItem value="lastPracticed">Last Practiced</SelectItem>
                <SelectItem value="title">Title (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Song List */}
      <div className="grid grid-cols-1 gap-4">
        {sortedSongs.map(song => (
          <MySongCard
            key={song.id}
            song={song}
            assignment={song.assignments.find(a => a.memberId === currentMember?.id)}
            userStatus={userStatuses.get(song.id)}
            onOpenSong={() => navigate(`/songs/${song.id}`)}
          />
        ))}
      </div>
    </div>
  );
};
```

### UI: Personal Notes in Song Detail

Add a personal notes section to the song detail view:

```tsx
// src/components/SongDetail.tsx (add new section)

{currentUserId && (
  <Card>
    <CardHeader>
      <CardTitle>My Notes</CardTitle>
      <CardDescription>
        Personal notes visible only to you
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {personalNotes.map(note => (
        <div key={note.id} className="flex items-start justify-between gap-4 p-3 bg-muted/50 rounded-md">
          <div className="flex-1">
            <p className="text-sm whitespace-pre-wrap">{note.noteText}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(note.createdAt))} ago
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteNote(note.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Textarea
          placeholder="Add a personal note..."
          value={newNoteText}
          onChange={(e) => setNewNoteText(e.target.value)}
        />
        <Button onClick={handleAddNote} disabled={!newNoteText.trim()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Note
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

### UI: User Preferences in Settings

Add preferences section to Settings > Team tab (below the linked member display from Phase 1):

```tsx
// src/components/Settings.tsx (new section in Team tab)

{currentLinkedMember && (
  <Card>
    <CardHeader>
      <CardTitle>Your Preferences</CardTitle>
      <CardDescription>
        Set your default instrument and chart preferences
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div>
        <label className="text-sm font-medium">Preferred Instrument</label>
        <Select
          value={preferences.preferredInstrument || ''}
          onValueChange={handlePreferredInstrumentChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select instrument" />
          </SelectTrigger>
          <SelectContent>
            {availableRoles.map(role => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Used to auto-select the matching track in AlphaTab
        </p>
      </div>
      <div>
        <label className="text-sm font-medium">Default Track Index (AlphaTab)</label>
        <Input
          type="number"
          min="0"
          value={preferences.preferredTrackIndex}
          onChange={(e) => handleTrackIndexChange(parseInt(e.target.value, 10))}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Track index to display by default when opening Guitar Pro files (if instrument match not found)
        </p>
      </div>
    </CardContent>
  </Card>
)}
```

### AlphaTab Auto-Track Selection

Use user preferences to automatically select the preferred track:

```tsx
// src/components/AlphaTabRenderer.tsx

useEffect(() => {
  if (!api || !userPreferences) return;

  // Auto-select user's preferred track if available
  const preferredTrackIndex = userPreferences.preferredTrackIndex || 0;
  const tracks = api.tracks;

  // If user has a preferred instrument, try to find matching track
  if (userPreferences.preferredInstrument) {
    const matchingTrack = tracks.find(track =>
      track.name.toLowerCase().includes(userPreferences.preferredInstrument.toLowerCase())
    );
    if (matchingTrack) {
      api.renderTracks([matchingTrack]);
      return;
    }
  }

  // Fallback to preferred track index
  if (tracks[preferredTrackIndex]) {
    api.renderTracks([tracks[preferredTrackIndex]]);
  }
}, [api, userPreferences]);
```

### Smart Practice Queue

Calculate urgency scores based on multiple factors:

```typescript
// src/lib/practiceQueue.ts (NEW)

interface UrgencyFactors {
  isAssigned: boolean;
  userStatus: UserSongStatus;
  daysUntilTarget?: number;
  daysSinceLastPractice?: number;
  bandStatus: Song['status'];
  hasUpcomingGig: boolean;
}

export function calculateUrgencyScore(factors: UrgencyFactors): number {
  let score = 0;

  // Base urgency from user status
  switch (factors.userStatus) {
    case 'Not Started':
      score += 100; // Highest priority
      break;
    case 'Learning':
      score += 50;
      break;
    case 'Learned':
      score += 10;
      break;
    case 'Mastered':
      score += 0; // No urgency
      break;
  }

  // Assigned songs are more urgent
  if (factors.isAssigned) {
    score += 30;
  }

  // Target date urgency
  if (factors.daysUntilTarget !== undefined) {
    if (factors.daysUntilTarget < 0) {
      score += 50; // Overdue!
    } else if (factors.daysUntilTarget <= 7) {
      score += 40;
    } else if (factors.daysUntilTarget <= 14) {
      score += 20;
    } else if (factors.daysUntilTarget <= 30) {
      score += 10;
    }
  }

  // Practice recency
  if (factors.daysSinceLastPractice !== undefined) {
    if (factors.daysSinceLastPractice > 14) {
      score += 30; // Haven't practiced in 2 weeks
    } else if (factors.daysSinceLastPractice > 7) {
      score += 15;
    }
  }

  // Band status boost
  if (factors.bandStatus === 'Performance Ready' && factors.userStatus !== 'Mastered') {
    score += 40; // Band is ready, you're not!
  }

  // Upcoming gig
  if (factors.hasUpcomingGig) {
    score += 50;
  }

  return score;
}

export function generatePracticeQueue(
  songs: Song[],
  userStatuses: Map<string, UserSongProgress>,
  currentMember: BandMember | null,
  upcomingEvents: BandEvent[]
): PracticeQueueItem[] {
  if (!currentMember) return [];

  const hasUpcomingGig = upcomingEvents.some(
    e => e.type === 'GIG' && isWithinDays(e.date, 14)
  );

  const queue: PracticeQueueItem[] = [];

  for (const song of songs) {
    const userStatus = userStatuses.get(song.id);
    const assignment = song.assignments.find(a => a.memberId === currentMember.id);
    const isAssigned = !!assignment;

    // Skip if not assigned and already mastered
    if (!isAssigned && userStatus?.status === 'Mastered') continue;

    const daysUntilTarget = song.targetDate
      ? daysBetween(new Date(), new Date(song.targetDate))
      : undefined;

    const daysSinceLastPractice = userStatus?.lastPracticedAt
      ? daysBetween(new Date(userStatus.lastPracticedAt), new Date())
      : undefined;

    const urgencyScore = calculateUrgencyScore({
      isAssigned,
      userStatus: userStatus?.status || 'Not Started',
      daysUntilTarget,
      daysSinceLastPractice,
      bandStatus: song.status,
      hasUpcomingGig,
    });

    queue.push({
      song,
      userStatus: userStatus || {
        userId: currentMember.userId!,
        songId: song.id,
        status: 'Not Started',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      assignment,
      urgencyScore,
      daysUntilTarget,
      daysSinceLastPractice,
      reason: generateUrgencyReason(urgencyScore, {
        isAssigned,
        userStatus: userStatus?.status || 'Not Started',
        daysUntilTarget,
        bandStatus: song.status,
      }),
    });
  }

  // Sort by urgency score descending
  return queue.sort((a, b) => b.urgencyScore - a.urgencyScore);
}

function generateUrgencyReason(score: number, factors: Partial<UrgencyFactors>): string {
  if (factors.daysUntilTarget !== undefined && factors.daysUntilTarget < 0) {
    return 'Target date passed!';
  }
  if (factors.isAssigned && factors.userStatus === 'Not Started') {
    return 'Assigned, not started';
  }
  if (factors.daysUntilTarget !== undefined && factors.daysUntilTarget <= 7) {
    return `Due in ${factors.daysUntilTarget} days`;
  }
  if (factors.bandStatus === 'Performance Ready' && factors.userStatus !== 'Mastered') {
    return 'Band is ready, keep practicing';
  }
  if (factors.userStatus === 'Learning') {
    return 'In progress';
  }
  return 'Continue learning';
}
```

### UI: Practice Queue Widget

Add a practice queue widget to the Dashboard:

```tsx
// src/components/PracticeQueueWidget.tsx (NEW)

export const PracticeQueueWidget: React.FC = () => {
  const practiceQueue = useMemo(() => {
    return generatePracticeQueue(songs, userStatuses, currentMember, upcomingEvents);
  }, [songs, userStatuses, currentMember, upcomingEvents]);

  const topPriorities = practiceQueue.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Practice Queue</CardTitle>
        <CardDescription>
          Prioritized list of songs to work on
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topPriorities.map((item, index) => (
            <div
              key={item.song.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-md hover:bg-muted cursor-pointer"
              onClick={() => navigate(`/songs/${item.song.id}`)}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium">{item.song.title}</p>
                  <p className="text-sm text-muted-foreground">{item.reason}</p>
                </div>
              </div>
              <Badge variant={getStatusVariant(item.userStatus.status)}>
                {item.userStatus.status}
              </Badge>
            </div>
          ))}
        </div>
        {practiceQueue.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No songs in practice queue. You're all caught up!
          </p>
        )}
        {practiceQueue.length > 5 && (
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => navigate('/my-songs')}
          >
            View All ({practiceQueue.length} songs)
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
```

---

## Database Changes

1. Create `user_preferences` table for personalized settings
   - `user_id` (FK to auth.users)
   - `band_id` (FK to bands)
   - `preferred_instrument` (TEXT, nullable)
   - `preferred_track_index` (INTEGER, default 0)
   - Unique constraint on `(user_id, band_id)`
   - Enable RLS with policies for users to manage their own preferences

2. Create `user_song_notes` table for personal notes
   - `user_id` (FK to auth.users)
   - `song_id` (FK to songs)
   - `note_text` (text, required)
   - `chart_id` (FK to charts, nullable - for chart-specific notes)
   - `line_index` (integer, nullable - for line-specific notes)
   - Indexes on `(user_id, song_id)` and `created_at`
   - Enable RLS with policies for users to manage their own notes

---

## Files Likely Affected

- `/supabase/migrations/YYYYMMDDHHMMSS_add_personalization.sql` (NEW - both preferences and notes)
- `/src/types/database.types.ts` (regenerate)
- `/src/types.ts` (add UserPreferences, UserSongNote, PracticeQueueItem, MySongsFilter)
- `/src/components/Settings.tsx` (add user preferences UI to Team tab)
- `/src/components/MySongs.tsx` (NEW - personalized dashboard)
- `/src/components/MySongCard.tsx` (NEW - card component for my songs)
- `/src/components/SongDetail.tsx` (add personal notes section)
- `/src/components/AlphaTabRenderer.tsx` (auto-select preferred track using preferences)
- `/src/components/PracticeQueueWidget.tsx` (NEW - practice queue widget)
- `/src/components/Dashboard.tsx` (add practice queue widget)
- `/src/services/supabaseStorageService.ts` (add preferences and personal notes CRUD)
- `/src/hooks/useUserPreferences.ts` (NEW - custom hook for user preferences)
- `/src/hooks/usePersonalNotes.ts` (NEW - custom hook for personal notes)
- `/src/hooks/usePracticeQueue.ts` (NEW - custom hook for practice queue)
- `/src/lib/practiceQueue.ts` (NEW - urgency calculation logic)
- `/src/lib/dateUtils.ts` (add helper functions for date calculations)
- `/src/App.tsx` (add route for /my-songs)

---

## Acceptance Criteria

- [ ] Migration creates `user_preferences` table with RLS policies
- [ ] Migration creates `user_song_notes` table with RLS policies
- [ ] Settings > Team tab shows user preferences UI (instrument, track index)
- [ ] Users can set and update their preferred instrument
- [ ] Users can set and update their preferred track index
- [ ] Preferences persist across sessions
- [ ] "My Songs" route displays only assigned songs
- [ ] Quick stats show counts for different learning statuses
- [ ] Filter controls work correctly (assigned only, in progress, hide completed)
- [ ] Sort options properly reorder the song list
- [ ] Personal notes section appears in song detail for logged-in users
- [ ] Users can add, view, and delete personal notes
- [ ] Personal notes are private (not visible to other band members)
- [ ] AlphaTab auto-selects user's preferred track on load
- [ ] Practice queue widget calculates urgency scores correctly
- [ ] Practice queue considers all factors (assignments, target dates, practice history)
- [ ] Practice queue shows top 5 priorities on dashboard
- [ ] Clicking queue items navigates to song detail
- [ ] Non-linked users see appropriate messaging to link their account
- [ ] All features degrade gracefully when user is not linked
- [ ] Code follows project conventions (component hierarchy, imports, performance patterns)

---

## Dependencies

- **Requires**: Phase 1 (User-Member Linking Foundation)
  - Needs `userId` in BandMember to identify current user's member record
  - Needs claim member functionality to be complete
- **Requires**: Phase 2 (Personal Practice Tracking)
  - Needs `user_song_status` table for learning progress data
  - Needs `practice_sessions` table for last practiced date calculations
  - Needs practice stats calculations for urgency scoring

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Practice queue algorithm too simplistic | Start simple, iterate based on user feedback |
| AlphaTab auto-track selection doesn't match user's part | Allow manual override, remember user's choice per song |
| Users overwhelmed by too many personalized features | Gradually introduce features with clear onboarding |
| Personal notes UI clutters song detail page | Use collapsible sections, show count badge when collapsed |

---

## Future Enhancements (Post-Phase 3)

- Smart practice session suggestions based on available time
- Integration with calendar for scheduled practice reminders
- Achievement system (e.g., "10 songs mastered", "7-day practice streak")
- Export personal practice data and notes
- Mobile app with push notifications for practice reminders
- AI-powered practice recommendations based on learning patterns

---

## Success Criteria

- [ ] Database schema supports personal notes with proper privacy
- [ ] All TypeScript types match database schema
- [ ] "My Songs" dashboard provides clear overview of user's workload
- [ ] Personal notes are intuitive and easy to use
- [ ] AlphaTab track selection saves time and frustration
- [ ] Practice queue provides actionable prioritization
- [ ] All personalized features respect user privacy (RLS policies)
- [ ] No existing functionality is broken
- [ ] Performance remains fast even with large datasets
- [ ] Code quality matches or exceeds existing codebase standards
