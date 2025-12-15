-- Migration: Add song_sections table
-- Phase 1: Song Sections Feature for Song Collaboration Architecture
-- Created: 2025-12-15

-- =============================================================================
-- SONG SECTIONS TABLE
-- =============================================================================

CREATE TABLE song_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,

  -- Identity
  name TEXT NOT NULL,              -- "Intro", "Verse 1", "Guitar Solo"
  display_order INTEGER NOT NULL,

  -- Position (bar-based, 1-indexed for human readability)
  start_bar INTEGER NOT NULL,
  end_bar INTEGER NOT NULL,

  -- Position (tick-based for precise playback sync)
  start_tick INTEGER,
  end_tick INTEGER,                -- NULL for final section; calculated at query time

  -- Metadata
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('gp_marker', 'manual')),
  color TEXT,                      -- Optional color for UI highlighting

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_bar_range CHECK (end_bar >= start_bar),
  UNIQUE(song_id, display_order)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_song_sections_song_id ON song_sections(song_id);
CREATE INDEX idx_song_sections_band_id ON song_sections(band_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE song_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sections for their bands"
  ON song_sections FOR SELECT TO authenticated
  USING (band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert sections for their bands"
  ON song_sections FOR INSERT TO authenticated
  WITH CHECK (band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid()));

CREATE POLICY "Users can update sections for their bands"
  ON song_sections FOR UPDATE TO authenticated
  USING (band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid()))
  WITH CHECK (band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete sections for their bands"
  ON song_sections FOR DELETE TO authenticated
  USING (band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid()));

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE song_sections IS 'Stores song structure breakdown into sections (intro, verse, chorus, etc.) for targeted practice and navigation.';

COMMENT ON COLUMN song_sections.name IS 'Section name/label (e.g., "Intro", "Verse 1", "Guitar Solo")';
COMMENT ON COLUMN song_sections.display_order IS 'Order in which sections appear (0-indexed)';
COMMENT ON COLUMN song_sections.start_bar IS 'Starting bar number (1-indexed for human readability)';
COMMENT ON COLUMN song_sections.end_bar IS 'Ending bar number (inclusive)';
COMMENT ON COLUMN song_sections.start_tick IS 'Starting tick position for precise playback sync';
COMMENT ON COLUMN song_sections.end_tick IS 'Ending tick position (NULL for final section means "to end of song")';
COMMENT ON COLUMN song_sections.source IS 'How section was created: gp_marker (from Guitar Pro file) or manual (user-created)';
COMMENT ON COLUMN song_sections.color IS 'Optional color for UI highlighting (hex or named color)';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
  -- Check song_sections table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'song_sections'
  ) THEN
    RAISE EXCEPTION 'Migration failed: song_sections table not created';
  END IF;

  -- Check indexes exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'song_sections' AND indexname = 'idx_song_sections_song_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: idx_song_sections_song_id not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'song_sections' AND indexname = 'idx_song_sections_band_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: idx_song_sections_band_id not created';
  END IF;

  -- Check RLS enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'song_sections' AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'Migration failed: RLS not enabled on song_sections';
  END IF;

  -- Check unique constraint on (song_id, display_order)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'song_sections_song_id_display_order_key'
      AND contype = 'u'
  ) THEN
    RAISE EXCEPTION 'Migration failed: UNIQUE constraint on song_sections(song_id, display_order) not created';
  END IF;

  RAISE NOTICE 'Migration verification passed';
END $$;
