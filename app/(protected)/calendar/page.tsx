// app/(protected)/calendar/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import CalendarGrid, { type UiEvent } from "@/components/CalendarGrid";
import EventDetails from "@/components/EventDetails";
import CreateEventModal from "@/components/CreateEventModal";
import CalendarThemeSelector from "@/components/CalendarThemeSelector";
import { useToast } from "@/components/ToastProvider";
import type { DBEvent, Visibility } from "@/lib/types";
import type { View } from "react-big-calendar";

// IMPORT TODO AND REMINDER COMPONENTS FROM THEIR PAGES
import { TodoSidebar, type Todo } from "@/app/(protected)/todos/page";
import { ReminderSidebar, type Reminder } from "@/app/(protected)/reminders/page";

// Friend interface
interface Friend {
  friend_id: string;
  name: string;
  avatar_url?: string;
  carpool_flag?: boolean;
}

export default function CalendarPage() {
  // ===== MEDIA FILES ERROR FIX - MUST RUN FIRST =====
  useEffect(() => {
    // Patch fetch to fix Supabase responses with missing media_files
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      try {
        const response = await originalFetch.apply(this, args);
        const url = args[0]?.toString() || '';
        
        // Only patch Supabase responses
        if (url.includes('supabase')) {
          const originalJson = response.json.bind(response);
          response.json = async function() {
            try {
              const result = await originalJson();
              
              // Fix undefined data access
              if (result && typeof result === 'object') {
                // Fix array responses
                if (Array.isArray(result)) {
                  result.forEach(item => {
                    if (item && typeof item === 'object') {
                      item.media_files = item.media_files || [];
                    }
                  });
                }
                // Fix object responses with data property (Supabase pattern)
                else if ('data' in result && result.data) {
                  if (Array.isArray(result.data)) {
                    result.data.forEach((item: any) => {
                      if (item && typeof item === 'object') {
                        item.media_files = item.media_files || [];
                      }
                    });
                  } else if (typeof result.data === 'object') {
                    result.data.media_files = result.data.media_files || [];
                  }
                }
                // Fix direct object responses
                else {
                  result.media_files = result.media_files || [];
                }
              }
              
              return result;
            } catch (e) {
              console.warn('JSON parse error in media_files fix:', e);
              return await originalJson();
            }
          };
        }
        
        return response;
      } catch (error) {
        console.error('Fetch error:', error);
        throw error;
      }
    };

    // Error handler to prevent crashes
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('media_files')) {
        console.warn('[Calendar] Caught and prevented media_files error');
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
    };

    window.addEventListener('error', handleError, true);

    // Cleanup
    return () => {
      window.fetch = originalFetch;
      window.removeEventListener('error', handleError, true);
    };
  }, []);
  // ===== END MEDIA FILES FIX =====

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
  const [batchMode, setBatchMode] = useState(false);
  const [selectedBatchEvents, setSelectedBatchEvents] = useState<string[]>([]);
  
  // Sidebar states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dragType, setDragType] = useState<'none' | 'reminder' | 'todo'>('none');
  const [draggedItem, setDraggedItem] = useState<Todo | Reminder | null>(null);
  
  // Modal states
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selected, setSelected] = useState<DBEvent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Friends states
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
  
  // Generate moon events with proper Date objects
  const moonEvents = useMemo(() => {
    if (!showMoon) return [];
    
    const generateMoonEvents = (rangeStart: Date, rangeEnd: Date) => {
      const base = Date.UTC(2000, 0, 6, 18, 14, 0);
      const synodic = 29.530588853; // days
      const quarter = synodic / 4;
      
      const start = rangeStart.getTime();
      const end = rangeEnd.getTime();
      const events: any[] = [];
      
      for (let t = base; t < end + synodic * 24 * 3600 * 1000; t += synodic * 24 * 3600 * 1000) {
        const newMoon = new Date(t);
        const firstQuarter = new Date(t + quarter * 24 * 3600 * 1000);
        const fullMoon = new Date(t + 2 * quarter * 24 * 3600 * 1000);
        const lastQuarter = new Date(t + 3 * quarter * 24 * 3600 * 1000);
        
        const phases = [
          { date: newMoon, label: "New Moon", key: "moon-new" },
          { date: firstQuarter, label: "First Quarter", key: "moon-first" },
          { date: fullMoon, label: "Full Moon", key: "moon-full" },
          { date: lastQuarter, label: "Last Quarter", key: "moon-last" },
        ];
        
        for (const p of phases) {
          const phaseStart = new Date(p.date.getFullYear(), p.date.getMonth(), p.date.getDate());
          const phaseEnd = new Date(phaseStart);
          phaseEnd.setDate(phaseEnd.getDate() + 1);
          
          if (phaseStart.getTime() >= start && phaseStart.getTime() <= end) {
            events.push({
              id: `moon-${p.key}-${phaseStart.toISOString()}`,
              title: p.label,
              start: phaseStart,
              end: phaseEnd,
              allDay: true,
              resource: { moonPhase: p.key },
            });
          }
        }
      }
      
      return events;
    };
    
    // Calculate range based on current view
    let rangeStart: Date, rangeEnd: Date;
    if (view === 'month') {
      rangeStart = new Date(date.getFullYear(), date.getMonth(), 1);
      rangeEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    } else if (view === 'week') {
      const startOfWeek = new Date(date);
      const day = startOfWeek.getDay();
      startOfWeek.setDate(startOfWeek.getDate() - day);
      rangeStart = startOfWeek;
      rangeEnd = new Date(startOfWeek);
      rangeEnd.setDate(rangeEnd.getDate() + 6);
    } else {
      rangeStart = new Date(date);
      rangeEnd = new Date(date);
      rangeEnd.setDate(rangeEnd.getDate() + 1);
    }
    
    return generateMoonEvents(rangeStart, rangeEnd);
  }, [showMoon, date, view]);
  
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
  
  // Load user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);
  
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
      
      // Ensure all events have valid date objects AND media_files
      const safe = (data || []).filter((e: any) => {
        if (!e?.start_time || !e?.end_time) return false;
        const start = new Date(e.start_time);
        const end = new Date(e.end_time);
        return !isNaN(start.getTime()) && !isNaN(end.getTime());
      }).map((e: any) => ({
        ...e,
        media_files: e.media_files || [] // Ensure media_files exists
      }));
      
      setCalendarEvents(safe);
    } catch (error: any) {
      console.error("Load calendar error:", error);
      showToast({ type: 'error', message: 'Failed to load events' });
    } finally {
      setLoading(false);
    }
  }, [me, calendarMode, showToast]);
  
  // Load friends
  const loadFriends = useCallback(async () => {
    if (!me) return;
    
    try {
      const { data } = await supabase
        .from("friends")
        .select("*")
        .eq('user_id', me);
      
      // Ensure media_files exists on friends data
      const safeData = (data || []).map((f: any) => ({
        ...f,
        media_files: f.media_files || []
      }));
      
      setFriends(safeData);
      
      // Check for carpool matches if there are friends
      if (safeData.length > 0) {
        const carpoolFriends = safeData.filter((f: Friend) => f.carpool_flag);
        // Here you'd check for matching events
        setCarpoolMatches([]); // Placeholder
      }
    } catch (error) {
      console.error("Load friends error:", error);
    }
  }, [me]);
  
  // Load all data when user is ready
  useEffect(() => {
    if (me) {
      loadCalendar();
      loadFriends();
    }
  }, [me, loadCalendar, loadFriends]);
  
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
    
    if (batchMode) {
      // Batch selection mode
      const id = r.id;
      setSelectedBatchEvents(prev => 
        prev.includes(id) 
          ? prev.filter(eid => eid !== id)
          : [...prev, id]
      );
    } else {
      setSelected(r as DBEvent);
      setDetailsOpen(true);
    }
  }, [batchMode]);
  
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
    
    // Handle the description based on the item type
    let description = `Created from ${type}`;
    if (type === 'reminder' && 'reminder_time' in draggedItem) {
      // For reminders, include the original reminder time in description
      const reminderTime = new Date(draggedItem.reminder_time);
      description = `Reminder: ${draggedItem.description || draggedItem.title} (Originally set for ${reminderTime.toLocaleString()})`;
    } else if (type === 'todo' && 'due_date' in draggedItem && draggedItem.due_date) {
      // For todos with due dates
      const dueDate = new Date(draggedItem.due_date);
      description = `Todo: ${draggedItem.description || draggedItem.title} (Due: ${dueDate.toLocaleDateString()})`;
    }
    
    const payload = {
      title: draggedItem.title,
      description: description,
      start_time: info.start.toISOString(),
      end_time: info.end.toISOString(),
      all_day: info.allDay || false,
      event_type: type,
      visibility: 'private' as Visibility,
      created_by: me,
      source: 'personal' as const,
      media_files: [], // Ensure media_files is included
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
      media_files: [], // Ensure media_files is included
    };
    
    const { error } = await supabase.from("events").insert(payload);
    if (!error) {
      setOpenCreate(false);
      resetForm();
      showToast({ type: 'success', message: '✨ Event created!' });
      loadCalendar();
    } else {
      showToast({ type: 'error', message: 'Failed to create event' });
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
    } else {
      showToast({ type: 'error', message: 'Failed to update event' });
    }
  };
  
  // Delete event
  const deleteEvent = async (eventId: string) => {
    if (!me) return;
    
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId)
      .eq("created_by", me);
    
    if (!error) {
      showToast({ type: 'success', message: 'Event deleted' });
      loadCalendar();
      setDetailsOpen(false);
      setSelected(null);
    } else {
      showToast({ type: 'error', message: 'Failed to delete event' });
    }
  };
  
  // Batch delete
  const batchDelete = async () => {
    if (!me || selectedBatchEvents.length === 0) return;
    
    const { error } = await supabase
      .from("events")
      .delete()
      .in("id", selectedBatchEvents)
      .eq("created_by", me);
    
    if (!error) {
      showToast({ type: 'success', message: `Deleted ${selectedBatchEvents.length} events` });
      setSelectedBatchEvents([]);
      setBatchMode(false);
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
  
  // Handle drag start for todos
  const handleTodoDragStart = (todo: Todo) => {
    setDragType('todo');
    setDraggedItem(todo);
  };
  
  // Handle drag start for reminders
  const handleReminderDragStart = (reminder: Reminder) => {
    setDragType('reminder');
    setDraggedItem(reminder);
  };
  
  // Filtered events based on search and filters
  const filteredEvents = useMemo(() => {
    let events = calendarEvents;
    
    if (searchQuery) {
      events = events.filter(e => 
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.location?.toLowerCase().includes(searchQuery.toLowerCase())
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-lavender-50 to-purple-100">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
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
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  My Calendar
                </button>
                <button
                  onClick={() => setCalendarMode('whats-happening')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    calendarMode === 'whats-happening'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  What's Happening
                </button>
              </div>
              
              {/* Theme Selector */}
              {CalendarThemeSelector && (
                <CalendarThemeSelector
                  currentTheme={calendarTheme}
                  onThemeChange={setCalendarTheme}
                />
              )}
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
                <span className="text-sm font-medium">🌙 Moon Phases</span>
              </label>
              
              {/* Carpool Button */}
              {friends.some(f => f.carpool_flag) && (
                <button className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-all">
                  🚗 Carpool
                </button>
              )}
              
              {/* Coordinate Button */}
              <button className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-all">
                🤝 Coordinate
              </button>
              
              {/* Templates Button */}
              <button className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-all">
                📝 Templates
              </button>
              
              {/* Analytics Button */}
              <button className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-all">
                📊 Analytics
              </button>
              
              {/* Batch Mode Toggle */}
              {calendarMode === 'my-calendar' && (
                <button
                  onClick={() => {
                    setBatchMode(!batchMode);
                    setSelectedBatchEvents([]);
                  }}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    batchMode 
                      ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {batchMode ? '✓ Batch' : '☐ Batch'}
                </button>
              )}
              
              {/* Batch Delete (if items selected) */}
              {batchMode && selectedBatchEvents.length > 0 && (
                <button
                  onClick={batchDelete}
                  className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  Delete {selectedBatchEvents.length} events
                </button>
              )}
              
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
            
            {/* Search Bar (if What's Happening mode) */}
            {calendarMode === 'whats-happening' && (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
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
                {/* Tab Navigation */}
                <div className="flex gap-2 mb-4">
                  <button className="flex-1 py-1 px-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                    Calendar
                  </button>
                  <button className="flex-1 py-1 px-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">
                    Reminders
                  </button>
                  <button className="flex-1 py-1 px-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">
                    To-Dos
                  </button>
                </div>
                
                {/* REMINDERS SECTION - NOW USING IMPORTED COMPONENT */}
                {me && (
                  <ReminderSidebar 
                    userId={me} 
                    onDragStart={handleReminderDragStart}
                  />
                )}
                
                {/* TODOS SECTION - NOW USING IMPORTED COMPONENT */}
                {me && (
                  <TodoSidebar 
                    userId={me} 
                    onDragStart={handleTodoDragStart}
                  />
                )}
                
                {/* Carpool Matches */}
                {carpoolMatches.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">🚗 Carpool Opportunities</h3>
                    <div className="space-y-2">
                      {carpoolMatches.map((match) => (
                        <div key={match.id} className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                          <div className="font-medium">{match.eventTitle}</div>
                          <div className="text-xs text-gray-600">{match.friendNames}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Calendar Grid */}
          <div className="flex-1">
            <CalendarGrid
              dbEvents={filteredEvents}
              moonEvents={moonEvents}
              showMoon={showMoon}
              showWeather={false}
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
                <span className="text-xs">📋 Lists</span>
              </button>
              <button 
                onClick={() => setShowMoon(!showMoon)}
                className="p-2 text-purple-600"
              >
                <span className="text-xs">🌙 Moon</span>
              </button>
              <button 
                onClick={() => setOpenCreate(true)}
                className="p-2 bg-purple-600 text-white rounded-full px-4"
              >
                +
              </button>
            </div>
          </div>
        )}
        
        {/* Mobile Lists Drawer - SIMPLIFIED, NO DUPLICATE LOGIC */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div 
              className="fixed inset-0 bg-black/50" 
              onClick={() => setMobileMenuOpen(false)} 
            />
            <div className="fixed left-0 top-0 h-full w-80 bg-white shadow-xl overflow-y-auto">
              <div className="p-4">
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="mb-4 text-gray-600 text-lg"
                >
                  ← Close
                </button>
                
                {/* Mobile Reminders - Using imported component */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-3">Reminders</h3>
                  {me && <ReminderSidebar userId={me} />}
                </div>
                
                {/* Mobile To-Dos - Using imported component */}
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">To-Dos</h3>
                  {me && <TodoSidebar userId={me} />}
                </div>
              </div>
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
          onDelete={() => selected && deleteEvent(selected.id)}
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
    </div>
  );
}
