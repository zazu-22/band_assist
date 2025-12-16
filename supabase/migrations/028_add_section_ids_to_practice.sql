-- Migration: Add section_ids to practice_sessions
-- Phase 4: Practice Integration
-- Created: 20251216

-- =============================================================================
-- ADD SECTION_IDS COLUMN
-- =============================================================================

-- Add section_ids column for structured section references
-- This supplements the existing sections_practiced JSONB column (kept for display names)
ALTER TABLE practice_sessions
ADD COLUMN section_ids UUID[] DEFAULT NULL;

-- Create GIN index for efficient filtering on section_ids array
CREATE INDEX idx_practice_sessions_section_ids
ON practice_sessions USING GIN (section_ids);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN practice_sessions.section_ids IS 'Array of song_section UUIDs practiced. NULL for legacy sessions. sections_practiced text array kept for display.';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
  -- Check section_ids column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'practice_sessions' AND column_name = 'section_ids'
  ) THEN
    RAISE EXCEPTION 'Migration failed: section_ids column not created';
  END IF;

  -- Check GIN index exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'practice_sessions' AND indexname = 'idx_practice_sessions_section_ids'
  ) THEN
    RAISE EXCEPTION 'Migration failed: idx_practice_sessions_section_ids not created';
  END IF;

  RAISE NOTICE 'Migration verification passed: section_ids column and index created';
END $$;
