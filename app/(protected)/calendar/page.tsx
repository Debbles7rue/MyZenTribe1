// app/calendar/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";

type RawEvent = {
  id: string | number;
  title: string | null;
  start_at?: string | null;
  end_at?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  start?: string | null;
  end?: string | null;
  visibility?: string | null;
};

type CalEvent = {
  id: string | number;
  title: string;
  start: Date;
  end: Date;
};

const locales = {};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

function toDate(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function mapEvent(e: RawEvent): CalEvent | null {
  // Accept a few common column names
  const start =
    toDate(e.start_at) || toDate(e.start_time) || toDate(e.start) || null;
  const end =
    toDate(e.end_at) || toDate(e.end_time) || toDate(e.end) || start || null;

  if (!start || !end) return null;
  return {
    id: e.id,
    title: (e.title ?? "Untitled").trim() || "Untitled",
    start,
    end,
  };
}

export default function CalendarPage() {
  const [tab, setTab] = useState<"happenings" | "mine">("happenings");
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHappenings = useCallback(async () => {
    setLoading(true);
    // Prefer the view; fall back to base table with visibility filter
    let rows: RawEvent[] = [];
    let err: any = null;

    const tryView = await supabase.from("happenings_view").select("*");
    if (!tryView.error && tryView.data) {
      rows = tryView.data as RawEvent[];
    } else {
      // Fallback: read from events table if present
      const tryEvents = await supabase
        .from("events")
        .select("*")
        .eq("visibility", "public");
      if (!tryEvents.error && tryEvents.data) {
        rows = tryEvents.data as RawEvent[];
      } else {
        // Try alternate table name
        const tryCalEvents = await supabase
          .from("calendar_events")
          .select("*")
          .eq("visibility", "public");
        err = tryCalEvents.error;
        rows = (tryCalEvents.data || []) as RawEvent[];
      }
    }

    setEvents(rows.map(mapEvent).filter(Boolean) as CalEvent[]);
    setLoading(false);
    if (err) console.warn("Happenings fallback used:", err.message);
  }, []);

  const fetchMine = useCallback(async () => {
    setLoading(true);
    let rows: RawEvent[] = [];
    let err: any = null;

    const tryView = await supabase.from("my_events_view").select("*");
    if (!tryView.error && tryView.data) {
      rows = tryView.data as RawEvent[];
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setEvents([]);
        setLoading(false);
        return;
      }
      // Fallback: filter by owner_id on base table
      const tryEvents = await supabase
        .from("events")
        .select("*")
        .eq("owner_id", user.id);
      if (!tryEvents.error && tryEvents.data) {
        rows = tryEvents.data as RawEvent[];
      } else {
        const tryCalEvents = await supabase
          .from("calendar_events")
          .select("*")
          .eq("owner_id", user.id);
        err = tryCalEvents.error;
        rows = (tryCalEvents.data || []) as RawEvent[];
      }
    }

    setEvents(rows.map(mapEvent).filter(Boolean) as CalEvent[]);
    setLoading(false);
    if (err) console.warn("My calendar fallback used:", err.message);
  }, []);

  useEffect(() => {
    if (tab === "happenings") fetchHappenings();
    else fetchMine();
  }, [tab, fetchHappenings, fetchMine]);

  const defaultDate = useMemo(() => new Date(), []);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <div className="flex gap-2">
          <button
            className={`btn ${tab === "happenings" ? "btn-neutral" : ""}`}
            onClick={() => setTab("happenings")}
          >
            What’s Happening
          </button>
          <button
            className={`btn ${tab === "mine" ? "btn-neutral" : ""}`}
            onClick={() => setTab("mine")}
          >
            My Calendar
          </button>
          <Link href="/events/new" className="btn btn-brand">
            + Create event
          </Link>
        </div>
      </div>

      <div className="mt-3 card p-3">
        {loading ? (
          <div className="muted">Loading…</div>
        ) : events.length === 0 ? (
          <div className="muted">Nothing here yet. Check back later.</div>
        ) : (
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            defaultView={Views.MONTH}
            defaultDate={defaultDate}
            style={{ height: 650 }}
            popup
          />
        )}
      </div>
    </div>
  );
}
