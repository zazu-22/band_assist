-- Migration: 022_add_preferred_instrument
-- Add preferred_instrument column to band_members table
-- This allows users to auto-select their preferred track when opening Guitar Pro files

-- Add preferred_instrument column to band_members
ALTER TABLE band_members ADD COLUMN preferred_instrument TEXT;

-- Comment for documentation
COMMENT ON COLUMN band_members.preferred_instrument IS 'User preferred instrument for auto-selecting GP tracks (e.g., "Lead Guitar", "Bass Guitar")';
