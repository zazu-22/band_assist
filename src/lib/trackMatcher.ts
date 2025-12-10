/**
 * Track matching utility for auto-selecting Guitar Pro tracks
 * based on user's preferred instrument setting.
 */

import type { TrackInfo } from '@/components/AlphaTabRenderer';

/**
 * Search patterns for matching role names to GP track names.
 * Keys are Band Assist role names, values are lowercase search terms.
 * Order matters - more specific patterns should come first.
 */
const INSTRUMENT_PATTERNS: Record<string, string[]> = {
  'Lead Guitar': ['lead', 'guitar 1', 'gtr 1', 'electric guitar', 'acoustic guitar'],
  'Rhythm Guitar': ['rhythm', 'guitar 2', 'gtr 2'],
  'Bass Guitar': ['bass'],
  'Drums': ['drum', 'percussion', 'beat'],
  'Synthesizer': ['synth', 'key', 'piano', 'organ'],
  'Lead Vocals': ['vocal', 'voice', 'vox'],
  'Backing Vocals': ['backing', 'harmony', 'bgv'],
};

/**
 * Find track index matching user's preferred instrument.
 *
 * Matching strategy:
 * 1. Try known instrument patterns from INSTRUMENT_PATTERNS
 * 2. Fall back to direct substring match on instrument name
 * 3. For guitar instruments, try generic "guitar" or "gtr" match
 *
 * @param tracks - Available tracks from the Guitar Pro file
 * @param preferredInstrument - User's preferred instrument setting
 * @returns Track index if match found, null otherwise
 *
 * @example
 * ```ts
 * const tracks = [{ index: 0, name: 'Bass' }, { index: 1, name: 'Lead Guitar' }];
 * findMatchingTrackIndex(tracks, 'Lead Guitar'); // 1
 * findMatchingTrackIndex(tracks, 'Bass Guitar'); // 0
 * findMatchingTrackIndex(tracks, 'Drums'); // null
 * ```
 */
export function findMatchingTrackIndex(
  tracks: TrackInfo[],
  preferredInstrument: string | null | undefined
): number | null {
  if (!preferredInstrument || tracks.length === 0) return null;

  const patterns = INSTRUMENT_PATTERNS[preferredInstrument];
  const lowerTrackNames = tracks.map(t => t.name.toLowerCase());

  // Strategy 1: Use known patterns if available
  if (patterns) {
    for (const pattern of patterns) {
      const idx = lowerTrackNames.findIndex(name => name.includes(pattern));
      if (idx !== -1) return idx;
    }
  }

  // Strategy 2: Try direct substring match on instrument name
  const lowerPref = preferredInstrument.toLowerCase();
  const directMatchIdx = lowerTrackNames.findIndex(name => name.includes(lowerPref));
  if (directMatchIdx !== -1) return directMatchIdx;

  // Strategy 3: Try generic "guitar" match for guitar instruments
  if (lowerPref.includes('guitar')) {
    const guitarIdx = lowerTrackNames.findIndex(
      name => name.includes('guitar') || name.includes('gtr')
    );
    if (guitarIdx !== -1) return guitarIdx;
  }

  return null;
}
