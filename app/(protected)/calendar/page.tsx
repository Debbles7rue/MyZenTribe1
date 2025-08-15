"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Views, View } from "react-big-calendar";
import SiteHeader from "@/components/SiteHeader";
import { supabase } from "@/lib/supabaseClient";
import type { DBEvent, Visibility } from "@/lib/types";
import CalendarHeader from "@/components/CalendarHeader";
import CalendarGrid, { UiEvent } from "@/components/CalendarGrid";
import CreateEventModal from "@/components/CreateEventModal";
import { useMoon } from "@/hooks/useMoon";
// (Weather hook ready when we want it) import { useWeather } from "@/hooks/useWeather";
import EventDetails from "@/components/EventDetails";

export default function CalendarPage() {
  // --- theme (persists)
  const [theme, setTheme] = useState<"spring"|"summer"|"autumn"|"winter">("winter");
  useEffect(() => { const saved = localStorage.getItem("mzt-theme") as any; if (saved) setTheme(saved); }, []);
  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); localStorage.setItem("mzt-theme", theme); }, [theme]);

  // --- session
  const [sessionUser, setSessionUser] = useState<string|null>(null);
  useEffect(()=>{ supabase.auth.getUser().then(({data})=>setSessionUser(data.user?.id ?? null)); },[]);

  // --- filters
  const [mode, setMode] = useState<"whats"|"mine">("whats");
  const [typeFilter, setTypeFilter] = useState<"all"|"personal"|"business">("all");
  const [showMoon, setShowMoon] = useState(true);
  const [query, setQuery] = useState("");

  // --- calendar state
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState<Date>(new Date());

  // --- data
  const [events, setEvents] = useState<DBEvent[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!sessionUser) return;
    setLoading(true);

    // Keep it simple: fetch visible + mine, filter client-side
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_time", { ascending: true });
    if (!error && data) {
      let list = data as DBEvent[];
      if (mode === "mine") list = list.filter(e => e.created_by === sessionUser);
      if (typeFilter !== "all") list = list.filter(e => (e.source || "personal") === typeFilter);
      if (query.trim()) {
        const q = query.toLowerCase();
        list = list.filter(e =>
          e.title.toLowerCase().includes(q) ||
          (e.description ?? "").toLowerCase().includes(q) ||
          (e.location ?? "").toLowerCase().includes(q)
        );
      }
      setEvents(list);
    }
    setLoading(false);
  }
  useEffect(()=>{ if (sessionUser) load(); }, [sessionUser, mode, typeFilter, query]);

  // realtime updates (lightweight)
  useEffect(() => {
    const ch = supabase
      .channel("events-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sessionUser, mode, typeFilter, query]);

  // --- create modal
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", location: "",
    start: "", end: "",
    visibility: "public" as Visibility,
    event_type: "", community_id: "",
    source: "personal" as "personal" | "business",
    image_path: "",
  });
  const createEvent = async () => {
    if (!sessionUser) return alert("Please log in.");
    if (!form.title || !form.start || !form.end) return alert("Missing fields.");

    const payload: Partial<DBEvent> & { start_time: Date; end_time: Date } = {
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      start_time: new Date(form.start),
      end_time: new Date(form.end),
      visibility: form.visibility,
      created_by: sessionUser,
      latitude: null, longitude: null, rrule: null,
      event_type: form.event_type || null,
      rsvp_public: true,
      community_id: form.community_id || null,
      image_path: form.image_path || null,
      source: form.source,
    };

    const { error } = await supabase.from("events").insert(payload);
    if (error) return alert(error.message);
    setOpenCreate(false);
    setForm({ title:"", description:"", location:"", start:"", end:"", visibility:"public", event_type:"", community_id:"", source:"personal", image_path:"" });
    load();
  };

  // --- moon + (future) weather overlays
  const moonUi = useMoon(date.getFullYear(), showMoon);
  // const weatherUi = useWeather(showWeather);

  // --- merge into ui events
  const uiEvents = useMemo<UiEvent[]>(() => {
    const base = events.map((e) => ({
      id: e.id,
      title: e.title,
      start: new Date(e.start_time),
      end: new Date(e.end_time),
      allDay: false,
      resource: e,
    }));
    return [...base, ...moonUi /*, ...weatherUi*/];
  }, [events, moonUi]);

  // --- click handlers
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<DBEvent|null>(null);

  const onSelectSlot = ({ start, end }: {start:Date;end:Date;}) => {
    if (view === Views.MONTH) { setDate(start); setView(Views.DAY); return; }
    const toLocal = (d: Date) => new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
    setForm((f)=>({ ...f, start: toLocal(start), end: toLocal(end) }));
    setOpenCreate(true);
  };
  const onSelectEvent = (evt: UiEvent) => {
    if (evt.resource?.moonPhase) return; // ignore moon markers
    setSelected(evt.resource as DBEvent);
    setDetailsOpen(true);
  };
  const canEdit = (e: DBEvent) => sessionUser && e.created_by === sessionUser;
  const onDrop = async ({ event, start, end }: {event:UiEvent;start:Date;end:Date;}) => {
    const db: DBEvent = event.resource;
    if (!canEdit(db)) return alert("You can only move events you created.");
    const { error } = await supabase.from("events").update({ start_time: start.toISOString(), end_time: end.toISOString() }).eq("id", db.id);
    if (error) alert(error.message); else load();
  };
  const onResize = onDrop;

  return (
    <div className="page">
      <SiteHeader />

      <div className="container-app">
        <CalendarHeader
          mode={mode} setMode={setMode}
          typeFilter={typeFilter} setTypeFilter={setTypeFilter}
          showMoon={showMoon} setShowMoon={setShowMoon}
          theme={theme} setTheme={setTheme}
          query={query} setQuery={setQuery}
          onCreate={()=>setOpenCreate(true)}
        />

        <CalendarGrid
          events={uiEvents}
          date={date} setDate={setDate}
          view={view} setView={setView}
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
        onClose={()=>setOpenCreate(false)}
        sessionUser={sessionUser}
        value={form}
        onChange={(v)=>setForm(prev=>({...prev, ...v}))}
        onSave={createEvent}
      />

      <EventDetails event={detailsOpen ? selected : null} onClose={()=>setDetailsOpen(false)} />
    </div>
  );
}
