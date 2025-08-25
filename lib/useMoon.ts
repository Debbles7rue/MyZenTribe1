// lib/useMoon.ts
// Moon-phase markers for react-big-calendar.
// This file is intentionally dependency-light and safe for Netlify/Edge builds.

import { useMemo } from "react";
import type { View } from "react-big-calendar";

/** Icon ids we show as emojis in CalendarGrid */
export type MoonIcon = "moon-new" | "moon-first" | "moon-full" | "moon-last";

type RawMoon = {
  id: string;
  title: string;
  start: Date;
  end: Date;
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

function rangeFor(current: Date, view: View): { start: Date; end: Date } {
  const c = new Date(current);
  switch (view) {
    case "month": {
      const start = new Date(c.getFullYear(), c.getMonth(), 1);
      const end = new Date(c.getFullYear(), c.getMonth() + 1, 0);
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
    case "moon-new": return "New Moon";
    case "moon-first": return "First Quarter";
    case "moon-full": return "Full Moon";
    case "moon-last": return "Last Quarter";
  }
}

/**
 * Compute day markers between start..end (inclusive),
 * selecting dates close to 0, .25, .5, .75 of the synodic cycle.
 */
function computeRaw(start: Date, end: Date): RawMoon[] {
  const EPSILON = 0.035; // ≈ 1 day window
  const targets: Array<{ t: number; icon: MoonIcon }> = [
    { t: 0.0, icon: "moon-new" },
    { t: 0.25, icon: "moon-first" },
    { t: 0.5, icon: "moon-full" },
    { t: 0.75, icon: "moon-last" },
  ];

  const out: RawMoon[] = [];
  const seen = new Set<string>(); // avoid dupes

  for (let d = startOfDayLocal(start); d.getTime() <= end.getTime(); d = addDays(d, 1)) {
    const pf = phaseFraction(d);
    for (const { t, icon } of targets) {
      const diff = Math.min(Math.abs(pf - t), 1 - Math.abs(pf - t)); // wraparound
      if (diff <= EPSILON) {
        const sd = startOfDayLocal(d);
        const key = `${sd.getFullYear()}-${sd.getMonth()}-${sd.getDate()}-${icon}`;
        if (!seen.has(key) && sd >= start && sd <= end) {
          seen.add(key);
          out.push({ id: key, title: label(icon), start: sd, end: sd, icon });
        }
      }
    }
  }

  out.sort((a, b) => a.start.getTime() - b.start.getTime());
  return out;
}

/** Map raw items to react-big-calendar event objects with resource.moonPhase */
function toRbc(raw: RawMoon[]) {
  return raw.map((m) => ({
    id: m.id,
    title: m.title,
    start: m.start,
    end: m.end,
    allDay: true,
    resource: { moonPhase: m.icon }, // <-- CalendarGrid looks for this
  }));
}

/** Hook: compute by (start, end) range */
export function useMoonRange(start: Date, end: Date) {
  // Depend on calendar-relevant parts only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => toRbc(computeRaw(start, end)), [start.getTime(), end.getTime()]);
}

/** Hook: compute by (current, view) */
export function useMoon(current: Date, view: View) {
  const { start, end } = rangeFor(current, view);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => toRbc(computeRaw(start, end)), [start.getTime(), end.getTime(), view]);
}
