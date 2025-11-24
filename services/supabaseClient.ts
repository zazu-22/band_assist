import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Database schema types will be inferred by Supabase
export interface Database {
  public: {
    Tables: {
      bands: {
        Row: {
          id: string;
          name: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_bands: {
        Row: {
          user_id: string;
          band_id: string;
          role: string;
          joined_at: string;
        };
        Insert: {
          user_id: string;
          band_id: string;
          role?: string;
          joined_at?: string;
        };
        Update: {
          user_id?: string;
          band_id?: string;
          role?: string;
          joined_at?: string;
        };
      };
      invitations: {
        Row: {
          id: string;
          band_id: string;
          email: string;
          invited_by: string;
          status: string;
          invited_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          band_id: string;
          email: string;
          invited_by: string;
          status?: string;
          invited_at?: string;
          accepted_at?: string | null;
        };
        Update: {
          id?: string;
          band_id?: string;
          email?: string;
          invited_by?: string;
          status?: string;
          invited_at?: string;
          accepted_at?: string | null;
        };
      };
      band_members: {
        Row: {
          id: string;
          name: string;
          roles: string[];
          avatar_color: string | null;
          band_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          roles?: string[];
          avatar_color?: string | null;
          band_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          roles?: string[];
          avatar_color?: string | null;
          band_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      songs: {
        Row: {
          id: string;
          title: string;
          artist: string;
          duration: string | null;
          bpm: number | null;
          key: string | null;
          is_original: boolean;
          status: string;
          target_date: string | null;
          charts: unknown; // JSONB
          assignments: unknown; // JSONB
          parts: unknown; // JSONB
          backing_track_url: string | null;
          backing_track_storage_path: string | null;
          ai_analysis: string | null;
          lyrics: string | null;
          sort_order: number | null;
          band_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          artist: string;
          duration?: string | null;
          bpm?: number | null;
          key?: string | null;
          is_original?: boolean;
          status: string;
          target_date?: string | null;
          charts?: unknown;
          assignments?: unknown;
          parts?: unknown;
          backing_track_url?: string | null;
          backing_track_storage_path?: string | null;
          ai_analysis?: string | null;
          lyrics?: string | null;
          sort_order?: number | null;
          band_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          artist?: string;
          duration?: string | null;
          bpm?: number | null;
          key?: string | null;
          is_original?: boolean;
          status?: string;
          target_date?: string | null;
          charts?: unknown;
          assignments?: unknown;
          parts?: unknown;
          backing_track_url?: string | null;
          backing_track_storage_path?: string | null;
          ai_analysis?: string | null;
          lyrics?: string | null;
          sort_order?: number | null;
          band_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      band_events: {
        Row: {
          id: string;
          title: string;
          date: string;
          time: string | null;
          type: string;
          location: string | null;
          notes: string | null;
          band_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          date: string;
          time?: string | null;
          type: string;
          location?: string | null;
          notes?: string | null;
          band_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          date?: string;
          time?: string | null;
          type?: string;
          location?: string | null;
          notes?: string | null;
          band_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      roles: {
        Row: {
          id: string;
          name: string;
          band_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          band_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          band_id?: string | null;
          created_at?: string;
        };
      };
      files: {
        Row: {
          id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          file_size: number;
          uploaded_by: string | null;
          band_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          file_size: number;
          uploaded_by?: string | null;
          band_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          storage_path?: string;
          file_name?: string;
          mime_type?: string;
          file_size?: number;
          uploaded_by?: string | null;
          band_id?: string | null;
          created_at?: string;
        };
      };
    };
  };
}

// Create Supabase client (singleton)
let supabaseClient: SupabaseClient<Database> | null = null;

export const getSupabaseClient = (): SupabaseClient<Database> | null => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return supabaseClient;
};

// Helper to check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey);
};

// Export singleton instance (may be null if not configured)
export const supabase = getSupabaseClient();
