-- Migration: Add user_id to band_members for auth user linking
-- Phase 1: Foundation for user-member linking
-- Created: 20251205031821

-- Add user_id column with foreign key to auth.users
ALTER TABLE band_members
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add comment explaining the column
COMMENT ON COLUMN band_members.user_id IS 'Links band member to Supabase auth user for personalized features';

-- Create index for efficient user lookups
CREATE INDEX IF NOT EXISTS idx_band_members_user_id ON band_members(user_id);

-- Create unique constraint: one user can only link to one member per band
-- Use partial index to allow multiple NULL values (unlinked members)
CREATE UNIQUE INDEX IF NOT EXISTS idx_band_members_user_band
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
