/**
 * Storage Service Factory
 *
 * Automatically selects between LocalStorage and Supabase based on configuration.
 * - If Supabase credentials are configured, uses SupabaseStorageService
 * - Otherwise, falls back to LocalStorageService
 *
 * This provides a seamless migration path from localStorage to Supabase.
 */

import { IStorageService, LoadResult } from './IStorageService';
import { localStorageService } from './localStorageService';
import { supabaseStorageService } from './supabaseStorageService';
import { isSupabaseConfigured } from './supabaseClient';
import { Song, BandMember, BandEvent } from '../types';

class StorageServiceWrapper implements IStorageService {
  private activeService: IStorageService;

  constructor() {
    // Choose service based on configuration
    if (isSupabaseConfigured()) {
      console.log('✅ Using Supabase for data persistence');
      this.activeService = supabaseStorageService;
    } else {
      console.log('📦 Using LocalStorage for data persistence (Supabase not configured)');
      this.activeService = localStorageService;
    }
  }

  /**
   * Save data using the active service
   * Handles both sync (localStorage) and async (Supabase) operations
   */
  async save(
    songs: Song[],
    members: BandMember[],
    roles: string[],
    events: BandEvent[]
  ): Promise<void> {
    const result = this.activeService.save(songs, members, roles, events);
    if (result instanceof Promise) {
      await result;
    }
  }

  /**
   * Load data using the active service
   * Handles both sync (localStorage) and async (Supabase) operations
   */
  async load(): Promise<LoadResult> {
    const result = this.activeService.load();
    if (result instanceof Promise) {
      return await result;
    }
    return result;
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
}

// Export singleton instance (backwards compatible with existing code)
export const StorageService = new StorageServiceWrapper();
