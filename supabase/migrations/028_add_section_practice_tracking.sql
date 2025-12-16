-- Migration: Add section practice tracking
-- Phase 4: Practice Integration - Section-aware practice logging
-- Created: 2025-12-16

-- =============================================================================
-- ADD SECTION_ID TO PRACTICE_SESSIONS
-- =============================================================================

-- Add optional section_id column to link practice sessions to specific sections
-- This allows tracking practice time at the section level while keeping
-- backward compatibility with existing sessions (sections_practiced JSONB remains)
ALTER TABLE practice_sessions
  ADD COLUMN section_id UUID REFERENCES song_sections(id) ON DELETE SET NULL;

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Index for efficient section-based queries
CREATE INDEX idx_practice_sessions_section_id ON practice_sessions(section_id);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN practice_sessions.section_id IS 'Optional link to a specific song section for section-level practice tracking. When set, indicates this session was focused on a particular section.';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
  -- Check section_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'practice_sessions' AND column_name = 'section_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: section_id column not added to practice_sessions';
  END IF;

  -- Check index exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'practice_sessions' AND indexname = 'idx_practice_sessions_section_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: idx_practice_sessions_section_id not created';
  END IF;

  -- Check foreign key constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'practice_sessions_section_id_fkey'
      AND contype = 'f'
  ) THEN
    RAISE EXCEPTION 'Migration failed: foreign key constraint on section_id not created';
  END IF;

  RAISE NOTICE 'Migration verification passed';
END $$;
