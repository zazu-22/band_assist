-- Migration: Add practice tracking tables
-- Phase 1.1: Personal song status and practice session logs
-- Created: 20251205070217

-- =============================================================================
-- USER SONG STATUS TABLE
-- =============================================================================

-- Personal song status (separate from band-wide status)
CREATE TABLE user_song_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('Not Started', 'Learning', 'Learned', 'Mastered')),
  confidence_level INTEGER CHECK (confidence_level >= 1 AND confidence_level <= 5), -- 1-5 scale
  last_practiced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, song_id)
);

-- =============================================================================
-- PRACTICE SESSIONS TABLE
-- =============================================================================

-- Practice session logs
CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  tempo_bpm INTEGER, -- Practiced tempo (may differ from song's target BPM)
  sections_practiced JSONB, -- Array of section names practiced, e.g., ["Intro", "Solo 1"]
  notes TEXT, -- Free-form practice notes
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Indexes for efficient queries
CREATE INDEX idx_user_song_status_user_id ON user_song_status(user_id);
CREATE INDEX idx_user_song_status_song_id ON user_song_status(song_id);
CREATE INDEX idx_practice_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX idx_practice_sessions_song_id ON practice_sessions(song_id);
CREATE INDEX idx_practice_sessions_band_id ON practice_sessions(band_id);
CREATE INDEX idx_practice_sessions_date ON practice_sessions(date DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS
ALTER TABLE user_song_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;

-- user_song_status policies: Users can manage their own data
CREATE POLICY "Users can view their own song status"
  ON user_song_status FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own song status"
  ON user_song_status FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own song status"
  ON user_song_status FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own song status"
  ON user_song_status FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- practice_sessions policies: Users can manage their own data
CREATE POLICY "Users can view their own practice sessions"
  ON practice_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own practice sessions"
  ON practice_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own practice sessions"
  ON practice_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own practice sessions"
  ON practice_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Band admins can view aggregate practice data (read-only)
CREATE POLICY "Band admins can view practice sessions for their band"
  ON practice_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_bands
      WHERE user_bands.user_id = auth.uid()
        AND user_bands.band_id = practice_sessions.band_id
        AND user_bands.role = 'admin'
    )
  );

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE user_song_status IS 'Tracks individual user progress on songs separate from band-wide status. Users can mark songs as Learning, Learned, or Mastered with confidence levels.';
COMMENT ON TABLE practice_sessions IS 'Logs individual practice sessions with duration, tempo, sections practiced, and notes. Used for personal progress tracking and band-wide analytics.';

COMMENT ON COLUMN user_song_status.status IS 'Current learning status: Not Started, Learning, Learned, or Mastered';
COMMENT ON COLUMN user_song_status.confidence_level IS 'User confidence level from 1 (low) to 5 (high)';
COMMENT ON COLUMN user_song_status.last_practiced_at IS 'Timestamp of most recent practice session for this song';

COMMENT ON COLUMN practice_sessions.duration_minutes IS 'Practice session duration in minutes (must be > 0)';
COMMENT ON COLUMN practice_sessions.tempo_bpm IS 'Tempo practiced at (may differ from song target BPM for slow practice)';
COMMENT ON COLUMN practice_sessions.sections_practiced IS 'JSON array of section names practiced, e.g., ["Intro", "Solo 1"]';
COMMENT ON COLUMN practice_sessions.notes IS 'Free-form notes about the practice session';
COMMENT ON COLUMN practice_sessions.date IS 'Date of practice session (defaults to current date)';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
  -- Check user_song_status table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'user_song_status'
  ) THEN
    RAISE EXCEPTION 'Migration failed: user_song_status table not created';
  END IF;

  -- Check practice_sessions table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'practice_sessions'
  ) THEN
    RAISE EXCEPTION 'Migration failed: practice_sessions table not created';
  END IF;

  -- Check indexes exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'user_song_status' AND indexname = 'idx_user_song_status_user_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: idx_user_song_status_user_id not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'practice_sessions' AND indexname = 'idx_practice_sessions_date'
  ) THEN
    RAISE EXCEPTION 'Migration failed: idx_practice_sessions_date not created';
  END IF;

  -- Check RLS enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'user_song_status' AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'Migration failed: RLS not enabled on user_song_status';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'practice_sessions' AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'Migration failed: RLS not enabled on practice_sessions';
  END IF;

  -- Check unique constraint on user_song_status
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_song_status_user_id_song_id_key'
      AND contype = 'u'
  ) THEN
    RAISE EXCEPTION 'Migration failed: UNIQUE constraint on user_song_status(user_id, song_id) not created';
  END IF;

  RAISE NOTICE 'Migration verification passed';
END $$;
