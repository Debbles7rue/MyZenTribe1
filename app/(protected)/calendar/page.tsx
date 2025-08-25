// app/(protected)/calendar/page.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import type { DBEvent, Visibility } from "@/lib/types";
import EventDetails from "@/components/EventDetails";
import CreateEventModal from "@/components/CreateEventModal";
import WeatherBadge from "@/components/WeatherBadge";

// Client-only grid to avoid hydration errors
const CalendarGrid = dynamic(() => import("@/components/CalendarGrid"), { ssr: false });

export default function CalendarPage() {
  /** Auth */
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  /** View state */
  const [fcView, setFcView] = useState<"dayGridMonth" | "timeGridWeek" | "timeGridDay">("dayGridMonth");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [showMoon, setShowMoon] = useState(true);

  /** Data */
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

  /** Realtime refresh */
  useEffect(() => {
    const ch = supabase
      .channel("events-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, load)
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [load]);

  /** Event details modal */
  const [selected, setSelected] = useState<DBEvent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const openDetails = useCallback((ui: { resource?: DBEvent }) => {
    const row = ui?.resource;
    if (!row) return;
    setSelected(row);
    setDetailsOpen(true);
  }, []);

  /** Quick create via slot selection */
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

  // helpers to format local <input type=datetime-local>
  const toLocalInput = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const onSelectSlot = useCallback(({ start, end }: { start: Date; end: Date; allDay: boolean }) => {
    // Pre-fill modal with the selected range
    setForm((f) => ({
      ...f,
      start: toLocalInput(start),
      end: toLocalInput(end || new Date(start.getTime() + 60 * 60 * 1000)),
    }));
    setOpenCreate(true);
  }, []);

  const saveEvent = useCallback(async () => {
    if (!me) return alert("Please log in.");
    if (!form.title || !form.start || !form.end) return alert("Missing title or time range.");
    const payload: any = {
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      start_time: new Date(form.start),
      end_time: new Date(form.end),
      visibility: form.visibility,
      created_by: me,
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
    await load();
  }, [form, me, load]);

  /** Drag/resize save (creator-only) */
  const onDropOrResize = useCallback(
    async ({ resource, start, end }: { resource: DBEvent; start: Date; end: Date }) => {
      if (!resource || !me || resource.created_by !== me) {
        await load(); // revert
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
          {loading && <span className="muted">Loading…</span>}
          {err && <span className="text-rose-700 text-sm">Error: {err}</span>}
        </div>

        <CalendarGrid
          dbEvents={events}
          showMoon={showMoon}
          view={fcView}
          setView={setFcView}
          date={currentDate}
          setDate={setCurrentDate}
          onSelectSlot={onSelectSlot}
          onSelectEvent={openDetails}
          onDropOrResize={onDropOrResize}
          onNeedsRefresh={load}
        />
      </div>

      {/* Create modal */}
      <CreateEventModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        sessionUser={me}
        value={form}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onSave={saveEvent}
      />

      {/* Details modal */}
      <EventDetails event={detailsOpen ? selected : null} onClose={() => setDetailsOpen(false)} />
    </div>
  );
}
