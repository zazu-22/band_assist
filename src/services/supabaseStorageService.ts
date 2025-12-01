import { Song, BandMember, BandEvent, SongChart, Assignment, SongPart } from '../types';
import { IStorageService, LoadResult } from './IStorageService';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { validateAvatarColor } from '@/lib/avatar';
import { RealtimeChannel } from '@supabase/supabase-js';
import type { Json } from '../types/database.types';

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

      const songs: Song[] | null = songsData
        ? songsData.map(s => ({
            id: s.id,
            title: s.title,
            artist: s.artist,
            duration: s.duration || '',
            bpm: s.bpm || 120,
            key: s.key || 'C',
            isOriginal: s.is_original,
            status: s.status as 'To Learn' | 'In Progress' | 'Performance Ready',
            targetDate: s.target_date || undefined,
            charts: (s.charts as unknown as SongChart[]) || [],
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
          }))
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
   * @returns Storage URL or null on error
   */
  async uploadFile(
    file: Blob,
    fileName: string,
    mimeType: string,
    songId: string,
    fileType: 'chart' | 'audio'
  ): Promise<string | null> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    if (!this.currentBandId) {
      throw new Error('No band selected. Call setCurrentBand() first.');
    }

    try {
      const fileId = crypto.randomUUID();
      const extension = fileName.split('.').pop() || 'bin';
      // New path structure: bands/{band_id}/charts/{song_id}/{file_id}.ext
      const storagePath = `bands/${this.currentBandId}/${fileType}s/${songId}/${fileId}.${extension}`;

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
        band_id: this.currentBandId!,
      };
      const { error: metadataError } = await supabase.from('files').insert(fileMetadata);

      if (metadataError) {
        // Log metadata insert failures but don't fail the upload
        console.warn('Failed to save file metadata:', metadataError);
      }

      // Get public URL (signed URL for private bucket)
      const { data: urlData } = await supabase.storage
        .from('band-files')
        .createSignedUrl(storagePath, 31536000); // 1 year expiry

      return urlData?.signedUrl || null;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
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
    const url = await this.uploadFile(file, fileName, mimeType, songId, 'chart');
    if (!url) return null;

    // Extract storage path from URL
    const urlParts = url.split('/band-files/');
    const storagePath = urlParts.length > 1 ? urlParts[1].split('?')[0] : '';

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
    // Upload to Storage
    const url = await this.uploadFile(file, fileName, mimeType, songId, 'audio');
    if (!url) return null;

    // Extract storage path from URL
    const urlParts = url.split('/band-files/');
    const storagePath = urlParts.length > 1 ? urlParts[1].split('?')[0] : '';

    return { url, storagePath };
  }

  /**
   * Delete a file from Supabase Storage
   */
  async deleteFile(storageUrl: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    if (!this.currentBandId) {
      throw new Error('No band selected. Call setCurrentBand() first.');
    }

    try {
      // Extract storage path from URL
      const urlParts = storageUrl.split('/band-files/');
      if (urlParts.length < 2) return;

      const path = urlParts[1].split('?')[0]; // Remove query params

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
      throw error; // Re-throw instead of silently swallowing
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
}

// Export singleton instance
export const supabaseStorageService = new SupabaseStorageService();
