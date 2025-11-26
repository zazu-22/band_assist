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

export interface BandMember {
  id: string;
  name: string;
  roles: string[]; // Default/Preferred roles (e.g. ["Lead Guitar", "Vocals"])
  avatarColor?: AvatarColorClass; // Validated avatar background color
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

export interface Setlist {
  id: string;
  name: string;
  date: string;
  songs: string[];
}
