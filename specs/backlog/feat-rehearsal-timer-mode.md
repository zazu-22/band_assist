# Feature: Rehearsal Timer Mode

| Field | Value |
| ----- | ----- |
| **Status** | Backlog |
| **Priority** | Medium |
| **Type** | Feature |
| **Created** | 2025-12-02 |

---

## Summary

Add a rehearsal timer mode to Practice Room that allows bands to set time budgets per song or section, with visual countdown timers during practice. Includes optional auto-advance to the next song and a post-rehearsal summary showing time allocation across songs.

## Problem

- No way to track time spent practicing each song
- Bands struggle to allocate rehearsal time efficiently
- No accountability for planned vs actual practice time
- Difficult to stick to rehearsal schedule without external timers
- Cannot review how rehearsal time was distributed
- Band leaders manually track time with phone timers (disruptive)

## Proposed Solution

Add timer functionality to Practice Room with planning and tracking:

**Database Schema:**
- `rehearsal_sessions` table:
  - `id` (uuid, primary key)
  - `band_id` (uuid, foreign key to bands)
  - `started_at` (timestamp)
  - `ended_at` (timestamp, nullable)
  - `created_by` (uuid, foreign key to user_bands.user_id)

- `rehearsal_song_times` table:
  - `id` (uuid, primary key)
  - `session_id` (uuid, foreign key to rehearsal_sessions)
  - `song_id` (uuid, foreign key to songs)
  - `planned_minutes` (integer, nullable)
  - `actual_seconds` (integer) - Tracked time spent
  - `started_at` (timestamp)
  - `ended_at` (timestamp, nullable)

**UI Components:**
- `RehearsalTimerPanel` - Timer controls and display in PracticeRoom
- `RehearsalPlanner` - Pre-session: Set time budgets for selected songs
- `RehearsalSummary` - Post-session: Review planned vs actual time
- Visual countdown timer (large, visible display)
- Progress indicator showing time remaining/elapsed
- Song queue with time allocations

**Features:**
- **Planning Mode**: Before starting, select songs and set time budgets
- **Timer Mode**: Active countdown timer for current song
  - Visual + audio alert when time expires
  - Option to extend time (add 5 min, 10 min)
  - Option to skip to next song
  - Auto-advance toggle (auto-skip when time expires)
- **Tracking**: Automatically log actual time spent per song
- **Summary View**: Compare planned vs actual, show time distribution chart
- **Pause/Resume**: Pause entire rehearsal (stops all timers)

**Display:**
- Large countdown display (MM:SS) in Practice Room header
- Color-coded timer (green → yellow → red as time runs low)
- Progress bar below timer
- "Next up" indicator showing upcoming song and time allocation
- Persistent timer (survives page refresh if session active)

## Files Likely Affected

- `src/types.ts` - Add `RehearsalSession`, `RehearsalSongTime` interfaces
- `src/types/database.types.ts` - Add new tables (generated)
- `src/components/PracticeRoom.tsx` - Integrate timer panel and state
- `src/components/rehearsal/RehearsalTimerPanel.tsx` - New component
- `src/components/rehearsal/RehearsalPlanner.tsx` - New component
- `src/components/rehearsal/RehearsalSummary.tsx` - New component
- `src/components/rehearsal/TimerDisplay.tsx` - New component
- `src/hooks/useRehearsalTimer.ts` - Custom hook for timer logic (new file)
- `src/services/supabaseStorageService.ts` - CRUD operations for sessions/times
- `src/lib/audio/timerAlerts.ts` - Audio alert utilities (new file)
- `supabase/migrations/` - New migrations for rehearsal tables

## Acceptance Criteria

- [ ] Database tables created with proper relationships and RLS policies
- [ ] Users can create a rehearsal session with planned song list
- [ ] Users can set time budgets (in minutes) per song during planning
- [ ] Timer starts countdown when song practice begins
- [ ] Large, visible countdown display (MM:SS format)
- [ ] Timer color changes based on remaining time (green/yellow/red)
- [ ] Audio/visual alert when timer expires
- [ ] Users can extend time with preset buttons (+5 min, +10 min)
- [ ] Auto-advance toggle (auto-skip to next song when timer expires)
- [ ] Users can manually skip to next song
- [ ] Pause/resume functionality for entire rehearsal
- [ ] Actual time tracked even if timer expires (continues counting)
- [ ] Summary view shows planned vs actual time per song
- [ ] Summary includes total rehearsal duration
- [ ] Summary displays time distribution chart/graph
- [ ] Session persists across page refreshes (resume if active)
- [ ] Empty state when no rehearsal session active
- [ ] Mobile-friendly timer display (large touch targets)

## Dependencies

- Practice Room component exists
- Songs data available
- User authentication (for created_by tracking)
- Multi-band support (for band_id scoping)
- Audio playback not required (timer is independent of playback)
