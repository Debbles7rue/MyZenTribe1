// app/(protected)/calendar/page.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { View } from "react-big-calendar";
import { supabase } from "@/lib/supabaseClient";
import { localizer } from "@/lib/localizer";
import { useMoon } from "@/lib/useMoon";
import type { DBEvent } from "@/lib/types";

import TaskTray, { PlannerItem } from "@/components/TaskTray";
import WeatherBadge from "@/components/WeatherBadge";
import WhatsHappeningDeck from "@/components/WhatsHappeningDeck";
import CalendarGrid, { UiEvent } from "@/components/CalendarGrid";
// lazy + client-only modal (avoids hydration/hook-order issues)
const EventDetails = dynamic(() => import("@/components/EventDetails"), { ssr: false });
import PlannerItemModal from "@/components/PlannerItemModal";
import EventQuickCreate from "@/components/EventQuickCreate";

/** Super-light error boundary to protect the page from modal hiccups */
class ModalBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    // no-op; could log to Supabase or Sentry
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="card p-3">
          <div className="text-sm text-rose-700">
            Sorry—there was a problem opening that event. Try again or refresh.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

type Tab = "my" | "happening";

export default function CalendarPage() {
  const [sessionUser, setSessionUser] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSessionUser(data.user?.id ?? null));
  }, []);

  // calendar state
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const [tab, setTab] = useState<Tab>("my");
  const [showMoon, setShowMoon] = useState(true);

  // db events
  const [events, setEvents] = useState<DBEvent[]>([]);
  const [feedEvents, setFeedEvents] = useState<DBEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // planner
  const [planner, setPlanner] = useState<PlannerItem[]>([]);
  const [dragItem, setDragItem] = useState<PlannerItem | null>(null);

  // details modals
  const [selected, setSelected] = useState<DBEvent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [selectedPlanner, setSelectedPlanner] = useState<PlannerItem | null>(null);

  // quick create
  const [qcOpen, setQcOpen] = useState(false);
  const [qcDefaults, setQcDefaults] = useState<{ start?: Date; end?: Date }>({});

  // moon markers
  const moon = useMoon(date, view);
  const moonEvents = useMemo(
    () =>
      (moon?.events ?? []).map((m: any) => ({
        id: m.id,
        title: m.title,
        start: new Date(m.start),
        end: new Date(m.end),
        allDay: true,
        resource: { moonPhase: m.icon },
      })),
    [moon]
  );

  // loaders
  const loadPlanner = useCallback(async () => {
    if (!sessionUser) return;
    const { data } = await supabase
      .from("planner_items")
      .select("*")
      .eq("user_id", sessionUser)
      .order("created_at", { ascending: true });
    setPlanner((data ?? []) as PlannerItem[]);
  }, [sessionUser]);

  const loadMy = useCallback(async () => {
    if (!sessionUser) return;
    setLoading(true);
    setErr(null);
    try {
      const created = await supabase.from("events").select("*").eq("created_by", sessionUser);

      const rsvp = await supabase
        .from("event_attendees")
        .select("event_id")
        .eq("user_id", sessionUser);

      const interested = await supabase
        .from("event_interests")
        .select("event_id")
        .eq("user_id", sessionUser);

      if (created.error) throw created.error;
      if (rsvp.error) throw rsvp.error;
      if (interested.error) throw interested.error;

      const idSet = new Set<string>([
        ...(rsvp.data?.map((r) => r.event_id) ?? []),
        ...(interested.data?.map((i) => i.event_id) ?? []),
      ]);

      let others: DBEvent[] = [];
      if (idSet.size) {
        const more = await supabase.from("events").select("*").in("id", Array.from(idSet));
        if (more.error) throw more.error;
        others = (more.data ?? []) as DBEvent[];
      }

      const all = [...((created.data ?? []) as DBEvent[]), ...others].filter(
        (e: any) => e.start_time && e.end_time
      );
      setEvents(all);
    } catch (e: any) {
      setErr(e.message || "Failed to load calendar");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [sessionUser]);

  const loadHappening = useCallback(async () => {
    if (!sessionUser) return;
    setErr(null);
    try {
      const friends = await supabase.from("friends_view").select("friend_id");
      const follows = await supabase
        .from("follows")
        .select("followee_id, followee_type")
        .eq("follower_id", sessionUser);

      const friendIds = new Set<string>(friends.data?.map((r: any) => r.friend_id) ?? []);
      const userFollowIds = new Set<string>(
        (follows.data ?? []).filter((f) => f.followee_type === "user").map((f) => f.followee_id)
      );
      const businessFollowIds = new Set<string>(
        (follows.data ?? [])
          .filter((f) => f.followee_type === "business")
          .map((f) => f.followee_id)
      );

      const creatorIds = Array.from(new Set([...friendIds, ...userFollowIds, ...businessFollowIds]));
      let feed: DBEvent[] = [];
      if (creatorIds.length) {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("visibility", "public")
          .in("created_by", creatorIds)
          .order("start_time", { ascending: true });
        if (error) throw error;
        feed = (data ?? []).filter((e: any) => e.start_time && e.end_time) as DBEvent[];
      }
      setFeedEvents(feed);
    } catch (e: any) {
      setErr(e.message || "Failed to load feed");
      setFeedEvents([]);
    }
  }, [sessionUser]);

  useEffect(() => {
    if (!sessionUser) return;
    if (tab === "my") loadMy();
    else loadHappening();
    loadPlanner();
  }, [sessionUser, tab, loadMy, loadHappening, loadPlanner]);

  // realtime
  useEffect(() => {
    const subs = [
      supabase
        .channel("events-rt")
        .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
          tab === "my" ? loadMy() : loadHappening();
        })
        .subscribe(),
      supabase
        .channel("attendees-rt")
        .on("postgres_changes", { event: "*", schema: "public", table: "event_attendees" }, loadMy)
        .subscribe(),
      supabase
        .channel("interest-rt")
        .on("postgres_changes", { event: "*", schema: "public", table: "event_interests" }, loadMy)
        .subscribe(),
      supabase
        .channel("planner-rt")
        .on("postgres_changes", { event: "*", schema: "public", table: "planner_items" }, loadPlanner)
        .subscribe(),
    ];
    return () => subs.forEach((s) => supabase.removeChannel(s));
  }, [tab, loadMy, loadHappening, loadPlanner]);

  const openFromCalendar = (sel: any) => {
    const r = sel?.resource || sel;
    if (r?.planner) {
      setSelectedPlanner(r.planner as PlannerItem);
      setPlannerOpen(true);
      return;
    }
    if (!r || !r.id) return;
    setSelected(r as DBEvent);
    setDetailsOpen(true);
  };

  /** ---- DnD: optimistic + persisted ---- */
  const updateEventLocal = (id: string, start: Date, end: Date) => {
    const s = start.toISOString();
    const e = end.toISOString();
    setEvents((prev) => prev.map((x) => (x.id === id ? { ...x, start_time: s, end_time: e } : x)));
    setFeedEvents((prev) => prev.map((x) => (x.id === id ? { ...x, start_time: s, end_time: e } : x)));
  };

  const onMoveOrResizeEvent = async ({ event, start, end }: any) => {
    const r = event.resource;
    // moving a scheduled planner item inside the grid
    if (r?.planner) {
      const pid = r.planner.id as string;
      // optimistic
      setPlanner((prev) =>
        prev.map((p) =>
          p.id === pid ? { ...p, scheduled_start: start.toISOString(), scheduled_end: end.toISOString() } : p
        )
      );
      const { error } = await supabase
        .from("planner_items")
        .update({ scheduled_start: start, scheduled_end: end })
        .eq("id", pid);
      if (error) alert(error.message);
      return;
    }

    // moving a DB event — only creator can move
    const e = r as DBEvent;
    if (!sessionUser || !e?.id) return;
    if (e.created_by !== sessionUser) return alert("Only the creator can move this event.");

    // optimistic
    updateEventLocal(e.id, start, end);

    // persist
    const { error } = await supabase
      .from("events")
      .update({ start_time: start, end_time: end })
      .eq("id", e.id);
    if (error) alert(error.message);
  };

  const onDropFromOutside = async ({ start, end }: { start: Date; end: Date }) => {
    if (!dragItem) return;
    // optimistic
    setPlanner((prev) =>
      prev.map((p) =>
        p.id === dragItem.id
          ? { ...p, scheduled_start: start.toISOString(), scheduled_end: end.toISOString() }
          : p
      )
    );
    // persist
    const { error } = await supabase
      .from("planner_items")
      .update({ scheduled_start: start, scheduled_end: end })
      .eq("id", dragItem.id);
    if (error) alert(error.message);
    setDragItem(null);
  };

  const onMovePlanner = async ({ event, start, end }: any) => {
    const p = event.resource?.planner as PlannerItem | undefined;
    if (!p) return;
    // optimistic
    setPlanner((prev) =>
      prev.map((it) =>
        it.id === p.id ? { ...it, scheduled_start: start.toISOString(), scheduled_end: end.toISOString() } : it
      )
    );
    // persist
    const { error } = await supabase
      .from("planner_items")
      .update({ scheduled_start: start, scheduled_end: end })
      .eq("id", p.id);
    if (error) alert(error.message);
  };

  const dbUi: UiEvent[] = useMemo(
    () =>
      (tab === "my" ? events : feedEvents).map((e) => ({
        id: (e as any).id,
        title: e.title,
        start: new Date(e.start_time as any),
        end: new Date(e.end_time as any),
        allDay: false,
        resource: e,
      })),
    [tab, events, feedEvents]
  );

  const plannerUi: UiEvent[] = useMemo(
    () =>
      (planner || [])
        .filter((p) => p.scheduled_start && p.scheduled_end)
        .map((p) => ({
          id: `planner-${p.id}`,
          title: p.title,
          start: new Date(p.scheduled_start as any),
          end: new Date(p.scheduled_end as any),
          allDay: false,
          resource: { planner: p },
        })),
    [planner]
  );

  const mergedEvents = useMemo(
    () => [...dbUi, ...plannerUi, ...(showMoon ? (moonEvents as any) : [])],
    [dbUi, plannerUi, moonEvents, showMoon]
  );

  // who can drag?
  const canDrag = useCallback(
    (evt: UiEvent) => {
      const r = (evt as any).resource || {};
      if (r?.planner) return true;
      if (!sessionUser) return false;
      return r?.created_by === sessionUser;
    },
    [sessionUser]
  );

  return (
    <div className="page calendar-sand">
      <div className="container-app">
        <div className="header-bar">
          <h1 className="page-title">Calendar</h1>

          <div className="controls">
            <div className="segmented" role="tablist" aria-label="Calendar filter">
              <button role="tab" aria-selected={tab === "my"} className={`seg-btn ${tab === "my" ? "active" : ""}`} onClick={() => setTab("my")}>
                My calendar
              </button>
              <button role="tab" aria-selected={tab === "happening"} className={`seg-btn ${tab === "happening" ? "active" : ""}`} onClick={() => setTab("happening")}>
                What’s happening
              </button>
            </div>

            <label className="check">
              <input type="checkbox" checked={showMoon} onChange={(e) => setShowMoon(e.target.checked)} />
              Show moon
            </label>

            <button
              className="btn btn-brand"
              onClick={() => {
                const now = new Date();
                setQcDefaults({ start: now, end: new Date(now.getTime() + 60 * 60 * 1000) });
                setQcOpen(true);
              }}
            >
              + Create event
            </button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <WeatherBadge />
          <div className="flex items-center gap-6 text-sm">
            <button className="btn" onClick={() => setDate(localizer.add(date, -1, view))}>◀</button>
            <div className="muted">{localizer.format(date, view === "month" ? "MMMM yyyy" : "PP")}</div>
            <button className="btn" onClick={() => setDate(localizer.add(date, +1, view))}>▶</button>
            <button className="btn" onClick={() => setDate(new Date())}>Today</button>
          </div>
        </div>

        {tab === "happening" && (
          <div className="mb-3">
            <WhatsHappeningDeck
              items={feedEvents}
              onDismiss={(e) => setFeedEvents((prev) => prev.filter((x) => x.id !== e.id))}
              onAdd={async (e) => {
                if (!sessionUser) return;
                await supabase.from("event_interests").upsert({ event_id: e.id, user_id: sessionUser });
                loadMy();
              }}
              onOpen={(e) => openFromCalendar({ resource: e })}
            />
          </div>
        )}

        <div className="grid-cols-calendar">
          <TaskTray
            items={planner}
            onCreate={async (payload) => {
              const { data } = await supabase.from("planner_items").insert(payload).select("*").single();
              if (data) setPlanner((prev) => [...prev, data as PlannerItem]);
            }}
            onDelete={async (id) => {
              await supabase.from("planner_items").delete().eq("id", id);
              setPlanner((prev) => prev.filter((p) => p.id !== id));
            }}
            onBeginDrag={(it) => setDragItem(it)}
            onEndDrag={() => setDragItem(null)}
          />

          <CalendarGrid
            date={date}
            setDate={setDate}
            view={view}
            setView={setView}
            events={mergedEvents}
            onSelectEvent={openFromCalendar}
            onSelectSlot={({ start, end }) => {
              setQcDefaults({ start, end });
              setQcOpen(true);
            }}
            onDrop={onMoveOrResizeEvent}
            onResize={onMoveOrResizeEvent}
            onPlannerMove={onMovePlanner}
            onDropFromOutside={onDropFromOutside}
            dragFromOutsideItem={() => (dragItem ? { ...dragItem, isPlanner: true } : null)}
            draggableAccessor={canDrag}
          />
        </div>

        {loading && <div className="muted mt-2">Loading…</div>}
        {err && <div className="text-rose-700 text-sm mt-2">Error: {err}</div>}
      </div>

      {/* Modals (protected by boundary; force remount per event) */}
      <ModalBoundary>
        <EventDetails
          key={selected?.id || "empty"}
          event={detailsOpen ? selected : null}
          onClose={() => setDetailsOpen(false)}
        />
      </ModalBoundary>

      <PlannerItemModal
        open={plannerOpen}
        item={selectedPlanner}
        onClose={() => setPlannerOpen(false)}
        onSaved={() => setPlannerOpen(false)}
        onDeleted={() => setPlannerOpen(false)}
      />
      <EventQuickCreate
        open={qcOpen}
        onClose={() => setQcOpen(false)}
        defaults={qcDefaults}
        sessionUser={sessionUser}
        onCreated={() => {
          setQcOpen(false);
          tab === "my" ? loadMy() : loadHappening();
        }}
      />
    </div>
  );
}
