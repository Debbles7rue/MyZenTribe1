// app/(protected)/calendar/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { View } from "react-big-calendar";
import { supabase } from "@/lib/supabaseClient";
import CreateEventModal from "@/components/CreateEventModal";
import EventDetails from "@/components/EventDetails";
import type { DBEvent, Visibility } from "@/lib/types";
import { useMoonRange } from "@/lib/useMoon"; // ✅ stable hook that returns RBC events

const CalendarGrid = dynamic(() => import("@/components/CalendarGrid"), { ssr: false });

type FeedEvent = DBEvent & { _dismissed?: boolean };
type Mode = "my" | "whats";

export default function CalendarPage() {
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const [mode, setMode] = useState<Mode>("my");
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>("month");

  const [events, setEvents] = useState<DBEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);

  // ------- Load My Calendar -------
  async function loadCalendar() {
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

    let rsvpIds = new Set<string>();
    if (me) {
      const { data: myAtt } = await supabase.from("event_attendees").select("event_id").eq("user_id", me);
      rsvpIds = new Set((myAtt || []).map((r: any) => r.event_id));
    }

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
    if (me !== null) loadCalendar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  useEffect(() => {
    const ch = supabase
      .channel("events-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, loadCalendar)
      .subscribe();
    return () => void supabase.removeChannel(ch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------- Load What's Happening -------
  async function loadFeed() {
    if (!me) return;
    setFeedLoading(true);
    try {
      const { data: f } = await supabase.from("friends_view").select("friend_id").limit(500);
      const friendIds = (f || []).map((r: any) => r.friend_id);

      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);

      let query = supabase
        .from("events")
        .select("*")
        .gte("start_time", from.toISOString())
        .order("start_time", { ascending: true })
        .neq("created_by", me)
        .eq("visibility", "public");

      if (friendIds.length) {
        // OR in business posts (fallback) using a filter group
        query = query.or(`created_by.in.(${friendIds.join(",")}),source.eq.business`);
      } else {
        query = query.eq("source", "business");
      }

      const { data } = await query;
      setFeed((data || []) as FeedEvent[]);
    } catch {
      setFeed([]);
    } finally {
      setFeedLoading(false);
    }
  }
  useEffect(() => {
    if (mode === "whats" && me) loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, me]);

  // ------- Create modal -------
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
    setCreateForm((f) => ({ ...f, title: "", start: toLocalInput(info.start), end: toLocalInput(info.end) }));
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
      title: "", description: "", location: "", start: "", end: "",
      visibility: "public", event_type: "", community_id: "", source: "personal", image_path: "",
    });
    loadCalendar();
  };

  // ------- Details modal -------
  const [selected, setSelected] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const openDetails = (e: any) => {
    const r = e?.resource;
    if (r) { setSelected(r); setDetailsOpen(true); return; }
    const id = e?.id;
    if (id) {
      const found = (events as any[]).find((it: any) => it?.id === id);
      if (found) { setSelected(found); setDetailsOpen(true); return; }
    }
    if (e?.title && e?.start && e?.end) {
      const faux = {
        id: id || "", title: e.title, description: null,
        start_time: new Date(e.start).toISOString(), end_time: new Date(e.end).toISOString(),
        visibility: "public", created_by: me || "", location: null, image_path: null,
        source: "personal", status: "scheduled", cancellation_reason: null, event_type: null, invite_code: null,
      };
      setSelected(faux); setDetailsOpen(true);
    }
  };

  const canEdit = (evt: any) => {
    const r = evt?.resource as any;
    return !!(r && me && r.created_by === me);
  };
  const onDrop = async ({ event, start, end }: any) => {
    if (!canEdit(event)) return;
    const r = event.resource as any;
    const { error } = await supabase.from("events").update({ start_time: start, end_time: end }).eq("id", r.id);
    if (error) alert(error.message);
  };
  const onResize = async ({ event, start, end }: any) => {
    if (!canEdit(event)) return;
    const r = event.resource as any;
    const { error } = await supabase.from("events").update({ start_time: start, end_time: end }).eq("id", r.id);
    if (error) alert(error.message);
  };

  // ------- Moon markers (safe, returns RBC events) -------
  const monthStart = useMemo(() => new Date(date.getFullYear(), date.getMonth(), 1), [date]);
  const monthEnd   = useMemo(() => new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59), [date]);
  const moonEvents = useMoonRange(monthStart, monthEnd) || [];

  // ------- Feed actions -------
  function dismissFromFeed(id: string) {
    setFeed((prev) => prev.map((e) => (e.id === id ? { ...e, _dismissed: true } : e)));
  }
  async function addToCalendarFromFeed(ev: FeedEvent, mode: "interested" | "rsvp" = "interested") {
    if (!me) return;
    if (mode === "rsvp") await supabase.from("event_attendees").upsert({ event_id: ev.id, user_id: me });
    else await supabase.from("event_interests").upsert({ event_id: ev.id, user_id: me });
    setFeed((prev) => prev.map((e) => (e.id === ev.id ? { ...e, _dismissed: true } : e)));
    loadCalendar();
  }

  return (
    <div className="page calendar-sand">
      <div className="container-app">
        <div className="header-bar">
          <h1 className="page-title">Calendar</h1>

          <div className="flex items-center gap-2">
            <div className="segmented" role="tablist" aria-label="Calendar mode">
              <button role="tab" aria-selected={mode === "whats"} className={`seg-btn ${mode === "whats" ? "active" : ""}`} onClick={() => setMode("whats")}>
                What’s Happening
              </button>
              <button role="tab" aria-selected={mode === "my"} className={`seg-btn ${mode === "my" ? "active" : ""}`} onClick={() => setMode("my")}>
                My Calendar
              </button>
            </div>

            <button className="btn btn-brand" onClick={() => setOpenCreate(true)}>+ Create event</button>
            <button className="btn" onClick={loadCalendar}>Refresh</button>
            {loading && mode === "my" && <span className="muted">Loading…</span>}
            {err && <span className="text-rose-700 text-sm">Error: {err}</span>}
          </div>
        </div>

        {mode === "whats" ? (
          <div className="card p-3">
            {feedLoading ? (
              <div className="muted">Loading feed…</div>
            ) : feed.filter((e) => !e._dismissed).length === 0 ? (
              <div className="muted">Nothing new right now. Check back later.</div>
            ) : (
              <ul className="space-y-2">
                {feed.filter((e) => !e._dismissed).map((e) => (
                  <li key={e.id} className="border border-neutral-200 rounded-lg p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{e.title || "Untitled event"}</div>
                      <div className="text-xs text-neutral-600">
                        {new Date(e.start_time!).toLocaleString()} — {e.location || "TBD"}
                        {e.source ? ` · ${e.source}` : ""}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn" onClick={() => dismissFromFeed(e.id)}>Dismiss</button>
                      <button className="btn btn-brand" onClick={() => addToCalendarFromFeed(e, "interested")}>Add to Calendar</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
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
        )}
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
