# User-Member Unlinking

| Field       | Value                                       |
| ----------- | ------------------------------------------- |
| **Status**  | Backlog                                     |
| **Authors** | Claude (AI Assistant)                       |
| **Created** | 2025-12-05                                  |
| **Updated** | 2025-12-05                                  |
| **Priority**| Low                                         |
| **Type**    | Feature                                     |

---

## Summary

Allow users to unlink their account from a band member record. This addresses the case where a user accidentally claims the wrong member.

---

## Problem

- Users who claim the wrong member have no way to undo it
- No self-service option; would require database intervention
- Blocks the correct user from claiming that member

---

## Proposed Solution

Add an "Unlink" button to the Settings > Team tab that allows users to remove their user-member link.

### Database Changes

**New RLS Policy (Migration):**

```sql
-- Allow users to unlink themselves (set user_id to NULL)
CREATE POLICY "Users can unlink themselves from band members"
  ON band_members FOR UPDATE
  TO authenticated
  USING (
    -- Member must be in user's band
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
    -- Member must be currently linked to this user
    AND user_id = auth.uid()
  )
  WITH CHECK (
    -- Member must remain in user's band
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
    -- user_id must be set to NULL (unlinking)
    AND user_id IS NULL
  );
```

### Service Layer

```typescript
// src/services/supabaseStorageService.ts

/**
 * Unlink the current user from their band member record
 * @param userId - Supabase auth user ID
 * @param bandId - Band ID
 * @throws Error if user is not linked to any member in this band
 */
export async function unlinkMember(
  userId: string,
  bandId: string
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  // Find and unlink the member
  const { data, error } = await supabase
    .from('band_members')
    .update({ user_id: null })
    .eq('band_id', bandId)
    .eq('user_id', userId)
    .select('id')
    .single();

  if (error) {
    console.error('Error unlinking member:', error);
    throw new Error('Failed to unlink member');
  }

  if (!data) {
    throw new Error('No linked member found');
  }
}
```

### UI Changes

Update `LinkAccountSection.tsx` to show an unlink button when linked:

```tsx
{linkedMember ? (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Avatar className={getAvatarColor(linkedMember.avatarColor)}>
        <AvatarFallback>{getInitials(linkedMember.name)}</AvatarFallback>
      </Avatar>
      <div>
        <p className="font-medium">{linkedMember.name}</p>
        <p className="text-sm text-muted-foreground">
          {linkedMember.roles.join(', ')}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Badge variant="secondary">Linked</Badge>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowUnlinkDialog(true)}
      >
        <Unlink className="h-4 w-4" />
      </Button>
    </div>
  </div>
) : (
  // ... existing dropdown UI
)}

<DangerousActionDialog
  open={showUnlinkDialog}
  onOpenChange={setShowUnlinkDialog}
  title="Unlink Member"
  description={`Are you sure you want to unlink from "${linkedMember?.name}"? You can link to a different member afterwards.`}
  confirmText="Unlink"
  onConfirm={handleUnlink}
/>
```

---

## Files Affected

- `/supabase/migrations/YYYYMMDDHHMMSS_add_unlink_policy.sql` (NEW)
- `/src/services/supabaseStorageService.ts` (add `unlinkMember`)
- `/src/components/LinkAccountSection.tsx` (add unlink button + dialog)

---

## Acceptance Criteria

- [ ] Migration adds RLS policy for self-unlinking
- [ ] "Unlink" button appears next to linked member badge
- [ ] Clicking unlink shows DangerousActionDialog confirmation
- [ ] Confirming unlink calls `unlinkMember` service method
- [ ] After unlinking, dropdown of available members reappears
- [ ] Success toast shown after unlinking
- [ ] Error handling for failed unlink attempts

---

## Dependencies

- **Requires**: Phase 1 User-Member Linking (complete)

---

## Estimation

Small feature - approximately 1-2 hours of implementation.
