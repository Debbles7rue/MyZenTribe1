// lib/useMoon.ts
import { useMemo } from "react";
import type { View } from "react-big-calendar";

export type MoonIcon = "moon-new" | "moon-first" | "moon-full" | "moon-last";

export type MoonEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: {
    moonPhase: MoonIcon;
  };
};

// Moon phase calculation constants
const SYNODIC = 29.530588853; // days
const REF = Date.UTC(2000, 0, 6, 18, 14, 0); // Reference new moon: Jan 6, 2000 18:14 UTC

/**
 * Calculate the moon phase fraction (0-1) for a given date
 * 0 = new moon, 0.25 = first quarter, 0.5 = full moon, 0.75 = last quarter
 */
function getMoonPhaseFraction(date: Date): number {
  const days = (date.getTime() - REF) / (1000 * 60 * 60 * 24);
  let fraction = (days / SYNODIC) % 1;
  if (fraction < 0) fraction += 1;
  return fraction;
}

/**
 * Get the start of day in local timezone
 */
function startOfDayLocal(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get the date range to calculate moon phases for based on current view
 */
function getDateRange(current: Date, view: View): { start: Date; end: Date } {
  const date = new Date(current);
  
  switch (view) {
    case "month": {
      // Get first and last day of month with some padding
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      // Add padding to catch phases just outside the month
      return { 
        start: addDays(start, -3), 
        end: addDays(end, 3) 
      };
    }
    
    case "week":
    case "work_week": {
      // Get start of week (Monday) and end of week (Sunday)
      const dayOfWeek = date.getDay();
      const monday = addDays(date, -((dayOfWeek + 6) % 7));
      const sunday = addDays(monday, 6);
      return { 
        start: addDays(monday, -2), 
        end: addDays(sunday, 2) 
      };
    }
    
    case "day": {
      // Just the current day with small padding
      const start = startOfDayLocal(date);
      const end = addDays(start, 1);
      return { 
        start: addDays(start, -1), 
        end: addDays(end, 1) 
      };
    }
    
    default: {
      // Fallback to week view
      const dayOfWeek = date.getDay();
      const monday = addDays(date, -((dayOfWeek + 6) % 7));
      const sunday = addDays(monday, 6);
      return { 
        start: monday, 
        end: sunday 
      };
    }
  }
}

/**
 * Get label for moon phase
 */
function getMoonPhaseLabel(icon: MoonIcon): string {
  switch (icon) {
    case "moon-new": return "New Moon";
    case "moon-first": return "First Quarter";
    case "moon-full": return "Full Moon";
    case "moon-last": return "Last Quarter";
    default: return "Moon Phase";
  }
}

/**
 * Calculate moon phase events for a date range
 */
function calculateMoonEvents(startDate: Date, endDate: Date): MoonEvent[] {
  const events: MoonEvent[] = [];
  const seen = new Set<string>();
  
  // Define the phases we're looking for
  const phases: Array<{ fraction: number; icon: MoonIcon }> = [
    { fraction: 0.0, icon: "moon-new" },
    { fraction: 0.25, icon: "moon-first" },
    { fraction: 0.5, icon: "moon-full" },
    { fraction: 0.75, icon: "moon-last" },
  ];
  
  // Check each day in the range
  for (let date = new Date(startDate); date <= endDate; date = addDays(date, 1)) {
    const phaseFraction = getMoonPhaseFraction(date);
    
    // Check if this day is close to any of our target phases
    for (const phase of phases) {
      // Calculate the difference, accounting for wraparound
      let diff = Math.abs(phaseFraction - phase.fraction);
      diff = Math.min(diff, 1 - diff);
      
      // If within ~1 day tolerance (0.035 ≈ 1 day / 29.5 days)
      if (diff < 0.035) {
        const dayStart = startOfDayLocal(date);
        const key = `${dayStart.getFullYear()}-${dayStart.getMonth()}-${dayStart.getDate()}-${phase.icon}`;
        
        // Avoid duplicate entries
        if (!seen.has(key)) {
          seen.add(key);
          
          events.push({
            id: key,
            title: getMoonPhaseLabel(phase.icon),
            start: dayStart,
            end: addDays(dayStart, 1),
            allDay: true,
            resource: {
              moonPhase: phase.icon
            }
          });
        }
      }
    }
  }
  
  // Sort events by date
  events.sort((a, b) => a.start.getTime() - b.start.getTime());
  
  return events;
}

/**
 * React hook to calculate moon phases for the current calendar view
 * @param current - The current date being viewed
 * @param view - The current calendar view (month/week/day)
 * @returns Array of moon phase events to display on the calendar
 */
export function useMoon(current: Date, view: View): MoonEvent[] {
  return useMemo(() => {
    const { start, end } = getDateRange(current, view);
    return calculateMoonEvents(start, end);
  }, [current.getTime(), view]);
}

/**
 * Alternative hook that takes a specific date range
 * @param start - Start date
 * @param end - End date
 * @returns Array of moon phase events in the range
 */
export function useMoonRange(start: Date, end: Date): MoonEvent[] {
  return useMemo(() => {
    return calculateMoonEvents(start, end);
  }, [start.getTime(), end.getTime()]);
}

/**
 * Get just the next moon phase from a given date
 * @param from - Date to search from
 * @returns The next moon phase event
 */
export function getNextMoonPhase(from: Date = new Date()): MoonEvent | null {
  const events = calculateMoonEvents(from, addDays(from, 35));
  return events[0] || null;
}
