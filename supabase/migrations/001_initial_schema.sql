-- Band Assist Initial Schema Migration
-- Creates all tables, indexes, RLS policies, and triggers

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLES
-- =============================================================================

-- Band Members Table
CREATE TABLE band_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  roles TEXT[] NOT NULL DEFAULT '{}',
  avatar_color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Songs Table
CREATE TABLE songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  duration TEXT,
  bpm INTEGER,
  key TEXT,
  is_original BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL CHECK (status IN ('To Learn', 'In Progress', 'Performance Ready')),
  target_date DATE,
  charts JSONB NOT NULL DEFAULT '[]',
  assignments JSONB NOT NULL DEFAULT '[]',
  parts JSONB NOT NULL DEFAULT '[]',
  backing_track_url TEXT,
  backing_track_storage_path TEXT, -- Storage bucket path for audio file
  ai_analysis TEXT,
  lyrics TEXT, -- Legacy field, kept for compatibility
  sort_order INTEGER, -- For persistent setlist ordering (NULL = not in setlist)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Band Events Table
CREATE TABLE band_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME,
  type TEXT NOT NULL CHECK (type IN ('PRACTICE', 'GIG', 'OTHER')),
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Roles Table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Files Metadata Table
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Songs indexes
CREATE INDEX idx_songs_status ON songs(status);
CREATE INDEX idx_songs_title ON songs(title);
CREATE INDEX idx_songs_charts ON songs USING GIN (charts);
CREATE INDEX idx_songs_sort_order ON songs(sort_order) WHERE sort_order IS NOT NULL;

-- Events indexes
CREATE INDEX idx_events_date ON band_events(date);
CREATE INDEX idx_events_type ON band_events(type);

-- Files indexes
CREATE INDEX idx_files_storage_path ON files(storage_path);

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at trigger to all relevant tables
CREATE TRIGGER update_band_members_updated_at
  BEFORE UPDATE ON band_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_songs_updated_at
  BEFORE UPDATE ON songs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_band_events_updated_at
  BEFORE UPDATE ON band_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE band_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE band_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Policies: Authenticated users can do everything
-- (For shared band password model, all authenticated users are trusted)

-- Band Members policies
CREATE POLICY "Authenticated users can view band members"
  ON band_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert band members"
  ON band_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update band members"
  ON band_members FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete band members"
  ON band_members FOR DELETE
  TO authenticated
  USING (true);

-- Songs policies
CREATE POLICY "Authenticated users can view songs"
  ON songs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert songs"
  ON songs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update songs"
  ON songs FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete songs"
  ON songs FOR DELETE
  TO authenticated
  USING (true);

-- Band Events policies
CREATE POLICY "Authenticated users can view events"
  ON band_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert events"
  ON band_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update events"
  ON band_events FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete events"
  ON band_events FOR DELETE
  TO authenticated
  USING (true);

-- Roles policies
CREATE POLICY "Authenticated users can view roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert roles"
  ON roles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update roles"
  ON roles FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete roles"
  ON roles FOR DELETE
  TO authenticated
  USING (true);

-- Files policies
CREATE POLICY "Authenticated users can view files"
  ON files FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert files"
  ON files FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete files"
  ON files FOR DELETE
  TO authenticated
  USING (true);

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Insert default roles
INSERT INTO roles (name) VALUES
  ('Lead Guitar'),
  ('Rhythm Guitar'),
  ('Bass Guitar'),
  ('Drums'),
  ('Synthesizer'),
  ('Lead Vocals'),
  ('Backing Vocals')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE band_members IS 'Band roster with member information and role preferences';
COMMENT ON TABLE songs IS 'Song library with charts, assignments, and practice data';
COMMENT ON TABLE band_events IS 'Practice schedule, gigs, and other calendar events';
COMMENT ON TABLE roles IS 'Available instrument/role options for the band';
COMMENT ON TABLE files IS 'Metadata for files stored in Supabase Storage';

COMMENT ON COLUMN songs.charts IS 'JSONB array of SongChart objects (TEXT, IMAGE, PDF, GP). For GP files, url contains Storage URL while storage_base64 contains base64 for AlphaTab rendering.';
COMMENT ON COLUMN songs.assignments IS 'JSONB array of member-to-role assignments for this song';
COMMENT ON COLUMN songs.parts IS 'JSONB array of song sections (Intro, Verse, Solo, etc.)';
COMMENT ON COLUMN songs.backing_track_url IS 'Storage URL for backing track audio file';
COMMENT ON COLUMN songs.backing_track_storage_path IS 'Storage bucket path (audio/{songId}/{fileId}.ext) for tracking uploads';
COMMENT ON COLUMN songs.sort_order IS 'Position in setlist view (NULL = not ordered, used for drag-drop persistence)';
