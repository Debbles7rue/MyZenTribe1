// app/(protected)/calendar/page.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { View } from "react-big-calendar";
import { supabase } from "@/lib/supabaseClient";
import EventDetails from "@/components/EventDetails";
import ErrorBoundary from "@/components/ErrorBoundary";
import type { DBEvent } from "@/lib/types";
import { useMoon as useMoonHook } from "@/lib/useMoon"; // keep your hook

// Client-only grid avoids hydration errors
const CalendarGrid = dynamic(() => import("@/components/CalendarGrid"), { ssr: false });

type UiEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource: any;
};

/** ALWAYS return an array, even if the moon hook throws or changes shape */
function useSafeMoon(date: Date, view: View): UiEvent[] {
  try {
    // Call the hook unconditionally (keeps hook order stable)
    const raw: any = useMoonHook ? useMoonHook(date, view) : null;
    if (Array.isArray(raw)) return raw as UiEvent[];
    if (raw && Array.isArray(raw.events)) return raw.events as UiEvent[];
    return [];
  } catch (err) {
    console.warn("[useSafeMoon] moon hook failed, disabling markers this render:", err);
    return [];
  }
}

export default function CalendarPage() {
  // auth
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  // calendar view state
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState<Date>(new Date());

  // data
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

  // Moon markers (never crash)
  const moonEvents = useSafeMoon(date, view);

  // Map DB rows → Ui events (keep original row in resource)
  const uiEvents: UiEvent[] = useMemo(
    () =>
      events.map((e) => ({
        id: (e as any).id,
        title: e.title || "Untitled event",
        start: new Date(e.start_time!),
        end: new Date(e.end_time!),
        allDay: false,
        resource: e,
      })),
    [events]
  );

  const mergedEvents: UiEvent[] = useMemo(() => {
    // Extra guard: if anything weird slips in, coerce to arrays
    const a = Array.isArray(uiEvents) ? uiEvents : [];
    const b = Array.isArray(moonEvents) ? moonEvents : [];
    return [...a, ...b];
  }, [uiEvents, moonEvents]);

  // Details modal — unwrap ui.resource
  const [selected, setSelected] = useState<DBEvent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleSelectEvent = useCallback((ui: any) => {
    const row: DBEvent | null = ui?.resource ?? null;
    if (!row) return;
    setSelected(row);
    setDetailsOpen(true);
  }, []);

  // Create from free slot (Day/Week only — Month taps drill to day inside CalendarGrid)
  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    // Hook to your CreateEventModal here if desired.
    // console.log("create from slot", start, end);
  }, []);

  // Drag/Resize — creator only
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

        <ErrorBoundary>
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
        </ErrorBoundary>
      </div>

      <EventDetails event={detailsOpen ? selected : null} onClose={() => setDetailsOpen(false)} />
    </div>
  );
}
