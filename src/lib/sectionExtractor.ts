/**
 * Section extraction utility for Guitar Pro files
 *
 * Extracts song sections from AlphaTab score data based on masterBar markers.
 * Used to auto-populate the song_sections table when a GP file is loaded.
 */

import type { SongSectionInput, SectionSource } from '@/types';

/**
 * Represents a section marker in an AlphaTab MasterBar
 */
interface AlphaTabSection {
  text: string;
}

/**
 * Represents a MasterBar from AlphaTab score
 */
interface AlphaTabMasterBar {
  section?: AlphaTabSection | null;
  start: number; // Tick position where this bar starts
}

/**
 * Represents an AlphaTab score with masterBars
 */
export interface AlphaTabScore {
  masterBars: AlphaTabMasterBar[];
}

/**
 * Intermediate type for building sections during extraction
 */
interface PartialSection {
  songId: string;
  bandId: string;
  name: string;
  displayOrder: number;
  startBar: number;
  startTick: number;
  source: SectionSource;
}

/**
 * Extract sections from a Guitar Pro score.
 *
 * Scans through masterBars looking for section markers and creates
 * section input objects suitable for saving to the database.
 *
 * EndTick handling:
 * - For all sections except the last: endTick = next section's startTick - 1
 * - For the final section: endTick = undefined (indicates "until end of song")
 *
 * The Practice Room handles null endTick by treating it as "play to end"
 * when setting loop ranges or calculating section duration.
 *
 * @param score - AlphaTab score object containing masterBars
 * @param songId - UUID of the song
 * @param bandId - UUID of the band
 * @returns Array of SongSectionInput objects ready for database insertion
 */
export function extractSectionsFromScore(
  score: AlphaTabScore,
  songId: string,
  bandId: string
): SongSectionInput[] {
  const sections: SongSectionInput[] = [];
  let currentSection: PartialSection | null = null;

  for (let index = 0; index < score.masterBars.length; index++) {
    const masterBar = score.masterBars[index];
    const barNumber = index + 1; // 1-indexed for human readability

    if (masterBar.section?.text) {
      // Close previous section
      if (currentSection) {
        const completedSection: SongSectionInput = {
          ...currentSection,
          endBar: barNumber - 1,
          endTick: masterBar.start - 1,
        };
        sections.push(completedSection);
      }

      // Start new section
      currentSection = {
        songId,
        bandId,
        name: masterBar.section.text,
        displayOrder: sections.length,
        startBar: barNumber,
        startTick: masterBar.start,
        source: 'gp_marker',
      };
    }
  }

  // Close final section
  if (currentSection) {
    const finalSection: SongSectionInput = {
      ...currentSection,
      endBar: score.masterBars.length,
      // Final section's endTick is undefined - means "to end of song"
      // This is intentional: the Practice Room handles null endTick
      // by using the song's total duration for loop end points
      endTick: undefined, // Will be stored as NULL in DB
    };
    sections.push(finalSection);
  }

  return sections;
}

/**
 * Check if a score has any section markers
 *
 * @param score - AlphaTab score object
 * @returns true if the score contains at least one section marker
 */
export function scoreHasSectionMarkers(score: AlphaTabScore): boolean {
  return score.masterBars.some(bar => bar.section?.text);
}

/**
 * Get the total number of bars in a score
 *
 * @param score - AlphaTab score object
 * @returns Number of bars in the score
 */
export function getScoreBarCount(score: AlphaTabScore): number {
  return score.masterBars.length;
}
