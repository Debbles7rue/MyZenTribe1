// app/(protected)/calendar/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import CalendarGrid, { type UiEvent } from "@/components/CalendarGrid";
import EventDetails from "@/components/EventDetails";
import CreateEventModal from "@/components/CreateEventModal";
import CalendarThemeSelector from "@/components/CalendarThemeSelector";
import WeatherBadge from "@/components/WeatherBadge";
import { useToast } from "@/components/ToastProvider";
import { useMoon } from "@/lib/useMoon";
import type { DBEvent, Visibility } from "@/lib/types";
import type { View } from "react-big-calendar";
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  addDays,
  addMonths,
} from "date-fns";

// Weather data interface
interface WeatherData {
  date: string;
  temp: number;
  tempMin: number;
  tempMax: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy' | 'foggy' | 'partly-cloudy';
  description: string;
  humidity?: number;
  windSpeed?: number;
}

// Friend interface (if you have friends features)
interface Friend {
  friend_id: string;
  name: string;
  avatar_url?: string;
  carpool_flag?: boolean;
}

// Todo/Reminder interfaces
interface TodoReminder {
  id: string;
  title: string;
  due_date?: string;
  completed?: boolean;
  type: 'todo' | 'reminder';
  created_by: string;
}

export default function CalendarPage() {
  const { showToast } = useToast();
  
  // Core calendar states
  const [me, setMe] = useState<string | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>("month");
  const [calendarEvents, setCalendarEvents] = useState<DBEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Calendar features states
  const [showMoon, setShowMoon] = useState(true);
  const [calendarTheme, setCalendarTheme] = useState<string>("default");
  const [calendarMode, setCalendarMode] = useState<'my-calendar' | 'whats-happening'>('my-calendar');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  
  // Weather states
  const [weatherEnabled, setWeatherEnabled] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [temperatureUnit, setTemperatureUnit] = useState<'celsius' | 'fahrenheit'>('fahrenheit');
  const [weatherAnimations, setWeatherAnimations] = useState(true);
  
  // Sidebar states (todos, reminders)
  const [todos, setTodos] = useState<TodoReminder[]>([]);
  const [reminders, setReminders] = useState<TodoReminder[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dragType, setDragType] = useState<'none' | 'reminder' | 'todo'>('none');
  const [draggedItem, setDraggedItem] = useState<TodoReminder | null>(null);
  
  // Modal states
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selected, setSelected] = useState<DBEvent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Friends states (if you have friends features)
  const [friends, setFriends] = useState<Friend[]>([]);
  const [carpoolMatches, setCarpoolMatches] = useState<any[]>([]);
  
  // Form state
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
  
  // Get moon events using the moon hook
  const currentYear = date.getFullYear();
  const moonEvents = useMoon(currentYear, showMoon);
  
  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Helper function for date formatting
  const toLocalInput = useCallback((d: Date) => {
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }, []);
  
  // Weather functions
  const mapWeatherCode = (code: number): WeatherData['condition'] => {
    if (code === 0) return 'sunny';
    if (code <= 3) return 'partly-cloudy';
    if (code <= 48) return 'foggy';
    if (code <= 67) return 'rainy';
    if (code <= 77) return 'snowy';
    if (code >= 95) return 'stormy';
    return 'cloudy';
  };
  
  const getWeatherDescription = (code: number): string => {
    const descriptions: Record<number, string> = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      51: 'Light drizzle',
      61: 'Slight rain',
      71: 'Slight snow',
      80: 'Rain showers',
      95: 'Thunderstorm',
    };
    return descriptions[code] || 'Variable';
  };
  
  const fetchWeatherData = useCallback(async () => {
    if (!weatherEnabled) return;
    
    setWeatherLoading(true);
    try {
      // Get user location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { 
          timeout: 5000,
          enableHighAccuracy: false 
        });
      });
      
      const { latitude, longitude } = position.coords;
      const days = view === 'month' ? 30 : view === 'week' ? 7 : 1;
      
      // Fetch from Open-Meteo (free, no API key needed!)
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?` +
        `latitude=${latitude}&longitude=${longitude}` +
        `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum,windspeed_10m_max` +
        `&temperature_unit=${temperatureUnit === 'celsius' ? 'celsius' : 'fahrenheit'}` +
        `&forecast_days=${days}` +
        `&timezone=auto`
      );
      
      const data = await response.json();
      
      if (data.daily) {
        const weatherDays: WeatherData[] = data.daily.time.map((date: string, i: number) => ({
          date,
          temp: Math.round((data.daily.temperature_2m_max[i] + data.daily.temperature_2m_min[i]) / 2),
          tempMin: Math.round(data.daily.temperature_2m_min[i]),
          tempMax: Math.round(data.daily.temperature_2m_max[i]),
          condition: mapWeatherCode(data.daily.weather_code[i]),
          description: getWeatherDescription(data.daily.weather_code[i]),
          windSpeed: Math.round(data.daily.windspeed_10m_max[i] || 0),
        }));
        
        setWeatherData(weatherDays);
      }
    } catch (error) {
      console.error('Weather fetch error:', error);
      // Default to Greenville, TX if geolocation fails
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?` +
          `latitude=33.1384&longitude=-96.1108` +
          `&daily=temperature_2m_max,temperature_2m_min,weather_code` +
          `&temperature_unit=${temperatureUnit === 'celsius' ? 'celsius' : 'fahrenheit'}` +
          `&forecast_days=7&timezone=auto`
        );
        const data = await response.json();
        // Process data same as above...
      } catch {
        showToast({ type: 'info', message: '📍 Weather unavailable' });
      }
    } finally {
      setWeatherLoading(false);
    }
  }, [weatherEnabled, view, temperatureUnit, showToast]);
  
  // Load user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);
  
  // Load weather when enabled
  useEffect(() => {
    if (weatherEnabled) {
      fetchWeatherData();
    }
  }, [weatherEnabled, fetchWeatherData]);
  
  // Load calendar events
  const loadCalendar = useCallback(async () => {
    if (!me) return;
    setLoading(true);
    
    try {
      let query = supabase.from("events").select("*");
      
      if (calendarMode === 'my-calendar') {
        query = query.eq('created_by', me);
      } else {
        query = query.or(`created_by.eq.${me},visibility.in.(public,friends)`);
      }
      
      const { data, error } = await query.order("start_time", { ascending: true });
      
      if (error) throw error;
      
      const safe = (data || []).filter((e: any) => e?.start_time && e?.end_time);
      setCalendarEvents(safe);
    } catch (error: any) {
      console.error("Load calendar error:", error);
      showToast({ type: 'error', message: 'Failed to load events' });
    } finally {
      setLoading(false);
    }
  }, [me, calendarMode, showToast]);
  
  // Load todos and reminders
  const loadTodosAndReminders = useCallback(async () => {
    if (!me) return;
    
    try {
      const { data: todoData } = await supabase
        .from("todos")
        .select("*")
        .eq('created_by', me)
        .eq('completed', false)
        .order('due_date', { ascending: true });
      
      const { data: reminderData } = await supabase
        .from("reminders")
        .select("*")
        .eq('created_by', me)
        .order('reminder_time', { ascending: true });
      
      setTodos((todoData || []).map(t => ({ ...t, type: 'todo' as const })));
      setReminders((reminderData || []).map(r => ({ ...r, type: 'reminder' as const })));
    } catch (error) {
      console.error("Load todos/reminders error:", error);
    }
  }, [me]);
  
  // Load friends (if you have this feature)
  const loadFriends = useCallback(async () => {
    if (!me) return;
    
    try {
      const { data } = await supabase
        .from("friends")
        .select("*")
        .eq('user_id', me);
      
      setFriends(data || []);
    } catch (error) {
      console.error("Load friends error:", error);
    }
  }, [me]);
  
  // Load all data when user is ready
  useEffect(() => {
    if (me) {
      loadCalendar();
      loadTodosAndReminders();
      loadFriends();
    }
  }, [me, loadCalendar, loadTodosAndReminders, loadFriends]);
  
  // Calendar event handlers
  const onSelectSlot = useCallback((slotInfo: any) => {
    const start = slotInfo.start || new Date();
    const end = slotInfo.end || new Date(start.getTime() + 3600000);
    
    setForm(prev => ({
      ...prev,
      start: toLocalInput(start),
      end: toLocalInput(end)
    }));
    setOpenCreate(true);
  }, [toLocalInput]);
  
  const onSelectEvent = useCallback((evt: UiEvent) => {
    const r = evt.resource as any;
    if (r?.moonPhase) return; // Ignore moon events
    setSelected(r as DBEvent);
    setDetailsOpen(true);
  }, []);
  
  const onDrop = async ({ event, start, end }: any) => {
    const r = (event.resource || {}) as DBEvent;
    if (!me || r.created_by !== me) {
      showToast({ type: 'error', message: 'You can only move your own events' });
      return;
    }
    
    const { error } = await supabase
      .from("events")
      .update({ start_time: start.toISOString(), end_time: end.toISOString() })
      .eq("id", r.id);
    
    if (!error) {
      showToast({ type: 'success', message: 'Event moved!' });
      loadCalendar();
    }
  };
  
  const onResize = async ({ event, start, end }: any) => {
    const r = (event.resource || {}) as DBEvent;
    if (!me || r.created_by !== me) {
      showToast({ type: 'error', message: 'You can only resize your own events' });
      return;
    }
    
    const { error } = await supabase
      .from("events")
      .update({ start_time: start.toISOString(), end_time: end.toISOString() })
      .eq("id", r.id);
    
    if (!error) {
      showToast({ type: 'success', message: 'Event resized!' });
      loadCalendar();
    }
  };
  
  // Handle external drop from sidebar
  const onExternalDrop = useCallback(async (
    info: { start: Date; end: Date; allDay?: boolean },
    type: 'reminder' | 'todo'
  ) => {
    if (!draggedItem || !me) return;
    
    const payload = {
      title: draggedItem.title,
      description: `Created from ${type}`,
      start_time: info.start.toISOString(),
      end_time: info.end.toISOString(),
      all_day: info.allDay || false,
      event_type: type,
      visibility: 'private' as Visibility,
      created_by: me,
      source: 'personal' as const,
    };
    
    const { error } = await supabase.from("events").insert(payload);
    
    if (!error) {
      showToast({ type: 'success', message: `${type === 'todo' ? 'Todo' : 'Reminder'} added to calendar!` });
      loadCalendar();
    }
    
    setDragType('none');
    setDraggedItem(null);
  }, [draggedItem, me, showToast, loadCalendar]);
  
  // Create event
  const createEvent = async () => {
    if (!me || !form.title || !form.start || !form.end) {
      showToast({ type: 'error', message: 'Please fill required fields' });
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
      source: form.source,
    };
    
    const { error } = await supabase.from("events").insert(payload);
    if (!error) {
      setOpenCreate(false);
      resetForm();
      showToast({ type: 'success', message: '✨ Event created!' });
      loadCalendar();
    }
  };
  
  // Update event
  const updateEvent = async () => {
    if (!selected || !me) return;
    
    const { error } = await supabase
      .from("events")
      .update({
        title: form.title,
        description: form.description || null,
        location: form.location || null,
        start_time: new Date(form.start).toISOString(),
        end_time: new Date(form.end).toISOString(),
        visibility: form.visibility,
      })
      .eq("id", selected.id)
      .eq("created_by", me);
    
    if (!error) {
      setOpenEdit(false);
      setSelected(null);
      resetForm();
      showToast({ type: 'success', message: '✨ Event updated!' });
      loadCalendar();
    }
  };
  
  // Handle edit
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
  
  // Filtered events based on search and filters
  const filteredEvents = useMemo(() => {
    let events = calendarEvents;
    
    if (searchQuery) {
      events = events.filter(e => 
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedEventTypes.length > 0) {
      events = events.filter(e => 
        selectedEventTypes.includes(e.event_type || 'default')
      );
    }
    
    return events;
  }, [calendarEvents, searchQuery, selectedEventTypes]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-lavender-50 to-purple-100 relative">
      {/* Weather animations overlay */}
      {weatherAnimations && weatherEnabled && weatherData.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-0">
          {weatherData[0]?.condition === 'sunny' && (
            <div className="absolute top-10 right-10 w-32 h-32 bg-yellow-300 rounded-full opacity-20 animate-pulse" />
          )}
          {weatherData[0]?.condition === 'cloudy' && (
            <div className="absolute inset-0 bg-gray-200 opacity-10" />
          )}
          {weatherData[0]?.condition === 'rainy' && (
            <div className="absolute inset-0 bg-blue-200 opacity-10" />
          )}
        </div>
      )}
      
      <div className="relative z-10 container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6 bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-4">
          <div className="flex flex-col gap-4">
            {/* Title and Mode Toggle */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Calendar Hub
              </h1>
              
              {/* Mode Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCalendarMode('my-calendar')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    calendarMode === 'my-calendar'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  My Calendar
                </button>
                <button
                  onClick={() => setCalendarMode('whats-happening')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    calendarMode === 'whats-happening'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  What's Happening
                </button>
              </div>
              
              {/* Theme Selector */}
              <CalendarThemeSelector
                currentTheme={calendarTheme}
                onThemeChange={setCalendarTheme}
              />
            </div>
            
            {/* Controls Row */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Moon Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMoon}
                  onChange={(e) => setShowMoon(e.target.checked)}
                  className="w-4 h-4 rounded accent-purple-600"
                />
                <span className="text-sm font-medium">🌙 Moon</span>
              </label>
              
              {/* Weather Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={weatherEnabled}
                  onChange={(e) => setWeatherEnabled(e.target.checked)}
                  className="w-4 h-4 rounded accent-purple-600"
                />
                <span className="text-sm font-medium">🌤️ Weather</span>
              </label>
              
              {/* Weather Animations (if weather enabled) */}
              {weatherEnabled && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={weatherAnimations}
                    onChange={(e) => setWeatherAnimations(e.target.checked)}
                    className="w-4 h-4 rounded accent-purple-600"
                  />
                  <span className="text-sm font-medium">✨ Animations</span>
                </label>
              )}
              
              {/* Temperature Unit (if weather enabled) */}
              {weatherEnabled && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTemperatureUnit('fahrenheit')}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      temperatureUnit === 'fahrenheit'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200'
                    }`}
                  >
                    °F
                  </button>
                  <button
                    onClick={() => setTemperatureUnit('celsius')}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      temperatureUnit === 'celsius'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200'
                    }`}
                  >
                    °C
                  </button>
                </div>
              )}
              
              {/* Weather Badge */}
              <WeatherBadge />
              
              {/* Analytics Button */}
              <button className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-all">
                📊 Analytics
              </button>
              
              {/* Templates Button */}
              <button className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-all">
                📝 Templates
              </button>
              
              {/* Create Event Button */}
              <button
                onClick={() => setOpenCreate(true)}
                className="ml-auto px-4 py-2 rounded-full font-medium text-white
                         bg-gradient-to-r from-purple-600 to-pink-600
                         shadow-lg hover:shadow-xl transform hover:scale-105 
                         active:scale-95 transition-all duration-200"
              >
                + New Event
              </button>
            </div>
            
            {/* Weather Forecast Strip (if enabled) */}
            {weatherEnabled && weatherData.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {weatherData.slice(0, view === 'month' ? 5 : view === 'week' ? 7 : 1).map((day) => (
                  <div
                    key={day.date}
                    className="flex-shrink-0 p-2 bg-white/80 rounded-lg border border-purple-200
                             shadow-sm hover:shadow-md transition-all min-w-[100px]"
                  >
                    <div className="text-xs font-medium text-gray-600">
                      {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xl">
                        {day.condition === 'sunny' && '☀️'}
                        {day.condition === 'partly-cloudy' && '⛅'}
                        {day.condition === 'cloudy' && '☁️'}
                        {day.condition === 'rainy' && '🌧️'}
                        {day.condition === 'stormy' && '⛈️'}
                        {day.condition === 'snowy' && '❄️'}
                        {day.condition === 'foggy' && '🌫️'}
                      </span>
                      <div className="text-right">
                        <div className="text-sm font-bold">{day.temp}°</div>
                        <div className="text-xs text-gray-500">
                          {day.tempMin}°/{day.tempMax}°
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 mt-1 capitalize">{day.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex gap-4">
          {/* Sidebar (Desktop) */}
          {!isMobile && sidebarOpen && (
            <div className="w-64 bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-4">
              <div className="space-y-4">
                {/* Reminders Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-700">Reminders</h3>
                    <button 
                      className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200"
                      onClick={() => {/* Add reminder logic */}}
                    >
                      + Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {reminders.slice(0, 5).map((reminder) => (
                      <div
                        key={reminder.id}
                        draggable
                        onDragStart={() => {
                          setDragType('reminder');
                          setDraggedItem(reminder);
                        }}
                        className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg cursor-move
                                 hover:shadow-md transition-all text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span>⏰</span>
                          <span className="truncate">{reminder.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* To-Dos Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-700">To-Dos</h3>
                    <button 
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                      onClick={() => {/* Add todo logic */}}
                    >
                      + Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {todos.slice(0, 5).map((todo) => (
                      <div
                        key={todo.id}
                        draggable
                        onDragStart={() => {
                          setDragType('todo');
                          setDraggedItem(todo);
                        }}
                        className="p-2 bg-green-50 border border-green-200 rounded-lg cursor-move
                                 hover:shadow-md transition-all text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={todo.completed}
                            onChange={() => {/* Toggle logic */}}
                            className="w-3 h-3"
                          />
                          <span className={`truncate ${todo.completed ? 'line-through' : ''}`}>
                            {todo.title}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Carpool Matches (if any) */}
                {carpoolMatches.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">🚗 Carpool Matches</h3>
                    <div className="space-y-2">
                      {carpoolMatches.map((match) => (
                        <div key={match.id} className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                          {match.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Calendar Grid */}
          <div className={`flex-1 ${weatherEnabled ? 'weather-enhanced' : ''}`}>
            <CalendarGrid
              dbEvents={filteredEvents}
              moonEvents={moonEvents}
              showMoon={showMoon}
              showWeather={false} // We handle weather display externally
              theme={calendarTheme}
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
        
        {/* Mobile Bottom Menu */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-2 z-20">
            <div className="flex justify-around">
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 text-purple-600"
              >
                📋 Lists
              </button>
              <button className="p-2 text-purple-600">
                🌙 {showMoon ? 'Hide' : 'Show'} Moon
              </button>
              <button className="p-2 text-purple-600">
                🌤️ Weather
              </button>
              <button 
                onClick={() => setOpenCreate(true)}
                className="p-2 bg-purple-600 text-white rounded-full"
              >
                +
              </button>
            </div>
          </div>
        )}
        
        {/* Mobile Lists Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div 
              className="fixed inset-0 bg-black/50" 
              onClick={() => setMobileMenuOpen(false)} 
            />
            <div className="fixed left-0 top-0 h-full w-80 bg-white shadow-xl overflow-y-auto p-4">
              {/* Mobile sidebar content */}
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="mb-4 text-gray-600"
              >
                ← Close
              </button>
              {/* Copy sidebar content here for mobile */}
            </div>
          </div>
        )}
        
        {/* Modals */}
        <EventDetails 
          event={selected} 
          onClose={() => {
            setDetailsOpen(false);
            setSelected(null);
          }}
          onEdit={handleEdit}
          isOwner={selected?.created_by === me}
        />
        
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
          friends={friends}
        />
        
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
          friends={friends}
          isEdit={true}
        />
      </div>
      
      {/* Weather-based calendar styling */}
      {weatherEnabled && weatherData.length > 0 && (
        <style jsx>{`
          .weather-enhanced .rbc-today {
            background: ${
              weatherData[0]?.condition === 'sunny'
                ? 'linear-gradient(135deg, rgba(254,240,138,0.1) 0%, rgba(163,230,253,0.1) 100%)'
                : weatherData[0]?.condition === 'rainy'
                ? 'linear-gradient(135deg, rgba(203,213,225,0.1) 0%, rgba(100,116,139,0.1) 100%)'
                : 'rgba(139, 92, 246, 0.08)'
            } !important;
          }
          
          .weather-enhanced .calendar-wrapper {
            box-shadow: ${
              weatherData[0]?.condition === 'sunny'
                ? '0 0 40px rgba(255, 204, 0, 0.15)'
                : weatherData[0]?.condition === 'rainy'
                ? '0 0 40px rgba(100, 150, 200, 0.15)'
                : '0 0 30px rgba(139, 92, 246, 0.1)'
            };
          }
        `}</style>
      )}
    </div>
  );
}
