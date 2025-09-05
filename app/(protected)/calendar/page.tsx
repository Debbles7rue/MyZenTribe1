// app/(protected)/calendar/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import type { View } from "react-big-calendar";
import { supabase } from "@/lib/supabaseClient";
import CreateEventModal from "@/components/CreateEventModal";
import CalendarThemeSelector from "@/components/CalendarThemeSelector";
import EventDetails from "@/components/EventDetails";
import CalendarAnalytics from "@/components/CalendarAnalytics";
import SmartTemplates from "@/components/SmartTemplates";
import SmartMeetingCoordinator from "@/components/SmartMeetingCoordinator";
import { useToast } from "@/components/ToastProvider";
import { useMoon } from "@/lib/useMoon";
import { useKeyboardShortcuts, KeyboardShortcutsHelp } from "@/hooks/useKeyboardShortcuts";
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
type CalendarTheme = "default" | "spring" | "summer" | "autumn" | "winter" | "nature" | "ocean";

interface TodoReminder {
  id: string;
  title: string;
  description?: string;
  type: 'reminder' | 'todo';
  completed: boolean;
  created_at: string;
  start_time?: string;
  end_time?: string;
}

interface DragItem {
  id: string;
  title: string;
  type: 'reminder' | 'todo';
}

interface Friend {
  friend_id: string;
  name: string;
  avatar_url?: string;
  safe_to_carpool?: boolean;
}

interface CarpoolMatch {
  event: DBEvent;
  friends: Friend[];
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
  const [openEdit, setOpenEdit] = useState(false);
  const [selected, setSelected] = useState<DBEvent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showMoon, setShowMoon] = useState(false);
  const [showRemindersList, setShowRemindersList] = useState(true);
  const [showTodosList, setShowTodosList] = useState(true);
  const [showCompletedItems, setShowCompletedItems] = useState(false);

  // New feature modals
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showMeetingCoordinator, setShowMeetingCoordinator] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Todo/Reminder lists
  const [reminders, setReminders] = useState<TodoReminder[]>([]);
  const [todos, setTodos] = useState<TodoReminder[]>([]);
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [dragType, setDragType] = useState<'reminder' | 'todo' | 'none'>('none');
  
  // Friends and carpooling
  const [friends, setFriends] = useState<Friend[]>([]);
  const [carpoolMatches, setCarpoolMatches] = useState<CarpoolMatch[]>([]);
  const [showCarpoolChat, setShowCarpoolChat] = useState(false);
  const [selectedCarpoolEvent, setSelectedCarpoolEvent] = useState<DBEvent | null>(null);
  
  // Quick create modal
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [quickModalType, setQuickModalType] = useState<'reminder' | 'todo'>('reminder');
  const [quickModalForm, setQuickModalForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    enableNotification: true,
    notificationMinutes: 10 // minutes before event
  });

  // Form for create/edit modal
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
  const moonEvents = useMoon(date, view);

  // ===== AUTH CHECK =====
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  // ===== THEME PERSISTENCE =====
  useEffect(() => {
    const saved = localStorage.getItem("mzt-calendar-theme");
    if (saved) setCalendarTheme(saved as CalendarTheme);
  }, []);

  // Save theme whenever it changes
  useEffect(() => {
    if (calendarTheme) {
      localStorage.setItem("mzt-calendar-theme", calendarTheme);
    }
  }, [calendarTheme]);

  // ===== LOAD FRIENDS =====
  async function loadFriends() {
    if (!me) return;
    
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('*, friend:friend_id(id, name, avatar_url)')
        .eq('user_id', me)
        .eq('status', 'accepted');

      if (!error && data) {
        const friendsList = data.map(f => ({
          friend_id: f.friend.id,
          name: f.friend.name || 'Friend',
          avatar_url: f.friend.avatar_url,
          safe_to_carpool: f.safe_to_carpool || false
        }));
        setFriends(friendsList);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  }

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

      // Filter reminders and todos for the sidebar lists
      const userReminders = safe.filter((e: any) => 
        e.created_by === me && e.event_type === 'reminder'
      ).map((e: any) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        type: 'reminder' as const,
        completed: e.completed || false,
        created_at: e.created_at,
        start_time: e.start_time,
        end_time: e.end_time
      }));
      
      const userTodos = safe.filter((e: any) => 
        e.created_by === me && e.event_type === 'todo'
      ).map((e: any) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        type: 'todo' as const,
        completed: e.completed || false,
        created_at: e.created_at,
        start_time: e.start_time,
        end_time: e.end_time
      }));

      setReminders(userReminders);
      setTodos(userTodos);

      // Check for carpool opportunities
      checkCarpoolMatches(safe);
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

  // ===== CHECK CARPOOL MATCHES =====
  function checkCarpoolMatches(allEvents: DBEvent[]) {
    if (!me || friends.length === 0) return;

    const carpoolFriends = friends.filter(f => f.safe_to_carpool);
    if (carpoolFriends.length === 0) return;

    const matches: CarpoolMatch[] = [];

    // Find events where multiple carpool friends are attending
    allEvents.forEach(event => {
      if (event.created_by === me || event.visibility === 'public' || event.visibility === 'friends') {
        // Check which carpool friends have this same event
        const attendingFriends = carpoolFriends.filter(friend => {
          return allEvents.some(e => 
            e.created_by === friend.friend_id &&
            e.title === event.title &&
            new Date(e.start_time).getTime() === new Date(event.start_time).getTime() &&
            e.location === event.location
          );
        });

        if (attendingFriends.length > 0) {
          matches.push({
            event,
            friends: attendingFriends
          });
        }
      }
    });

    setCarpoolMatches(matches);

    // Show notification if new matches found
    if (matches.length > 0 && carpoolMatches.length === 0) {
      showToast({
        type: 'success',
        message: `Found ${matches.length} carpool opportunities!`
      });
    }
  }

  // ===== LOAD FEED (What's Happening) =====
  async function loadFeed() {
    if (!me) return;
    setFeedLoading(true);

    try {
      // Only get:
      // 1. Direct invites from friends
      // 2. Business events from businesses I follow 
      // 3. Community events from communities I'm in
      
      const { data: businessEvents } = await supabase
        .from("events")
        .select("*")
        .eq("source", "business")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true });

      const { data: communityEvents } = await supabase
        .from("events")
        .select("*")
        .eq("source", "community")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true });

      const allFeedEvents = [
        ...(businessEvents || []).map(e => ({ ...e, _eventSource: 'business' as const })),
        ...(communityEvents || []).map(e => ({ ...e, _eventSource: 'community' as const }))
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
    loadFriends();
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

  // ===== REMINDER NOTIFICATIONS =====
  useEffect(() => {
    if (!reminders.length) return;

    const checkReminders = () => {
      const now = new Date();
      reminders.forEach(reminder => {
        if (reminder.start_time) {
          const reminderTime = new Date(reminder.start_time);
          const timeDiff = reminderTime.getTime() - now.getTime();
          const minutesDiff = Math.floor(timeDiff / 60000);

          // Check if reminder is within notification window (default 10 minutes)
          if (minutesDiff > 0 && minutesDiff <= 10 && !reminder.completed) {
            // Check if we've already shown this notification
            const notificationKey = `reminder-notified-${reminder.id}`;
            if (!localStorage.getItem(notificationKey)) {
              showToast({
                type: 'info',
                message: `Reminder: ${reminder.title} in ${minutesDiff} minutes!`
              });

              // Request browser notification permission
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Reminder', {
                  body: `${reminder.title} in ${minutesDiff} minutes`,
                  icon: '/icon.png'
                });
              }

              // Mark as notified
              localStorage.setItem(notificationKey, 'true');
            }
          }
        }
      });
    };

    // Check every minute
    const interval = setInterval(checkReminders, 60000);
    checkReminders(); // Initial check

    return () => clearInterval(interval);
  }, [reminders, showToast]);

  // ===== KEYBOARD SHORTCUTS =====
  const shortcutActions = {
    createEvent: () => setOpenCreate(true),
    switchToMonth: () => setView('month'),
    switchToWeek: () => setView('week'),
    switchToDay: () => setView('day'),
    navigateNext: () => {
      const newDate = new Date(date);
      if (view === 'month') newDate.setMonth(newDate.getMonth() + 1);
      else if (view === 'week') newDate.setDate(newDate.getDate() + 7);
      else newDate.setDate(newDate.getDate() + 1);
      setDate(newDate);
    },
    navigatePrevious: () => {
      const newDate = new Date(date);
      if (view === 'month') newDate.setMonth(newDate.getMonth() - 1);
      else if (view === 'week') newDate.setDate(newDate.getDate() - 7);
      else newDate.setDate(newDate.getDate() - 1);
      setDate(newDate);
    },
    navigateToday: () => setDate(new Date()),
    openSearch: () => document.getElementById('search-input')?.focus(),
    openTemplates: () => setShowTemplates(true),
    openAnalytics: () => setShowAnalytics(true),
    toggleMoon: () => setShowMoon(!showMoon),
    createReminder: () => {
      setQuickModalType('reminder');
      setQuickModalOpen(true);
    },
    createTodo: () => {
      setQuickModalType('todo');
      setQuickModalOpen(true);
    },
    showHelp: () => setShowShortcutsHelp(true),
    escape: () => {
      // Close any open modals
      setOpenCreate(false);
      setOpenEdit(false);
      setDetailsOpen(false);
      setShowAnalytics(false);
      setShowTemplates(false);
      setShowMeetingCoordinator(false);
      setShowShortcutsHelp(false);
      setQuickModalOpen(false);
    },
  };

  useKeyboardShortcuts(shortcutActions);

  // ===== CALENDAR NAVIGATION HANDLERS =====
  const onSelectSlot = useCallback((slotInfo: any) => {
    // If in month view and clicking a day, go to day view
    if (view === 'month' && slotInfo.action === 'click') {
      setDate(slotInfo.start);
      setView('day');
      return;
    }

    // If in day/week view and clicking a time slot
    if ((view === 'day' || view === 'week') && slotInfo.action === 'click') {
      // Open create event modal with pre-filled times
      const start = slotInfo.start || new Date();
      const end = slotInfo.end || new Date(start.getTime() + 3600000);
      
      setForm(prev => ({
        ...prev,
        start: toLocalInput(start),
        end: toLocalInput(end)
      }));
      setOpenCreate(true);
    }
  }, [view]);

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

  // ===== HANDLE EXTERNAL DROP (from sidebar) =====
  const onExternalDrop = useCallback(async (info: any, type: 'reminder' | 'todo') => {
    if (!draggedItem || !me) return;

    const start = info.start || new Date();
    const end = info.end || new Date(start.getTime() + 3600000);

    try {
      const { error } = await supabase
        .from("events")
        .insert({
          title: `${draggedItem.title} (copy)`,
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
        message: `${type === 'reminder' ? 'Reminder' : 'To-do'} added to calendar`
      });

      loadCalendar();
      setDraggedItem(null);
      setDragType('none');
    } catch (error: any) {
      console.error("Create from drag error:", error);
      showToast({
        type: 'error',
        message: `Failed to create ${type}`
      });
    }
  }, [draggedItem, me]);

  // ===== QUICK CREATE HANDLER =====
  async function createQuickItem() {
    if (!me || !quickModalForm.title.trim()) return;

    try {
      const baseDate = quickModalForm.date ? new Date(quickModalForm.date) : new Date();
      if (quickModalForm.time) {
        const [hours, minutes] = quickModalForm.time.split(':');
        baseDate.setHours(parseInt(hours), parseInt(minutes));
      }
      
      const start = baseDate;
      const end = new Date(start.getTime() + 3600000);

      const eventData: any = {
        title: quickModalForm.title,
        description: quickModalForm.description || '',
        location: '',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        visibility: 'private' as Visibility,
        created_by: me,
        event_type: quickModalType,
        rsvp_public: false,
        community_id: null,
        image_path: null,
        source: 'personal',
        status: 'scheduled'
      };

      // Add notification settings if enabled
      if (quickModalForm.enableNotification) {
        eventData.notification_minutes = quickModalForm.notificationMinutes;
      }

      const { error } = await supabase
        .from("events")
        .insert(eventData);

      if (error) throw error;

      showToast({
        type: 'success',
        message: `${quickModalType === 'reminder' ? 'Reminder' : 'To-do'} created`
      });

      loadCalendar();
      setQuickModalOpen(false);
      setQuickModalForm({ 
        title: '', 
        description: '', 
        date: '', 
        time: '',
        enableNotification: true,
        notificationMinutes: 10 
      });
    } catch (error: any) {
      console.error("Create quick error:", error);
      showToast({
        type: 'error',
        message: `Failed to create ${quickModalType}`
      });
    }
  }

  // ===== TOGGLE COMPLETE STATUS =====
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

  // ===== DELETE ITEM =====
  async function deleteItem(itemId: string) {
    if (confirm('Are you sure you want to delete this item?')) {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", itemId);

      if (!error) {
        showToast({
          type: 'success',
          message: 'Item deleted'
        });
        loadCalendar();
      }
    }
  }

  // ===== TEMPLATE HANDLERS =====
  const handleApplyTemplate = async (templateEvents: any[]) => {
    try {
      for (const event of templateEvents) {
        await supabase.from('events').insert(event);
      }
      loadCalendar();
      showToast({ type: 'success', message: 'Routine added to calendar!' });
    } catch (error) {
      showToast({ type: 'error', message: 'Failed to apply template' });
    }
  };

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
    resetForm();
    
    showToast({
      type: 'success',
      message: '✨ Event created successfully!'
    });
    
    loadCalendar();
  };

  // ===== UPDATE EVENT HANDLER =====
  const updateEvent = async () => {
    if (!selected || !me) return;

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
      event_type: form.event_type || null,
      community_id: form.community_id || null,
      image_path: form.image_path || null,
      source: form.source,
    };

    const { error } = await supabase
      .from("events")
      .update(payload)
      .eq("id", selected.id);
      
    if (error) {
      showToast({
        type: 'error',
        message: error.message
      });
      return;
    }

    setOpenEdit(false);
    setSelected(null);
    resetForm();
    
    showToast({
      type: 'success',
      message: '✨ Event updated successfully!'
    });
    
    loadCalendar();
  };

  // ===== OPEN EDIT MODAL =====
  const handleEdit = (event: DBEvent) => {
    setSelected(event);
    setForm({
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      start: toLocalInput(new Date(event.start_time)),
      end: toLocalInput(new Date(event.end_time)),
      visibility: event.visibility,
      event_type: event.event_type || '',
      community_id: event.community_id || '',
      source: event.source || 'personal',
      image_path: event.image_path || '',
    });
    setDetailsOpen(false);
    setOpenEdit(true);
  };

  // ===== OPEN CARPOOL CHAT =====
  const openCarpoolChat = (event?: DBEvent) => {
    setSelectedCarpoolEvent(event || null);
    setShowCarpoolChat(true);
  };

  // ===== HELPER FUNCTIONS =====
  const toLocalInput = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const resetForm = () => {
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
  };

  const handleThemeChange = (newTheme: CalendarTheme) => {
    setCalendarTheme(newTheme);
    showToast({
      type: 'success',
      message: `Theme changed to ${newTheme}`
    });
  };

  // Get events for the calendar based on mode
  const calendarEvents = useMemo(() => {
    if (mode === 'whats') {
      return feed;
    }
    return events;
  }, [mode, events, feed]);

  // Filter items for sidebar lists
  const visibleReminders = useMemo(() => {
    return reminders.filter(r => showCompletedItems || !r.completed);
  }, [reminders, showCompletedItems]);

  const visibleTodos = useMemo(() => {
    return todos.filter(t => showCompletedItems || !t.completed);
  }, [todos, showCompletedItems]);

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
              {/* Analytics */}
              <button
                onClick={() => setShowAnalytics(true)}
                className="p-2 rounded-full bg-white text-gray-600 hover:shadow-md transition-all"
                title="View analytics"
              >
                📊
              </button>

              {/* Templates */}
              <button
                onClick={() => setShowTemplates(true)}
                className="p-2 rounded-full bg-white text-gray-600 hover:shadow-md transition-all"
                title="Smart templates"
              >
                ✨
              </button>

              {/* Meeting Coordinator */}
              <button
                onClick={() => setShowMeetingCoordinator(true)}
                className="p-2 rounded-full bg-white text-gray-600 hover:shadow-md transition-all"
                title="Find meeting time"
              >
                🤝
              </button>

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

              {/* Keyboard Shortcuts */}
              <button
                onClick={() => setShowShortcutsHelp(true)}
                className="p-2 rounded-full bg-white text-gray-600 hover:shadow-md transition-all"
                title="Keyboard shortcuts (press ?)"
              >
                ⌨️
              </button>

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
            {/* Sidebar - Todo/Reminder Lists & Carpool */}
            {mode === 'my' && (
              <div className="w-64 shrink-0 hidden lg:block">
                <div className="bg-white rounded-lg shadow-md">
                  
                  {/* Carpool Section */}
                  <div className="border-b">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-700">Carpool</h3>
                        <button
                          onClick={() => openCarpoolChat()}
                          className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          + Start
                        </button>
                      </div>

                      {/* Carpool Matches */}
                      {carpoolMatches.length > 0 ? (
                        <div className="space-y-2 mb-3">
                          {carpoolMatches.slice(0, 3).map((match, idx) => (
                            <div
                              key={idx}
                              className="p-2 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100"
                              onClick={() => openCarpoolChat(match.event)}
                            >
                              <div className="text-xs font-medium text-green-800">
                                {match.event.title}
                              </div>
                              <div className="text-xs text-green-600 mt-1">
                                {match.friends.length} friend{match.friends.length > 1 ? 's' : ''} going
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic mb-3">
                          No carpool matches found
                        </p>
                      )}

                      {/* Manual Carpool Button */}
                      <button
                        onClick={() => openCarpoolChat()}
                        className="w-full text-xs px-3 py-2 bg-blue-50 text-blue-700 rounded-lg
                                 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                      >
                        <span>🚗</span>
                        <span>Manual Carpool Setup</span>
                      </button>
                    </div>
                  </div>

                  {/* Reminders Section */}
                  <div className="border-b">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <button
                          onClick={() => setShowRemindersList(!showRemindersList)}
                          className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900"
                        >
                          <span>{showRemindersList ? '▼' : '▶'}</span>
                          <span>Reminders ({visibleReminders.length})</span>
                        </button>
                        <button
                          onClick={() => {
                            setQuickModalType('reminder');
                            setQuickModalOpen(true);
                          }}
                          className="text-xs px-2 py-1 bg-amber-500 text-white rounded hover:bg-amber-600"
                        >
                          + Add
                        </button>
                      </div>

                      {showRemindersList && (
                        <>
                          <div className="mb-2">
                            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={showCompletedItems}
                                onChange={(e) => setShowCompletedItems(e.target.checked)}
                                className="rounded"
                              />
                              Show completed
                            </label>
                          </div>

                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {visibleReminders.length === 0 ? (
                              <p className="text-xs text-gray-400 italic p-2">No reminders yet</p>
                            ) : (
                              visibleReminders.map(r => (
                                <div
                                  key={r.id}
                                  className={`group p-2 bg-amber-50 rounded-lg flex items-center gap-2
                                            hover:bg-amber-100 transition-colors ${
                                    r.completed ? 'opacity-50' : ''
                                  }`}
                                  draggable
                                  onDragStart={() => {
                                    setDraggedItem({ id: r.id, title: r.title, type: 'reminder' });
                                    setDragType('reminder');
                                  }}
                                  onDragEnd={() => {
                                    setDraggedItem(null);
                                    setDragType('none');
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={r.completed}
                                    onChange={() => toggleComplete(r.id, r.completed)}
                                    className="rounded-sm"
                                  />
                                  <span className={`flex-1 text-sm cursor-move ${
                                    r.completed ? 'line-through' : ''
                                  }`}>
                                    {r.title}
                                  </span>
                                  <button
                                    onClick={() => deleteItem(r.id)}
                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700
                                             text-xs transition-opacity"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))
                            )}
                          </div>

                          {visibleReminders.length > 0 && (
                            <p className="text-xs text-gray-500 mt-2 italic">
                              Drag items to calendar to create copies
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* To-dos Section */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <button
                        onClick={() => setShowTodosList(!showTodosList)}
                        className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900"
                      >
                        <span>{showTodosList ? '▼' : '▶'}</span>
                        <span>To-dos ({visibleTodos.length})</span>
                      </button>
                      <button
                        onClick={() => {
                          setQuickModalType('todo');
                          setQuickModalOpen(true);
                        }}
                        className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        + Add
                      </button>
                    </div>

                    {showTodosList && (
                      <>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {visibleTodos.length === 0 ? (
                            <p className="text-xs text-gray-400 italic p-2">No to-dos yet</p>
                          ) : (
                            visibleTodos.map(t => (
                              <div
                                key={t.id}
                                className={`group p-2 bg-green-50 rounded-lg flex items-center gap-2
                                          hover:bg-green-100 transition-colors ${
                                  t.completed ? 'opacity-50' : ''
                                }`}
                                draggable
                                onDragStart={() => {
                                  setDraggedItem({ id: t.id, title: t.title, type: 'todo' });
                                  setDragType('todo');
                                }}
                                onDragEnd={() => {
                                  setDraggedItem(null);
                                  setDragType('none');
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={t.completed}
                                  onChange={() => toggleComplete(t.id, t.completed)}
                                  className="rounded-sm"
                                />
                                <span className={`flex-1 text-sm cursor-move ${
                                  t.completed ? 'line-through' : ''
                                }`}>
                                  {t.title}
                                </span>
                                <button
                                  onClick={() => deleteItem(t.id)}
                                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700
                                           text-xs transition-opacity"
                                >
                                  ✕
                                </button>
                              </div>
                            ))
                          )}
                        </div>

                        {visibleTodos.length > 0 && (
                          <p className="text-xs text-gray-500 mt-2 italic">
                            Drag items to calendar to create copies
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Calendar Grid */}
            <div className="flex-1">
              <CalendarGrid
                dbEvents={calendarEvents as any}
                moonEvents={showMoon ? moonEvents : []}
                showMoon={showMoon}
                showWeather={false}
                theme={calendarTheme}
                date={date}
                setDate={setDate}
                view={view}
                setView={setView}
                onSelectSlot={onSelectSlot}
                onSelectEvent={onSelectEvent}
                onDrop={onDrop}
                onResize={onResize}
                externalDragType={dragType}
                externalDragTitle={draggedItem?.title}
                onExternalDrop={onExternalDrop}
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
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    value={quickModalForm.title}
                    onChange={(e) => setQuickModalForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={`Enter ${quickModalType} title...`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-purple-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={quickModalForm.description}
                    onChange={(e) => setQuickModalForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional notes..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={quickModalForm.date}
                      onChange={(e) => setQuickModalForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input
                      type="time"
                      value={quickModalForm.time}
                      onChange={(e) => setQuickModalForm(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {quickModalType === 'reminder' && (
                  <div className="border-t pt-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={quickModalForm.enableNotification}
                        onChange={(e) => setQuickModalForm(prev => ({ 
                          ...prev, 
                          enableNotification: e.target.checked 
                        }))}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">Enable notification</span>
                    </label>
                    
                    {quickModalForm.enableNotification && (
                      <div className="mt-2 ml-6">
                        <label className="text-xs text-gray-600">Notify me</label>
                        <select
                          value={quickModalForm.notificationMinutes}
                          onChange={(e) => setQuickModalForm(prev => ({ 
                            ...prev, 
                            notificationMinutes: parseInt(e.target.value) 
                          }))}
                          className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="5">5 minutes before</option>
                          <option value="10">10 minutes before</option>
                          <option value="15">15 minutes before</option>
                          <option value="30">30 minutes before</option>
                          <option value="60">1 hour before</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={createQuickItem}
                  disabled={!quickModalForm.title.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg
                           hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setQuickModalOpen(false);
                    setQuickModalForm({ 
                      title: '', 
                      description: '', 
                      date: '', 
                      time: '',
                      enableNotification: true,
                      notificationMinutes: 10 
                    });
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

        {/* Carpool Chat Modal */}
        {showCarpoolChat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowCarpoolChat(false)} />
            <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">
                🚗 Carpool Chat
              </h3>
              
              {selectedCarpoolEvent && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-900">{selectedCarpoolEvent.title}</div>
                  <div className="text-xs text-blue-700">
                    {new Date(selectedCarpoolEvent.start_time).toLocaleString()}
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Select friends to add to this carpool group:
                </p>
                
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {friends.map(friend => (
                    <label key={friend.friend_id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">{friend.name}</span>
                      {friend.safe_to_carpool && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          Carpool safe
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg
                           hover:bg-green-700 transition-colors"
                  onClick={() => {
                    showToast({ type: 'success', message: 'Carpool chat created!' });
                    setShowCarpoolChat(false);
                  }}
                >
                  Start Chat
                </button>
                <button
                  onClick={() => setShowCarpoolChat(false)}
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
          onEdit={handleEdit}
          isOwner={selected?.created_by === me}
        />

        {/* Create Event Modal */}
        <CreateEventModal
          open={openCreate}
          onClose={() => {
            setOpenCreate(false);
            resetForm();
          }}
          sessionUser={me}
          value={form}
          onChange={(updates) => setForm(prev => ({ ...prev, ...updates }))}
          onSave={createEvent}
        />

        {/* Edit Event Modal */}
        <CreateEventModal
          open={openEdit}
          onClose={() => {
            setOpenEdit(false);
            setSelected(null);
            resetForm();
          }}
          sessionUser={me}
          value={form}
          onChange={(updates) => setForm(prev => ({ ...prev, ...updates }))}
          onSave={updateEvent}
          isEdit={true}
        />

        {/* Analytics Modal */}
        {showAnalytics && (
          <CalendarAnalytics
            events={events}
            userId={me!}
            onClose={() => setShowAnalytics(false)}
          />
        )}

        {/* Templates Modal */}
        {showTemplates && (
          <SmartTemplates
            open={showTemplates}
            onClose={() => setShowTemplates(false)}
            onApply={handleApplyTemplate}
            userId={me!}
          />
        )}

        {/* Meeting Coordinator Modal */}
        {showMeetingCoordinator && (
          <SmartMeetingCoordinator
            open={showMeetingCoordinator}
            onClose={() => setShowMeetingCoordinator(false)}
            userId={me!}
            friends={friends}
            userEvents={events}
            onSchedule={async (event) => {
              await supabase.from('events').insert(event);
              loadCalendar();
              showToast({ 
                type: 'success', 
                message: 'Meeting scheduled! Invites sent to participants.' 
              });
              setShowMeetingCoordinator(false);
            }}
          />
        )}

        {/* Keyboard Shortcuts Help */}
        <KeyboardShortcutsHelp 
          open={showShortcutsHelp} 
          onClose={() => setShowShortcutsHelp(false)} 
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
