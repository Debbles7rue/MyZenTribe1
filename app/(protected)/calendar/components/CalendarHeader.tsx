// app/(protected)/calendar/components/CalendarHeader.tsx

import React from 'react';
import { Mode, CalendarTheme } from '../types';

interface CalendarHeaderProps {
  mode: Mode;
  setMode: (mode: Mode) => void;
  calendarTheme: CalendarTheme;
  setCalendarTheme: (theme: CalendarTheme) => void;
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
  focusMode: boolean;
  setFocusMode: (focus: boolean) => void;
  batchMode: boolean;
  setBatchMode: (batch: boolean) => void;
  userStats: any;
  isListening: boolean;
  startListening: () => void;
}

export default function CalendarHeader({
  mode,
  setMode,
  calendarTheme,
  setCalendarTheme,
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
  focusMode,
  setFocusMode,
  batchMode,
  setBatchMode,
  userStats,
  isListening,
  startListening
}: CalendarHeaderProps) {
  return (
    <header className="mb-4 sm:mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Title and Mode Selector */}
        <div className="flex items-center gap-4 w-full sm:w-auto">
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-lg"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          
          <div className="flex-1 sm:flex-initial">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Calendar Hub
            </h1>
            {userStats && (
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 dark:text-gray-300">
                <span className="flex items-center gap-1">
                  <span className="text-yellow-500">⭐</span>
                  Level {userStats.level}
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-purple-500">💎</span>
                  {userStats.points} pts
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-red-500">🔥</span>
                  {userStats.streak} day streak
                </span>
              </div>
            )}
          </div>

          {/* Mode Tabs */}
          <div className="flex bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-xl p-1 shadow-lg">
            <button
              onClick={() => setMode('my')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'my'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              My Calendar
            </button>
            <button
              onClick={() => setMode('whats')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'whats'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              What's Happening
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Voice Command Button */}
          <button
            onClick={startListening}
            className={`p-2 rounded-lg backdrop-blur-xl shadow-lg transition-all ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700'
            }`}
            title="Voice Command"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>

          {/* Focus Mode Toggle */}
          <button
            onClick={() => setFocusMode(!focusMode)}
            className={`p-2 rounded-lg backdrop-blur-xl shadow-lg transition-all ${
              focusMode 
                ? 'bg-purple-500 text-white' 
                : 'bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700'
            }`}
            title="Focus Mode - Show only today"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>

          {/* Batch Mode Toggle */}
          <button
            onClick={() => setBatchMode(!batchMode)}
            className={`p-2 rounded-lg backdrop-blur-xl shadow-lg transition-all ${
              batchMode 
                ? 'bg-blue-500 text-white' 
                : 'bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700'
            }`}
            title="Batch Edit Mode"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-all"
            title="Toggle Dark Mode"
          >
            {darkMode ? (
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>

          {/* Moon Phases Toggle */}
          <button
            onClick={() => setShowMoon(!showMoon)}
            className={`p-2 rounded-lg backdrop-blur-xl shadow-lg transition-all ${
              showMoon 
                ? 'bg-indigo-500 text-white' 
                : 'bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700'
            }`}
            title="Toggle Moon Phases"
          >
            🌙
          </button>

          {/* Theme Selector */}
          <select
            value={calendarTheme}
            onChange={(e) => setCalendarTheme(e.target.value as CalendarTheme)}
            className="px-3 py-2 rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-lg text-sm font-medium"
          >
            <option value="default">Default Theme</option>
            <option value="spring">🌸 Spring</option>
            <option value="summer">☀️ Summer</option>
            <option value="autumn">🍂 Autumn</option>
            <option value="winter">❄️ Winter</option>
            <option value="nature">🌿 Nature</option>
            <option value="ocean">🌊 Ocean</option>
          </select>

          {!isMobile && (
            <>
              {/* Templates Button */}
              <button
                onClick={() => setShowTemplates(true)}
                className="px-3 py-2 rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-all text-sm font-medium"
              >
                📋 Templates
              </button>

              {/* Analytics Button */}
              <button
                onClick={() => setShowAnalytics(true)}
                className="px-3 py-2 rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-all text-sm font-medium"
              >
                📊 Analytics
              </button>

              {/* Meeting Coordinator Button */}
              <button
                onClick={() => setShowMeetingCoordinator(true)}
                className="px-3 py-2 rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-all text-sm font-medium"
              >
                🤝 Coordinate
              </button>

              {/* Shortcuts Help */}
              <button
                onClick={() => setShowShortcutsHelp(true)}
                className="p-2 rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-all"
                title="Keyboard Shortcuts"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* Create Event Button */}
              <button
                onClick={() => setOpenCreate(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all font-medium"
              >
                + New Event
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
