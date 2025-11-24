-- Update RLS Policies for Band-Scoped Access
-- Replaces global "authenticated user" policies with band-scoped policies

-- =============================================================================
-- SONGS TABLE
-- =============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Authenticated users can view songs" ON songs;
DROP POLICY IF EXISTS "Authenticated users can insert songs" ON songs;
DROP POLICY IF EXISTS "Authenticated users can update songs" ON songs;
DROP POLICY IF EXISTS "Authenticated users can delete songs" ON songs;

-- Create new band-scoped policies
CREATE POLICY "Users can view their band's songs"
  ON songs FOR SELECT
  TO authenticated
  USING (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert songs for their band"
  ON songs FOR INSERT
  TO authenticated
  WITH CHECK (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their band's songs"
  ON songs FOR UPDATE
  TO authenticated
  USING (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete their band's songs"
  ON songs FOR DELETE
  TO authenticated
  USING (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  );

-- =============================================================================
-- BAND MEMBERS TABLE
-- =============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Authenticated users can view band members" ON band_members;
DROP POLICY IF EXISTS "Authenticated users can insert band members" ON band_members;
DROP POLICY IF EXISTS "Authenticated users can update band members" ON band_members;
DROP POLICY IF EXISTS "Authenticated users can delete band members" ON band_members;

-- Create new band-scoped policies
CREATE POLICY "Users can view their band members"
  ON band_members FOR SELECT
  TO authenticated
  USING (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert band members"
  ON band_members FOR INSERT
  TO authenticated
  WITH CHECK (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update band members"
  ON band_members FOR UPDATE
  TO authenticated
  USING (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete band members"
  ON band_members FOR DELETE
  TO authenticated
  USING (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  );

-- =============================================================================
-- BAND EVENTS TABLE
-- =============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Authenticated users can view events" ON band_events;
DROP POLICY IF EXISTS "Authenticated users can insert events" ON band_events;
DROP POLICY IF EXISTS "Authenticated users can update events" ON band_events;
DROP POLICY IF EXISTS "Authenticated users can delete events" ON band_events;

-- Create new band-scoped policies
CREATE POLICY "Users can view their band's events"
  ON band_events FOR SELECT
  TO authenticated
  USING (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert events for their band"
  ON band_events FOR INSERT
  TO authenticated
  WITH CHECK (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their band's events"
  ON band_events FOR UPDATE
  TO authenticated
  USING (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete their band's events"
  ON band_events FOR DELETE
  TO authenticated
  USING (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  );

-- =============================================================================
-- ROLES TABLE
-- =============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Authenticated users can view roles" ON roles;
DROP POLICY IF EXISTS "Authenticated users can insert roles" ON roles;
DROP POLICY IF EXISTS "Authenticated users can update roles" ON roles;
DROP POLICY IF EXISTS "Authenticated users can delete roles" ON roles;

-- Create new band-scoped policies
CREATE POLICY "Users can view their band's roles"
  ON roles FOR SELECT
  TO authenticated
  USING (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
    OR band_id IS NULL -- Allow viewing global/default roles
  );

CREATE POLICY "Users can insert roles for their band"
  ON roles FOR INSERT
  TO authenticated
  WITH CHECK (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their band's roles"
  ON roles FOR UPDATE
  TO authenticated
  USING (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete their band's roles"
  ON roles FOR DELETE
  TO authenticated
  USING (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  );

-- =============================================================================
-- FILES TABLE
-- =============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Authenticated users can view files" ON files;
DROP POLICY IF EXISTS "Authenticated users can insert files" ON files;
DROP POLICY IF EXISTS "Authenticated users can delete files" ON files;

-- Add band_id to files table for proper scoping
ALTER TABLE files ADD COLUMN band_id UUID REFERENCES bands(id) ON DELETE CASCADE;
CREATE INDEX idx_files_band_id ON files(band_id);

-- Create new band-scoped policies
CREATE POLICY "Users can view their band's files"
  ON files FOR SELECT
  TO authenticated
  USING (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert files for their band"
  ON files FOR INSERT
  TO authenticated
  WITH CHECK (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete their band's files"
  ON files FOR DELETE
  TO authenticated
  USING (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  );

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON POLICY "Users can view their band's songs" ON songs IS 'Users can only view songs belonging to bands they are members of';
COMMENT ON POLICY "Users can view their band's roles" ON roles IS 'Users can view roles for their bands, plus global default roles (band_id IS NULL)';
