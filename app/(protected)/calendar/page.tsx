// app/(protected)/calendar/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { View } from "react-big-calendar";
import { supabase } from "@/lib/supabaseClient";
import CreateEventModal from "@/components/CreateEventModal";
import EventDetails from "@/components/EventDetails";
import type { DBEvent, Visibility } from "@/lib/types";
import { useMoon } from "@/lib/useMoon";

const CalendarGrid = dynamic(() => import("@/components/CalendarGrid"), { ssr: false });

export default function CalendarPage() {
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>("month");

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
      setLoading(false);
      return;
    }

    const safe = (data || []).filter((e: any) => e?.start_time && e?.end_time) as any[];

    // RSVP flags
    let rsvpIds = new Set<string>();
    if (me) {
      const { data: myAtt } = await supabase
        .from("event_attendees")
        .select("event_id")
        .eq("user_id", me);
      rsvpIds = new Set((myAtt || []).map((r: any) => r.event_id));
    }

    // Carpool thread existence (🚗 badge)
    let carpoolSet = new Set<string>();
    if (safe.length) {
      const ids = safe.map((e) => e.id);
      const { data: cm } = await supabase
        .from("circle_messages")
        .select("event_id")
        .in("event_id", ids)
        .eq("kind", "carpool");
      carpoolSet = new Set((cm || []).map((r: any) => r.event_id));
    }

    const withFlags = safe.map((e) => ({
      ...e,
      rsvp_me: rsvpIds.has(e.id),
      carpool_exists: carpoolSet.has(e.id),
    }));

    setEvents(withFlags as any);
    setLoading(false);
  }

  useEffect(() => {
    if (me !== null) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  useEffect(() => {
    const ch = supabase
      .channel("events-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, load)
      .subscribe();
    return () => void supabase.removeChannel(ch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleSelectSlot = (info: { start: Date; end: Date; action?: string; slots?: Date[] }) => {
    if (view === "month") {
      setView("day");
      setDate(info.start);
      return;
    }
    setCreateForm((f) => ({
      ...f,
      title: "",
      start: toLocalInput(info.start),
      end: toLocalInput(info.end),
    }));
    setOpenCreate(true);
  };

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
      status: "scheduled",
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

  const [selected, setSelected] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const openDetails = (e: any) => {
    const r = e?.resource;
    if (r) {
      setSelected(r);
      setDetailsOpen(true);
      return;
    }
    const id = e?.id;
    if (id) {
      const found = (events as any[]).find((it: any) => it?.id === id);
      if (found) {
        setSelected(found);
        setDetailsOpen(true);
        return;
      }
    }
    if (e?.title && e?.start && e?.end) {
      const faux = {
        id: id || "",
        title: e.title,
        description: null,
        start_time: new Date(e.start).toISOString(),
        end_time: new Date(e.end).toISOString(),
        visibility: "public",
        created_by: me || "",
        location: null,
        image_path: null,
        source: "personal",
        status: "scheduled",
        cancellation_reason: null,
        event_type: null,
        invite_code: null,
      };
      setSelected(faux);
      setDetailsOpen(true);
    }
  };

  const canEdit = (evt: any) => {
    const r = evt?.resource as any;
    return !!(r && me && r.created_by === me);
  };

  const onDrop = async ({ event, start, end }: any) => {
    if (!canEdit(event)) return;
    const r = event.resource as any;
    const { error } = await supabase
      .from("events")
      .update({ start_time: start, end_time: end })
      .eq("id", r.id);
    if (error) alert(error.message);
  };

  const onResize = async ({ event, start, end }: any) => {
    if (!canEdit(event)) return;
    const r = event.resource as any;
    const { error } = await supabase
      .from("events")
      .update({ start_time: start, end_time: end })
      .eq("id", r.id);
    if (error) alert(error.message);
  };

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
      // useMoon supports (start,end)
      // @ts-ignore
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

        <CalendarGrid
          dbEvents={events as any}
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
