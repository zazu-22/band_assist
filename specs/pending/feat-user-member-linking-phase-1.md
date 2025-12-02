# User-Member Linking: Phase 1 - Foundation

| Field       | Value                                       |
| ----------- | ------------------------------------------- |
| **Status**  | Backlog                                     |
| **Authors** | Claude (AI Assistant)                       |
| **Created** | 2025-12-02                                  |
| **Updated** | 2025-12-02                                  |
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

Add a nullable `user_id` foreign key to the `band_members` table, allowing members to optionally link to a Supabase auth user. Provide two linking flows:

1. **Claim Member Flow**: Existing band members can claim their member record
2. **Auto-Link on Invitation**: New invitees automatically get linked during invitation acceptance
3. **User Preferences**: Store per-user settings like preferred instrument/track

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

-- User preferences table
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
export interface BandMember {
  id: string;
  name: string;
  roles: string[];
  avatarColor?: AvatarColorClass;
  userId?: string | null; // NEW: Link to auth.users
}

// src/types.ts (new interface)
export interface UserPreferences {
  id: string;
  userId: string;
  bandId: string;
  preferredInstrument?: string;
  preferredTrackIndex: number;
  createdAt: string;
  updatedAt: string;
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
      user_preferences: { // NEW TABLE
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
        <Button variant="outline" onClick={handleUnlinkMember}>
          Unlink
        </Button>
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

### UI: User Preferences

Add preferences section below the claim member card:

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
      </div>
      <div>
        <label className="text-sm font-medium">Default Track (AlphaTab)</label>
        <Input
          type="number"
          min="0"
          value={preferences.preferredTrackIndex}
          onChange={(e) => handleTrackIndexChange(parseInt(e.target.value, 10))}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Track index to display by default when opening Guitar Pro files
        </p>
      </div>
    </CardContent>
  </Card>
)}
```

### Auto-Link During Invitation

Modify invitation acceptance to automatically link the accepting user to a member:

```typescript
// src/components/InvitationManager.tsx (or wherever invitations are handled)

async function acceptInvitation(invitationId: string, email: string) {
  const supabase = getSupabaseClient();
  const user = supabase.auth.getUser();

  // Mark invitation as accepted
  const { error: inviteError } = await supabase
    .from('invitations')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString()
    })
    .eq('id', invitationId);

  if (inviteError) throw inviteError;

  // Create band membership
  const { error: bandError } = await supabase
    .from('user_bands')
    .insert({
      user_id: user.id,
      band_id: invitation.band_id,
      role: 'member'
    });

  if (bandError) throw bandError;

  // NEW: Create a member record linked to this user
  const { error: memberError } = await supabase
    .from('band_members')
    .insert({
      name: email.split('@')[0], // Default name from email
      roles: [], // User can set later
      band_id: invitation.band_id,
      user_id: user.id, // AUTO-LINK
    });

  if (memberError) throw memberError;

  // Create default preferences
  await supabase
    .from('user_preferences')
    .insert({
      user_id: user.id,
      band_id: invitation.band_id,
    });

  toast.success('Invitation accepted! Your account has been linked.');
}
```

---

## Database Changes

1. Add `user_id` column to `band_members` table (nullable UUID FK to `auth.users`)
2. Add index on `user_id` for efficient lookups
3. Add unique constraint on `(user_id, band_id)` to prevent duplicate links
4. Create `user_preferences` table with:
   - `user_id` (FK to auth.users)
   - `band_id` (FK to bands)
   - `preferred_instrument` (TEXT, nullable)
   - `preferred_track_index` (INTEGER, default 0)
   - Standard timestamps
5. Enable RLS on `user_preferences` with policies for users to manage their own data

---

## Files Likely Affected

- `/supabase/migrations/YYYYMMDDHHMMSS_add_user_member_linking.sql` (NEW)
- `/src/types/database.types.ts` (regenerate with `npm run types:generate`)
- `/src/types.ts` (add `userId` to BandMember, add UserPreferences interface)
- `/src/components/Settings.tsx` (add claim member UI and preferences UI)
- `/src/services/supabaseStorageService.ts` (add methods for user preferences CRUD)
- `/src/components/InvitationManager.tsx` (auto-link on acceptance)
- `/src/hooks/useUserPreferences.ts` (NEW - custom hook for preferences)

---

## Acceptance Criteria

- [ ] Migration adds `user_id` to `band_members` with proper FK and index
- [ ] Migration creates `user_preferences` table with RLS policies
- [ ] Settings > Team tab shows "Link Your Account" section
- [ ] Users can claim an existing unlinked member record
- [ ] Only unlinked members appear in the claim dropdown
- [ ] Claiming a member updates `band_members.user_id` in the database
- [ ] Users can unlink their account (sets `user_id` to NULL)
- [ ] After linking, user preferences UI appears
- [ ] Users can set preferred instrument and track index
- [ ] Preferences persist across sessions
- [ ] New invitees automatically get a linked member record on acceptance
- [ ] Auto-linked members get default preferences created
- [ ] Multiple users in same band can each link to different members
- [ ] One user cannot claim multiple members in the same band
- [ ] TypeScript types are updated and match database schema

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
| Users accidentally claim wrong member | Provide clear UI with member details; allow unlinking |
| Existing members not linked | Phase 2 & 3 features gracefully handle unlinked members |
| Migration fails on existing data | Use nullable FK; test migration on staging database |
| RLS policies too restrictive | Users can always read their own data; admins retain full access |

---

## Success Criteria

- [ ] Database schema updated with no breaking changes
- [ ] All TypeScript types match database schema
- [ ] Users can successfully claim and unclaim member records
- [ ] Preferences UI is functional and persists data
- [ ] Invitation flow creates linked members automatically
- [ ] No existing functionality is broken
- [ ] Code follows project conventions (component hierarchy, imports, etc.)
