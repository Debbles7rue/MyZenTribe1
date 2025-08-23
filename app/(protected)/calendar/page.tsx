// app/(protected)/calendar/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Views, View } from "react-big-calendar";
import { supabase } from "@/lib/supabaseClient";

import CreateEventModal from "@/components/CreateEventModal";
import EventDetailsModal from "@/components/EventDetailsModal"; // 👈 NEW
import type { DBEvent, Visibility } from "@/lib/types";

// Client-only grid to avoid SSR/hydration issues
const CalendarGrid = dynamic(() => import("@/components/CalendarGrid"), {
  ssr: false,
  loading: () => <div className="card p-3">Loading calendar…</div>,
});

export default function CalendarPage() {
  /* session */
  const [sessionUser, setSessionUser] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSessionUser(data.user?.id ?? null));
  }, []);

  /* calendar view */
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState<Date>(new Date());

  /* data */
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
  }, [sessionUser]);

  useEffect(() => {
    const ch = supabase
      .channel("events-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  /* create modal */
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

  const toLocalInput = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const onSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    if (view === Views.MONTH) {
      setDate(start);
      setView(Views.DAY);
      return;
    }
    setForm((f) => ({ ...f, start: toLocalInput(start), end: toLocalInput(end) }));
    setOpenCreate(true);
  };

  const createEvent = async () => {
    if (!sessionUser) return alert("Please log in.");
    if (!form.title || !form.start || !form.end) return alert("Missing fields.");

    const payload: any = {
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      start_time: new Date(form.start),
      end_time: new Date(form.end),
      visibility: form.visibility,
      created_by: sessionUser,
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

  /* details modal */
  const [selected, setSelected] = useState<DBEvent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const onSelectEvent = (evt: any) => {
    setSelected(evt.resource as DBEvent);
    setDetailsOpen(true);
  };

  return (
    <div className="page">
      <div className="container-app">
        <h1 className="page-title">Calendar • v4</h1>

        <div className="mb-3 flex items-center gap-2">
          <button className="btn btn-brand" onClick={() => setOpenCreate(true)}>
            + Create event
          </button>
          <button className="btn" onClick={load}>
            Refresh
          </button>
          {loading && <span className="muted">Loading…</span>}
          {err && <span className="text-rose-700 text-sm
