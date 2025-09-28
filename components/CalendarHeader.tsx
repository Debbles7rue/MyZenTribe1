// components/CalendarHeader.tsx
"use client";

import React from "react";

// Define the type for user stats (for gamification)
interface UserStats {
  level: number;
  points: number;
  streak: number;
  achievements: string[];
}

interface CalendarHeaderProps {
  mode: "my" | "whats";
  setMode: (mode: "my" | "whats") => void;
  showMoon: boolean;
  setShowMoon: (show: boolean) => void;
  isMobile: boolean;
  setOpenCreate: (open: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  setShowTemplates: (show: boolean) => void;
  setShowAnalytics: (show: boolean) => void;
  setShowMeetingCoordinator: (show: boolean) => void;
  setShowShortcutsHelp: (show: boolean) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  batchMode: boolean;
  setBatchMode: (batch: boolean) => void;
  userStats?: UserStats | null;
  isListening: boolean;
  startListening: () => void;
  activeHeaderTab: string;
  setActiveHeaderTab: (tab: string) => void;
  gamificationEnabled: boolean;
  setGamificationEnabled: (enabled: boolean) => void;
  setShowCarpoolChat: (show: boolean) => void;
  setSelectedCarpoolEvent: (event: any) => void;
  showListsSidebar: boolean;
  setShowListsSidebar: (show: boolean) => void;
  onListsClick: () => void;
  setShowTimeBlocking: (show: boolean) => void;
}

export default function CalendarHeader({
  mode,
  setMode,
  showMoon,
  setShowMoon,
  isMobile,
  setOpenCreate,
  setMobileMenuOpen,
  setShowTemplates,
  setShowAnalytics,
  setShowMeetingCoordinator,
  setShowShortcutsHelp,
  darkMode,
  setDarkMode,
  batchMode,
  setBatchMode,
  userStats,
  isListening,
  startListening,
  activeHeaderTab,
  setActiveHeaderTab,
  gamificationEnabled,
  setGamificationEnabled,
  setShowCarpoolChat,
  setSelectedCarpoolEvent,
  showListsSidebar,
  setShowListsSidebar,
  onListsClick,
  setShowTimeBlocking
}: CalendarHeaderProps) {

  // Enhanced handler functions with better error handling and debugging
  const handleCarpoolClick = () => {
    console.log('Carpool button clicked');
    try {
      if (setSelectedCarpoolEvent) {
        setSelectedCarpoolEvent(null);
        console.log('Set carpool event to null');
      }
      if (setShowCarpoolChat) {
        setShowCarpoolChat(true);
        console.log('Opening carpool chat');
      } else {
        console.error('setShowCarpoolChat function not available');
      }
    } catch (error) {
      console.error('Error in handleCarpoolClick:', error);
    }
  };

  const handleCoordinateClick = () => {
    console.log('Coordinate button clicked');
    try {
      if (setShowMeetingCoordinator) {
        setShowMeetingCoordinator(true);
        console.log('Opening meeting coordinator');
      } else {
        console.error('setShowMeetingCoordinator function not available');
      }
    } catch (error) {
      console.error('Error in handleCoordinateClick:', error);
    }
  };

  const handleVoiceClick = () => {
    console.log('Voice button clicked, isListening:', isListening);
    try {
      if (startListening) {
        startListening();
        console.log('Voice recognition started');
      } else {
        console.error('startListening function not available');
      }
    } catch (error) {
      console.error('Error in handleVoiceClick:', error);
    }
  };

  const handleListsClick = () => {
    console.log('Lists button clicked');
    try {
      if (onListsClick) {
        onListsClick();
        console.log('Lists click handler called');
      } else {
        console.error('onListsClick function not available');
      }
    } catch (error) {
      console.error('Error in handleListsClick:', error);
    }
  };

  return (
    <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-30 transition-all duration-300">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6">
        
        {/* Mobile Header - Enhanced for better UX */}
        {isMobile ? (
          <div className="flex items-center justify-between py-3">
            {/* Left: Menu Button with haptic feedback hint */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2.5 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200 active:scale-95"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Center: Enhanced Title & Mode Switcher */}
            <div className="flex-1 mx-4">
              <div className="text-center mb-2">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                  Calendar
                </h1>
                {/* Mobile Gamification Stats */}
                {gamificationEnabled && userStats && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2">
                    <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full">
                      Lvl {userStats.level}
                    </span>
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                      {userStats.streak}d streak
                    </span>
                  </div>
                )}
              </div>
              
              {/* Enhanced Mode Switcher - Mobile */}
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 max-w-xs mx-auto shadow-inner">
                <button
                  onClick={() => setMode("my")}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                    mode === "my"
                      ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  My Events
                </button>
                <button
                  onClick={() => setMode("whats")}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                    mode === "whats"
                      ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  What's Happening
                </button>
              </div>
            </div>

            {/* Right: Enhanced Create Button with quick actions hint */}
            <div className="flex items-center gap-2">
              {/* Voice Button - Mobile only when needed */}
              <button
                onClick={handleVoiceClick}
                className={`p-2 rounded-lg transition-all duration-200 active:scale-95 ${
                  isListening
                    ? "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 animate-pulse shadow-lg"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
                title="Voice commands"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>

              <button
                onClick={() => setOpenCreate(true)}
                className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
                aria-label="Create event"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          /* Desktop Header - Enhanced with better organization */
          <div className="flex items-center justify-between py-4">
            
            {/* Left: Title & Mode Switcher */}
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Calendar
                </h1>
                {gamificationEnabled && userStats && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Level {userStats.level} • {userStats.points} points • {userStats.streak} day streak
                  </div>
                )}
              </div>

              {/* Enhanced Mode Switcher - Desktop */}
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 shadow-inner">
                <button
                  onClick={() => setMode("my")}
                  className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    mode === "my"
                      ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  My Calendar
                </button>
                <button
                  onClick={() => setMode("whats")}
                  className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    mode === "whats"
                      ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  What's Happening
                </button>
              </div>
            </div>

            {/* Center: Enhanced Action Buttons with better grouping */}
            <div className="flex items-center gap-1">
              
              {/* Primary Actions Group */}
              <div className="flex items-center gap-1 mr-3">
                {/* Lists Sidebar Toggle */}
                {mode === "my" && (
                  <button
                    onClick={handleListsClick}
                    className={`p-2.5 rounded-lg transition-all duration-200 ${
                      showListsSidebar 
                        ? "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400" 
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    }`}
                    title="Toggle lists sidebar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                )}

                {/* Enhanced Voice Command with better visual feedback */}
                <button
                  onClick={handleVoiceClick}
                  className={`p-2.5 rounded-lg transition-all duration-200 ${
                    isListening 
                      ? "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 animate-pulse shadow-lg" 
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                  title="Voice commands"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>

                {/* Enhanced Batch Mode Toggle */}
                <button
                  onClick={() => setBatchMode(!batchMode)}
                  className={`p-2.5 rounded-lg transition-all duration-200 ${
                    batchMode 
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 shadow-md" 
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                  title="Batch select mode"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>

              {/* Feature Buttons Group */}
              <div className="flex items-center gap-1 mr-3">
                {/* Templates */}
                <button
                  onClick={() => setShowTemplates(true)}
                  className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-200"
                  title="Event templates"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </button>

                {/* Analytics */}
                <button
                  onClick={() => setShowAnalytics(true)}
                  className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-200"
                  title="Calendar analytics"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </button>

                {/* Enhanced Meeting Coordinator Button */}
                <button
                  onClick={handleCoordinateClick}
                  className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-200"
                  title="Smart meeting coordinator"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </button>

                {/* Time Blocking */}
                <button
                  onClick={() => setShowTimeBlocking(true)}
                  className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-200"
                  title="Time blocking"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>

                {/* Enhanced Carpool Chat Button */}
                <button
                  onClick={handleCarpoolClick}
                  className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-200"
                  title="Carpool chat"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </button>
              </div>

              {/* Settings Group */}
              <div className="flex items-center gap-1">
                {/* Moon Toggle */}
                <button
                  onClick={() => setShowMoon(!showMoon)}
                  className={`p-2.5 rounded-lg transition-all duration-200 ${
                    showMoon 
                      ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400" 
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                  title="Toggle moon phases"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                </button>

                {/* Dark Mode Toggle */}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-200"
                  title="Toggle dark mode"
                >
                  {darkMode ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>

                {/* Gamification Toggle */}
                <button
                  onClick={() => setGamificationEnabled(!gamificationEnabled)}
                  className={`p-2.5 rounded-lg transition-all duration-200 ${
                    gamificationEnabled 
                      ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400" 
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                  title="Toggle gamification"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </button>

                {/* Help/Shortcuts */}
                <button
                  onClick={() => setShowShortcutsHelp(true)}
                  className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-200"
                  title="Keyboard shortcuts help"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Right: Enhanced Create Button */}
            <button
              onClick={() => setOpenCreate(true)}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Event
            </button>
          </div>
        )}

        {/* Enhanced Desktop Tabs Row with better tab management */}
        {!isMobile && (
          <div className="flex items-center justify-between border-t dark:border-gray-700 pt-3 pb-1">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveHeaderTab('calendar')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeHeaderTab === 'calendar'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => setActiveHeaderTab('reminders')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeHeaderTab === 'reminders'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Reminders
              </button>
              <button
                onClick={() => setActiveHeaderTab('todos')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeHeaderTab === 'todos'
                    ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                To-Dos
              </button>
              <button
                onClick={() => setActiveHeaderTab('templates')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeHeaderTab === 'templates'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Templates & Goals
              </button>
            </div>

            {/* Right side: Additional info and batch toggle */}
            <div className="flex items-center gap-4">
              {gamificationEnabled && userStats && (
                <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <span className="bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-full">
                    🔥 {userStats.streak} day streak
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
