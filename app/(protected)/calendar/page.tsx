// app/(protected)/calendar/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { View } from "react-big-calendar";
import { supabase } from "@/lib/supabaseClient";
import ModernCreateEventModal from "@/components/ModernCreateEventModal";
import CalendarThemeSelector from "@/components/CalendarThemeSelector";
import EventDetails from "@/components/EventDetails";
import type { DBEvent, Visibility } from "@/lib/types";

// Client-only calendar grid (react-big-calendar + DnD backends)
const CalendarGrid = dynamic(() => import("@/components/CalendarGrid"), { 
  ssr: false,
  loading: () => (
    <div className="card p-3">
      <div style={{ height: "680px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div>Loading calendar...</div>
      </div>
    </div>
  )
});

type FeedEvent = DBEvent & { _dismissed?: boolean };
type Mode = "my" | "whats";
type QuickType = "none" | "reminder" | "todo";
type CalendarTheme = "default" | "spring" | "summer" | "autumn" | "winter" | "nature" | "ocean";

export default function CalendarPage() {
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const [mode, setMode] = useState<Mode>("my");
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>("month");
  const [calendarTheme, setCalendarTheme] = useState<CalendarTheme>("default");

  // Load saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('calendar-theme') as CalendarTheme;
    if (savedTheme) {
      setCalendarTheme(savedTheme);
    }
  }, []);

  // Save theme when it changes
  const handleThemeChange = (newTheme: CalendarTheme) => {
    setCalendarTheme(newTheme);
    localStorage.setItem('calendar-theme', newTheme);
  };

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);

  // Quick create modal for reminders/todos
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

  // ---------- My Calendar ----------
  async function loadCalendar() {
    setLoading(true);
    setErr(null);

    try {
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

      // RSVP flag for me
      let rsvpIds = new Set<string>();
      if (me) {
        const { data: myAtt } = await supabase
          .from("event_attendees")
          .select("event_id")
          .eq("user_id", me);
        rsvpIds = new Set((myAtt || []).map((r: any) => r.event_id));
      }

      // Friend IDs to mark "friends' public events"
      let friendIds: string[] = [];
      if (me) {
        const { data: fr } = await supabase.from("friends_view").select("friend_id");
        friendIds = (fr || []).map((r: any) => r.friend_id);
      }

      const withFlags = safe.map((e) => ({
        ...e,
        rsvp_me: rsvpIds.has(e.id),
        by_friend: e.visibility === "public" && friendIds.includes(e.created_by) && e.created_by !== me,
      }));

      setEvents(withFlags);
      setLoading(false);
    } catch (error) {
      console.error('Load calendar error:', error);
      setErr("Failed to load calendar");
      setLoading(false);
    }
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

  // ---------- What's Happening ----------
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

  // ---------- Create modal ----------
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

  // Quick-place flow for Reminder/To-do (mobile tap-then-place)
  const [quickType, setQuickType] = useState<QuickType>("none");
  const quickActive = quickType !== "none";

  const handleSelectSlot = (info: { start: Date; end: Date }) => {
    try {
      if (view === "month") {
        setView("day");
        setDate(info.start);
        return;
      }
      if (quickActive) {
        // place a quick event immediately
        void createQuick(info.start, info.end, quickType);
        setQuickType("none");
        return;
      }
      setCreateForm((f) => ({ ...f, title: "", start: toLocalInput(info.start), end: toLocalInput(info.end) }));
      setOpenCreate(true);
    } catch (error) {
      console.error('Select slot error:', error);
    }
  };

  async function createQuick(start: Date, end: Date, kind: Exclude<QuickType, "none">) {
    if (!me) return;
    try {
      const payload: any = {
        title: kind === "reminder" ? "Reminder" : "To-do",
        description: null,
        location: null,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        visibility: "private",
        created_by: me,
        event_type: kind, // style cue
        rsvp_public: false,
        community_id: null,
        image_path: null,
        source: "personal",
        status: "scheduled",
      };
      const { error } = await supabase.from("events").insert(payload);
      if (!error) loadCalendar();
      else console.error('Create quick error:', error);
    } catch (error) {
      console.error('Create quick error:', error);
    }
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
        end_time: f.end ? new Date(f.end).toISOString() : new Date(new Date(f.start).getTime() + 60*60*1000).toISOString(),
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
    } catch (error) {
      console.error('Create event error:', error);
      alert("Failed to create event");
    }
  };

  // Quick create for reminders/todos with custom details
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
        end_time: f.end ? new Date(f.end).toISOString() : new Date(new Date(f.start).getTime() + 60*60*1000).toISOString(),
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
      loadCalendar();
    } catch (error) {
      console.error('Create quick event error:', error);
      alert("Failed to create quick event");
    }
  };

  // ---------- Details modal ----------
  const [selected, setSelected] = useState<DBEvent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const openDetails = (e: any) => {
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
      console.error('Open details error:', error);
    }
  };

  const canEdit = (evt: any) => {
    const r = evt?.resource as DBEvent | undefined;
    return !!(r && me && r.created_by === me);
  };

  const onDrop = async ({ event, start, end }: any) => {
    try {
      if (!canEdit(event)) return;
      const r = event.resource as DBEvent;
      const { error } = await supabase
        .from("events")
        .update({ 
          start_time: start.toISOString(), 
          end_time: end.toISOString() 
        })
        .eq("id", r.id);
      if (error) {
        console.error('Drop error:', error);
        alert(error.message);
      } else {
        loadCalendar();
      }
    } catch (error) {
      console.error('Drop error:', error);
    }
  };

  const onResize = async ({ event, start, end }: any) => {
    try {
      if (!canEdit(event)) return;
      const r = event.resource as DBEvent;
      const { error } = await supabase
        .from("events")
        .update({ 
          start_time: start.toISOString(), 
          end_time: end.toISOString() 
        })
        .eq("id", r.id);
      if (error) {
        console.error('Resize error:', error);
        alert(error.message);
      } else {
        loadCalendar();
      }
    } catch (error) {
      console.error('Resize error:', error);
    }
  };

  // External drag (desktop)
  const [dragType, setDragType] = useState<QuickType>("none");
  const startDrag = (t: Exclude<QuickType, "none">) => () => setDragType(t);
  const endDrag = () => setDragType("none");

  // Add button handlers - open quick modal
  const openQuickModal = (type: "reminder" | "todo") => {
    const now = new Date();
    const start = new Date(now.getTime() + 60*60*1000);
    const end = new Date(start.getTime() + 60*60*1000);
    
    setQuickForm({
      title: type === "reminder" ? "Reminder" : "To-do",
      description: "",
      start: toLocalInput(start),
      end: toLocalInput(end),
    });
    setQuickModal({ open: true, type });
  };

  const layoutClass = useMemo(() => (mode === "my" ? "grid-cols-calendar" : ""), [mode]);

  return (
    <div className="page calendar-sand">
      <div className={`container-app ${layoutClass}`}>
        {/* Sidebar tray (only in My Calendar mode) */}
        {mode === "my" && (
          <aside className="task-tray">
            <div className="card p-3">
              <div className="section-title">Quick add</div>
              <div className="stack">
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
              </div>
            </div>
          </aside>
        )}

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
                  What's Happening
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
                          if (me) await supabase.from("event_interests").upsert({ event_id: e.id, user_id: me });
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
              moonEvents={[]}
              showMoon={false}
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
              onExternalDrop={async ({ start, end }, kind) => {
                await createQuick(start, end, kind);
                setDragType("none");
              }}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <ModernCreateEventModal
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
