// app/(protected)/calendar/page.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { View } from "react-big-calendar";
import { supabase } from "@/lib/supabaseClient";
import type { DBEvent } from "@/lib/types";
import EventDetails from "@/components/EventDetails";
import WeatherBadge from "@/components/WeatherBadge";

// IMPORTANT: client-only grid to avoid SSR/hydration issues
const CalendarGrid = dynamic(() => import("@/components/CalendarGrid"), { ssr: false });

export default function CalendarPage() {
  // auth
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  // calendar view state
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState<Date>(new Date());
  const [showMoon, setShowMoon] = useState(true);

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

  // realtime refresh
  useEffect(() => {
    const ch = supabase
      .channel("events-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, load)
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [load]);

  // Details modal
  const [selected, setSelected] = useState<DBEvent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleSelectEvent = useCallback((ui: any) => {
    const row: DBEvent | null = ui?.resource ?? null;
    if (!row) return;
    setSelected(row);
    setDetailsOpen(true);
  }, []);

  const handleSelectSlot = useCallback((_slot: { start: Date; end: Date }) => {
    // hook into your CreateEventModal if desired
  }, []);

  const handleDropOrResize = useCallback(
    async ({ event, start, end }: { event: any; start: Date; end: Date }) => {
      const row: DBEvent | null = event?.resource ?? null;
      if (!row || !me || row.created_by !== me) {
        // Not allowed → reload to revert
        load();
        return;
      }
      const { error } = await supabase
        .from("events")
        .update({ start_time: start.toISOString(), end_time: end.toISOString() })
        .eq("id", row.id);
      if (error) {
        alert("Could not update event: " + error.message);
        load();
      }
    },
    [me, load]
  );

  return (
    <div className="page">
      <div className="container-app">
        <div className="header-bar" style={{ alignItems: "center", gap: 12 }}>
          <h1 className="page-title">Calendar</h1>
          <WeatherBadge />
          <label className="check" style={{ marginLeft: "auto" }}>
            <input
              type="checkbox"
              checked={showMoon}
              onChange={(e) => setShowMoon(e.target.checked)}
            />
            <span>Show moon</span>
          </label>
          <div className="muted">{loading ? "Loading…" : err ? `Error: ${err}` : null}</div>
        </div>

        <CalendarGrid
          // pass raw DB rows; grid handles mapping + moon markers internally
          dbEvents={events}
          showMoon={showMoon}
          date={date}
          setDate={setDate}
          view={view}
          setView={setView}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          onDrop={handleDropOrResize}
          onResize={handleDropOrResize}
        />
      </div>

      <EventDetails event={detailsOpen ? selected : null} onClose={() => setDetailsOpen(false)} />
    </div>
  );
}
