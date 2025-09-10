// app/(protected)/calendar/types/index.ts

export type Mode = 'my' | 'whats';
export type View = 'month' | 'week' | 'day' | 'agenda';

export interface CalendarForm {
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
  visibility: 'private' | 'friends' | 'public';
  event_type: string;
  community_id: string;
  source: string;
  image_path: string;
  cover_photo: string;  // Added for cover photo feature
  parent_event_id: string | null;  // Added for linking pre/post events
  pre_event: {  // Added for pre-event activities
    title: string;
    time: string;
  } | null;
  post_event: {  // Added for post-event activities
    title: string;
    time: string;
  } | null;
}

export interface QuickModalForm {
  title: string;
  description: string;
  date: string;
  time: string;
  enableNotification: boolean;
  notificationMinutes: number;
}

export interface TodoReminder {
  id: string;
  title: string;
  description?: string;
  date?: string;
  due_date?: string;
  completed: boolean;
  type: 'reminder' | 'todo';
  priority?: 'high' | 'medium' | 'low';
}

export interface Friend {
  friend_id: string;
  name: string;
  avatar: string | null;
  status?: 'confirmed' | 'pending';  // Added for carpool safety
  lastCarpoolDate?: Date | null;
}

export interface FeedEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  visibility: 'private' | 'friends' | 'public';
  created_by: string;
  event_type?: string;
  community_id?: string;
  source?: string;
  image_path?: string;
  cover_photo?: string;
  _dismissed?: boolean;
}

export interface CarpoolMatch {
  event: any;
  matches: Friend[];
  impact: {
    co2Saved: number;
    moneySaved: number;
  };
}

export type CalendarTheme = 'default' | 'minimal' | 'colorful' | 'nature' | 'space';
