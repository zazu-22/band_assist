# RLS Policy Analysis: User-Member Linking

## Date
2025-12-05

## Issue
The PR that added the `user_id` column to `band_members` (migration 017) did not update RLS policies to enforce proper security constraints for the user-member linking feature.

## Current State (Before Migration 018)

Migration `004_update_rls_policies.sql` established the following RLS policy for updating `band_members`:

```sql
CREATE POLICY "Users can update band members"
  ON band_members FOR UPDATE
  TO authenticated
  USING (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  );
```

### Security Gap

This policy allows users to:
- ✅ Update any member in their band (correct)
- ❌ Set `user_id` to ANY value on ANY member (security issue)
- ❌ Claim already-linked members (business logic violation)
- ❌ Unlink other users from members (security issue)

The `claimMember` application code attempts to enforce constraints:
```typescript
.update({ user_id: userId })
.eq('id', memberId)
.eq('band_id', bandId)
.is('user_id', null); // Check unclaimed status
```

However, relying solely on application-level checks is insufficient because:
1. Direct database access bypasses these checks
2. Future API endpoints might forget to include them
3. Defense-in-depth requires database-level enforcement

## Required Changes

The RLS policies need to enforce:

1. **Read Access**: Users can read `user_id` for members in their bands ✅ (already works with existing SELECT policy)

2. **Claim Access**: Users can UPDATE `user_id` only when:
   - Member is in their band ✅
   - Member is currently unclaimed (`user_id IS NULL`) ❌ (not enforced)
   - Setting `user_id` to their own `auth.uid()` ❌ (not enforced)

3. **Update Access**: Users can UPDATE other fields (name, roles, etc.) when:
   - Member is in their band ✅
   - `user_id` remains unchanged ❌ (not enforced)

## Solution: Migration 018

Split the single update policy into two specialized policies:

### Policy 1: Claiming Unclaimed Members

```sql
CREATE POLICY "Users can claim unclaimed band members"
  ON band_members FOR UPDATE
  TO authenticated
  USING (
    -- Member must be in user's band
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
    -- Member must be currently unclaimed
    AND user_id IS NULL
  )
  WITH CHECK (
    -- Member must remain in user's band
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
    -- User can only set user_id to their own ID
    AND user_id = auth.uid()
  );
```

**Enforces**:
- Only unclaimed members (`user_id IS NULL`) can have their `user_id` set
- Users can only claim members for themselves (not arbitrary users)
- Member must be in a band the user belongs to

### Policy 2: Updating Member Details

```sql
CREATE POLICY "Users can update band member details"
  ON band_members FOR UPDATE
  TO authenticated
  USING (
    -- Member must be in user's band
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  )
  WITH CHECK (
    -- Member must remain in user's band
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
    -- user_id must remain unchanged
    AND (
      user_id IS NOT DISTINCT FROM (
        SELECT user_id FROM band_members WHERE id = band_members.id
      )
    )
  );
```

**Enforces**:
- Users can update member details (name, roles, avatar_color)
- The `user_id` linkage cannot be modified via this policy
- Member must be in a band the user belongs to

## PostgreSQL-Specific Details

### IS NOT DISTINCT FROM

Used instead of `=` for NULL-safe comparison:
```sql
user_id IS NOT DISTINCT FROM (SELECT user_id FROM band_members WHERE id = band_members.id)
```

This ensures:
- `NULL IS NOT DISTINCT FROM NULL` → `TRUE` (update allowed if both NULL)
- `NULL IS NOT DISTINCT FROM 'some-uuid'` → `FALSE` (change blocked)
- `'uuid-1' IS NOT DISTINCT FROM 'uuid-1'` → `TRUE` (no change allowed)
- `'uuid-1' IS NOT DISTINCT FROM 'uuid-2'` → `FALSE` (change blocked)

### RLS WITH CHECK vs USING

- **USING**: Condition for selecting rows to update (which rows are visible)
- **WITH CHECK**: Condition for the new row values after update (what values are allowed)

For security, we need BOTH:
- `USING` ensures user can only see/modify members in their band
- `WITH CHECK` ensures the updated values meet constraints

## Verification Strategy

The migration includes a verification block that ensures:
1. Old broad update policy is removed
2. New claiming policy exists
3. New details update policy exists

The rollback migration similarly verifies proper restoration.

## Impact on claimMember Operation

The `claimMember` function in `supabaseStorageService.ts` will now be secured at the database level:

```typescript
// Step 3: Attempt to claim the member
const { error: updateError } = await supabase
  .from('band_members')
  .update({ user_id: userId })
  .eq('id', memberId)
  .eq('band_id', bandId)
  .is('user_id', null);
```

**RLS Enforcement**:
1. `USING` clause checks: Member is in user's band AND currently unclaimed
2. `WITH CHECK` clause verifies: `user_id` is being set to `auth.uid()`
3. If either fails, PostgreSQL returns a policy violation error

## Testing Recommendations

After applying migration 018, verify:

1. ✅ Users can claim unclaimed members in their bands
2. ❌ Users cannot claim already-claimed members
3. ❌ Users cannot claim members in bands they don't belong to
4. ❌ Users cannot set `user_id` to another user's ID
5. ✅ Users can update member details (name, roles) without touching `user_id`
6. ❌ Users cannot modify `user_id` via detail update operations

## Files Created

- `/supabase/migrations/018_update_band_members_rls_for_claiming.sql` - Forward migration
- `/supabase/migrations/rollback/018_rollback_band_members_rls_for_claiming.sql` - Rollback migration
- `/docs/rls-analysis-user-member-linking.md` - This analysis document

## Related Specifications

- `specs/feat-user-member-linking-phase-1.md` - Feature specification
- `specs/feat-user-member-linking-phase-1-tasks.md` - Task breakdown (this addresses task from checklist)
