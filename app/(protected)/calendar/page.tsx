// app/(protected)/calendar/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
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
import HolidayReminders from "./components/HolidayReminders";
import PersonalDates from "./components/PersonalDates";
import { Mode, TodoReminder, Friend, CarpoolMatch } from "./types";

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

// Mobile Lists Bottom Sheet Component
function MobileListsBottomSheet({ 
  open, 
  onClose, 
  reminders,
  todos,
  onToggleComplete,
  onDeleteItem,
  onCreateReminder,
  onCreateTodo
}: { 
  open: boolean; 
  onClose: () => void;
  reminders: TodoReminder[];
  todos: TodoReminder[];
  onToggleComplete: (item: TodoReminder) => void;
  onDeleteItem: (id: string) => void;
  onCreateReminder: () => void;
  onCreateTodo: () => void;
}) {
  const [dragPosition, setDragPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'todos' | 'reminders'>('todos');
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

  const visibleTodos = todos.filter(t => !t.completed);
  const visibleReminders = reminders.filter(r => !r.completed);

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
          maxHeight: '80vh'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>
        
        {/* Title & Tabs */}
        <div className="px-6 pb-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">My Lists</h2>
          
          {/* Tab Buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('todos')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'todos'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              To-dos ({visibleTodos.length})
            </button>
            <button
              onClick={() => setActiveTab('reminders')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'reminders'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              Reminders ({visibleReminders.length})
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="px-6 pb-6 overflow-y-auto" style={{ maxHeight: '50vh' }}>
          {activeTab === 'todos' && (
            <>
              {/* Add Todo Button */}
              <button
                onClick={() => {
                  onCreateTodo();
                  onClose();
                }}
                className="w-full mb-3 p-3 bg-green-50 dark:bg-green-900/20 border-2 border-dashed border-green-300 dark:border-green-700 rounded-lg flex items-center justify-center gap-2 hover:bg-green-100 dark:hover:bg-green-900/30 transition-all"
              >
                <span className="text-2xl">➕</span>
                <span className="font-medium text-green-700 dark:text-green-300">Add Todo</span>
              </button>

              {/* Todo List */}
              {visibleTodos.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No todos yet</p>
              ) : (
                <div className="space-y-2">
                  {visibleTodos.map((todo) => (
                    <div key={todo.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => onToggleComplete(todo)}
                        className="w-5 h-5 text-green-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{todo.title}</p>
                        {todo.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{todo.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => onDeleteItem(todo.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'reminders' && (
            <>
              {/* Add Reminder Button */}
              <button
                onClick={() => {
                  onCreateReminder();
                  onClose();
                }}
                className="w-full mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
              >
                <span className="text-2xl">➕</span>
                <span className="font-medium text-blue-700 dark:text-blue-300">Add Reminder</span>
              </button>

              {/* Reminder List */}
              {visibleReminders.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No reminders yet</p>
              ) : (
                <div className="space-y-2">
                  {visibleReminders.map((reminder) => (
                    <div key={reminder.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <input
                        type="checkbox"
                        checked={reminder.completed}
                        onChange={() => onToggleComplete(reminder)}
                        className="w-5 h-5 text-blue-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{reminder.title}</p>
                        {reminder.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{reminder.description}</p>
                        )}
                        {reminder.date && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {new Date(reminder.date).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => onDeleteItem(reminder.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function CalendarPage() {
  // ===== ROUTER FOR NAVIGATION =====
  const router = useRouter();

  // ===== CORE STATE =====
  const [mode, setMode] = useState<Mode>("my");
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>("month");
  const [showMoon, setShowMoon] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [batchMode, setBatchMode] = useState(false);
  const [selectedBatchEvents, setSelectedBatchEvents] = useState<Set<string>>(new Set());
  const [gamificationEnabled, setGamificationEnabled] = useState(false);
  
  // Lists sidebar state
  const [showListsSidebar, setShowListsSidebar] = useState(false);
  const [showMobileListsSheet, setShowMobileListsSheet] = useState(false);
  const [showCompletedItems, setShowCompletedItems] = useState(false);
  
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
  const [showHolidayReminders, setShowHolidayReminders] = useState(false);
  const [showPersonalDates, setShowPersonalDates] = useState(false);

  // ===== DRAG STATES FOR SIDEBAR =====
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

  // Use carpool matches hook
  const carpoolMatches = useCarpoolMatches(events, friends);

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
    },
    onSwipeRight: () => {
      if (!isMobile) return;
      vibrate();
      const newDate = new Date(date);
      if (view === 'month') newDate.setMonth(newDate.getMonth() - 1);
      else if (view === 'week') newDate.setDate(newDate.getDate() - 7);
      else newDate.setDate(newDate.getDate() - 1);
      setDate(newDate);
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
        showToast({ type: 'success', message: '🎤 Command recognized!' });
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
      } else if (lower.includes('holidays')) {
        setShowHolidayReminders(true);
        vibrate();
      } else if (lower.includes('birthdays') || lower.includes('anniversaries')) {
        setShowPersonalDates(true);
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
    
    if (view === 'month' && isMobile) {
      setDate(slotInfo.start);
      setView('day');
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
  }, [view, batchMode, isMobile, setForm, vibrate]);

  const onSelectEvent = useCallback((evt: any) => {
    const r = evt.resource as any;
    if (r?.moonPhase) {
      showToast({ 
        type: 'info', 
        message: `🌙 Moon Phase: ${r.moonPhase}`,
        duration: 3000
      });
      return;
    }
    
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
  }, [batchMode, setSelected, vibrate, showToast]);

  // ===== CARPOOL CHAT HELPER =====
  const openCarpoolChat = useCallback((event?: any) => {
    setSelectedCarpoolEvent(event || null);
    setShowCarpoolChat(true);
  }, [setSelectedCarpoolEvent]);

  // ===== QUICK ACTION HANDLERS FOR MOBILE LISTS =====
  const handleCreateReminder = useCallback(() => {
    setQuickModalType('reminder');
    setQuickModalOpen(true);
  }, []);

  const handleCreateTodo = useCallback(() => {
    setQuickModalType('todo');
    setQuickModalOpen(true);
  }, []);

  const calendarEvents = useMemo(() => 
    mode === 'my' ? (events || []) : [],
    [mode, events]
  );

  // Filter visible reminders and todos based on showCompletedItems
  const visibleReminders = useMemo(() => {
    const remindersList = reminders || [];
    if (!remindersList || remindersList.length === 0) return [];
    return showCompletedItems ? remindersList : remindersList.filter(r => r && !r.completed);
  }, [reminders, showCompletedItems]);

  const visibleTodos = useMemo(() => {
    const todosList = todos || [];
    if (!todosList || todosList.length === 0) return [];
    return showCompletedItems ? todosList : todosList.filter(t => t && !t.completed);
  }, [todos, showCompletedItems]);

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
        
        {/* Header */}
        <CalendarHeader
          mode={mode}
          setMode={setMode}
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
          activeHeaderTab={'calendar'}
          setActiveHeaderTab={() => {}}
          gamificationEnabled={gamificationEnabled}
          setGamificationEnabled={setGamificationEnabled}
          setShowCarpoolChat={() => {
            setSelectedCarpoolEvent(null);
            setShowCarpoolChat(true);
          }}
          setSelectedCarpoolEvent={setSelectedCarpoolEvent}
          showListsSidebar={showListsSidebar}
          setShowListsSidebar={setShowListsSidebar}
          onListsClick={() => {
            if (isMobile) {
              setShowMobileListsSheet(true);
            } else {
              setShowListsSidebar(!showListsSidebar);
            }
          }}
          setShowTimeBlocking={setShowTimeBlocking}
        />

        {/* Holiday Reminders & Personal Dates Buttons */}
        <div className="mb-2 flex justify-end gap-2">
          <button
            onClick={() => setShowHolidayReminders(true)}
            className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-green-500 text-white rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all"
          >
            🎄 Holiday Reminders
          </button>
          <button
            onClick={() => setShowPersonalDates(true)}
            className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all"
          >
            🎂 Birthdays & Anniversaries
          </button>
        </div>

        {/* Main Content Area */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden">
          <div className="flex gap-4 p-2 sm:p-4">
            
            {/* Desktop Sidebar */}
            {mode === 'my' && !isMobile && (
              <div className={`transition-all duration-300 ${showListsSidebar ? 'w-80' : 'w-0'}`}>
                {showListsSidebar && (
                  <CalendarSidebar
                    carpoolMatches={carpoolMatches}
                    friends={friends}
                    visibleReminders={visibleReminders}
                    visibleTodos={visibleTodos}
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
                    userStats={gamificationEnabled ? userStats : null}
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

        {/* Mobile Lists Bottom Sheet */}
        {isMobile && (
          <MobileListsBottomSheet
            open={showMobileListsSheet}
            onClose={() => setShowMobileListsSheet(false)}
            reminders={reminders || []}
            todos={todos || []}
            onToggleComplete={handleToggleComplete}
            onDeleteItem={handleDeleteItem}
            onCreateReminder={handleCreateReminder}
            onCreateTodo={handleCreateTodo}
          />
        )}

        {/* Mobile Sidebar (for other features) */}
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
            userStats={gamificationEnabled ? userStats : null}
          />
        )}

        {/* Holiday Reminders Modal */}
        {showHolidayReminders && (
          <HolidayReminders
            onClose={() => setShowHolidayReminders(false)}
            onAddToCalendar={(holiday: any) => {
              setForm({
                ...form,
                title: holiday.name,
                start: holiday.date,
                end: holiday.date,
                event_type: 'holiday'
              });
              setOpenCreate(true);
              setShowHolidayReminders(false);
            }}
          />
        )}

        {/* Personal Dates Modal */}
        {showPersonalDates && (
          <PersonalDates
            onClose={() => setShowPersonalDates(false)}
            userId={me}
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
          events={events}
          friends={friends}
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
          handleEdit={(event: any) => {
            setSelected(event);
            setForm({
              ...form,
              title: event.title || "",
              description: event.description || "",
              location: event.location || "",
              start: new Date(event.start_time).toISOString().slice(0, 16),
              end: new Date(event.end_time).toISOString().slice(0, 16),
              visibility: event.visibility,
              event_type: event.event_type || ""
            });
            setOpenEdit(true);
            setDetailsOpen(false);
            vibrate();
          }}
          handleApplyTemplate={handleApplyTemplate}
          createQuickItem={createQuickItem}
          createCarpoolGroup={async () => {
            await createCarpoolGroup();
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
