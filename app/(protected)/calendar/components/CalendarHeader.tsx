// app/(protected)/calendar/components/CalendarHeader.tsx
import React from 'react';
import type { Mode, CalendarTheme } from '../types';

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
  darkMode?: boolean;
  setDarkMode?: (dark: boolean) => void;
  focusMode?: boolean;
  setFocusMode?: (focus: boolean) => void;
  batchMode?: boolean;
  setBatchMode?: (batch: boolean) => void;
  userStats?: any;
  isListening?: boolean;
  startListening?: () => void;
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
  darkMode = false,
  setDarkMode,
  focusMode = false,
  setFocusMode,
  batchMode = false,
  setBatchMode,
  userStats,
  isListening = false,
  startListening
}: CalendarHeaderProps) {
  return (
    <div className="mb-4 sm:mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Title & Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600
                         bg-clip-text text-transparent">
              Calendar
            </h1>
            
            {/* User Stats Badge */}
            {userStats && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 
                            rounded-full text-white text-sm font-medium shadow-md">
                <span>Lvl {userStats.level}</span>
                <span className="text-xs opacity-75">•</span>
                <span>{userStats.points} pts</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Mode Toggle */}
            <div className="flex rounded-full bg-white/90 dark:bg-gray-700/90 shadow-md p-1">
              <button
                onClick={() => setMode('my')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 transform ${
                  mode === 'my'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:scale-105'
                }`}
              >
                My Calendar
              </button>
              <button
                onClick={() => setMode('whats')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 transform ${
                  mode === 'whats'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg scale-105'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:scale-105'
                }`}
              >
                What's Happening
              </button>
            </div>

            {/* Theme Selector - Desktop only */}
            {!isMobile && (
              <select
                value={calendarTheme}
                onChange={(e) => setCalendarTheme(e.target.value as CalendarTheme)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300
                         focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="default">Default Theme</option>
                <option value="minimal">Minimal</option>
                <option value="colorful">Colorful</option>
                <option value="dark">Dark</option>
              </select>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="relative">
          <div className="overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex items-center gap-2 sm:gap-3 min-w-max">
              {/* Create Button */}
              <button
                onClick={() => setOpenCreate(true)}
                className="px-3 sm:px-4 py-2 rounded-full font-medium text-white
                         bg-gradient-to-r from-purple-600 to-pink-600
                         shadow-lg flex items-center gap-2 whitespace-nowrap
                         transform hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <span className="text-lg">+</span>
                <span className="text-sm sm:text-base">Event</span>
              </button>

              {/* Mobile Menu Toggle */}
              {isMobile && mode === 'my' && (
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="px-3 sm:px-4 py-2 rounded-full bg-white dark:bg-gray-700 shadow-md 
                           text-gray-600 dark:text-gray-300 flex items-center gap-2
                           transform hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  <span className="text-base">📋</span>
                  <span className="text-xs sm:text-sm">Lists</span>
                </button>
              )}

              {/* Feature Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAnalytics(true)}
                  className="p-2 rounded-full bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 shadow-md
                           transform hover:scale-110 hover:rotate-6 active:scale-95 transition-all duration-200"
                  title="View analytics"
                >
                  <span className="text-lg">📊</span>
                </button>

                <button
                  onClick={() => setShowTemplates(true)}
                  className="p-2 rounded-full bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 shadow-md
                           transform hover:scale-110 hover:-rotate-6 active:scale-95 transition-all duration-200"
                  title="Smart templates"
                >
                  <span className="text-lg">✨</span>
                </button>

                <button
                  onClick={() => setShowMeetingCoordinator(true)}
                  className="p-2 rounded-full bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 shadow-md
                           transform hover:scale-110 hover:rotate-6 active:scale-95 transition-all duration-200"
                  title="Find meeting time"
                >
                  <span className="text-lg">🤝</span>
                </button>

                {/* Moon Toggle */}
                <button
                  onClick={() => setShowMoon(!showMoon)}
                  className={`p-2 rounded-full transition-all duration-300 transform ${
                    showMoon
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg scale-110 rotate-12'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 shadow-md hover:scale-110 hover:-rotate-12'
                  } active:scale-95`}
                  title="Toggle moon phases"
                >
                  <span className="text-lg">🌙</span>
                </button>

                {/* Dark Mode Toggle */}
                {setDarkMode && (
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className={`p-2 rounded-full transition-all duration-300 transform ${
                      darkMode
                        ? 'bg-gray-800 text-yellow-400 shadow-lg scale-110'
                        : 'bg-white text-gray-600 shadow-md hover:scale-110'
                    } active:scale-95`}
                    title="Toggle dark mode"
                  >
                    <span className="text-lg">{darkMode ? '🌞' : '🌜'}</span>
                  </button>
                )}

                {/* Focus Mode Toggle */}
                {setFocusMode && (
                  <button
                    onClick={() => setFocusMode(!focusMode)}
                    className={`p-2 rounded-full transition-all duration-300 transform ${
                      focusMode
                        ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg scale-110 animate-pulse'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 shadow-md hover:scale-110'
                    } active:scale-95`}
                    title="Focus mode - Today only"
                  >
                    <span className="text-lg">🎯</span>
                  </button>
                )}

                {/* Batch Mode Toggle */}
                {setBatchMode && !isMobile && (
                  <button
                    onClick={() => setBatchMode(!batchMode)}
                    className={`p-2 rounded-full transition-all duration-300 transform ${
                      batchMode
                        ? 'bg-blue-500 text-white shadow-lg scale-110'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 shadow-md hover:scale-110'
                    } active:scale-95`}
                    title="Batch select mode"
                  >
                    <span className="text-lg">☑️</span>
                  </button>
                )}

                {/* Voice Command - Mobile */}
                {isMobile && startListening && (
                  <button
                    onClick={startListening}
                    className={`p-2 rounded-full transition-all duration-300 transform ${
                      isListening
                        ? 'bg-red-500 text-white shadow-lg scale-110 animate-pulse'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 shadow-md hover:scale-110'
                    } active:scale-95`}
                    title="Voice commands"
                  >
                    <span className="text-lg">🎤</span>
                  </button>
                )}

                {/* Keyboard Shortcuts - Desktop only */}
                {!isMobile && (
                  <button
                    onClick={() => setShowShortcutsHelp(true)}
                    className="p-2 rounded-full bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 shadow-md
                             transform hover:scale-110 hover:rotate-6 active:scale-95 transition-all duration-200"
                    title="Keyboard shortcuts (press ?)"
                  >
                    <span className="text-lg">⌨️</span>
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Scroll indicator for mobile */}
          {isMobile && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-gradient-to-l from-white dark:from-gray-800 via-white/80 dark:via-gray-800/80 to-transparent pr-2 pl-4 pointer-events-none">
              <span className="text-gray-400 text-xs animate-pulse">→</span>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
