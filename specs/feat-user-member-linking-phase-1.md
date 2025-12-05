# User-Member Linking: Phase 1 - Foundation

| Field       | Value                                       |
| ----------- | ------------------------------------------- |
| **Status**  | Active                                      |
| **Authors** | Claude (AI Assistant)                       |
| **Created** | 2025-12-02                                  |
| **Updated** | 2025-12-05                                  |
| **Priority**| High                                        |
| **Type**    | Feature                                     |

---

## Summary

Establish the foundation for linking Supabase auth users to BandMember records, enabling personalized features. This phase adds the database schema, UI for claiming existing members, and automatic linking during invitation acceptance.

---

## Problem

- `BandMember` entities are currently just data records with no connection to Supabase auth users
- Users cannot have personalized preferences (preferred instrument, track defaults)
- No way to distinguish "my" assignments from other members' assignments
- Users cannot track their individual practice progress or maintain personal notes
- Multiple users may represent the same person (e.g., "John" created by admin vs "John's" user account)

---

## Proposed Solution

Add a nullable `user_id` foreign key to the `band_members` table, allowing members to optionally link to a Supabase auth user. This phase establishes the foundation for personalized features by enabling the claim member flow:

1. **Claim Member Flow**: Existing band members can claim their member record through Settings
2. **Validation**: Ensure users are band members before allowing claims
3. **Foundation**: Prepare data model for practice tracking (Phase 2) and personalization (Phase 3)

### Database Schema

```sql
-- Add user_id to band_members
ALTER TABLE band_members
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for efficient user lookups
CREATE INDEX idx_band_members_user_id ON band_members(user_id);

-- Add unique constraint: one user per member per band
CREATE UNIQUE INDEX idx_band_members_user_band
ON band_members(user_id, band_id)
WHERE user_id IS NOT NULL;
```

### TypeScript Types

```typescript
// src/types.ts
export interface BandMember {
  id: string;
  name: string;
  roles: string[];
  avatarColor?: AvatarColorClass;
  userId?: string | null; // NEW: Link to auth.users
}
```

### Database Types Update

```typescript
// src/types/database.types.ts
export type Database = {
  public: {
    Tables: {
      band_members: {
        Row: {
          // ... existing fields
          user_id: string | null; // NEW
        };
        Insert: {
          // ... existing fields
          user_id?: string | null; // NEW
        };
        Update: {
          // ... existing fields
          user_id?: string | null; // NEW
        };
      };
    };
  };
};
```

### UI: Claim Member Flow

Add a new section to Settings > Team tab:

```tsx
// src/components/Settings.tsx (new section in Team tab)

<Card>
  <CardHeader>
    <CardTitle>Link Your Account</CardTitle>
    <CardDescription>
      Connect your user account to a band member record for personalized features
    </CardDescription>
  </CardHeader>
  <CardContent>
    {currentLinkedMember ? (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className={getAvatarColor(currentLinkedMember.avatarColor)}>
            <AvatarFallback>{getInitials(currentLinkedMember.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{currentLinkedMember.name}</p>
            <p className="text-sm text-muted-foreground">
              {currentLinkedMember.roles.join(', ')}
            </p>
          </div>
        </div>
      </div>
    ) : (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Select the band member that represents you:
        </p>
        <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a member" />
          </SelectTrigger>
          <SelectContent>
            {unlinkedMembers.map(member => (
              <SelectItem key={member.id} value={member.id}>
                {member.name} ({member.roles.join(', ')})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={handleClaimMember}
          disabled={!selectedMemberId}
        >
          Claim Member
        </Button>
      </div>
    )}
  </CardContent>
</Card>
```

### Service Layer Methods

The following service methods must be implemented in `src/services/supabaseStorageService.ts`:

```typescript
/**
 * Claim a band member record by linking it to the current user
 * @throws Error if user is not a band member or member is already claimed
 */
async function claimMember(
  userId: string,
  memberId: string,
  bandId: string
): Promise<void> {
  // 1. Verify user is a member of the band via user_bands
  // 2. Verify member is not already claimed (user_id is NULL)
  // 3. Update band_members.user_id = userId
  // 4. Handle constraint violations with clear error messages
}

/**
 * Get the member record linked to a specific user in a band
 * @returns BandMember if linked, null if not linked
 */
async function getLinkedMemberForUser(
  userId: string,
  bandId: string
): Promise<BandMember | null> {
  // Query band_members WHERE user_id = userId AND band_id = bandId
}

/**
 * Get all unlinked members in a band (user_id IS NULL)
 * @returns Array of BandMember records available for claiming
 */
async function getUnlinkedMembers(
  bandId: string
): Promise<BandMember[]> {
  // Query band_members WHERE user_id IS NULL AND band_id = bandId
}
```

### Error Handling

All operations must handle the following error scenarios:

| Error Scenario | User-Facing Message | Technical Handling |
|----------------|---------------------|-------------------|
| User not in band | "You must be a member of this band to claim a member record" | Check `user_bands` before allowing claim |
| Member already claimed | "This member is already linked to another user" | Check unique constraint violation, show friendly message |
| Network failure | "Connection lost. Please try again." | Catch network errors, allow retry |
| No unlinked members | "All members are already linked. Contact your band admin." | Show empty state in UI |
| Concurrent claim | "This member was just claimed by someone else" | Handle unique constraint race condition |

---

## Database Changes

1. Add `user_id` column to `band_members` table (nullable UUID FK to `auth.users`)
2. Add index on `user_id` for efficient lookups
3. Add unique constraint on `(user_id, band_id)` to prevent duplicate links per band

---

## Files Likely Affected

- `/supabase/migrations/YYYYMMDDHHMMSS_add_user_member_linking.sql` (NEW)
- `/src/types/database.types.ts` (regenerate with `npm run types:generate`)
- `/src/types.ts` (add `userId` to BandMember interface)
- `/src/components/Settings.tsx` (add claim member UI to Team tab)
- `/src/services/supabaseStorageService.ts` (add methods for claiming/linking members)
- `/src/hooks/useLinkedMember.ts` (NEW - custom hook for fetching linked member)

---

## Acceptance Criteria

- [ ] Migration adds `user_id` to `band_members` with proper FK and index
- [ ] Migration adds unique constraint on `(user_id, band_id)`
- [ ] Settings > Team tab shows "Link Your Account" section
- [ ] Users can only see "Link Your Account" if they are a member of the current band
- [ ] Only unlinked members appear in the claim dropdown
- [ ] Users can claim an existing unlinked member record
- [ ] Claiming a member updates `band_members.user_id` in the database
- [ ] After claiming, the UI shows which member the user is linked to
- [ ] Users cannot claim a member if they are not a band member (via `user_bands`)
- [ ] Member already claimed by another user shows appropriate error message
- [ ] Multiple users in same band can each link to different members
- [ ] One user cannot claim multiple members in the same band (unique constraint enforced)
- [ ] TypeScript types are updated and match database schema
- [ ] Service methods implement proper error handling for all scenarios
- [ ] Loading states shown during claim operation
- [ ] Success toast displayed after successful claim

---

## Dependencies

None. This is the foundation phase for all subsequent user-member features.

---

## Follow-up Phases

- **Phase 2**: Personal Practice Tracking (depends on this phase)
- **Phase 3**: Personalized Experience (depends on Phase 1 & 2)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Users accidentally claim wrong member | Show clear confirmation with member name and roles before claiming |
| Existing members not linked | Phase 2 & 3 features gracefully handle unlinked members with appropriate messaging |
| Migration fails on existing data | Use nullable FK; test migration on staging database first |
| Users don't understand which member to claim | Provide clear descriptions; consider email matching hints in future |
| Race condition on concurrent claims | Database unique constraint prevents duplicates; show clear error message |

---

## Success Criteria

- [ ] Database schema updated with no breaking changes
- [ ] All TypeScript types match database schema
- [ ] Users can successfully claim member records
- [ ] Claimed member information displays correctly in Settings
- [ ] All error scenarios handled gracefully with user-friendly messages
- [ ] Service layer methods implement proper validation and error handling
- [ ] No existing functionality is broken
- [ ] Code follows project conventions (component hierarchy, imports, etc.)
- [ ] Migration tested on staging database before production deployment
