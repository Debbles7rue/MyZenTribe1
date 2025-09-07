// app/(protected)/calendar/types/index.ts

import type { DBEvent, Visibility } from '@/lib/types';

export type Mode = 'my' | 'whats';

export type CalendarTheme = 
  | 'default'
  | 'spring'
  | 'summer'
  | 'autumn'
  | 'winter'
  | 'nature'
  | 'ocean';

export interface TodoReminder {
  id: string;
  title: string;
  description?: string;
  date: string;
  completed: boolean;
  type: 'reminder' | 'todo';
}

export interface Friend {
  friend_id: string;
  name: string;
  avatar: string | null;
  lastCarpoolDate: string | null;
}

export interface CarpoolMatch {
  id: string;
  friendName: string;
  destination: string;
  time: string;
  date: string;
  savings: string;
  myEventId?: string;
  friendEventId?: string;
}

export interface FeedEvent extends DBEvent {
  _dismissed?: boolean;
  _eventSource?: 'business' | 'community' | 'friend_invite';
  _userRelation?: 'following' | 'member' | 'invited';
}

export interface CalendarForm {
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
  visibility: Visibility;
  event_type: string;
  community_id: string;
  source: 'personal' | 'business';
  image_path: string;
}

export interface QuickModalForm {
  title: string;
  description: string;
  date: string;
  time: string;
  enableNotification: boolean;
  notificationMinutes: number;
}

export interface UserStats {
  points: number;
  level: number;
  streak: number;
  achievements: string[];
  lastAchievement?: string;
}

export interface MoodEntry {
  date: string;
  mood: 'amazing' | 'good' | 'okay' | 'tough' | 'difficult';
  notes?: string;
  energy?: number;
  gratitude?: string[];
}

export interface PhotoMemory {
  id: string;
  date: string;
  photoUrl: string;
  caption?: string;
  eventId?: string;
}

export interface TimeBlock {
  id: string;
  title: string;
  category: 'deep-work' | 'meetings' | 'email' | 'break' | 'personal';
  duration: number; // minutes
  completed: boolean;
  date: string;
}

export interface PomodoroSession {
  id: string;
  taskName: string;
  duration: number; // minutes
  breakDuration: number; // minutes
  completedCycles: number;
  targetCycles: number;
  startTime: string;
  endTime?: string;
}

export interface WeatherData {
  temperature: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy';
  humidity: number;
  windSpeed: number;
  suggestion?: string;
}

export interface MeditationSession {
  id: string;
  type: 'guided' | 'breathing' | 'mindfulness' | 'sleep';
  duration: number; // minutes
  date: string;
  completed: boolean;
  notes?: string;
}

export interface GratitudeEntry {
  id: string;
  date: string;
  entries: string[];
  mood?: string;
  reflection?: string;
}

export interface EventCountdown {
  eventId: string;
  title: string;
  targetDate: string;
  color: string;
  emoji: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: 'work' | 'personal' | 'fitness' | 'education' | 'social';
  events: Partial<DBEvent>[];
  icon: string;
  color: string;
}

export interface NotificationSettings {
  reminders: boolean;
  todos: boolean;
  events: boolean;
  carpools: boolean;
  achievements: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface CalendarExport {
  version: string;
  exportDate: string;
  events: DBEvent[];
  reminders: TodoReminder[];
  todos: TodoReminder[];
  settings?: NotificationSettings;
}
