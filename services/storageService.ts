/**
 * Storage Service
 *
 * Uses Supabase for data persistence and file storage.
 * Requires Supabase to be configured - app will not function without it.
 */

import { IStorageService, LoadResult } from './IStorageService';
import { supabaseStorageService } from './supabaseStorageService';
import { isSupabaseConfigured } from './supabaseClient';
import { Song, BandMember, BandEvent } from '../types';

class StorageServiceWrapper implements IStorageService {
  private activeService: IStorageService;

  constructor() {
    // Require Supabase configuration
    if (!isSupabaseConfigured()) {
      console.error('❌ Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      throw new Error('Supabase configuration required. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
    }

    console.log('✅ Using Supabase for data persistence');
    this.activeService = supabaseStorageService;
  }

  /**
   * Save data to Supabase
   */
  async save(
    songs: Song[],
    members: BandMember[],
    roles: string[],
    events: BandEvent[]
  ): Promise<void> {
    await this.activeService.save(songs, members, roles, events);
  }

  /**
   * Load data from Supabase
   */
  async load(): Promise<LoadResult> {
    return await this.activeService.load();
  }

  /**
   * Export data to JSON file
   */
  exportData(
    songs: Song[],
    members: BandMember[],
    roles: string[],
    events: BandEvent[]
  ): void {
    this.activeService.exportData(songs, members, roles, events);
  }

  /**
   * Import data from JSON file
   */
  async importData(
    file: File
  ): Promise<{ songs: Song[]; members: BandMember[]; roles: string[]; events: BandEvent[] }> {
    return this.activeService.importData(file);
  }

  /**
   * Check if using Supabase backend
   */
  isUsingSupabase(): boolean {
    return this.activeService === supabaseStorageService;
  }

  /**
   * Get the underlying service (for advanced features like real-time subscriptions)
   */
  getActiveService(): IStorageService {
    return this.activeService;
  }

  /**
   * Set the current band context (required for multi-user Supabase mode)
   */
  setCurrentBand(bandId: string): void {
    if ('setCurrentBand' in this.activeService && typeof this.activeService.setCurrentBand === 'function') {
      this.activeService.setCurrentBand(bandId);
    }
  }

  /**
   * Get the current band ID
   */
  getCurrentBandId(): string | null {
    if ('getCurrentBandId' in this.activeService && typeof this.activeService.getCurrentBandId === 'function') {
      return this.activeService.getCurrentBandId();
    }
    return null;
  }
}

// Export singleton instance (backwards compatible with existing code)
export const StorageService = new StorageServiceWrapper();
