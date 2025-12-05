import { Song, BandMember, BandEvent, SongChart, Assignment, SongPart, PracticeSession, PracticeFilters, UserSongProgress, UserSongStatus, PracticeStats } from '../types';
import { IStorageService, LoadResult } from './IStorageService';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { validateAvatarColor } from '@/lib/avatar';
import { RealtimeChannel } from '@supabase/supabase-js';
import type { Json, Database } from '../types/database.types';

type FileAccessTokenInsert = Database['public']['Tables']['file_access_tokens']['Insert'];

/**
 * Generate a random UUID with fallback for environments where crypto.randomUUID is unavailable
 * Exported for testing purposes
 */
export function generateUUID(): string {
  // Try native crypto.randomUUID first (available in modern browsers and Node 19+)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback: generate UUID v4 using crypto.getRandomValues
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // Set version (4) and variant (RFC4122)
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Last resort fallback using Math.random (less secure but functional)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Supabase-based persistence service
 * Stores data in PostgreSQL and files in Supabase Storage
 */
export class SupabaseStorageService implements IStorageService {
  private realtimeChannels: RealtimeChannel[] = [];
  private currentBandId: string | null = null;

  constructor() {
    if (!isSupabaseConfigured()) {
      // Supabase not configured
    }
  }

  /**
   * Set the current band context for all operations
   * Must be called after user logs in and selects a band
   */
  setCurrentBand(bandId: string): void {
    this.currentBandId = bandId;
  }

  /**
   * Get the current band ID
   */
  getCurrentBandId(): string | null {
    return this.currentBandId;
  }

  /**
   * Save all application state to Supabase
   * Uses upsert to handle both inserts and updates
   */
  async save(
    songs: Song[],
    members: BandMember[],
    roles: string[],
    events: BandEvent[]
  ): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase is not configured. Check environment variables.');
    }

    if (!this.currentBandId) {
      throw new Error('No band selected. Call setCurrentBand() first.');
    }

    type MemberInsert = {
      id: string;
      name: string;
      roles: string[];
      avatar_color: string | null;
      band_id: string;
    };

    type SongInsert = {
      id: string;
      title: string;
      artist: string;
      duration: string | null;
      bpm: number | null;
      key: string | null;
      is_original: boolean;
      status: string;
      target_date: string | null;
      charts: Json;
      assignments: Json;
      parts: Json;
      backing_track_url: string | null;
      backing_track_storage_path: string | null;
      ai_analysis: string | null;
      lyrics: string | null;
      sort_order: number | null;
      band_id: string;
    };

    type EventInsert = {
      id: string;
      title: string;
      date: string;
      time: string | null;
      type: string;
      location: string | null;
      notes: string | null;
      band_id: string;
    };

    type RoleInsert = {
      name: string;
      band_id: string;
    };

    try {
      // Save members
      const memberData: MemberInsert[] = members.map(m => ({
        id: m.id,
        name: m.name,
        roles: m.roles,
        avatar_color: m.avatarColor || null,
        band_id: this.currentBandId!,
      }));
      const { error: membersError } = await supabase
        .from('band_members')
        .upsert(memberData, { onConflict: 'id' });

      if (membersError) throw membersError;

      // Save songs
      const songData: SongInsert[] = songs.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        duration: s.duration || null,
        bpm: s.bpm || null,
        key: s.key || null,
        is_original: s.isOriginal,
        status: s.status,
        target_date: s.targetDate || null,
        charts: (s.charts || []) as unknown as Json,
        assignments: (s.assignments || []) as unknown as Json,
        parts: (s.parts || []) as unknown as Json,
        backing_track_url: s.backingTrackUrl || null,
        backing_track_storage_path: s.backingTrackStoragePath || null,
        ai_analysis: s.aiAnalysis || null,
        lyrics: s.lyrics || null,
        sort_order: s.sortOrder !== undefined ? s.sortOrder : null,
        band_id: this.currentBandId!,
      }));
      const { error: songsError } = await supabase
        .from('songs')
        .upsert(songData, { onConflict: 'id' });

      if (songsError) throw songsError;

      // Save events
      const eventData: EventInsert[] = events.map(e => ({
        id: e.id,
        title: e.title,
        date: e.date,
        time: e.time || null,
        type: e.type,
        location: e.location || null,
        notes: e.notes || null,
        band_id: this.currentBandId!,
      }));
      const { error: eventsError } = await supabase
        .from('band_events')
        .upsert(eventData, { onConflict: 'id' });

      if (eventsError) throw eventsError;

      // Save roles (upsert by name + band_id)
      const roleData: RoleInsert[] = roles.map(r => ({ name: r, band_id: this.currentBandId! }));
      const { error: rolesError } = await supabase
        .from('roles')
        .upsert(roleData, { onConflict: 'name,band_id', ignoreDuplicates: true });

      if (rolesError) throw rolesError;
    } catch (error) {
      console.error('Error saving to Supabase:', error);
      throw new Error(
        `Failed to save data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete a song from Supabase
   * Also cleans up associated files in Storage
   */
  async deleteSong(songId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase is not configured. Check environment variables.');
    }

    if (!this.currentBandId) {
      throw new Error('No band selected. Call setCurrentBand() first.');
    }

    try {
      // First, fetch the song to get any storage paths for cleanup
      const { data: song, error: fetchError } = await supabase
        .from('songs')
        .select('charts, backing_track_storage_path')
        .eq('id', songId)
        .eq('band_id', this.currentBandId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows returned (song already deleted)
        throw fetchError;
      }

      // Clean up storage files if they exist
      if (song) {
        // Delete backing track if exists
        if (song.backing_track_storage_path) {
          try {
            await supabase.storage
              .from('band-files')
              .remove([song.backing_track_storage_path]);
          } catch (e) {
            console.warn('Failed to delete backing track:', e);
          }
        }

        // Delete chart files if they have storage paths
        const charts = (song.charts as unknown as SongChart[]) || [];
        const chartPaths = charts
          .filter(c => c.storagePath)
          .map(c => c.storagePath as string);

        if (chartPaths.length > 0) {
          try {
            await supabase.storage.from('band-files').remove(chartPaths);
          } catch (e) {
            console.warn('Failed to delete chart files:', e);
          }
        }
      }

      // Delete the song record
      const { error: deleteError } = await supabase
        .from('songs')
        .delete()
        .eq('id', songId)
        .eq('band_id', this.currentBandId);

      if (deleteError) throw deleteError;
    } catch (error) {
      console.error('Error deleting song:', error);
      throw new Error(
        `Failed to delete song: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete a member from Supabase
   */
  async deleteMember(memberId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase is not configured. Check environment variables.');
    }

    if (!this.currentBandId) {
      throw new Error('No band selected. Call setCurrentBand() first.');
    }

    try {
      const { error: deleteError } = await supabase
        .from('band_members')
        .delete()
        .eq('id', memberId)
        .eq('band_id', this.currentBandId);

      if (deleteError) throw deleteError;
    } catch (error) {
      console.error('Error deleting member:', error);
      throw new Error(
        `Failed to delete member: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete an event from Supabase
   */
  async deleteEvent(eventId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase is not configured. Check environment variables.');
    }

    if (!this.currentBandId) {
      throw new Error('No band selected. Call setCurrentBand() first.');
    }

    try {
      const { error: deleteError } = await supabase
        .from('band_events')
        .delete()
        .eq('id', eventId)
        .eq('band_id', this.currentBandId);

      if (deleteError) throw deleteError;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw new Error(
        `Failed to delete event: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Load all application state from Supabase
   */
  async load(): Promise<LoadResult> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { songs: null, members: null, roles: null, events: null };
    }

    if (!this.currentBandId) {
      throw new Error('No band selected. Call setCurrentBand() first.');
    }

    try {
      // Load members
      const { data: membersData, error: membersError } = await supabase
        .from('band_members')
        .select('*')
        .eq('band_id', this.currentBandId)
        .order('name');

      if (membersError) throw membersError;

      // Load songs
      // Order by sort_order first (for setlist view), then by title for unordered songs
      const { data: songsData, error: songsError } = await supabase
        .from('songs')
        .select('*')
        .eq('band_id', this.currentBandId)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('title', { ascending: true });

      if (songsError) throw songsError;

      // Load events
      const { data: eventsData, error: eventsError } = await supabase
        .from('band_events')
        .select('*')
        .eq('band_id', this.currentBandId)
        .order('date');

      if (eventsError) throw eventsError;

      // Load roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('name')
        .eq('band_id', this.currentBandId)
        .order('name');

      if (rolesError) throw rolesError;

      // Transform database format to app format
      const members: BandMember[] | null = membersData
        ? membersData.map(m => ({
            id: m.id,
            name: m.name,
            roles: m.roles,
            avatarColor: validateAvatarColor(m.avatar_color),
          }))
        : null;

      // Transform and refresh chart URLs for all songs
      const songs: Song[] | null = songsData
        ? await Promise.all(
            songsData.map(async s => {
              const charts = (s.charts as unknown as SongChart[]) || [];
              const refreshedCharts = await this.refreshChartUrls(charts);

              return {
                id: s.id,
                title: s.title,
                artist: s.artist,
                duration: s.duration || '',
                bpm: s.bpm || 120,
                key: s.key || 'C',
                isOriginal: s.is_original,
                status: s.status as 'To Learn' | 'In Progress' | 'Performance Ready',
                targetDate: s.target_date || undefined,
                charts: refreshedCharts,
                assignments: (s.assignments as unknown as Assignment[]) || [],
                parts: (s.parts as unknown as SongPart[]) || [],
                backingTrackUrl: s.backing_track_url || undefined,
                backingTrackStoragePath: s.backing_track_storage_path || undefined,
                aiAnalysis: s.ai_analysis || undefined,
                lyrics: s.lyrics || undefined,
                sortOrder: s.sort_order !== null ? s.sort_order : undefined,
                // Legacy fields (not used but kept for compatibility)
                annotations: undefined,
                tabContent: undefined,
                tabUrl: undefined,
              };
            })
          )
        : null;

      const events: BandEvent[] | null = eventsData
        ? eventsData.map(e => ({
            id: e.id,
            title: e.title,
            date: e.date,
            time: e.time || undefined,
            type: e.type as 'PRACTICE' | 'GIG' | 'OTHER',
            location: e.location || undefined,
            notes: e.notes || undefined,
          }))
        : null;

      const roles: string[] | null = rolesData ? rolesData.map(r => r.name) : null;

      return { songs, members, roles, events };
    } catch (error) {
      console.error('Error loading from Supabase:', error);
      return { songs: null, members: null, roles: null, events: null };
    }
  }

  /**
   * Export all data to a JSON file (same as localStorage version)
   */
  exportData(songs: Song[], members: BandMember[], roles: string[], events: BandEvent[]): void {
    const data = {
      version: 3,
      appName: 'SharpDressedBand',
      timestamp: new Date().toISOString(),
      songs,
      members,
      roles,
      events,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `sdb_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import data from a JSON file
   */
  async importData(
    file: File
  ): Promise<{ songs: Song[]; members: BandMember[]; roles: string[]; events: BandEvent[] }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const text = e.target?.result as string;
          const data = JSON.parse(text);

          // Basic validation
          if (!data.songs || !Array.isArray(data.songs) || !data.members) {
            throw new Error('Invalid backup file format');
          }

          resolve({
            songs: data.songs,
            members: data.members,
            roles: data.roles || [],
            events: data.events || [],
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Upload a file to Supabase Storage
   * @param file - File blob to upload
   * @param songId - Song ID for organizing files
   * @param fileType - 'chart' or 'audio'
   * @returns Object with url and storagePath, or null on error
   */
  async uploadFile(
    file: Blob,
    fileName: string,
    mimeType: string,
    songId: string,
    fileType: 'chart' | 'audio'
  ): Promise<{ url: string; storagePath: string } | null> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    if (!this.currentBandId) {
      throw new Error('No band selected. Call setCurrentBand() first.');
    }

    const bandId = this.currentBandId;

    try {
      const fileId = generateUUID();
      const extension = fileName.split('.').pop() || 'bin';
      // New path structure: bands/{band_id}/charts/{song_id}/{file_id}.ext
      const storagePath = `bands/${bandId}/${fileType}s/${songId}/${fileId}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('band-files')
        .upload(storagePath, file, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Record file metadata
      type FileInsert = {
        id: string;
        storage_path: string;
        file_name: string;
        mime_type: string;
        file_size: number;
        band_id: string;
      };
      const fileMetadata: FileInsert = {
        id: fileId,
        storage_path: storagePath,
        file_name: fileName,
        mime_type: mimeType,
        file_size: file.size,
        band_id: bandId,
      };
      const { error: metadataError } = await supabase.from('files').insert(fileMetadata);

      if (metadataError) {
        // Log metadata insert failures but don't fail the upload
        console.warn('Failed to save file metadata:', metadataError);
      }

      // Generate Edge Function URL with file access token
      const edgeFunctionUrl = await this.regenerateSignedUrl(storagePath);
      if (!edgeFunctionUrl) return null;

      return { url: edgeFunctionUrl, storagePath };
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  }

  /**
   * Ensure the session is valid and refreshed
   * This is critical for RLS policies that depend on auth.uid()
   * @returns Valid session or null if refresh failed
   */
  private async ensureValidSession(): Promise<{ userId: string } | null> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.error('[ensureValidSession] No Supabase client available');
        return null;
      }

      // First try to get the cached session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('[ensureValidSession] Error getting session:', sessionError);
        return null;
      }

      if (!session) {
        console.warn('[ensureValidSession] No active session');
        return null;
      }

      // Check if session is about to expire (within 60 seconds)
      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const isAboutToExpire = expiresAt && (expiresAt - now) < 60;

      if (isAboutToExpire) {
        // Proactively refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error('[ensureValidSession] Failed to refresh session:', refreshError);
          // Return old session, it might still work
          return { userId: session.user.id };
        }
        if (refreshData.session) {
          return { userId: refreshData.session.user.id };
        }
      }

      return { userId: session.user.id };
    } catch (error) {
      console.error('[ensureValidSession] Exception:', error);
      return null;
    }
  }

  /**
   * Generate a short-lived, single-use file access token
   * @param storagePath - Path in the band-files bucket
   * @param userId - User ID who will access the file
   * @param bandId - Band ID that owns the file
   * @returns File access token (random UUID)
   */
  private async generateFileAccessToken(
    storagePath: string,
    userId: string,
    bandId: string
  ): Promise<string | null> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.error('[generateFileAccessToken] No Supabase client available');
        return null;
      }

      // Ensure session is valid before attempting insert (RLS depends on auth.uid())
      const validSession = await this.ensureValidSession();
      if (!validSession) {
        console.error('[generateFileAccessToken] Cannot generate token without valid session');
        return null;
      }

      // Generate random token
      const token = generateUUID();

      // Token expires in 5 minutes
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5);

      // Insert token into database
      const tokenData: FileAccessTokenInsert = {
        token,
        user_id: userId,
        storage_path: storagePath,
        band_id: bandId,
        expires_at: expiresAt.toISOString(),
      };
      const { error } = await supabase.from('file_access_tokens').insert(tokenData);

      if (error) {
        console.error('[generateFileAccessToken] Failed to create token:', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          storagePath,
          bandId,
        });
        return null;
      }

      return token;
    } catch (error) {
      console.error('[generateFileAccessToken] Exception:', error);
      return null;
    }
  }

  /**
   * Generate file access tokens for multiple storage paths in a single batch
   * Reduces N+1 DB queries when refreshing URLs for multiple charts
   */
  private async generateFileAccessTokensBatch(
    storagePaths: string[],
    userId: string,
    bandId: string
  ): Promise<Map<string, string>> {
    const tokenMap = new Map<string, string>();

    if (storagePaths.length === 0) return tokenMap;

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.error('[generateFileAccessTokensBatch] No Supabase client available');
        return tokenMap;
      }

      // Ensure session is valid before attempting insert (RLS depends on auth.uid())
      const validSession = await this.ensureValidSession();
      if (!validSession) {
        console.error('[generateFileAccessTokensBatch] Cannot generate tokens without valid session');
        return tokenMap;
      }

      // Token expires in 5 minutes
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5);
      const expiresAtISO = expiresAt.toISOString();

      // Generate all tokens and prepare batch insert
      const tokensData: FileAccessTokenInsert[] = storagePaths.map(storagePath => {
        const token = generateUUID();
        tokenMap.set(storagePath, token);
        return {
          token,
          user_id: userId,
          storage_path: storagePath,
          band_id: bandId,
          expires_at: expiresAtISO,
        };
      });

      // Batch insert all tokens
      const { error } = await supabase.from('file_access_tokens').insert(tokensData);

      if (error) {
        console.error('[generateFileAccessTokensBatch] Failed to create tokens:', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          pathCount: storagePaths.length,
          bandId,
        });
        return new Map(); // Return empty map on error
      }

      return tokenMap;
    } catch (error) {
      console.error('[generateFileAccessTokensBatch] Exception:', error);
      return new Map();
    }
  }

  /**
   * Regenerate a URL from a storage path using Edge Function
   * The Edge Function serves files with Content-Disposition: inline header
   * which fixes Firefox PDF viewer issue
   * @param storagePath - Path in the band-files bucket
   * @param userId - Optional user ID (if not provided, will get from session)
   * @returns Edge Function URL that serves file inline
   */
  async regenerateSignedUrl(storagePath: string, userId?: string): Promise<string | null> {
    try {
      // Get Supabase URL from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        console.error('[regenerateSignedUrl] VITE_SUPABASE_URL not configured');
        return null;
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        console.error('[regenerateSignedUrl] No Supabase client available');
        return null;
      }

      // Get user ID - prefer provided ID, otherwise ensure session is valid
      let currentUserId = userId;
      if (!currentUserId) {
        const validSession = await this.ensureValidSession();
        if (!validSession) {
          console.error('[regenerateSignedUrl] No valid session available');
          return null;
        }
        currentUserId = validSession.userId;
      }

      if (!this.currentBandId) {
        console.error('[regenerateSignedUrl] No band selected');
        return null;
      }

      // Generate short-lived file access token (5 minutes, single-use)
      const fileToken = await this.generateFileAccessToken(
        storagePath,
        currentUserId,
        this.currentBandId
      );

      if (!fileToken) {
        console.error('[regenerateSignedUrl] Failed to generate file access token');
        return null;
      }

      // Generate Edge Function URL with file access token
      // Format: https://your-project.supabase.co/functions/v1/serve-file-inline?path=...&token=...
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/serve-file-inline?path=${encodeURIComponent(storagePath)}&token=${encodeURIComponent(fileToken)}`;

      return edgeFunctionUrl;
    } catch (error) {
      console.error('[regenerateSignedUrl] Exception:', error);
      return null;
    }
  }

  /**
   * Refresh chart URLs with fresh signed URLs
   * This ensures all charts use the latest URL parameters (e.g., download: false)
   *
   * Performance: Uses batch token generation to avoid N+1 DB queries
   *
   * Future optimization: Consider client-side token caching with expiry tracking
   * to avoid regenerating tokens on every load. Tokens have 5-minute lifespan,
   * so caching could reduce DB writes for frequently accessed charts.
   *
   * @param charts - Array of song charts to refresh
   * @returns Charts with refreshed URLs
   */
  private async refreshChartUrls(charts: SongChart[]): Promise<SongChart[]> {
    if (!charts || charts.length === 0) return charts;

    // Performance optimization: Get session and band ID once
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('[refreshChartUrls] No Supabase client available');
      return charts;
    }

    // Ensure session is valid and refreshed before generating tokens
    const validSession = await this.ensureValidSession();
    if (!validSession) {
      console.warn('[refreshChartUrls] No valid session - charts may show expired token errors');
      return charts;
    }

    const userId = validSession.userId;

    if (!this.currentBandId) {
      console.warn('[refreshChartUrls] No band selected');
      return charts;
    }

    const bandId = this.currentBandId;

    // Collect charts that need URL refresh
    const chartsNeedingRefresh = charts.filter(
      chart => chart.storagePath && (chart.type === 'PDF' || chart.type === 'IMAGE' || chart.type === 'GP')
    );

    if (chartsNeedingRefresh.length === 0) {
      return charts;
    }

    // Extract storage paths for batch token generation
    const storagePaths = chartsNeedingRefresh.map(chart => chart.storagePath!);

    // Generate tokens in batch (single DB insert instead of N inserts)
    const tokenMap = await this.generateFileAccessTokensBatch(storagePaths, userId, bandId);

    if (tokenMap.size === 0) {
      console.error('[refreshChartUrls] Failed to generate tokens in batch');
      return charts;
    }

    // Get Edge Function URL
    const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/serve-file-inline`;

    // Map charts to refreshed versions
    let failureCount = 0;
    const refreshedCharts = charts.map(chart => {
      if (chart.storagePath && tokenMap.has(chart.storagePath)) {
        const token = tokenMap.get(chart.storagePath)!;
        const freshUrl = `${edgeFunctionUrl}?path=${encodeURIComponent(chart.storagePath)}&token=${token}`;
        return { ...chart, url: freshUrl };
      }

      // Chart doesn't need refresh or token generation failed for it
      if (chartsNeedingRefresh.some(c => c.id === chart.id)) {
        failureCount++;
        console.error(
          '[refreshChartUrls] Failed to generate fresh URL for chart:',
          chart.name,
          'storagePath:',
          chart.storagePath
        );
      }

      return chart;
    });

    // Log summary if there were failures
    if (failureCount > 0) {
      console.error(
        `[refreshChartUrls] Failed to refresh ${failureCount} out of ${chartsNeedingRefresh.length} chart URLs. ` +
        `Charts with stale URLs may fail to load. Check console for details.`
      );
    }

    return refreshedCharts;
  }

  /**
   * Upload a chart file (PDF, image, or Guitar Pro) to Supabase Storage
   * For GP files, also stores base64 version for AlphaTab rendering
   * @returns Object with url, storagePath, and storageBase64 (GP only)
   */
  async uploadChartFile(
    file: Blob,
    fileName: string,
    mimeType: string,
    songId: string
  ): Promise<{ url: string; storagePath: string; storageBase64?: string } | null> {
    // Upload to Storage
    const result = await this.uploadFile(file, fileName, mimeType, songId, 'chart');
    if (!result) return null;

    const { url, storagePath } = result;

    // For Guitar Pro files, also generate base64 for AlphaTab
    const isGp = /\.(gp|gp3|gp4|gp5|gpx)$/i.test(fileName);
    if (isGp) {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = e => {
          const result = e.target?.result as string;
          resolve(result);
        };
        reader.onerror = () => reject(new Error('Failed to read file as base64'));
        reader.readAsDataURL(file);
      });

      try {
        const storageBase64 = await base64Promise;
        return { url, storagePath, storageBase64 };
      } catch (_error) {
        return { url, storagePath };
      }
    }

    return { url, storagePath };
  }

  /**
   * Upload an audio file (backing track) to Supabase Storage
   * @returns Object with url and storagePath
   */
  async uploadAudioFile(
    file: Blob,
    fileName: string,
    mimeType: string,
    songId: string
  ): Promise<{ url: string; storagePath: string } | null> {
    // Upload to Storage and get both url and storagePath
    return this.uploadFile(file, fileName, mimeType, songId, 'audio');
  }

  /**
   * Delete a file from Supabase Storage
   */
  async deleteFile(storageUrl: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    if (!this.currentBandId) {
      throw new Error('No band selected. Call setCurrentBand() first.');
    }

    try {
      // Extract storage path from Edge Function URL
      // Format: https://.../functions/v1/serve-file-inline?path=...&token=...
      let url: URL;
      try {
        url = new URL(storageUrl);
      } catch (urlError) {
        throw new Error(
          `Invalid storage URL format. Expected Edge Function URL with path parameter, got: ${storageUrl}`
        );
      }
      const path = url.searchParams.get('path');

      if (!path) {
        throw new Error('Invalid storage URL: missing path parameter');
      }

      // Security: Verify the path belongs to current band
      // Expected path format: bands/{band_id}/charts/{song_id}/{file_id}.ext
      const pathSegments = path.split('/');
      if (pathSegments.length < 2 || pathSegments[0] !== 'bands') {
        throw new Error('Invalid storage path format');
      }

      const pathBandId = pathSegments[1];
      if (pathBandId !== this.currentBandId) {
        throw new Error('Cannot delete files from other bands');
      }

      const { error } = await supabase.storage.from('band-files').remove([path]);

      if (error) throw error;

      // Delete metadata (RLS policy will ensure it's for current band)
      await supabase.from('files').delete().eq('storage_path', path);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time updates from Supabase
   * @param callbacks - Callbacks for each table change
   */
  subscribeToChanges(callbacks: {
    onSongsChange?: (song: Song) => void;
    onMembersChange?: (member: BandMember) => void;
    onEventsChange?: (event: BandEvent) => void;
    onRolesChange?: (role: string) => void;
  }): void {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    if (!this.currentBandId) {
      throw new Error('No band selected. Call setCurrentBand() first.');
    }

    // Unsubscribe from existing channels to prevent memory leaks
    this.unsubscribeFromChanges();

    // Store band ID to avoid closure issues
    const bandId = this.currentBandId;

    type DbSong = {
      id: string;
      title: string;
      artist: string;
      duration: string | null;
      bpm: number | null;
      key: string | null;
      is_original: boolean;
      status: string;
      target_date?: string;
      charts?: unknown[];
      assignments?: unknown[];
      parts?: unknown[];
      backing_track_url?: string;
      ai_analysis?: string;
      lyrics?: string;
      band_id: string;
    };

    type DbMember = {
      id: string;
      name: string;
      roles: string[];
      avatar_color?: string;
      band_id: string;
    };

    type DbEvent = {
      id: string;
      title: string;
      date: string;
      time?: string;
      type: string;
      location?: string;
      notes?: string;
      band_id: string;
    };

    // Subscribe to songs
    if (callbacks.onSongsChange) {
      const songsChannel = supabase
        .channel('songs-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'songs',
            filter: `band_id=eq.${bandId}`,
          },
          payload => {
            if (payload.new && callbacks.onSongsChange) {
              const dbSong = payload.new as DbSong;
              // Validate band_id to prevent stale updates from band switches
              if (dbSong.band_id !== bandId) {
                return;
              }
              const song: Song = {
                id: dbSong.id,
                title: dbSong.title,
                artist: dbSong.artist,
                duration: dbSong.duration || '',
                bpm: dbSong.bpm || 120,
                key: dbSong.key || 'C',
                isOriginal: dbSong.is_original,
                status: dbSong.status as 'To Learn' | 'In Progress' | 'Performance Ready',
                targetDate: dbSong.target_date,
                charts: (dbSong.charts as []) || [],
                assignments: (dbSong.assignments as []) || [],
                parts: (dbSong.parts as []) || [],
                backingTrackUrl: dbSong.backing_track_url,
                aiAnalysis: dbSong.ai_analysis,
                lyrics: dbSong.lyrics,
              };
              callbacks.onSongsChange(song);
            }
          }
        )
        .subscribe();

      this.realtimeChannels.push(songsChannel);
    }

    // Subscribe to members
    if (callbacks.onMembersChange) {
      const membersChannel = supabase
        .channel('members-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'band_members',
            filter: `band_id=eq.${bandId}`,
          },
          payload => {
            if (payload.new && callbacks.onMembersChange) {
              const dbMember = payload.new as DbMember;
              // Validate band_id to prevent stale updates from band switches
              if (dbMember.band_id !== bandId) {
                return;
              }
              const member: BandMember = {
                id: dbMember.id,
                name: dbMember.name,
                roles: dbMember.roles,
                avatarColor: validateAvatarColor(dbMember.avatar_color),
              };
              callbacks.onMembersChange(member);
            }
          }
        )
        .subscribe();

      this.realtimeChannels.push(membersChannel);
    }

    // Subscribe to events
    if (callbacks.onEventsChange) {
      const eventsChannel = supabase
        .channel('events-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'band_events',
            filter: `band_id=eq.${bandId}`,
          },
          payload => {
            if (payload.new && callbacks.onEventsChange) {
              const dbEvent = payload.new as DbEvent;
              // Validate band_id to prevent stale updates from band switches
              if (dbEvent.band_id !== bandId) {
                return;
              }
              const event: BandEvent = {
                id: dbEvent.id,
                title: dbEvent.title,
                date: dbEvent.date,
                time: dbEvent.time,
                type: dbEvent.type as 'PRACTICE' | 'GIG' | 'OTHER',
                location: dbEvent.location,
                notes: dbEvent.notes,
              };
              callbacks.onEventsChange(event);
            }
          }
        )
        .subscribe();

      this.realtimeChannels.push(eventsChannel);
    }
  }

  /**
   * Unsubscribe from all real-time channels
   */
  unsubscribeFromChanges(): void {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    this.realtimeChannels.forEach(channel => {
      supabase.removeChannel(channel);
    });
    this.realtimeChannels = [];
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
   * Get the member record linked to a specific user in a band
   * @param userId - Supabase auth user ID
   * @param bandId - Band ID to search within
   * @returns BandMember if linked, null if not linked
   * @throws Error if database query fails
   */
  async getLinkedMemberForUser(userId: string, bandId: string): Promise<BandMember | null> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase is not configured. Check environment variables.');
    }

    try {
      const { data, error } = await supabase
        .from('band_members')
        .select('*')
        .eq('user_id', userId)
        .eq('band_id', bandId)
        .maybeSingle(); // Use maybeSingle to handle 0 or 1 results

      if (error) {
        console.error('[getLinkedMemberForUser] Database query failed:', {
          userId,
          bandId,
          error: error.message,
          code: error.code,
        });
        throw new Error(`Failed to fetch linked member: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      // Map database row to BandMember interface
      return {
        id: data.id,
        name: data.name,
        roles: data.roles,
        avatarColor: validateAvatarColor(data.avatar_color),
        userId: data.user_id,
      };
    } catch (err) {
      console.error('[getLinkedMemberForUser] Unexpected error:', err);
      throw err;
    }
  }

  /**
   * Log a practice session for a user
   * @throws Error if validation fails or database operation fails
   */
  async logPracticeSession(
    session: Omit<PracticeSession, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PracticeSession> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase is not configured. Check environment variables.');
    }

    if (!this.currentBandId) {
      throw new Error('No band selected. Call setCurrentBand() first.');
    }

    // Validate session data
    if (session.durationMinutes <= 0) {
      throw new Error('Practice duration must be greater than 0 minutes');
    }

    try {
      // Insert practice session
      const { data, error } = await supabase
        .from('practice_sessions')
        .insert({
          user_id: session.userId,
          song_id: session.songId,
          band_id: session.bandId,
          duration_minutes: session.durationMinutes,
          tempo_bpm: session.tempoBpm ?? null,
          sections_practiced: session.sectionsPracticed ?? null,
          notes: session.notes ?? null,
          date: session.date,
        })
        .select()
        .single();

      if (error) {
        console.error('Error logging practice session:', error);
        throw new Error('Failed to save practice session');
      }

      // Update last_practiced_at in user_song_status
      const { error: statusError } = await supabase
        .from('user_song_status')
        .upsert(
          {
            user_id: session.userId,
            song_id: session.songId,
            status: 'Learning', // Default status, won't overwrite existing
            last_practiced_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,song_id',
            ignoreDuplicates: false,
          }
        );

      if (statusError) {
        // Log warning but don't fail the operation
        console.warn('Failed to update last_practiced_at:', statusError);
      }

      return this.transformPracticeSession(data);
    } catch (error) {
      console.error('Error in logPracticeSession:', error);
      throw error;
    }
  }

  /**
   * Get practice sessions for a user with optional filters
   */
  async getPracticeSessions(
    userId: string,
    bandId: string,
    filters?: PracticeFilters
  ): Promise<PracticeSession[]> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase is not configured. Check environment variables.');
    }

    if (!this.currentBandId) {
      throw new Error('No band selected. Call setCurrentBand() first.');
    }

    try {
      let query = supabase
        .from('practice_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('band_id', bandId)
        .order('date', { ascending: false });

      if (filters?.songId) {
        query = query.eq('song_id', filters.songId);
      }

      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching practice sessions:', error);
        throw new Error('Failed to load practice sessions');
      }

      return (data || []).map(row => this.transformPracticeSession(row));
    } catch (error) {
      console.error('Error in getPracticeSessions:', error);
      throw error;
    }
  }

  /**
   * Transform database row to PracticeSession type
   */
  private transformPracticeSession(
    row: Database['public']['Tables']['practice_sessions']['Row']
  ): PracticeSession {
    return {
      id: row.id,
      userId: row.user_id,
      songId: row.song_id,
      bandId: row.band_id,
      durationMinutes: row.duration_minutes,
      tempoBpm: row.tempo_bpm ?? undefined,
      sectionsPracticed: (row.sections_practiced as string[] | null) ?? undefined,
      notes: row.notes ?? undefined,
      date: row.date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Update user's learning status for a song
   * Uses upsert to handle both insert and update cases
   */
  async updateUserSongStatus(
    userId: string,
    songId: string,
    status: UserSongStatus,
    confidence?: number
  ): Promise<UserSongProgress> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase is not configured. Check environment variables.');
    }

    try {
      const { data, error } = await supabase
        .from('user_song_status')
        .upsert(
          {
            user_id: userId,
            song_id: songId,
            status,
            confidence_level: confidence ?? null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,song_id',
          }
        )
        .select()
        .single();

      if (error) {
        console.error('Error updating user song status:', error);
        throw new Error('Failed to update song status');
      }

      return this.transformUserSongProgress(data);
    } catch (error) {
      console.error('Error in updateUserSongStatus:', error);
      throw error instanceof Error ? error : new Error('Failed to update song status');
    }
  }

  /**
   * Get user's learning status for a specific song
   * Returns null if no status exists yet
   */
  async getUserSongStatus(userId: string, songId: string): Promise<UserSongProgress | null> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase is not configured. Check environment variables.');
    }

    try {
      const { data, error } = await supabase
        .from('user_song_status')
        .select('*')
        .eq('user_id', userId)
        .eq('song_id', songId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user song status:', error);
        throw new Error('Failed to load song status');
      }

      return data ? this.transformUserSongProgress(data) : null;
    } catch (error) {
      console.error('Error in getUserSongStatus:', error);
      throw error instanceof Error ? error : new Error('Failed to load song status');
    }
  }

  /**
   * Get all song statuses for a user in a band
   * Returns a Map keyed by songId for efficient lookups
   */
  async getAllUserSongStatuses(userId: string, bandId: string): Promise<Map<string, UserSongProgress>> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase is not configured. Check environment variables.');
    }

    try {
      // First get all song IDs for this band
      const { data: songs, error: songsError } = await supabase
        .from('songs')
        .select('id')
        .eq('band_id', bandId);

      if (songsError) {
        console.error('Error fetching songs:', songsError);
        throw new Error('Failed to load songs');
      }

      const songIds = songs?.map(s => s.id) || [];

      if (songIds.length === 0) {
        return new Map();
      }

      // Get user's statuses for these songs
      const { data, error } = await supabase
        .from('user_song_status')
        .select('*')
        .eq('user_id', userId)
        .in('song_id', songIds);

      if (error) {
        console.error('Error fetching user song statuses:', error);
        throw new Error('Failed to load song statuses');
      }

      const statusMap = new Map<string, UserSongProgress>();
      (data || []).forEach(row => {
        statusMap.set(row.song_id, this.transformUserSongProgress(row));
      });

      return statusMap;
    } catch (error) {
      console.error('Error in getAllUserSongStatuses:', error);
      throw error instanceof Error ? error : new Error('Failed to load song statuses');
    }
  }

  /**
   * Transform database row to UserSongProgress type
   */
  private transformUserSongProgress(
    row: Database['public']['Tables']['user_song_status']['Row']
  ): UserSongProgress {
    return {
      id: row.id,
      userId: row.user_id,
      songId: row.song_id,
      status: row.status as UserSongStatus,
      confidenceLevel: row.confidence_level ?? undefined,
      lastPracticedAt: row.last_practiced_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Calculate aggregate practice statistics for a user
   * @param userId - User ID to calculate stats for
   * @param bandId - Band ID to scope the statistics
   * @param dateRange - Optional date range to filter sessions
   * @returns Aggregate statistics including session counts, time, and learning progress
   */
  async calculatePracticeStats(
    userId: string,
    bandId: string,
    dateRange?: { start: string; end: string }
  ): Promise<PracticeStats> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase is not configured. Check environment variables.');
    }

    if (!this.currentBandId) {
      throw new Error('No band selected. Call setCurrentBand() first.');
    }

    try {
      // Build query for practice sessions
      let sessionsQuery = supabase
        .from('practice_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('band_id', bandId);

      if (dateRange?.start) {
        sessionsQuery = sessionsQuery.gte('date', dateRange.start);
      }
      if (dateRange?.end) {
        sessionsQuery = sessionsQuery.lte('date', dateRange.end);
      }

      const { data: sessions, error: sessionsError } = await sessionsQuery;

      if (sessionsError) {
        console.error('Error fetching sessions for stats:', sessionsError);
        throw new Error('Failed to calculate practice statistics');
      }

      // Get song IDs for this band
      const { data: songs, error: songsError } = await supabase
        .from('songs')
        .select('id')
        .eq('band_id', bandId);

      if (songsError) {
        console.error('Error fetching songs:', songsError);
        throw new Error('Failed to load songs');
      }

      const songIds = songs?.map(s => s.id) || [];

      // Get user's song statuses
      let statusesQuery = supabase
        .from('user_song_status')
        .select('*')
        .eq('user_id', userId);

      if (songIds.length > 0) {
        statusesQuery = statusesQuery.in('song_id', songIds);
      }

      const { data: statuses, error: statusError } = await statusesQuery;

      if (statusError) {
        console.error('Error fetching statuses:', statusError);
        throw new Error('Failed to load song statuses');
      }

      // Calculate statistics
      const totalSessions = sessions?.length || 0;
      const totalMinutes = sessions?.reduce((sum, s) => sum + s.duration_minutes, 0) || 0;
      const averageSessionMinutes = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;

      const songsLearned = (statuses || []).filter(
        s => s.status === 'Learned' || s.status === 'Mastered'
      ).length;
      const songsMastered = (statuses || []).filter(s => s.status === 'Mastered').length;

      // Get recent sessions (last 5)
      const recentSessions = (sessions || [])
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)
        .map(row => this.transformPracticeSession(row));

      return {
        totalSessions,
        totalMinutes,
        averageSessionMinutes,
        songsLearned,
        songsMastered,
        recentSessions,
      };
    } catch (error) {
      console.error('Error in calculatePracticeStats:', error);
      throw error instanceof Error ? error : new Error('Failed to calculate practice statistics');
    }
  }
}

/**
 * Fetch all unlinked members in a band from the database (user_id IS NULL)
 * @param bandId - Band ID to search within
 * @returns Array of BandMember records available for claiming
 * @throws Error if database query fails
 */
export async function fetchUnlinkedMembers(
  bandId: string
): Promise<BandMember[]> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase is not configured. Check environment variables.');
    }

    const { data, error } = await supabase
      .from('band_members')
      .select('*')
      .eq('band_id', bandId)
      .is('user_id', null)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching unlinked members:', error);
      throw new Error(`Failed to fetch unlinked members: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Map database rows to BandMember interfaces
    return data.map(row => ({
      id: row.id,
      name: row.name,
      roles: row.roles,
      avatarColor: validateAvatarColor(row.avatar_color),
      userId: row.user_id, // Will be null for all results
    }));
  } catch (err) {
    console.error('Unexpected error in fetchUnlinkedMembers:', err);
    throw err;
  }
}

/**
 * Claim a band member record by linking it to the current user
 * @param userId - Supabase auth user ID
 * @param memberId - Band member ID to claim
 * @param bandId - Band ID (for validation)
 * @throws Error if user is not a band member or member is already claimed
 */
export async function claimMember(
  userId: string,
  memberId: string,
  bandId: string
): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase is not configured. Check environment variables.');
    }

    // Step 1: Verify user is a member of the band
    const { data: userBand, error: userBandError } = await supabase
      .from('user_bands')
      .select('user_id')
      .eq('user_id', userId)
      .eq('band_id', bandId)
      .maybeSingle();

    if (userBandError) {
      console.error('Error checking user band membership:', userBandError);
      throw new Error('Failed to verify band membership');
    }

    if (!userBand) {
      throw new Error('You must be a member of this band to claim a member record');
    }

    // Step 2: Verify member exists and is not already claimed
    const { data: member, error: memberError } = await supabase
      .from('band_members')
      .select('id, user_id, name, band_id')
      .eq('id', memberId)
      .eq('band_id', bandId)
      .maybeSingle();

    if (memberError) {
      console.error('Error fetching member:', memberError);
      throw new Error('Failed to verify member status');
    }

    if (!member) {
      throw new Error('Member not found in this band');
    }

    if (member.user_id !== null) {
      throw new Error('This member is already linked to another user');
    }

    // Step 3: Attempt to claim the member (update user_id)
    const { error: updateError } = await supabase
      .from('band_members')
      .update({ user_id: userId })
      .eq('id', memberId)
      .eq('band_id', bandId)
      .is('user_id', null); // Additional check to prevent race condition

    if (updateError) {
      console.error('Error claiming member:', updateError);

      // Check for unique constraint violation (23505 is PostgreSQL unique violation code)
      if (updateError.code === '23505') {
        // User already linked to another member in this band
        throw new Error('You are already linked to a member in this band');
      }

      throw new Error(`Failed to claim member: ${updateError.message}`);
    }

    // Step 4: Verify the update was successful (prevents race condition)
    const { data: updatedMember, error: verifyError } = await supabase
      .from('band_members')
      .select('user_id')
      .eq('id', memberId)
      .single();

    if (verifyError || updatedMember?.user_id !== userId) {
      throw new Error('This member was just claimed by someone else');
    }
  } catch (err) {
    console.error('Error in claimMember:', err);
    throw err;
  }
}

// Export singleton instance
export const supabaseStorageService = new SupabaseStorageService();
