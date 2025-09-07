// app/(protected)/calendar/types.ts
import type { DBEvent, Visibility } from '@/lib/types';

export type Mode = "my" | "whats";
export type CalendarTheme = "default" | "minimal" | "colorful" | "dark";

export interface TodoReminder {
  id: string;
  title: string;
  description?: string;
  type: 'reminder' | 'todo';
  completed: boolean;
  created_at: string;
  start_time?: string;
  end_time?: string;
}

export interface Friend {
  friend_id: string;
  name: string;
  avatar_url?: string;
  safe_to_carpool?: boolean;
}

export interface CarpoolMatch {
  event: DBEvent;
  friends: Friend[];
  savings?: {
    amount: string;
    co2Saved: number;
  };
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
  source: "personal" | "business";
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
  streak: number;
  level: number;
  achievements: string[];
  lastAchievement?: string;
  todayCompleted: number;
  weeklyGoal: number;
  karma: number;
}

export interface EventCountdown {
  event: DBEvent;
  timeUntil: string;
  isUrgent: boolean;
}

export interface TimeBlock {
  start: Date;
  end: Date;
  title: string;
  type: 'work' | 'break' | 'personal' | 'meeting';
  color: string;
}

export interface MoodEntry {
  date: string;
  mood: string;
  emoji: string;
  note?: string;
  created_at: string;
}

export interface PhotoMemory {
  id: string;
  date: string;
  photo_url: string;
  caption: string;
  year: number;
  created_at: string;
}

// ===== app/(protected)/calendar/utils/calendarHelpers.ts =====

/**
 * Convert a Date to local input datetime format
 */
export function toLocalInput(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

/**
 * Format date for display
 */
export function formatDate(date: Date, format: 'short' | 'long' | 'time' = 'short'): string {
  const options: Intl.DateTimeFormatOptions = {
    short: { month: 'short', day: 'numeric' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    time: { hour: 'numeric', minute: '2-digit' }
  }[format];
  
  return date.toLocaleDateString('en-US', options);
}

/**
 * Calculate time until event
 */
export function getTimeUntil(eventDate: Date): string {
  const now = new Date();
  const diff = eventDate.getTime() - now.getTime();
  
  if (diff < 0) return 'Past';
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

/**
 * Check if two events overlap
 */
export function eventsOverlap(event1: DBEvent, event2: DBEvent): boolean {
  const start1 = new Date(event1.start_time).getTime();
  const end1 = new Date(event1.end_time).getTime();
  const start2 = new Date(event2.start_time).getTime();
  const end2 = new Date(event2.end_time).getTime();
  
  return (start1 < end2 && end1 > start2);
}

/**
 * Find conflicts in a list of events
 */
export function findConflicts(events: DBEvent[]): DBEvent[][] {
  const conflicts: DBEvent[][] = [];
  
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      if (eventsOverlap(events[i], events[j])) {
        conflicts.push([events[i], events[j]]);
      }
    }
  }
  
  return conflicts;
}

/**
 * Group events by date
 */
export function groupEventsByDate(events: DBEvent[]): Record<string, DBEvent[]> {
  const grouped: Record<string, DBEvent[]> = {};
  
  events.forEach(event => {
    const date = new Date(event.start_time).toDateString();
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(event);
  });
  
  return grouped;
}

/**
 * Calculate carpool savings
 */
export function calculateCarpoolSavings(
  peopleCount: number,
  distance: number = 10,
  gasPrice: number = 3.50,
  mpg: number = 25
): { amount: string; co2Saved: number; gassSaved: number } {
  const individualCost = (distance / mpg) * gasPrice;
  const sharedCost = individualCost / peopleCount;
  const savings = individualCost - sharedCost;
  const gassSaved = (distance / mpg) * (peopleCount - 1);
  const co2Saved = gassSaved * 8.89; // kg CO2 per gallon
  
  return {
    amount: savings.toFixed(2),
    co2Saved: Math.round(co2Saved * 10) / 10,
    gassSaved: Math.round(gassSaved * 10) / 10
  };
}

/**
 * Get event color based on type
 */
export function getEventColor(event: DBEvent): string {
  const colors: Record<string, string> = {
    'reminder': '#FCD34D', // amber
    'todo': '#34D399', // green
    'meeting': '#60A5FA', // blue
    'personal': '#C084FC', // purple
    'business': '#FB7185', // pink
    'community': '#86EFAC', // light green
    'birthday': '#FDE047', // yellow
    'holiday': '#F87171', // red
  };
  
  return colors[event.event_type || 'personal'] || '#C084FC';
}

/**
 * Check if event is happening soon
 */
export function isEventSoon(event: DBEvent, thresholdMinutes: number = 60): boolean {
  const now = new Date();
  const eventStart = new Date(event.start_time);
  const diff = eventStart.getTime() - now.getTime();
  const minutes = diff / 60000;
  
  return minutes > 0 && minutes <= thresholdMinutes;
}

/**
 * Get smart suggestions for event scheduling
 */
export function getSmartSuggestions(
  existingEvents: DBEvent[],
  preferredTimes?: { start: number; end: number }
): Date[] {
  const suggestions: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Default preferred times: 9 AM to 5 PM
  const startHour = preferredTimes?.start || 9;
  const endHour = preferredTimes?.end || 17;
  
  // Check next 7 days
  for (let d = 0; d < 7; d++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() + d);
    
    // Check each hour slot
    for (let h = startHour; h < endHour; h++) {
      const slotStart = new Date(checkDate);
      slotStart.setHours(h, 0, 0, 0);
      const slotEnd = new Date(checkDate);
      slotEnd.setHours(h + 1, 0, 0, 0);
      
      // Check if slot is free
      const hasConflict = existingEvents.some(event => {
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time);
        return (slotStart < eventEnd && slotEnd > eventStart);
      });
      
      if (!hasConflict) {
        suggestions.push(slotStart);
        if (suggestions.length >= 5) return suggestions; // Return top 5 suggestions
      }
    }
  }
  
  return suggestions;
}

/**
 * Parse voice command into action
 */
export function parseVoiceCommand(command: string): {
  action: string;
  params: Record<string, any>;
} | null {
  const lower = command.toLowerCase();
  
  // Create commands
  if (lower.includes('create') || lower.includes('add') || lower.includes('new')) {
    if (lower.includes('meeting') || lower.includes('event')) {
      return { action: 'create_event', params: { type: 'meeting' } };
    }
    if (lower.includes('reminder')) {
      return { action: 'create_reminder', params: {} };
    }
    if (lower.includes('todo') || lower.includes('task')) {
      return { action: 'create_todo', params: {} };
    }
  }
  
  // Navigation commands
  if (lower.includes('next')) {
    if (lower.includes('week')) return { action: 'navigate', params: { to: 'next_week' } };
    if (lower.includes('month')) return { action: 'navigate', params: { to: 'next_month' } };
    return { action: 'navigate', params: { to: 'next_day' } };
  }
  
  if (lower.includes('previous') || lower.includes('back') || lower.includes('last')) {
    if (lower.includes('week')) return { action: 'navigate', params: { to: 'prev_week' } };
    if (lower.includes('month')) return { action: 'navigate', params: { to: 'prev_month' } };
    return { action: 'navigate', params: { to: 'prev_day' } };
  }
  
  if (lower.includes('today')) {
    return { action: 'navigate', params: { to: 'today' } };
  }
  
  // View commands
  if (lower.includes('show') || lower.includes('view')) {
    if (lower.includes('week')) return { action: 'change_view', params: { view: 'week' } };
    if (lower.includes('month')) return { action: 'change_view', params: { view: 'month' } };
    if (lower.includes('day')) return { action: 'change_view', params: { view: 'day' } };
    if (lower.includes('agenda')) return { action: 'change_view', params: { view: 'agenda' } };
  }
  
  return null;
}

/**
 * Generate recurring events
 */
export function generateRecurringEvents(
  baseEvent: Partial<DBEvent>,
  pattern: 'daily' | 'weekly' | 'monthly',
  count: number
): Partial<DBEvent>[] {
  const events: Partial<DBEvent>[] = [];
  const startDate = new Date(baseEvent.start_time!);
  const endDate = new Date(baseEvent.end_time!);
  const duration = endDate.getTime() - startDate.getTime();
  
  for (let i = 0; i < count; i++) {
    const eventStart = new Date(startDate);
    const eventEnd = new Date(startDate.getTime() + duration);
    
    switch (pattern) {
      case 'daily':
        eventStart.setDate(eventStart.getDate() + i);
        eventEnd.setDate(eventEnd.getDate() + i);
        break;
      case 'weekly':
        eventStart.setDate(eventStart.getDate() + (i * 7));
        eventEnd.setDate(eventEnd.getDate() + (i * 7));
        break;
      case 'monthly':
        eventStart.setMonth(eventStart.getMonth() + i);
        eventEnd.setMonth(eventEnd.getMonth() + i);
        break;
    }
    
    events.push({
      ...baseEvent,
      start_time: eventStart.toISOString(),
      end_time: eventEnd.toISOString(),
    });
  }
  
  return events;
}

/**
 * Export calendar to ICS format
 */
export function exportToICS(events: DBEvent[]): string {
  let ics = 'BEGIN:VCALENDAR\n';
  ics += 'VERSION:2.0\n';
  ics += 'PRODID:-//MyZenTribe//Calendar//EN\n';
  
  events.forEach(event => {
    ics += 'BEGIN:VEVENT\n';
    ics += `UID:${event.id}@myzentribe.com\n`;
    ics += `DTSTART:${new Date(event.start_time).toISOString().replace(/[-:]/g, '').replace('.000', '')}\n`;
    ics += `DTEND:${new Date(event.end_time).toISOString().replace(/[-:]/g, '').replace('.000', '')}\n`;
    ics += `SUMMARY:${event.title}\n`;
    if (event.description) ics += `DESCRIPTION:${event.description}\n`;
    if (event.location) ics += `LOCATION:${event.location}\n`;
    ics += 'END:VEVENT\n';
  });
  
  ics += 'END:VCALENDAR';
  return ics;
}

/**
 * Get achievement for action
 */
export function getAchievementForAction(
  action: string,
  stats: UserStats
): { name: string; description: string; points: number } | null {
  const achievements = {
    first_event: {
      name: 'Event Creator',
      description: 'Created your first event!',
      points: 20
    },
    streak_7: {
      name: 'Week Warrior',
      description: '7 day streak!',
      points: 50
    },
    streak_30: {
      name: 'Monthly Master',
      description: '30 day streak!',
      points: 200
    },
    carpool_hero: {
      name: 'Eco Warrior',
      description: 'Organized 5 carpools',
      points: 100
    },
    busy_bee: {
      name: 'Busy Bee',
      description: '10 events in one week',
      points: 75
    },
    early_bird: {
      name: 'Early Bird',
      description: 'Scheduled 5 morning events',
      points: 30
    },
    social_butterfly: {
      name: 'Social Butterfly',
      description: 'RSVP to 10 community events',
      points: 60
    }
  };
  
  // Check which achievement to award based on action and stats
  // This is a simplified example - implement your logic here
  
  return null;
}
