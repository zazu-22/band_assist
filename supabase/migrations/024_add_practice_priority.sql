-- Migration: Add practice priority column to user_song_status
-- This allows users to set a practice priority (low, medium, high) for each song
-- Priority is personal to each user and independent of their learning status

-- Add priority column with CHECK constraint
-- NULL means no priority set (displayed as "None" in UI)
ALTER TABLE user_song_status
ADD COLUMN priority TEXT
CHECK (priority IN ('low', 'medium', 'high'));

-- Add comment for documentation
COMMENT ON COLUMN user_song_status.priority IS 'User practice priority: low, medium, high, or NULL (none)';
