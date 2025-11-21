import { Song, BandMember, BandEvent } from '../types';

/**
 * Storage Service Interface
 *
 * Defines the contract for data persistence services.
 * Implementations: LocalStorageService (client-side) and SupabaseStorageService (backend)
 */

export interface LoadResult {
  songs: Song[] | null;
  members: BandMember[] | null;
  roles: string[] | null;
  events: BandEvent[] | null;
}

export interface IStorageService {
  /**
   * Save all application state
   */
  save(
    songs: Song[],
    members: BandMember[],
    roles: string[],
    events: BandEvent[]
  ): Promise<void> | void;

  /**
   * Load all application state
   */
  load(): Promise<LoadResult> | LoadResult;

  /**
   * Export all data to a downloadable JSON file
   */
  exportData(
    songs: Song[],
    members: BandMember[],
    roles: string[],
    events: BandEvent[]
  ): void;

  /**
   * Import data from a JSON file
   */
  importData(
    file: File
  ): Promise<{
    songs: Song[];
    members: BandMember[];
    roles: string[];
    events: BandEvent[];
  }>;
}
