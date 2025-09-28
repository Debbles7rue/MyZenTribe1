// app/(protected)/calendar/components/CalendarHeader.tsx
"use client";

import React from "react";

// Define the exact interface your page.tsx expects
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
  userStats?: any;
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

export default function CalendarHeader(props: CalendarHeaderProps) {
  const {
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
  } = props;

  // FIXED: Voice command handler with error handling
  const handleVoiceClick = () => {
    try {
      console.log('Voice button clicked, isListening:', isListening);
      if (startListening) {
        startListening();
      } else {
        console.error('startListening function not provided');
      }
    } catch (error) {
      console.error('Error starting voice recognition:', error);
    }
  };

  // FIXED: Lists toggle handler with safety checks
  const handleListsClick = () => {
    try {
      console.log('Lists button clicked, current showListsSidebar:', showListsSidebar);
      if (onListsClick) {
        onListsClick();
      } else {
        console.error('onListsClick function not provided');
      }
    } catch (error) {
      console.error('Error toggling lists sidebar:', error);
    }
  };

  // FIXED: Carpool chat handler with proper setup
  const handleCarpoolClick = () => {
    try {
      console.log('Carpool button clicked');
      if (setSelectedCarpoolEvent) {
        setSelectedCarpoolEvent(null); // Clear any selected event
      }
      if (setShowCarpoolChat) {
        setShowCarpoolChat(true);
      } else {
        console.error('setShowCarpoolChat function not provided');
      }
    } catch (error) {
      console.error('Error opening carpool chat:', error);
    }
  };

  return (
    <div className="mb-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-xl shadow-lg p-4">
      <div className="flex flex-col gap-3">
        
        {/* Title and Mode Toggle Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Calendar Hub
            </h1>
            
            {/* Gamification Stats */}
            {!isMobile && gamificationEnabled && userStats && (
              <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full text-white text-sm font-medium shadow-md">
                <span>Lvl {userStats.level}</span>
                <span className="text-xs opacity-75">•</span>
                <span>{userStats.points} pts</span>
              </div>
            )}
          </div>

          {/* Mode Toggle */}
          <div className="flex rounded-lg bg-white/50 dark:bg-gray-700/50 shadow-md p-0.5">
            <button
              onClick={() => setMode && setMode('my')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'my'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              My Calendar
            </button>
            <button
              onClick={() => setMode && setMode('whats')}
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

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* MOBILE LAYOUT */}
          {isMobile ? (
            <>
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen && setMobileMenuOpen(true)}
                className="px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all"
                title="Menu"
              >
                ☰ Menu
              </button>

              {/* Voice Button - Mobile (FIXED) */}
              <button
                onClick={handleVoiceClick}
                className={`px-3 py-2 rounded-lg text-sm font-medium shadow-md transition-all ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-lg'
                }`}
                title="Voice commands"
              >
                {isListening ? '🎤 Listening...' : '🎙️ Voice'}
              </button>
              
              {/* Lists Button - Mobile (FIXED) */}
              {mode === 'my' && (
                <button
                  onClick={handleListsClick}
                  className="px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all"
                  title="My lists"
                >
                  📋 Lists
                </button>
              )}

              {/* Create Button */}
              <button
                onClick={() => setOpenCreate && setOpenCreate(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all"
              >
                + Create
              </button>
            </>
          ) : (
            /* DESKTOP LAYOUT */
            <>
              {/* Lists Button - Desktop (FIXED) */}
              {mode === 'my' && (
                <button
                  onClick={handleListsClick}
                  className={`px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all flex items-center gap-2 ${
                    showListsSidebar
                      ? 'bg-purple-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-lg'
                  }`}
                  title="Toggle lists sidebar"
                >
                  📋 Lists
                  {showListsSidebar && <span className="text-xs">✓</span>}
                </button>
              )}

              {/* Moon Toggle */}
              <button
                onClick={() => setShowMoon && setShowMoon(!showMoon)}
                className={`px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all ${
                  showMoon
                    ? 'bg-yellow-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-lg'
                }`}
                title="Toggle moon phases"
              >
                🌙 Moon
              </button>

              {/* Voice Commands (FIXED) */}
              <button
                onClick={handleVoiceClick}
                className={`px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-lg'
                }`}
                title="Voice commands"
              >
                🎤 Voice
                {isListening && <span className="ml-1 text-xs">●</span>}
              </button>

              {/* Carpool Chat (FIXED) */}
              <button
                onClick={handleCarpoolClick}
                className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all"
                title="Carpool coordination"
              >
                🚗 Carpool
              </button>

              {/* Templates */}
              <button
                onClick={() => setShowTemplates && setShowTemplates(true)}
                className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all"
                title="Event templates"
              >
                📋 Templates
              </button>

              {/* Analytics */}
              <button
                onClick={() => setShowAnalytics && setShowAnalytics(true)}
                className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all"
                title="Calendar analytics"
              >
                📊 Analytics
              </button>

              {/* Meeting Coordinator */}
              <button
                onClick={() => setShowMeetingCoordinator && setShowMeetingCoordinator(true)}
                className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all"
                title="Smart meeting coordinator"
              >
                🤝 Coordinate
              </button>

              {/* Time Blocking */}
              <button
                onClick={() => setShowTimeBlocking && setShowTimeBlocking(true)}
                className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all"
                title="Time blocking"
              >
                ⏰ Time Block
              </button>

              {/* Batch Mode */}
              <button
                onClick={() => setBatchMode && setBatchMode(!batchMode)}
                className={`px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all ${
                  batchMode
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-lg'
                }`}
                title="Batch select mode"
              >
                ☑️ Batch
              </button>

              {/* Dark Mode */}
              <button
                onClick={() => setDarkMode && setDarkMode(!darkMode)}
                className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all"
                title="Toggle dark mode"
              >
                {darkMode ? '☀️ Light' : '🌙 Dark'}
              </button>

              {/* Gamification Toggle */}
              <button
                onClick={() => setGamificationEnabled && setGamificationEnabled(!gamificationEnabled)}
                className={`px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all ${
                  gamificationEnabled
                    ? 'bg-green-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-lg'
                }`}
                title="Toggle gamification"
              >
                🏆 Games
              </button>

              {/* Help */}
              <button
                onClick={() => setShowShortcutsHelp && setShowShortcutsHelp(true)}
                className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all"
                title="Keyboard shortcuts help"
              >
                ❓ Help
              </button>

              {/* Create Event */}
              <button
                onClick={() => setOpenCreate && setOpenCreate(true)}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all ml-2"
              >
                + Create Event
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
