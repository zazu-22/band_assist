# Task Breakdown: User-Member Linking Phase 1

Generated: 2025-12-05
Source: specs/feat-user-member-linking-phase-1.md
Status: Ready for implementation

## Overview

This task breakdown implements the foundation for linking Supabase auth users to BandMember records. The implementation establishes database schema, service layer methods, and UI for claiming member records, enabling future personalized features like practice tracking and custom preferences.

**Key Deliverables:**
- Database migration adding `user_id` column with constraints
- TypeScript type updates matching database schema
- Service layer methods for claiming and querying linked members
- Settings UI for claiming member records
- Comprehensive error handling for all edge cases

---

## Phase 1: Database Foundation (2 tasks)

### Task 1.1: Create database migration for user_id column
**Description**: Add nullable user_id foreign key to band_members table with proper constraints and indexes
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: None (must complete first)

**Technical Requirements:**
- Add `user_id` column as nullable UUID with FK to `auth.users(id)` with ON DELETE SET NULL
- Create index `idx_band_members_user_id` on `user_id` column
- Create unique partial index `idx_band_members_user_band` on `(user_id, band_id)` WHERE `user_id IS NOT NULL`
- Migration must be idempotent and safe for existing data

**Migration file location:**
`supabase/migrations/[timestamp]_add_user_member_linking.sql`

**Complete SQL implementation:**
```sql
-- Migration: Add user_id to band_members for auth user linking
-- Phase 1: Foundation for user-member linking

-- Add user_id column with foreign key to auth.users
ALTER TABLE band_members
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add comment explaining the column
COMMENT ON COLUMN band_members.user_id IS 'Links band member to Supabase auth user for personalized features';

-- Create index for efficient user lookups
CREATE INDEX idx_band_members_user_id ON band_members(user_id);

-- Create unique constraint: one user can only link to one member per band
-- Use partial index to allow multiple NULL values (unlinked members)
CREATE UNIQUE INDEX idx_band_members_user_band
ON band_members(user_id, band_id)
WHERE user_id IS NOT NULL;

-- Verify the migration
DO $$
BEGIN
  -- Check column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'band_members' AND column_name = 'user_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: user_id column not created';
  END IF;

  -- Check index exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'band_members' AND indexname = 'idx_band_members_user_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: idx_band_members_user_id not created';
  END IF;

  -- Check unique constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'band_members' AND indexname = 'idx_band_members_user_band'
  ) THEN
    RAISE EXCEPTION 'Migration failed: idx_band_members_user_band not created';
  END IF;

  RAISE NOTICE 'Migration verification passed';
END $$;
```

**Acceptance Criteria:**
- [ ] Migration file created in `supabase/migrations/` with proper timestamp
- [ ] `user_id` column added as nullable UUID with FK to `auth.users(id)`
- [ ] ON DELETE SET NULL behavior configured (deleting user sets member's user_id to NULL)
- [ ] Index `idx_band_members_user_id` created for efficient lookups
- [ ] Unique partial index `idx_band_members_user_band` prevents duplicate user-band links
- [ ] Migration includes verification checks
- [ ] Migration can be run multiple times safely (idempotent)
- [ ] Existing band_members data is preserved
- [ ] Foreign key constraint works (trying to insert invalid user_id fails)
- [ ] Unique constraint works (trying to link same user to two members in same band fails)

**Test scenarios:**
1. Run migration on empty database - should succeed
2. Run migration on database with existing band_members - should preserve data
3. Run migration twice - should not error (idempotent)
4. Insert band_member with valid user_id - should succeed
5. Insert band_member with invalid user_id - should fail with FK violation
6. Link user to two members in same band - should fail with unique constraint violation
7. Link user to members in different bands - should succeed

---

### Task 1.2: Regenerate TypeScript database types
**Description**: Regenerate database.types.ts to include new user_id column
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.1 (migration must be applied first)
**Can run parallel with**: None (must run after migration)

**Technical Requirements:**
- Run `npm run types:generate` to regenerate types from Supabase schema
- Verify `band_members` table types include `user_id: string | null`
- Verify Insert type has `user_id?: string | null`
- Verify Update type has `user_id?: string | null`

**Command to run:**
```bash
npm run types:generate
```

**Expected type changes in `src/types/database.types.ts`:**
```typescript
export type Database = {
  public: {
    Tables: {
      band_members: {
        Row: {
          id: string;
          band_id: string;
          name: string;
          roles: string[];
          avatar_color: string | null;
          created_at: string;
          user_id: string | null; // NEW
        };
        Insert: {
          id?: string;
          band_id: string;
          name: string;
          roles: string[];
          avatar_color?: string | null;
          created_at?: string;
          user_id?: string | null; // NEW
        };
        Update: {
          id?: string;
          band_id?: string;
          name?: string;
          roles?: string[];
          avatar_color?: string | null;
          created_at?: string;
          user_id?: string | null; // NEW
        };
      };
      // ... other tables
    };
  };
};
```

**Acceptance Criteria:**
- [ ] Command `npm run types:generate` runs successfully
- [ ] `src/types/database.types.ts` updated with new types
- [ ] `band_members.Row` includes `user_id: string | null`
- [ ] `band_members.Insert` includes `user_id?: string | null`
- [ ] `band_members.Update` includes `user_id?: string | null`
- [ ] TypeScript compilation succeeds (`npm run typecheck`)
- [ ] No existing type definitions are broken
- [ ] Git diff shows only expected changes to database.types.ts

**Test scenarios:**
1. Run type generation after migration - should succeed
2. Run TypeScript type checker - should pass
3. Import database types in test file - should work
4. Access band_members.user_id in TypeScript - should have correct type

---

## Phase 2: TypeScript Types Update (1 task)

### Task 2.1: Update BandMember interface with userId field
**Description**: Add optional userId field to BandMember interface in src/types.ts
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.2 (database types must be generated first)
**Can run parallel with**: None

**Technical Requirements:**
- Add `userId?: string | null` to BandMember interface
- Use camelCase (userId) to match existing TypeScript conventions
- Field should be optional to handle both linked and unlinked members
- Update any type guards or validators that check BandMember shape

**File to modify:** `src/types.ts`

**Complete implementation:**
```typescript
// src/types.ts

export interface BandMember {
  id: string;
  name: string;
  roles: string[];
  avatarColor?: AvatarColorClass;
  userId?: string | null; // NEW: Link to auth.users for personalized features
}

// Type guard to check if member is linked to a user
export function isMemberLinked(member: BandMember): member is BandMember & { userId: string } {
  return member.userId != null;
}

// Helper to get user-linked members from a list
export function getLinkedMembers(members: BandMember[]): Array<BandMember & { userId: string }> {
  return members.filter(isMemberLinked);
}

// Helper to get unlinked members from a list
export function getUnlinkedMembers(members: BandMember[]): BandMember[] {
  return members.filter(member => !isMemberLinked(member));
}
```

**Acceptance Criteria:**
- [ ] `userId` field added to BandMember interface as optional
- [ ] Type is `string | null` to match database schema
- [ ] Field name uses camelCase (userId not user_id)
- [ ] JSDoc comment explains purpose
- [ ] Type guard `isMemberLinked` added for type narrowing
- [ ] Helper functions added for filtering members by link status
- [ ] TypeScript compilation succeeds
- [ ] No existing code breaks from type change
- [ ] Type guards work correctly in tests

**Test scenarios:**
1. Create BandMember without userId - should compile
2. Create BandMember with userId as string - should compile
3. Create BandMember with userId as null - should compile
4. Use isMemberLinked type guard - should narrow type correctly
5. Use helper functions - should filter members correctly

---

## Phase 3: Service Layer Methods (3 tasks)

### Task 3.1: Implement getLinkedMemberForUser service method
**Description**: Add method to fetch the member record linked to a specific user in a band
**Size**: Medium
**Priority**: High
**Dependencies**: Tasks 1.2, 2.1
**Can run parallel with**: Tasks 3.2, 3.3

**Technical Requirements:**
- Query `band_members` WHERE `user_id = userId` AND `band_id = bandId`
- Return `BandMember | null` (null if user has no linked member in this band)
- Handle query errors gracefully
- Map snake_case database fields to camelCase TypeScript fields
- Include proper error logging

**File to modify:** `src/services/supabaseStorageService.ts`

**Complete implementation:**
```typescript
/**
 * Get the member record linked to a specific user in a band
 * @param userId - Supabase auth user ID
 * @param bandId - Band ID to search within
 * @returns BandMember if linked, null if not linked
 * @throws Error if database query fails
 */
export async function getLinkedMemberForUser(
  userId: string,
  bandId: string
): Promise<BandMember | null> {
  try {
    const { data, error } = await supabase
      .from('band_members')
      .select('*')
      .eq('user_id', userId)
      .eq('band_id', bandId)
      .maybeSingle(); // Use maybeSingle to handle 0 or 1 results

    if (error) {
      console.error('Error fetching linked member:', error);
      throw new Error(`Failed to fetch linked member: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    // Map database row to BandMember interface
    return {
      id: data.id,
      name: data.name,
      roles: data.roles,
      avatarColor: data.avatar_color as AvatarColorClass | undefined,
      userId: data.user_id,
    };
  } catch (err) {
    console.error('Unexpected error in getLinkedMemberForUser:', err);
    throw err;
  }
}
```

**Error handling:**
- Network errors: Throw with descriptive message
- Database errors: Log and throw with error details
- No linked member: Return null (not an error)
- Invalid parameters: TypeScript type checking prevents

**Acceptance Criteria:**
- [ ] Function signature matches specification
- [ ] Returns BandMember when user has linked member in band
- [ ] Returns null when user has no linked member in band
- [ ] Throws descriptive error when database query fails
- [ ] Uses maybeSingle() to handle 0 or 1 results correctly
- [ ] Maps snake_case fields to camelCase correctly
- [ ] Includes error logging with context
- [ ] JSDoc comments explain parameters and return type
- [ ] Works with both linked and unlinked users
- [ ] TypeScript types are correct

**Test scenarios:**
1. User with linked member - should return BandMember
2. User with no linked member - should return null
3. User in different band - should return null
4. Invalid userId - should return null
5. Database connection error - should throw with message
6. User linked to member in multiple bands - should return correct member for specified band

---

### Task 3.2: Implement getUnlinkedMembers service method
**Description**: Add method to fetch all members in a band that are not linked to any user
**Size**: Medium
**Priority**: High
**Dependencies**: Tasks 1.2, 2.1
**Can run parallel with**: Tasks 3.1, 3.3

**Technical Requirements:**
- Query `band_members` WHERE `user_id IS NULL` AND `band_id = bandId`
- Return array of BandMember (empty array if all members are linked)
- Handle query errors gracefully
- Map snake_case database fields to camelCase TypeScript fields
- Sort results by name for consistent UI display

**File to modify:** `src/services/supabaseStorageService.ts`

**Complete implementation:**
```typescript
/**
 * Get all unlinked members in a band (user_id IS NULL)
 * @param bandId - Band ID to search within
 * @returns Array of BandMember records available for claiming
 * @throws Error if database query fails
 */
export async function getUnlinkedMembers(
  bandId: string
): Promise<BandMember[]> {
  try {
    const { data, error } = await supabase
      .from('band_members')
      .select('*')
      .eq('band_id', bandId)
      .is('user_id', null)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching unlinked members:', error);
      throw new Error(`Failed to fetch unlinked members: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Map database rows to BandMember interfaces
    return data.map(row => ({
      id: row.id,
      name: row.name,
      roles: row.roles,
      avatarColor: row.avatar_color as AvatarColorClass | undefined,
      userId: row.user_id, // Will be null for all results
    }));
  } catch (err) {
    console.error('Unexpected error in getUnlinkedMembers:', err);
    throw err;
  }
}
```

**Error handling:**
- Network errors: Throw with descriptive message
- Database errors: Log and throw with error details
- No unlinked members: Return empty array (not an error)
- Invalid bandId: Return empty array

**Acceptance Criteria:**
- [ ] Function signature matches specification
- [ ] Returns array of BandMember with user_id IS NULL
- [ ] Returns empty array when all members are linked
- [ ] Throws descriptive error when database query fails
- [ ] Results are sorted by name alphabetically
- [ ] Maps snake_case fields to camelCase correctly
- [ ] Includes error logging with context
- [ ] JSDoc comments explain parameters and return type
- [ ] Works with bands that have mix of linked/unlinked members
- [ ] TypeScript types are correct

**Test scenarios:**
1. Band with unlinked members - should return array of members
2. Band with all members linked - should return empty array
3. Band with no members - should return empty array
4. Band with mix of linked/unlinked - should return only unlinked
5. Database connection error - should throw with message
6. Results should be sorted by name alphabetically

---

### Task 3.3: Implement claimMember service method
**Description**: Add method to link a band member to the current user with proper validation
**Size**: Large
**Priority**: High
**Dependencies**: Tasks 1.2, 2.1
**Can run parallel with**: None (needs 3.1 and 3.2 for comprehensive testing)

**Technical Requirements:**
- Verify user is a member of the band via `user_bands` table
- Verify member is not already claimed (user_id IS NULL)
- Update `band_members.user_id = userId` WHERE `id = memberId`
- Handle unique constraint violations with clear error messages
- Handle concurrent claim attempts (race condition)
- Use Supabase transactions if needed for atomicity

**File to modify:** `src/services/supabaseStorageService.ts`

**Complete implementation:**
```typescript
/**
 * Claim a band member record by linking it to the current user
 * @param userId - Supabase auth user ID
 * @param memberId - Band member ID to claim
 * @param bandId - Band ID (for validation)
 * @throws Error if user is not a band member or member is already claimed
 */
export async function claimMember(
  userId: string,
  memberId: string,
  bandId: string
): Promise<void> {
  try {
    // Step 1: Verify user is a member of the band
    const { data: userBand, error: userBandError } = await supabase
      .from('user_bands')
      .select('user_id')
      .eq('user_id', userId)
      .eq('band_id', bandId)
      .maybeSingle();

    if (userBandError) {
      console.error('Error checking user band membership:', userBandError);
      throw new Error('Failed to verify band membership');
    }

    if (!userBand) {
      throw new Error('You must be a member of this band to claim a member record');
    }

    // Step 2: Verify member exists and is not already claimed
    const { data: member, error: memberError } = await supabase
      .from('band_members')
      .select('id, user_id, name, band_id')
      .eq('id', memberId)
      .eq('band_id', bandId)
      .maybeSingle();

    if (memberError) {
      console.error('Error fetching member:', memberError);
      throw new Error('Failed to verify member status');
    }

    if (!member) {
      throw new Error('Member not found in this band');
    }

    if (member.user_id !== null) {
      throw new Error('This member is already linked to another user');
    }

    // Step 3: Attempt to claim the member (update user_id)
    const { error: updateError } = await supabase
      .from('band_members')
      .update({ user_id: userId })
      .eq('id', memberId)
      .eq('band_id', bandId)
      .is('user_id', null); // Additional check to prevent race condition

    if (updateError) {
      console.error('Error claiming member:', updateError);

      // Check for unique constraint violation (23505 is PostgreSQL unique violation code)
      if (updateError.code === '23505') {
        // User already linked to another member in this band
        throw new Error('You are already linked to a member in this band');
      }

      throw new Error(`Failed to claim member: ${updateError.message}`);
    }

    // Step 4: Verify the update was successful (prevents race condition)
    const { data: updatedMember, error: verifyError } = await supabase
      .from('band_members')
      .select('user_id')
      .eq('id', memberId)
      .single();

    if (verifyError || updatedMember?.user_id !== userId) {
      throw new Error('This member was just claimed by someone else');
    }

    console.log(`Successfully claimed member ${memberId} for user ${userId}`);
  } catch (err) {
    console.error('Error in claimMember:', err);
    throw err;
  }
}
```

**Error handling scenarios:**

| Error Scenario | User-Facing Message | Technical Handling |
|----------------|---------------------|-------------------|
| User not in band | "You must be a member of this band to claim a member record" | Check `user_bands` before allowing claim |
| Member already claimed | "This member is already linked to another user" | Check `user_id IS NULL` before update |
| Network failure | "Connection lost. Please try again." | Catch network errors, allow retry |
| Member not found | "Member not found in this band" | Check member exists in specified band |
| Concurrent claim | "This member was just claimed by someone else" | Verify update success after completion |
| User already linked | "You are already linked to a member in this band" | Handle unique constraint violation (23505) |

**Acceptance Criteria:**
- [ ] Function signature matches specification
- [ ] Verifies user is in band via user_bands table
- [ ] Throws error if user is not a band member
- [ ] Verifies member is not already claimed
- [ ] Throws error if member is already claimed
- [ ] Updates band_members.user_id successfully
- [ ] Handles unique constraint violation with clear message
- [ ] Handles concurrent claim attempts (race condition)
- [ ] Includes comprehensive error logging
- [ ] Verifies update success after completion
- [ ] JSDoc comments explain all parameters and errors
- [ ] TypeScript types are correct
- [ ] All error messages are user-friendly

**Test scenarios:**
1. Valid claim - should succeed and update user_id
2. User not in band - should throw "must be a member"
3. Member already claimed - should throw "already linked"
4. Invalid memberId - should throw "not found"
5. User already linked to different member - should throw "already linked to a member"
6. Concurrent claim attempts - should throw "just claimed by someone else"
7. Database connection error - should throw with message
8. Member in different band - should throw "not found in this band"

---

## Phase 4: UI Implementation (2 tasks)

### Task 4.1: Create useLinkedMember custom hook
**Description**: Create a custom React hook to fetch and manage linked member state
**Size**: Medium
**Priority**: High
**Dependencies**: Tasks 3.1, 3.2
**Can run parallel with**: None

**Technical Requirements:**
- Fetch linked member for current user on mount
- Fetch unlinked members for dropdown
- Provide loading state while fetching
- Handle errors gracefully with user-friendly messages
- Re-fetch when band changes
- Clean up subscriptions on unmount

**File to create:** `src/hooks/useLinkedMember.ts`

**Complete implementation:**
```typescript
import { useState, useEffect } from 'react';
import { BandMember } from '../types';
import { getLinkedMemberForUser, getUnlinkedMembers } from '../services/supabaseStorageService';
import { supabase } from '../services/supabaseClient';

interface UseLinkedMemberResult {
  linkedMember: BandMember | null;
  unlinkedMembers: BandMember[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage linked member state
 * @param bandId - Current band ID
 * @returns Linked member, unlinked members, loading state, error, and refetch function
 */
export function useLinkedMember(bandId: string | null): UseLinkedMemberResult {
  const [linkedMember, setLinkedMember] = useState<BandMember | null>(null);
  const [unlinkedMembers, setUnlinkedMembers] = useState<BandMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLinkedMember = async () => {
    if (!bandId) {
      setLinkedMember(null);
      setUnlinkedMembers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLinkedMember(null);
        setUnlinkedMembers([]);
        setIsLoading(false);
        return;
      }

      // Fetch linked member and unlinked members in parallel
      const [linked, unlinked] = await Promise.all([
        getLinkedMemberForUser(user.id, bandId),
        getUnlinkedMembers(bandId),
      ]);

      setLinkedMember(linked);
      setUnlinkedMembers(unlinked);
    } catch (err) {
      console.error('Error fetching linked member:', err);
      setError(err instanceof Error ? err.message : 'Failed to load member information');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLinkedMember();
  }, [bandId]);

  return {
    linkedMember,
    unlinkedMembers,
    isLoading,
    error,
    refetch: fetchLinkedMember,
  };
}
```

**Acceptance Criteria:**
- [ ] Hook fetches linked member for current user on mount
- [ ] Hook fetches unlinked members for dropdown
- [ ] Returns loading state while fetching
- [ ] Returns error state on failure
- [ ] Re-fetches when bandId changes
- [ ] Provides refetch function for manual refresh
- [ ] Handles case when user is not logged in
- [ ] Handles case when bandId is null
- [ ] Fetches linked and unlinked members in parallel
- [ ] JSDoc comments explain hook usage
- [ ] TypeScript types are correct
- [ ] Hook cleans up properly on unmount

**Test scenarios:**
1. Mount with valid bandId - should fetch data
2. User has linked member - should return member
3. User has no linked member - should return null
4. Change bandId - should re-fetch data
5. bandId is null - should not fetch
6. User not logged in - should not fetch
7. Fetch error - should set error state
8. Call refetch - should re-fetch data

---

### Task 4.2: Add Link Your Account section to Settings Team tab
**Description**: Add UI for claiming member records in Settings component Team tab
**Size**: Large
**Priority**: High
**Dependencies**: Tasks 3.3, 4.1
**Can run parallel with**: None

**Technical Requirements:**
- Add new Card section to Team tab in Settings component
- Show linked member if user has one
- Show dropdown of unlinked members if user doesn't have linked member
- Call claimMember service method on button click
- Show loading state during claim operation
- Show success toast after successful claim
- Show error toast with user-friendly message on failure
- Disable claim button if no member selected
- Refetch linked member after successful claim
- Handle all error scenarios from claimMember

**File to modify:** `src/components/Settings.tsx`

**Complete implementation:**

```typescript
// Add to imports at top of Settings.tsx
import { useLinkedMember } from '../hooks/useLinkedMember';
import { claimMember } from '../services/supabaseStorageService';
import { supabase } from '../services/supabaseClient';

// Add inside Settings component, in the Team tab section
function LinkAccountSection() {
  const { currentBandId } = useBandStore();
  const { linkedMember, unlinkedMembers, isLoading, error, refetch } = useLinkedMember(currentBandId);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [isClaiming, setIsClaiming] = useState(false);
  const { toast } = useToast();

  const handleClaimMember = async () => {
    if (!selectedMemberId || !currentBandId) return;

    setIsClaiming(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: 'Not authenticated',
          description: 'Please log in to claim a member',
          variant: 'destructive',
        });
        return;
      }

      await claimMember(user.id, selectedMemberId, currentBandId);

      toast({
        title: 'Success',
        description: 'Member claimed successfully',
      });

      // Refetch to update UI
      await refetch();
      setSelectedMemberId('');
    } catch (err) {
      console.error('Error claiming member:', err);

      const errorMessage = err instanceof Error ? err.message : 'Failed to claim member';

      toast({
        title: 'Failed to claim member',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsClaiming(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link Your Account</CardTitle>
          <CardDescription>
            Connect your user account to a band member record for personalized features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link Your Account</CardTitle>
          <CardDescription>
            Connect your user account to a band member record for personalized features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Link Your Account</CardTitle>
        <CardDescription>
          Connect your user account to a band member record for personalized features
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            <Badge variant="secondary" className="ml-auto">
              Linked
            </Badge>
          </div>
        ) : unlinkedMembers.length > 0 ? (
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
                    <div className="flex items-center gap-2">
                      <Avatar className={`h-6 w-6 ${getAvatarColor(member.avatarColor)}`}>
                        <AvatarFallback className="text-xs">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{member.name}</span>
                      <span className="text-muted-foreground">
                        ({member.roles.join(', ')})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleClaimMember}
              disabled={!selectedMemberId || isClaiming}
              className="w-full"
            >
              {isClaiming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Claiming...
                </>
              ) : (
                'Claim Member'
              )}
            </Button>
          </div>
        ) : (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>No members available</AlertTitle>
            <AlertDescription>
              All members are already linked. Contact your band admin if you need to claim a member.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// Add LinkAccountSection to the Team tab render section
// Place it after the existing team management sections
```

**Required imports:**
```typescript
import { Avatar, AvatarFallback } from './primitives/avatar';
import { Badge } from './primitives/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './primitives/select';
import { Alert, AlertCircle, AlertDescription, AlertTitle } from './primitives/alert';
import { Loader2, AlertCircle, Info } from 'lucide-react';
```

**Acceptance Criteria:**
- [ ] "Link Your Account" Card appears in Settings Team tab
- [ ] Card shows linked member with avatar and roles when user is linked
- [ ] Card shows dropdown of unlinked members when user is not linked
- [ ] Dropdown shows member avatars, names, and roles
- [ ] "Claim Member" button is disabled when no member selected
- [ ] Loading spinner shows during claim operation
- [ ] Success toast shows after successful claim
- [ ] Error toast shows with user-friendly message on failure
- [ ] UI updates automatically after successful claim (refetch)
- [ ] Empty state shows when no unlinked members available
- [ ] Loading state shows while fetching data
- [ ] Error state shows if fetch fails
- [ ] Component handles user not logged in gracefully
- [ ] Component handles bandId null gracefully
- [ ] All error scenarios display appropriate messages

**Test scenarios:**
1. User with linked member - should show member info with "Linked" badge
2. User with no linked member - should show dropdown and claim button
3. Select member and click claim - should claim and show success toast
4. Claim fails (user not in band) - should show error toast
5. Claim fails (member already claimed) - should show error toast
6. Claim fails (concurrent claim) - should show error toast
7. No unlinked members - should show empty state message
8. Loading state - should show spinner
9. Fetch error - should show error alert
10. Change band - should refetch and update UI

---

## Phase 5: Testing & Validation (2 tasks)

### Task 5.1: Add integration tests for service methods
**Description**: Create comprehensive integration tests for all service layer methods
**Size**: Large
**Priority**: High
**Dependencies**: Tasks 3.1, 3.2, 3.3
**Can run parallel with**: None

**Technical Requirements:**
- Test all service methods with real Supabase connection
- Use test database or test data isolation
- Test happy paths and all error scenarios
- Test race conditions and concurrent operations
- Clean up test data after each test
- Mock Supabase client for unit tests where appropriate

**File to create:** `src/services/__tests__/supabaseStorageService.userMemberLinking.test.ts`

**Test structure:**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getLinkedMemberForUser, getUnlinkedMembers, claimMember } from '../supabaseStorageService';
import { supabase } from '../supabaseClient';

describe('User-Member Linking Service Methods', () => {
  let testBandId: string;
  let testUserId: string;
  let testMemberId: string;

  beforeEach(async () => {
    // Set up test data
  });

  afterEach(async () => {
    // Clean up test data
  });

  describe('getLinkedMemberForUser', () => {
    it('should return linked member when user has linked member', async () => {
      // Test implementation
    });

    it('should return null when user has no linked member', async () => {
      // Test implementation
    });

    it('should return null when user is in different band', async () => {
      // Test implementation
    });

    it('should throw error on database failure', async () => {
      // Test implementation
    });
  });

  describe('getUnlinkedMembers', () => {
    it('should return array of unlinked members', async () => {
      // Test implementation
    });

    it('should return empty array when all members are linked', async () => {
      // Test implementation
    });

    it('should not return linked members', async () => {
      // Test implementation
    });

    it('should return members sorted by name', async () => {
      // Test implementation
    });

    it('should throw error on database failure', async () => {
      // Test implementation
    });
  });

  describe('claimMember', () => {
    it('should successfully claim unlinked member', async () => {
      // Test implementation
    });

    it('should throw error when user is not a band member', async () => {
      // Test implementation
    });

    it('should throw error when member is already claimed', async () => {
      // Test implementation
    });

    it('should throw error when user already linked to another member', async () => {
      // Test implementation
    });

    it('should handle concurrent claim attempts', async () => {
      // Test implementation with Promise.all
    });

    it('should throw error when member not found', async () => {
      // Test implementation
    });

    it('should throw error on database failure', async () => {
      // Test implementation
    });
  });
});
```

**Acceptance Criteria:**
- [ ] All service methods have comprehensive test coverage
- [ ] Tests use real Supabase connection or proper mocks
- [ ] All happy path scenarios tested
- [ ] All error scenarios tested with expected messages
- [ ] Race condition test for concurrent claims
- [ ] Test data is properly cleaned up after each test
- [ ] Tests run successfully in CI environment
- [ ] Test coverage > 90% for service methods
- [ ] Tests follow project testing conventions
- [ ] All tests pass consistently

**Test scenarios to implement:**
- getLinkedMemberForUser: 4 tests
- getUnlinkedMembers: 5 tests
- claimMember: 7 tests
- Total: 16 integration tests

---

### Task 5.2: Manual testing and edge case validation
**Description**: Perform manual testing of UI flows and validate all acceptance criteria from spec
**Size**: Medium
**Priority**: High
**Dependencies**: Tasks 4.2, 5.1
**Can run parallel with**: None

**Testing checklist:**

**Migration validation:**
- [ ] Migration runs successfully on fresh database
- [ ] Migration runs successfully on database with existing data
- [ ] Migration is idempotent (can run multiple times)
- [ ] Foreign key constraint works correctly
- [ ] Unique constraint prevents duplicate user-band links

**Type validation:**
- [ ] TypeScript compilation succeeds with no errors
- [ ] Database types match actual schema
- [ ] BandMember interface has userId field
- [ ] Type guards work correctly

**Service method validation:**
- [ ] getLinkedMemberForUser returns correct data
- [ ] getUnlinkedMembers filters correctly
- [ ] claimMember validates user membership
- [ ] All error messages are user-friendly
- [ ] Race conditions are handled

**UI validation:**
- [ ] Settings > Team tab shows "Link Your Account" section
- [ ] Only shows section if user is band member
- [ ] Shows linked member when user is linked
- [ ] Shows dropdown of unlinked members when not linked
- [ ] Dropdown shows avatars, names, and roles
- [ ] Claim button disabled when no member selected
- [ ] Loading state shows during operation
- [ ] Success toast displays after successful claim
- [ ] Error toasts display appropriate messages
- [ ] UI updates after successful claim
- [ ] Empty state shows when no unlinked members
- [ ] Error state shows when fetch fails

**Multi-user scenarios:**
- [ ] Multiple users can each link to different members
- [ ] One user cannot claim multiple members in same band
- [ ] User can claim members in different bands
- [ ] Concurrent claim attempts handled gracefully

**Error scenarios:**
- [ ] User not in band shows appropriate error
- [ ] Member already claimed shows appropriate error
- [ ] Network failure shows retry-able error
- [ ] No unlinked members shows empty state
- [ ] Concurrent claim shows appropriate error

**Browser testing:**
- [ ] Chrome: All functionality works
- [ ] Firefox: All functionality works
- [ ] Safari: All functionality works
- [ ] Mobile (iOS): UI is responsive
- [ ] Mobile (Android): UI is responsive

**Acceptance Criteria:**
- [ ] All checklist items verified manually
- [ ] Screenshots or recordings of key flows captured
- [ ] All acceptance criteria from spec verified
- [ ] No regressions in existing functionality
- [ ] Performance is acceptable (< 1s for claim operation)
- [ ] UI is responsive on mobile devices
- [ ] Error messages are user-friendly and actionable

---

## Phase 6: Documentation & Cleanup (1 task)

### Task 6.1: Update documentation and mark spec as complete
**Description**: Update all project documentation and move spec to done directory
**Size**: Small
**Priority**: High
**Dependencies**: Tasks 5.1, 5.2
**Can run parallel with**: None

**Required updates:**

1. **Update spec status:**
   - Move `specs/feat-user-member-linking-phase-1.md` to `specs/done/`
   - Update spec metadata: Set `Status: Done`, add `Completed: 2025-12-05`

2. **Update STATUS.md:**
   - Update "Status Overview" counts
   - Remove from "Active Spec" section
   - Add to "Done" table with completion date
   - Update "Pending Queue" if needed
   - Add entry to "Recent Activity"

3. **Update README.md if needed:**
   - No changes needed (links to STATUS.md)

4. **Create CHANGELOG entry:**
   - Add entry for Phase 1 completion
   - Document new features and API changes

5. **Update API documentation:**
   - Document new service methods
   - Document useLinkedMember hook
   - Document BandMember.userId field

**Commit structure:**
```bash
# Commit 1: Implementation
git add supabase/ src/
git commit -m "feat(user-member-linking): implement Phase 1 foundation

- Add user_id column to band_members table
- Implement service methods for claiming and querying linked members
- Add Settings UI for claiming member records
- Include comprehensive error handling and validation

Addresses all acceptance criteria from Phase 1 spec"

# Commit 2: Documentation
git add specs/ CHANGELOG.md docs/
git commit -m "docs(specs): mark Phase 1 user-member linking as complete

- Move spec to done directory
- Update STATUS.md with completion
- Add CHANGELOG entry
- Update API documentation"
```

**Acceptance Criteria:**
- [ ] Spec moved to `specs/done/` directory
- [ ] Spec metadata updated with Done status and completion date
- [ ] STATUS.md updated with all required changes
- [ ] CHANGELOG entry added
- [ ] API documentation updated
- [ ] All changes committed with proper messages
- [ ] Implementation PR ready for review
- [ ] No broken links in documentation

---

## Execution Summary

**Total Tasks:** 12 tasks across 6 phases
**Estimated Complexity:** Medium-Large feature implementation

**Task Distribution:**
- Phase 1 (Database): 2 tasks
- Phase 2 (Types): 1 task
- Phase 3 (Services): 3 tasks
- Phase 4 (UI): 2 tasks
- Phase 5 (Testing): 2 tasks
- Phase 6 (Docs): 1 task

**Parallelization Opportunities:**
- Phase 3 tasks (3.1, 3.2) can run in parallel
- Phase 5 task 5.1 can start after Phase 3 completes

**Critical Path:**
1. Task 1.1 → 1.2 → 2.1 → 3.3 → 4.2 → 5.2 → 6.1

**Recommended Execution Order:**
1. Complete Phase 1 (database foundation)
2. Complete Phase 2 (types)
3. Implement Phase 3 tasks in parallel (3.1, 3.2 first, then 3.3)
4. Implement Phase 4 (4.1 then 4.2)
5. Run Phase 5 tests concurrently
6. Complete Phase 6 documentation

**Risk Mitigation:**
- Test migration on staging database before production
- Create database backup before running migration
- Implement comprehensive error handling for all edge cases
- Test concurrent claim scenarios thoroughly
- Validate type safety throughout implementation

---

## Dependencies Graph

```
1.1 (Migration)
  └─> 1.2 (Types)
        └─> 2.1 (BandMember interface)
              ├─> 3.1 (getLinkedMemberForUser) ──┐
              ├─> 3.2 (getUnlinkedMembers) ──────┤
              └─> 3.3 (claimMember) ─────────────┼─> 5.1 (Integration tests)
                                                  │
                    ┌───────────────────────────┘
                    │
                    ├─> 4.1 (useLinkedMember hook)
                    │     └─> 4.2 (Settings UI)
                    │           └─> 5.2 (Manual testing)
                    │                 └─> 6.1 (Documentation)
```
