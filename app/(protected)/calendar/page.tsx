"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Views, View } from "react-big-calendar";
import { supabase } from "@/lib/supabaseClient";

// UI pieces
import SiteHeader from "@/components/SiteHeader";
import CalendarHeader from "@/components/CalendarHeader";
import CalendarGrid, { UiEvent } from "@/components/CalendarGrid";
import CreateEventModal from "@/components/CreateEventModal";
import EventDetails from "@/components/EventDetails";

// Helpers / types
import { useMoon } from "@/hooks/useMoon";
import type { DBEvent, Visibility } from "@/lib/types";

export default function CalendarPage() {
  /* ---------------- Theme (persist) ---------------- */
  const [theme, setTheme] = useState<"spring" | "summer" | "autumn" | "winter">(
    "winter"
  );
  useEffect(() => {
    const saved = localStorage.getItem("mzt-theme") as
      | "spring"
      | "summer"
      | "autumn"
      | "winter"
      | null;
    if (saved) setTheme(saved);
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("mzt-theme", theme);
  }, [theme]);

  /* ---------------- Session ---------------- */
  const [sessionUser, setSessionUser] = useState<string | null>(null);
  useEffect(() => {
    supabase
      .auth
      .getUser()
      .then(({ data }) => setSessionUser(data.user?.id ?? null));
  }, []);

  /* ---------------- Filters ---------------- */
  const [mode, setMode] = useState<"whats" | "mine">("whats");
  const [typeFilter, setTypeFilter] = useState<"all" | "personal" | "business">(
    "all"
  );
  const [showMoon, setShowMoon] = useState(true);
  const [query, setQuery] = useState("");

  /* ---------------- Calendar state ---------------- */
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState<Date>(new Date());

  /* ---------------- Data ---------------- */
  const [events, setEvents] = useState<DBEvent[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!sessionUser) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_time", { ascending: true });

    if (!error && data) {
      let list = data as DBEvent[];

      if (mode === "mine") {
        list = list.filter((e) => e.created_by === sessionUser);
      }
      if (typeFilter !== "all") {
        list = list.filter((e) => (e.source || "personal") === typeFilter);
      }
      if (query.trim()) {
        const q = query.toLowerCase();
        list = list.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            (e.description ?? "").toLowerCase().includes(q) ||
            (e.location ?? "").toLowerCase().includes(q)
        );
      }
      setEvents(list);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (sessionUser) load();
  }, [sessionUser, mode, typeFilter, query]);

  // realtime refresh
  useEffect(() => {
    const ch = supabase
      .channel("events-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        load
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [sessionUser, mode, typeFilter, query]);

  /* ---------------- Create modal ---------------- */
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
    if (!form.title || !form.start || !form.end)
      return alert("Missing fields.");

    // keep this 'any' to avoid TS friction if your DBEvent type doesn't include
    // all of these optional columns yet
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

  /* ---------------- Moon overlay ---------------- */
  const moonUi = useMoon(date.getFullYear(), showMoon);
  const moonUiEvents: UiEvent[] = useMemo(
    () =>
      moonUi.map((m) => ({
        id: m.id,
        title: m.title,
        start: m.start,
        end: m.end,
        allDay: true,
        resource: { moonPhase: (m as any).resource.moonPhase },
      })),
    [moonUi]
  );

  /* ---------------- Click/drag handlers ---------------- */
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<DBEvent | null>(null);

  const onSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    if (view === Views.MONTH) {
      setDate(start);
      setView(Views.DAY);
      return;
    }
    const toLocal = (d: Date) =>
      new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    setForm((f) => ({ ...f, start: toLocal(start), end: toLocal(end) }));
    setOpenCreate(true);
  };

  const onSelectEvent = (evt: UiEvent) => {
    if ((evt as any)?.resource?.moonPhase) return;
    setSelected(evt.resource as DBEvent);
    setDetailsOpen(true);
  };

  const canEdit = (e: DBEvent) => sessionUser && e.created_by === sessionUser;

  const onDrop = async ({
    event,
    start,
    end,
  }: {
    event: UiEvent;
    start: Date;
    end: Date;
  }) => {
    const db: DBEvent = event.resource;
    if (!canEdit(db)) return alert("You can only move events you created.");
    const { error } = await supabase
      .from("events")
      .update({
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      })
      .eq("id", db.id);
    if (error) alert(error.message);
    else load();
  };

  const onResize = onDrop;

  /* ---------------- Render ---------------- */
  return (
    <div className="page">
      <SiteHeader />

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
        <p className="muted mt-2 text-xs">
          🌑 New • 🌓 First Quarter • 🌕 Full • 🌗 Last Quarter
        </p>
      </div>

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
