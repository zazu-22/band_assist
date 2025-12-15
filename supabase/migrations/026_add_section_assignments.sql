-- Migration: 026_add_section_assignments.sql
-- Phase 2 of the Song Collaboration Architecture: Section Assignments

-- Section assignments (who plays what per section)
CREATE TABLE section_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES song_sections(id) ON DELETE CASCADE,
  member_id UUID REFERENCES band_members(id) ON DELETE SET NULL,
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,

  role TEXT NOT NULL,              -- "Lead Guitar", "Rhythm Guitar", "Bass", etc.
  status TEXT DEFAULT 'playing' CHECK (status IN ('playing', 'resting', 'optional')),
  notes TEXT CHECK (notes IS NULL OR length(notes) <= 500),  -- Section-specific notes with max length

  gp_track_index INTEGER,          -- Link to GP track (future use)

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Prevent duplicate member+role assignments per section
  UNIQUE(section_id, member_id, role)
);

-- Indexes for common queries
CREATE INDEX idx_assignments_section ON section_assignments(section_id);
CREATE INDEX idx_assignments_member ON section_assignments(member_id);
CREATE INDEX idx_assignments_band ON section_assignments(band_id);

-- RLS Policies
ALTER TABLE section_assignments ENABLE ROW LEVEL SECURITY;

-- Users can view assignments in their bands
CREATE POLICY "Users can view band section assignments"
  ON section_assignments FOR SELECT
  USING (
    band_id IN (
      SELECT band_id FROM user_bands WHERE user_id = auth.uid()
    )
  );

-- Users can insert assignments in their bands
CREATE POLICY "Users can create band section assignments"
  ON section_assignments FOR INSERT
  WITH CHECK (
    band_id IN (
      SELECT band_id FROM user_bands WHERE user_id = auth.uid()
    )
  );

-- Users can update assignments in their bands
CREATE POLICY "Users can update band section assignments"
  ON section_assignments FOR UPDATE
  USING (
    band_id IN (
      SELECT band_id FROM user_bands WHERE user_id = auth.uid()
    )
  );

-- Users can delete assignments in their bands
CREATE POLICY "Users can delete band section assignments"
  ON section_assignments FOR DELETE
  USING (
    band_id IN (
      SELECT band_id FROM user_bands WHERE user_id = auth.uid()
    )
  );
