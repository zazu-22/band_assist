-- Migration: Add section_ids to practice_sessions
-- Phase 4: Practice Integration - Section-aware practice logging
-- Created: 20251221

-- =============================================================================
-- ADD SECTION_IDS COLUMN
-- =============================================================================

-- Add section_ids column for validated section references
ALTER TABLE practice_sessions
ADD COLUMN section_ids UUID[] DEFAULT NULL;

-- Create GIN index for efficient array queries (e.g., @> contains, && overlaps)
CREATE INDEX idx_practice_sessions_section_ids
ON practice_sessions USING GIN (section_ids);

-- Documentation
COMMENT ON COLUMN practice_sessions.section_ids IS
  'Array of song_sections.id UUIDs practiced in this session. Replaces free-text sections_practiced field for validated section tracking.';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
  -- Check column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'practice_sessions' AND column_name = 'section_ids'
  ) THEN
    RAISE EXCEPTION 'Migration failed: section_ids column not created';
  END IF;

  -- Check index exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'practice_sessions' AND indexname = 'idx_practice_sessions_section_ids'
  ) THEN
    RAISE EXCEPTION 'Migration failed: idx_practice_sessions_section_ids not created';
  END IF;

  RAISE NOTICE 'Migration 028_add_section_ids_to_practice_sessions completed successfully';
END $$;
