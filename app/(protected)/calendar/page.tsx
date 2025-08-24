// app/(protected)/calendar/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { View } from "react-big-calendar";
import { supabase } from "@/lib/supabaseClient";
import EventDetails from "@/components/EventDetails";
import type { DBEvent } from "@/lib/types";
import { useMoon } from "@/lib/useMoon"; // assumes you added this helper

// IMPORTANT: client-only calendar grid to avoid SSR/hydration issues
const CalendarGrid = dynamic(() => import("@/components/CalendarGrid"), { ssr: false });

type UiEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource: DBEvent | any; // original row lives here
};

export default function CalendarPage() {
  // auth
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  // calendar view state
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

  // moon markers (all-day)
  const moon = useMoon(date, view); // returns UiEvent[] with resource.moonPhase

  // map DB rows → Ui events
  const uiEvents: UiEvent[] = useMemo(
    () =>
      events.map((e) => ({
        id: (e as any).id,
        title: e.title || "Untitled event",
        start: new Date(e.start_time!),
        end: new Date(e.end_time!),
        allDay: false,
        resource: e, // <— keep original row here
      })),
    [events]
  );

  const mergedEvents: UiEvent[] = useMemo(
    () => [...uiEvents, ...moon],
    [uiEvents, moon]
  );

  // selection → open details (UNWRAP ui.resource!)
  const [selected, setSelected] = useState<DBEvent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleSelectEvent = useCallback((ui: any) => {
    const row: DBEvent | null = ui?.resource ?? null;
    if (!row) {
      console.warn("No DBEvent resource on UiEvent:", ui);
      return;
    }
    setSelected(row);
    setDetailsOpen(true);
  }, []);

  // create from free slot (day/week only; month taps drill into day in CalendarGrid)
  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    // Your existing create flow (quick-create or open a modal) can be triggered here.
    // For now just log; hook up to your CreateEventModal if you like.
    console.log("Create new event at", start, "→", end);
  }, []);

  // drag/resize — only allow for creator’s own events
  const canDrag = useCallback(
    (ui: any) => {
      const row: DBEvent | null = ui?.resource ?? null;
      return !!me && !!row && row.created_by === me;
    },
    [me]
  );

  const handleDrop = useCallback(
    async ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => {
      const row: DBEvent | null = event?.resource ?? null;
      if (!row || !me || row.created_by !== me) return;

      const { error } = await supabase
        .from("events")
        .update({ start_time: start.toISOString(), end_time: end.toISOString() })
        .eq("id", row.id);

      if (error) {
        console.error(error.message);
        alert("Could not move event: " + error.message);
      }
    },
    [me]
  );

  const handleResize = handleDrop; // same update

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
          onSelectEvent={handleSelectEvent}   // <<< OPEN DETAILS
          onDrop={handleDrop}
          onResize={handleResize}
          draggableAccessor={canDrag}
          // (If you have tray drag-in, keep your dragFromOutsideItem/onDropFromOutside here)
        />
      </div>

      {/* Details modal */}
      <EventDetails event={detailsOpen ? selected : null} onClose={() => setDetailsOpen(false)} />
    </div>
  );
}
