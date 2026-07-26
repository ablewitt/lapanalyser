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
      support_tickets: {
        Row: {
          id: string;
          user_id: string | null;
          subject: string;
          category: 'bug' | 'feature' | 'account' | 'data' | 'other';
          status: 'open' | 'in_progress' | 'resolved' | 'closed';
          priority: 'low' | 'normal' | 'high';
          session_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject: string;
          category?: 'bug' | 'feature' | 'account' | 'data' | 'other';
          status?: 'open' | 'in_progress' | 'resolved' | 'closed';
          priority?: 'low' | 'normal' | 'high';
          session_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          subject?: string;
          category?: 'bug' | 'feature' | 'account' | 'data' | 'other';
          status?: 'open' | 'in_progress' | 'resolved' | 'closed';
          priority?: 'low' | 'normal' | 'high';
          session_id?: string | null;
        };
        Relationships: [];
      };
      support_messages: {
        Row: {
          id: string;
          ticket_id: string;
          author_id: string | null;
          body: string;
          is_internal: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          author_id: string;
          body: string;
          is_internal?: boolean;
          created_at?: string;
        };
        Update: {
          body?: string;
          is_internal?: boolean;
        };
        Relationships: [];
      };
      ticket_attachments: {
        Row: {
          id: string;
          ticket_id: string;
          message_id: string;
          uploader_id: string | null;
          kind: 'image' | 'session';
          storage_path: string | null;
          mime: string | null;
          size_bytes: number | null;
          session_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          message_id: string;
          uploader_id: string;
          kind?: 'image' | 'session';
          storage_path?: string | null;
          mime?: string | null;
          size_bytes?: number | null;
          session_id?: string | null;
          created_at?: string;
        };
        Update: {
          storage_path?: string | null;
          mime?: string | null;
          size_bytes?: number | null;
          session_id?: string | null;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: number;
          created_at: string;
          actor_id: string | null;
          action: string;
          target_type: string | null;
          target_id: string | null;
          metadata: Json;
        };
        Insert: {
          actor_id?: string | null;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Json;
        };
        Update: never;
        Relationships: [];
      };
      ticket_reads: {
        Row: {
          user_id: string;
          ticket_id: string;
          last_read_at: string;
        };
        Insert: {
          user_id: string;
          ticket_id: string;
          last_read_at?: string;
        };
        Update: {
          last_read_at?: string;
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
      unread_message_count: {
        Args: Record<string, never>;
        Returns: number;
      };
      unread_ticket_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
      admin_list_users: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          username: string | null;
          email: string;
          role: 'user' | 'admin';
          created_at: string;
          last_sign_in_at: string | null;
          session_count: number;
          storage_bytes: number;
        }[];
      };
      admin_set_role: {
        Args: { target_id: string; new_role: string };
        Returns: undefined;
      };
      admin_delete_user: {
        Args: { target_id: string };
        Returns: undefined;
      };
      admin_stats_totals: {
        Args: Record<string, never>;
        Returns: {
          users: number;
          sessions: number;
          public_sessions: number;
          open_tickets: number;
          storage_bytes: number;
        }[];
      };
      admin_daily_counts: {
        Args: { p_days?: number };
        Returns: {
          day: string;
          signups: number;
          sessions: number;
          tickets: number;
          active: number;
        }[];
      };
      admin_top_circuits: {
        Args: { p_limit?: number };
        Returns: { circuit: string; sessions: number }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
