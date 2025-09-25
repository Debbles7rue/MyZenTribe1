// app/(protected)/calendar/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import type { View } from "react-big-calendar";
import { useToast } from "@/components/ToastProvider";
import { useMoon } from "@/lib/useMoon";
import { supabase } from "@/lib/supabaseClient";

// Import our modular components
import { useCalendarData } from "./hooks/useCalendarData";
import { useCalendarActions } from "./hooks/useCalendarActions";
import { useSwipeGestures } from "./hooks/useSwipeGestures";
import { useVoiceCommands } from "./hooks/useVoiceCommands";
import { useNotifications } from "./hooks/useNotifications";
import { useGameification } from "./hooks/useGameification";
// Removed useCarpoolMatches import - using inline calculation instead
import CalendarHeader from "./components/CalendarHeader";
import MobileListsBottomSheet from "./components/MobileListsBottomSheet";
import AnimatedBackground from "./components/AnimatedBackground";
import QuickAccessButtons from "./components/QuickAccessButtons";
import PullToRefresh from "./components/PullToRefresh";
import CalendarSidebar from "./components/CalendarSidebar";
import MobileSidebar from "./components/MobileSidebar";
import FeedView from "./components/FeedView";
import CalendarModals from "./components/CalendarModals";
import FloatingActionButton from "./components/FloatingActionButton";
import MoodTracker from "./components/MoodTracker";
import HolidayReminders from "./components/HolidayReminders";
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

export default function CalendarPage() {
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
  const [showRemindersList, setShowRemindersList] = useState(true);
  const [showTodosList, setShowTodosList] = useState(true);
  
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
  const [quickModalType, setQuickModalType] = useState<'reminder' | 'todo' | 'shopping'>('reminder');
  const [showPomodoroTimer, setShowPomodoroTimer] = useState(false);
  const [showTimeBlocking, setShowTimeBlocking] = useState(false);
  const [showHolidayReminders, setShowHolidayReminders] = useState(false);

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

  // FIX: Ensure arrays are always arrays, never undefined
  const safeReminders: TodoReminder[] = Array.isArray(reminders) ? reminders : [];
  const safeTodos: TodoReminder[] = Array.isArray(todos) ? todos : [];
  const safeFriends: Friend[] = Array.isArray(friends) ? friends : [];
  const safeEvents = Array.isArray(events) ? events : [];
  const safeFeed = Array.isArray(feed) ? feed : [];

  // FIXED: Create carpool matches with the expected format
  const carpoolMatches = useMemo<CarpoolMatch[]>(() => {
    if (!safeEvents.length || !safeFriends.length) return [];
    
    // Find events that friends might also be attending
    const matches: CarpoolMatch[] = [];
    
    safeEvents.forEach(event => {
      // Only check future events with locations
      if (new Date(event.start_time) > new Date() && event.location) {
        // For now, create potential matches for events
        // In production, this would check actual friend events
        const attendingFriends = safeFriends.filter(f => 
          // This is a placeholder - in real app, check if friend has similar event
          Math.random() > 0.7 // 30% chance for demo purposes
        );
        
        if (attendingFriends.length > 0) {
          matches.push({
            event,
            friends: attendingFriends,
            savings: {
              amount: `${(5 + Math.random() * 10).toFixed(2)}`,
              co2Saved: parseFloat((2 + Math.random() * 3).toFixed(1))
            }
          });
        }
      }
    });
    
    return matches.slice(0, 5); // Limit to 5 matches
  }, [safeEvents, safeFriends]);

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
    friends: safeFriends,
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
  useNotifications(safeReminders, safeTodos, safeEvents, showToast);

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

  // Navigation handler for lists
  const handleListNavigation = useCallback((path: string) => {
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

  const calendarEvents = useMemo(() => 
    mode === 'my' ? safeEvents : [],
    [mode, safeEvents]
  );

  // FIX: Filter visible reminders and todos with guaranteed arrays
  const visibleReminders = useMemo(() => {
    const filtered = showCompletedItems 
      ? safeReminders 
      : safeReminders.filter(r => !r.completed);
    return filtered || [];
  }, [safeReminders, showCompletedItems]);

  const visibleTodos = useMemo(() => {
    const filtered = showCompletedItems 
      ? safeTodos 
      : safeTodos.filter(t => !t.completed);
    return filtered || [];
  }, [safeTodos, showCompletedItems]);

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 p-2 sm:p-4 relative transition-all duration-500"
      {...(isMobile ? swipeHandlers : {})}
    >
      {/* Animated Background Blobs */}
      <AnimatedBackground />

      <div className="relative z-10 max-w-[1600px] mx-auto">
        
        {/* Pull to Refresh Indicator */}
        <PullToRefresh isRefreshing={isRefreshing} isMobile={isMobile} />
        
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
          setShowCarpoolChat={setShowCarpoolChat}
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

        {/* Quick Access Buttons */}
        <div className="mb-2 flex justify-end">
          <QuickAccessButtons 
            onHolidayReminders={() => {
              console.log('Setting showHolidayReminders to true');
              setShowHolidayReminders(true);
            }}
          />
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
                    friends={safeFriends}
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
                    userStats={gamificationEnabled ? userStats : null}
                  />
                )}
              </div>
            )}

            {/* Calendar or Feed View */}
            <div className="flex-1" ref={calendarRef}>
              {mode === 'whats' && safeFeed.length > 0 ? (
                <FeedView
                  feed={safeFeed.filter((e: any) => !e._dismissed)}
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
            onNavigate={handleListNavigation}
          />
        )}

        {/* Mobile Sidebar */}
        {isMobile && (
          <MobileSidebar
            open={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            carpoolMatches={carpoolMatches}
            friends={safeFriends}
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
            gamificationEnabled={gamificationEnabled}
            setGamificationEnabled={setGamificationEnabled}
          />
        )}

        {/* Holiday Reminders Modal - FIXED TO ADD DIRECTLY TO CALENDAR */}
        {showHolidayReminders && (
          <HolidayReminders
            onClose={() => setShowHolidayReminders(false)}
            onAddToCalendar={async (holiday: any) => {
              if (!me) {
                showToast({ type: 'error', message: 'Please log in first' });
                return;
              }

              try {
                // Create all-day event for the holiday
                const holidayDate = new Date(holiday.date);
                const startTime = new Date(holidayDate);
                startTime.setHours(0, 0, 0, 0);
                const endTime = new Date(holidayDate);
                endTime.setHours(23, 59, 59, 999);

                const { error } = await supabase.from('events').insert({
                  title: `${holiday.emoji} ${holiday.name}`,
                  description: holiday.description || '',
                  start_time: startTime.toISOString(),
                  end_time: endTime.toISOString(),
                  created_by: me,
                  visibility: 'private',
                  source: 'personal',
                  event_type: 'holiday',
                  completed: false
                });

                if (!error) {
                  showToast({ 
                    type: 'success', 
                    message: `🎉 Added ${holiday.name} to your calendar!` 
                  });
                  await loadCalendar(); // Refresh to show new holiday
                } else {
                  showToast({ 
                    type: 'error', 
                    message: `Failed to add ${holiday.name}` 
                  });
                }
              } catch (error) {
                console.error('Error adding holiday:', error);
              }
            }}
            existingEvents={safeEvents}
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
          showHolidayReminders={showHolidayReminders}
          
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
          setShowHolidayReminders={setShowHolidayReminders}
          
          me={me}
          selected={selected}
          selectedFeedEvent={selectedFeedEvent}
          selectedCarpoolEvent={selectedCarpoolEvent}
          selectedCarpoolFriends={selectedCarpoolFriends}
          setSelectedCarpoolFriends={setSelectedCarpoolFriends}
          events={safeEvents}
          friends={safeFriends}
          form={form}
          setForm={setForm}
          quickModalForm={quickModalForm}
          setQuickModalForm={setQuickModalForm}
          quickModalType={quickModalType}
          isMobile={isMobile}
          loadCalendar={loadCalendar}
          
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
          showToast={showToast}
        />
      </div>
    </div>
  );
}
