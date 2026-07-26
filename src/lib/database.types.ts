export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          role: 'user' | 'admin';
          created_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name?: string | null;
          role?: 'user' | 'admin';
          created_at?: string;
        };
        Update: {
          username?: string | null;
          display_name?: string | null;
          role?: 'user' | 'admin';
        };
        Relationships: [];
      };
      tracks: {
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
          name?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          filename: string;
          display_name: string | null;
          venue_raw: string | null;
          track_id: string | null;
          date_recorded: string | null;
          is_public: boolean;
          storage_path: string;
          lap_count: number | null;
          best_lap_time_ms: number | null;
          circuit_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          filename: string;
          display_name?: string | null;
          venue_raw?: string | null;
          track_id?: string | null;
          date_recorded?: string | null;
          is_public?: boolean;
          storage_path: string;
          lap_count?: number | null;
          best_lap_time_ms?: number | null;
          circuit_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          venue_raw?: string | null;
          track_id?: string | null;
          date_recorded?: string | null;
          is_public?: boolean;
          storage_path?: string;
          lap_count?: number | null;
          best_lap_time_ms?: number | null;
          circuit_name?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      track_configs: {
        Row: {
          id: string;
          user_id: string;
          track_id: string;
          name: string;
          is_default: boolean;
          is_public: boolean;
          sectors: Json;
          traps: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          track_id: string;
          name: string;
          is_default?: boolean;
          is_public?: boolean;
          sectors?: Json;
          traps?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          is_default?: boolean;
          is_public?: boolean;
          sectors?: Json;
          traps?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      session_shares: {
        Row: {
          session_id: string;
          shared_with_user_id: string;
          created_at: string;
        };
        Insert: {
          session_id: string;
          shared_with_user_id: string;
          created_at?: string;
        };
        Update: {
          session_id?: string;
          shared_with_user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      track_config_shares: {
        Row: {
          config_id: string;
          shared_with_user_id: string;
          created_at: string;
        };
        Insert: {
          config_id: string;
          shared_with_user_id: string;
          created_at?: string;
        };
        Update: {
          config_id?: string;
          shared_with_user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          map_base: string;
          show_heatmap: boolean;
          heat_channel: string;
          show_sectors: boolean;
          show_events: boolean;
          show_traps: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          map_base?: string;
          show_heatmap?: boolean;
          heat_channel?: string;
          show_sectors?: boolean;
          show_events?: boolean;
          show_traps?: boolean;
          updated_at?: string;
        };
        Update: {
          map_base?: string;
          show_heatmap?: boolean;
          heat_channel?: string;
          show_sectors?: boolean;
          show_events?: boolean;
          show_traps?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      lookup_user: {
        Args: { query: string };
        Returns: { id: string; username: string | null }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
