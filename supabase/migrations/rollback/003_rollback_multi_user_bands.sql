-- Rollback for 003_multi_user_bands.sql
-- Reverts multi-user band support changes

-- Drop new triggers
DROP TRIGGER IF EXISTS update_bands_updated_at ON bands;
DROP TRIGGER IF EXISTS update_invitations_updated_at ON invitations;

-- Drop new tables
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS user_bands CASCADE;
DROP TABLE IF EXISTS bands CASCADE;

-- Remove band_id columns from existing tables
ALTER TABLE band_members DROP COLUMN IF EXISTS band_id;
ALTER TABLE songs DROP COLUMN IF EXISTS band_id;
ALTER TABLE band_events DROP COLUMN IF EXISTS band_id;
ALTER TABLE roles DROP COLUMN IF EXISTS band_id;
ALTER TABLE files DROP COLUMN IF EXISTS band_id;

-- Note: This rollback will result in data loss for band associations
-- Back up data before running this rollback
