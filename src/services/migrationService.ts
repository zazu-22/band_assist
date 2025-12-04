/**
 * Migration Service
 *
 * Helps migrate data from LocalStorage to Supabase, including:
 * - Converting Base64 data URIs to Supabase Storage files
 * - Updating song records with storage URLs
 * - Preserving all metadata and relationships
 */

import { Song, SongChart } from '../types';
import { localStorageService } from './localStorageService';
import { supabaseStorageService, SupabaseStorageService } from './supabaseStorageService';

export interface MigrationProgress {
  phase: 'loading' | 'uploading_files' | 'saving_data' | 'complete' | 'error';
  current: number;
  total: number;
  message: string;
}

export interface MigrationResult {
  success: boolean;
  songsCount: number;
  membersCount: number;
  eventsCount: number;
  filesUploaded: number;
  errors: string[];
}

export class MigrationService {
  private onProgress?: (progress: MigrationProgress) => void;

  constructor(onProgress?: (progress: MigrationProgress) => void) {
    this.onProgress = onProgress;
  }

  /**
   * Migrate all data from localStorage to Supabase
   */
  async migrateFromLocalStorage(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      songsCount: 0,
      membersCount: 0,
      eventsCount: 0,
      filesUploaded: 0,
      errors: [],
    };

    try {
      // Phase 1: Load data from localStorage
      this.reportProgress({
        phase: 'loading',
        current: 0,
        total: 100,
        message: 'Loading data from localStorage...',
      });

      const localData = localStorageService.load();

      if (!localData.songs && !localData.members && !localData.events) {
        throw new Error('No data found in localStorage to migrate');
      }

      const songs = localData.songs || [];
      const members = localData.members || [];
      const events = localData.events || [];
      const roles = localData.roles || [];

      // Phase 2: Upload files to Supabase Storage
      this.reportProgress({
        phase: 'uploading_files',
        current: 0,
        total: songs.length,
        message: 'Uploading files to Supabase Storage...',
      });

      const migratedSongs = await this.migrateSongFiles(songs);
      result.filesUploaded = this.countUploadedFiles(songs, migratedSongs);

      // Phase 3: Save data to Supabase
      this.reportProgress({
        phase: 'saving_data',
        current: 0,
        total: 100,
        message: 'Saving data to Supabase...',
      });

      await supabaseStorageService.save(migratedSongs, members, roles, events);

      result.songsCount = migratedSongs.length;
      result.membersCount = members.length;
      result.eventsCount = events.length;

      // Phase 4: Complete
      this.reportProgress({
        phase: 'complete',
        current: 100,
        total: 100,
        message: 'Migration complete!',
      });

      result.success = true;
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);

      this.reportProgress({
        phase: 'error',
        current: 0,
        total: 100,
        message: `Migration failed: ${errorMessage}`,
      });

      return result;
    }
  }

  /**
   * Migrate song files from Base64 to Supabase Storage
   */
  private async migrateSongFiles(songs: Song[]): Promise<Song[]> {
    const migratedSongs: Song[] = [];

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];

      this.reportProgress({
        phase: 'uploading_files',
        current: i + 1,
        total: songs.length,
        message: `Uploading files for "${song.title}"...`,
      });

      try {
        // Migrate charts with file URLs
        const migratedCharts = await Promise.all(
          song.charts.map(chart => this.migrateChart(chart, song.id))
        );

        // Migrate backing track
        let migratedBackingTrackUrl = song.backingTrackUrl;
        if (song.backingTrackUrl && this.isBase64DataURI(song.backingTrackUrl)) {
          migratedBackingTrackUrl =
            (await this.uploadBase64File(
              song.backingTrackUrl,
              `backing-track-${song.id}.mp3`,
              song.id,
              'audio'
            )) || undefined;
        }

        migratedSongs.push({
          ...song,
          charts: migratedCharts,
          backingTrackUrl: migratedBackingTrackUrl,
        });
      } catch (error) {
        console.error(`Error migrating song "${song.title}":`, error);
        // Include song without file migration on error
        migratedSongs.push(song);
      }
    }

    return migratedSongs;
  }

  /**
   * Migrate a single chart, uploading Base64 files to Storage
   */
  private async migrateChart(chart: SongChart, songId: string): Promise<SongChart> {
    // Only migrate if chart has a Base64 data URI
    if (!chart.url || !this.isBase64DataURI(chart.url)) {
      return chart;
    }

    try {
      const extension = this.getExtensionFromMimeType(chart.type);
      const fileName = `${chart.name}-${chart.id}.${extension}`;
      const storageUrl = await this.uploadBase64File(chart.url, fileName, songId, 'chart');

      return {
        ...chart,
        url: storageUrl || chart.url, // Keep original if upload fails
      };
    } catch (error) {
      console.error(`Error migrating chart "${chart.name}":`, error);
      return chart;
    }
  }

  /**
   * Upload a Base64 data URI to Supabase Storage
   */
  private async uploadBase64File(
    dataURI: string,
    fileName: string,
    songId: string,
    fileType: 'chart' | 'audio'
  ): Promise<string | null> {
    const blobData = this.dataURItoBlob(dataURI);
    if (!blobData) {
      console.error('Failed to convert data URI to blob');
      return null;
    }

    const service = supabaseStorageService as SupabaseStorageService;
    const result = await service.uploadFile(blobData.blob, fileName, blobData.mimeType, songId, fileType);
    return result?.url ?? null;
  }

  /**
   * Check if a URL is a Base64 data URI
   */
  private isBase64DataURI(url: string): boolean {
    return url.startsWith('data:') && url.includes(';base64,');
  }

  /**
   * Get file extension from chart type
   */
  private getExtensionFromMimeType(type: string): string {
    switch (type) {
      case 'PDF':
        return 'pdf';
      case 'IMAGE':
        return 'png';
      case 'GP':
        return 'gp';
      default:
        return 'bin';
    }
  }

  /**
   * Convert Base64 data URI to Blob
   */
  private dataURItoBlob(dataURI: string): { blob: Blob; mimeType: string } | null {
    try {
      const matches = dataURI.match(/^data:(.+);base64,(.+)$/);
      if (!matches || matches.length !== 3) return null;

      const mimeType = matches[1];
      const base64Data = matches[2];
      const byteString = atob(base64Data);
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const uint8Array = new Uint8Array(arrayBuffer);

      for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
      }

      return {
        blob: new Blob([arrayBuffer], { type: mimeType }),
        mimeType,
      };
    } catch (error) {
      console.error('Error converting data URI to blob:', error);
      return null;
    }
  }

  /**
   * Count how many files were uploaded
   */
  private countUploadedFiles(originalSongs: Song[], migratedSongs: Song[]): number {
    let count = 0;

    migratedSongs.forEach((migratedSong, index) => {
      const originalSong = originalSongs[index];

      // Count migrated charts
      migratedSong.charts.forEach((chart, chartIndex) => {
        const originalChart = originalSong.charts[chartIndex];
        if (
          originalChart?.url &&
          this.isBase64DataURI(originalChart.url) &&
          chart.url &&
          !this.isBase64DataURI(chart.url)
        ) {
          count++;
        }
      });

      // Count migrated backing track
      if (
        originalSong.backingTrackUrl &&
        this.isBase64DataURI(originalSong.backingTrackUrl) &&
        migratedSong.backingTrackUrl &&
        !this.isBase64DataURI(migratedSong.backingTrackUrl)
      ) {
        count++;
      }
    });

    return count;
  }

  /**
   * Report migration progress
   */
  private reportProgress(progress: MigrationProgress): void {
    if (this.onProgress) {
      this.onProgress(progress);
    }
  }

  /**
   * Verify migration was successful by comparing data
   */
  async verifyMigration(): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      const localData = localStorageService.load();
      const supabaseData = await supabaseStorageService.load();

      // Check songs count
      if ((localData.songs?.length || 0) !== (supabaseData.songs?.length || 0)) {
        issues.push(
          `Song count mismatch: ${localData.songs?.length || 0} local vs ${supabaseData.songs?.length || 0} Supabase`
        );
      }

      // Check members count
      if ((localData.members?.length || 0) !== (supabaseData.members?.length || 0)) {
        issues.push(
          `Member count mismatch: ${localData.members?.length || 0} local vs ${supabaseData.members?.length || 0} Supabase`
        );
      }

      // Check events count
      if ((localData.events?.length || 0) !== (supabaseData.events?.length || 0)) {
        issues.push(
          `Event count mismatch: ${localData.events?.length || 0} local vs ${supabaseData.events?.length || 0} Supabase`
        );
      }

      return {
        isValid: issues.length === 0,
        issues,
      };
    } catch (error) {
      issues.push(
        `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return {
        isValid: false,
        issues,
      };
    }
  }
}

/**
 * Create a migration service instance
 */
export const createMigrationService = (
  onProgress?: (progress: MigrationProgress) => void
): MigrationService => {
  return new MigrationService(onProgress);
};
