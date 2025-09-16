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
import EventCarpoolModal from "./components/EventCarpoolModal";
import { useToast } from "@/components/ToastProvider";
import { useMoon } from "@/lib/useMoon";
// import { useKeyboardShortcuts, KeyboardShortcutsHelp } from "@/hooks/useKeyboardShortcuts"; // Commented out if not available
import type { DBEvent, Visibility } from "@/lib/types";

// Client-only calendar grid - prevent SSR
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
  date?: string;
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

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  feels_like: number;
  humidity: number;
  wind_speed: number;
}

// Moon phase icons
const MOON_ICONS = {
  'moon-new': '🌑',
  'moon-first': '🌓',
  'moon-full': '🌕',
  'moon-last': '🌗'
};

export default function CalendarPage() {
  // ===== TOAST SYSTEM =====
  const { showToast } = useToast();

  // ===== ALL HOOKS DECLARED AT TOP =====
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
  const [selectedFeedEvent, setSelectedFeedEvent] = useState<FeedEvent | null>(null);

  // UI toggles
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selected, setSelected] = useState<DBEvent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showMoon, setShowMoon] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [showCompletedItems, setShowCompletedItems] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showMeetingCoordinator, setShowMeetingCoordinator] = useState(false);
  // const [showShortcutsHelp, setShowShortcutsHelp] = useState(false); // Commented out if not available
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [quickModalType, setQuickModalType] = useState<'reminder' | 'todo'>('reminder');
  const [showCarpool, setShowCarpool] = useState(false);
  const [carpoolEvent, setCarpoolEvent] = useState<DBEvent | null>(null);

  // Todo/Reminder data
  const [reminders, setReminders] = useState<TodoReminder[]>([]);
  const [todos, setTodos] = useState<TodoReminder[]>([]);

  // Friends & Carpool
  const [friends, setFriends] = useState<Friend[]>([]);
  const [carpoolMatches, setCarpoolMatches] = useState<CarpoolMatch[]>([]);

  // Weather
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    start: "",
    end: "",
    location: "",
    visibility: "friends" as Visibility,
    allows_rsvp: false,
    hide_address_until_rsvp: false,
    rsvp_count_visible: false,
    media_files: [] as File[],
    selected_friends: [] as string[],
  });

  // Moon phases hook
  const moonPhases = useMoon();
  
  // Device detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ===== AUTHENTICATION CHECK =====
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToast({ type: 'error', message: 'Please sign in to access the calendar' });
        return;
      }
      setMe(user.id);
    }
    getUser();
  }, [showToast]);

  // ===== DATA FETCHING =====
  useEffect(() => {
    if (!me) return;
    fetchEvents();
    fetchTodosAndReminders();
    fetchFriends();
    if (mode === "whats") fetchFeedEvents();
  }, [me, mode]);

  // ===== WEATHER FETCHING =====
  const fetchWeather = async () => {
    setLoadingWeather(true);
    try {
      // Mock weather data for now - replace with real API when you have a key
      // For OpenWeatherMap, get your free API key at: https://openweathermap.org/api
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock weather data based on time of day
      const hour = new Date().getHours();
      const isMorning = hour >= 6 && hour < 12;
      const isEvening = hour >= 18 || hour < 6;
      
      setWeather({
        temp: isMorning ? 68 : isEvening ? 72 : 85,
        description: isMorning ? "Clear skies" : isEvening ? "Partly cloudy" : "Sunny",
        icon: isMorning ? "01d" : isEvening ? "02n" : "01d",
        feels_like: isMorning ? 65 : isEvening ? 70 : 88,
        humidity: 45,
        wind_speed: 8
      });
      
      showToast({ type: 'success', message: '☀️ Weather updated!' });
      
      /* 
      // Real API implementation - uncomment when you have an API key:
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=Greenville,TX&appid=YOUR_API_KEY&units=imperial`
      );
      const data = await response.json();
      setWeather({
        temp: Math.round(data.main.temp),
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        feels_like: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        wind_speed: Math.round(data.wind.speed)
      });
      */
    } catch (error) {
      console.error('Weather fetch error:', error);
      showToast({ type: 'error', message: 'Unable to fetch weather' });
    } finally {
      setLoadingWeather(false);
    }
  };

  // Fetch events
  const fetchEvents = async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .or(`created_by.eq.${me},visibility.eq.everyone`)
        .order("start_time", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (e: any) {
      setErr(e.message);
      showToast({ type: 'error', message: 'Failed to load events' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch todos and reminders
  const fetchTodosAndReminders = async () => {
    try {
      // Check if the table name is 'todo_reminders' or 'todos_reminders' in your Supabase
      // You may need to adjust this based on your actual table name
      const { data: remindersData, error: remindersError } = await supabase
        .from("todos_reminders") // Note: Check if your table is named 'todos_reminders' or 'todo_reminders'
        .select("*")
        .eq("user_id", me)
        .eq("type", "reminder")
        .order("start_time", { ascending: true });

      if (remindersError) {
        console.error('Reminders fetch error:', remindersError);
        // Try alternative table name
        const { data: altRemindersData } = await supabase
          .from("todo_reminders")
          .select("*")
          .eq("user_id", me)
          .eq("type", "reminder")
          .order("start_time", { ascending: true });
        
        if (altRemindersData) {
          setReminders((altRemindersData || []).map(r => ({
            ...r,
            type: 'reminder' as const,
            date: r.date || r.start_time
          })));
        }
      } else {
        setReminders((remindersData || []).map(r => ({
          ...r,
          type: 'reminder' as const,
          date: r.date || r.start_time
        })));
      }

      const { data: todosData, error: todosError } = await supabase
        .from("todos_reminders") // Note: Check table name
        .select("*")
        .eq("user_id", me)
        .eq("type", "todo")
        .order("start_time", { ascending: true });

      if (todosError) {
        console.error('Todos fetch error:', todosError);
        // Try alternative table name
        const { data: altTodosData } = await supabase
          .from("todo_reminders")
          .select("*")
          .eq("user_id", me)
          .eq("type", "todo")
          .order("start_time", { ascending: true });
        
        if (altTodosData) {
          setTodos((altTodosData || []).map(t => ({
            ...t,
            type: 'todo' as const,
            date: t.date || t.start_time
          })));
        }
      } else {
        setTodos((todosData || []).map(t => ({
          ...t,
          type: 'todo' as const,
          date: t.date || t.start_time
        })));
      }
    } catch (e: any) {
      console.error('Failed to fetch todos/reminders:', e);
      showToast({ type: 'warning', message: 'Could not load todos/reminders' });
    }
  };

  // Fetch friends
  const fetchFriends = async () => {
    try {
      const { data } = await supabase
        .from("friends")
        .select(`
          friend_id, 
          safe_to_carpool,
          profiles!friends_friend_id_fkey(
            name, 
            avatar_url
          )
        `)
        .eq("user_id", me)
        .eq("status", "accepted");

      if (data) {
        setFriends(data.map((f: any) => ({
          friend_id: f.friend_id,
          name: f.profiles?.name || "Friend",
          avatar_url: f.profiles?.avatar_url,
          safe_to_carpool: f.safe_to_carpool !== false // Default to true if not specified
        })));
      }
    } catch (e) {
      console.error('Failed to fetch friends:', e);
    }
  };

  // Fetch feed events
  const fetchFeedEvents = async () => {
    setFeedLoading(true);
    try {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("visibility", "everyone")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(20);

      setFeed((data || []).map(event => ({
        ...event,
        _dismissed: false,
        _eventSource: 'community' as const
      })));
    } catch (e) {
      console.error('Feed error:', e);
    } finally {
      setFeedLoading(false);
    }
  };

  // ===== CRUD OPERATIONS =====
  
  // Toggle todo/reminder completion
  const toggleItemCompletion = async (item: TodoReminder) => {
    try {
      // Try both possible table names
      const { error } = await supabase
        .from("todos_reminders") // Check your actual table name
        .update({ completed: !item.completed })
        .eq("id", item.id)
        .eq("user_id", me); // Add user check for security

      if (error) {
        // Try alternative table name
        const { error: altError } = await supabase
          .from("todo_reminders")
          .update({ completed: !item.completed })
          .eq("id", item.id)
          .eq("user_id", me);
        
        if (altError) throw altError;
      }

      // Update local state
      if (item.type === 'reminder') {
        setReminders(prev => prev.map(r => 
          r.id === item.id ? { ...r, completed: !r.completed } : r
        ));
      } else {
        setTodos(prev => prev.map(t => 
          t.id === item.id ? { ...t, completed: !t.completed } : t
        ));
      }

      showToast({ 
        type: 'success', 
        message: `${item.type === 'reminder' ? '🔔' : '✓'} ${item.completed ? 'Unmarked' : 'Marked as done'}!` 
      });
    } catch (e: any) {
      console.error('Update error:', e);
      showToast({ type: 'error', message: `Failed to update ${item.type}. Please refresh and try again.` });
    }
  };

  // Delete todo/reminder
  const deleteItem = async (id: string, type: 'reminder' | 'todo') => {
    try {
      const { error } = await supabase
        .from("todos_reminders") // Check your actual table name
        .delete()
        .eq("id", id)
        .eq("user_id", me); // Add user check for security

      if (error) {
        // Try alternative table name
        const { error: altError } = await supabase
          .from("todo_reminders")
          .delete()
          .eq("id", id)
          .eq("user_id", me);
        
        if (altError) throw altError;
      }

      if (type === 'reminder') {
        setReminders(prev => prev.filter(r => r.id !== id));
      } else {
        setTodos(prev => prev.filter(t => t.id !== id));
      }

      showToast({ type: 'success', message: `${type === 'reminder' ? '🗑️ Reminder' : '✓ Todo'} deleted` });
    } catch (e: any) {
      console.error('Delete error:', e);
      showToast({ type: 'error', message: `Failed to delete ${type}. Please refresh and try again.` });
    }
  };

  // Create quick todo/reminder
  const createQuickItem = async (title: string, type: 'reminder' | 'todo') => {
    if (!title.trim()) return;

    try {
      const newItemData = {
        user_id: me,
        title,
        type,
        completed: false,
        start_time: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("todos_reminders") // Check your actual table name
        .insert(newItemData)
        .select()
        .single();

      if (error) {
        // Try alternative table name
        const { data: altData, error: altError } = await supabase
          .from("todo_reminders")
          .insert(newItemData)
          .select()
          .single();
        
        if (altError) throw altError;
        
        const newItem: TodoReminder = {
          ...altData,
          type: type,
          date: altData.date || altData.start_time
        };

        if (type === 'reminder') {
          setReminders(prev => [...prev, newItem]);
        } else {
          setTodos(prev => [...prev, newItem]);
        }
      } else {
        const newItem: TodoReminder = {
          ...data,
          type: type,
          date: data.date || data.start_time
        };

        if (type === 'reminder') {
          setReminders(prev => [...prev, newItem]);
        } else {
          setTodos(prev => [...prev, newItem]);
        }
      }

      showToast({ 
        type: 'success', 
        message: `${type === 'reminder' ? '🔔 Reminder' : '✅ Todo'} created!` 
      });
      setQuickModalOpen(false);
    } catch (e: any) {
      console.error('Create error:', e);
      showToast({ type: 'error', message: `Failed to create ${type}. Please check your connection.` });
    }
  };

  // ===== CALENDAR NAVIGATION =====
  const onSelectSlot = useCallback((slotInfo: any) => {
    // Click on day in month view -> navigate to day view
    if (view === 'month') {
      setDate(slotInfo.start);
      setView('day');
      return;
    }

    // Click on time slot in day/week view -> create event
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
  }, [view]);

  const onSelectEvent = useCallback((evt: any) => {
    const r = evt.resource as any;
    // Ignore moon markers and other non-event items
    if (r?.moonPhase || r?.isMoon) return;
    
    setSelected(r as DBEvent);
    setDetailsOpen(true);
  }, []);

  // ===== DRAG & DROP HANDLERS =====
  const onDrop = async ({ event, start, end }: any) => {
    if (isMobile) return;
    const resource = event.resource as DBEvent;
    if (!resource?.id || resource.created_by !== me) return;

    try {
      const { error } = await supabase
        .from("events")
        .update({
          start_time: start.toISOString(),
          end_time: end.toISOString(),
        })
        .eq("id", resource.id);

      if (error) throw error;
      
      await fetchEvents();
      showToast({ type: 'success', message: '📅 Event moved!' });
    } catch (e: any) {
      showToast({ type: 'error', message: 'Failed to move event' });
    }
  };

  const onResize = async ({ event, start, end }: any) => {
    if (isMobile) return;
    const resource = event.resource as DBEvent;
    if (!resource?.id || resource.created_by !== me) return;

    try {
      const { error } = await supabase
        .from("events")
        .update({
          start_time: start.toISOString(),
          end_time: end.toISOString(),
        })
        .eq("id", resource.id);

      if (error) throw error;
      
      await fetchEvents();
      showToast({ type: 'success', message: '⏱️ Duration updated!' });
    } catch (e: any) {
      showToast({ type: 'error', message: 'Failed to resize event' });
    }
  };

  // ===== CARPOOL FUNCTIONALITY =====
  const openCarpoolForEvent = (event: DBEvent) => {
    setCarpoolEvent(event);
    setShowCarpool(true);
  };

  const findCarpoolMatches = useCallback(() => {
    const matches: CarpoolMatch[] = [];
    
    events.forEach(event => {
      const attendingFriends = friends.filter(friend => {
        // Check if friend is attending this event
        // You'll need to implement RSVP checking logic here
        return friend.safe_to_carpool;
      });

      if (attendingFriends.length > 0) {
        matches.push({
          event: event,
          friends: attendingFriends
        });
      }
    });

    setCarpoolMatches(matches);
  }, [events, friends]);

  useEffect(() => {
    if (friends.length > 0 && events.length > 0) {
      findCarpoolMatches();
    }
  }, [friends, events, findCarpoolMatches]);

  // ===== UI HELPERS =====
  const toLocalInput = (d: Date) => {
    const iso = d.toISOString();
    return iso.slice(0, 16);
  };

  // Calendar events for UI
  const dbUiEvents = useMemo(() => {
    const mainEvents = events.map((e) => ({
      id: e.id,
      title: e.title || "Event",
      start: new Date(e.start_time),
      end: new Date(e.end_time),
      resource: e,
    }));

    // Add reminders and todos to calendar
    const reminderEvents = reminders.map(r => ({
      id: r.id,
      title: r.title,
      start: new Date(r.date || r.start_time || new Date()),
      end: new Date(r.date || r.end_time || new Date()),
      resource: { ...r, event_type: 'reminder' }
    }));

    const todoEvents = todos.map(t => ({
      id: t.id,
      title: t.title,
      start: new Date(t.date || t.start_time || new Date()),
      end: new Date(t.date || t.end_time || new Date()),
      resource: { ...t, event_type: 'todo' }
    }));

    return [...mainEvents, ...reminderEvents, ...todoEvents];
  }, [events, reminders, todos]);

  // Moon events for calendar with proper icons
  const moonEvents = useMemo(() => {
    if (!showMoon) return [];
    
    return Object.entries(moonPhases).map(([date, phase]) => {
      // Map phase names to icons
      const phaseIcons: Record<string, string> = {
        'new': '🌑',
        'moon-new': '🌑',
        'first-quarter': '🌓',
        'moon-first': '🌓',
        'full': '🌕',
        'moon-full': '🌕',
        'last-quarter': '🌗',
        'moon-last': '🌗',
        'waxing-crescent': '🌒',
        'waxing-gibbous': '🌔',
        'waning-gibbous': '🌖',
        'waning-crescent': '🌘'
      };
      
      const icon = phaseIcons[phase] || phaseIcons[phase.replace('moon-', '')] || '🌙';
      
      return {
        id: `moon-${date}`,
        title: icon,
        start: new Date(date),
        end: new Date(date),
        allDay: true,
        resource: { 
          moonPhase: phase,
          isMoon: true,
          displayIcon: icon
        }
      };
    });
  }, [moonPhases, showMoon]);

  // Filtered items for display
  const visibleReminders = showCompletedItems 
    ? reminders 
    : reminders.filter(r => !r.completed);

  const visibleTodos = showCompletedItems
    ? todos
    : todos.filter(t => !t.completed);

  // ===== KEYBOARD SHORTCUTS =====
  // Commented out if useKeyboardShortcuts hook is not available
  /*
  const shortcutActions = {
    createEvent: () => setOpenCreate(true),
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
      setOpenCreate(false);
      setOpenEdit(false);
      setDetailsOpen(false);
      setShowAnalytics(false);
      setShowTemplates(false);
      setShowMeetingCoordinator(false);
      // setShowShortcutsHelp(false); // Commented out if not available
      setQuickModalOpen(false);
      setMobileMenuOpen(false);
      setShowCarpool(false);
    },
  };

  useKeyboardShortcuts(shortcutActions, !isMobile);
  */

  // ===== RENDER =====
  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl shadow-sm border-b border-purple-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Logo/Title */}
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                MyZenTribe Calendar
              </h1>
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                <span>{date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>

            {/* Center: Mode Toggle */}
            <div className="flex items-center gap-2 bg-purple-50 rounded-full p-1">
              <button
                onClick={() => setMode('my')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  mode === 'my'
                    ? 'bg-white shadow-sm text-purple-600'
                    : 'text-gray-600 hover:text-purple-600'
                }`}
              >
                My Calendar
              </button>
              <button
                onClick={() => setMode('whats')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  mode === 'whats'
                    ? 'bg-white shadow-sm text-purple-600'
                    : 'text-gray-600 hover:text-purple-600'
                }`}
              >
                What's Happening
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Mobile menu button */}
              {isMobile && mode === 'my' && (
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="px-3 py-2 rounded-full bg-white shadow-md text-gray-600 flex items-center gap-2"
                >
                  <span>📋</span>
                  <span className="text-xs">Lists</span>
                  {(visibleReminders.length + visibleTodos.length) > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                      {visibleReminders.length + visibleTodos.length}
                    </span>
                  )}
                </button>
              )}

              {/* Weather Button */}
              <button
                onClick={fetchWeather}
                disabled={loadingWeather}
                className="p-2 rounded-full bg-white text-gray-600 shadow-md hover:scale-110 transition-transform"
                title="Get weather update"
              >
                {loadingWeather ? '⏳' : '☁️'}
              </button>

              {/* Carpool Button */}
              <div className="relative">
                <button
                  onClick={() => setShowCarpool(true)}
                  className="p-2 rounded-full bg-white text-gray-600 shadow-md hover:scale-110 transition-transform"
                  title="Find carpool matches"
                >
                  🚗
                </button>
                {carpoolMatches.length > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 bg-green-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center">
                    {carpoolMatches.length}
                  </span>
                )}
              </div>

              {/* Templates */}
              <button
                onClick={() => setShowTemplates(true)}
                className="p-2 rounded-full bg-white text-gray-600 shadow-md hover:scale-110 transition-transform"
                title="Smart templates"
              >
                ✨
              </button>

              {/* Meeting Coordinator */}
              <button
                onClick={() => setShowMeetingCoordinator(true)}
                className="p-2 rounded-full bg-white text-gray-600 shadow-md hover:scale-110 transition-transform"
                title="Find meeting time"
              >
                🤝
              </button>

              {/* Analytics */}
              <button
                onClick={() => setShowAnalytics(true)}
                className="p-2 rounded-full bg-white text-gray-600 shadow-md hover:scale-110 transition-transform"
                title="View analytics"
              >
                📊
              </button>

              {/* Moon Toggle */}
              <button
                onClick={() => setShowMoon(!showMoon)}
                className={`p-2 rounded-full transition-all ${
                  showMoon
                    ? 'bg-purple-100 text-purple-600 shadow-inner'
                    : 'bg-white text-gray-600 shadow-md'
                }`}
                title="Toggle moon phases"
              >
                {showMoon ? '🌙' : '🌑'}
              </button>

              {/* Create Event Button */}
              {mode === 'my' && (
                <button
                  onClick={() => setOpenCreate(true)}
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                >
                  <span className="hidden sm:inline">+ Create Event</span>
                  <span className="sm:hidden">+</span>
                </button>
              )}
            </div>
          </div>

          {/* Weather Display */}
          {weather && (
            <div className="mt-2 px-4 py-2 bg-blue-50 rounded-lg flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                  {weather.temp > 80 ? '☀️' : weather.temp > 60 ? '⛅' : '☁️'}
                </span>
                <div>
                  <div className="font-semibold">{weather.temp}°F</div>
                  <div className="text-xs text-gray-600">Feels like {weather.feels_like}°</div>
                </div>
              </div>
              <div className="text-gray-600">
                {weather.description} • Wind {weather.wind_speed} mph • Humidity {weather.humidity}%
              </div>
            </div>
          )}

          {/* View Controls */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('month')}
                className={`px-3 py-1 rounded-md text-sm ${
                  view === 'month' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setView('week')}
                className={`px-3 py-1 rounded-md text-sm ${
                  view === 'week' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setView('day')}
                className={`px-3 py-1 rounded-md text-sm ${
                  view === 'day' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Day
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const newDate = new Date(date);
                  if (view === 'month') newDate.setMonth(newDate.getMonth() - 1);
                  else if (view === 'week') newDate.setDate(newDate.getDate() - 7);
                  else newDate.setDate(newDate.getDate() - 1);
                  setDate(newDate);
                }}
                className="p-1 rounded-md text-gray-600 hover:bg-gray-100"
              >
                ←
              </button>
              <button
                onClick={() => setDate(new Date())}
                className="px-3 py-1 rounded-md text-sm font-medium text-purple-600 hover:bg-purple-50"
              >
                Today
              </button>
              <button
                onClick={() => {
                  const newDate = new Date(date);
                  if (view === 'month') newDate.setMonth(newDate.getMonth() + 1);
                  else if (view === 'week') newDate.setDate(newDate.getDate() + 7);
                  else newDate.setDate(newDate.getDate() + 1);
                  setDate(newDate);
                }}
                className="p-1 rounded-md text-gray-600 hover:bg-gray-100"
              >
                →
              </button>
            </div>

            {/* Completed items toggle */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showCompletedItems}
                onChange={(e) => setShowCompletedItems(e.target.checked)}
                className="rounded text-purple-600 focus:ring-purple-500"
              />
              <span className="text-gray-600">Show completed</span>
            </label>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar (Desktop only) */}
          {!isMobile && mode === 'my' && (
            <div className="w-80 space-y-4">
              {/* Reminders */}
              <div className="bg-white/80 backdrop-blur-xl rounded-xl p-4 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center justify-between">
                  <span>🔔 Reminders ({visibleReminders.length})</span>
                  <button
                    onClick={() => {
                      setQuickModalType('reminder');
                      setQuickModalOpen(true);
                    }}
                    className="text-sm px-2 py-1 bg-amber-100 text-amber-700 rounded-md hover:bg-amber-200"
                  >
                    + Add
                  </button>
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {visibleReminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className={`p-2 rounded-lg border-l-4 border-amber-400 bg-amber-50 ${
                        reminder.completed ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={reminder.completed}
                          onChange={() => toggleItemCompletion(reminder)}
                          className="mt-1 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${
                            reminder.completed ? 'line-through text-gray-500' : 'text-gray-800'
                          }`}>
                            {reminder.title}
                          </div>
                          {reminder.description && (
                            <div className="text-xs text-gray-600 mt-0.5">
                              {reminder.description}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => deleteItem(reminder.id, 'reminder')}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                  {visibleReminders.length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-4">No reminders</p>
                  )}
                </div>
              </div>

              {/* Todos */}
              <div className="bg-white/80 backdrop-blur-xl rounded-xl p-4 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center justify-between">
                  <span>✅ To-dos ({visibleTodos.length})</span>
                  <button
                    onClick={() => {
                      setQuickModalType('todo');
                      setQuickModalOpen(true);
                    }}
                    className="text-sm px-2 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200"
                  >
                    + Add
                  </button>
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {visibleTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className={`p-2 rounded-lg border-l-4 border-green-400 bg-green-50 ${
                        todo.completed ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => toggleItemCompletion(todo)}
                          className="mt-1 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${
                            todo.completed ? 'line-through text-gray-500' : 'text-gray-800'
                          }`}>
                            {todo.title}
                          </div>
                          {todo.description && (
                            <div className="text-xs text-gray-600 mt-0.5">
                              {todo.description}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => deleteItem(todo.id, 'todo')}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                  {visibleTodos.length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-4">No to-dos</p>
                  )}
                </div>
              </div>

              {/* Carpool Matches */}
              {carpoolMatches.length > 0 && (
                <div className="bg-white/80 backdrop-blur-xl rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-3">
                    🚗 Carpool Opportunities ({carpoolMatches.length})
                  </h3>
                  <div className="space-y-2">
                    {carpoolMatches.slice(0, 3).map((match) => (
                      <div
                        key={match.event.id}
                        className="p-2 rounded-lg bg-green-50 border border-green-200 cursor-pointer hover:bg-green-100"
                        onClick={() => openCarpoolForEvent(match.event)}
                      >
                        <div className="text-sm font-medium text-gray-800">
                          {match.event.title}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {match.friends.length} friend{match.friends.length !== 1 ? 's' : ''} attending
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Calendar or Feed */}
          <div className="flex-1">
            {mode === 'my' ? (
              <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-sm p-4">
                {loading ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                  </div>
                ) : err ? (
                  <div className="text-red-500 text-center py-12">{err}</div>
                ) : (
                  <CalendarGrid
                    dbEvents={events}
                    moonEvents={moonEvents}
                    showMoon={showMoon}
                    theme={calendarTheme}
                    date={date}
                    setDate={setDate}
                    view={view}
                    setView={setView}
                    onSelectSlot={onSelectSlot}
                    onSelectEvent={onSelectEvent}
                    onDrop={onDrop}
                    onResize={onResize}
                  />
                )}
              </div>
            ) : (
              // Feed View
              <div className="space-y-4">
                {feedLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                  </div>
                ) : feed.length === 0 ? (
                  <div className="bg-white/80 backdrop-blur-xl rounded-xl p-8 text-center">
                    <p className="text-gray-500">No upcoming community events</p>
                  </div>
                ) : (
                  feed.filter(e => !e._dismissed).map((event) => (
                    <div
                      key={event.id}
                      className="bg-white/80 backdrop-blur-xl rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-800">{event.title}</h3>
                          <p className="text-gray-600 text-sm mt-1">{event.description}</p>
                          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                            <span>📅 {new Date(event.start_time).toLocaleDateString()}</span>
                            <span>⏰ {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {event.location && <span>📍 {event.location}</span>}
                          </div>
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={() => {
                                setSelectedFeedEvent(event);
                                setDetailsOpen(true);
                              }}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => setFeed(prev => prev.map(e => 
                                e.id === event.id ? { ...e, _dismissed: true } : e
                              ))}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu (Slide-out) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-xl overflow-y-auto">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Lists & Tools</h3>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Show completed toggle */}
              <label className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={showCompletedItems}
                  onChange={(e) => setShowCompletedItems(e.target.checked)}
                  className="rounded text-purple-600"
                />
                <span className="text-sm text-gray-700">Show completed items</span>
              </label>

              {/* Reminders */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center justify-between">
                  <span>🔔 Reminders ({visibleReminders.length})</span>
                  <button
                    onClick={() => {
                      setQuickModalType('reminder');
                      setQuickModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded"
                  >
                    + Add
                  </button>
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {visibleReminders.map((reminder) => (
                    <div key={reminder.id} className="p-2 bg-amber-50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={reminder.completed}
                          onChange={() => toggleItemCompletion(reminder)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className={`text-sm ${reminder.completed ? 'line-through' : ''}`}>
                            {reminder.title}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteItem(reminder.id, 'reminder')}
                          className="text-red-500"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Todos */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center justify-between">
                  <span>✅ To-dos ({visibleTodos.length})</span>
                  <button
                    onClick={() => {
                      setQuickModalType('todo');
                      setQuickModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded"
                  >
                    + Add
                  </button>
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {visibleTodos.map((todo) => (
                    <div key={todo.id} className="p-2 bg-green-50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => toggleItemCompletion(todo)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className={`text-sm ${todo.completed ? 'line-through' : ''}`}>
                            {todo.title}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteItem(todo.id, 'todo')}
                          className="text-red-500"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Modal */}
      {quickModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              Add {quickModalType === 'reminder' ? 'Reminder' : 'To-do'}
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createQuickItem(formData.get('title') as string, quickModalType);
              }}
            >
              <input
                name="title"
                type="text"
                placeholder={`Enter ${quickModalType} title...`}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                autoFocus
                required
              />
              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setQuickModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateEventModal
        open={openCreate}
        setOpen={setOpenCreate}
        form={form}
        setForm={setForm}
        onSuccess={() => {
          fetchEvents();
          setOpenCreate(false);
          setForm({
            title: "",
            description: "",
            start: "",
            end: "",
            location: "",
            visibility: "friends",
            allows_rsvp: false,
            hide_address_until_rsvp: false,
            rsvp_count_visible: false,
            media_files: [],
            selected_friends: [],
          });
        }}
        currentUserId={me || ''}
        onOpenCarpool={(event) => openCarpoolForEvent(event)}
      />

      <EventDetails
        event={detailsOpen ? (selectedFeedEvent || selected) : null}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedFeedEvent(null);
          setSelected(null);
        }}
        onEdit={(event) => {
          setSelected(event);
          setOpenEdit(true);
        }}
        onDelete={(id) => {
          fetchEvents();
          setDetailsOpen(false);
        }}
        currentUserId={me}
        onOpenCarpool={(event) => openCarpoolForEvent(event)}
      />

      {showAnalytics && (
        <CalendarAnalytics
          events={events}
          onClose={() => setShowAnalytics(false)}
        />
      )}

      {showTemplates && (
        <SmartTemplates
          onSelectTemplate={(template) => {
            setForm(prev => ({
              ...prev,
              ...template
            }));
            setOpenCreate(true);
            setShowTemplates(false);
          }}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {showMeetingCoordinator && (
        <SmartMeetingCoordinator
          friends={friends}
          events={events}
          onSchedule={(meeting) => {
            setForm(prev => ({
              ...prev,
              ...meeting
            }));
            setOpenCreate(true);
            setShowMeetingCoordinator(false);
          }}
          onClose={() => setShowMeetingCoordinator(false)}
        />
      )}

      {showCarpool && (
        <EventCarpoolModal
          isOpen={showCarpool}
          onClose={() => {
            setShowCarpool(false);
            setCarpoolEvent(null);
          }}
          event={carpoolEvent}
          userId={me}
          carpoolData={{
            carpoolMatches: carpoolMatches,
            friends: friends,
            sendCarpoolInvite: async (matchId: string, message?: string) => {
              // Implementation for sending invites
              try {
                await supabase.from("carpool_invites").insert({
                  match_id: matchId,
                  sender_id: me,
                  message: message
                });
                showToast({ type: 'success', message: 'Invite sent!' });
                return { success: true };
              } catch (error) {
                showToast({ type: 'error', message: 'Failed to send invite' });
                return { success: false };
              }
            },
            createCarpoolGroup: async (eventId: string, friendIds: string[], message?: string) => {
              // Implementation for creating carpool group
              try {
                const { data, error } = await supabase
                  .from("carpool_groups")
                  .insert({
                    event_id: eventId,
                    organizer_id: me,
                    members: [...friendIds, me],
                    message: message
                  })
                  .select()
                  .single();

                if (error) throw error;

                // Send notifications
                await Promise.all(friendIds.map(friendId => 
                  supabase.from("notifications").insert({
                    user_id: friendId,
                    type: "carpool_invite",
                    title: `Carpool invitation`,
                    message: message || "You've been invited to carpool!",
                    data: { group_id: data.id, event_id: eventId }
                  })
                ));

                showToast({ type: 'success', message: '🚗 Carpool group created!' });
                return { success: true, data };
              } catch (error) {
                showToast({ type: 'error', message: 'Failed to create group' });
                return { success: false };
              }
            }
          }}
          showToast={showToast}
          isMobile={isMobile}
        />
      )}

      {/* Keyboard Shortcuts Help - Commented out if not available */}
      {/* {showShortcutsHelp && (
        <KeyboardShortcutsHelp onClose={() => setShowShortcutsHelp(false)} />
      )} */}
    </div>
  );
}
