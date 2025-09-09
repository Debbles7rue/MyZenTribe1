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
import { useCarpoolMatches } from "./hooks/useCarpoolMatches";
import CalendarHeader from "./components/CalendarHeader";
import CalendarSidebar from "./components/CalendarSidebar";
import MobileSidebar from "./components/MobileSidebar";
import FeedView from "./components/FeedView";
import CalendarModals from "./components/CalendarModals";
import FloatingActionButton from "./components/FloatingActionButton";
import MoodTracker from "./components/MoodTracker";
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
  const [showMoodTracker, setShowMoodTracker] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedBatchEvents, setSelectedBatchEvents] = useState<Set<string>>(new Set());
  
  // ===== GAMIFICATION STATE (NOW OPTIONAL) =====
  const [gamificationEnabled, setGamificationEnabled] = useState(false);
  
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
  
  // ===== HEADER TABS STATE (MOVED FROM SIDEBAR) =====
  const [activeHeaderTab, setActiveHeaderTab] = useState<'calendar' | 'reminders' | 'todos' | 'templates'>('calendar');
  const [showCompletedItems, setShowCompletedItems] = useState(false);

  // ===== SIDEBAR STATES =====
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

  // ===== CARPOOL MATCHES HOOK =====
  const {
    carpoolMatches,
    suggestedCarpools,
    loading: carpoolLoading,
    createCarpoolGroup: createCarpoolFromMatch,
    sendCarpoolInvite,
    calculateImpact
  } = useCarpoolMatches({ userId: me, events, friends });

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

  // ===== GAMIFICATION HOOKS (NOW CONDITIONAL) =====
  const { 
    userStats, 
    checkAchievements, 
    addPoints,
    showConfetti 
  } = useGameification(gamificationEnabled ? me : null); // Only active if enabled

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
      }
    }
  });

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
      
      // Add points for refresh (only if gamification enabled)
      if (gamificationEnabled) {
        addPoints(5, 'refresh');
      }
    } catch (error) {
      showToast({ 
        type: 'error', 
        message: 'Failed to refresh' 
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [isMobile, isRefreshing, mode, loadCalendar, loadFeed, showToast, vibrate, addPoints, gamificationEnabled]);

  // ===== CALENDAR NAVIGATION =====
  const onSelectSlot = useCallback((slotInfo: any) => {
    if (batchMode) return; // Disable slot selection in batch mode
    
    vibrate();
    
    if (view === 'month' && isMobile) {
      setDate(slotInfo.start);
      setView('day');
      return;
    }

    const start = slotInfo.start || new Date();
    const end = slotInfo.end || new Date(start.getTime() + 3600000);
    
    setForm(prev => ({
      ...prev,
      start: new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
      end: new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    }));
    setOpenCreate(true);
  }, [view, isMobile, batchMode, setForm, vibrate]);

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
  }, [batchMode, selectedBatchEvents, setSelected, vibrate]);

  // ===== BATCH ACTIONS =====
  const handleBatchDelete = useCallback(async () => {
    if (selectedBatchEvents.size === 0) return;
    
    if (confirm(`Delete ${selectedBatchEvents.size} events?`)) {
      for (const eventId of selectedBatchEvents) {
        await handleDeleteEvent(eventId);
      }
      
      if (gamificationEnabled) {
        showConfetti();
        addPoints(selectedBatchEvents.size * 10, 'batch-delete');
      }
      setSelectedBatchEvents(new Set());
      setBatchMode(false);
    }
  }, [selectedBatchEvents, handleDeleteEvent, showConfetti, addPoints, gamificationEnabled]);

  const handleBatchMove = useCallback((days: number) => {
    if (selectedBatchEvents.size === 0) return;
    
    // Implementation for batch move
    showToast({ 
      type: 'success', 
      message: `Moved ${selectedBatchEvents.size} events ${days > 0 ? 'forward' : 'backward'} ${Math.abs(days)} days` 
    });
    
    if (gamificationEnabled) {
      addPoints(selectedBatchEvents.size * 5, 'batch-move');
    }
    setSelectedBatchEvents(new Set());
    setBatchMode(false);
  }, [selectedBatchEvents, showToast, addPoints, gamificationEnabled]);

  // ===== HELPER FUNCTIONS =====
  const formatDateForToast = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const openCarpoolChat = (event?: any) => {
    setSelectedCarpoolEvent(event || null);
    setSelectedCarpoolFriends(new Set());
    setShowCarpoolChat(true);
    vibrate();
  };

  // ===== FILTERED DATA =====
  const calendarEvents = useMemo(() => {
    let filteredEvents = mode === 'whats' ? feed.filter(e => !e._dismissed) : events;
    return filteredEvents;
  }, [mode, events, feed]);

  const visibleReminders = useMemo(() => {
    return reminders.filter(r => showCompletedItems || !r.completed);
  }, [reminders, showCompletedItems]);

  const visibleTodos = useMemo(() => {
    return todos.filter(t => showCompletedItems || !t.completed);
  }, [todos, showCompletedItems]);

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' 
        : 'bg-gradient-to-br from-purple-50 via-white to-pink-50'
    }`}>
      {/* Pull to Refresh Indicator */}
      {isMobile && (
        <div 
          ref={pullToRefreshRef}
          className={`fixed top-0 left-0 right-0 z-50 flex justify-center py-2 transition-all duration-300 ${
            isRefreshing ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
          }`}
        >
          <div className="bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Refreshing...</span>
          </div>
        </div>
      )}

      {/* Animated Background - Desktop only */}
      {!isMobile && !darkMode && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-20 w-96 h-96 bg-purple-200 rounded-full
                        mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
          <div className="absolute top-40 right-20 w-96 h-96 bg-pink-200 rounded-full
                        mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
          <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-yellow-200 rounded-full
                        mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
        </div>
      )}

      {/* Gamification Achievements Popup (Only if enabled) */}
      {gamificationEnabled && userStats?.lastAchievement && (
        <div className="fixed top-4 right-4 z-50 animate-bounce-in">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg px-4 py-3 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              <div>
                <div className="font-bold">Achievement Unlocked!</div>
                <div className="text-sm opacity-90">{userStats.lastAchievement}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div 
        className="relative z-10 container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-7xl"
        {...(isMobile ? swipeHandlers : {})}
      >
        
        {/* Header Component with Tab Navigation */}
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
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          batchMode={batchMode}
          setBatchMode={setBatchMode}
          userStats={gamificationEnabled ? userStats : null}
          isListening={isListening}
          startListening={startListening}
          activeHeaderTab={activeHeaderTab}
          setActiveHeaderTab={setActiveHeaderTab}
          gamificationEnabled={gamificationEnabled}
          setGamificationEnabled={setGamificationEnabled}
        />

        {/* Header Tab Content (Templates, Reminders, Todos) */}
        {activeHeaderTab !== 'calendar' && (
          <div className="mb-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-xl shadow-lg p-4">
            {activeHeaderTab === 'templates' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Templates & Goals</h3>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={gamificationEnabled}
                        onChange={(e) => setGamificationEnabled(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-gray-600 dark:text-gray-400">Enable Goal Tracking</span>
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowTemplates(true)}
                    className="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all"
                  >
                    📋 Browse Event Templates
                  </button>
                  <button
                    onClick={() => setShowTimeBlocking(true)}
                    className="px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all"
                  >
                    ⏰ Time Block Schedule
                  </button>
                </div>
                {gamificationEnabled && userStats && (
                  <div className="mt-4 p-3 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Stats</div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{userStats.points}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Points</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">{userStats.streak}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Day Streak</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{userStats.level}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Level</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeHeaderTab === 'reminders' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Reminders</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setQuickModalType('reminder');
                        setQuickModalOpen(true);
                      }}
                      className="px-3 py-1 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600"
                    >
                      + Add Reminder
                    </button>
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={showCompletedItems}
                        onChange={(e) => setShowCompletedItems(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span>Show completed</span>
                    </label>
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {visibleReminders.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">No reminders yet</p>
                  ) : (
                    visibleReminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className={`p-2 rounded-lg border ${
                          reminder.completed 
                            ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 opacity-60' 
                            : 'bg-white dark:bg-gray-700 border-purple-200 dark:border-purple-700'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={reminder.completed}
                            onChange={() => handleToggleComplete(reminder.id, 'reminder')}
                            className="mt-1 rounded border-gray-300"
                          />
                          <div className="flex-1">
                            <div className={`text-sm ${reminder.completed ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                              {reminder.title}
                            </div>
                            {reminder.due_date && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Due: {new Date(reminder.due_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteItem(reminder.id, 'reminder')}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeHeaderTab === 'todos' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">To-Dos</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setQuickModalType('todo');
                        setQuickModalOpen(true);
                      }}
                      className="px-3 py-1 bg-pink-500 text-white rounded-lg text-sm hover:bg-pink-600"
                    >
                      + Add To-Do
                    </button>
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={showCompletedItems}
                        onChange={(e) => setShowCompletedItems(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span>Show completed</span>
                    </label>
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {visibleTodos.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">No to-dos yet</p>
                  ) : (
                    visibleTodos.map((todo) => (
                      <div
                        key={todo.id}
                        className={`p-2 rounded-lg border ${
                          todo.completed 
                            ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 opacity-60' 
                            : 'bg-white dark:bg-gray-700 border-pink-200 dark:border-pink-700'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={todo.completed}
                            onChange={() => handleToggleComplete(todo.id, 'todo')}
                            className="mt-1 rounded border-gray-300"
                          />
                          <div className="flex-1">
                            <div className={`text-sm ${todo.completed ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                              {todo.title}
                            </div>
                            {todo.priority && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                todo.priority === 'high' ? 'bg-red-100 text-red-700' :
                                todo.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {todo.priority}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteItem(todo.id, 'todo')}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mobile Quick Actions Bar - Only Mood Tracker */}
        {isMobile && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setShowMoodTracker(true)}
              className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-lg text-sm font-medium shadow-md"
            >
              😊 Track Mood
            </button>
            <button
              onClick={startListening}
              className={`flex-shrink-0 px-4 py-2 ${
                isListening 
                  ? 'bg-red-500 animate-pulse' 
                  : 'bg-gradient-to-r from-blue-400 to-purple-400'
              } text-white rounded-lg text-sm font-medium shadow-md`}
            >
              {isListening ? '🎤 Listening...' : '🎙️ Voice Command'}
            </button>
          </div>
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
                className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
              >
                Move +1 day
              </button>
              <button
                onClick={() => handleBatchMove(-1)}
                className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
              >
                Move -1 day
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden">
          <div className="flex gap-4 p-2 sm:p-4">
            
            {/* Simplified Desktop Sidebar - Only Carpool */}
            {mode === 'my' && !isMobile && (
              <div className="w-64 space-y-4">
                {/* Carpool Matches */}
                {carpoolMatches.length > 0 && (
                  <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <span>🚗</span> Carpool Opportunities
                    </h3>
                    <div className="space-y-2">
                      {carpoolMatches.slice(0, 3).map((match, idx) => (
                        <div
                          key={idx}
                          className="p-2 bg-white/70 dark:bg-gray-700/70 rounded-lg cursor-pointer hover:shadow-md transition-all"
                          onClick={() => openCarpoolChat(match.event)}
                        >
                          <div className="text-xs font-medium text-gray-800 dark:text-gray-200">
                            {match.event.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {match.matches.length} potential carpoolers
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Calendar or Feed View */}
            <div className="flex-1" ref={calendarRef}>
              {mode === 'whats' && feed.length > 0 ? (
                <FeedView
                  feed={feed.filter(e => !e._dismissed)}
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

        {/* Mobile Sidebar (Simplified) */}
        {isMobile && (
          <MobileSidebar
            open={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            carpoolMatches={carpoolMatches}
            friends={friends}
            visibleReminders={[]} // Empty since we moved to header
            visibleTodos={[]} // Empty since we moved to header
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
            userStats={gamificationEnabled ? userStats : null}
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
              if (gamificationEnabled) {
                addPoints(10, 'mood-track');
              }
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
          showTimeBlocking={false} // Disabled as requested
          
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
          setShowTimeBlocking={() => {}} // Disabled
          
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
          handleCreateEvent={() => {
            handleCreateEvent();
            if (gamificationEnabled) {
              showConfetti();
              addPoints(20, 'event-create');
            }
          }}
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
              cover_photo: event.cover_photo || "",
              pre_event: event.pre_event || null,
              post_event: event.post_event || null,
            });
            setOpenEdit(true);
            setDetailsOpen(false);
            vibrate();
          }}
          handleApplyTemplate={handleApplyTemplate}
          createQuickItem={() => {
            createQuickItem();
            if (gamificationEnabled) {
              addPoints(10, 'quick-create');
            }
          }}
          createCarpoolGroup={() => {
            createCarpoolGroup();
            if (gamificationEnabled) {
              addPoints(30, 'carpool-create');
              showConfetti();
            }
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
          animation: blob 10s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        @keyframes bounce-in {
          0% {
            transform: scale(0) rotate(-180deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.2) rotate(10deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        
        /* Mobile optimizations */
        @media (max-width: 640px) {
          .rbc-calendar {
            font-size: 0.875rem;
          }
          
          .rbc-toolbar {
            flex-direction: column;
            gap: 0.5rem;
            padding: 0.5rem;
          }
          
          .rbc-event {
            font-size: 0.75rem;
            padding: 0.125rem;
          }
          
          /* Better touch targets */
          .rbc-day-bg, .rbc-date-cell {
            min-height: 44px;
            touch-action: manipulation;
          }
          
          /* Smooth scrolling */
          .rbc-time-view {
            scroll-behavior: smooth;
            -webkit-overflow-scrolling: touch;
          }
        }
        
        /* Dark mode transitions */
        .dark * {
          transition: background-color 0.3s ease, color 0.3s ease;
        }
      `}</style>
    </div>
  );
}
