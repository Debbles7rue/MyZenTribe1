// app/(protected)/calendar/components/MobileSidebar.tsx

import React from 'react';
import { TodoReminder, Friend, CarpoolMatch } from '../types';

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  carpoolMatches: CarpoolMatch[];
  friends: Friend[];
  visibleReminders: TodoReminder[];
  visibleTodos: TodoReminder[];
  showCompletedItems: boolean;
  setShowCompletedItems: (show: boolean) => void;
  openCarpoolChat: (event?: any) => void;
  setQuickModalType: (type: 'reminder' | 'todo') => void;
  setQuickModalOpen: (open: boolean) => void;
  setShowTemplates: (show: boolean) => void;
  setShowAnalytics: (show: boolean) => void;
  setShowMeetingCoordinator: (show: boolean) => void;
  onToggleComplete: (item: TodoReminder) => void;
  onDeleteItem: (id: string) => void;
  userStats: any;
}

export default function MobileSidebar({
  open,
  onClose,
  carpoolMatches,
  friends,
  visibleReminders,
  visibleTodos,
  showCompletedItems,
  setShowCompletedItems,
  openCarpoolChat,
  setQuickModalType,
  setQuickModalOpen,
  setShowTemplates,
  setShowAnalytics,
  setShowMeetingCoordinator,
  onToggleComplete,
  onDeleteItem,
  userStats
}: MobileSidebarProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-80 bg-white dark:bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 lg:hidden ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* User Stats */}
            {userStats && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4">
                <h3 className="font-semibold text-purple-800 dark:text-purple-300 mb-2">Your Progress</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {userStats.level}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Level</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-pink-600">
                      {userStats.points}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Points</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {userStats.streak}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Streak</div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  setQuickModalType('reminder');
                  setQuickModalOpen(true);
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
              >
                <span className="text-xl">🔔</span>
                <span className="font-medium">Add Reminder</span>
                <span className="ml-auto text-sm bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full">
                  {visibleReminders.length}
                </span>
              </button>
              
              <button
                onClick={() => {
                  setQuickModalType('todo');
                  setQuickModalOpen(true);
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              >
                <span className="text-xl">✅</span>
                <span className="font-medium">Add To-do</span>
                <span className="ml-auto text-sm bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full">
                  {visibleTodos.length}
                </span>
              </button>
            </div>

            {/* Carpool Matches */}
            {carpoolMatches.length > 0 && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4">
                <h3 className="font-semibold text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
                  <span>🚗</span> Carpool Matches
                </h3>
                <div className="space-y-2">
                  {carpoolMatches.slice(0, 2).map((match) => (
                    <button
                      key={match.id}
                      onClick={() => {
                        openCarpoolChat(match);
                        onClose();
                      }}
                      className="w-full text-left bg-white/80 dark:bg-gray-800/80 rounded-lg p-2"
                    >
                      <div className="font-medium text-sm">{match.friendName}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {match.destination} • Save {match.savings}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reminders List */}
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-xl p-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
                Recent Reminders
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {visibleReminders.slice(0, 3).map((reminder) => (
                  <div
                    key={reminder.id}
                    className={`p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg ${
                      reminder.completed ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={reminder.completed}
                        onChange={() => onToggleComplete(reminder)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className={`text-sm ${reminder.completed ? 'line-through' : ''}`}>
                          {reminder.title}
                        </div>
                        <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          {new Date(reminder.date).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tools */}
            <div className="space-y-2 pt-4 border-t dark:border-gray-700">
              <button
                onClick={() => {
                  setShowTemplates(true);
                  onClose();
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                📋 Templates
              </button>
              <button
                onClick={() => {
                  setShowAnalytics(true);
                  onClose();
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                📊 Analytics
              </button>
              <button
                onClick={() => {
                  setShowMeetingCoordinator(true);
                  onClose();
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                🤝 Meeting Coordinator
              </button>
            </div>

            {/* Settings */}
            <div className="pt-4 border-t dark:border-gray-700">
              <label className="flex items-center gap-2 px-4 py-2">
                <input
                  type="checkbox"
                  checked={showCompletedItems}
                  onChange={(e) => setShowCompletedItems(e.target.checked)}
                  className="cursor-pointer"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Show completed items
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
