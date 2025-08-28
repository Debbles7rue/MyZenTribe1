// app/(protected)/calendar/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { View } from "react-big-calendar";
import { supabase } from "@/lib/supabaseClient";
import CreateEventModal from "@/components/CreateEventModal";
import CalendarThemeSelector from "@/components/CalendarThemeSelector";
import EventDetails from "@/components/EventDetails";
import { useMoon } from "@/lib/useMoon";
import type { DBEvent, Visibility } from "@/lib/types";

// Client-only calendar grid
const CalendarGrid = dynamic(() => import("@/components/CalendarGrid"), {
  ssr: false,
  loading: () => (
    <div className="card p-3">
      <div
        style={{
          height: "680px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div>Loading calendar...</div>
      </div>
    </div>
  ),
});

type FeedEvent = DBEvent & { _dismissed?: boolean };
type Mode = "my" | "whats";
type QuickType = "none" | "reminder" | "todo";
type CalendarTheme =
  | "default"
  | "spring"
  | "summer"
  | "autumn"
  | "winter"
  | "nature"
  | "ocean";

type FilterMode = "all" | "unfinished" | "completed";

export default function CalendarPage() {
  // ===== ALL HOOKS DECLARED AT TOP (NO CONDITIONAL HOOKS) =====
  const [me, setMe] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>("my");
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>("month");
  const [calendarTheme, setCalendarTheme] =
    useState<CalendarTheme>("default");

  // Event data
  const [events, setEvents] = useState<DBEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Feed
  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);

  // Modals
  const [openCreate, setOpenCreate] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<DBEvent | null>(null);

  // Create form
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

  // Quick-create modal for reminders/todos
  const [quickModal, setQuickModal] = useState<{
    open: boolean;
    type: "reminder" | "todo" | null;
  }>({ open: false, type: null });

  const [quickForm, setQuickForm] = useState({
    title: "",
    description: "",
    start: "",
    end: "",
  });

  // External drag state (for tray & list items)
  const [dragType, setDragType] = useState<QuickType>("none");
  const [dragPayloadTitle, setDragPayloadTitle] = useState<string | null>(null);
  const [dragPayloadDesc, setDragPayloadDesc] = useState<string | null>(null);

  // Master lists UI state
  const [showReminders, setShowReminders] = useState(true);
  const [showTodos, setShowTodos] = useState(true);
  const [reminderFilter, setReminderFilter] = useState<FilterMode>("unfinished");
  const [todoFilter, setTodoFilter] = useState<FilterMode>("unfinished");

  // Moon data (always called; gate usage via props)
  const moonEvents = useMoon(date, view);

  // Theme persistence
  useEffect(() => {
    const saved = localStorage.getItem("calendar-theme") as CalendarTheme;
    if (saved) setCalendarTheme(saved);
  }, []);

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  // Load events once we know the user (me can be null for not-signed-in; keep it stable)
  useEffect(() => {
    if (me !== null) void loadCalendar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  // Realtime subscription (stable)
  useEffect(() => {
    const ch = supabase
      .channel("events-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => void loadCalendar()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load feed when entering What's Happening
  useEffect(() => {
    if (mode === "whats" && me) void loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, me]);

  const handleThemeChange = useCallback((newTheme: CalendarTheme) => {
    setCalendarTheme(newTheme);
    localStorage.setItem("calendar-theme", newTheme);
  }, []);

  const toLocalInput = useCallback(
    (d: Date) =>
      new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16),
    []
  );

  // ===== DATA LOADING =====
  async function loadCalendar() {
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("start_time", { ascending: true });

      if (error) throw error;

      const safe = (data || []).filter(
        (e: any) => e?.start_time && e?.end_time
      ) as DBEvent[];

      // RSVP flag for current user
      let rsvpIds = new Set<string>();
      if (me) {
        const { data: myAtt } = await supabase
          .from("event_attendees")
          .select("event_id")
          .eq("user_id", me);
        rsvpIds = new Set((myAtt || []).map((r: any) => r.event_id));
      }

      // Friends list (optional view)
      let friendIds: string[] = [];
      if (me) {
        const { data: fr } = await supabase
          .from("friends_view")
          .select("friend_id");
        friendIds = (fr || []).map((r: any) => r.friend_id);
      }

      const withFlags = safe.map((e) => ({
        ...e,
        rsvp_me: rsvpIds.has((e as any).id),
        by_friend:
          (e as any).visibility === "public" &&
          friendIds.includes((e as any).created_by) &&
          (e as any).created_by !== me,
      })) as DBEvent[];

      setEvents(withFlags);
    } catch (e: any) {
      console.error("Load calendar error:", e);
      setErr(e?.message || "Failed to load events");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadFeed() {
    if (!me) return;
    setFeedLoading(true);
    try {
      const { data: f } = await supabase
        .from("friends_view")
        .select("friend_id")
        .limit(500);
      const friendIds = (f || []).map((r: any) => r.friend_id);

      const now = new Date();
      const from = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 7
      );

      let query = supabase
        .from("events")
        .select("*")
        .gte("start_time", from.toISOString())
        .order("start_time", { ascending: true })
        .neq("created_by", me)
        .eq("visibility", "public");

      if (friendIds.length) {
        query = query.or(
          `created_by.in.(${friendIds.join(",")}),source.eq.business`
        );
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

  // ===== EVENT HANDLERS =====
  const handleSelectSlot = useCallback(
    (info: { start: Date; end: Date }) => {
      const quickActive = dragType !== "none";
      if (view === "month") {
        setView("day");
        setDate(info.start);
        return;
      }
      if (quickActive) {
        // From tray/list placement mode
        void createQuickFromPayload(
          info.start,
          info.end,
          dragType as "reminder" | "todo",
          dragPayloadTitle,
          dragPayloadDesc
        );
        setDragType("none");
        setDragPayloadTitle(null);
        setDragPayloadDesc(null);
        return;
      }
      setCreateForm((f) => ({
        ...f,
        title: "",
        start: toLocalInput(info.start),
        end: toLocalInput(info.end),
      }));
      setOpenCreate(true);
    },
    [view, toLocalInput, dragType, dragPayloadTitle, dragPayloadDesc]
  );

  const openDetails = useCallback(
    (e: any) => {
      const r = e?.resource as DBEvent | undefined;
      if (r) {
        setSelected(r);
        setDetailsOpen(true);
        return;
      }
      const id = e?.id;
      if (id) {
        const found = (events as any[]).find((it) => (it as any)?.id === id);
        if (found) {
          setSelected(found as DBEvent);
          setDetailsOpen(true);
          return;
        }
      }
      if (e?.title && e?.start && e?.end) {
        const faux: DBEvent = {
          id: id || "",
          title: e.title,
          description: null,
          start_time: new Date(e.start).toISOString(),
          end_time: new Date(e.end).toISOString(),
          visibility: "public",
          created_by: me || "",
          location: null,
          image_path: null,
          source: "personal",
          status: "scheduled",
          cancellation_reason: null,
          event_type: null,
          invite_code: null,
        } as any;
        setSelected(faux);
        setDetailsOpen(true);
      }
    },
    [events, me]
  );

  async function createQuick(
    start: Date,
    end: Date,
    kind: "reminder" | "todo",
    title?: string,
    description?: string | null
  ) {
    if (!me) return;
    try {
      const payload: any = {
        title: title || (kind === "reminder" ? "Reminder" : "To-do"),
        description: description ?? null,
        location: null,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        visibility: "private",
        created_by: me,
        event_type: kind,
        rsvp_public: false,
        community_id: null,
        image_path: null,
        source: "personal",
        status: "scheduled",
      };
      const { error } = await supabase.from("events").insert(payload);
      if (error) throw error;
      void loadCalendar();
    } catch (e) {
      console.error("Create quick error:", e);
    }
  }

  async function createQuickFromPayload(
    start: Date,
    end: Date,
    kind: "reminder" | "todo",
    title?: string | null,
    description?: string | null
  ) {
    await createQuick(start, end, kind, title || undefined, description || undefined);
  }

  const createEvent = async () => {
    if (!me) return alert("Please log in.");
    const f = createForm;
    if (!f.title || !f.start) return alert("Title and start time are required.");
    try {
      const payload: any = {
        title: f.title,
        description: f.description || null,
        location: f.location || null,
        start_time: new Date(f.start).toISOString(),
        end_time: f.end
          ? new Date(f.end).toISOString()
          : new Date(new Date(f.start).getTime() + 60 * 60 * 1000).toISOString(),
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
      void loadCalendar();
    } catch (e) {
      console.error("Create event error:", e);
      alert("Failed to create event");
    }
  };

  // Drag helpers
  const startDrag = (t: Exclude<QuickType, "none">, title?: string, desc?: string) => () => {
    setDragType(t);
    setDragPayloadTitle(title ?? null);
    setDragPayloadDesc(desc ?? null);
  };
  const endDrag = () => {
    setDragType("none");
    setDragPayloadTitle(null);
    setDragPayloadDesc(null);
  };

  const openQuickModal = (type: "reminder" | "todo") => {
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setQuickForm({
      title: type === "reminder" ? "Reminder" : "To-do",
      description: "",
      start: toLocalInput(start),
      end: toLocalInput(end),
    });
    setQuickModal({ open: true, type });
  };

  const createQuickEvent = async () => {
    if (!me || !quickModal.type) return;
    const f = quickForm;
    if (!f.title || !f.start) return alert("Title and start time are required.");
    try {
      const payload: any = {
        title: f.title,
        description: f.description || null,
        location: null,
        start_time: new Date(f.start).toISOString(),
        end_time: f.end
          ? new Date(f.end).toISOString()
          : new Date(new Date(f.start).getTime() + 60 * 60 * 1000).toISOString(),
        visibility: "private",
        created_by: me,
        event_type: quickModal.type,
        rsvp_public: false,
        community_id: null,
        image_path: null,
        source: "personal",
        status: "scheduled",
      };
      const { error } = await supabase.from("events").insert(payload);
      if (error) return alert(error.message);
      setQuickModal({ open: false, type: null });
      setQuickForm({ title: "", description: "", start: "", end: "" });
      void loadCalendar();
    } catch (e) {
      console.error("Create quick event error:", e);
      alert("Failed to create quick event");
    }
  };

  const canEdit = (evt: any) => {
    const r = evt?.resource as DBEvent | undefined;
    return !!(r && me && (r as any).created_by === me);
  };

  const onDrop = async ({
    event,
    start,
    end,
  }: {
    event: any;
    start: Date;
    end: Date;
  }) => {
    try {
      if (!canEdit(event)) return;
      const r = event.resource as DBEvent;
      const { error } = await supabase
        .from("events")
        .update({
          start_time: start.toISOString(),
          end_time: end.toISOString(),
        })
        .eq("id", (r as any).id);
      if (error) alert(error.message);
      else void loadCalendar();
    } catch (e) {
      console.error("Drop error:", e);
    }
  };

  const onResize = async ({
    event,
    start,
    end,
  }: {
    event: any;
    start: Date;
    end: Date;
  }) => {
    try {
      if (!canEdit(event)) return;
      const r = event.resource as DBEvent;
      const { error } = await supabase
        .from("events")
        .update({
          start_time: start.toISOString(),
          end_time: end.toISOString(),
        })
        .eq("id", (r as any).id);
      if (error) alert(error.message);
      else void loadCalendar();
    } catch (e) {
      console.error("Resize error:", e);
    }
  };

  // ===== Derived lists for the sidebar (master lists) =====
  const myReminders = useMemo(
    () =>
      (events || []).filter(
        (e: any) => e.created_by === me && e.event_type === "reminder"
      ),
    [events, me]
  );
  const myTodos = useMemo(
    () =>
      (events || []).filter(
        (e: any) => e.created_by === me && e.event_type === "todo"
      ),
    [events, me]
  );

  const filterList = (items: DBEvent[], mode: FilterMode) => {
    if (mode === "all") return items;
    if (mode === "completed") return items.filter((i: any) => i.status === "done");
    return items.filter((i: any) => i.status !== "done"); // unfinished
  };

  // Actions on list items
  const toggleDone = async (item: DBEvent, done: boolean) => {
    try {
      const { error } = await supabase
        .from("events")
        .update({ status: done ? "done" : "scheduled" })
        .eq("id", (item as any).id);
      if (error) throw error;
      void loadCalendar();
    } catch (e) {
      console.error("toggleDone error", e);
    }
  };

  const editItem = async (item: DBEvent) => {
    const newTitle = window.prompt("Edit title:", (item as any).title || "");
    if (!newTitle) return;
    try {
      const { error } = await supabase
        .from("events")
        .update({ title: newTitle })
        .eq("id", (item as any).id);
      if (error) throw error;
      void loadCalendar();
    } catch (e) {
      console.error("editItem error", e);
    }
  };

  const deleteItem = async (item: DBEvent) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", (item as any).id);
      if (error) throw error;
      void loadCalendar();
    } catch (e) {
      console.error("deleteItem error", e);
    }
  };

  // ===== RENDER =====
  const layoutClass = useMemo(
    () => (mode === "my" ? "grid-cols-calendar" : ""),
    [mode]
  );

  return (
    <div className="page calendar-sand">
      <div className={`container-app ${layoutClass}`}>
        {/* Sidebar (My Calendar only) */}
        {mode === "my" && (
          <aside className="task-tray">
            <div className="card p-3">
              <div className="section-title">Quick add</div>
              <div className="stack">
                {/* Chips: placement mode */}
                <div
                  className="tray-chip"
                  draggable
                  onDragStart={startDrag("reminder", "Reminder", "")}
                  onDragEnd={endDrag}
                  onClick={() =>
                    setDragType((q) => (q === "reminder" ? "none" : "reminder"))
                  }
                  title="Drag to calendar or tap then tap a time slot"
                  style={{
                    borderLeft: "6px solid #f59e0b",
                    background: "#fef3c7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  Reminder (private)
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openQuickModal("reminder");
                    }}
                    style={{
                      marginLeft: "8px",
                      fontSize: "10px",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      background: "#f59e0b",
                      color: "white",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    + Add
                  </button>
                </div>

                <div
                  className="tray-chip"
                  draggable
                  onDragStart={startDrag("todo", "To-do", "")}
                  onDragEnd={endDrag}
                  onClick={() =>
                    setDragType((q) => (q === "todo" ? "none" : "todo"))
                  }
                  title="Drag to calendar or tap then tap a time slot"
                  style={{
                    borderLeft: "6px solid #059669",
                    background: "#d1fae5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  To-do (private)
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openQuickModal("todo");
                    }}
                    style={{
                      marginLeft: "8px",
                      fontSize: "10px",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      background: "#059669",
                      color: "white",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    + Add
                  </button>
                </div>

                {/* Placement mode hint */}
                {dragType !== "none" && (
                  <div className="note">
                    <div className="note-title">Placement mode</div>
                    <div className="codeblock">
                      Tap a Day/Week slot to place a {dragType}.
                    </div>
                    <button
                      onClick={endDrag}
                      style={{
                        marginTop: "8px",
                        fontSize: "11px",
                        color: "#6b7280",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Cancel placement mode
                    </button>
                  </div>
                )}

                {/* Reminders list */}
                <div className="divider" />
                <button
                  className="seg-btn"
                  aria-expanded={showReminders}
                  onClick={() => setShowReminders((v) => !v)}
                >
                  Reminders list {showReminders ? "▾" : "▸"}
                </button>
                {showReminders && (
                  <div className="space-y-2">
                    <div className="text-xs text-neutral-600">
                      Filter:{" "}
                      <select
                        value={reminderFilter}
                        onChange={(e) =>
                          setReminderFilter(e.target.value as FilterMode)
                        }
                        className="border rounded px-2 py-1 text-xs"
                      >
                        <option value="unfinished">Unfinished</option>
                        <option value="completed">Completed</option>
                        <option value="all">All</option>
                      </select>
                    </div>
                    <ul className="space-y-1">
                      {filterList(myReminders, reminderFilter).map((it) => (
                        <li
                          key={(it as any).id}
                          draggable
                          onDragStart={startDrag(
                            "reminder",
                            (it as any).title,
                            (it as any).description || null
                          )}
                          onDragEnd={endDrag}
                          className="flex items-center justify-between rounded border border-neutral-200 bg-white px-2 py-1"
                        >
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={(it as any).status === "done"}
                              onChange={(e) => toggleDone(it, e.target.checked)}
                            />
                            <span className="text-sm">
                              {(it as any).title || "Reminder"}
                            </span>
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              className="text-xs underline"
                              onClick={() => editItem(it)}
                            >
                              Edit
                            </button>
                            <button
                              className="text-xs text-rose-600 underline"
                              onClick={() => deleteItem(it)}
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                      {filterList(myReminders, reminderFilter).length === 0 && (
                        <li className="text-xs text-neutral-500">
                          No reminders in this view.
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* To-dos list */}
                <div className="divider" />
                <button
                  className="seg-btn"
                  aria-expanded={showTodos}
                  onClick={() => setShowTodos((v) => !v)}
                >
                  To-dos list {showTodos ? "▾" : "▸"}
                </button>
                {showTodos && (
                  <div className="space-y-2">
                    <div className="text-xs text-neutral-600">
                      Filter:{" "}
                      <select
                        value={todoFilter}
                        onChange={(e) =>
                          setTodoFilter(e.target.value as FilterMode)
                        }
                        className="border rounded px-2 py-1 text-xs"
                      >
                        <option value="unfinished">Unfinished</option>
                        <option value="completed">Completed</option>
                        <option value="all">All</option>
                      </select>
                    </div>
                    <ul className="space-y-1">
                      {filterList(myTodos, todoFilter).map((it) => (
                        <li
                          key={(it as any).id}
                          draggable
                          onDragStart={startDrag(
                            "todo",
                            (it as any).title,
                            (it as any).description || null
                          )}
                          onDragEnd={endDrag}
                          className="flex items-center justify-between rounded border border-neutral-200 bg-white px-2 py-1"
                        >
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={(it as any).status === "done"}
                              onChange={(e) => toggleDone(it, e.target.checked)}
                            />
                            <span className="text-sm">
                              {(it as any).title || "To-do"}
                            </span>
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              className="text-xs underline"
                              onClick={() => editItem(it)}
                            >
                              Edit
                            </button>
                            <button
                              className="text-xs text-rose-600 underline"
                              onClick={() => deleteItem(it)}
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                      {filterList(myTodos, todoFilter).length === 0 && (
                        <li className="text-xs text-neutral-500">
                          No to-dos in this view.
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}

        {/* Main column */}
        <div>
          <div className="header-bar">
            <h1 className="page-title">Calendar</h1>
            <div className="flex items-center gap-2">
              <CalendarThemeSelector
                currentTheme={calendarTheme}
                onThemeChange={handleThemeChange}
              />
              <div className="segmented" role="tablist" aria-label="Calendar mode">
                <button
                  role="tab"
                  aria-selected={mode === "whats"}
                  className={`seg-btn ${mode === "whats" ? "active" : ""}`}
                  onClick={() => setMode("whats")}
                >
                  What's Happening
                </button>
                <button
                  role="tab"
                  aria-selected={mode === "my"}
                  className={`seg-btn ${mode === "my" ? "active" : ""}`}
                  onClick={() => setMode("my")}
                >
                  My Calendar
                </button>
              </div>
              <button className="btn btn-brand" onClick={() => setOpenCreate(true)}>
                + Create event
              </button>
              <button className="btn" onClick={loadCalendar}>
                Refresh
              </button>
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
                  {feed
                    .filter((e) => !e._dismissed)
                    .map((e) => (
                      <li
                        key={e.id}
                        className="border border-neutral-200 rounded-lg p-3 flex items-center justify-between gap-3"
                        onTouchStart={(ev) => {
                          (ev.currentTarget as any)._sx = ev.changedTouches[0].clientX;
                        }}
                        onTouchEnd={async (ev) => {
                          const sx = (ev.currentTarget as any)._sx ?? 0;
                          const dx = ev.changedTouches[0].clientX - sx;
                          if (dx > 60) {
                            if (me)
                              await supabase
                                .from("event_interests")
                                .upsert({ event_id: e.id, user_id: me });
                            setFeed((prev) =>
                              prev.map((x) =>
                                x.id === e.id ? { ...x, _dismissed: true } : x
                              )
                            );
                            void loadCalendar();
                          } else if (dx < -60) {
                            setFeed((prev) =>
                              prev.map((x) =>
                                x.id === e.id ? { ...x, _dismissed: true } : x
                              )
                            );
                          }
                        }}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {e.title || "Untitled event"}
                          </div>
                          <div className="text-xs text-neutral-600">
                            {new Date(e.start_time!).toLocaleString()} —{" "}
                            {e.location || "TBD"}
                            {e.source ? ` · ${e.source}` : ""}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="btn"
                            onClick={() =>
                              setFeed((prev) =>
                                prev.map((x) =>
                                  x.id === e.id ? { ...x, _dismissed: true } : x
                                )
                              )
                            }
                          >
                            Dismiss
                          </button>
                          <button
                            className="btn btn-brand"
                            onClick={async () => {
                              if (!me) return;
                              await supabase
                                .from("event_interests")
                                .upsert({ event_id: e.id, user_id: me });
                              setFeed((prev) =>
                                prev.map((x) =>
                                  x.id === e.id ? { ...x, _dismissed: true } : x
                                )
                              );
                              void loadCalendar();
                            }}
                          >
                            Add to Calendar
                          </button>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          ) : (
            <CalendarGrid
              dbEvents={events as any}
              moonEvents={moonEvents}
              showMoon={false} // hook is always called; display gated here
              theme={calendarTheme}
              showWeather={false}
              temperatureUnit="celsius"
              date={date}
              setDate={setDate}
              view={view}
              setView={setView}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={openDetails}
              onDrop={onDrop}
              onResize={onResize}
              externalDragType={dragType}
              externalDragTitle={dragPayloadTitle || undefined}
              onExternalDrop={async ({ start, end }, kind) => {
                await createQuickFromPayload(
                  start,
                  end,
                  kind,
                  dragPayloadTitle,
                  dragPayloadDesc
                );
                endDrag();
              }}
            />
          )}
        </div>
      </div>

      {/* Create Event modal */}
      <CreateEventModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        sessionUser={me}
        value={createForm}
        onChange={(v) => setCreateForm((prev) => ({ ...prev, ...v }))}
        onSave={createEvent}
      />

      {/* Quick Create Modal */}
      {quickModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">
                Create {quickModal.type === "reminder" ? "Reminder" : "To-do"}
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={quickForm.title}
                  onChange={(e) =>
                    setQuickForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder={`What do you need to ${
                    quickModal.type === "reminder" ? "remember" : "do"
                  }?`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={quickForm.description}
                  onChange={(e) =>
                    setQuickForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start
                  </label>
                  <input
                    type="datetime-local"
                    value={quickForm.start}
                    onChange={(e) =>
                      setQuickForm((f) => ({ ...f, start: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={quickForm.end}
                    onChange={(e) =>
                      setQuickForm((f) => ({ ...f, end: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setQuickModal({ open: false, type: null })}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={createQuickEvent}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
              >
                Create {quickModal.type === "reminder" ? "Reminder" : "To-do"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details modal */}
      <EventDetails
        event={detailsOpen ? selected : null}
        onClose={() => setDetailsOpen(false)}
      />
    </div>
  );
}
