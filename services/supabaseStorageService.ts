import { Song, BandMember, BandEvent } from '../types';
import { IStorageService, LoadResult } from './IStorageService';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

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
      charts: unknown;
      assignments: unknown;
      parts: unknown;
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
        // Type assertion required: Supabase's generated types don't match our data structure
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(memberData as any, { onConflict: 'id' });

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
        charts: s.charts || [],
        assignments: s.assignments || [],
        parts: s.parts || [],
        backing_track_url: s.backingTrackUrl || null,
        backing_track_storage_path: s.backingTrackStoragePath || null,
        ai_analysis: s.aiAnalysis || null,
        lyrics: s.lyrics || null,
        sort_order: s.sortOrder !== undefined ? s.sortOrder : null,
        band_id: this.currentBandId!,
      }));
      const { error: songsError } = await supabase
        .from('songs')
        // Type assertion required: Supabase's generated types don't match our data structure
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(songData as any, { onConflict: 'id' });

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
        // Type assertion required: Supabase's generated types don't match our data structure
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(eventData as any, { onConflict: 'id' });

      if (eventsError) throw eventsError;

      // Save roles (upsert by name + band_id)
      const roleData: RoleInsert[] = roles.map(r => ({ name: r, band_id: this.currentBandId! }));
      const { error: rolesError } = await supabase
        .from('roles')
        // Type assertion required: Supabase's generated types don't match our data structure
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(roleData as any, { onConflict: 'name,band_id', ignoreDuplicates: true });

      if (rolesError) throw rolesError;
    } catch (error) {
      console.error('Error saving to Supabase:', error);
      throw new Error(
        `Failed to save data: ${error instanceof Error ? error.message : 'Unknown error'}`
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

    try {
      // Load members
      type MemberRow = {
        id: string;
        name: string;
        roles: string[];
        avatar_color: string | null;
      };
      const { data: membersData, error: membersError } = (await supabase
        .from('band_members')
        .select('*')
        .order('name')) as { data: MemberRow[] | null; error: unknown };

      if (membersError) throw membersError;

      // Load songs
      // Order by sort_order first (for setlist view), then by title for unordered songs
      type SongRow = {
        id: string;
        title: string;
        artist: string;
        duration: string | null;
        bpm: number | null;
        key: string | null;
        is_original: boolean;
        status: string;
        target_date: string | null;
        charts: unknown;
        assignments: unknown;
        parts: unknown;
        backing_track_url: string | null;
        backing_track_storage_path: string | null;
        ai_analysis: string | null;
        lyrics: string | null;
        sort_order: number | null;
      };
      const { data: songsData, error: songsError } = (await supabase
        .from('songs')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('title', { ascending: true })) as { data: SongRow[] | null; error: unknown };

      if (songsError) throw songsError;

      // Load events
      type EventRow = {
        id: string;
        title: string;
        date: string;
        time: string | null;
        type: string;
        location: string | null;
        notes: string | null;
      };
      const { data: eventsData, error: eventsError } = (await supabase
        .from('band_events')
        .select('*')
        .order('date')) as { data: EventRow[] | null; error: unknown };

      if (eventsError) throw eventsError;

      // Load roles
      type RoleRow = {
        name: string;
      };
      const { data: rolesData, error: rolesError } = (await supabase
        .from('roles')
        .select('name')
        .order('name')) as { data: RoleRow[] | null; error: unknown };

      if (rolesError) throw rolesError;

      // Transform database format to app format
      const members: BandMember[] | null = membersData
        ? membersData.map(m => ({
            id: m.id,
            name: m.name,
            roles: m.roles,
            avatarColor: m.avatar_color || undefined,
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
            // Type assertion required: Supabase's generated types don't match our data structure
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            charts: (s.charts as any) || [],
            // Type assertion required: Supabase's generated types don't match our data structure
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            assignments: (s.assignments as any) || [],
            // Type assertion required: Supabase's generated types don't match our data structure
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            parts: (s.parts as any) || [],
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
      // Type assertion required: Supabase's generated types don't match our data structure
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: metadataError } = await supabase.from('files').insert(fileMetadata as any);

      if (metadataError) {
        // Don't fail the upload if metadata fails
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

    try {
      // Extract storage path from URL
      const urlParts = storageUrl.split('/band-files/');
      if (urlParts.length < 2) return;

      const path = urlParts[1].split('?')[0]; // Remove query params

      const { error } = await supabase.storage.from('band-files').remove([path]);

      if (error) throw error;

      // Delete metadata
      await supabase.from('files').delete().eq('storage_path', path);
    } catch (error) {
      console.error('Error deleting file:', error);
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
    };

    type DbMember = {
      id: string;
      name: string;
      roles: string[];
      avatar_color?: string;
    };

    type DbEvent = {
      id: string;
      title: string;
      date: string;
      time?: string;
      type: string;
      location?: string;
      notes?: string;
    };

    // Subscribe to songs
    if (callbacks.onSongsChange) {
      const songsChannel = supabase
        .channel('songs-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, payload => {
          if (payload.new && callbacks.onSongsChange) {
            const dbSong = payload.new as DbSong;
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
        })
        .subscribe();

      this.realtimeChannels.push(songsChannel);
    }

    // Subscribe to members
    if (callbacks.onMembersChange) {
      const membersChannel = supabase
        .channel('members-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'band_members' },
          payload => {
            if (payload.new && callbacks.onMembersChange) {
              const dbMember = payload.new as DbMember;
              const member: BandMember = {
                id: dbMember.id,
                name: dbMember.name,
                roles: dbMember.roles,
                avatarColor: dbMember.avatar_color,
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'band_events' }, payload => {
          if (payload.new && callbacks.onEventsChange) {
            const dbEvent = payload.new as DbEvent;
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
        })
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
