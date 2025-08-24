// app/(protected)/calendar/page.tsx
"use client";

import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-big-calendar";
import type { DBEvent } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";
import EventDetails from "@/components/EventDetails";
import TaskTray, { PlannerItem } from "@/components/TaskTray";
import WhatsHappeningDeck from "@/components/WhatsHappeningDeck";
import WeatherBadge from "@/components/WeatherBadge";
import { useMoon } from "@/lib/useMoon"; // your existing hook
import { localizer } from "@/lib/localizer";

const CalendarGrid = dynamic(() => import("@/components/CalendarGrid"), { ssr: false });

type UiMoon = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: { moonPhase: "moon-full" | "moon-new" | "moon-first" | "moon-last" };
};

type Tab = "my" | "happening";

export default function CalendarPage() {
  const [sessionUser, setSessionUser] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSessionUser(data.user?.id ?? null));
  }, []);

  /** ---- Calendar state ---- */
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>("week");
  const [tab, setTab] = useState<Tab>("my");
  const [showMoon, setShowMoon] = useState(true);

  /** ---- Events (DB) ---- */
  const [events, setEvents] = useState<DBEvent[]>([]);
  const [feedEvents, setFeedEvents] = useState<DBEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /** ---- Planner (private ToDos/Reminders) ---- */
  const [planner, setPlanner] = useState<PlannerItem[]>([]);
  const [dragItem, setDragItem] = useState<PlannerItem | null>(null); // for external drag

  /** ---- Details modal ---- */
  const [selected, setSelected] = useState<DBEvent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const openDetails = (e: any) => {
    if (e?.resource?.planner) return; // planner items don't use EventDetails
    setSelected(e?.resource || e); // UiEvent.resource is DBEvent
    setDetailsOpen(true);
  };

  /** ---- Moon phases ---- */
  const moon = useMoon(date, view);
  const moonEvents: UiMoon[] = useMemo(
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

  /** ---- Loaders ---- */

  // Fetch MY CALENDAR:
  // - events I created
  // - events I RSVP'd to
  // - events I'm interested in
  // (and we keep visibility rules on the server via RLS)
  const loadMyCalendar = useCallback(async () => {
    if (!sessionUser) return;

    setLoading(true);
    setErr(null);

    try {
      // Created by me
      const created = await supabase
        .from("events")
        .select("*")
        .eq("created_by", sessionUser);

      // RSVP'd
      const rsvpIds = await supabase
        .from("event_attendees")
        .select("event_id")
        .eq("user_id", sessionUser);

      // Interested
      const intIds = await supabase
        .from("event_interests")
        .select("event_id")
        .eq("user_id", sessionUser);

      if (created.error) throw created.error;
      if (rsvpIds.error) throw rsvpIds.error;
      if (intIds.error) throw intIds.error;

      const ids = new Set<string>([
        ...(rsvpIds.data?.map((r) => r.event_id) ?? []),
        ...(intIds.data?.map((i) => i.event_id) ?? []),
      ]);

      let others: DBEvent[] = [];
      if (ids.size) {
        const other = await supabase.from("events").select("*").in("id", Array.from(ids));
        if (other.error) throw other.error;
        others = (other.data ?? []) as DBEvent[];
      }

      // filter out invalid times
      const all = [...((created.data ?? []) as DBEvent[]), ...others].filter(
        (e) => !!e.start_time && !!e.end_time
      );

      setEvents(all);
    } catch (e: any) {
      setErr(e.message || "Failed to load calendar");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [sessionUser]);

  // Fetch WHAT'S HAPPENING (public events by friends/acquaintances you follow & businesses you follow)
  const loadHappening = useCallback(async () => {
    if (!sessionUser) return;

    setErr(null);
    try {
      // friends_view defined earlier (owner-centric)
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
      } else {
        feed = [];
      }
      setFeedEvents(feed);
    } catch (e: any) {
      setErr(e.message || "Failed to load feed");
      setFeedEvents([]);
    }
  }, [sessionUser]);

  // Planner items (private)
  const loadPlanner = useCallback(async () => {
    if (!sessionUser) return;
    const { data, error } = await supabase
      .from("planner_items")
      .select("*")
      .eq("user_id", sessionUser)
      .order("created_at", { ascending: true });
    if (!error) setPlanner((data ?? []) as PlannerItem[]);
  }, [sessionUser]);

  useEffect(() => {
    if (!sessionUser) return;
    if (tab === "my") loadMyCalendar();
    if (tab === "happening") loadHappening();
    loadPlanner();
  }, [sessionUser, tab, loadMyCalendar, loadHappening, loadPlanner]);

  // Realtime listeners
  useEffect(() => {
    const ch1 = supabase
      .channel("events-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        tab === "my" ? loadMyCalendar() : loadHappening();
      })
      .subscribe();

    const ch2 = supabase
      .channel("attend-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "event_attendees" }, () =>
        loadMyCalendar()
      )
      .subscribe();

    const ch3 = supabase
      .channel("interest-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "event_interests" }, () =>
        loadMyCalendar()
      )
      .subscribe();

    const ch4 = supabase
      .channel("planner-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "planner_items" }, () =>
        loadPlanner()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
      supabase.removeChannel(ch3);
      supabase.removeChannel(ch4);
    };
  }, [tab, loadMyCalendar, loadHappening, loadPlanner]);

  /** ---- DnD handlers ---- */

  // Move/resize DB events (creator only)
  const onMoveOrResizeEvent = async ({
    event,
    start,
    end,
  }: {
    event: any;
    start: Date;
    end: Date;
  }) => {
    const e = event.resource as DBEvent;
    if (!sessionUser || !e?.id) return;
    if (e.created_by !== sessionUser) return alert("Only the creator can move this event.");

    const { error } = await supabase
      .from("events")
      .update({ start_time: start, end_time: end })
      .eq("id", e.id);
    if (error) alert(error.message);
  };

  // External drop from planner tray → schedule the item
  const onDropFromOutside = async ({ start, end }: { start: Date; end: Date }) => {
    if (!dragItem) return;
    await supabase
      .from("planner_items")
      .update({ scheduled_start: start, scheduled_end: end })
      .eq("id", dragItem.id);
    setDragItem(null);
  };

  // Moving a scheduled planner item inside the grid
  const onMovePlanner = async ({
    event,
    start,
    end,
  }: {
    event: any;
    start: Date;
    end: Date;
  }) => {
    const p = event.resource?.planner as PlannerItem | undefined;
    if (!p) return;
    await supabase
      .from("planner_items")
      .update({ scheduled_start: start, scheduled_end: end })
      .eq("id", p.id);
  };

  /** ---- Compose UI Events ---- */
  const dbUiEvents = useMemo(() => {
    return (events || []).map((e) => ({
      id: (e as any).id,
      title: e.title,
      start: new Date(e.start_time as any),
      end: new Date(e.end_time as any),
      allDay: false,
      resource: e,
    }));
  }, [events]);

  const plannerUiEvents = useMemo(() => {
    return (planner || [])
      .filter((p) => p.scheduled_start && p.scheduled_end)
      .map((p) => ({
        id: `planner-${p.id}`,
        title: p.title,
        start: new Date(p.scheduled_start as any),
        end: new Date(p.scheduled_end as any),
        allDay: false,
        resource: { planner: p },
      }));
  }, [planner]);

  const mergedEvents = useMemo(() => {
    return [...dbUiEvents, ...plannerUiEvents, ...(showMoon ? (moonEvents as any) : [])];
  }, [dbUiEvents, plannerUiEvents, moonEvents, showMoon]);

  /** ---- Feed deck actions ---- */
  const markInterested = async (id: string) => {
    if (!sessionUser) return;
    await supabase.from("event_interests").upsert({ event_id: id, user_id: sessionUser });
    loadMyCalendar();
  };
  const dismissFeed = async (_id: string) => {
    // no-op server; we just hide client-side
    setFeedEvents((prev) => prev.filter((e) => e.id !== _id));
  };

  /** ---- Render ---- */
  return (
    <div className="page">
      <div className="container-app">
        <div className="header-bar">
          <h1 className="page-title">Calendar</h1>

          <div className="controls">
            <div className="segmented" role="tablist" aria-label="Calendar filter">
              <button
                role="tab"
                aria-selected={tab === "my"}
                className={`seg-btn ${tab === "my" ? "active" : ""}`}
                onClick={() => setTab("my")}
              >
                My calendar
              </button>
              <button
                role="tab"
                aria-selected={tab === "happening"}
                className={`seg-btn ${tab === "happening" ? "active" : ""}`}
                onClick={() => setTab("happening")}
              >
                What’s happening
              </button>
            </div>

            <label className="check">
              <input
                type="checkbox"
                checked={showMoon}
                onChange={(e) => setShowMoon(e.target.checked)}
              />
              Show moon
            </label>
          </div>
        </div>

        {/* Weather + date selector */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <WeatherBadge />
          <div className="flex items-center gap-6 text-sm">
            <button className="btn" onClick={() => setDate(localizer.add(date, -1, view))}>
              ◀
            </button>
            <div className="muted">
              {localizer.format(date, view === "month" ? "MMMM yyyy" : "PP")}
            </div>
            <button className="btn" onClick={() => setDate(localizer.add(date, +1, view))}>
              ▶
            </button>
            <button className="btn" onClick={() => setDate(new Date())}>Today</button>
          </div>
        </div>

        {/* Mobile: deck first when in "What’s happening" */}
        {tab === "happening" && (
          <div className="mb-3">
            <WhatsHappeningDeck
              items={feedEvents}
              onDismiss={dismissFeed}
              onAdd={(e) => markInterested(e.id)}
              onOpen={(e) => openDetails({ resource: e })}
            />
          </div>
        )}

        <div className="grid-cols-calendar">
          {/* Task tray collapses under grid on small screens via CSS */}
          <TaskTray
            items={planner}
            onCreate={async (payload) => {
              const { data, error } = await supabase
                .from("planner_items")
                .insert(payload)
                .select("*")
                .single();
              if (!error && data) setPlanner((prev) => [...prev, data as PlannerItem]);
            }}
            onDelete={async (id) => {
              await supabase.from("planner_items").delete().eq("id", id);
              setPlanner((prev) => prev.filter((p) => p.id !== id));
            }}
            onBeginDrag={(it) => setDragItem(it)}
            onEndDrag={() => setDragItem(null)}
          />

          <CalendarGrid
            dbEvents={tab === "my" ? events : feedEvents}
            plannerEvents={plannerUiEvents}
            moonEvents={moonEvents as any}
            showMoon={showMoon}
            date={date}
            setDate={setDate}
            view={view}
            setView={setView}
            onSelectEvent={openDetails}
            onSelectSlot={({ start, end }) => {
              // Quick-create a new personal event for me
              if (!sessionUser) return;
              const title = window.prompt("Event title?") || "Untitled event";
              supabase
                .from("events")
                .insert({
                  title,
                  start_time: start,
                  end_time: end,
                  visibility: "private",
                  created_by: sessionUser,
                  source: "personal",
                })
                .then(({ error }) => error && alert(error.message));
            }}
            onDrop={(args) => {
              // DB event move/resize
              onMoveOrResizeEvent(args);
            }}
            onResize={(args) => {
              onMoveOrResizeEvent(args);
            }}
            onDropFromOutside={onDropFromOutside}
            dragFromOutsideItem={() => (dragItem ? { ...dragItem, isPlanner: true } : null)}
            onPlannerMove={onMovePlanner}
          />
        </div>

        {loading && <div className="muted mt-2">Loading…</div>}
        {err && <div className="text-rose-700 text-sm mt-2">Error: {err}</div>}
      </div>

      <EventDetails event={detailsOpen ? selected : null} onClose={() => setDetailsOpen(false)} />
    </div>
  );
}
