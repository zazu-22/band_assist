-- Rollback for 001_initial_schema.sql
-- Drops all tables, functions, and triggers in reverse order

-- Drop triggers
DROP TRIGGER IF EXISTS update_band_members_updated_at ON band_members;
DROP TRIGGER IF EXISTS update_songs_updated_at ON songs;
DROP TRIGGER IF EXISTS update_band_events_updated_at ON band_events;
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS band_events CASCADE;
DROP TABLE IF EXISTS songs CASCADE;
DROP TABLE IF EXISTS band_members CASCADE;

-- Note: We don't drop the uuid-ossp extension as it may be used by other parts of the system
