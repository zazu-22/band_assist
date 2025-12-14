# Specification: Practice Priority Setting for My Songs

## 1. Overview
Add a practice priority field to user song status, allowing users to mark songs as low, medium, or high priority. This helps users focus their practice time on the most important songs first by providing visual indicators and potential sorting/filtering capabilities in the My Songs view.

## 2. Problem Statement
Currently, users see their assigned songs in the My Songs view with learning status (Not Started, Learning, Learned, Mastered), but have no way to indicate which songs are most urgent to practice. When a user has many songs assigned, they must mentally track which ones need attention first. This creates cognitive overhead and makes it difficult to prioritize practice sessions effectively.

Without a priority system, users may:
- Waste time deciding what to practice next
- Neglect high-priority songs in favor of easier or more familiar ones
- Lack a clear practice roadmap when preparing for upcoming performances

## 3. Goals
- Allow users to set a practice priority (None, Low, Medium, High) for each song in their My Songs list
- Display priority visually with colored badges that are distinct from learning status badges
- Enable quick inline editing of priority from the My Songs table via the existing actions menu
- Store priority per-user-per-song in the existing `user_song_status` table
- Support filtering/sorting by priority in future iterations

## 4. Non-Goals
- Automated priority suggestions based on upcoming events (future feature)
- Band-wide priority settings (this is personal to each user)
- Priority-based notifications or reminders
- Reordering the My Songs list by drag-and-drop based on priority
- Practice scheduling or calendar integration

## 5. Requirements

### 5.1 Functional Requirements
| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-1 | Add `priority` column to `user_song_status` table | Column exists with type TEXT, CHECK constraint `CHECK (priority IN ('low', 'medium', 'high'))`, NULL allowed (NULL means no priority set), defaults to NULL |
| FR-2 | Display priority badge in My Songs table | Priority badge appears in a new "Priority" column showing None/Low/Medium/High with appropriate colors; column visible on md+ breakpoints |
| FR-3 | Priority badge visual design | High = 'destructive' variant (red), Medium = 'warning' variant (amber), Low = 'info' variant (blue), None = 'outline' variant with `opacity-50` class for faded appearance |
| FR-4 | Inline priority editing via actions menu | Clicking the "..." menu shows "Change Priority" submenu (similar to existing "Change Status" pattern) with None/Low/Medium/High options; current selection shows checkmark |
| FR-5 | Persist priority changes | Selecting a priority calls new `updateUserSongPriority()` service method which updates the database and shows success toast |
| FR-6 | TypeScript types updated | `PracticePriority` type exported from `@/types` with values `'low' | 'medium' | 'high'`, `UserSongProgress` interface extended with optional `priority?: PracticePriority` field |

### 5.2 Technical Requirements
- Database migration numbered `024_add_practice_priority.sql`
- Priority stored as TEXT column with explicit CHECK constraint allowing only 'low', 'medium', 'high' values
- NULL value in database represents "no priority" (displayed as "None" in UI)
- New service method `updateUserSongPriority(userId: string, songId: string, priority: PracticePriority | null)` to keep API simple and avoid breaking existing `updateUserSongStatus` signature
- Priority configuration added to `statusConfig.ts` following existing patterns (PRIORITY_VARIANT_MAP, getPriorityVariant, PRIORITY_OPTIONS)
- Uses existing Badge variants: 'destructive' (red), 'warning' (amber), 'info' (blue), 'outline' (neutral)

## 6. Implementation Approach

### Architecture Decisions
1. **Extend existing table** rather than create new table - priority is a property of user-song relationship like status
2. **Separate service method** for priority updates - keeps API clean, avoids modifying existing `updateUserSongStatus` signature
3. **Use existing Badge variants** - 'destructive', 'warning', 'info' already exist; 'outline' with opacity for "None" state
4. **Follow existing status pattern** - actions menu submenu approach matches current "Change Status" UX for consistency

### Key Components to Create/Modify
1. **Database Migration** (`024_add_practice_priority.sql`):
   - Add nullable TEXT column with CHECK constraint
   - No default value (NULL by default)

2. **Type Definitions** (`src/types.ts`):
   - Add `PracticePriority` type alias
   - Extend `UserSongProgress` interface

3. **Status Config** (`src/lib/statusConfig.ts`):
   - Add `PRIORITY_VARIANT_MAP` mapping priorities to badge variants
   - Add `getPriorityVariant()` function
   - Add `PRIORITY_OPTIONS` array for dropdowns

4. **Service Layer** (`src/services/supabaseStorageService.ts`):
   - Add `updateUserSongPriority()` method (new method, does not modify existing API)
   - Update `transformUserSongProgress()` to include priority field

5. **UI Component** (`src/components/MySongs.tsx`):
   - Add Priority column to table header and rows
   - Add "Change Priority" submenu to actions dropdown
   - Create priority badge display using existing Badge + statusConfig patterns

### Integration Points
- Reuse `SongStatusBadges` pattern for badge rendering consistency
- Integrate with existing `useAllUserSongStatuses` hook (will receive priority data automatically once types updated)
- Follow same toast notification pattern as status updates

## 7. Edge Cases and Error Handling
| Scenario | Expected Behavior |
|----------|-------------------|
| User has no existing `user_song_status` record | Create new record with priority set, status defaults to 'Not Started' per existing behavior |
| User sets priority then clears it (selects "None") | Update priority column to NULL, priority badge shows "None" with faded outline style |
| Network error during priority update | Show error toast "Failed to update priority: [message]", keep previous priority displayed |
| User rapidly changes priority multiple times | Debounce or allow latest request to win; UI shows optimistic update with rollback on error |
| Database migration on existing data | Existing records get NULL priority (no priority set), displayed as "None" |
| User song status record exists without priority | Display "None" badge, priority field is undefined/null in TypeScript |

## 8. Testing Strategy

### Unit Tests
- **`src/lib/statusConfig.test.ts`**: Add tests for `PRIORITY_VARIANT_MAP`, `getPriorityVariant()` (test all priority values including null/undefined), and `PRIORITY_OPTIONS` array structure/ordering
- **`src/services/__tests__/practiceTracking.test.ts`**: Add tests for new `updateUserSongPriority()` method (success, error, null priority cases)
- **New `src/components/ui/PriorityBadge.test.tsx`** (if component extracted): Test badge renders correct variant for each priority value, test that clicking triggers callback with correct value

### Integration Tests
- **MySongs component tests**: Verify priority column renders, verify actions menu includes "Change Priority" submenu, verify selecting priority calls service method

### Manual Validation
- Set priority on a song, refresh page, verify it persists
- Set priority to None, verify NULL stored and faded badge displays
- Test on mobile viewport (priority column should hide)
- Verify priority badge colors are distinct from status badge colors
- Test rapid priority changes to verify no race conditions

## 9. Files to Modify/Create
| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/024_add_practice_priority.sql` | Create | Add priority column to user_song_status table with CHECK constraint |
| `src/types.ts` | Modify | Add `PracticePriority` type, extend `UserSongProgress` with optional priority field |
| `src/types/database.types.ts` | Modify | Regenerate Supabase types to include priority column (run `supabase gen types`) |
| `src/lib/statusConfig.ts` | Modify | Add `PRIORITY_VARIANT_MAP`, `getPriorityVariant()`, `PRIORITY_OPTIONS`, and related types |
| `src/lib/statusConfig.test.ts` | Modify | Add tests for priority configuration (variant map, getter function, options array) |
| `src/services/supabaseStorageService.ts` | Modify | Add `updateUserSongPriority()` method, update `transformUserSongProgress()` to include priority |
| `src/services/__tests__/practiceTracking.test.ts` | Modify | Add tests for `updateUserSongPriority()` method |
| `src/components/MySongs.tsx` | Modify | Add Priority column, add "Change Priority" submenu to actions dropdown, add priority badge rendering |

## 10. Open Questions
None - all requirements are clear.
