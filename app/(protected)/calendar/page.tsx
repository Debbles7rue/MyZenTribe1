"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { View } from "react-big-calendar";
import { supabase } from "@/lib/supabaseClient";
import EventDetails from "@/components/EventDetails";
import type { DBEvent } from "@/lib/types";
import { useMoon as useMoonHook } from "@/lib/useMoon";

// IMPORTANT: client-only grid to avoid SSR/hydration issues
const CalendarGrid = dynamic(() => import("@/components/CalendarGrid"), { ssr: false });

type UiEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource: any;
};

// Make the moon hook safe: always return an array (even if the hook shape changes)
function useSafeMoon(date: Date, view: View): UiEvent[] {
  // Call the hook unconditionally to preserve hook order.
  const raw: any = useMoonHook ? useMoonHook(date, view) : null;
  return Array.isArray(raw) ? raw : Array.isArray(raw?.events) ? raw.events : [];
}

export default function CalendarPage() {
  // current user
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  // calendar state
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState<Date>(new Date());
  const [showMoon, setShowMoon] = useState(true);

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

  // realtime
  useEffect(() => {
    const ch = supabase
      .channel("events-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, load)
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [load]);

  // moon markers (safe)
  const moonEvents: UiEvent[] = useSafeMoon(date, view);

  // db → Ui events (the grid will merge these with moonEvents)
  const dbUiEvents: UiEvent[] = useMemo(
    () =>
      events.map((e) => ({
        id: (e as any).id,
        title: e.title || "Untitled event",
        start: new Date(e.start_time!),
        end: new Date(e.end_time!),
        allDay: false,
        resource: e, // grid expects resource to style and identify
      })),
    [events]
  );

  // details modal (unwrap ui.resource!)
  const [selected, setSelected] = useState<DBEvent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleSelectEvent = useCallback((ui: any) => {
    const row: DBEvent | null = ui?.resource ?? null;
    if (!row) return;
    setSelected(row);
    setDetailsOpen(true);
  }, []);

  // create from free slot (day/week); month taps drill into day inside the grid
  const handleSelectSlot = useCallback((_slot: { start: Date; end: Date }) => {
    // Wire to your CreateEventModal if desired.
  }, []);

  // drag/resize — only update if creator; otherwise reload to revert
  const handleDrop = useCallback(
    async ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => {
      const row: DBEvent | null = event?.resource ?? null;
      if (!row || !me || row.created_by !== me) {
        // not allowed → reload to revert visual move
        load();
        return;
      }
      const { error } = await supabase
        .from("events")
        .update({ start_time: start.toISOString(), end_time: end.toISOString() })
        .eq("id", row.id);
      if (error) {
        alert("Could not move event: " + error.message);
        load();
      }
    },
    [me, load]
  );

  const handleResize = handleDrop;

  return (
    <div className="page">
      <div className="container-app">
        <div className="header-bar" style={{ alignItems: "center", gap: 12 }}>
          <h1 className="page-title">Calendar</h1>
          <div className="muted">{loading ? "Loading…" : err ? `Error: ${err}` : null}</div>
          <label className="check" style={{ marginLeft: "auto" }}>
            <input
              type="checkbox"
              checked={showMoon}
              onChange={(e) => setShowMoon(e.target.checked)}
            />
            <span>Show moon</span>
          </label>
        </div>

        <CalendarGrid
          // NOTE: these match your current CalendarGrid.tsx props
          dbEvents={dbUiEvents}
          moonEvents={moonEvents}
          showMoon={showMoon}
          date={date}
          setDate={setDate}
          view={view}
          setView={setView}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          onDrop={handleDrop}
          onResize={handleResize}
        />
      </div>

      <EventDetails event={detailsOpen ? selected : null} onClose={() => setDetailsOpen(false)} />
    </div>
  );
}
