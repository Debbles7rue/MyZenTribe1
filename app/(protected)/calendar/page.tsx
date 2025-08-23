// app/(protected)/calendar/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import CreateEventModal from "@/components/CreateEventModal";
import EventDetails from "@/components/EventDetails";
import type { DBEvent, Visibility } from "@/lib/types";

export default function CalendarPage() {
  const [sessionUser, setSessionUser] = useState<string | null>(null);
  const [events, setEvents] = useState<DBEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Create modal state (kept so you can still add an event)
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

  // Details modal (re-using your existing component)
  const [selected, setSelected] = useState<DBEvent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSessionUser(data.user?.id ?? null));
  }, []);

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

  return (
    <div className="page">
      <div className="container-app">
        <h1 className="page-title">Calendar</h1>
        <p className="muted mb-3">
          (Temporary view for debugging: a simple list instead of the big calendar.)
        </p>

        <div className="mb-3">
          <button className="btn btn-brand" onClick={() => setOpenCreate(true)}>
            + Create event
          </button>
          <button className="btn ml-2" onClick={load}>
            Refresh
          </button>
        </div>

        {loading && <div className="card p-3">Loading events…</div>}
        {err && (
          <div className="card p-3">
            <div className="text-rose-700 text-sm">Error: {err}</div>
          </div>
        )}

        {!loading && !err && events.length === 0 && (
          <div className="card p-3">No events yet.</div>
        )}

        {!loading && !err && events.length > 0 && (
          <div className="card p-3">
            <ul className="space-y-2">
              {events.map((e) => (
                <li key={(e as any).id} className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{(e as any).title || "Untitled event"}</div>
                    <div className="text-sm text-neutral-600">
                      {new Date((e as any).start_time).toLocaleString()} –{" "}
                      {new Date((e as any).end_time).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-neutral"
                      onClick={() => {
                        setSelected(e);
                        setDetailsOpen(true);
                      }}
                    >
                      Details
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <CreateEventModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        sessionUser={sessionUser}
        value={form}
        onChange={(v) => setForm((prev) => ({ ...prev, ...v }))}
        onSave={createEvent}
      />

      <EventDetails event={detailsOpen ? selected : null} onClose={() => setDetailsOpen(false)} />
    </div>
  );
}
