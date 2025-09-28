// app/(protected)/calendar/components/CalendarHeader.tsx
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
  setShowTemplates,
  setShowAnalytics,
  setShowMeetingCoordinator,
  setShowShortcutsHelp,
  showListsSidebar,
  setShowListsSidebar,
  onListsClick,
  setShowTimeBlocking
}: CalendarHeaderProps) {
  
  // FIXED: Carpool button with debugging
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

  // FIXED: Coordinate button with debugging
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

  // FIXED: Voice command with debugging
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

  // FIXED: Lists click with debugging
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
    <div className="mb-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-xl shadow-lg p-4">
      <div className="flex flex-col gap-3">
        {/* Top Row - Title and Mode Toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Calendar Hub
            </h1>
            
            {/* User Stats Badge - Desktop only */}
            {!isMobile && gamificationEnabled && userStats && (
              <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full text-white text-sm font-medium shadow-md">
                <span>Lvl {userStats.level}</span>
                <span className="text-xs opacity-75">•</span>
                <span>{userStats.points} pts</span>
              </div>
            )}
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-white/50 dark:bg-gray-700/50 shadow-md p-0.5">
              <button
                onClick={() => setMode('my')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  mode === 'my'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                My Calendar
              </button>
              <button
                onClick={() => setMode('whats')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  mode === 'whats'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                What's Happening
              </button>
            </div>
          </div>
        </div>

        {/* Features Row - All buttons in one row */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* MOBILE-SPECIFIC BUTTONS */}
          {isMobile && (
            <>
              {/* Voice Command Button - Mobile (FIXED: Now with debugging) */}
              <button
                onClick={handleVoiceClick}
                className={`px-3 py-2 rounded-lg text-sm font-medium shadow-md transition-all ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-lg'
                }`}
              >
                {isListening ? '🎤 Listening...' : '🎙️ Voice'}
              </button>
              
              {/* Lists Button - Mobile (FIXED: Now with debugging) */}
              {onListsClick && mode === 'my' && (
                <button
                  onClick={handleListsClick}
                  className="px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all"
                  title="My lists"
                >
                  📋 Lists
                </button>
              )}
            </>
          )}

          {/* DESKTOP LISTS BUTTON (FIXED: Now with debugging) */}
          {!isMobile && mode === 'my' && onListsClick && (
            <button
              onClick={handleListsClick}
              className={`px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all flex items-center gap-2 ${
                showListsSidebar
                  ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-lg'
              }`}
              title="Toggle lists sidebar"
            >
              <span>📋</span>
              <span>Lists</span>
            </button>
          )}

          {/* MOON TOGGLE (Keep this exactly as is) */}
          <button
            onClick={() => setShowMoon(!showMoon)}
            className={`px-3 py-2 rounded-lg text-sm font-medium shadow-md transition-all ${
              showMoon
                ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-lg'
            }`}
            title="Toggle moon phases"
          >
            {showMoon ? '🌙' : '🌑'}
          </button>

          {/* DARK MODE TOGGLE (Keep this exactly as is) */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`px-3 py-2 rounded-lg text-sm font-medium shadow-md transition-all ${
              darkMode
                ? 'bg-gray-800 text-white'
                : 'bg-white text-gray-700 hover:shadow-lg'
            }`}
            title="Toggle dark mode"
          >
            {darkMode ? '🌜' : '☀️'}
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* CARPOOL BUTTON (FIXED: Now with debugging) */}
          <button
            onClick={handleCarpoolClick}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg text-sm font-medium shadow-md hover:from-green-600 hover:to-blue-600 hover:shadow-lg transition-all flex items-center gap-2"
            title="Coordinate carpools"
          >
            <span>🚗</span>
            <span className={isMobile ? 'hidden' : ''}>Carpool</span>
          </button>

          {/* COORDINATE BUTTON (FIXED: Now with debugging) */}
          <button
            onClick={handleCoordinateClick}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-sm font-medium shadow-md hover:from-indigo-600 hover:to-purple-600 hover:shadow-lg transition-all flex items-center gap-2"
            title="AI meeting scheduler"
          >
            <span>🤝</span>
            <span className={isMobile ? 'hidden' : ''}>Coordinate</span>
          </button>

          {/* Templates Button */}
          <button
            onClick={() => setShowTemplates(true)}
            className="px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all"
            title="Event templates"
          >
            {isMobile ? '✨' : '✨ Templates'}
          </button>

          {/* Analytics Button */}
          <button
            onClick={() => setShowAnalytics(true)}
            className="px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all"
            title="View analytics"
          >
            {isMobile ? '📊' : '📊 Analytics'}
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* New Event Button */}
          <button
            onClick={() => setOpenCreate(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium shadow-md hover:from-purple-600 hover:to-pink-600 hover:shadow-lg transition-all flex items-center gap-2"
          >
            <span>+</span>
            <span>New Event</span>
          </button>

          {/* Keyboard Shortcuts Help - Desktop */}
          {!isMobile && (
            <button
              onClick={() => setShowShortcutsHelp(true)}
              className="px-3 py-2 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-sm font-medium hover:shadow-md transition-all"
              title="Keyboard shortcuts"
            >
              ⌘
            </button>
          )}

          {/* Voice Command Button - Desktop (FIXED: Now with debugging) */}
          {!isMobile && (
            <button
              onClick={handleVoiceClick}
              className={`px-3 py-2 rounded-lg text-sm font-medium shadow-md transition-all ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-lg'
              }`}
              title="Voice commands"
            >
              {isListening ? '🎤' : '🎙️'}
            </button>
          )}
        </div>

        {/* Tabs Row - Desktop only (Keep this exactly as is) */}
        {!isMobile && (
          <div className="flex items-center gap-2 border-t dark:border-gray-700 pt-3">
            <button
              onClick={() => setActiveHeaderTab('calendar')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeHeaderTab === 'calendar'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setActiveHeaderTab('reminders')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeHeaderTab === 'reminders'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Reminders
            </button>
            <button
              onClick={() => setActiveHeaderTab('todos')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeHeaderTab === 'todos'
                  ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              To-Dos
            </button>
            <button
              onClick={() => setActiveHeaderTab('templates')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeHeaderTab === 'templates'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Templates & Goals
            </button>

            {/* Batch Mode Toggle - Far right */}
            <div className="ml-auto flex items-center gap-2">
              {gamificationEnabled && userStats && (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  🔥 {userStats.streak} day streak
                </div>
              )}
              <button
                onClick={() => setBatchMode(!batchMode)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  batchMode
                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title="Select multiple events"
              >
                {batchMode ? '✓ Batch' : 'Batch'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
