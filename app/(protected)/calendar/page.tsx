// app/(protected)/calendar/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import CreateEventModal from "@/components/CreateEventModal";
import EventDetails from "@/components/EventDetails";
import type { View } from "react-big-calendar";
import type { DBEvent, Visibility } from "@/lib/types";

// If you have the moon hook, keep this import.
// If you removed it temporarily, comment this line out and pass [] for moonEvents below.
import { useMoon } from "@/lib/useMoon";

// Client-only grid (no SSR)
const CalendarGrid = dynamic(() => import("@/components/CalendarGrid"), { ssr: false });

export default function CalendarPage() {
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  // date/view state
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>("month");

  // events
  const [events, setEvents] = useState<DBEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
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
  }

  useEffect(() => {
    load();
  }, [me]);

  // realtime refresh
  useEffect(() => {
    const ch = supabase
      .channel("events-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, load)
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, []);

  // Create modal state
  const [openCreate, setOpenCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
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

  const toLocalInput = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  // Open Create modal prefilled (from slot)
  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setCreateForm((f) => ({
      ...f,
      title: "",
      start: toLocalInput(start),
      end: toLocalInput(end),
    }));
    setOpenCreate(true);
  };

  // Create event
  const createEvent = async () => {
    if (!me) return alert("Please log in.");

    const f = createForm;
    if (!f.title || !f.start || !f.end) return alert("Missing fields.");

    const payload: any = {
      title: f.title,
      description: f.description || null,
      location: f.location || null,
      start_time: new Date(f.start),
      end_time: new Date(f.end),
      visibility: f.visibility,
      created_by: me,
      event_type: f.event_type || null,
      rsvp_public: true,
      community_id: f.community_id || null,
      image_path: f.image_path || null,
      source: f.source,
    };

    const { error } = await supabase.from("events").insert(payload);
    if (error) return alert(error.message);

    setOpenCreate(false);
    setCreateForm({
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

  // Details modal
  const [selected, setSelected] = useState<DBEvent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const openDetails = (e: any) => {
    const r = e?.resource as DBEvent | undefined;
    if (r) {
      setSelected(r);
      setDetailsOpen(true);
    }
  };

  // Only allow drag/resize on own events
  const canEdit = (evt: any) => {
    const r = evt?.resource as DBEvent | undefined;
    if (!r || !me) return false;
    return r.created_by === me;
  };

  const onDrop = async ({ event, start, end }: any) => {
    if (!canEdit(event)) return;
    const r = event.resource as DBEvent;
    const { error } = await supabase
      .from("events")
      .update({ start_time: start, end_time: end })
      .eq("id", r.id);
    if (error) alert(error.message);
  };

  const onResize = async ({ event, start, end }: any) => {
    if (!canEdit(event)) return;
    const r = event.resource as DBEvent;
    const { error } = await supabase
      .from("events")
      .update({ start_time: start, end_time: end })
      .eq("id", r.id);
    if (error) alert(error.message);
  };

  // Moon markers (if you have the hook)
  const monthStart = useMemo(() => {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, [date]);
  const monthEnd = useMemo(() => {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
  }, [date]);

  const moonEvents = (() => {
    try {
      // @ts-ignore allow projects without the hook temporarily
      return useMoon ? useMoon(monthStart, monthEnd) : [];
    } catch {
      return [];
    }
  })();

  return (
    <div className="page calendar-sand">
      <div className="container-app">
        <div className="header-bar">
          <h1 className="page-title">Calendar</h1>
          <div className="flex items-center gap-2">
            <button className="btn btn-brand" onClick={() => setOpenCreate(true)}>
              + Create event
            </button>
            <button className="btn" onClick={load}>Refresh</button>
            {loading && <span className="muted">Loading…</span>}
            {err && <span className="text-rose-700 text-sm">Error: {err}</span>}
          </div>
        </div>

        {/* Big calendar */}
        <CalendarGrid
          dbEvents={events}
          moonEvents={moonEvents || []}
          showMoon={true}
          date={date}
          setDate={setDate}
          view={view}
          setView={setView}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={openDetails}
          onDrop={onDrop}
          onResize={onResize}
        />
      </div>

      {/* Modals */}
      <CreateEventModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        sessionUser={me}
        value={createForm}
        onChange={(v) => setCreateForm((prev) => ({ ...prev, ...v }))}
        onSave={createEvent}
      />

      <EventDetails event={detailsOpen ? selected : null} onClose={() => setDetailsOpen(false)} />
    </div>
  );
}
