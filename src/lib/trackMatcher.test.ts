import { describe, it, expect } from 'vitest';
import { findMatchingTrackIndex } from './trackMatcher';
import type { TrackInfo } from '@/components/AlphaTabRenderer';

/**
 * Helper to create TrackInfo objects for tests
 */
const createTrack = (name: string, index: number = 0): TrackInfo => ({
  index,
  name,
  isMute: false,
  isSolo: false,
  volume: 1.0,
});

describe('findMatchingTrackIndex', () => {
  describe('returns null for invalid inputs', () => {
    it('returns null when preferredInstrument is null', () => {
      const tracks = [createTrack('Lead Guitar', 0)];
      expect(findMatchingTrackIndex(tracks, null)).toBeNull();
    });

    it('returns null when preferredInstrument is undefined', () => {
      const tracks = [createTrack('Lead Guitar', 0)];
      expect(findMatchingTrackIndex(tracks, undefined)).toBeNull();
    });

    it('returns null when preferredInstrument is empty string', () => {
      const tracks = [createTrack('Lead Guitar', 0)];
      expect(findMatchingTrackIndex(tracks, '')).toBeNull();
    });

    it('returns null when tracks array is empty', () => {
      expect(findMatchingTrackIndex([], 'Lead Guitar')).toBeNull();
    });
  });

  describe('matches Lead Guitar', () => {
    it('matches track named "Lead"', () => {
      const tracks = [createTrack('Bass', 0), createTrack('Lead', 1)];
      expect(findMatchingTrackIndex(tracks, 'Lead Guitar')).toBe(1);
    });

    it('matches track named "Guitar 1"', () => {
      const tracks = [createTrack('Drums', 0), createTrack('Guitar 1', 1)];
      expect(findMatchingTrackIndex(tracks, 'Lead Guitar')).toBe(1);
    });

    it('matches track named "Gtr 1"', () => {
      const tracks = [createTrack('Bass', 0), createTrack('Gtr 1', 1)];
      expect(findMatchingTrackIndex(tracks, 'Lead Guitar')).toBe(1);
    });

    it('matches track named "Electric Guitar"', () => {
      const tracks = [createTrack('Electric Guitar', 0)];
      expect(findMatchingTrackIndex(tracks, 'Lead Guitar')).toBe(0);
    });

    it('matches track named "Acoustic Guitar"', () => {
      const tracks = [createTrack('Acoustic Guitar', 0)];
      expect(findMatchingTrackIndex(tracks, 'Lead Guitar')).toBe(0);
    });
  });

  describe('matches Rhythm Guitar', () => {
    it('matches track named "Rhythm"', () => {
      const tracks = [createTrack('Lead', 0), createTrack('Rhythm', 1)];
      expect(findMatchingTrackIndex(tracks, 'Rhythm Guitar')).toBe(1);
    });

    it('matches track named "Guitar 2"', () => {
      const tracks = [createTrack('Guitar 1', 0), createTrack('Guitar 2', 1)];
      expect(findMatchingTrackIndex(tracks, 'Rhythm Guitar')).toBe(1);
    });

    it('falls back to generic guitar match when no rhythm pattern found', () => {
      const tracks = [createTrack('Guitar Track', 0)];
      expect(findMatchingTrackIndex(tracks, 'Rhythm Guitar')).toBe(0);
    });
  });

  describe('matches Bass Guitar', () => {
    it('matches track named "Bass"', () => {
      const tracks = [createTrack('Lead', 0), createTrack('Bass', 1)];
      expect(findMatchingTrackIndex(tracks, 'Bass Guitar')).toBe(1);
    });

    it('matches track containing "bass"', () => {
      const tracks = [createTrack('Electric Bass', 0)];
      expect(findMatchingTrackIndex(tracks, 'Bass Guitar')).toBe(0);
    });
  });

  describe('matches Drums', () => {
    it('matches track named "Drums"', () => {
      const tracks = [createTrack('Guitar', 0), createTrack('Drums', 1)];
      expect(findMatchingTrackIndex(tracks, 'Drums')).toBe(1);
    });

    it('matches track named "Drum Kit"', () => {
      const tracks = [createTrack('Drum Kit', 0)];
      expect(findMatchingTrackIndex(tracks, 'Drums')).toBe(0);
    });

    it('matches track named "Percussion"', () => {
      const tracks = [createTrack('Percussion', 0)];
      expect(findMatchingTrackIndex(tracks, 'Drums')).toBe(0);
    });
  });

  describe('matches Synthesizer', () => {
    it('matches track containing "synth"', () => {
      const tracks = [createTrack('Guitar', 0), createTrack('Synth Pad', 1)];
      expect(findMatchingTrackIndex(tracks, 'Synthesizer')).toBe(1);
    });

    it('matches track containing "key"', () => {
      const tracks = [createTrack('Keys', 0)];
      expect(findMatchingTrackIndex(tracks, 'Synthesizer')).toBe(0);
    });

    it('matches track containing "piano"', () => {
      const tracks = [createTrack('Piano', 0)];
      expect(findMatchingTrackIndex(tracks, 'Synthesizer')).toBe(0);
    });

    it('matches track containing "organ"', () => {
      const tracks = [createTrack('Hammond Organ', 0)];
      expect(findMatchingTrackIndex(tracks, 'Synthesizer')).toBe(0);
    });
  });

  describe('matches Lead Vocals', () => {
    it('matches track containing "vocal"', () => {
      const tracks = [createTrack('Lead Vocal', 0)];
      expect(findMatchingTrackIndex(tracks, 'Lead Vocals')).toBe(0);
    });

    it('matches track containing "voice"', () => {
      const tracks = [createTrack('Voice', 0)];
      expect(findMatchingTrackIndex(tracks, 'Lead Vocals')).toBe(0);
    });

    it('matches track containing "vox"', () => {
      const tracks = [createTrack('Vox', 0)];
      expect(findMatchingTrackIndex(tracks, 'Lead Vocals')).toBe(0);
    });
  });

  describe('matches Backing Vocals', () => {
    it('matches track containing "backing"', () => {
      const tracks = [createTrack('Lead Vocal', 0), createTrack('Backing Vocals', 1)];
      expect(findMatchingTrackIndex(tracks, 'Backing Vocals')).toBe(1);
    });

    it('matches track containing "harmony"', () => {
      const tracks = [createTrack('Harmony', 0)];
      expect(findMatchingTrackIndex(tracks, 'Backing Vocals')).toBe(0);
    });

    it('matches track containing "bgv"', () => {
      const tracks = [createTrack('BGV', 0)];
      expect(findMatchingTrackIndex(tracks, 'Backing Vocals')).toBe(0);
    });
  });

  describe('case insensitive matching', () => {
    it('matches regardless of track name case', () => {
      const tracks = [createTrack('BASS', 0)];
      expect(findMatchingTrackIndex(tracks, 'Bass Guitar')).toBe(0);
    });

    it('matches mixed case track names', () => {
      const tracks = [createTrack('LeAd GuItAr', 0)];
      expect(findMatchingTrackIndex(tracks, 'Lead Guitar')).toBe(0);
    });
  });

  describe('fallback matching', () => {
    it('uses substring match for unknown instruments', () => {
      const tracks = [createTrack('Violin', 0), createTrack('Cello', 1)];
      expect(findMatchingTrackIndex(tracks, 'Violin')).toBe(0);
    });

    it('uses substring match for custom instrument names', () => {
      const tracks = [createTrack('Mandolin', 0)];
      expect(findMatchingTrackIndex(tracks, 'Mandolin')).toBe(0);
    });

    it('tries generic guitar match for guitar instruments without specific match', () => {
      const tracks = [createTrack('Guitar', 0)];
      expect(findMatchingTrackIndex(tracks, 'Slide Guitar')).toBe(0);
    });

    it('tries generic gtr match for guitar instruments', () => {
      const tracks = [createTrack('Gtr', 0)];
      expect(findMatchingTrackIndex(tracks, 'Classical Guitar')).toBe(0);
    });
  });

  describe('returns null when no match', () => {
    it('returns null when instrument not found', () => {
      const tracks = [createTrack('Piano', 0), createTrack('Strings', 1)];
      expect(findMatchingTrackIndex(tracks, 'Bass Guitar')).toBeNull();
    });

    it('returns null for non-guitar instrument with no patterns', () => {
      const tracks = [createTrack('Guitar', 0), createTrack('Bass', 1)];
      expect(findMatchingTrackIndex(tracks, 'Saxophone')).toBeNull();
    });
  });

  describe('returns first match when multiple matches exist', () => {
    it('returns first matching track index', () => {
      const tracks = [
        createTrack('Lead 1', 0),
        createTrack('Lead 2', 1),
        createTrack('Lead 3', 2),
      ];
      expect(findMatchingTrackIndex(tracks, 'Lead Guitar')).toBe(0);
    });
  });
});
