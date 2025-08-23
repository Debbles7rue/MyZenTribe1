// app/(protected)/calendar/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Views, View } from "react-big-calendar";
import { supabase } from "@/lib/supabaseClient";

// UI pieces
import CalendarHeader from "@/components/CalendarHeader";
import CalendarGrid, { UiEvent } from "@/components/CalendarGrid";
import CreateEventModal from "@/components/CreateEventModal";
import EventDetails from "@/components/EventDetails";

// Helpers / types
import { useMoon } from "@/hooks/useMoon";
import type { DBEvent, Visibility } from "@/lib/types";

/** Page-level error boundary so any render error on this route shows a friendly box instead of Netlify’s “Application error” page. */
class PageBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; err?: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, err: null };
  }
  static getDerivedStateFromError(err: any) {
    return { hasError: true, err };
  }
  componentDidCatch(error: any, info: any) {
    console.error("Calendar page crashed:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="container-app">
          <div className="card p-4">
            <h2 className="text-xl font-semibold mb-2">We hit a snag</h2>
            <p className="mb-3">
              The calendar page had a rendering error. Try refreshing. If it
              keeps happening, open the browser console and share the first red
              line with me—we’ll pinpoint it quickly.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}

/** Strict date helpers (don’t trust anything) */
function toDate(x: any): Date | null {
  if (!x) return null;
  const d = x instanceof Date ? x : new Date(x);
  return isNaN(d.getTime()) ? null : d;
}
function fixRange(start: Date | null, end: Date | null) {
  if (!start && !end) return null;
  if (start && !end) return { start, end: new Date(start.getTime() + 30 * 60 * 1000) };
  if (!start && end) return { start: new Date(end.getTime() - 30 * 60 * 1000), end };
  if ((end as Date).getTime() <= (start as Date).getTime()) {
    return { start: start!, end: new Date(start!.getTime() + 30 * 60 * 1000) };
  }
  return { start: start!, end: end! };
}

export default function CalendarPage() {
  /* ---------------- Theme (persist) ---------------- */
  const [theme, setTheme] = useState<"spring" | "summer" | "autumn" | "winter">("winter");
  useEffect(() => {
    const saved =
      (localStorage.getItem("mzt-theme") as "spring" | "summer" | "autumn" | "winter" | null) ||
      null;
    if (saved) setTheme(saved);
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("mzt-theme", theme);
  }, [theme]);

  /* ---------------- Session ---------------- */
  const [sessionUser, setSessionUser] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSessionUser(data.user?.id ?? null));
  }, []);

  /* ---------------- Filters ---------------- */
  const [mode, setMode] = useState<"whats" | "mine">("whats");
  const [typeFilter, setTypeFilter] = useState<"all" | "personal" | "business">("all");
  const [showMoon, setShowMoon] = useState(true);
  const [query, setQuery] = useState("");

  /* ---------------- Calendar state ---------------- */
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState<Date>(new Date());

  /* ---------------- Data ---------------- */
  const [events, setEvents] = useState<DBEvent[]>([]);
  const [invalids, setInvalids] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!sessionUser) return;
    setLoading(true);

    // 1) fetch all events (your existing behavior)
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_time", { ascending: true });

    let list = (!error && data ? (data as DBEvent[]) : []) as DBEvent[];

    // 2) ALSO bring in events I RSVP’d to so “Mine” shows them too
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

    // 3) merge unique
    const byId = new Map<string, DBEvent>();
    [...list, ...rsvpEvents].forEach((e) => byId.set((e as any).id, e));
    list = Array.from(byId.values());

    // 4) filters (same as before)
    if (mode === "mine") {
      list = list.filter(
        (e) =>
          (e as any).created_by === sessionUser ||
          rsvpEvents.some((r) => (r as any).id === (e as any).id)
      );
    }
    if (typeFilter !== "all") {
      list = list.filter((e) => ((e as any).source || "personal") === typeFilter);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (e) =>
          (e.title || "").toLowerCase().includes(q) ||
          ((e.description || "") as string).toLowerCase().includes(q) ||
          ((e.location || "") as string).toLowerCase().includes(q)
      );
    }

    // 5) sanitize rows (log anything suspect so it won’t crash RBC)
    const bad: any[] = [];
    const safe: DBEvent[] = [];
    for (const e of list) {
      const start = toDate((e as any).start_time);
      const end = toDate((e as any).end_time);
      const fixed = fixRange(start, end);
      if (!fixed) {
        bad.push({
          id: (e as any).id,
          title: (e as any).title,
          start_time: (e as any).start_time,
          end_time: (e as any).end_time,
        });
        continue;
      }
      // keep original row; CalendarGrid will apply its own “final” guard too
      safe.push(e);
    }

    if (bad.length) {
      console.warn("Found events with unusable dates. They are ignored:", bad);
    }

    setInvalids(bad);
    setEvents(safe);
    setLoading(false);
  }

  useEffect(() => {
    if (sessionUser) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUser, mode, typeFilter, query]);

  // realtime refresh
  useEffect(() => {
    const ch = supabase
      .channel("events-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, load)
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

  /* ---------------- Moon overlay ---------------- */
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
      new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
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
    if (error) alert(error.message);
    else load();
  };

  const onResize = onDrop;

  /* ---------------- Render ---------------- */
  return (
    <PageBoundary>
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

          {/* If we filtered out anything, show a tiny debug hint (non-blocking) */}
          {invalids.length > 0 && (
            <details className="mb-2">
              <summary className="text-sm text-amber-700 cursor-pointer">
                {invalids.length} event{invalids.length > 1 ? "s" : ""} had unusable dates (skipped). Click for details.
              </summary>
              <pre className="text-xs p-2 bg-amber-50 border border-amber-200 rounded">
{JSON.stringify(invalids, null, 2)}
              </pre>
            </details>
          )}

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
    </PageBoundary>
  );
}
