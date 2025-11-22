
import { Song, Instrument } from './types';

export const INITIAL_SONGS: Song[] = [
  {
    id: '1763776320897',
    title: 'Gimme All Your Lovin\'',
    artist: 'ZZ Top',
    duration: '3:30',
    bpm: 120,
    key: 'E',
    isOriginal: false,
    status: 'To Learn',
    assignments: [],
    parts: [],
    charts: []
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
    charts: []
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
    charts: []
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
    charts: []
  },
  {
    id: '1763776350340',
    title: 'I\'m Bad, I\'m Nationwide',
    artist: 'ZZ Top',
    duration: '3:30',
    bpm: 120,
    key: 'E',
    isOriginal: false,
    status: 'To Learn',
    assignments: [],
    parts: [],
    charts: []
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
      { memberId: '1763776028016', role: 'Lead Vocals' }
    ],
    parts: [],
    charts: [],
    targetDate: '2025-11-27'
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
    charts: []
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
    charts: []
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
      { memberId: '1763776028016', role: 'Lead Vocals' }
    ],
    parts: [],
    charts: [],
    targetDate: '2025-11-27'
  }
];

export const INSTRUMENT_ICONS: Record<string, string> = {
  'Lead Guitar': '🎸',
  'Rhythm Guitar': '🎸',
  'Bass Guitar': '🎸',
  'Drums': '🥁',
  'Synthesizer': '🎹',
  'Lead Vocals': '🎤',
  'Backing Vocals': '🎤',
  // Default fallback
  'default': '🎵'
};
