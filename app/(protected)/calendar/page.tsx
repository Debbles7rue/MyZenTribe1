// app/(protected)/calendar/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import type { View } from "react-big-calendar";
import { useToast } from "@/components/ToastProvider";
import { useMoon } from "@/lib/useMoon";
import { useKeyboardShortcuts, KeyboardShortcutsHelp } from "@/hooks/useKeyboardShortcuts";

// Import our new modular components
import { useCalendarData } from "./hooks/useCalendarData";
import { useCalendarActions } from "./hooks/useCalendarActions";
import CalendarHeader from "./components/CalendarHeader";
import CalendarSidebar from "./components/CalendarSidebar";
import MobileSidebar from "./components/MobileSidebar";
import FeedView from "./components/FeedView";
import CalendarModals from "./components/CalendarModals";
import { CalendarTheme, Mode, TodoReminder, Friend, CarpoolMatch } from "./types";

// Dynamic import for CalendarGrid to prevent SSR issues
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

export default function CalendarPage() {
  // ===== CORE STATE =====
  const [mode, setMode] = useState<Mode>("my");
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>("month");
  const [calendarTheme, setCalendarTheme] = useState<CalendarTheme>("default");
  const [showMoon, setShowMoon] = useState(true);
  const [showWeather, setShowWeather] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // ===== MODAL STATES =====
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showMeetingCoordinator, setShowMeetingCoordinator] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showCarpoolChat, setShowCarpoolChat] = useState(false);
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [quickModalType, setQuickModalType] = useState<'reminder' | 'todo'>('reminder');

  // ===== SIDEBAR STATES =====
  const [showCompletedItems, setShowCompletedItems] = useState(false);
  const [showRemindersList, setShowRemindersList] = useState(true);
  const [showTodosList, setShowTodosList] = useState(true);
  const [draggedItem, setDraggedItem] = useState<TodoReminder | null>(null);
  const [dragType, setDragType] = useState<'reminder' | 'todo' | 'none'>('none');

  // ===== MOBILE TOUCH REFS FOR SWIPE GESTURES =====
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const calendarRef = useRef<HTMLDivElement>(null);

  // ===== TOAST & MOON =====
  const { showToast } = useToast();
  const moonEvents = useMoon(date, view);

  // ===== CUSTOM HOOKS FOR DATA & ACTIONS =====
  const {
    me,
    events,
    loading,
    error,
    feed,
    feedLoading,
    selected,
    setSelected,
    selectedFeedEvent,
    setSelectedFeedEvent,
    reminders,
    todos,
    friends,
    carpoolMatches,
    selectedCarpoolEvent,
    setSelectedCarpoolEvent,
    selectedCarpoolFriends,
    setSelectedCarpoolFriends,
    form,
    setForm,
    quickModalForm,
    setQuickModalForm,
    loadCalendar,
    loadFeed,
    resetForm,
    subscribeToRealtimeUpdates
  } = useCalendarData();

  const {
    handleCreateEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    handleExternalDrop,
    handleApplyTemplate,
    handleToggleComplete,
    handleDeleteItem,
    handleShowInterest,
    handleRSVP,
    dismissFeedEvent,
    createQuickItem,
    createCarpoolGroup,
    onDrop,
    onResize
  } = useCalendarActions({
    me,
    form,
    selected,
    quickModalForm,
    quickModalType,
    draggedItem,
    selectedCarpoolFriends,
    friends,
    showToast,
    loadCalendar,
    resetForm,
    setOpenCreate,
    setOpenEdit,
    setQuickModalOpen,
    setShowCarpoolChat,
    setQuickModalForm,
    setSelected,
    setDraggedItem,
    setDragType,
    setSelectedCarpoolFriends
  });

  // ===== MOBILE DETECTION =====
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ===== REALTIME SUBSCRIPTIONS =====
  useEffect(() => {
    if (me) {
      const unsubscribe = subscribeToRealtimeUpdates();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [me, subscribeToRealtimeUpdates]);

  // ===== KEYBOARD SHORTCUTS =====
  const shortcutActions = {
    createEvent: () => setOpenCreate(true),
    switchView: () => {
      const views: View[] = ['month', 'week', 'day'];
      const currentIndex = views.indexOf(view);
      setView(views[(currentIndex + 1) % views.length]);
    },
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
    toggleWeather: () => setShowWeather(!showWeather),
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
      setShowCarpoolChat(false);
    },
  };

  useKeyboardShortcuts(shortcutActions, !isMobile); // Disable on mobile

  // ===== MOBILE SWIPE HANDLERS =====
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchStartX.current - touchEndX;
    const diffY = touchStartY.current - touchEndY;

    const minSwipeDistance = 50;

    // Horizontal swipe (navigate days/weeks/months)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipeDistance) {
      if (diffX > 0) {
        // Swiped left - go to next
        shortcutActions.navigateNext();
        // Add haptic feedback if available
        if (navigator.vibrate) navigator.vibrate(10);
      } else {
        // Swiped right - go to previous
        shortcutActions.navigatePrevious();
        if (navigator.vibrate) navigator.vibrate(10);
      }
    }

    // Vertical swipe (pull to refresh)
    if (diffY < -minSwipeDistance && touchStartY.current < 100) {
      // Pulled down from top - refresh
      loadCalendar();
      showToast({ type: 'success', message: '🔄 Calendar refreshed!' });
      if (navigator.vibrate) navigator.vibrate([10, 10]);
    }

    // Reset
    touchStartX.current = 0;
    touchStartY.current = 0;
  };

  // ===== CALENDAR NAVIGATION =====
  const onSelectSlot = useCallback((slotInfo: any) => {
    const isTouchEvent = slotInfo.action === 'click' || slotInfo.action === 'select' || slotInfo.action === 'doubleClick';
    
    if (view === 'month' && isTouchEvent) {
      setDate(slotInfo.start);
      setView('day');
      setMobileMenuOpen(false);
      // Haptic feedback for mobile
      if (isMobile && navigator.vibrate) navigator.vibrate(5);
      return;
    }

    if ((view === 'day' || view === 'week') && isTouchEvent) {
      const start = slotInfo.start || new Date();
      const end = slotInfo.end || new Date(start.getTime() + 3600000);
      
      setForm(prev => ({
        ...prev,
        start: new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
        end: new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      }));
      setOpenCreate(true);
      if (isMobile && navigator.vibrate) navigator.vibrate(10);
    }
  }, [view, setForm, isMobile]);

  const onSelectEvent = useCallback((evt: any) => {
    const r = evt.resource as any;
    if (r?.moonPhase) return;
    
    if (r?.id) {
      setSelected(r);
      setDetailsOpen(true);
    } else {
      const found = events.find(e => e.id === evt.id);
      if (found) {
        setSelected(found);
        setDetailsOpen(true);
      }
    }
    // Haptic feedback
    if (isMobile && navigator.vibrate) navigator.vibrate(5);
  }, [events, setSelected, isMobile]);

  // ===== FILTERED DATA =====
  const calendarEvents = useMemo(() => {
    if (mode === 'whats') {
      if (!feedLoading && feed.length === 0) {
        loadFeed();
      }
      return feed.filter(e => !e._dismissed);
    }
    return events;
  }, [mode, events, feed, feedLoading, loadFeed]);

  const visibleReminders = useMemo(() => {
    return reminders.filter(r => showCompletedItems || !r.completed);
  }, [reminders, showCompletedItems]);

  const visibleTodos = useMemo(() => {
    return todos.filter(t => showCompletedItems || !t.completed);
  }, [todos, showCompletedItems]);

  // ===== HELPER FOR CARPOOL =====
  const openCarpoolChat = (event?: any) => {
    setSelectedCarpoolEvent(event || null);
    setSelectedCarpoolFriends(new Set());
    setShowCarpoolChat(true);
  };

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

      {/* Main Container with Touch Support */}
      <div 
        ref={calendarRef}
        className="relative z-10 container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-7xl"
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
      >
        
        {/* Header Component */}
        <CalendarHeader
          mode={mode}
          setMode={setMode}
          calendarTheme={calendarTheme}
          setCalendarTheme={setCalendarTheme}
          showMoon={showMoon}
          setShowMoon={setShowMoon}
          showWeather={showWeather}
          setShowWeather={setShowWeather}
          isMobile={isMobile}
          setOpenCreate={setOpenCreate}
          setMobileMenuOpen={setMobileMenuOpen}
          setShowTemplates={setShowTemplates}
          setShowAnalytics={setShowAnalytics}
          setShowMeetingCoordinator={setShowMeetingCoordinator}
          setShowShortcutsHelp={setShowShortcutsHelp}
          loading={loading}
          error={error}
          onRefresh={loadCalendar}
        />

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button 
              onClick={loadCalendar}
              className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-xs"
            >
              Retry
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden">
          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-20 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                <span className="text-sm text-gray-600">Loading events...</span>
              </div>
            </div>
          )}

          <div className="flex gap-4 p-2 sm:p-4">
            
            {/* Desktop Sidebar */}
            {mode === 'my' && !isMobile && (
              <CalendarSidebar
                carpoolMatches={carpoolMatches}
                friends={friends}
                visibleReminders={visibleReminders}
                visibleTodos={visibleTodos}
                showRemindersList={showRemindersList}
                setShowRemindersList={setShowRemindersList}
                showTodosList={showTodosList}
                setShowTodosList={setShowTodosList}
                showCompletedItems={showCompletedItems}
                setShowCompletedItems={setShowCompletedItems}
                openCarpoolChat={openCarpoolChat}
                setQuickModalType={setQuickModalType}
                setQuickModalOpen={setQuickModalOpen}
                onDragStart={(item: TodoReminder, type: 'reminder' | 'todo') => {
                  setDraggedItem(item);
                  setDragType(type);
                }}
                onDragEnd={() => {
                  setDraggedItem(null);
                  setDragType('none');
                }}
                onToggleComplete={handleToggleComplete}
                onDeleteItem={handleDeleteItem}
              />
            )}

            {/* Calendar or Feed View */}
            <div className="flex-1 relative">
              {/* Mobile swipe indicator */}
              {isMobile && view !== 'month' && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
                  <div className="bg-black/50 text-white text-xs px-3 py-1 rounded-full">
                    ← Swipe to navigate →
                  </div>
                </div>
              )}

              {mode === 'whats' ? (
                feedLoading ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-gray-600">Finding events...</p>
                    </div>
                  </div>
                ) : feed.filter(e => !e._dismissed).length > 0 ? (
                  <FeedView
                    feed={feed.filter(e => !e._dismissed)}
                    onDismiss={dismissFeedEvent}
                    onInterested={handleShowInterest}
                    onRSVP={handleRSVP}
                    onShowDetails={(event) => {
                      setSelectedFeedEvent(event);
                      setDetailsOpen(true);
                    }}
                    isMobile={isMobile}
                  />
                ) : (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <div className="text-6xl mb-4">🎉</div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No upcoming events</h3>
                      <p className="text-gray-500 text-sm">Check back later for exciting events!</p>
                      <button 
                        onClick={loadFeed} 
                        className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <CalendarGrid
                  dbEvents={calendarEvents}
                  moonEvents={moonEvents}
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
                  externalDragType={dragType}
                  externalDragTitle={draggedItem?.title}
                  onExternalDrop={handleExternalDrop}
                />
              )}
            </div>
          </div>
        </div>

        {/* Mobile Bottom Action Bar */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t shadow-lg z-30">
            <div className="flex items-center justify-around py-2">
              <button
                onClick={() => setDate(new Date())}
                className="flex flex-col items-center gap-1 p-2 text-gray-600"
              >
                <span className="text-lg">📅</span>
                <span className="text-xs">Today</span>
              </button>
              <button
                onClick={() => {
                  setQuickModalType('reminder');
                  setQuickModalOpen(true);
                }}
                className="flex flex-col items-center gap-1 p-2 text-amber-600"
              >
                <span className="text-lg">⏰</span>
                <span className="text-xs">Reminder</span>
              </button>
              <button
                onClick={() => setOpenCreate(true)}
                className="flex flex-col items-center gap-1 p-3 bg-purple-600 text-white rounded-full shadow-lg transform hover:scale-110"
              >
                <span className="text-2xl">+</span>
              </button>
              <button
                onClick={() => {
                  setQuickModalType('todo');
                  setQuickModalOpen(true);
                }}
                className="flex flex-col items-center gap-1 p-2 text-green-600"
              >
                <span className="text-lg">✅</span>
                <span className="text-xs">Todo</span>
              </button>
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="flex flex-col items-center gap-1 p-2 text-gray-600"
              >
                <span className="text-lg">☰</span>
                <span className="text-xs">Menu</span>
              </button>
            </div>
          </div>
        )}

        {/* Mobile Sidebar */}
        {isMobile && (
          <MobileSidebar
            open={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            carpoolMatches={carpoolMatches}
            friends={friends}
            visibleReminders={visibleReminders}
            visibleTodos={visibleTodos}
            showCompletedItems={showCompletedItems}
            setShowCompletedItems={setShowCompletedItems}
            openCarpoolChat={(event) => {
              openCarpoolChat(event);
              setMobileMenuOpen(false);
            }}
            setQuickModalType={setQuickModalType}
            setQuickModalOpen={setQuickModalOpen}
            setShowTemplates={setShowTemplates}
            setShowAnalytics={setShowAnalytics}
            setShowMeetingCoordinator={setShowMeetingCoordinator}
            onToggleComplete={handleToggleComplete}
            onDeleteItem={handleDeleteItem}
          />
        )}

        {/* All Modals */}
        <CalendarModals
          // Modal visibility states
          openCreate={openCreate}
          openEdit={openEdit}
          detailsOpen={detailsOpen}
          showAnalytics={showAnalytics}
          showTemplates={showTemplates}
          showMeetingCoordinator={showMeetingCoordinator}
          showShortcutsHelp={showShortcutsHelp && !isMobile}
          showCarpoolChat={showCarpoolChat}
          quickModalOpen={quickModalOpen}
          
          // Modal setters
          setOpenCreate={setOpenCreate}
          setOpenEdit={setOpenEdit}
          setDetailsOpen={setDetailsOpen}
          setShowAnalytics={setShowAnalytics}
          setShowTemplates={setShowTemplates}
          setShowMeetingCoordinator={setShowMeetingCoordinator}
          setShowShortcutsHelp={setShowShortcutsHelp}
          setShowCarpoolChat={setShowCarpoolChat}
          setQuickModalOpen={setQuickModalOpen}
          
          // Data
          me={me}
          selected={selected}
          selectedFeedEvent={selectedFeedEvent}
          selectedCarpoolEvent={selectedCarpoolEvent}
          selectedCarpoolFriends={selectedCarpoolFriends}
          setSelectedCarpoolFriends={setSelectedCarpoolFriends}
          events={events}
          friends={friends}
          form={form}
          setForm={setForm}
          quickModalForm={quickModalForm}
          setQuickModalForm={setQuickModalForm}
          quickModalType={quickModalType}
          isMobile={isMobile}
          
          // Actions
          handleCreateEvent={handleCreateEvent}
          handleUpdateEvent={handleUpdateEvent}
          handleEdit={(event) => {
            setSelected(event);
            setForm({
              title: event.title || "",
              description: event.description || "",
              location: event.location || "",
              start: new Date(event.start_time).toISOString().slice(0, 16),
              end: new Date(event.end_time).toISOString().slice(0, 16),
              visibility: event.visibility,
              event_type: event.event_type || "",
              community_id: event.community_id || "",
              source: event.source || "personal",
              image_path: event.image_path || "",
            });
            setOpenEdit(true);
            setDetailsOpen(false);
          }}
          handleApplyTemplate={handleApplyTemplate}
          createQuickItem={createQuickItem}
          createCarpoolGroup={createCarpoolGroup}
          resetForm={resetForm}
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
        
        /* Mobile-specific enhancements */
        @media (max-width: 768px) {
          /* Ensure bottom padding for fixed bottom bar */
          .container {
            padding-bottom: 80px !important;
          }
          
          /* Smooth scrolling for mobile */
          * {
            -webkit-overflow-scrolling: touch;
          }
          
          /* Prevent text selection on buttons */
          button {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
          }
        }
      `}</style>
    </div>
  );
}
