// app/(protected)/calendar/page.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import type { DBEvent } from "@/lib/types";
import EventDetails from "@/components/EventDetails";
import WeatherBadge from "@/components/WeatherBadge";

// IMPORTANT: client-only grid (prevents hydration errors)
const CalendarGrid = dynamic(() => import("@/components/CalendarGrid"), { ssr: false });

export default function CalendarPage() {
  // auth
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  // view state
  const [fcView, setFcView] = useState<"dayGridMonth" | "timeGridWeek" | "timeGridDay">("dayGridMonth");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
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

  useEffect(() => { load(); }, [load]);

  // realtime
  useEffect(() => {
    const ch = supabase
      .channel("events-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, load)
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [load]);

  // details modal
  const [selected, setSelected] = useState<DBEvent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleSelectEvent = useCallback((ui: { resource?: DBEvent }) => {
    const row = ui?.resource;
    if (!row) return;
    setSelected(row);
    setDetailsOpen(true);
  }, []);

  const handleSelectSlot = useCallback((_slot: { start: Date; end: Date; allDay: boolean }) => {
    // hook into your CreateEventModal if you want quick-create; leaving as no-op for now
  }, []);

  const handleDropOrResize = useCallback(
    async ({ resource, start, end }: { resource: DBEvent; start: Date; end: Date }) => {
      if (!resource || !me || resource.created_by !== me) {
        // revert is handled inside the grid by refetching
        await load();
        return;
      }
      const { error } = await supabase
        .from("events")
        .update({ start_time: start.toISOString(), end_time: end.toISOString() })
        .eq("id", resource.id);
      if (error) {
        alert("Could not update event: " + error.message);
        await load();
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
          dbEvents={events}
          showMoon={showMoon}
          view={fcView}
          setView={setFcView}
          date={currentDate}
          setDate={setCurrentDate}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          onDropOrResize={handleDropOrResize}
          onNeedsRefresh={load}
        />
      </div>

      <EventDetails event={detailsOpen ? selected : null} onClose={() => setDetailsOpen(false)} />
    </div>
  );
}
