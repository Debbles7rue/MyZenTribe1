// app/(protected)/calendar/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { View } from "react-big-calendar";
import { supabase } from "@/lib/supabaseClient";
import CreateEventModal from "@/components/CreateEventModal";
import CalendarThemeSelector from "@/components/CalendarThemeSelector";
import EventDetails from "@/components/EventDetails";
import { useToast } from "@/components/ToastProvider";
import { useMoon } from "@/lib/useMoon";
import type { DBEvent, Visibility } from "@/lib/types";

// Client-only calendar grid - completely prevent SSR
const CalendarGrid = dynamic(() => import("@/components/CalendarGrid"), { 
  ssr: false,
  loading: () => (
    <div className="card p-3">
      <div style={{ height: "680px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-8 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
});

type FeedEvent = DBEvent & { _dismissed?: boolean };
type Mode = "my" | "whats";
type QuickType = "none" | "reminder" | "todo";
type CalendarTheme = "default" | "spring" | "summer" | "autumn" | "winter" | "nature" | "ocean";

export default function CalendarPage() {
  // ===== TOAST SYSTEM =====
  const { showToast } = useToast();

  // ===== ALL HOOKS DECLARED AT TOP - NEVER CONDITIONAL =====
  const [me, setMe] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("my");
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>("month");
  const [calendarTheme, setCalendarTheme] = useState<CalendarTheme>("default");

  // Event data
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Feed (What's Happening)
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

  // Quick create (chip) mode
  const [quickType, setQuickType] = useState<QuickType>("none");
  const [dragType, setDragType] = useState<QuickType>("none");

  // NEW: dragging a specific list item (reminder/todo) to copy onto calendar
  const [dragItem, setDragItem] = useState<{ id: string; type: "reminder" | "todo"; title: string } | null>(null);

  // "Quick Create" modal (button on chips)
  const [quickModal, setQuickModal] = useState<{ open: boolean; type: "reminder" | "todo" | null }>({
    open: false,
    type: null
  });
  const [quickForm, setQuickForm] = useState({
    title: "",
    description: "",
    start: "",
    end: "",
  });

  // NEW: lists UI state
  const [showRemindersList, setShowRemindersList] = useState(false);
  const [showTodosList, setShowTodosList] = useState(false);
  const [showCompletedReminders, setShowCompletedReminders] = useState(false);
  const [showUnfinishedReminders, setShowUnfinishedReminders] = useState(true);
  const [showCompletedTodos, setShowCompletedTodos] = useState(false);
  const [showUnfinishedTodos, setShowUnfinishedTodos] = useState(true);

  // Moon data (always call hook, but we toggle display)
  const moonEvents = useMoon(date, view);

  useEffect(() => {
    const savedTheme = localStorage.getItem("calendar-theme") as CalendarTheme;
    if (savedTheme) setCalendarTheme(savedTheme);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (me !== null) loadCalendar(); // load after we know user or know there is none
  }, [me]);

  useEffect(() => {
    const ch = supabase
      .channel("events-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, loadCalendar)
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, []);

  useEffect(() => {
    if (mode === "whats" && me) loadFeed();
  }, [mode, me]);

  // ===== STABLE CALLBACKS =====
  const handleThemeChange = useCallback((newTheme: CalendarTheme) => {
    setCalendarTheme(newTheme);
    localStorage.setItem("calendar-theme", newTheme);
    showToast({
      type: 'success',
      title: 'Theme Updated',
      message: `Switched to ${newTheme} theme`,
    });
  }, [showToast]);

  const toLocalInput = useCallback(
    (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    []
  );

  // ===== DATA LOADING =====
  async function loadCalendar() {
    setLoading(true);
    setErr(null);

    try {
      // --- UNIQUE "MY CALENDAR" ---
      // 1) events I created
      let owned: any[] = [];
      if (me) {
        const rOwned = await supabase.from("events").select("*").eq("created_by", me).order("start_time", { ascending: true });
        owned = (rOwned.data || []).filter((e: any) => e?.start_time && e?.end_time);
      }

      // 2) public events I added via "Add to Calendar" (event_interests)
      let interested: any[] = [];
      if (me) {
        const rInt = await supabase.from("event_interests").select("event_id").eq("user_id", me);
        const ids = (rInt.data || []).map((x: any) => x.event_id);
        if (ids.length) {
          const chunk = (arr: string[], size: number) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
          for (const part of chunk(ids, 100)) {
            const r = await supabase.from("events").select("*").in("id", part).order("start_time", { ascending: true });
            interested.push(...((r.data || []).filter((e: any) => e?.start_time && e?.end_time)));
          }
        }
      }

      // union (no duplicates)
      const seen = new Set<string>();
      const mine = [...owned, ...interested.filter((e: any) => !seen.has((seen.add(e.id), e.id)))];

      // Mark RSVPs and friends for styling (optional)
      let rsvpIds = new Set<string>();
      if (me) {
        const { data: myAtt } = await supabase.from("event_attendees").select("event_id").eq("user_id", me);
        rsvpIds = new Set((myAtt || []).map((r: any) => r.event_id));
      }
      let friendIds: string[] = [];
      if (me) {
        const { data: fr } = await supabase.from("friends_view").select("friend_id");
        friendIds = (fr || []).map((r: any) => r.friend_id);
      }

      const withFlags = mine.map((e) => ({
        ...e,
        rsvp_me: rsvpIds.has(e.id),
        by_friend: e.visibility === "public" && friendIds.includes(e.created_by) && e.created_by !== me,
      }));

      setEvents(withFlags);
      
      if (withFlags.length > 0) {
        showToast({
          type: 'success',
          title: 'Calendar Updated',
          message: `Loaded ${withFlags.length} events`,
        });
      }
    } catch (error) {
      console.error("Load calendar error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setErr("Failed to load calendar");
      showToast({
        type: 'error',
        title: 'Calendar Load Failed',
        message: errorMessage,
        action: {
          label: 'Retry',
          onClick: () => loadCalendar()
        }
      });
    } finally {
      setLoading(false);
    }
  }

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
        // friends' public events OR business
        query = query.or(`created_by.in.(${friendIds.join(",")}),source.eq.business`);
      } else {
        query = query.eq("source", "business");
      }

      const { data } = await query;
      setFeed((data || []) as FeedEvent[]);
    } catch (error) {
      console.error("Load feed error:", error);
      setFeed([]);
      showToast({
        type: 'error',
        title: 'Feed Load Failed',
        message: 'Could not load What\'s Happening feed',
        action: {
          label: 'Retry',
          onClick: () => loadFeed()
        }
      });
    } finally {
      setFeedLoading(false);
    }
  }

  // ===== EVENT HELPERS =====
  const canEdit = (evt: any) => {
    const r = evt?.resource as DBEvent | undefined;
    return !!(r && me && r.created_by === me);
  };

  // create a quick private item (reminder/todo) — can optionally override title
  async function createQuick(start: Date, end: Date, kind: Exclude<QuickType, "none">, opts?: { title?: string; description?: string }) {
    if (!me) {
      showToast({
        type: 'warning',
        title: 'Authentication Required',
        message: 'Please sign in to create items',
      });
      return;
    }

    try {
      const payload: any = {
        title: opts?.title ?? (kind === "reminder" ? "Reminder" : "To-do"),
        description: opts?.description ?? null,
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
      if (error) {
        console.error("Create quick error:", error);
        showToast({
          type: 'error',
          title: 'Creation Failed',
          message: error.message,
        });
        return;
      }
      
      showToast({
        type: 'success',
        title: `${kind === "reminder" ? "Reminder" : "To-do"} Created`,
        message: `${opts?.title || (kind === "reminder" ? "Reminder" : "To-do")} added to calendar`,
      });
      
      await loadCalendar();
    } catch (error) {
      console.error("Create quick error:", error);
      showToast({
        type: 'error',
        title: 'Creation Failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }

  const createEvent = async () => {
    if (!me) {
      showToast({
        type: 'warning',
        title: 'Authentication Required',
        message: 'Please sign in to create events',
      });
      return;
    }
    
    const f = createForm;
    if (!f.title || !f.start) {
      showToast({
        type: 'warning',
        title: 'Missing Information',
        message: 'Event title and start time are required',
      });
      return;
    }

    try {
      const payload: any = {
        title: f.title,
        description: f.description || null,
        location: f.location || null,
        start_time: new Date(f.start).toISOString(),
        end_time: f.end ? new Date(f.end).toISOString() : new Date(new Date(f.start).getTime() + 60 * 60 * 1000).toISOString(),
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
      if (error) {
        showToast({
          type: 'error',
          title: 'Event Creation Failed',
          message: error.message,
        });
        return;
      }

      setOpenCreate(false);
      setCreateForm({
        title: "", description: "", location: "", start: "", end: "",
        visibility: "public", event_type: "", community_id: "", source: "personal", image_path: "",
      });
      
      showToast({
        type: 'success',
        title: 'Event Created',
        message: `"${f.title}" has been added to your calendar`,
      });
      
      await loadCalendar();
    } catch (error) {
      console.error("Create event error:", error);
      showToast({
        type: 'error',
        title: 'Event Creation Failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const createQuickEvent = async () => {
    if (!me || !quickModal.type) return;
    const f = quickForm;
    if (!f.title || !f.start) {
      showToast({
        type: 'warning',
        title: 'Missing Information',
        message: 'Title and start time are required',
      });
      return;
    }

    try {
      await createQuick(
        new Date(f.start),
        f.end ? new Date(f.end) : new Date(new Date(f.start).getTime() + 60 * 60 * 1000),
        quickModal.type,
        { title: f.title, description: f.description || undefined }
      );
      setQuickModal({ open: false, type: null });
      setQuickForm({ title: "", description: "", start: "", end: "" });
    } catch (error) {
      console.error("Create quick event error:", error);
      showToast({
        type: 'error',
        title: 'Creation Failed',
        message: error instanceof Error ? error.message : 'Failed to create item',
      });
    }
  };

  const onDrop = async ({ event, start, end }: any) => {
    try {
      if (!canEdit(event)) {
        showToast({
          type: 'warning',
          title: 'Cannot Edit Event',
          message: 'You can only edit events you created',
        });
        return;
      }
      const r = event.resource as DBEvent;
      const { error } = await supabase
        .from("events")
        .update({ start_time: start.toISOString(), end_time: end.toISOString() })
        .eq("id", r.id);
      if (error) {
        console.error("Drop error:", error);
        showToast({
          type: 'error',
          title: 'Update Failed',
          message: error.message,
        });
      } else {
        showToast({
          type: 'success',
          title: 'Event Moved',
          message: `"${r.title}" updated successfully`,
        });
        await loadCalendar();
      }
    } catch (error) {
      console.error("Drop error:", error);
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: error instanceof Error ? error.message : 'Failed to move event',
      });
    }
  };

  const onResize = async ({ event, start, end }: any) => {
    try {
      if (!canEdit(event)) {
        showToast({
          type: 'warning',
          title: 'Cannot Edit Event',
          message: 'You can only edit events you created',
        });
        return;
      }
      const r = event.resource as DBEvent;
      const { error } = await supabase
        .from("events")
        .update({ start_time: start.toISOString(), end_time: end.toISOString() })
        .eq("id", r.id);
      if (error) {
        console.error("Resize error:", error);
        showToast({
          type: 'error',
          title: 'Update Failed',
          message: error.message,
        });
      } else {
        showToast({
          type: 'success',
          title: 'Event Resized',
          message: `"${r.title}" updated successfully`,
        });
        await loadCalendar();
      }
    } catch (error) {
      console.error("Resize error:", error);
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: error instanceof Error ? error.message : 'Failed to resize event',
      });
    }
  };

  // Drag helpers for the chips
  const startDrag = (t: Exclude<QuickType, "none">) => () => setDragType(t);
  const endDrag = () => setDragType("none");

  // NEW: start/stop dragging a specific list item (to copy)
  const startItemDrag = (item: { id: string; type: "reminder" | "todo"; title: string }) => () => {
    setDragItem(item);
    setDragType(item.type);
  };
  const endItemDrag = () => {
    setDragItem(null);
    setDragType("none");
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

  const layoutClass = useMemo(() => (mode === "my" ? "grid-cols-calendar" : ""), [mode]);
  const quickActive = quickType !== "none";

  // Derived lists for the sidebar (from my events)
  const myReminders = useMemo(
    () => (events as any[]).filter((e) => e?.created_by === me && e?.event_type === "reminder"),
    [events, me]
  );
  const myTodos = useMemo(
    () => (events as any[]).filter((e) => e?.created_by === me && e?.event_type === "todo"),
    [events, me]
  );

  // Complete/Undo toggle
  const toggleComplete = async (id: string, done: boolean) => {
    try {
      await supabase.from("events").update({ status: done ? "done" : "scheduled" }).eq("id", id);
      showToast({
        type: 'success',
        title: done ? 'Item Completed' : 'Item Reopened',
        message: done ? 'Great job!' : 'Item marked as unfinished',
      });
      await loadCalendar();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: error instanceof Error ? error.message : 'Failed to update item',
      });
    }
  };

  // Edit title
  const editItem = async (it: any) => {
    const t = window.prompt("Edit title", it?.title || "");
    if (t == null) return;
    try {
      await supabase.from("events").update({ title: t || "Untitled" }).eq("id", it.id);
      showToast({
        type: 'success',
        title: 'Item Updated',
        message: 'Title changed successfully',
      });
      await loadCalendar();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: error instanceof Error ? error.message : 'Failed to update title',
      });
    }
  };

  // Delete
  const deleteItem = async (it: any) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await supabase.from("events").delete().eq("id", it.id);
      showToast({
        type: 'success',
        title: 'Item Deleted',
        message: `"${it.title}" has been removed`,
      });
      await loadCalendar();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: error instanceof Error ? error.message : 'Failed to delete item',
      });
    }
  };

  return (
    <div className="page calendar-sand">
      <div className={`container-app ${layoutClass}`}>
        {/* Sidebar tray (only in My Calendar mode) */}
        {mode === "my" && (
          <aside className="task-tray">
            <div className="card p-3">
              <div className="section-title">Quick add</div>
              <div className="stack">
                {/* Chips (placement mode or open modal) */}
                <div
                  className="tray-chip"
                  draggable
                  onDragStart={startDrag("reminder")}
                  onDragEnd={endDrag}
                  onClick={() => setQuickType((q) => (q === "reminder" ? "none" : "reminder"))}
                  title="Drag onto the calendar (desktop) or tap then tap a time slot (mobile)"
                  style={{ borderLeft: "6px solid #f59e0b", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "space-between" }}
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
                      cursor: "pointer"
                    }}
                    title="Create custom reminder"
                  >
                    + Add
                  </button>
                </div>

                <div
                  className="tray-chip"
                  draggable
                  onDragStart={startDrag("todo")}
                  onDragEnd={endDrag}
                  onClick={() => setQuickType((q) => (q === "todo" ? "none" : "todo"))}
                  title="Drag onto the calendar (desktop) or tap then tap a time slot (mobile)"
                  style={{ borderLeft: "6px solid #059669", background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "space-between" }}
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
                      cursor: "pointer"
                    }}
                    title="Create custom to-do"
                  >
                    + Add
                  </button>
                </div>

                {quickActive && (
                  <div className="note">
                    <div className="note-title">Placement mode</div>
                    <div className="codeblock">
                      Tap a slot in Day/Week to place a {quickType}.
                    </div>
                    <button
                      onClick={() => setQuickType("none")}
                      style={{ marginTop: "8px", fontSize: "11px", color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}
                    >
                      Cancel placement mode
                    </button>
                  </div>
                )}

                {/* NEW: Reminders list */}
                <div className="mt-3">
                  <button
                    className="btn"
                    onClick={() => setShowRemindersList((v) => !v)}
                    aria-expanded={showRemindersList}
                  >
                    {showRemindersList ? "▾" : "▸"} Reminders
                  </button>

                  {showRemindersList && (
                    <div className="mt-2 space-y-2">
                      <div className="text-xs text-neutral-600 flex gap-3 items-center">
                        <label>
                          <input
                            type="checkbox"
                            checked={showUnfinishedReminders}
                            onChange={(e) => setShowUnfinishedReminders(e.target.checked)}
                          />{" "}
                          Show unfinished
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={showCompletedReminders}
                            onChange={(e) => setShowCompletedReminders(e.target.checked)}
                          />{" "}
                          Show completed
                        </label>
                      </div>

                      {(myReminders || [])
                        .filter((it) => {
                          const done = (it.status || "").toLowerCase() === "done";
                          return (done && showCompletedReminders) || (!done && showUnfinishedReminders);
                        })
                        .map((it) => {
                          const done = (it.status || "").toLowerCase() === "done";
                          return (
                            <div
                              key={it.id}
                              className="p-2 rounded-lg border bg-white flex items-center justify-between gap-2"
                              draggable
                              onDragStart={startItemDrag({ id: it.id, type: "reminder", title: it.title || "Reminder" })}
                              onDragEnd={endItemDrag}
                              title="Drag onto the calendar to make a copy"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={done}
                                  onChange={(e) => toggleComplete(it.id, e.target.checked)}
                                  title={done ? "Mark as unfinished" : "Mark as done"}
                                />
                                <div className={`text-sm truncate ${done ? "line-through text-neutral-400" : ""}`}>
                                  {it.title || "Reminder"}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button className="btn" onClick={() => editItem(it)}>Edit</button>
                                <button className="btn" onClick={() => deleteItem(it)}>Delete</button>
                              </div>
                            </div>
                          );
                        })}
                      {myReminders.length === 0 && <div className="muted">No reminders yet.</div>}
                    </div>
                  )}
                </div>

                {/* NEW: To-dos list */}
                <div className="mt-3">
                  <button
                    className="btn"
                    onClick={() => setShowTodosList((v) => !v)}
                    aria-expanded={showTodosList}
                  >
                    {showTodosList ? "▾" : "▸"} To-dos
                  </button>

                  {showTodosList && (
                    <div className="mt-2 space-y-2">
                      <div className="text-xs text-neutral-600 flex gap-3 items-center">
                        <label>
                          <input
                            type="checkbox"
                            checked={showUnfinishedTodos}
                            onChange={(e) => setShowUnfinishedTodos(e.target.checked)}
                          />{" "}
                          Show unfinished
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={showCompletedTodos}
                            onChange={(e) => setShowCompletedTodos(e.target.checked)}
                          />{" "}
                          Show completed
                        </label>
                      </div>

                      {(myTodos || [])
                        .filter((it) => {
                          const done = (it.status || "").toLowerCase() === "done";
                          return (done && showCompletedTodos) || (!done && showUnfinishedTodos);
                        })
                        .map((it) => {
                          const done = (it.status || "").toLowerCase() === "done";
                          return (
                            <div
                              key={it.id}
                              className="p-2 rounded-lg border bg-white flex items-center justify-between gap-2"
                              draggable
                              onDragStart={startItemDrag({ id: it.id, type: "todo", title: it.title || "To-do" })}
                              onDragEnd={endItemDrag}
                              title="Drag onto the calendar to make a copy"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={done}
                                  onChange={(e) => toggleComplete(it.id, e.target.checked)}
                                  title={done ? "Mark as unfinished" : "Mark as done"}
                                />
                                <div className={`text-sm truncate ${done ? "line-through text-neutral-400" : ""}`}>
                                  {it.title || "To-do"}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button className="btn" onClick={() => editItem(it)}>Edit</button>
                                <button className="btn" onClick={() => deleteItem(it)}>Delete</button>
                              </div>
                            </div>
                          );
                        })}
                      {myTodos.length === 0 && <div className="muted">No to-dos yet.</div>}
                    </div>
                  )}
                </div>
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
                <button role="tab" aria-selected={mode === "whats"} className={`seg-btn ${mode === "whats" ? "active" : ""}`} onClick={() => setMode("whats")}>
                  What&apos;s Happening
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
                          if (me) {
                            await supabase.from("event_interests").upsert({ event_id: e.id, user_id: me });
                            showToast({
                              type: 'success',
                              title: 'Event Added',
                              message: `"${e.title}" added to your calendar`,
                            });
                          }
                          setFeed((prev) => prev.map(x => x.id === e.id ? { ...x, _dismissed: true } : x));
                          loadCalendar();
                        } else if (dx < -60) {
                          setFeed((prev) => prev.map(x => x.id === e.id ? { ...x, _dismissed: true } : x));
                        }
                      }}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{e.title || "Untitled event"}</div>
                        <div className="text-xs text-neutral-600">
                          {new Date(e.start_time!).toLocaleString()} — {e.location || "TBD"}
                          {e.source ? ` · ${e.source}` : ""}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn" onClick={() => setFeed((prev) => prev.map(x => x.id === e.id ? { ...x, _dismissed: true } : x))}>Dismiss</button>
                        <button className="btn btn-brand" onClick={async () => {
                          if (!me) return;
                          await supabase.from("event_interests").upsert({ event_id: e.id, user_id: me });
                          showToast({
                            type: 'success',
                            title: 'Event Added',
                            message: `"${e.title}" added to your calendar`,
                          });
                          setFeed((prev) => prev.map(x => x.id === e.id ? { ...x, _dismissed: true } : x));
                          loadCalendar();
                        }}>
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
              showMoon={false}
              theme={calendarTheme}
              showWeather={false}
              temperatureUnit="celsius"
              date={date}
              setDate={setDate}
              view={view}
              setView={setView}
              onSelectSlot={useCallback((info: { start: Date; end: Date }) => {
                try {
                  const quickActiveNow = quickType !== "none";
                  if (view === "month") {
                    setView("day");
                    setDate(info.start);
                    return;
                  }
                  if (quickActiveNow) {
                    void createQuick(info.start, info.end, quickType);
                    setQuickType("none");
                    return;
                  }
                  setCreateForm((f) => ({ ...f, title: "", start: toLocalInput(info.start), end: toLocalInput(info.end) }));
                  setOpenCreate(true);
                } catch (error) {
                  console.error("Select slot error:", error);
                }
              }, [view, quickType, toLocalInput])}
              onSelectEvent={useCallback((e: any) => {
                try {
                  const r = e?.resource as DBEvent | undefined;
                  if (r) {
                    setSelected(r);
                    setDetailsOpen(true);
                    return;
                  }
                  const id = e?.id;
                  if (id) {
                    const found = events.find((it: any) => it?.id === id);
                    if (found) {
                      setSelected(found);
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
                    };
                    setSelected(faux);
                    setDetailsOpen(true);
                  }
                } catch (error) {
                  console.error("Open details error:", error);
                }
              }, [events, me])}
              onDrop={onDrop}
              onResize={onResize}
              externalDragType={dragType}
              onExternalDrop={async ({ start, end }, kind) => {
                // If dragging a specific list item, copy its title; otherwise use generic
                const title = dragItem?.title;
                await createQuick(start, end, kind, title ? { title } : undefined);
                setDragItem(null);
                setDragType("none");
              }}
            />
          )}
        </div>
      </div>

      {/* Create Event Modal */}
      <CreateEventModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        sessionUser={me}
        value={createForm}
        onChange={(v) => setCreateForm((prev) => ({ ...prev, ...v }))}
        onSave={createEvent}
      />

      {/* Quick Create Modal for Reminders/Todos */}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={quickForm.title}
                  onChange={(e) => setQuickForm(f => ({ ...f, title: e.target.value }))}
                  placeholder={`What do you need to ${quickModal.type === "reminder" ? "remember" : "do"}?`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  value={quickForm.description}
                  onChange={(e) => setQuickForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Add any additional details..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start</label>
                  <input
                    type="datetime-local"
                    value={quickForm.start}
                    onChange={(e) => setQuickForm(f => ({ ...f, start: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End (Optional)</label>
                  <input
                    type="datetime-local"
                    value={quickForm.end}
                    onChange={(e) => setQuickForm(f => ({ ...f, end: e.target.value }))}
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

      <EventDetails event={detailsOpen ? selected : null} onClose={() => setDetailsOpen(false)} />
    </div>
  );
}
