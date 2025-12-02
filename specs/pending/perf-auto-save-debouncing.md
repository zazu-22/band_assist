# Performance: Auto-Save Debouncing

| Field | Value |
| ----- | ----- |
| **Status** | Backlog |
| **Priority** | High |
| **Type** | Performance |
| **Created** | 2025-12-02 |

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

## Proposed Solution

Implement debounced auto-save with visual feedback:

**1. Add debounced save hook:**
```typescript
// Add to App.tsx after imports
const useDebouncedSave = (
  callback: () => Promise<void>,
  delay: number,
  deps: React.DependencyList
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await callback();
        setLastSaved(new Date());
      } catch (error) {
        console.error('Save error:', error);
        toast.error('Failed to save changes');
      } finally {
        setIsSaving(false);
      }
    }, delay);

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, deps);

  return { isSaving, lastSaved };
};
```

**2. Replace auto-save effect:**
```typescript
// Replace lines 466-480 in App.tsx
const { isSaving, lastSaved } = useDebouncedSave(
  async () => {
    await StorageService.save(songs, members, availableRoles, events);
  },
  1000, // 1 second debounce
  [songs, members, availableRoles, events, isLoading]
);
```

**3. Add save status indicator to AppShell:**
```typescript
// Update AppContext to include save status
interface AppContextValue {
  // ... existing fields
  isSaving: boolean;
  lastSaved: Date | null;
}

// Pass to AppShell component
<AppShell
  onLogout={handleLogout}
  showLogout={showLogout}
  currentBandName={currentBandName}
  userBands={userBands}
  onSelectBand={handleSelectBand}
  isSaving={isSaving}
  lastSaved={lastSaved}
/>
```

**4. Add visual indicator in AppShell header:**
```typescript
// In AppShell.tsx header, add save status badge
<div className="flex items-center gap-2 text-xs text-muted-foreground">
  {isSaving ? (
    <span className="flex items-center gap-1">
      <Loader2 className="h-3 w-3 animate-spin" />
      Saving...
    </span>
  ) : lastSaved ? (
    <span className="flex items-center gap-1">
      <Check className="h-3 w-3 text-success" />
      Saved {formatRelativeTime(lastSaved)}
    </span>
  ) : null}
</div>
```

## Files Likely Affected

- `/Users/jason/code/personal/band_assist/src/App.tsx` - Main auto-save logic replacement
- `/Users/jason/code/personal/band_assist/src/components/layout/AppShell.tsx` - Add save status indicator
- `/Users/jason/code/personal/band_assist/src/lib/utils.ts` - Add `formatRelativeTime` helper
- `/Users/jason/code/personal/band_assist/src/App.test.tsx` - Add tests for debounced save behavior

## Acceptance Criteria

- [ ] Auto-save debounced to 1000ms after last state change
- [ ] Visual "Saving..." indicator appears during save operations
- [ ] "Saved X seconds ago" indicator shows after successful save
- [ ] Error toast shown if save fails
- [ ] Save triggered immediately on page unload/navigation (add beforeunload handler)
- [ ] No regression in data persistence - all edits saved correctly
- [ ] Performance improvement: < 1 save per second during rapid edits (down from 10-20/sec)
- [ ] Save status visible in AppShell header on all layout routes

## Testing Strategy

**Unit Tests:**
```typescript
// App.test.tsx
describe('Auto-save debouncing', () => {
  it('should debounce saves for 1 second', async () => {
    const mockSave = jest.spyOn(StorageService, 'save');

    // Rapid state changes
    setSongs([...songs, newSong1]);
    setSongs([...songs, newSong2]);
    setSongs([...songs, newSong3]);

    // Should not save immediately
    expect(mockSave).not.toHaveBeenCalled();

    // Wait for debounce
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1), {
      timeout: 1500
    });
  });

  it('should show saving indicator during save', async () => {
    setSongs([...songs, newSong]);

    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  it('should show last saved time after save', async () => {
    setSongs([...songs, newSong]);

    await waitFor(() => {
      expect(screen.getByText(/Saved .* ago/)).toBeInTheDocument();
    });
  });
});
```

**Manual Testing:**
1. Edit song title rapidly - verify only 1 save after stopping
2. Check "Saving..." appears during save
3. Verify "Saved X seconds ago" appears after save
4. Test with network throttling (slow 3G) - ensure no race conditions
5. Test error handling - disconnect network, verify error toast
6. Test beforeunload - close tab during edit, verify save triggered

**Performance Verification:**
- Use Chrome DevTools Network tab to count requests
- **Before**: 10-20 saves during 5 seconds of editing
- **After**: 1 save per edit session
- Measure time to save with `console.time('save')` - should be < 500ms for typical data
