"use client";

import { useRequireAuth } from "@/lib/useRequireAuth";
// ...your existing imports

export default function CalendarPage() {
  const { ready } = useRequireAuth();
  if (!ready) return null; // or a spinner

  // ...rest of your page exactly as-is
}

import React, { useEffect, useMemo, useState } from "react";
import { Views, View } from "react-big-calendar";
import { supabase } from "@/lib/supabaseClient";

import CalendarHeader from "@/components/CalendarHeader";
import CalendarGrid, { UiEvent } from "@/components/CalendarGrid";
import CreateEventModal from "@/components/CreateEventModal";
import EventDetails from "@/components/EventDetails";

import { useMoon } from "@/hooks/useMoon";
import type { DBEvent, Visibility } from "@/lib/types";

export default function CalendarPage() {
  const [theme, setTheme] = useState<"spring" | "summer" | "autumn" | "winter">("winter");
  useEffect(() => {
    const saved = localStorage.getItem("mzt-theme") as any;
    if (saved) setTheme(saved);
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("mzt-theme", theme);
  }, [theme]);

  const [sessionUser, setSessionUser] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSessionUser(data.user?.id ?? null));
  }, []);

  const [mode, setMode] = useState<"whats" | "mine">("whats");
  const [typeFilter, setTypeFilter] = useState<"all" | "personal" | "business">("all");
  const [showMoon, setShowMoon] = useState(true);
  const [query, setQuery] = useState("");

  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState<Date>(new Date());

  const [events, setEvents] = useState<DBEvent[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!sessionUser) return;
    setLoading(true);

    // Fetch all events (you were already doing this)
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_time", { ascending: true });

    let list = (!error && data ? (data as DBEvent[]) : []);

    // ALSO fetch events I RSVP'd to (so "mine" shows them too)
    let rsvpEvents: DBEvent[] = [];
    const rsvpIdsRes = await supabase
      .from("event_attendees")
      .select("event_id")
      .eq("user_id", sessionUser);

    if (!rsvpIdsRes.error && (rsvpIdsRes.data?.length || 0) > 0) {
      const ids = rsvpIdsRes.data!.map((r: any) => r.event_id);
      const byIds = await supabase.from("events").select("*").in("id", ids);
      if (!byIds.error && byIds.data) rsvpEvents = byIds.data as DBEvent[];
    }

    // Merge RSVPs into the list (de-dup)
    const byId = new Map<string, DBEvent>();
    [...list, ...rsvpEvents].forEach((e) => byId.set((e as any).id, e));
    list = Array.from(byId.values());

    // Filters (same as before)
    if (mode === "mine") {
      list = list.filter((e) => e.created_by === sessionUser || rsvpEvents.some((r) => (r as any).id === (e as any).id));
    }
    if (typeFilter !== "all") {
      list = list.filter((e) => ((e as any).source || "personal") === typeFilter);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          ((e as any).description ?? "").toLowerCase().includes(q) ||
          ((e as any).location ?? "").toLowerCase().includes(q)
      );
    }

    setEvents(list);
    setLoading(false);
  }

  useEffect(() => {
    if (sessionUser) load();
  }, [sessionUser, mode, typeFilter, query]);

  useEffect(() => {
    const ch = supabase
      .channel("events-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_attendees" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sessionUser, mode, typeFilter, query]);

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

  const moonUi = useMoon(date.getFullYear(), showMoon);
  const moonUiEvents: UiEvent[] = useMemo(
    () =>
      moonUi.map((m) => {
        const start = m.start as Date;
        const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
        return { id: m.id, title: m.title, start, end, allDay: true, resource: { moonPhase: (m as any).resource.moonPhase } };
      }),
    [moonUi]
  );

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<DBEvent | null>(null);

  const onSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    if (view === Views.MONTH) { setDate(start); setView(Views.DAY); return; }
    const toLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm((f) => ({ ...f, start: toLocal(start), end: toLocal(end) }));
    setOpenCreate(true);
  };

  const onSelectEvent = (evt: UiEvent) => {
    if ((evt as any)?.resource?.moonPhase) return;
    setSelected(evt.resource as DBEvent);
    setDetailsOpen(true);
  };

  const canEdit = (e: DBEvent) => sessionUser && (e as any).created_by === sessionUser;

  const onDrop = async ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => {
    const db: DBEvent = event.resource;
    if (!canEdit(db)) return alert("You can only move events you created.");
    const { error } = await supabase
      .from("events")
      .update({ start_time: start.toISOString(), end_time: end.toISOString() })
      .eq("id", (db as any).id);
    if (error) alert(error.message); else load();
  };

  const onResize = onDrop;

  return (
    <div className="page">
      <div className="container-app">
        <CalendarHeader
          mode={mode}
          setMode={setMode}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          showMoon={showMoon}
          setShowMoon={setShowMoon}
          theme={theme}
          setTheme={setTheme}
          query={query}
          setQuery={setQuery}
          onCreate={() => setOpenCreate(true)}
        />

        <CalendarGrid
          dbEvents={events}
          moonEvents={moonUiEvents}
          showMoon={showMoon}
          date={date}
          setDate={setDate}
          view={view}
          setView={setView}
          onSelectSlot={onSelectSlot}
          onSelectEvent={onSelectEvent}
          onDrop={onDrop}
          onResize={onResize}
        />

        {loading && <p className="muted mt-3">Loading…</p>}
        <p className="muted mt-2 text-xs">🌑 New • 🌓 First Quarter • 🌕 Full • 🌗 Last Quarter</p>
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
