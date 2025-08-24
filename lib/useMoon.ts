// lib/useMoon.ts
// Lightweight moon-phase hook for react-big-calendar.
// No external deps; good for Netlify/Edge builds.

import { useMemo } from "react";
import type { View } from "react-big-calendar";

export type MoonIcon = "moon-new" | "moon-first" | "moon-full" | "moon-last";

export type MoonEvent = {
  id: string;
  title: string;
  start: Date; // all-day marker, local midnight
  end: Date;   // same day
  icon: MoonIcon;
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

function rangeFor(current: Date, view: View): { start: Date; end: Date } {
  const c = new Date(current);
  switch (view) {
    case "month": {
      const start = new Date(c.getFullYear(), c.getMonth(), 1);
      const end = new Date(c.getFullYear(), c.getMonth() + 1, 0);
      // small buffer so markers near edges show up
      return { start: addDays(start, -2), end: addDays(end, 2) };
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

/**
 * Compute moon phase markers between start..end (inclusive),
 * by scanning days and picking dates close to 0, .25, .5, .75.
 * EPSILON controls how close we need to be to count the day as a phase.
 */
function computeMoonEvents(start: Date, end: Date): MoonEvent[] {
  const EPSILON = 0.035; // ~1.0 day window across the month (good enough for UI markers)
  const targets: Array<{ t: number; icon: MoonIcon }> = [
    { t: 0.0, icon: "moon-new" },
    { t: 0.25, icon: "moon-first" },
    { t: 0.5, icon: "moon-full" },
    { t: 0.75, icon: "moon-last" },
  ];

  const out: MoonEvent[] = [];
  const seen = new Set<string>(); // yyyymmdd+icon to avoid dupes

  for (
    let d = startOfDayLocal(start);
    d.getTime() <= end.getTime();
    d = addDays(d, 1)
  ) {
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
            icon,
          });
        }
      }
    }
  }

  // keep chronological
  out.sort((a, b) => a.start.getTime() - b.start.getTime());
  return out;
}

export function useMoon(current: Date, view: View) {
  const events = useMemo(() => {
    const { start, end } = rangeFor(current, view);
    return computeMoonEvents(start, end).map((m) => ({
      id: m.id,
      title: m.title,
      start: m.start,
      end: m.end,
      // consumers expect r.resource.moonPhase
      icon: m.icon,
    }));
    // recompute when date or view window changes (month/week/day granularity)
  }, [current.getFullYear(), current.getMonth(), current.getDate(), view]);

  // The calendar expects this shape: { events: [{ id,title,start,end, icon }] }
  return { events };
}

export type UseMoon = ReturnType<typeof useMoon>;
