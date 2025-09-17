// lib/meetingTypes.ts
// Simplified types for the AI Meeting Coordinator

export interface MeetingEvent {
  id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  created_by: string;
  visibility?: 'private' | 'friends' | 'public';
  event_type?: string;
  participants?: string[];
  meeting_type?: 'virtual' | 'in-person' | 'hybrid';
  meeting_metadata?: any;
  source?: string;
  ai_score?: number;
  ai_reasoning?: string;
}

export interface MeetingPoll {
  id?: string;
  created_by: string;
  poll_code?: string;
  meeting_details: any;
  suggested_slots: any;
  participants?: string[];
  responses?: any;
  status?: string;
  expires_at?: string;
}

export interface MeetingNotification {
  user_id: string;
  type: string;
  title: string;
  message?: string;
  metadata?: any;
  is_read?: boolean;
  action_url?: string;
  created_by?: string;
}

export interface MeetingTemplate {
  id?: string;
  name: string;
  icon?: string;
  meeting_details: any;
  is_public?: boolean;
}
