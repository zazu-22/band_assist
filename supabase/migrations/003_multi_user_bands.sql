-- Band Assist Multi-User Support Migration
-- Adds bands, user_bands, and invitations tables for collaborative multi-user access

-- =============================================================================
-- BANDS TABLE
-- =============================================================================

CREATE TABLE bands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add updated_at trigger
CREATE TRIGGER update_bands_updated_at
  BEFORE UPDATE ON bands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- USER_BANDS TABLE (Many-to-Many)
-- =============================================================================

CREATE TABLE user_bands (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, band_id)
);

-- Index for fast lookups
CREATE INDEX idx_user_bands_user_id ON user_bands(user_id);
CREATE INDEX idx_user_bands_band_id ON user_bands(band_id);

-- =============================================================================
-- INVITATIONS TABLE
-- =============================================================================

CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(band_id, email, status) -- Prevent duplicate pending invites
);

-- Index for fast lookups
CREATE INDEX idx_invitations_email ON invitations(email) WHERE status = 'pending';
CREATE INDEX idx_invitations_band_id ON invitations(band_id);

-- =============================================================================
-- ADD BAND_ID TO EXISTING TABLES
-- =============================================================================

-- Add band_id column to all main tables
ALTER TABLE songs ADD COLUMN band_id UUID REFERENCES bands(id) ON DELETE CASCADE;
ALTER TABLE band_members ADD COLUMN band_id UUID REFERENCES bands(id) ON DELETE CASCADE;
ALTER TABLE band_events ADD COLUMN band_id UUID REFERENCES bands(id) ON DELETE CASCADE;
ALTER TABLE roles ADD COLUMN band_id UUID REFERENCES bands(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_songs_band_id ON songs(band_id);
CREATE INDEX idx_band_members_band_id ON band_members(band_id);
CREATE INDEX idx_band_events_band_id ON band_events(band_id);
CREATE INDEX idx_roles_band_id ON roles(band_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Bands policies
CREATE POLICY "Users can view their bands"
  ON bands FOR SELECT
  TO authenticated
  USING (id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid()));

CREATE POLICY "Users can create bands"
  ON bands FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Band admins can update their bands"
  ON bands FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT band_id FROM user_bands
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Band admins can delete their bands"
  ON bands FOR DELETE
  TO authenticated
  USING (
    id IN (
      SELECT band_id FROM user_bands
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- User_bands policies
CREATE POLICY "Users can view their band memberships"
  ON user_bands FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR band_id IN (
    SELECT band_id FROM user_bands WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can join bands (via invitation acceptance)"
  ON user_bands FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave bands"
  ON user_bands FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Invitations policies
CREATE POLICY "Band members can view invitations for their band"
  ON invitations FOR SELECT
  TO authenticated
  USING (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Band admins can create invitations"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    band_id IN (
      SELECT band_id FROM user_bands
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Band admins can update invitations"
  ON invitations FOR UPDATE
  TO authenticated
  USING (
    band_id IN (
      SELECT band_id FROM user_bands
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Invitees can update their invitation status (accept)"
  ON invitations FOR UPDATE
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to automatically accept invitation and join band on signup/login
CREATE OR REPLACE FUNCTION accept_pending_invitations()
RETURNS TRIGGER AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Find pending invitations for this user's email
  FOR invitation_record IN
    SELECT id, band_id FROM invitations
    WHERE email = NEW.email AND status = 'pending'
  LOOP
    -- Add user to band
    INSERT INTO user_bands (user_id, band_id, role)
    VALUES (NEW.id, invitation_record.band_id, 'member')
    ON CONFLICT (user_id, band_id) DO NOTHING;

    -- Mark invitation as accepted
    UPDATE invitations
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = invitation_record.id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-accept invitations when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION accept_pending_invitations();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE bands IS 'Bands (groups of musicians). Each band has its own isolated data set.';
COMMENT ON TABLE user_bands IS 'Many-to-many mapping of users to bands with role (admin/member)';
COMMENT ON TABLE invitations IS 'Email invitations to join a band. Auto-accepted on signup.';

COMMENT ON COLUMN bands.created_by IS 'User who created this band (becomes first admin)';
COMMENT ON COLUMN user_bands.role IS 'User role in band: admin (full access) or member (collaborative access)';
COMMENT ON COLUMN invitations.status IS 'pending (not yet accepted), accepted (user joined), cancelled (invitation revoked)';
