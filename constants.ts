
import { Song, Instrument } from './types';

export const INITIAL_SONGS: Song[] = [
  {
    id: '1',
    title: 'La Grange',
    artist: 'ZZ Top',
    duration: '3:50',
    bpm: 161,
    key: 'A Minor',
    isOriginal: false,
    status: 'In Progress',
    assignments: [
      { memberId: '1', role: 'Lead Guitar' },
      { memberId: '1', role: 'Lead Vocals' },
      { memberId: '2', role: 'Rhythm Guitar' },
      { memberId: '3', role: 'Bass Guitar' },
      { memberId: '4', role: 'Drums' },
    ],
    parts: [
      {
        id: 'p1',
        name: 'Main Riff',
        instrument: 'Rhythm Guitar',
        content: 'A-string: 3-4 | D-string: 2 (hammer on)',
        assignedToMemberId: '2'
      }
    ],
    charts: [
      {
        id: 'c1',
        name: 'Master Tab',
        instrument: 'Lead Guitar',
        type: 'TEXT',
        content: `
e|---------------------------------|
B|---------------------------------|
G|----------------2--------------2-|
D|--------2-------2------2-------2-|
A|----3-4---3-4------3-4---3-4-----|
E|-5------------5------------5-----|
        `
      }
    ],
    aiAnalysis: "Focus on the pinch harmonics in the solo. The shuffle feel is critical for the drums."
  },
  {
    id: '2',
    title: 'Sharp Dressed Man',
    artist: 'ZZ Top',
    duration: '4:13',
    bpm: 125,
    key: 'C Major',
    isOriginal: false,
    status: 'Performance Ready',
    assignments: [
      { memberId: '1', role: 'Lead Guitar' },
      { memberId: '2', role: 'Synthesizer' },
      { memberId: '3', role: 'Bass Guitar' },
      { memberId: '4', role: 'Drums' },
    ],
    parts: [],
    charts: []
  },
  {
    id: '3',
    title: 'Gimme All Your Lovin\'',
    artist: 'ZZ Top',
    duration: '3:59',
    bpm: 120,
    key: 'C Major',
    isOriginal: false,
    status: 'To Learn',
    assignments: [],
    parts: [],
    charts: []
  },
  {
    id: '4',
    title: 'Tush',
    artist: 'ZZ Top',
    duration: '2:15',
    bpm: 144,
    key: 'G Major',
    isOriginal: false,
    status: 'To Learn',
    assignments: [],
    parts: [],
    charts: []
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
