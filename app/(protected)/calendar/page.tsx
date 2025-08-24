// app/(protected)/calendar/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { View } from "react-big-calendar";
import { supabase } from "@/lib/supabaseClient";
import EventDetails from "@/components/EventDetails";
import type { DBEvent } from "@/lib/types";
import { useMoon as useMoonHook } from "@/lib/useMoon"; // your hook

// Client-only grid to avoid SSR/hydration issues
const CalendarGrid = dynamic(() => import("@/components/CalendarGrid"), { ssr: false });

// Mirror the UiEvent used in CalendarGrid
type UiEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource: any;
};

export default function CalendarPage() {
  // auth
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  // calendar state
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState<Date>(new Date());

  // events
  const [events, setEvents] = useState<DBEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!me) return;
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
  }, [me]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel("events-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, load)
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [load]);

  // ---- Moon events (be tolerant to hook shape) ----
  // Your hook might return UiEvent[] OR { events: UiEvent[], ... }
  const moonRaw: any = useMoonHook ? useMoonHook(date, view) : null;

  const moonEvents: UiEvent[] = useMemo(() => {
    // If it's already an array
    if (Array.isArray(moonRaw)) return moonRaw as UiEvent[];
    // If it's an object with .events array
    if (moonRaw && Array.isArray(moonRaw.events)) return moonRaw.events as UiEvent[];
    // Otherwise none
    return [];
  }, [moonRaw]);

  // map DB rows → Ui events
  const uiEvents: UiEvent[] = useMemo(
    () =>
      events.map((e) => ({
        id: (e as any).id,
        title: e.title || "Untitled event",
        start: new Date(e.start_time!),
        end: new Date(e.end_time!),
        allDay: false,
        resource: e, // keep original row here for details/editing
      })),
    [events]
  );

  const mergedEvents: UiEvent[] = useMemo(
    () => [...uiEvents, ...moonEvents],
    [uiEvents, moonEvents]
  );

  // Details modal (unwrap ui.resource!)
  const [selected, setSelected] = useState<DBEvent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleSelectEvent = useCallback((ui: any) => {
    const row: DBEvent | null = ui?.resource ?? null;
    if (!row) return;
    setSelected(row);
    setDetailsOpen(true);
  }, []);

  // Create from free slot (handled in Day/Week; Month tap drills to Day in CalendarGrid)
  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    // Hook up to your CreateEventModal here if desired.
    // console.log("Create event at", start, "→", end);
  }, []);

  // Drag/Resize — creator-only
  const canDrag = useCallback(
    (ui: any) => {
      const row: DBEvent | null = ui?.resource ?? null;
      return !!me && !!row && row.created_by === me;
    },
    [me]
  );

  const handleDropOrResize = useCallback(
    async ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => {
      const row: DBEvent | null = event?.resource ?? null;
      if (!row || !me || row.created_by !== me) return;

      const { error } = await supabase
        .from("events")
        .update({ start_time: start.toISOString(), end_time: end.toISOString() })
        .eq("id", row.id);

      if (error) {
        console.error(error.message);
        alert("Could not update event time: " + error.message);
      }
    },
    [me]
  );

  return (
    <div className="page">
      <div className="container-app">
        <div className="header-bar">
          <h1 className="page-title">Calendar</h1>
          <div className="muted">{loading ? "Loading…" : err ? `Error: ${err}` : null}</div>
        </div>

        <CalendarGrid
          date={date}
          setDate={setDate}
          view={view}
          setView={setView}
          events={mergedEvents}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          onDrop={handleDropOrResize}
          onResize={handleDropOrResize}
          draggableAccessor={canDrag}
        />
      </div>

      <EventDetails event={detailsOpen ? selected : null} onClose={() => setDetailsOpen(false)} />
    </div>
  );
}
