import { Song, BandMember, BandEvent } from './types';

export const INITIAL_SONGS: Song[] = [
  {
    id: '1763776320897',
    title: "Gimme All Your Lovin'",
    artist: 'ZZ Top',
    duration: '3:30',
    bpm: 120,
    key: 'E',
    isOriginal: false,
    status: 'To Learn',
    assignments: [],
    parts: [],
    charts: [],
  },
  {
    id: '1763776327699',
    title: 'La Grange',
    artist: 'ZZ Top',
    duration: '3:30',
    bpm: 120,
    key: 'E',
    isOriginal: false,
    status: 'To Learn',
    assignments: [],
    parts: [],
    charts: [],
  },
  {
    id: '1763776334966',
    title: 'Waiting On The Bus',
    artist: 'ZZ Top',
    duration: '3:30',
    bpm: 120,
    key: 'E',
    isOriginal: false,
    status: 'To Learn',
    assignments: [],
    parts: [],
    charts: [],
  },
  {
    id: '1763776342136',
    title: 'Jesus Just Left Chicago',
    artist: 'ZZ Top',
    duration: '3:30',
    bpm: 120,
    key: 'E',
    isOriginal: false,
    status: 'To Learn',
    assignments: [],
    parts: [],
    charts: [],
  },
  {
    id: '1763776350340',
    title: "I'm Bad, I'm Nationwide",
    artist: 'ZZ Top',
    duration: '3:30',
    bpm: 120,
    key: 'E',
    isOriginal: false,
    status: 'To Learn',
    assignments: [],
    parts: [],
    charts: [],
  },
  {
    id: '1763775855500',
    title: 'Just Got Paid',
    artist: 'ZZ Top',
    duration: '3:36',
    bpm: 100,
    key: 'E',
    isOriginal: false,
    status: 'In Progress',
    assignments: [
      { memberId: '1763776021452', role: 'Lead Guitar' },
      { memberId: '1763776021452', role: 'Rhythm Guitar' },
      { memberId: '1763776022630', role: 'Drums' },
      { memberId: '1763776023343', role: 'Lead Guitar' },
      { memberId: '1763776023343', role: 'Rhythm Guitar' },
      { memberId: '1763776025207', role: 'Bass Guitar' },
      { memberId: '1763776026538', role: 'Rhythm Guitar' },
      { memberId: '1763776028016', role: 'Lead Vocals' },
    ],
    parts: [],
    charts: [],
    targetDate: '2025-11-27',
  },
  {
    id: '1763776357861',
    title: 'Tube Snake Boogie',
    artist: 'ZZ Top',
    duration: '3:30',
    bpm: 120,
    key: 'E',
    isOriginal: false,
    status: 'To Learn',
    assignments: [],
    parts: [],
    charts: [],
  },
  {
    id: '1763776363853',
    title: 'Sharp Dressed Man',
    artist: 'ZZ Top',
    duration: '3:30',
    bpm: 120,
    key: 'E',
    isOriginal: false,
    status: 'To Learn',
    assignments: [],
    parts: [],
    charts: [],
  },
  {
    id: '1763776292213',
    title: 'Tush',
    artist: 'ZZ Top',
    duration: '3:30',
    bpm: 144,
    key: 'G',
    isOriginal: false,
    status: 'In Progress',
    assignments: [
      { memberId: '1763776021452', role: 'Lead Guitar' },
      { memberId: '1763776022630', role: 'Drums' },
      { memberId: '1763776023343', role: 'Rhythm Guitar' },
      { memberId: '1763776025207', role: 'Bass Guitar' },
      { memberId: '1763776026538', role: 'Rhythm Guitar' },
      { memberId: '1763776028016', role: 'Lead Vocals' },
    ],
    parts: [],
    charts: [],
    targetDate: '2025-11-27',
  },
];

export const INSTRUMENT_ICONS: Record<string, string> = {
  'Lead Guitar': '🎸',
  'Rhythm Guitar': '🎸',
  'Bass Guitar': '🎸',
  Drums: '🥁',
  Synthesizer: '🎹',
  'Lead Vocals': '🎤',
  'Backing Vocals': '🎤',
  // Default fallback
  default: '🎵',
};

// Note: Avatar utilities have been moved to @/lib/avatar.ts for better organization

export const DEFAULT_MEMBERS: BandMember[] = [
  { id: '1763776021452', name: 'Jason', roles: [], avatarColor: 'bg-red-500' },
  { id: '1763776022630', name: 'Jeff', roles: [], avatarColor: 'bg-blue-500' },
  { id: '1763776023343', name: 'Joe', roles: [], avatarColor: 'bg-green-500' },
  { id: '1763776025207', name: 'Berry', roles: [], avatarColor: 'bg-yellow-500' },
  { id: '1763776026538', name: 'Lori', roles: [], avatarColor: 'bg-purple-500' },
  { id: '1763776028016', name: 'Hunter', roles: [], avatarColor: 'bg-red-500' },
];

export const DEFAULT_ROLES: string[] = [
  'Lead Guitar',
  'Rhythm Guitar',
  'Bass Guitar',
  'Drums',
  'Synthesizer',
  'Lead Vocals',
  'Backing Vocals',
];

export const DEFAULT_EVENTS: BandEvent[] = [
  {
    id: '1',
    title: 'Thanksgiving Rehearsal',
    date: '2025-11-27',
    type: 'PRACTICE',
    time: '16:00',
    location: "Jeff's House",
    notes: '- Just Got Paid\n- Tush',
  },
  {
    id: '1763776277014',
    title: 'Christmas Performance',
    date: '2025-12-28',
    time: '19:00',
    type: 'GIG',
    location: 'Covert View Drive',
  },
];

/**
 * Helper to apply default values to potentially null data from storage
 */
export function withDefaults(data: {
  songs: Song[] | null;
  members: BandMember[] | null;
  roles: string[] | null;
  events: BandEvent[] | null;
}): {
  songs: Song[];
  members: BandMember[];
  roles: string[];
  events: BandEvent[];
} {
  return {
    songs: data.songs || INITIAL_SONGS,
    members: data.members || DEFAULT_MEMBERS,
    roles: data.roles || DEFAULT_ROLES,
    events: data.events || DEFAULT_EVENTS,
  };
}
