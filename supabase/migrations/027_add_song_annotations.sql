-- Migration: Add song_annotations table
-- Phase 3: Song Annotations Feature for Song Collaboration Architecture
-- Created: 2025-12-15

-- =============================================================================
-- SONG ANNOTATIONS TABLE
-- =============================================================================

CREATE TABLE song_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),

  -- Optional link to a song section (Phase 1)
  section_id UUID REFERENCES song_sections(id) ON DELETE SET NULL,

  -- Position in the score (bar/beat based for BoundsLookup API)
  bar_index INTEGER NOT NULL,
  beat_index INTEGER NOT NULL DEFAULT 0,
  track_index INTEGER NOT NULL DEFAULT 0,

  -- Content
  content TEXT NOT NULL CHECK (length(content) <= 2000),
  annotation_type TEXT NOT NULL DEFAULT 'note' CHECK (annotation_type IN ('note', 'cue', 'warning', 'question')),

  -- Resolution (for question-type annotations)
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,

  -- Display options
  visible_during_playback BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_annotations_song ON song_annotations(song_id);
CREATE INDEX idx_annotations_band ON song_annotations(band_id);
CREATE INDEX idx_annotations_section ON song_annotations(section_id);
CREATE INDEX idx_annotations_bar ON song_annotations(song_id, bar_index);
CREATE INDEX idx_annotations_author ON song_annotations(author_id);

-- =============================================================================
-- AUTO-UPDATE TRIGGER FOR updated_at
-- =============================================================================

-- Check if trigger function exists, create if not (may already exist from previous migrations)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_song_annotations_updated_at
    BEFORE UPDATE ON song_annotations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE song_annotations ENABLE ROW LEVEL SECURITY;

-- Users can view annotations for their bands
CREATE POLICY "Users can view annotations for their bands"
  ON song_annotations FOR SELECT TO authenticated
  USING (band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid()));

-- Users can insert annotations for their bands (must be author)
CREATE POLICY "Users can insert annotations for their bands"
  ON song_annotations FOR INSERT TO authenticated
  WITH CHECK (
    band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
    AND author_id = auth.uid()
  );

-- Users can update their own annotations (must still be band member)
CREATE POLICY "Users can update their own annotations"
  ON song_annotations FOR UPDATE TO authenticated
  USING (
    author_id = auth.uid()
    AND band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  )
  WITH CHECK (
    author_id = auth.uid()
    AND band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  );

-- Users can delete their own annotations (must still be band member)
CREATE POLICY "Users can delete their own annotations"
  ON song_annotations FOR DELETE TO authenticated
  USING (
    author_id = auth.uid()
    AND band_id IN (SELECT band_id FROM user_bands WHERE user_id = auth.uid())
  );

-- =============================================================================
-- REAL-TIME
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE song_annotations;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE song_annotations IS 'Stores timestamped annotations (notes, cues, warnings, questions) tied to specific positions in songs.';

COMMENT ON COLUMN song_annotations.bar_index IS 'Bar position (0-indexed) from AlphaTab BoundsLookup API';
COMMENT ON COLUMN song_annotations.beat_index IS 'Beat position within bar (0-indexed)';
COMMENT ON COLUMN song_annotations.track_index IS 'Track index for positioning overlay (0-indexed)';
COMMENT ON COLUMN song_annotations.annotation_type IS 'Type: note (general), cue (performance reminder), warning (problem area), question (discussion point)';
COMMENT ON COLUMN song_annotations.is_resolved IS 'For question-type annotations, whether it has been resolved';
COMMENT ON COLUMN song_annotations.resolved_by IS 'User who resolved a question annotation';
COMMENT ON COLUMN song_annotations.resolved_at IS 'Timestamp when question was resolved';
COMMENT ON COLUMN song_annotations.visible_during_playback IS 'Whether annotation marker shows during playback';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
  -- Check song_annotations table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'song_annotations'
  ) THEN
    RAISE EXCEPTION 'Migration failed: song_annotations table not created';
  END IF;

  -- Check indexes exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'song_annotations' AND indexname = 'idx_annotations_song'
  ) THEN
    RAISE EXCEPTION 'Migration failed: idx_annotations_song not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'song_annotations' AND indexname = 'idx_annotations_band'
  ) THEN
    RAISE EXCEPTION 'Migration failed: idx_annotations_band not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'song_annotations' AND indexname = 'idx_annotations_bar'
  ) THEN
    RAISE EXCEPTION 'Migration failed: idx_annotations_bar not created';
  END IF;

  -- Check RLS enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'song_annotations' AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'Migration failed: RLS not enabled on song_annotations';
  END IF;

  RAISE NOTICE 'Migration verification passed';
END $$;
