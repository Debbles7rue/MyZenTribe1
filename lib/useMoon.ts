// lib/useMoon.ts
// Lightweight moon-phase events for react-big-calendar.
// Compatible call signatures:
//   useMoon(currentDate: Date, view: View) -> UiEvent[]
//   useMoon(startDate: Date, endDate: Date) -> UiEvent[]
//
// Returns events shaped like: { id,title,start,end,allDay:true,resource:{ moonPhase: "moon-full" | ... } }

import { useMemo } from "react";
import type { View } from "react-big-calendar";

export type MoonIcon = "moon-new" | "moon-first" | "moon-full" | "moon-last";

type UiEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: { moonPhase: MoonIcon };
};

const SYNODIC = 29.530588853; // days
// Reference new moon: 2000-01-06 18:14 UTC (Jean Meeus)
const REF = Date.UTC(2000, 0, 6, 18, 14, 0);

/** 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter */
function phaseFraction(d: Date): number {
  const days = (d.getTime() - REF) / 86400000;
  let frac = (days / SYNODIC) % 1;
  if (frac < 0) frac += 1;
  return frac;
}

function startOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, days: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + days);
  return nd;
}
function inRange(d: Date, start: Date, end: Date): boolean {
  return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
}

function label(icon: MoonIcon): string {
  switch (icon) {
    case "moon-new":
      return "New Moon";
    case "moon-first":
      return "First Quarter";
    case "moon-full":
      return "Full Moon";
    case "moon-last":
      return "Last Quarter";
  }
}

function computeWindowFor(current: Date, view: View): { start: Date; end: Date } {
  const c = new Date(current);
  switch (view) {
    case "month": {
      const start = new Date(c.getFullYear(), c.getMonth(), 1);
      const end = new Date(c.getFullYear(), c.getMonth() + 1, 0);
      return { start: addDays(start, -2), end: addDays(end, 2) }; // small buffer
    }
    case "day": {
      const start = startOfDayLocal(c);
      const end = addDays(start, 1);
      return { start: addDays(start, -1), end: addDays(end, 1) };
    }
    case "work_week":
    case "week":
    default: {
      const day = (c.getDay() + 6) % 7; // Mon=0 … Sun=6
      const monday = addDays(startOfDayLocal(c), -day);
      const sunday = addDays(monday, 6);
      return { start: addDays(monday, -2), end: addDays(sunday, 2) };
    }
  }
}

/**
 * Compute moon phase markers between start..end (inclusive),
 * by scanning days and picking dates close to 0, .25, .5, .75.
 */
function computeMoonEvents(start: Date, end: Date): UiEvent[] {
  const EPSILON = 0.035; // ~1 day window across the month (good for UI markers)
  const targets: Array<{ t: number; icon: MoonIcon }> = [
    { t: 0.0, icon: "moon-new" },
    { t: 0.25, icon: "moon-first" },
    { t: 0.5, icon: "moon-full" },
    { t: 0.75, icon: "moon-last" },
  ];

  const out: UiEvent[] = [];
  const seen = new Set<string>(); // yyyymmdd+icon to avoid dupes

  for (let d = startOfDayLocal(start); d.getTime() <= end.getTime(); d = addDays(d, 1)) {
    const pf = phaseFraction(d);
    for (const { t, icon } of targets) {
      const diff = Math.min(Math.abs(pf - t), 1 - Math.abs(pf - t)); // wraparound
      if (diff <= EPSILON) {
        const sd = startOfDayLocal(d);
        const key = `${sd.getFullYear()}-${sd.getMonth()}-${sd.getDate()}-${icon}`;
        if (!seen.has(key) && inRange(sd, start, end)) {
          seen.add(key);
          out.push({
            id: key,
            title: label(icon),
            start: sd,
            end: sd,
            allDay: true,
            resource: { moonPhase: icon },
          });
        }
      }
    }
  }

  out.sort((a, b) => a.start.getTime() - b.start.getTime());
  return out;
}

/**
 * Hook: supports (current, view) OR (start, end).
 * Returns UiEvent[] suitable for react-big-calendar.
 */
export function useMoon(a: Date, b: Date | View): UiEvent[] {
  // Memoize by coarse date granularity plus view (if provided)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => {
    if (b instanceof Date) {
      // treat as (start, end)
      return computeMoonEvents(a, b);
    }
    // treat as (currentDate, view)
    const { start, end } = computeWindowFor(a, b as View);
    return computeMoonEvents(start, end);
  }, [
    a.getFullYear(),
    a.getMonth(),
    a.getDate(),
    typeof b === "string" ? b : (b as Date).getFullYear?.(),
    typeof b === "string" ? b : (b as Date).getMonth?.(),
    typeof b === "string" ? b : (b as Date).getDate?.(),
  ]) as UiEvent[];
}

export type UseMoon = ReturnType<typeof useMoon>;
