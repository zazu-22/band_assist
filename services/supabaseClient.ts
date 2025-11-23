import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Database schema types will be inferred by Supabase
export interface Database {
  public: {
    Tables: {
      band_members: {
        Row: {
          id: string;
          name: string;
          roles: string[];
          avatar_color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          roles?: string[];
          avatar_color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          roles?: string[];
          avatar_color?: string | null;
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
          charts: any; // JSONB
          assignments: any; // JSONB
          parts: any; // JSONB
          backing_track_url: string | null;
          ai_analysis: string | null;
          lyrics: string | null;
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
          charts?: any;
          assignments?: any;
          parts?: any;
          backing_track_url?: string | null;
          ai_analysis?: string | null;
          lyrics?: string | null;
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
          charts?: any;
          assignments?: any;
          parts?: any;
          backing_track_url?: string | null;
          ai_analysis?: string | null;
          lyrics?: string | null;
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
          created_at?: string;
          updated_at?: string;
        };
      };
      roles: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          file_size: number;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          storage_path?: string;
          file_name?: string;
          mime_type?: string;
          file_size?: number;
          uploaded_by?: string | null;
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
    console.warn('Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
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
