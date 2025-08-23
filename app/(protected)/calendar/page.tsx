// app/(protected)/calendar/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

import CreateEventModal from "@/components/CreateEventModal";
import EventDetails from "@/components/EventDetails";
import type { DBEvent, Visibility } from "@/lib/types";

export default function CalendarPage() {
  /* ---------- session ---------- */
  const [sessionUser, setSessionUser] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSessionUser(data.user?.id ?? null));
  }, []);

  /* ---------- data ---------- */
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
      // guard against bad rows (null start/end etc.)
      const safe = (data || []).filter((e: any) => e?.start_time && e?.end_time) as DBEvent[];
      setEvents(safe);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [sessionUser]);

  // realtime refresh
  useEffect(() => {
    const ch = supabase
      .channel("events-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, load)
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, []);

  /* ---------- create modal ---------- */
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

  const startNewEvent = () => {
    const now = new Date();
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    setForm((f) => ({ ...f, start: toLocalInput(now), end: toLocalInput(end) }));
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

  /* ---------- details modal ---------- */
  const [selected, setSelected] = useState<DBEvent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const openDetails = (e: DBEvent) => {
    setSelected(e);
    setDetailsOpen(true);
  };

  /* ---------- helpers ---------- */
  const fmt = (iso: string | null | undefined) => {
    if (!iso) return "TBD";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "TBD" : d.toLocaleString();
    // If you prefer date-fns formatting, you can swap this for format()
  };

  return (
    <div className="page">
      <div className="container-app">
        <h1 className="page-title">Calendar (debug list view)</h1>

        <div className="mb-3 flex items-center gap-2">
          <button className="btn btn-brand" onClick={startNewEvent}>
            + Create event
          </button>
          <button className="btn" onClick={load}>
            Refresh
          </button>
          {loading && <span className="muted">Loading…</span>}
          {err && <span className="text-rose-700 text-sm">Error: {err}</span>}
        </div>

        {/* Simple list in place of the big calendar grid */}
        <div className="card p-3">
          {events.length === 0 ? (
            <div className="muted">No events yet.</div>
          ) : (
            <ul className="space-y-3">
              {events.map((e) => (
                <li key={e.id} className="border-b pb-2">
                  <div className="font-medium">{e.title || "Untitled event"}</div>
                  <div className="text-sm text-neutral-600">
                    {fmt(e.start_time)} – {fmt(e.end_time)}
                  </div>
                  <div className="mt-1">
                    <button className="btn btn-neutral" onClick={() => openDetails(e)}>
                      Details
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateEventModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        sessionUser={sessionUser}
        value={form}
        onChange={(v) => setForm((prev) => ({ ...prev, ...v }))}
        onSave={createEvent}
      />

      <EventDetails
        event={detailsOpen ? selected : null}
        onClose={() => setDetailsOpen(false)}
      />
    </div>
  );
}
