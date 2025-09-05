// app/(protected)/calendar/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
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

type FeedEvent = DBEvent & { 
  _dismissed?: boolean;
  _eventSource?: 'business' | 'community' | 'friend_invite';
  _userRelation?: 'following' | 'member' | 'invited';
};

type Mode = "my" | "whats";
type QuickType = "none" | "reminder" | "todo";
type CalendarTheme = "default" | "spring" | "summer" | "autumn" | "winter" | "nature" | "ocean";

interface TodoReminder {
  id: string;
  title: string;
  type: 'reminder' | 'todo';
  completed: boolean;
  created_at: string;
  due_date?: string;
}

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

  // Feed (What's Happening) - Enhanced
  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [selectedFeedEvent, setSelectedFeedEvent] = useState<FeedEvent | null>(null);

  // UI toggles
  const [openCreate, setOpenCreate] = useState(false);
  const [selected, setSelected] = useState<DBEvent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [quickType, setQuickType] = useState<QuickType>("none");
  const [externalTitle, setExternalTitle] = useState<string>("");
  const [showMoon, setShowMoon] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [showRemindersList, setShowRemindersList] = useState(false);
  const [showTodosList, setShowTodosList] = useState(false);

  // Todo/Reminder lists
  const [reminders, setReminders] = useState<TodoReminder[]>([]);
  const [todos, setTodos] = useState<TodoReminder[]>([]);
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [quickModalType, setQuickModalType] = useState<'reminder' | 'todo'>('reminder');
  const [quickModalTitle, setQuickModalTitle] = useState('');

  // Form for create modal
  const [form, setForm] = useState<{
    title: string;
    description: string;
    location: string;
    start: string;
    end: string;
    visibility: Visibility;
    event_type: string;
    community_id: string;
    source: "personal" | "business";
    image_path: string;
  }>({
    title: "",
    description: "",
    location: "",
    start: "",
    end: "",
    visibility: "private",
    event_type: "",
    community_id: "",
    source: "personal",
    image_path: "",
  });

  // Touch refs for mobile swipe
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Get moon events
  const moonEvents = useMoon();

  // ===== AUTH CHECK =====
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  // ===== THEME PERSISTENCE =====
  useEffect(() => {
    const saved = localStorage.getItem("mzt-calendar-theme");
    if (saved) setCalendarTheme(saved as CalendarTheme);
  }, []);

  // ===== LOAD CALENDAR EVENTS =====
  async function loadCalendar() {
    if (!me) return;
    setLoading(true);
    setErr(null);

    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .or(`created_by.eq.${me},visibility.in.(public,friends)`)
        .order("start_time", { ascending: true });

      if (error) throw error;

      const safe = (data || []).filter((e: any) => e?.start_time && e?.end_time);
      setEvents(safe);

      // Filter reminders and todos for the lists
      const userReminders = safe.filter((e: any) => 
        e.created_by === me && e.event_type === 'reminder'
      ).map((e: any) => ({
        id: e.id,
        title: e.title,
        type: 'reminder' as const,
        completed: e.completed || false,
        created_at: e.created_at,
        due_date: e.start_time
      }));
      
      const userTodos = safe.filter((e: any) => 
        e.created_by === me && e.event_type === 'todo'
      ).map((e: any) => ({
        id: e.id,
        title: e.title,
        type: 'todo' as const,
        completed: e.completed || false,
        created_at: e.created_at,
        due_date: e.start_time
      }));

      setReminders(userReminders);
      setTodos(userTodos);
    } catch (error: any) {
      console.error("Load calendar error:", error);
      setErr(error.message || "Failed to load events");
      showToast({
        type: 'error',
        message: 'Failed to load calendar',
        action: {
          label: 'Retry',
          onClick: loadCalendar
        }
      });
    } finally {
      setLoading(false);
    }
  }

  // ===== LOAD FEED (What's Happening) =====
  async function loadFeed() {
    if (!me) return;
    setFeedLoading(true);

    try {
      // Get all public events from friends, businesses, and communities
      const { data: friendEvents } = await supabase
        .from("events")
        .select("*")
        .eq("visibility", "public")
        .neq("created_by", me)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true });

      // Get community events
      const { data: communityEvents } = await supabase
        .from("events")
        .select("*")
        .eq("source", "community")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true });

      // Get business events
      const { data: businessEvents } = await supabase
        .from("events")
        .select("*")
        .eq("source", "business")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true });

      const allFeedEvents = [
        ...(friendEvents || []).map(e => ({ ...e, _eventSource: 'friend_invite' as const })),
        ...(communityEvents || []).map(e => ({ ...e, _eventSource: 'community' as const })),
        ...(businessEvents || []).map(e => ({ ...e, _eventSource: 'business' as const }))
      ];

      // Remove duplicates and sort
      const uniqueEvents = allFeedEvents.filter((event, index, self) => 
        index === self.findIndex(e => e.id === event.id)
      );

      uniqueEvents.sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );

      setFeed(uniqueEvents);
    } catch (error) {
      console.error("Load feed error:", error);
      showToast({
        type: 'error',
        message: 'Failed to load feed',
        action: {
          label: 'Retry',
          onClick: loadFeed
        }
      });
    } finally {
      setFeedLoading(false);
    }
  }

  // ===== INITIAL LOAD & MODE SWITCHING =====
  useEffect(() => {
    if (!me) return;
    if (mode === "my") {
      loadCalendar();
    } else {
      loadFeed();
    }
  }, [me, mode]);

  // ===== REALTIME SUBSCRIPTIONS =====
  useEffect(() => {
    if (!me) return;

    const ch = supabase
      .channel("cal-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        if (mode === "my") loadCalendar();
        else loadFeed();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [me, mode]);

  // ===== CALENDAR NAVIGATION HANDLERS =====
  const onSelectSlot = useCallback((slotInfo: any) => {
    // If in month view and clicking a day, go to day view
    if (view === 'month' && slotInfo.action === 'click') {
      setDate(slotInfo.start);
      setView('day');
      return;
    }

    // If in day/week view and clicking a time slot, open create event
    if ((view === 'day' || view === 'week') && slotInfo.action === 'click') {
      // If quick type is active, create a quick item
      if (quickType !== 'none') {
        createQuickItem(quickType as 'reminder' | 'todo', slotInfo.start, slotInfo.end);
        return;
      }

      // Otherwise open create event modal with pre-filled times
      const start = slotInfo.start || new Date();
      const end = slotInfo.end || new Date(start.getTime() + 3600000);
      
      setForm(prev => ({
        ...prev,
        start: toLocalInput(start),
        end: toLocalInput(end)
      }));
      setOpenCreate(true);
    }
  }, [view, quickType]);

  const onSelectEvent = useCallback((evt: any) => {
    const r = evt.resource as any;
    if (r?.moonPhase) return; // Ignore moon markers
    setSelected(r as DBEvent);
    setDetailsOpen(true);
  }, []);

  // ===== DRAG & DROP HANDLERS =====
  const onDrop = async ({ event, start, end }: any) => {
    const r = (event.resource || {}) as DBEvent;
    if (!me || r.created_by !== me) {
      showToast({
        type: 'error',
        message: 'You can only move your own events'
      });
      return;
    }

    const { error } = await supabase
      .from("events")
      .update({ start_time: start.toISOString(), end_time: end.toISOString() })
      .eq("id", r.id);
    
    if (error) {
      showToast({
        type: 'error',
        message: 'Failed to move event'
      });
    } else {
      showToast({
        type: 'success',
        message: 'Event moved successfully'
      });
      loadCalendar();
    }
  };

  const onResize = async ({ event, start, end }: any) => {
    const r = (event.resource || {}) as DBEvent;
    if (!me || r.created_by !== me) {
      showToast({
        type: 'error',
        message: 'You can only resize your own events'
      });
      return;
    }

    const { error } = await supabase
      .from("events")
      .update({ start_time: start.toISOString(), end_time: end.toISOString() })
      .eq("id", r.id);
    
    if (error) {
      showToast({
        type: 'error',
        message: 'Failed to resize event'
      });
    } else {
      showToast({
        type: 'success',
        message: 'Event resized successfully'
      });
      loadCalendar();
    }
  };

  // ===== QUICK ITEMS (TODOS & REMINDERS) =====
  async function createQuickItem(type: 'reminder' | 'todo', start: Date, end: Date, title?: string) {
    if (!me) return;

    const itemTitle = title || (type === 'reminder' ? 'New Reminder' : 'New To-do');

    try {
      const { error } = await supabase
        .from("events")
        .insert({
          title: itemTitle,
          description: '',
          location: '',
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          visibility: 'private' as Visibility,
          created_by: me,
          event_type: type,
          rsvp_public: false,
          community_id: null,
          image_path: null,
          source: 'personal',
          status: 'scheduled'
        });

      if (error) throw error;

      showToast({
        type: 'success',
        message: `${type === 'reminder' ? 'Reminder' : 'To-do'} created`
      });

      loadCalendar();
      setQuickType('none');
    } catch (error: any) {
      console.error("Create quick error:", error);
      showToast({
        type: 'error',
        message: `Failed to create ${type}`
      });
    }
  }

  async function toggleComplete(itemId: string, currentStatus: boolean) {
    const { error } = await supabase
      .from("events")
      .update({ completed: !currentStatus })
      .eq("id", itemId);

    if (!error) {
      showToast({
        type: 'success',
        message: currentStatus ? 'Marked as incomplete' : 'Marked as complete!'
      });
      loadCalendar();
    }
  }

  // ===== CREATE EVENT HANDLER =====
  const createEvent = async () => {
    if (!me) {
      showToast({
        type: 'error',
        message: 'Please log in first'
      });
      return;
    }

    if (!form.title || !form.start || !form.end) {
      showToast({
        type: 'error',
        message: 'Please fill in required fields'
      });
      return;
    }

    const payload: any = {
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      start_time: new Date(form.start).toISOString(),
      end_time: new Date(form.end).toISOString(),
      visibility: form.visibility,
      created_by: me,
      event_type: form.event_type || null,
      rsvp_public: true,
      community_id: form.community_id || null,
      image_path: form.image_path || null,
      source: form.source,
    };

    const { error } = await supabase.from("events").insert(payload);
    if (error) {
      showToast({
        type: 'error',
        message: error.message
      });
      return;
    }

    setOpenCreate(false);
    setForm({
      title: "",
      description: "",
      location: "",
      start: "",
      end: "",
      visibility: "private",
      event_type: "",
      community_id: "",
      source: "personal",
      image_path: "",
    });
    
    showToast({
      type: 'success',
      message: '✨ Event created successfully!'
    });
    
    loadCalendar();
  };

  // ===== TOUCH HANDLERS FOR MOBILE SWIPE =====
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX.current;
    
    if (Math.abs(deltaX) > 50) {
      const newDate = new Date(date);
      if (deltaX > 0) {
        // Swipe right - go back
        if (view === 'month') newDate.setMonth(newDate.getMonth() - 1);
        else if (view === 'week') newDate.setDate(newDate.getDate() - 7);
        else newDate.setDate(newDate.getDate() - 1);
      } else {
        // Swipe left - go forward
        if (view === 'month') newDate.setMonth(newDate.getMonth() + 1);
        else if (view === 'week') newDate.setDate(newDate.getDate() + 7);
        else newDate.setDate(newDate.getDate() + 1);
      }
      setDate(newDate);
    }
  };

  // ===== HELPER FUNCTIONS =====
  const toLocalInput = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const handleThemeChange = (newTheme: CalendarTheme) => {
    setCalendarTheme(newTheme);
    localStorage.setItem("mzt-calendar-theme", newTheme);
    showToast({
      type: 'success',
      message: `Theme changed to ${newTheme}`
    });
  };

  // Get events for the calendar based on mode
  const calendarEvents = useMemo(() => {
    if (mode === 'whats') {
      // In "What's Happening" mode, show feed events on calendar
      return feed;
    }
    return events;
  }, [mode, events, feed]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-200 rounded-full
                      mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-pink-200 rounded-full
                      mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-yellow-200 rounded-full
                      mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6 bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Title & Mode Toggle */}
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600
                           bg-clip-text text-transparent">
                Calendar
              </h1>

              <div className="flex rounded-full bg-white/90 shadow-md p-1">
                <button
                  onClick={() => setMode('my')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    mode === 'my'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  My Calendar
                </button>
                <button
                  onClick={() => setMode('whats')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    mode === 'whats'
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  What's Happening
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Moon Toggle */}
              <button
                onClick={() => setShowMoon(!showMoon)}
                className={`p-2 rounded-full transition-all duration-300 ${
                  showMoon
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg'
                    : 'bg-white text-gray-600 hover:shadow-md'
                }`}
                title="Toggle moon phases"
              >
                🌙
              </button>

              {/* Theme Selector */}
              <CalendarThemeSelector
                value={calendarTheme}
                onChange={handleThemeChange}
              />

              {/* Create Button */}
              <button
                onClick={() => setOpenCreate(true)}
                className="px-4 lg:px-6 py-2 rounded-full font-medium text-white
                         bg-gradient-to-r from-purple-600 to-pink-600
                         hover:from-purple-700 hover:to-pink-700
                         transform transition-all duration-300 hover:scale-105
                         shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <span className="text-lg">+</span>
                <span className="hidden sm:inline">Create Event</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl">
          <div className="flex gap-4 p-4">
            {/* Sidebar - Quick Items */}
            <div className="w-64 shrink-0 hidden lg:block">
              <div className="bg-white rounded-lg p-4 shadow-md">
                <h3 className="font-semibold text-gray-700 mb-3">Quick Items</h3>
                
                {/* Reminder Section */}
                <div className="mb-4">
                  <div
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200
                              hover:scale-105 hover:shadow-md ${
                      quickType === 'reminder'
                        ? 'bg-amber-100 border-2 border-amber-500'
                        : 'bg-amber-50 hover:bg-amber-100'
                    }`}
                    onClick={() => setQuickType(quickType === 'reminder' ? 'none' : 'reminder')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-amber-700">Reminder</div>
                        <div className="text-xs text-amber-600">
                          {quickType === 'reminder' ? 'Click calendar to place' : 'Click to activate'}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickModalType('reminder');
                          setQuickModalOpen(true);
                        }}
                        className="text-xs px-2 py-1 bg-amber-500 text-white rounded hover:bg-amber-600"
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  {/* Reminders List */}
                  {reminders.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <button
                        onClick={() => setShowRemindersList(!showRemindersList)}
                        className="text-xs text-amber-600 hover:underline"
                      >
                        {showRemindersList ? 'Hide' : 'Show'} Reminders ({reminders.length})
                      </button>
                      {showRemindersList && (
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {reminders.map(r => (
                            <div
                              key={r.id}
                              className={`text-xs p-2 bg-amber-50 rounded flex items-center justify-between
                                        ${r.completed ? 'opacity-50 line-through' : ''}`}
                            >
                              <span
                                className="cursor-move"
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('text/plain', r.title);
                                  setQuickType('reminder');
                                  setExternalTitle(r.title);
                                }}
                              >
                                {r.title}
                              </span>
                              <button
                                onClick={() => toggleComplete(r.id, r.completed)}
                                className="ml-2 text-amber-600 hover:text-amber-800"
                              >
                                {r.completed ? '↺' : '✓'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* To-do Section */}
                <div>
                  <div
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200
                              hover:scale-105 hover:shadow-md ${
                      quickType === 'todo'
                        ? 'bg-green-100 border-2 border-green-500'
                        : 'bg-green-50 hover:bg-green-100'
                    }`}
                    onClick={() => setQuickType(quickType === 'todo' ? 'none' : 'todo')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-green-700">To-do</div>
                        <div className="text-xs text-green-600">
                          {quickType === 'todo' ? 'Click calendar to place' : 'Click to activate'}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickModalType('todo');
                          setQuickModalOpen(true);
                        }}
                        className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  {/* Todos List */}
                  {todos.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <button
                        onClick={() => setShowTodosList(!showTodosList)}
                        className="text-xs text-green-600 hover:underline"
                      >
                        {showTodosList ? 'Hide' : 'Show'} To-dos ({todos.length})
                      </button>
                      {showTodosList && (
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {todos.map(t => (
                            <div
                              key={t.id}
                              className={`text-xs p-2 bg-green-50 rounded flex items-center justify-between
                                        ${t.completed ? 'opacity-50 line-through' : ''}`}
                            >
                              <span
                                className="cursor-move"
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('text/plain', t.title);
                                  setQuickType('todo');
                                  setExternalTitle(t.title);
                                }}
                              >
                                {t.title}
                              </span>
                              <button
                                onClick={() => toggleComplete(t.id, t.completed)}
                                className="ml-2 text-green-600 hover:text-green-800"
                              >
                                {t.completed ? '↺' : '✓'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {quickType !== 'none' && (
                  <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs text-purple-700 font-medium">
                      Placement Mode Active
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      Click a time slot to place your {quickType}
                    </p>
                    <button
                      onClick={() => setQuickType('none')}
                      className="text-xs text-purple-500 underline mt-2"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Calendar Grid */}
            <div 
              className="flex-1"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <CalendarGrid
                dbEvents={calendarEvents as any}
                moonEvents={showMoon ? moonEvents : []}
                showMoon={showMoon}
                showWeather={showWeather}
                theme={calendarTheme}
                date={date}
                setDate={setDate}
                view={view}
                setView={setView}
                onSelectSlot={onSelectSlot}
                onSelectEvent={onSelectEvent}
                onDrop={onDrop}
                onResize={onResize}
                externalDragType={quickType}
                externalDragTitle={externalTitle}
                onExternalDrop={(info, kind) => {
                  createQuickItem(kind, info.start, info.end, externalTitle);
                  setExternalTitle('');
                }}
              />
            </div>
          </div>
        </div>

        {/* Quick Modal for Custom Reminders/Todos */}
        {quickModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setQuickModalOpen(false)} />
            <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">
                Create {quickModalType === 'reminder' ? 'Reminder' : 'To-do'}
              </h3>
              <input
                type="text"
                value={quickModalTitle}
                onChange={(e) => setQuickModalTitle(e.target.value)}
                placeholder={`Enter ${quickModalType} title...`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    if (quickModalTitle.trim()) {
                      const now = new Date();
                      const later = new Date(now.getTime() + 3600000);
                      createQuickItem(quickModalType, now, later, quickModalTitle);
                      setQuickModalTitle('');
                      setQuickModalOpen(false);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg
                           hover:bg-purple-700 transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setQuickModalOpen(false);
                    setQuickModalTitle('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg
                           hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Event Details Modal */}
        <EventDetails 
          event={detailsOpen ? (selectedFeedEvent || selected) : null} 
          onClose={() => {
            setDetailsOpen(false);
            setSelectedFeedEvent(null);
          }} 
        />

        {/* Create Event Modal */}
        <CreateEventModal
          open={openCreate}
          onClose={() => setOpenCreate(false)}
          sessionUser={me}
          value={form}
          onChange={(updates) => setForm(prev => ({ ...prev, ...updates }))}
          onSave={createEvent}
        />
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -30px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(1); }
          75% { transform: translate(30px, 10px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 10s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
