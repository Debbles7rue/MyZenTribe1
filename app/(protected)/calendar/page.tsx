// app/(protected)/calendar/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import type { View } from "react-big-calendar";
import { supabase } from "@/lib/supabaseClient";
import CreateEventModal from "@/components/CreateEventModal";
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
  
  // Mobile states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Quick create modal
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [quickModalType, setQuickModalType] = useState<'reminder' | 'todo'>('reminder');
  const [quickModalForm, setQuickModalForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    enableNotification: true,
    notificationMinutes: 10
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

  // ===== HELPER FUNCTION - DEFINED ONCE =====
  const toLocalInput = useCallback((d: Date) => {
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }, []);

  // ===== MOBILE DETECTION =====
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ===== AUTH CHECK =====
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  // ===== REQUEST BROWSER NOTIFICATION PERMISSION =====
  useEffect(() => {
    // Request notification permission on mount (one-time)
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showToast({
            type: 'success',
            message: '🔔 Notifications enabled! You\'ll be notified about reminders.'
          });
        } else if (permission === 'denied') {
          showToast({
            type: 'info',
            message: 'Notifications blocked. You can enable them in browser settings if needed.'
          });
        }
      });
    }
  }, [showToast]);

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

              // Request browser notification permission and show notification
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
      setMobileMenuOpen(false);
    },
  };

  useKeyboardShortcuts(shortcutActions, !isMobile); // Disable on mobile

  // ===== CALENDAR NAVIGATION HANDLERS =====
  const onSelectSlot = useCallback((slotInfo: any) => {
    // Enhanced mobile support - clicking a day in month view opens day view
    if (view === 'month') {
      setDate(slotInfo.start);
      setView('day');
      return;
    }

    // If in day/week view, open create event modal with pre-filled times
    if (view === 'day' || view === 'week') {
      const start = slotInfo.start || new Date();
      const end = slotInfo.end || new Date(start.getTime() + 3600000);
      
      setForm(prev => ({
        ...prev,
        start: toLocalInput(start),
        end: toLocalInput(end)
      }));
      setOpenCreate(true);
    }
  }, [view, toLocalInput]);

  const onSelectEvent = useCallback((evt: any) => {
    const r = evt.resource as any;
    if (r?.moonPhase) return; // Ignore moon markers
    setSelected(r as DBEvent);
    setDetailsOpen(true);
  }, []);

  // ===== DRAG & DROP HANDLERS (Desktop only) =====
  const onDrop = async ({ event, start, end }: any) => {
    if (isMobile) return; // Disable on mobile
    
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
    if (isMobile) return; // Disable on mobile
    
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
    if (isMobile || !draggedItem || !me) return;

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
  }, [draggedItem, me, isMobile, showToast]);

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
        status: 'scheduled',
        completed: false  // Explicitly set to false initially
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

  // ===== TOGGLE COMPLETE STATUS (ENHANCED WITH BETTER ERROR HANDLING) =====
  async function toggleComplete(itemId: string, currentStatus: boolean, itemType: 'reminder' | 'todo') {
    if (!me) {
      showToast({
        type: 'error',
        message: 'Please log in to update items'
      });
      return;
    }
    
    // Optimistic update - immediately update UI
    const updateList = itemType === 'reminder' ? setReminders : setTodos;
    updateList(prev => prev.map(item => 
      item.id === itemId ? { ...item, completed: !currentStatus } : item
    ));

    try {
      // Debug logging
      console.log('Toggling complete status:', {
        itemId,
        userId: me,
        currentStatus,
        newStatus: !currentStatus,
        itemType
      });

      const { data, error } = await supabase
        .from("events")
        .update({ 
          completed: !currentStatus,
          updated_at: new Date().toISOString() // Add timestamp to force update
        })
        .eq("id", itemId)
        .eq("created_by", me) // Ensure user owns the item
        .select(); // Return the updated record
      
      if (error) {
        console.error('Supabase update error:', error);
        
        // Revert optimistic update on error
        updateList(prev => prev.map(item => 
          item.id === itemId ? { ...item, completed: currentStatus } : item
        ));
        
        // More helpful error messages
        if (error.message?.includes('permission') || error.message?.includes('policy')) {
          showToast({
            type: 'error',
            message: 'Permission denied. Check if you own this item.',
            action: {
              label: 'Refresh',
              onClick: loadCalendar
            }
          });
        } else {
          showToast({
            type: 'error',
            message: 'Failed to update. Please try again.'
          });
        }
        return;
      }
      
      // Success feedback
      if (data && data.length > 0) {
        console.log('Update successful:', data[0]);
        showToast({
          type: 'success',
          message: currentStatus ? '✨ Marked as incomplete' : '✅ Marked as complete!'
        });
      } else {
        console.warn('No data returned from update');
        // Still reload to ensure sync
        await loadCalendar();
      }
      
    } catch (error: any) {
      console.error('Toggle complete exception:', error);
      
      // Revert optimistic update
      updateList(prev => prev.map(item => 
        item.id === itemId ? { ...item, completed: currentStatus } : item
      ));
      
      showToast({
        type: 'error',
        message: 'Network error. Please check your connection.'
      });
    }
  }

  // ===== DELETE ITEM =====
  async function deleteItem(itemId: string) {
    if (confirm('Are you sure you want to delete this item?')) {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", itemId)
        .eq("created_by", me); // Ensure user owns the item

      if (!error) {
        showToast({
          type: 'success',
          message: '🗑️ Item deleted'
        });
        loadCalendar();
      } else {
        showToast({
          type: 'error',
          message: 'Failed to delete item'
        });
      }
    }
  }

  // ===== TEMPLATE HANDLERS =====
  const handleApplyTemplate = async (templateEvents: any[]) => {
    if (!me) {
      showToast({ type: 'error', message: 'Please log in first' });
      return;
    }
    
    try {
      // Add the created_by field and ensure all required fields are present
      const eventsToInsert = templateEvents.map(event => ({
        ...event,
        created_by: me,
        visibility: event.visibility || 'private',
        source: event.source || 'personal',
        status: event.status || 'scheduled',
        rsvp_public: event.rsvp_public !== undefined ? event.rsvp_public : false,
        completed: false
      }));
      
      for (const event of eventsToInsert) {
        const { error } = await supabase.from('events').insert(event);
        if (error) {
          console.error('Error inserting template event:', error);
          throw error;
        }
      }
      
      await loadCalendar(); // Make sure to reload the calendar
      showToast({ type: 'success', message: '✨ Routine added to calendar!' });
    } catch (error) {
      console.error('Template application error:', error);
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
      completed: false
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
      .eq("id", selected.id)
      .eq("created_by", me); // Ensure user owns the event
      
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
      {/* Animated Background - Desktop only */}
      {!isMobile && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-20 w-96 h-96 bg-purple-200 rounded-full
                        mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
          <div className="absolute top-40 right-20 w-96 h-96 bg-pink-200 rounded-full
                        mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
          <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-yellow-200 rounded-full
                        mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
        </div>
      )}

      {/* Main Container */}
      <div className="relative z-10 container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-7xl">
        {/* Header - Enhanced Mobile Responsiveness */}
        <div className="mb-4 sm:mb-6 bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Title & Mode Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600
                           bg-clip-text text-transparent">
                Calendar
              </h1>

              <div className="flex rounded-full bg-white/90 shadow-md p-1">
                <button
                  onClick={() => setMode('my')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 transform ${
                    mode === 'my'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                      : 'text-gray-600 hover:text-gray-900 hover:scale-105'
                  }`}
                >
                  My Calendar
                </button>
                <button
                  onClick={() => setMode('whats')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 transform ${
                    mode === 'whats'
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg scale-105'
                      : 'text-gray-600 hover:text-gray-900 hover:scale-105'
                  }`}
                >
                  What's Happening
                </button>
              </div>
            </div>

            {/* Controls - Enhanced Mobile Scroll */}
            <div className="relative">
              <div className="overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex items-center gap-2 sm:gap-3 min-w-max">
                  {/* Create Button */}
                  <button
                    onClick={() => setOpenCreate(true)}
                    className="px-3 sm:px-4 py-2 rounded-full font-medium text-white
                             bg-gradient-to-r from-purple-600 to-pink-600
                             shadow-lg flex items-center gap-2 whitespace-nowrap
                             transform hover:scale-105 active:scale-95 transition-all duration-200"
                  >
                    <span className="text-lg">+</span>
                    <span className="text-sm sm:text-base">Event</span>
                  </button>

                  {/* Mobile Menu Toggle for Lists */}
                  {isMobile && mode === 'my' && (
                    <button
                      onClick={() => setMobileMenuOpen(true)}
                      className="px-3 sm:px-4 py-2 rounded-full bg-white shadow-md 
                               text-gray-600 flex items-center gap-2
                               transform hover:scale-105 active:scale-95 transition-all duration-200"
                    >
                      <span>📋</span>
                      <span className="text-xs sm:text-sm">Lists</span>
                      {(reminders.filter(r => !r.completed).length + todos.filter(t => !t.completed).length) > 0 && (
                        <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                          {reminders.filter(r => !r.completed).length + todos.filter(t => !t.completed).length}
                        </span>
                      )}
                    </button>
                  )}

                  {/* Feature Buttons with Hover Effects */}
                  <button
                    onClick={() => setShowAnalytics(true)}
                    className="p-2 rounded-full bg-white text-gray-600 shadow-md
                             transform hover:scale-110 hover:rotate-6 active:scale-95 transition-all duration-200"
                    title="View analytics"
                  >
                    📊
                  </button>

                  <button
                    onClick={() => setShowTemplates(true)}
                    className="p-2 rounded-full bg-white text-gray-600 shadow-md
                             transform hover:scale-110 hover:-rotate-6 active:scale-95 transition-all duration-200"
                    title="Smart templates"
                  >
                    ✨
                  </button>

                  <button
                    onClick={() => setShowMeetingCoordinator(true)}
                    className="p-2 rounded-full bg-white text-gray-600 shadow-md
                             transform hover:scale-110 hover:rotate-6 active:scale-95 transition-all duration-200"
                    title="Find meeting time"
                  >
                    🤝
                  </button>

                  {/* Moon Toggle with Animation */}
                  <button
                    onClick={() => setShowMoon(!showMoon)}
                    className={`p-2 rounded-full transition-all duration-300 transform ${
                      showMoon
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg scale-110 rotate-12'
                        : 'bg-white text-gray-600 shadow-md hover:scale-110 hover:-rotate-12'
                    } active:scale-95`}
                    title="Toggle moon phases"
                  >
                    🌙
                  </button>

                  {/* Keyboard Shortcuts - Desktop only */}
                  {!isMobile && (
                    <button
                      onClick={() => setShowShortcutsHelp(true)}
                      className="p-2 rounded-full bg-white text-gray-600 shadow-md
                               transform hover:scale-110 hover:rotate-6 active:scale-95 transition-all duration-200"
                      title="Keyboard shortcuts (press ?)"
                    >
                      ⌨️
                    </button>
                  )}
                </div>
              </div>
              
              {/* Scroll indicator for mobile */}
              {isMobile && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-gradient-to-l from-white via-white/80 to-transparent pr-2 pl-4 pointer-events-none">
                  <span className="text-gray-400 text-xs animate-pulse">→</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area - Enhanced Mobile Layout */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden">
          <div className="flex gap-4 p-2 sm:p-4">
            {/* Sidebar - Desktop only */}
            {mode === 'my' && !isMobile && (
              <div className="w-64 shrink-0 hidden lg:block">
                <div className="bg-white rounded-lg shadow-md">
                  
                  {/* Carpool Section */}
                  <div className="border-b">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-700">Carpool</h3>
                        <button
                          onClick={() => openCarpoolChat()}
                          className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600
                                   transform hover:scale-105 active:scale-95 transition-all duration-200"
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
                              className="p-2 border border-green-500 bg-gradient-to-br from-white to-green-50 rounded-lg cursor-pointer hover:shadow-md
                                       transform hover:scale-[1.02] transition-all duration-200"
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
                      ) : friends.length === 0 ? (
                        <div className="text-center py-3">
                          <p className="text-xs text-gray-400 mb-2">No friends added yet</p>
                          <button className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600
                                           transform hover:scale-105 active:scale-95 transition-all duration-200">
                            Invite Friends
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic mb-3">
                          No carpool matches found
                        </p>
                      )}

                      {/* Manual Carpool Button */}
                      <button
                        onClick={() => openCarpoolChat()}
                        className="w-full text-xs px-3 py-2 border border-blue-300 bg-gradient-to-br from-white to-blue-50 text-blue-700 rounded-lg
                                 hover:shadow-md transition-all flex items-center justify-center gap-2
                                 transform hover:scale-[1.02] active:scale-[0.98]"
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
                          <span className="transform transition-transform duration-200">{showRemindersList ? '▼' : '▶'}</span>
                          <span>Reminders ({visibleReminders.length})</span>
                        </button>
                        <button
                          onClick={() => {
                            setQuickModalType('reminder');
                            setQuickModalOpen(true);
                          }}
                          className="text-xs px-2 py-1 bg-amber-500 text-white rounded hover:bg-amber-600
                                   transform hover:scale-105 active:scale-95 transition-all duration-200"
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
                                className="rounded accent-amber-500"
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
                                  className={`group p-2 border border-amber-400 bg-gradient-to-br from-white to-amber-50 rounded-lg flex items-center gap-2
                                            hover:shadow-md transition-all duration-200
                                            transform hover:scale-[1.02] ${
                                    r.completed ? 'opacity-50' : ''
                                  }`}
                                  draggable={!isMobile}
                                  onDragStart={() => {
                                    if (!isMobile) {
                                      setDraggedItem({ id: r.id, title: r.title, type: 'reminder' });
                                      setDragType('reminder');
                                    }
                                  }}
                                  onDragEnd={() => {
                                    if (!isMobile) {
                                      setDraggedItem(null);
                                      setDragType('none');
                                    }
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={r.completed || false}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      toggleComplete(r.id, r.completed, 'reminder');
                                    }}
                                    className="rounded-sm cursor-pointer accent-amber-500"
                                  />
                                  <span className={`flex-1 text-sm text-amber-800 ${isMobile ? '' : 'cursor-move'} ${
                                    r.completed ? 'line-through' : ''
                                  }`}>
                                    {r.title}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteItem(r.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700
                                             text-xs transition-opacity transform hover:scale-110"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))
                            )}
                          </div>

                          {!isMobile && visibleReminders.length > 0 && (
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
                        <span className="transform transition-transform duration-200">{showTodosList ? '▼' : '▶'}</span>
                        <span>To-dos ({visibleTodos.length})</span>
                      </button>
                      <button
                        onClick={() => {
                          setQuickModalType('todo');
                          setQuickModalOpen(true);
                        }}
                        className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600
                                 transform hover:scale-105 active:scale-95 transition-all duration-200"
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
                                className={`group p-2 border border-green-400 bg-gradient-to-br from-white to-green-50 rounded-lg flex items-center gap-2
                                          hover:shadow-md transition-all duration-200
                                          transform hover:scale-[1.02] ${
                                  t.completed ? 'opacity-50' : ''
                                }`}
                                draggable={!isMobile}
                                onDragStart={() => {
                                  if (!isMobile) {
                                    setDraggedItem({ id: t.id, title: t.title, type: 'todo' });
                                    setDragType('todo');
                                  }
                                }}
                                onDragEnd={() => {
                                  if (!isMobile) {
                                    setDraggedItem(null);
                                    setDragType('none');
                                  }
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={t.completed || false}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleComplete(t.id, t.completed, 'todo');
                                  }}
                                  className="rounded-sm cursor-pointer accent-green-500"
                                />
                                <span className={`flex-1 text-sm text-green-700 ${isMobile ? '' : 'cursor-move'} ${
                                  t.completed ? 'line-through' : ''
                                }`}>
                                  {t.title}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteItem(t.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700
                                           text-xs transition-opacity transform hover:scale-110"
                                >
                                  ✕
                                </button>
                              </div>
                            ))
                          )}
                        </div>

                        {!isMobile && visibleTodos.length > 0 && (
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

            {/* Calendar Grid - Enhanced Mobile View */}
            <div className="flex-1 min-w-0">
              <div className={isMobile ? 'calendar-mobile-wrapper' : ''}>
                <CalendarGrid
                  dbEvents={calendarEvents as any}
                  moonEvents={showMoon ? moonEvents : []}
                  showMoon={showMoon}
                  showWeather={false}
                  theme="default"
                  date={date}
                  setDate={setDate}
                  view={view}
                  setView={setView}
                  onSelectSlot={onSelectSlot}
                  onSelectEvent={onSelectEvent}
                  onDrop={isMobile ? undefined : onDrop}
                  onResize={isMobile ? undefined : onResize}
                  externalDragType={isMobile ? 'none' : dragType}
                  externalDragTitle={draggedItem?.title}
                  onExternalDrop={isMobile ? undefined : onExternalDrop}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Lists Menu - Enhanced with Animations */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div 
              className="fixed inset-0 bg-black/50 transition-opacity duration-300" 
              onClick={() => setMobileMenuOpen(false)} 
            />
            
            <div className={`fixed left-0 top-0 h-full w-80 bg-white shadow-xl overflow-y-auto
                          transform transition-transform duration-300 ease-out
                          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
              <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <h2 className="font-semibold text-lg">My Lists</h2>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/20 transform hover:scale-110 active:scale-95 transition-all"
                >
                  ✕
                </button>
              </div>
              
              {/* Carpool Section */}
              <div className="border-b p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-700">Carpool</h3>
                  <button
                    onClick={() => {
                      openCarpoolChat();
                      setMobileMenuOpen(false);
                    }}
                    className="text-xs px-2 py-1 bg-green-500 text-white rounded
                             transform hover:scale-105 active:scale-95 transition-all"
                  >
                    + Start
                  </button>
                </div>

                {carpoolMatches.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {carpoolMatches.slice(0, 3).map((match, idx) => (
                      <div
                        key={idx}
                        className="p-2 border border-green-400 bg-gradient-to-br from-white to-green-50 rounded-lg active:shadow-md
                                 transform active:scale-95 transition-all"
                        onClick={() => {
                          openCarpoolChat(match.event);
                          setMobileMenuOpen(false);
                        }}
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
                ) : friends.length === 0 ? (
                  <div className="text-center py-3">
                    <p className="text-sm text-gray-400 mb-2">No friends added yet</p>
                    <button className="text-xs px-3 py-1 bg-blue-500 text-white rounded
                                     transform hover:scale-105 active:scale-95 transition-all">
                      Invite Friends
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    No carpool matches found
                  </p>
                )}
              </div>

              {/* Reminders Section */}
              <div className="border-b p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-700">
                    Reminders ({visibleReminders.length})
                  </h3>
                  <button
                    onClick={() => {
                      setQuickModalType('reminder');
                      setQuickModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="text-xs px-2 py-1 bg-amber-500 text-white rounded
                             transform hover:scale-105 active:scale-95 transition-all"
                  >
                    + Add
                  </button>
                </div>

                <div className="mb-2">
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={showCompletedItems}
                      onChange={(e) => setShowCompletedItems(e.target.checked)}
                      className="rounded accent-amber-500"
                    />
                    Show completed
                  </label>
                </div>
                
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {visibleReminders.length === 0 ? (
                    <p className="text-sm text-gray-400 italic p-2">No reminders yet</p>
                  ) : (
                    visibleReminders.map(r => (
                      <div key={r.id} className={`p-2 border border-amber-400 bg-gradient-to-br from-white to-amber-50 rounded-lg flex items-center gap-2
                                                active:shadow-md transition-all ${
                        r.completed ? 'opacity-50' : ''
                      }`}>
                        <input
                          type="checkbox"
                          checked={r.completed || false}
                          onChange={() => toggleComplete(r.id, r.completed, 'reminder')}
                          className="rounded-sm accent-amber-500"
                        />
                        <span className={`flex-1 text-sm text-amber-700 ${r.completed ? 'line-through' : ''}`}>
                          {r.title}
                        </span>
                        <button
                          onClick={() => deleteItem(r.id)}
                          className="text-red-500 text-xs transform hover:scale-110 active:scale-95 transition-all"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* To-dos Section */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-700">
                    To-dos ({visibleTodos.length})
                  </h3>
                  <button
                    onClick={() => {
                      setQuickModalType('todo');
                      setQuickModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="text-xs px-2 py-1 bg-green-500 text-white rounded
                             transform hover:scale-105 active:scale-95 transition-all"
                  >
                    + Add
                  </button>
                </div>
                
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {visibleTodos.length === 0 ? (
                    <p className="text-sm text-gray-400 italic p-2">No to-dos yet</p>
                  ) : (
                    visibleTodos.map(t => (
                      <div key={t.id} className={`p-2 border-2 border-green-400 bg-gradient-to-br from-white via-green-50/30 to-green-100/50 rounded-lg flex items-center gap-2
                                              active:shadow-lg transition-all ${
                        t.completed ? 'opacity-50' : ''
                      }`}>
                        <input
                          type="checkbox"
                          checked={t.completed || false}
                          onChange={() => toggleComplete(t.id, t.completed, 'todo')}
                          className="rounded-sm accent-green-500"
                        />
                        <span className={`flex-1 text-sm font-medium text-green-700 ${t.completed ? 'line-through' : ''}`}>
                          {t.title}
                        </span>
                        <button
                          onClick={() => deleteItem(t.id)}
                          className="text-red-500 text-xs transform hover:scale-110 active:scale-95 transition-all"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Modal for Custom Reminders/Todos - Enhanced Mobile */}
        {quickModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-black/50 transition-opacity duration-300" 
              onClick={() => setQuickModalOpen(false)} 
            />
            <div className={`relative bg-white rounded-xl shadow-2xl p-4 sm:p-6 max-w-md w-full
                          transform transition-all duration-300 scale-100
                          ${quickModalOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
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
                             focus:outline-none focus:ring-2 focus:ring-purple-500
                             transition-all duration-200"
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
                             focus:outline-none focus:ring-2 focus:ring-purple-500
                             transition-all duration-200"
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
                               focus:outline-none focus:ring-2 focus:ring-purple-500
                               transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input
                      type="time"
                      value={quickModalForm.time}
                      onChange={(e) => setQuickModalForm(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-purple-500
                               transition-all duration-200"
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
                        className="rounded accent-purple-500"
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
                          className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm
                                   focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                           hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed
                           transform hover:scale-105 active:scale-95 transition-all duration-200"
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
                           hover:bg-gray-300 transform hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Carpool Chat Modal - Enhanced Mobile */}
        {showCarpoolChat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-black/50 transition-opacity duration-300" 
              onClick={() => setShowCarpoolChat(false)} 
            />
            <div className={`relative bg-white rounded-xl shadow-2xl p-4 sm:p-6 max-w-md w-full
                          transform transition-all duration-300
                          ${showCarpoolChat ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
              <h3 className="text-lg font-semibold mb-4">
                🚗 Carpool Chat
              </h3>
              
              {selectedCarpoolEvent && (
                <div className="mb-4 p-3 border border-blue-300 bg-gradient-to-br from-white to-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-900">{selectedCarpoolEvent.title}</div>
                  <div className="text-xs text-blue-700">
                    {new Date(selectedCarpoolEvent.start_time).toLocaleString()}
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                {friends.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-gray-600 mb-4">No friends added yet</p>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                                     transform hover:scale-105 active:scale-95 transition-all duration-200">
                      Invite Friends to MyZenTribe
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
                      Select friends to add to this carpool group:
                    </p>
                    
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {friends.map(friend => (
                        <label key={friend.friend_id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded
                                                                 transition-colors cursor-pointer">
                          <input type="checkbox" className="rounded accent-green-500" />
                          <span className="text-sm">{friend.name}</span>
                          {friend.safe_to_carpool && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              Carpool safe
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex gap-3 mt-6">
                {friends.length > 0 && (
                  <button
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg
                             hover:bg-green-700 transform hover:scale-105 active:scale-95 transition-all duration-200"
                    onClick={() => {
                      showToast({ type: 'success', message: '✨ Carpool chat created!' });
                      setShowCarpoolChat(false);
                    }}
                  >
                    Start Chat
                  </button>
                )}
                <button
                  onClick={() => setShowCarpoolChat(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg
                           hover:bg-gray-300 transform hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  {friends.length === 0 ? 'Close' : 'Cancel'}
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
                message: '✨ Meeting scheduled! Invites sent to participants.' 
              });
              setShowMeetingCoordinator(false);
            }}
          />
        )}

        {/* Keyboard Shortcuts Help - Desktop only */}
        {!isMobile && (
          <KeyboardShortcutsHelp 
            open={showShortcutsHelp} 
            onClose={() => setShowShortcutsHelp(false)} 
          />
        )}
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
        
        /* Hide scrollbar for mobile horizontal scroll */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        /* Mobile calendar wrapper for better scroll behavior */
        .calendar-mobile-wrapper {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        
        /* Enhanced mobile calendar styles */
        @media (max-width: 640px) {
          .rbc-calendar {
            min-width: 100%;
            font-size: 0.75rem;
          }
          
          .rbc-toolbar {
            flex-direction: column;
            gap: 0.5rem;
            padding: 0.5rem;
          }
          
          .rbc-toolbar-label {
            font-size: 1rem;
            font-weight: bold;
          }
          
          .rbc-btn-group button {
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
          }
          
          .rbc-month-view {
            min-height: 400px;
          }
          
          .rbc-header {
            padding: 0.25rem;
            font-size: 0.7rem;
          }
          
          .rbc-date-cell {
            padding: 0.125rem;
            font-size: 0.75rem;
          }
          
          .rbc-event {
            font-size: 0.6rem;
            padding: 0.125rem;
          }
          
          .rbc-show-more {
            font-size: 0.6rem;
          }
          
          .rbc-day-view,
          .rbc-week-view {
            min-width: 100%;
          }
          
          .rbc-time-view {
            min-height: 500px;
          }
          
          .rbc-time-slot {
            min-height: 30px;
          }
          
          .rbc-timeslot-group {
            min-height: 60px;
          }
        }
      `}</style>
    </div>
  );
}
