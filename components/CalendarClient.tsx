// components/CalendarClient.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import CalendarGrid, { type UiEvent } from "@/components/CalendarGrid";
import EventDetails from "@/components/EventDetails";
import CreateEventModal from "@/components/CreateEventModal";
import type { DBEvent, Visibility } from "@/lib/types";
import type { View } from "react-big-calendar";
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  addDays,
  addMonths,
} from "date-fns";

// ---- Moon marker generator (approximate, local-date all-day events) ----
function generateMoonEvents(rangeStart: Date, rangeEnd: Date): UiEvent[] {
  // Astronomical epoch (approx new moon): Jan 6, 2000 18:14 UTC
  const base = Date.UTC(2000, 0, 6, 18, 14, 0);
  const synodic = 29.530588853; // days
  const quarter = synodic / 4;

  const start = startOfDay(rangeStart).getTime();
  const end = endOfDay(rangeEnd).getTime();

  const events: UiEvent[] = [];

  // Find the first cycle that could overlap the range
  // Step month-by-month to keep it simple
  for (let t = base; t < end + synodic * 24 * 3600 * 1000; t += synodic * 24 * 3600 * 1000) {
    const newMoon = new Date(t);
    const firstQuarter = new Date(t + quarter * 24 * 3600 * 1000);
    const fullMoon = new Date(t + 2 * quarter * 24 * 3600 * 1000);
    const lastQuarter = new Date(t + 3 * quarter * 24 * 3600 * 1000);

    const phases = [
      { date: newMoon, label: "New Moon", key: "moon-new" },
      { date: firstQuarter, label: "First Quarter", key: "moon-first" },
      { date: fullMoon, label: "Full Moon", key: "moon-full" },
      { date: lastQuarter, label: "Last Quarter", key: "moon-last" },
    ];

    for (const p of phases) {
      const d0 = startOfDay(p.date).getTime();
      const d1 = endOfDay(p.date).getTime();
      if (d1 >= start && d0 <= end) {
        const sameDayStart = startOfDay(new Date(p.date));
        const sameDayEnd = endOfDay(new Date(p.date));
        events.push({
          id: `moon-${p.key}-${sameDayStart.toISOString()}`,
          title: p.label,
          start: sameDayStart,
          end: sameDayEnd,
          allDay: true,
          resource: { moonPhase: p.key },
        } as UiEvent);
      }
    }

    // jump approximately one cycle forward
    // (the for-loop increment already does this)
  }

  return events;
}

export default function CalendarClient() {
  const [userId, setUserId] = useState<string | null>(null);

  // Calendar state
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>("month");
  const [showMoon, setShowMoon] = useState(true);

  // Data
  const [events, setEvents] = useState<DBEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Create modal
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    start: "",
    end: "",
    visibility: "public" as Visibility,
    event_type: "",
    community_id: "",
    source: "personal" as "personal" | "business",
    image_path: "",
  });

  // Details modal
  const [selected, setSelected] = useState<DBEvent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // Fetch events
  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_time", { ascending: true });

    if (error) {
      setErr(error.message || "Failed to load events");
      setEvents([]);
    } else {
      const safe = (data || []).filter((e: any) => e?.start_time && e?.end_time) as DBEvent[];
      setEvents(safe);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, userId]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("events-rt-calendar")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_attendees" }, load)
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [load]);

  // Select/create helpers
  const toLocalInput = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const onSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    const s = start ?? new Date();
    const e = end ?? addDays(s, 1);
    setForm((f) => ({
      ...f,
      start: toLocalInput(s),
      end: toLocalInput(e),
    }));
    setOpenCreate(true);
  };

  const onSelectEvent = (evt: UiEvent) => {
    const r = (evt as UiEvent).resource as any;
    if (r?.moonPhase) return; // ignore moon markers
    setSelected(r as DBEvent);
    setDetailsOpen(true);
  };

  // Guarded DnD for own events only
  const onDrop = async ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => {
    const r = (event.resource || {}) as DBEvent;
    if (!userId || r.created_by !== userId) return; // ignore
    const { error } = await supabase
      .from("events")
      .update({ start_time: start.toISOString(), end_time: end.toISOString() })
      .eq("id", r.id);
    if (error) console.error("drop update error:", error.message);
  };

  const onResize = async ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => {
    const r = (event.resource || {}) as DBEvent;
    if (!userId || r.created_by !== userId) return; // ignore
    const { error } = await supabase
      .from("events")
      .update({ start_time: start.toISOString(), end_time: end.toISOString() })
      .eq("id", r.id);
    if (error) console.error("resize update error:", error.message);
  };

  // Build moon markers for current visible range
  const [rangeStart, rangeEnd] = useMemo(() => {
    if (view === "month") return [startOfMonth(date), endOfMonth(date)];
    if (view === "week") {
      const d = new Date(date);
      const dow = (d.getDay() + 6) % 7; // Monday=0
      const start = startOfDay(addDays(d, -dow));
      const end = endOfDay(addDays(start, 6));
      return [start, end];
    }
    return [startOfDay(date), endOfDay(date)];
  }, [date, view]);

  const moonEvents = useMemo(() => generateMoonEvents(rangeStart, rangeEnd), [rangeStart, rangeEnd]);

  // Create new event
  const createEvent = async () => {
    if (!userId) return alert("Please log in.");
    if (!form.title || !form.start || !form.end) return alert("Missing fields.");

    const payload: any = {
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      start_time: new Date(form.start),
      end_time: new Date(form.end),
      visibility: form.visibility,
      created_by: userId,
      event_type: form.event_type || null,
      rsvp_public: true,
      community_id: form.community_id || null,
      image_path: form.image_path || null,
      source: form.source,
    };

    const { error } = await supabase.from("events").insert(payload);
    if (error) return alert(error.message);
    setOpenCreate(false);
    setForm({
      title: "",
      description: "",
      location: "",
      start: "",
      end: "",
      visibility: "public",
      event_type: "",
      community_id: "",
      source: "personal",
      image_path: "",
    });
    load();
  };

  // Header controls
  const changeView = (v: View) => setView(v);

  return (
    <>
      <div className="header-bar">
        <div className="controls">
          <button className="btn btn-brand" onClick={() => setOpenCreate(true)}>
            + Create event
          </button>
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
          {err && <span className="muted">Error: {err}</span>}
        </div>

        <div className="controls">
          <div className="segmented" role="tablist" aria-label="Calendar view">
            {(["month", "week", "day"] as View[]).map((v) => (
              <button
                key={v}
                className={`seg-btn ${view === v ? "active" : ""}`}
                onClick={() => changeView(v)}
              >
                {v[0].toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={showMoon}
              onChange={(e) => setShowMoon(e.target.checked)}
            />
            Show moon markers
          </label>
        </div>
      </div>

      <CalendarGrid
        dbEvents={events}
        moonEvents={moonEvents}
        showMoon={showMoon}
        date={date}
        setDate={setDate}
        view={view}
        setView={setView}
        onSelectSlot={onSelectSlot}
        onSelectEvent={onSelectEvent}
        onDrop={onDrop}
        onResize={onResize}
      />

      <CreateEventModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        sessionUser={userId}
        value={form}
        onChange={(v) => setForm((prev) => ({ ...prev, ...v }))}
        onSave={createEvent}
      />

      <EventDetails event={detailsOpen ? selected : null} onClose={() => setDetailsOpen(false)} />
    </>
  );
}
