// app/(protected)/calendar/utils/calendarHelpers.ts

import type { DBEvent } from '@/lib/types';
import type { TodoReminder, FeedEvent, WeatherData } from '../types';

/**
 * Format date for display in toasts and UI
 */
export function formatDateForToast(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
}

/**
 * Format time range for event display
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  const startStr = start.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit' 
  });
  const endStr = end.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit' 
  });
  
  return `${startStr} - ${endStr}`;
}

/**
 * Calculate time until event
 */
export function getTimeUntilEvent(eventTime: string): {
  days: number;
  hours: number;
  minutes: number;
  isPast: boolean;
} {
  const now = new Date();
  const event = new Date(eventTime);
  const diff = event.getTime() - now.getTime();
  
  if (diff < 0) {
    return { days: 0, hours: 0, minutes: 0, isPast: true };
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return { days, hours, minutes, isPast: false };
}

/**
 * Get event category color
 */
export function getEventColor(event: DBEvent | FeedEvent): {
  bg: string;
  border: string;
  text: string;
} {
  // Check event type
  if (event.event_type === 'reminder') {
    return {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-400',
      text: 'text-amber-800 dark:text-amber-200'
    };
  }
  
  if (event.event_type === 'todo') {
    return {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-400',
      text: 'text-green-800 dark:text-green-200'
    };
  }
  
  if (event.source === 'business') {
    return {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-400',
      text: 'text-purple-800 dark:text-purple-200'
    };
  }
  
  if (event.visibility === 'public') {
    return {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-400',
      text: 'text-blue-800 dark:text-blue-200'
    };
  }
  
  // Default
  return {
    bg: 'bg-gray-50 dark:bg-gray-900/20',
    border: 'border-gray-400',
    text: 'text-gray-800 dark:text-gray-200'
  };
}

/**
 * Group events by date
 */
export function groupEventsByDate(events: DBEvent[]): Map<string, DBEvent[]> {
  const grouped = new Map<string, DBEvent[]>();
  
  events.forEach(event => {
    const date = new Date(event.start_time).toDateString();
    const existing = grouped.get(date) || [];
    grouped.set(date, [...existing, event]);
  });
  
  // Sort events within each day
  grouped.forEach((dayEvents, date) => {
    dayEvents.sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
  });
  
  return grouped;
}

/**
 * Check if event conflicts with existing events
 */
export function hasTimeConflict(
  newEvent: { start_time: string; end_time: string },
  existingEvents: DBEvent[]
): boolean {
  const newStart = new Date(newEvent.start_time);
  const newEnd = new Date(newEvent.end_time);
  
  return existingEvents.some(event => {
    const existingStart = new Date(event.start_time);
    const existingEnd = new Date(event.end_time);
    
    return (
      (newStart >= existingStart && newStart < existingEnd) ||
      (newEnd > existingStart && newEnd <= existingEnd) ||
      (newStart <= existingStart && newEnd >= existingEnd)
    );
  });
}

/**
 * Get suggested time slots for an event
 */
export function getSuggestedTimeSlots(
  duration: number, // minutes
  existingEvents: DBEvent[],
  preferredTimeRange: { start: number; end: number } = { start: 9, end: 17 }
): Array<{ date: Date; available: boolean }> {
  const slots: Array<{ date: Date; available: boolean }> = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check next 7 days
  for (let d = 0; d < 7; d++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() + d);
    
    // Check each hour in preferred range
    for (let hour = preferredTimeRange.start; hour < preferredTimeRange.end; hour++) {
      const slotStart = new Date(checkDate);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);
      
      const hasConflict = hasTimeConflict(
        {
          start_time: slotStart.toISOString(),
          end_time: slotEnd.toISOString()
        },
        existingEvents
      );
      
      if (!hasConflict) {
        slots.push({ date: slotStart, available: true });
      }
    }
  }
  
  return slots.slice(0, 5); // Return top 5 suggestions
}

/**
 * Calculate productivity score
 */
export function calculateProductivityScore(
  completedTodos: number,
  totalTodos: number,
  eventsAttended: number,
  totalEvents: number
): number {
  if (totalTodos === 0 && totalEvents === 0) return 0;
  
  const todoScore = totalTodos > 0 ? (completedTodos / totalTodos) * 50 : 0;
  const eventScore = totalEvents > 0 ? (eventsAttended / totalEvents) * 50 : 0;
  
  return Math.round(todoScore + eventScore);
}

/**
 * Get weather-based suggestions
 */
export function getWeatherSuggestions(weather: WeatherData): string[] {
  const suggestions: string[] = [];
  
  if (weather.condition === 'sunny' && weather.temperature > 20) {
    suggestions.push('Perfect day for outdoor activities!');
    suggestions.push('Consider scheduling that picnic or hike');
  } else if (weather.condition === 'rainy') {
    suggestions.push('Great day for indoor activities');
    suggestions.push('Perfect time for that book or movie');
  } else if (weather.temperature < 10) {
    suggestions.push('Bundle up! Cold weather expected');
    suggestions.push('Hot chocolate weather ☕');
  }
  
  return suggestions;
}

/**
 * Export calendar to ICS format
 */
export function exportToICS(events: DBEvent[]): string {
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MyZenTribe//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];
  
  events.forEach(event => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    
    icsLines.push('BEGIN:VEVENT');
    icsLines.push(`UID:${event.id}@myzentribe.com`);
    icsLines.push(`DTSTAMP:${formatICSDate(new Date())}`);
    icsLines.push(`DTSTART:${formatICSDate(start)}`);
    icsLines.push(`DTEND:${formatICSDate(end)}`);
    icsLines.push(`SUMMARY:${escapeICS(event.title)}`);
    
    if (event.description) {
      icsLines.push(`DESCRIPTION:${escapeICS(event.description)}`);
    }
    
    if (event.location) {
      icsLines.push(`LOCATION:${escapeICS(event.location)}`);
    }
    
    icsLines.push('END:VEVENT');
  });
  
  icsLines.push('END:VCALENDAR');
  
  return icsLines.join('\r\n');
}

/**
 * Helper: Format date for ICS
 */
function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Helper: Escape text for ICS format
 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Parse ICS file content
 */
export function parseICS(icsContent: string): Partial<DBEvent>[] {
  const events: Partial<DBEvent>[] = [];
  const lines = icsContent.split(/\r?\n/);
  let currentEvent: any = null;
  
  lines.forEach(line => {
    if (line.startsWith('BEGIN:VEVENT')) {
      currentEvent = {};
    } else if (line.startsWith('END:VEVENT') && currentEvent) {
      events.push({
        title: currentEvent.summary || 'Imported Event',
        description: currentEvent.description || '',
        location: currentEvent.location || '',
        start_time: currentEvent.dtstart || new Date().toISOString(),
        end_time: currentEvent.dtend || new Date().toISOString(),
        visibility: 'private',
        source: 'personal'
      });
      currentEvent = null;
    } else if (currentEvent) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':');
      
      switch (key) {
        case 'SUMMARY':
          currentEvent.summary = unescapeICS(value);
          break;
        case 'DESCRIPTION':
          currentEvent.description = unescapeICS(value);
          break;
        case 'LOCATION':
          currentEvent.location = unescapeICS(value);
          break;
        case 'DTSTART':
          currentEvent.dtstart = parseICSDate(value);
          break;
        case 'DTEND':
          currentEvent.dtend = parseICSDate(value);
          break;
      }
    }
  });
  
  return events;
}

/**
 * Helper: Parse ICS date
 */
function parseICSDate(dateStr: string): string {
  // Handle both formats: 20240101T120000Z and 20240101T120000
  const clean = dateStr.replace('Z', '');
  const year = clean.substring(0, 4);
  const month = clean.substring(4, 6);
  const day = clean.substring(6, 8);
  const hour = clean.substring(9, 11);
  const minute = clean.substring(11, 13);
  const second = clean.substring(13, 15) || '00';
  
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`).toISOString();
}

/**
 * Helper: Unescape ICS text
 */
function unescapeICS(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/**
 * Detect mobile device
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768;
}

/**
 * Vibrate device (mobile only)
 */
export function vibrate(pattern: number | number[] = 10): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

/**
 * Get greeting based on time of day
 */
export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  
  if (hour < 5) return 'Night owl mode 🦉';
  if (hour < 12) return 'Good morning ☀️';
  if (hour < 17) return 'Good afternoon 🌤';
  if (hour < 21) return 'Good evening 🌅';
  return 'Good night 🌙';
}

/**
 * Calculate streak days
 */
export function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  
  const sortedDates = dates
    .map(d => new Date(d).toDateString())
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  
  if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
    return 0; // Streak broken
  }
  
  let streak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const current = new Date(sortedDates[i - 1]);
    const prev = new Date(sortedDates[i]);
    const dayDiff = Math.floor((current.getTime() - prev.getTime()) / 86400000);
    
    if (dayDiff === 1) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}
