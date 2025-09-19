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

// ADD: Lists Bottom Sheet Component for Mobile
function MobileListsBottomSheet({ 
  open, 
  onClose, 
  onNavigate 
}: { 
  open: boolean; 
  onClose: () => void; 
  onNavigate: (path: string) => void;
}) {
  const [dragPosition, setDragPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff > 0) {
      setDragPosition(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragPosition > 100) {
      onClose();
    }
    setDragPosition(0);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 z-40 md:hidden"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div 
        className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl z-50 md:hidden transition-transform`}
        style={{ 
          transform: `translateY(${dragPosition}px)`,
          maxHeight: '70vh'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>
        
        {/* Title */}
        <div className="px-6 pb-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Lists</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Tap to view or drag items to calendar</p>
        </div>
        
        {/* List Options */}
        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={() => {
              onNavigate('/todos');
              onClose();
            }}
            className="w-full p-4 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-between group hover:bg-green-100 dark:hover:bg-green-900/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white">To-dos</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tasks & projects</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={() => {
              onNavigate('/reminders');
              onClose();
            }}
            className="w-full p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-between group hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🔔</span>
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white">Reminders</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Time-based alerts</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={() => {
              onNavigate('/shopping');
              onClose();
            }}
            className="w-full p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-between group hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🛒</span>
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white">Shopping List</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Things to buy</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Quick Stats */}
        <div className="px-6 pb-8 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">12</div>
              <div className="text-xs text-gray-500">Todos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">5</div>
              <div className="text-xs text-gray-500">Reminders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">8</div>
              <div className="text-xs text-gray-500">Shopping</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

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

  const [batchMode, setBatchMode] = useState(false);
  const [selectedBatchEvents, setSelectedBatchEvents] = useState<Set<string>>(new Set());
  const [gamificationEnabled, setGamificationEnabled] = useState(false);
  
  // ADD: Lists sidebar state
  const [showListsSidebar, setShowListsSidebar] = useState(false);
  const [showMobileListsSheet, setShowMobileListsSheet] = useState(false);
  
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

  // ===== DRAG STATES FOR SIDEBAR (minimal for calendar integration) =====
  const [draggedItem, setDraggedItem] = useState<TodoReminder | null>(null);
  const [dragType, setDragType] = useState<'reminder' | 'todo' | 'none'>('none');

  // ===== REFS FOR MOBILE INTERACTIONS =====
  const calendarRef = useRef<HTMLDivElement>(null);
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
    handleShowInterest,
    handleRSVP,
    dismissFeedEvent,
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
  } = useGameification(gamificationEnabled ? me : null);

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
    
    // Load sidebar preference from localStorage
    const savedSidebarState = localStorage.getItem('calendarListsSidebarOpen');
    if (savedSidebarState !== null && !isMobile) {
      setShowListsSidebar(savedSidebarState === 'true');
    }
    
    window.addEventListener('resize', checkMobile);
    const darkModeInterval = setInterval(checkDarkMode, 60000);
    
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

  // ===== Save sidebar state to localStorage =====
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('calendarListsSidebarOpen', showListsSidebar.toString());
    }
  }, [showListsSidebar, isMobile]);

  // ===== HAPTIC FEEDBACK =====
  const vibrate = useCallback(() => {
    if (!isMobile) return;
    
    const now = Date.now();
    if (now - lastVibrationTime.current < 50) return;
    
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
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

  // ADD: Navigation handler for lists
  const handleListNavigation = useCallback((path: string) => {
    // Use your router to navigate
    window.location.href = path;
  }, []);

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
  }, [isMobile, isRefreshing, mode, loadCalendar, loadFeed, showToast, vibrate, gamificationEnabled, addPoints]);

  // ===== CALENDAR NAVIGATION =====
  const onSelectSlot = useCallback((slotInfo: any) => {
    if (batchMode) return;
    
    if (isMobile) {
      vibrate();
    }
    
    if (view === 'month') {
      setDate(slotInfo.start);
      setView('day');
      if (isMobile) {
        showToast({ 
          type: 'info', 
          message: `Viewing ${formatDateForToast(slotInfo.start)}`,
          duration: 1500
        });
      }
      return;
    }
    
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
      
      if (gamificationEnabled) {
        showConfetti();
        addPoints(selectedBatchEvents.size * 10, 'batch-delete');
      }
      setSelectedBatchEvents(new Set());
      setBatchMode(false);
    }
  }, [selectedBatchEvents, handleDeleteEvent, gamificationEnabled, showConfetti, addPoints]);

  const handleBatchMove = useCallback((days: number) => {
    if (selectedBatchEvents.size === 0) return;
    
    showToast({ 
      type: 'success', 
      message: `Moved ${selectedBatchEvents.size} events ${days > 0 ? 'forward' : 'backward'} ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}`
    });
    
    if (gamificationEnabled) {
      addPoints(selectedBatchEvents.size * 5, 'batch-move');
    }
    setSelectedBatchEvents(new Set());
    setBatchMode(false);
  }, [selectedBatchEvents, showToast, gamificationEnabled, addPoints]);

  // ===== CARPOOL CHAT HELPER =====
  const openCarpoolChat = useCallback((event: any) => {
    setSelectedCarpoolEvent(event);
    setShowCarpoolChat(true);
  }, [setSelectedCarpoolEvent]);

  const calendarEvents = useMemo(() => 
    mode === 'my' ? (events || []) : [],
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
        
        {/* Header Component - ADD Lists Button */}
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
          batchMode={batchMode}
          setBatchMode={setBatchMode}
          userStats={gamificationEnabled ? userStats : null}
          isListening={isListening}
          startListening={startListening}
          gamificationEnabled={gamificationEnabled}
          setGamificationEnabled={setGamificationEnabled}
          // ADD: Lists button handlers
          showListsSidebar={showListsSidebar}
          setShowListsSidebar={setShowListsSidebar}
          onListsClick={() => {
            if (isMobile) {
              setShowMobileListsSheet(true);
            } else {
              setShowListsSidebar(!showListsSidebar);
            }
          }}
        />

        {/* Mobile Quick Actions Bar */}
        {isMobile && (
          <div className="flex items-center justify-between mb-3 px-2">
            <MobileQuickActions
              onPomodoro={() => setShowPomodoroTimer(true)}
              onTimeBlock={() => setShowTimeBlocking(true)}
              onVoiceCommand={startListening}
              isListening={isListening}
            />
            
            {/* ADD: Mobile Lists Button */}
            <button
              onClick={() => setShowMobileListsSheet(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white/80 dark:bg-gray-800/80 rounded-lg shadow-sm whitespace-nowrap text-sm ml-2"
            >
              📋 Lists
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
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden">
          <div className="flex gap-4 p-2 sm:p-4">
            
            {/* Enhanced Desktop Sidebar - Now Collapsible */}
            {mode === 'my' && !isMobile && (
              <div className={`transition-all duration-300 ${showListsSidebar ? 'w-80' : 'w-0'}`}>
                {showListsSidebar && (
                  <CalendarSidebar
                    carpoolMatches={carpoolMatches || []}
                    friends={friends || []}
                    visibleReminders={reminders || []}
                    visibleTodos={todos || []}
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
                    userStats={gamificationEnabled ? userStats : null}
                    // ADD: Shopping navigation
                    onNavigateToLists={(listType: string) => {
                      if (listType === 'shopping') {
                        handleListNavigation('/shopping');
                      } else if (listType === 'reminders') {
                        handleListNavigation('/reminders');
                      } else if (listType === 'todos') {
                        handleListNavigation('/todos');
                      }
                    }}
                  />
                )}
              </div>
            )}

            {/* Calendar or Feed View */}
            <div className="flex-1" ref={calendarRef}>
              {mode === 'whats' && feed && feed.length > 0 ? (
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

        {/* Mobile Lists Bottom Sheet - ADD */}
        {isMobile && (
          <MobileListsBottomSheet
            open={showMobileListsSheet}
            onClose={() => setShowMobileListsSheet(false)}
            onNavigate={handleListNavigation}
          />
        )}

        {/* Mobile Sidebar (for other features, not lists) */}
        {isMobile && (
          <MobileSidebar
            open={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            carpoolMatches={carpoolMatches || []}
            friends={friends || []}
            visibleReminders={reminders || []}
            visibleTodos={todos || []}
            openCarpoolChat={(event) => {
              openCarpoolChat(event);
              setMobileMenuOpen(false);
            }}
            setQuickModalType={setQuickModalType}
            setQuickModalOpen={setQuickModalOpen}
            setShowTemplates={setShowTemplates}
            setShowAnalytics={setShowAnalytics}
            setShowMeetingCoordinator={setShowMeetingCoordinator}
            userStats={gamificationEnabled ? userStats : null}
            gamificationEnabled={gamificationEnabled}
            setGamificationEnabled={setGamificationEnabled}
          />
        )}

        {/* All Other Modals */}
        <CalendarModals
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
          
          me={me}
          selected={selected}
          selectedFeedEvent={selectedFeedEvent}
          selectedCarpoolEvent={selectedCarpoolEvent}
          selectedCarpoolFriends={selectedCarpoolFriends}
          setSelectedCarpoolFriends={setSelectedCarpoolFriends}
          events={events || []}
          friends={friends || []}
          form={form}
          setForm={setForm}
          quickModalForm={quickModalForm}
          setQuickModalForm={setQuickModalForm}
          quickModalType={quickModalType}
          isMobile={isMobile}
          
          handleCreateEvent={async () => {
            await handleCreateEvent();
            if (gamificationEnabled) {
              showConfetti();
              addPoints(20, 'event-create');
            }
          }}
          handleUpdateEvent={handleUpdateEvent}
          handleEdit={handleEditFromDetails}
          handleApplyTemplate={handleApplyTemplate}
          createCarpoolGroup={async () => {
            await createCarpoolGroup();
            if (gamificationEnabled) {
              addPoints(30, 'carpool-create');
              showConfetti();
            }
          }}
          resetForm={resetForm}
          gamificationEnabled={gamificationEnabled}
          setGamificationEnabled={setGamificationEnabled}
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
