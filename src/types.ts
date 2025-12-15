import type { AvatarColorClass } from '@/lib/avatar';

export enum Instrument {
  LEAD_GUITAR = 'Lead Guitar',
  RHYTHM_GUITAR = 'Rhythm Guitar',
  BASS = 'Bass Guitar',
  DRUMS = 'Drums',
  SYNTH = 'Synthesizer',
  LEAD_VOCALS = 'Lead Vocals',
  BACKING_VOCALS = 'Backing Vocals',
}

/**
 * User's role within a band (stored in user_bands table).
 * - 'admin': Can manage band settings, members, and delete the band
 * - 'member': Regular band member with read/write access to band data
 */
export type UserBandRole = 'admin' | 'member';

export interface BandMember {
  id: string;
  name: string;
  roles: string[]; // Default/Preferred roles (e.g. ["Lead Guitar", "Vocals"])
  avatarColor?: AvatarColorClass; // Validated avatar background color
  userId?: string | null; // Link to auth.users for personalized features
  preferredInstrument?: string | null; // For auto-selecting GP tracks (e.g., "Lead Guitar")
}

// Type guard to check if member is linked to a user
export function isMemberLinked(member: BandMember): member is BandMember & { userId: string } {
  return member.userId != null;
}

// Helper to get user-linked members from a list
export function getLinkedMembers(members: BandMember[]): Array<BandMember & { userId: string }> {
  return members.filter(isMemberLinked);
}

// Helper to get unlinked members from a list
export function getUnlinkedMembers(members: BandMember[]): BandMember[] {
  return members.filter(member => !isMemberLinked(member));
}

export interface Assignment {
  memberId: string; // Reference to BandMember.id
  role: string; // Specific role for this song (e.g. "Lead Guitar")
}

export interface SongPart {
  id: string;
  name: string; // e.g., "Intro", "Solo 1"
  instrument: string; // Changed from Instrument enum to string for flexibility
  content: string;
  assignedToMemberId?: string; // Reference to BandMember.id
}

export interface Annotation {
  id: string;
  lineIndex: number;
  text: string;
  color: 'yellow' | 'red' | 'blue' | 'green';
}

export interface SongChart {
  id: string;
  name: string; // e.g. "Bass Tab", "Lead Sheet"
  instrument: string; // For filtering
  type: 'TEXT' | 'IMAGE' | 'PDF' | 'GP'; // Added GP for Guitar Pro files
  content?: string; // For text tabs
  url?: string; // For PDF/Images/GP (Storage URL or Base64 Data URI)
  storagePath?: string; // Storage bucket path if file is in Supabase Storage
  storageBase64?: string; // Base64 copy for AlphaTab (GP files only)
  annotations?: Annotation[];
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  duration: string;
  bpm: number;
  key: string;
  isOriginal: boolean;
  status: 'To Learn' | 'In Progress' | 'Performance Ready';
  assignments: Assignment[];
  parts: SongPart[];

  // Deprecated in favor of charts array, but kept for migration
  annotations?: Annotation[];
  lyrics?: string;
  tabContent?: string;
  tabUrl?: string;

  // New Multi-Chart System
  charts: SongChart[];

  backingTrackUrl?: string;
  backingTrackStoragePath?: string; // Storage bucket path for audio file
  aiAnalysis?: string;
  targetDate?: string; // YYYY-MM-DD target for completion
  sortOrder?: number; // Position in setlist view (for persistent ordering)
}

export interface BandEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  type: 'PRACTICE' | 'GIG' | 'OTHER';
  location?: string;
  notes?: string;
}

/**
 * Lightweight band summary for selectors and lists.
 * Used by BandSelector, useBandCreation, and similar contexts
 * where only basic band identification is needed.
 */
export interface BandSummary {
  id: string;
  name: string;
}

export interface Setlist {
  id: string;
  name: string;
  date: string;
  songs: string[];
}

// Personal song status enum
export type UserSongStatus = 'Not Started' | 'Learning' | 'Learned' | 'Mastered';

// Practice priority levels (stored as lowercase in DB)
export type PracticePriority = 'low' | 'medium' | 'high';

// Personal song progress tracking
export interface UserSongProgress {
  id: string;
  userId: string;
  songId: string;
  status: UserSongStatus;
  confidenceLevel?: number; // 1-5 scale
  priority?: PracticePriority; // Practice priority (low, medium, high)
  lastPracticedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Individual practice session record
export interface PracticeSession {
  id: string;
  userId: string;
  songId: string;
  bandId: string;
  durationMinutes: number;
  tempoBpm?: number;
  sectionsPracticed?: string[]; // e.g., ["Intro", "Chorus", "Solo 1"]
  notes?: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

// Aggregate stats for display
export interface PracticeStats {
  totalSessions: number;
  totalMinutes: number;
  averageSessionMinutes: number;
  songsLearned: number;
  songsMastered: number;
  recentSessions: PracticeSession[];
}

// Sort field options for practice sessions
export type PracticeSortField = 'date' | 'durationMinutes' | 'tempoBpm' | 'songId';

// Sort direction
export type SortDirection = 'asc' | 'desc';

// Filter options for querying practice sessions
export interface PracticeFilters {
  songId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  sortBy?: PracticeSortField;
  sortDirection?: SortDirection;
}

/** Input data for updating an existing practice session */
export type UpdatePracticeSessionInput = Partial<
  Pick<PracticeSession, 'durationMinutes' | 'tempoBpm' | 'sectionsPracticed' | 'notes' | 'date' | 'songId'>
>;

// =============================================================================
// SONG SECTIONS (Phase 1 - Song Collaboration Architecture)
// =============================================================================

/** Source of section creation */
export type SectionSource = 'gp_marker' | 'manual';

/** Song section representing a structural part of a song */
export interface SongSection {
  id: string;
  songId: string;
  bandId: string;
  name: string;
  displayOrder: number;
  startBar: number;
  endBar: number;
  barCount: number;       // Computed client-side: endBar - startBar + 1
  startTick?: number;
  endTick?: number;       // May be null for final section
  source: SectionSource;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

/** Input type for creating/updating sections (excludes computed fields) */
export interface SongSectionInput {
  songId: string;
  bandId: string;
  name: string;
  displayOrder: number;
  startBar: number;
  endBar: number;
  startTick?: number;
  endTick?: number;
  source: SectionSource;
  color?: string;
}

// =============================================================================
// SECTION ASSIGNMENTS (Phase 2 - Song Collaboration Architecture)
// =============================================================================

/** Assignment status indicating member activity in a section */
export type AssignmentStatus = 'playing' | 'resting' | 'optional';

/** Section assignment representing a member's role in a specific section */
export interface SectionAssignment {
  id: string;
  sectionId: string;
  memberId: string | null;  // null if member was deleted
  bandId: string;
  role: string;
  status: AssignmentStatus;
  notes?: string;           // Max 500 chars (enforced by DB)
  gpTrackIndex?: number;

  // Denormalized for display (populated by joins)
  memberName?: string;
  memberAvatarColor?: string;

  createdAt: string;
  updatedAt: string;
}

/** Input type for creating/updating assignments */
export interface SectionAssignmentInput {
  sectionId: string;
  memberId: string;
  bandId: string;
  role: string;
  status: AssignmentStatus;
  notes?: string;
  gpTrackIndex?: number;
}

/** Summary of assignment statuses for a section (used in SectionCard header) */
export interface AssignmentStatusSummary {
  playing: number;
  resting: number;
  optional: number;
  total: number;
}

// =============================================================================
// SONG ANNOTATIONS (Phase 3 - Song Collaboration Architecture)
// =============================================================================

/** Annotation type determines visual styling and behavior */
export type AnnotationType = 'note' | 'cue' | 'warning' | 'question';

/** Default colors derived from annotation type (no color field in database) */
export const ANNOTATION_TYPE_COLORS: Record<AnnotationType, string> = {
  note: 'yellow',
  cue: 'blue',
  warning: 'red',
  question: 'green',
} as const;

/** Song annotation tied to a specific position in a song */
export interface SongAnnotation {
  id: string;
  songId: string;
  bandId: string;
  authorId: string;

  // Optional link to a song section
  sectionId?: string;

  // Position in the score (bar/beat based)
  barIndex: number;
  beatIndex: number;
  trackIndex: number;

  // Content
  content: string;
  annotationType: AnnotationType;

  // Resolution (for question-type)
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;

  // Display options
  visibleDuringPlayback: boolean;

  // Denormalized for display (populated by joins or client-side)
  authorName?: string;
  sectionName?: string;

  createdAt: string;
  updatedAt: string;
}

/** Input type for creating a new annotation */
export interface SongAnnotationInput {
  songId: string;
  bandId: string;
  sectionId?: string;
  barIndex: number;
  beatIndex?: number;
  trackIndex?: number;
  content: string;
  annotationType: AnnotationType;
  visibleDuringPlayback?: boolean;
}

/** Input type for updating an existing annotation */
export interface SongAnnotationUpdate {
  content?: string;
  annotationType?: AnnotationType;
  sectionId?: string | null;
  isResolved?: boolean;
  visibleDuringPlayback?: boolean;
}
