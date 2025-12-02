# Performance: Auto-Save Debouncing

| Field | Value |
| ----- | ----- |
| **Status** | Done |
| **Priority** | High |
| **Type** | Performance |
| **Created** | 2025-12-02 |
| **Completed** | 2025-12-02 |

---

## Summary

Auto-save in `App.tsx` triggers on every state change (songs, members, roles, events), causing excessive Supabase API calls. Every keystroke in forms results in an immediate save operation, leading to performance degradation, increased database load, and potential rate limiting issues.

## Problem

**Current Implementation (lines 466-480 in App.tsx):**
```typescript
// Auto-save triggers immediately on ANY state change
useEffect(() => {
  if (isLoading) return;

  const saveData = async () => {
    try {
      await StorageService.save(songs, members, availableRoles, events);
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  saveData();
}, [songs, members, availableRoles, events, isLoading]);
```

**Performance Impact:**
- **Excessive API calls**: Typing a song title fires ~10-20 saves per second
- **Network congestion**: Each save is a full database transaction with multiple table updates
- **Database load**: Unnecessary write operations on Supabase PostgreSQL
- **Poor UX**: No indication of save status, users don't know if their changes are persisted
- **Race conditions**: Rapid saves can cause data inconsistency if updates overlap

**Real-world scenario:**
1. User edits song title "Rock" → "Rock Song"
2. Current: 9 saves triggered (one per character)
3. Expected: 1 save after user stops typing

## Implementation

Implemented debounced auto-save with visual feedback:

1. **Added `formatRelativeTime` helper** in `src/lib/utils.ts` for displaying relative timestamps
2. **Created `SaveStatusIndicator` component** in `src/components/ui/SaveStatusIndicator.tsx` with:
   - Loading spinner during save
   - Check icon with relative time after save
   - Accessible with `role="status"` and `aria-live="polite"`
3. **Replaced auto-save effect in App.tsx** with debounced version:
   - 1 second debounce delay
   - `isSaving` and `lastSaved` state tracking
   - `performSave` callback for reuse
4. **Added beforeunload handler** to save pending changes on page unload
5. **Updated AppShell and MobileNav** to display save status indicator

## Files Changed

- `src/App.tsx` - Debounced auto-save implementation
- `src/components/layout/AppShell.tsx` - Save status display for desktop
- `src/components/layout/MobileNav.tsx` - Save status display for mobile
- `src/components/ui/SaveStatusIndicator.tsx` - New component
- `src/components/ui/index.ts` - Export SaveStatusIndicator
- `src/lib/utils.ts` - Added formatRelativeTime helper

## Acceptance Criteria

- [x] Auto-save debounced to 1000ms after last state change
- [x] Visual "Saving..." indicator appears during save operations
- [x] "Saved X seconds ago" indicator shows after successful save
- [x] Error toast shown if save fails
- [x] Save triggered immediately on page unload/navigation (add beforeunload handler)
- [x] No regression in data persistence - all edits saved correctly
- [x] Performance improvement: < 1 save per second during rapid edits (down from 10-20/sec)
- [x] Save status visible in AppShell header on all layout routes
