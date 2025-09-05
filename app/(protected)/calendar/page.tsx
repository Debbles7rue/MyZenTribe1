// app/(protected)/calendar/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { View } from "react-big-calendar";
import { supabase } from "@/lib/supabaseClient";
import CreateEventModal from "@/components/CreateEventModal";
import CalendarThemeSelector from "@/components/CalendarThemeSelector";
import EventDetails from "@/components/EventDetails";
import { useToast } from "@/components/ToastProvider";
import { useMoon } from "@/lib/useMoon";
import type { DBEvent, Visibility } from "@/lib/types";

// Lazy load heavy components
const CalendarGrid = dynamic(() => import("@/components/CalendarGrid"), {
  ssr: false,
  loading: () => <CalendarSkeleton />
});

// Types
type FeedEvent = DBEvent & {
  _dismissed?: boolean;
  _eventSource?: 'business' | 'community' | 'friend_invite';
  _userRelation?: 'following' | 'member' | 'invited';
};

type CalendarMode = "my" | "whats";
type QuickItemType = "none" | "reminder" | "todo";
type CalendarTheme = "default" | "spring" | "summer" | "autumn" | "winter" | "nature" | "ocean";

// Beautiful skeleton loader
function CalendarSkeleton() {
  return (
    <div className="relative h-[680px] overflow-hidden rounded-xl bg-white/80 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="p-4 space-y-4 animate-pulse">
          <div className="h-12 bg-gradient-to-r from-gray-200 to-gray-100 rounded-xl" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 rounded-lg animate-shimmer"
                   style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg animate-shimmer"
                   style={{ animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const { showToast } = useToast();
  const moonEvents = useMoon();

  // Core State
  const [userId, setUserId] = useState<string | null>(null);
  const [mode, setMode] = useState<CalendarMode>("my");
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>("month");
  const [theme, setTheme] = useState<CalendarTheme>("default");

  // Events State
  const [events, setEvents] = useState<DBEvent[]>([]);
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [selectedEvent, setSelectedEvent] = useState<DBEvent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [quickType, setQuickType] = useState<QuickItemType>("none");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [quickModalType, setQuickModalType] = useState<"reminder" | "todo">("reminder");
  const [quickTitle, setQuickTitle] = useState("");

  // Features State
  const [showMoon, setShowMoon] = useState(true);
  const [showWeather, setShowWeather] = useState(false);
  const [showReminders, setShowReminders] = useState(false);

  // Refs for smooth interactions
  const calendarRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Mobile detection
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  }, []);

  // Initialize user
  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    initUser();
  }, []);

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('mzt-calendar-theme');
    if (savedTheme) setTheme(savedTheme as CalendarTheme);
  }, []);

  // Save theme to localStorage
  const updateTheme = useCallback((newTheme: CalendarTheme) => {
    setTheme(newTheme);
    localStorage.setItem('mzt-calendar-theme', newTheme);
    showToast({
      type: 'success',
      message: `Theme changed to ${newTheme}`,
      duration: 2000
    });
  }, [showToast]);

  // Load calendar events
  const loadCalendar = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .or(`creator_id.eq.${userId},visibility.in.(public,friends)`)
        .order('start_time', { ascending: true });

      if (fetchError) throw fetchError;

      setEvents(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
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
  }, [userId, showToast]);

  // Load feed events
  const loadFeed = useCallback(async () => {
    if (!userId || mode !== 'whats') return;

    setLoading(true);

    try {
      // Load friends' public events
      const { data: friendEvents } = await supabase
        .from('events')
        .select('*, profiles!creator_id(username, avatar_url)')
        .eq('visibility', 'public')
        .neq('creator_id', userId)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(20);

      // Load community events
      const { data: communityEvents } = await supabase
        .from('events')
        .select('*, communities(name, avatar_url)')
        .eq('source', 'community')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(10);

      const allFeedEvents = [
        ...(friendEvents || []).map(e => ({
          ...e,
          _eventSource: 'friend_invite' as const
        })),
        ...(communityEvents || []).map(e => ({
          ...e,
          _eventSource: 'community' as const
        }))
      ].sort((a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );

      setFeedEvents(allFeedEvents);
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, mode]);

  // Initial load
  useEffect(() => {
    if (userId) {
      if (mode === 'my') {
        loadCalendar();
      } else {
        loadFeed();
      }
    }
  }, [userId, mode, loadCalendar, loadFeed]);

  // Real-time subscriptions
  useEffect(() => {
    if (!userId) return;

    const subscription = supabase
      .channel('calendar-events')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `creator_id=eq.${userId}`
        },
        () => {
          loadCalendar();
          showToast({
            type: 'info',
            message: 'Calendar updated',
            duration: 1500
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, loadCalendar, showToast]);

  // Touch handlers for mobile swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    // Horizontal swipe detection
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      const newDate = new Date(date);

      if (deltaX > 0) {
        // Swipe right - go back
        if (view === 'month') {
          newDate.setMonth(newDate.getMonth() - 1);
        } else if (view === 'week') {
          newDate.setDate(newDate.getDate() - 7);
        } else {
          newDate.setDate(newDate.getDate() - 1);
        }
      } else {
        // Swipe left - go forward
        if (view === 'month') {
          newDate.setMonth(newDate.getMonth() + 1);
        } else if (view === 'week') {
          newDate.setDate(newDate.getDate() + 7);
        } else {
          newDate.setDate(newDate.getDate() + 1);
        }
      }

      setDate(newDate);

      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(5);
      }
    }
  }, [date, view]);

  // Quick create functions
  const createQuickItem = useCallback(async (
    type: 'reminder' | 'todo',
    start: Date,
    end: Date,
    title?: string
  ) => {
    if (!userId) return;

    const itemTitle = title || (type === 'reminder' ? 'Reminder' : 'To-do');

    try {
      const { error } = await supabase
        .from('events')
        .insert({
          title: itemTitle,
          description: '',
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          creator_id: userId,
          event_type: type,
          visibility: 'private' as Visibility,
          location: '',
          source: 'personal'
        });

      if (error) throw error;

      showToast({
        type: 'success',
        message: `${type === 'reminder' ? 'Reminder' : 'To-do'} created`,
        duration: 2000
      });

      loadCalendar();
      setQuickType('none');
    } catch (err) {
      showToast({
        type: 'error',
        message: `Failed to create ${type}`,
        duration: 3000
      });
    }
  }, [userId, loadCalendar, showToast]);

  // Handle slot selection
  const handleSelectSlot = useCallback((slotInfo: any) => {
    if (quickType !== 'none') {
      createQuickItem(quickType as 'reminder' | 'todo', slotInfo.start, slotInfo.end);
    } else {
      setCreateModalOpen(true);
    }
  }, [quickType, createQuickItem]);

  // Handle event selection
  const handleSelectEvent = useCallback((event: any) => {
    setSelectedEvent(event.resource);
    setDetailsOpen(true);
  }, []);

  // Handle event drop
  const handleEventDrop = useCallback(async ({
    event,
    start,
    end
  }: {
    event: any;
    start: Date;
    end: Date;
  }) => {
    const eventData = event.resource as DBEvent;

    // Only allow moving own events
    if (eventData.creator_id !== userId) {
      showToast({
        type: 'error',
        message: 'You can only move your own events',
        duration: 2000
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('events')
        .update({
          start_time: start.toISOString(),
          end_time: end.toISOString()
        })
        .eq('id', eventData.id);

      if (error) throw error;

      showToast({
        type: 'success',
        message: 'Event moved',
        duration: 1500
      });

      loadCalendar();
    } catch (err) {
      showToast({
        type: 'error',
        message: 'Failed to move event',
        duration: 3000
      });
    }
  }, [userId, loadCalendar, showToast]);

  // Filter events based on search
  const filteredEvents = useMemo(() => {
    if (!searchQuery) return events;

    const query = searchQuery.toLowerCase();
    return events.filter(e =>
      e.title.toLowerCase().includes(query) ||
      e.description?.toLowerCase().includes(query) ||
      e.location?.toLowerCase().includes(query)
    );
  }, [events, searchQuery]);

  // Render quick modal
  const renderQuickModal = () => (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${showQuickModal ? '' : 'hidden'}`}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm"
           onClick={() => setShowQuickModal(false)} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">
          Create {quickModalType === 'reminder' ? 'Reminder' : 'To-do'}
        </h3>
        <input
          type="text"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder={`Enter ${quickModalType} title...`}
          className="w-full px-4 py-2 border border-purple-200 rounded-lg
                   focus:outline-none focus:ring-2 focus:ring-purple-500"
          autoFocus
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => {
              if (quickTitle.trim()) {
                const now = new Date();
                const later = new Date(now.getTime() + 3600000);
                createQuickItem(quickModalType, now, later, quickTitle);
                setQuickTitle('');
                setShowQuickModal(false);
              }
            }}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg
                     hover:bg-purple-700 transition-colors"
          >
            Create
          </button>
          <button
            onClick={() => {
              setShowQuickModal(false);
              setQuickTitle('');
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg
                     hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 relative">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-200 rounded-full
                      mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-pink-200 rounded-full
                      mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-yellow-200 rounded-full
                      mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* Main Content */}
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
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-full border border-purple-200
                           focus:outline-none focus:ring-2 focus:ring-purple-500
                           bg-white/80 backdrop-blur-sm w-48 lg:w-64"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Feature Toggles */}
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
                value={theme}
                onChange={updateTheme}
              />

              {/* Create Button */}
              <button
                onClick={() => setCreateModalOpen(true)}
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

        {/* Main Calendar/Feed Area */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-purple-100">
          {mode === 'whats' ? (
            // Feed View
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">What's Happening</h2>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                </div>
              ) : feedEvents.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg mb-2">No upcoming events</p>
                  <p className="text-sm">Check back later for new events from friends and communities</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {feedEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-4 rounded-xl border border-purple-100 hover:shadow-lg
                               transition-all duration-300 cursor-pointer bg-white"
                      onClick={() => {
                        setSelectedEvent(event);
                        setDetailsOpen(true);
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-800">{event.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          event._eventSource === 'community'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {event._eventSource === 'community' ? 'Community' : 'Friend'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {new Date(event.start_time).toLocaleDateString()} at{' '}
                        {new Date(event.start_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {event.location && (
                        <p className="text-sm text-gray-500">📍 {event.location}</p>
                      )}
                      {event.description && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Calendar View
            <div className="relative">
              {/* Quick Items Sidebar */}
              <div className={`absolute left-0 top-0 h-full w-64 bg-white/95 backdrop-blur-sm
                            shadow-lg rounded-l-2xl p-4 transition-transform duration-300 z-20
                            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <h3 className="font-semibold text-gray-700 mb-3">Quick Items</h3>

                <div className="space-y-2">
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
                        <div className="text-xs text-amber-600">Click to activate</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickModalType('reminder');
                          setShowQuickModal(true);
                        }}
                        className="text-xs px-2 py-1 bg-amber-500 text-white rounded hover:bg-amber-600"
                      >
                        + Add
                      </button>
                    </div>
                  </div>

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
                        <div className="text-xs text-green-600">Click to activate</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickModalType('todo');
                          setShowQuickModal(true);
                        }}
                        className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>

                {quickType !== 'none' && (
                  <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs text-purple-700">
                      <strong>Active:</strong> Click a calendar slot to place your {quickType}
                    </p>
                    <button
                      onClick={() => setQuickType('none')}
                      className="text-xs text-purple-600 underline mt-1"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Reminders List */}
                {showReminders && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-700 mb-2">Your Reminders</h4>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {events
                        .filter(e => e.event_type === 'reminder')
                        .map(reminder => (
                          <div key={reminder.id}
                               className="text-sm p-2 bg-amber-50 rounded cursor-pointer hover:bg-amber-100"
                               onClick={() => {
                                 setSelectedEvent(reminder);
                                 setDetailsOpen(true);
                               }}>
                            {reminder.title}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Toggle Sidebar Button (Mobile) */}
              {isMobile && (
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="absolute left-2 top-2 z-30 p-2 bg-white rounded-full shadow-lg lg:hidden"
                >
                  {sidebarOpen ? '✕' : '☰'}
                </button>
              )}

              {/* Calendar Grid */}
              <div
                ref={calendarRef}
                className="p-4 lg:ml-64"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {loading ? (
                  <CalendarSkeleton />
                ) : (
                  <CalendarGrid
                    dbEvents={filteredEvents}
                    moonEvents={showMoon ? moonEvents : []}
                    showMoon={showMoon}
                    showWeather={showWeather}
                    theme={theme}
                    date={date}
                    setDate={setDate}
                    view={view}
                    setView={setView}
                    onSelectSlot={handleSelectSlot}
                    onSelectEvent={handleSelectEvent}
                    onDrop={handleEventDrop}
                    onResize={handleEventDrop}
                    externalDragType={quickType}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Modal */}
        {renderQuickModal()}

        {/* Event Details Modal */}
        <EventDetails
          event={selectedEvent}
          onClose={() => {
            setDetailsOpen(false);
            setSelectedEvent(null);
          }}
        />

        {/* Create Event Modal */}
        <CreateEventModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          sessionUser={userId}
          value={{
            title: '',
            description: '',
            location: '',
            start: date.toISOString(),
            end: new Date(date.getTime() + 3600000).toISOString(),
            visibility: 'private',
            event_type: '',
            community_id: '',
            source: 'personal',
            image_path: ''
          }}
          onChange={() => {}}
          onSave={() => {
            loadCalendar();
            setCreateModalOpen(false);
            showToast({
              type: 'success',
              message: '✨ Event created successfully!',
              duration: 3000
            });
          }}
        />
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -30px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(1); }
          75% { transform: translate(30px, 10px) scale(0.9); }
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
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

        .animate-shimmer {
          background: linear-gradient(90deg,
            transparent 0%,
            rgba(255,255,255,0.4) 50%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
