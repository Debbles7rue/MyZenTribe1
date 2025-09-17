// lib/database.types.ts
// Manual types for the AI Meeting Coordinator

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          title: string;
          description?: string;
          start_time: string;
          end_time: string;
          location?: string;
          created_by: string;
          visibility: 'private' | 'friends' | 'public';
          created_at: string;
          updated_at: string;
          // New meeting fields
          event_type?: string;
          participants?: string[];
          meeting_type?: 'virtual' | 'in-person' | 'hybrid';
          meeting_metadata?: Record<string, any>;
          source?: string;
          parent_poll_id?: string;
          preparation_time?: number;
          meeting_link?: string;
          ai_score?: number;
          ai_reasoning?: string;
        };
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['events']['Insert']>;
      };
      
      meeting_polls: {
        Row: {
          id: string;
          created_by: string;
          poll_code: string;
          meeting_details: Record<string, any>;
          suggested_slots: Record<string, any>;
          participants: string[];
          responses: Record<string, any>;
          final_slot?: Record<string, any>;
          status: string;
          expires_at?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['meeting_polls']['Row'], 'id' | 'poll_code' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['meeting_polls']['Insert']>;
      };
      
      meeting_poll_responses: {
        Row: {
          id: string;
          poll_id: string;
          user_id?: string;
          name?: string;
          email?: string;
          availability: Record<string, any>;
          preferences?: Record<string, any>;
          notes?: string;
          responded_at: string;
        };
        Insert: Omit<Database['public']['Tables']['meeting_poll_responses']['Row'], 'id' | 'responded_at'>;
        Update: Partial<Database['public']['Tables']['meeting_poll_responses']['Insert']>;
      };
      
      meeting_templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon?: string;
          meeting_details: Record<string, any>;
          is_public: boolean;
          usage_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['meeting_templates']['Row'], 'id' | 'usage_count' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['meeting_templates']['Insert']>;
      };
      
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message?: string;
          metadata?: Record<string, any>;
          is_read: boolean;
          action_url?: string;
          created_by?: string;
          created_at: string;
          read_at?: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      
      meeting_preferences: {
        Row: {
          user_id: string;
          default_duration: number;
          preferred_times: Record<string, any>;
          buffer_time: number;
          working_days: number[];
          working_hours: Record<string, any>;
          timezone: string;
          auto_decline_conflicts: boolean;
          allow_ai_scheduling: boolean;
          email_notifications: boolean;
          push_notifications: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['meeting_preferences']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['meeting_preferences']['Insert']>;
      };
      
      ai_scheduling_history: {
        Row: {
          id: string;
          user_id: string;
          event_id?: string;
          poll_id?: string;
          suggested_slots: Record<string, any>;
          selected_slot?: Record<string, any>;
          feedback?: string;
          feedback_notes?: string;
          participants_count?: number;
          meeting_type?: string;
          scheduling_duration?: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ai_scheduling_history']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['ai_scheduling_history']['Insert']>;
      };
      
      participant_availability: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          busy_slots: any[];
          working_hours: Record<string, any>;
          timezone: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['participant_availability']['Row'], 'id' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['participant_availability']['Insert']>;
      };
    };
  };
}

// Helper types for easier use
export type Event = Database['public']['Tables']['events']['Row'];
export type NewEvent = Database['public']['Tables']['events']['Insert'];
export type MeetingPoll = Database['public']['Tables']['meeting_polls']['Row'];
export type MeetingTemplate = Database['public']['Tables']['meeting_templates']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type MeetingPreferences = Database['public']['Tables']['meeting_preferences']['Row'];
