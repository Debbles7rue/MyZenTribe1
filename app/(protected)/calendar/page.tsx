// app/(protected)/calendar/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import type { View } from "react-big-calendar";
import { useToast } from "@/components/ToastProvider";
import { useMoon } from "@/lib/useMoon";

// Import our modular components
import { useCalendarData } from "./hooks/useCalendarData";
import { useCalendarActions } from "./hooks/useCalendarActions";
import { useSwipeGestures } from "./hooks/useSwipeGestures";
import { useVoiceCommands } from "./hooks/useVoiceCommands";
import { useNotifications } from "./hooks/useNotifications";
import { useGameification } from "./hooks/useGameification";
import CalendarHeader from "./components/CalendarHeader";
import CalendarSidebar from "./components/CalendarSidebar";
import MobileSidebar from "./components/MobileSidebar";
import FeedView from "./components/FeedView";
import CalendarModals from "./components/CalendarModals";
import MobileQuickActions from "./components/MobileQuickActions";
import FloatingActionButton from "./components/FloatingActionButton";
import MoodTracker from "./components/MoodTracker";
import PhotoMemories from "./components/PhotoMemories";
import DarkModeToggle from "./components/DarkModeToggle";
import { CalendarTheme, Mode, TodoReminder, Friend, CarpoolMatch } from "./types";

// Dynamic import for CalendarGrid to prevent SSR issues
const CalendarGrid = dynamic(() => import("@/components/CalendarGrid"), { 
  ssr: false,
  loading: () => (
    <div className="card p-3">
      <div style={{ height: "680px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded"></div>
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showMemories, setShowMemories] = useState(false);
  const [showMoodTracker, setShowMoodTracker] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedBatchEvents, setSelectedBatchEvents] = useState<Set<string>>(new Set());
  
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
  const [showPomodoroTimer, setShowPomodoroTimer] = useState(false);
  const [showTimeBlocking, setShowTimeBlocking] = useState(false);

  // ===== SIDEBAR STATES =====
  const [showCompletedItems, setShowCompletedItems] = useState(false);
  const [showRemindersList, setShowRemindersList] = useState(true);
  const [showTodosList, setShowTodosList] = useState(true);
  const [draggedItem, setDraggedItem] = useState<TodoReminder | null>(null);
  const [dragType, setDragType] = useState<'reminder' | 'todo' | 'none'>('none');

  // ===== REFS FOR MOBILE INTERACTIONS =====
  const calendarRef = useRef<HTMLDivElement>(null);
  const pullToRefreshRef = useRef<HTMLDivElement>(null);
  const lastVibrationTime = useRef(0);

  // ===== TOAST & MOON =====
  const { showToast } = useToast();
  const moonEvents = useMoon(date, view);

  // ===== CUSTOM HOOKS FOR DATA & ACTIONS =====
  const {
    me,
    events,
    loading,
    feed,
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
    resetForm
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

  // ===== GAMIFICATION HOOKS =====
  const { 
    userStats, 
    checkAchievements, 
    addPoints,
    showConfetti 
  } = useGameification(me);

  // ===== NOTIFICATION HOOKS =====
  useNotifications(reminders, todos, events, showToast);

  // ===== MOBILE DETECTION & DARK MODE =====
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    const checkDarkMode = () => {
      const hour = new Date().getHours();
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isEvening = hour >= 18 || hour < 6;
      setDarkMode(prefersDark || isEvening);
    };
    
    checkMobile();
    checkDarkMode();
    
    window.addEventListener('resize', checkMobile);
    const darkModeInterval = setInterval(checkDarkMode, 60000); // Check every minute
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      clearInterval(darkModeInterval);
    };
  }, []);

  // ===== APPLY DARK MODE CLASS =====
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // ===== HAPTIC FEEDBACK =====
  const vibrate = useCallback(() => {
    if (!isMobile) return;
    
    const now = Date.now();
    if (now - lastVibrationTime.current < 50) return; // Debounce
    
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // Short haptic feedback
      lastVibrationTime.current = now;
    }
  }, [isMobile]);

  // ===== FORMAT DATE FOR TOAST =====
  const formatDateForToast = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // ===== MOBILE SWIPE GESTURES =====
  const swipeHandlers = useSwipeGestures({
    onSwipeLeft: () => {
      if (!isMobile) return;
      vibrate();
      const newDate = new Date(date);
      if (view === 'month') newDate.setMonth(newDate.getMonth() + 1);
      else if (view === 'week') newDate.setDate(newDate.getDate() + 7);
      else newDate.setDate(newDate.getDate() + 1);
      setDate(newDate);
      showToast({ type: 'info', message: `📅 ${formatDateForToast(newDate)}` });
    },
    onSwipeRight: () => {
      if (!isMobile) return;
      vibrate();
      const newDate = new Date(date);
      if (view === 'month') newDate.setMonth(newDate.getMonth() - 1);
      else if (view === 'week') newDate.setDate(newDate.getDate() - 7);
      else newDate.setDate(newDate.getDate() - 1);
      setDate(newDate);
      showToast({ type: 'info', message: `📅 ${formatDateForToast(newDate)}` });
    },
    onSwipeUp: () => {
      if (!isMobile) return;
      vibrate();
      setOpenCreate(true);
    },
    onSwipeDown: async () => {
      if (!isMobile || isRefreshing) return;
      await handlePullToRefresh();
    }
  });

  // ===== VOICE COMMANDS =====
  const { isListening, startListening } = useVoiceCommands({
    onCommand: (command: string) => {
      const lower = command.toLowerCase();
      
      if (lower.includes('create') || lower.includes('add')) {
        if (lower.includes('meeting') || lower.includes('event')) {
          setOpenCreate(true);
        } else if (lower.includes('reminder')) {
          setQuickModalType('reminder');
          setQuickModalOpen(true);
        } else if (lower.includes('todo') || lower.includes('task')) {
          setQuickModalType('todo');
          setQuickModalOpen(true);
        }
        vibrate();
      } else if (lower.includes('next')) {
        const newDate = new Date(date);
        if (view === 'month') newDate.setMonth(newDate.getMonth() + 1);
        else if (view === 'week') newDate.setDate(newDate.getDate() + 7);
        else newDate.setDate(newDate.getDate() + 1);
        setDate(newDate);
        vibrate();
      } else if (lower.includes('previous') || lower.includes('back')) {
        const newDate = new Date(date);
        if (view === 'month') newDate.setMonth(newDate.getMonth() - 1);
        else if (view === 'week') newDate.setDate(newDate.getDate() - 7);
        else newDate.setDate(newDate.getDate() - 1);
        setDate(newDate);
        vibrate();
      } else if (lower.includes('today')) {
        setDate(new Date());
        vibrate();
      } else if (lower.includes('week')) {
        setView('week');
        vibrate();
      } else if (lower.includes('month')) {
        setView('month');
        vibrate();
      } else if (lower.includes('day')) {
        setView('day');
        vibrate();
      }
    }
  });

  // ===== PULL TO REFRESH =====
  const handlePullToRefresh = useCallback(async () => {
    if (!isMobile || isRefreshing) return;
    
    setIsRefreshing(true);
    vibrate();
    
    try {
      await loadCalendar();
      if (mode === 'whats') await loadFeed();
      
      showToast({ 
        type: 'success', 
        message: '✨ Calendar refreshed!',
        duration: 2000
      });
      
      // Add points for refresh
      addPoints(5, 'refresh');
    } catch (error) {
      showToast({ 
        type: 'error', 
        message: 'Failed to refresh' 
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [isMobile, isRefreshing, mode, loadCalendar, loadFeed, showToast, vibrate, addPoints]);

  // ===== CALENDAR NAVIGATION =====
  const onSelectSlot = useCallback((slotInfo: any) => {
    if (batchMode) return; // Disable slot selection in batch mode
    
    // Add immediate feedback for mobile
    if (isMobile) {
      vibrate();
    }
    
    // In month view, clicking/tapping a day should navigate to day view
    if (view === 'month') {
      setDate(slotInfo.start);
      setView('day');
      // Add toast notification for mobile users
      if (isMobile) {
        showToast({ 
          type: 'info', 
          message: `Viewing ${formatDateForToast(slotInfo.start)}`,
          duration: 1500
        });
      }
      return;
    }
    
    // In week or day view, clicking a time slot should open the create modal
    if (view === 'week' || view === 'day') {
      const start = slotInfo.start || new Date();
      const end = slotInfo.end || new Date(start.getTime() + 3600000);
      
      setForm(prev => ({
        ...prev,
        start: new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
        end: new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      }));
      setOpenCreate(true);
    }
  }, [view, batchMode, isMobile, setForm, showToast, vibrate]);

  const onSelectEvent = useCallback((evt: any) => {
    const r = evt.resource as any;
    if (r?.moonPhase) return;
    
    vibrate();
    
    // Handle batch mode selection
    if (batchMode) {
      const eventId = r?.id || evt.id;
      setSelectedBatchEvents(prev => {
        const newSet = new Set(prev);
        if (newSet.has(eventId)) {
          newSet.delete(eventId);
        } else {
          newSet.add(eventId);
        }
        return newSet;
      });
      return;
    }
    
    // Normal event selection
    if (r?.id) {
      setSelected(r);
      setDetailsOpen(true);
    }
  }, [batchMode, setSelected, vibrate]);

  // ===== BATCH ACTIONS =====
  const handleBatchDelete = useCallback(async () => {
    if (selectedBatchEvents.size === 0) return;
    
    if (confirm(`Delete ${selectedBatchEvents.size} events?`)) {
      for (const eventId of selectedBatchEvents) {
        await handleDeleteEvent(eventId);
      }
      
      showConfetti();
      addPoints(selectedBatchEvents.size * 10, 'batch-delete');
      setSelectedBatchEvents(new Set());
      setBatchMode(false);
    }
  }, [selectedBatchEvents, handleDeleteEvent, showConfetti, addPoints]);

  const handleBatchMove = useCallback((days: number) => {
    if (selectedBatchEvents.size === 0) return;
    
    // Implementation for batch move
    showToast({ 
      type: 'success', 
      message: `Moved ${selectedBatchEvents.size} events ${days > 0 ? 'forward' : 'backward'} ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}`
    });
    
    addPoints(selectedBatchEvents.size * 5, 'batch-move');
    setSelectedBatchEvents(new Set());
    setBatchMode(false);
  }, [selectedBatchEvents, showToast, addPoints]);

  // ===== CARPOOL CHAT HELPER =====
  const openCarpoolChat = useCallback((event: any) => {
    setSelectedCarpoolEvent(event);
    setShowCarpoolChat(true);
  }, [setSelectedCarpoolEvent]);

  // ===== FILTERED LISTS =====
  const visibleReminders = useMemo(() => 
    showCompletedItems ? reminders : reminders.filter(r => !r.completed),
    [reminders, showCompletedItems]
  );

  const visibleTodos = useMemo(() => 
    showCompletedItems ? todos : todos.filter(t => !t.completed),
    [todos, showCompletedItems]
  );

  const calendarEvents = useMemo(() => 
    mode === 'my' ? events : [],
    [mode, events]
  );

  // ===== HANDLE EDIT FROM DETAILS =====
  const handleEditFromDetails = useCallback((event: any) => {
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
    vibrate();
  }, [setSelected, setForm, vibrate]);

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 p-2 sm:p-4 relative transition-all duration-500"
      {...(isMobile ? swipeHandlers : {})}
    >
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob dark:opacity-30"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000 dark:opacity-30"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000 dark:opacity-30"></div>
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto">
        
        {/* Pull to Refresh Indicator */}
        {isMobile && isRefreshing && (
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 mt-2 z-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        )}
        
        {/* Header Component */}
        <CalendarHeader
          mode={mode}
          setMode={setMode}
          calendarTheme={calendarTheme}
          setCalendarTheme={setCalendarTheme}
          showMoon={showMoon}
          setShowMoon={setShowMoon}
          isMobile={isMobile}
          setOpenCreate={setOpenCreate}
          setMobileMenuOpen={setMobileMenuOpen}
          setShowTemplates={setShowTemplates}
          setShowAnalytics={setShowAnalytics}
          setShowMeetingCoordinator={setShowMeetingCoordinator}
          setShowShortcutsHelp={setShowShortcutsHelp}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          focusMode={focusMode}
          setFocusMode={setFocusMode}
          batchMode={batchMode}
          setBatchMode={setBatchMode}
          userStats={userStats}
          isListening={isListening}
          startListening={startListening}
        />

        {/* Mobile Quick Actions Bar - Removed Photo Memories */}
        {isMobile && (
          <MobileQuickActions
            onMoodTrack={() => setShowMoodTracker(true)}
            onPomodoro={() => setShowPomodoroTimer(true)}
            onTimeBlock={() => setShowTimeBlocking(true)}
            onVoiceCommand={startListening}
            isListening={isListening}
          />
        )}

        {/* Batch Mode Actions Bar */}
        {batchMode && selectedBatchEvents.size > 0 && (
          <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {selectedBatchEvents.size} events selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBatchMove(1)}
                className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-all"
              >
                Move +1 day
              </button>
              <button
                onClick={() => handleBatchMove(-1)}
                className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-all"
              >
                Move -1 day
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden ${
          focusMode ? 'ring-4 ring-purple-500 ring-opacity-50' : ''
        }`}>
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
                userStats={userStats}
              />
            )}

            {/* Calendar or Feed View */}
            <div className="flex-1" ref={calendarRef}>
              {mode === 'whats' && feed.length > 0 ? (
                <FeedView
                  feed={feed.filter((e: any) => !e._dismissed)}
                  onDismiss={dismissFeedEvent}
                  onInterested={handleShowInterest}
                  onRSVP={handleRSVP}
                  onShowDetails={(event) => {
                    setSelectedFeedEvent(event);
                    setDetailsOpen(true);
                    vibrate();
                  }}
                  isMobile={isMobile}
                />
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
                  onDrop={isMobile ? undefined : onDrop}
                  onResize={isMobile ? undefined : onResize}
                  externalDragType={dragType}
                  externalDragTitle={draggedItem?.title}
                  onExternalDrop={handleExternalDrop}
                  darkMode={darkMode}
                  focusMode={focusMode}
                  selectedBatchEvents={batchMode ? selectedBatchEvents : undefined}
                />
              )}
            </div>
          </div>
        </div>

        {/* Mobile Floating Action Button */}
        {isMobile && (
          <FloatingActionButton
            onClick={() => setOpenCreate(true)}
            onLongPress={() => {
              vibrate();
              setQuickModalType('reminder');
              setQuickModalOpen(true);
            }}
          />
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
            userStats={userStats}
          />
        )}

        {/* Mood Tracker Modal */}
        {showMoodTracker && (
          <MoodTracker
            date={date}
            onClose={() => setShowMoodTracker(false)}
            onSave={(mood) => {
              // Save mood to database
              showToast({ type: 'success', message: `Mood saved: ${mood}` });
              addPoints(10, 'mood-track');
              setShowMoodTracker(false);
            }}
          />
        )}

        {/* All Other Modals */}
        <CalendarModals
          // Modal visibility states
          openCreate={openCreate}
          openEdit={openEdit}
          detailsOpen={detailsOpen}
          showAnalytics={showAnalytics}
          showTemplates={showTemplates}
          showMeetingCoordinator={showMeetingCoordinator}
          showShortcutsHelp={showShortcutsHelp}
          showCarpoolChat={showCarpoolChat}
          quickModalOpen={quickModalOpen}
          showPomodoroTimer={showPomodoroTimer}
          showTimeBlocking={showTimeBlocking}
          
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
          setShowPomodoroTimer={setShowPomodoroTimer}
          setShowTimeBlocking={setShowTimeBlocking}
          
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
          handleCreateEvent={async () => {
            await handleCreateEvent();
            showConfetti();
            addPoints(20, 'event-create');
          }}
          handleUpdateEvent={handleUpdateEvent}
          handleEdit={handleEditFromDetails}
          handleApplyTemplate={handleApplyTemplate}
          createQuickItem={async () => {
            await createQuickItem();
            addPoints(10, 'quick-create');
          }}
          createCarpoolGroup={async () => {
            await createCarpoolGroup();
            addPoints(30, 'carpool-create');
            showConfetti();
          }}
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
          animation: blob 7s infinite;
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
