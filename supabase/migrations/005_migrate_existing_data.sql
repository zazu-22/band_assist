-- Migration Script for Existing Shared-Account Data
-- Run this ONLY if you have existing data from the shared account model
-- This script should be customized based on your specific situation

-- =============================================================================
-- INSTRUCTIONS
-- =============================================================================

-- IMPORTANT: This migration is OPTIONAL and only needed if you have existing data
-- from the shared account model that you want to preserve.
--
-- Before running this migration:
-- 1. Ensure migrations 003 and 004 have been run successfully
-- 2. Identify your existing shared user account ID (check auth.users table)
-- 3. Decide on a name for the default band (e.g., "Sharp Dressed Band")
-- 4. Replace 'YOUR_EXISTING_USER_ID' below with the actual UUID
-- 5. Replace 'Your Band Name' with your actual band name
--
-- After running this migration:
-- - All existing songs, members, events, and roles will be assigned to the new band
-- - The existing user will become the admin of this band
-- - Other users can be invited to join this band via the invitation system

-- =============================================================================
-- STEP 1: Create Default Band for Existing Data
-- =============================================================================

-- Replace 'YOUR_EXISTING_USER_ID' with the actual user UUID from auth.users
-- Replace 'Your Band Name' with your actual band name (e.g., 'Sharp Dressed Band')

DO $$
DECLARE
  default_band_id UUID;
  existing_user_id UUID;
BEGIN
  -- CUSTOMIZE THIS: Set your existing user ID
  -- To find it, run: SELECT id, email FROM auth.users;
  existing_user_id := 'YOUR_EXISTING_USER_ID'::UUID; -- CHANGE THIS!

  -- Create a default band for existing data
  INSERT INTO bands (id, name, created_by)
  VALUES (uuid_generate_v4(), 'Your Band Name', existing_user_id) -- CHANGE 'Your Band Name'!
  RETURNING id INTO default_band_id;

  RAISE NOTICE 'Created default band with ID: %', default_band_id;

  -- Add the existing user as admin of this band
  INSERT INTO user_bands (user_id, band_id, role)
  VALUES (existing_user_id, default_band_id, 'admin');

  RAISE NOTICE 'Added user % as admin of band %', existing_user_id, default_band_id;

  -- Assign all existing songs to this band
  UPDATE songs
  SET band_id = default_band_id
  WHERE band_id IS NULL;

  RAISE NOTICE 'Assigned % songs to default band', (SELECT COUNT(*) FROM songs WHERE band_id = default_band_id);

  -- Assign all existing band members to this band
  UPDATE band_members
  SET band_id = default_band_id
  WHERE band_id IS NULL;

  RAISE NOTICE 'Assigned % band members to default band', (SELECT COUNT(*) FROM band_members WHERE band_id = default_band_id);

  -- Assign all existing events to this band
  UPDATE band_events
  SET band_id = default_band_id
  WHERE band_id IS NULL;

  RAISE NOTICE 'Assigned % events to default band', (SELECT COUNT(*) FROM band_events WHERE band_id = default_band_id);

  -- Assign all existing roles to this band
  UPDATE roles
  SET band_id = default_band_id
  WHERE band_id IS NULL;

  RAISE NOTICE 'Assigned % roles to default band', (SELECT COUNT(*) FROM roles WHERE band_id = default_band_id);

  -- Assign all existing files to this band (if any exist)
  UPDATE files
  SET band_id = default_band_id
  WHERE band_id IS NULL;

  RAISE NOTICE 'Assigned % files to default band', (SELECT COUNT(*) FROM files WHERE band_id = default_band_id);

  RAISE NOTICE 'Migration complete! Default band created and all data assigned.';
END $$;

-- =============================================================================
-- STEP 2: Verify Migration
-- =============================================================================

-- Run these queries to verify the migration was successful:

-- Check that the band was created
-- SELECT * FROM bands;

-- Check that the user is linked to the band
-- SELECT * FROM user_bands;

-- Check that all data has band_id assigned
-- SELECT COUNT(*) as songs_migrated FROM songs WHERE band_id IS NOT NULL;
-- SELECT COUNT(*) as members_migrated FROM band_members WHERE band_id IS NOT NULL;
-- SELECT COUNT(*) as events_migrated FROM band_events WHERE band_id IS NOT NULL;
-- SELECT COUNT(*) as roles_migrated FROM roles WHERE band_id IS NOT NULL;

-- =============================================================================
-- STEP 3: Clean Up (Optional)
-- =============================================================================

-- If you had global/default roles that should remain accessible to all bands,
-- you can set their band_id back to NULL:

-- Example: Keep default instrument roles as global
-- UPDATE roles
-- SET band_id = NULL
-- WHERE name IN (
--   'Lead Guitar', 'Rhythm Guitar', 'Bass Guitar', 'Drums',
--   'Synthesizer', 'Lead Vocals', 'Backing Vocals'
-- );

-- =============================================================================
-- NOTES
-- =============================================================================

-- After this migration:
-- 1. The existing shared account user is now the band admin
-- 2. Other band members should be invited using the invitation system
-- 3. When they sign up, they'll automatically join the band
-- 4. All existing data remains intact and is scoped to this band

-- For a fresh installation (no existing data):
-- - Skip this migration entirely
-- - First user to sign up will auto-create their band
-- - They can then invite other members
