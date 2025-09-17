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
  gamificationEnabled: boolean;
  setGamificationEnabled: (enabled: boolean) => void;
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
  userStats,
  gamificationEnabled,
  setGamificationEnabled
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
        <div className="h-full overflow-y-auto">
          <div className="p-4 border-b dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Lists & Tools</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* User Stats - Only shown if gamification is enabled */}
            {gamificationEnabled && userStats && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Your Progress</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {userStats.todayPoints || 0}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Today</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {userStats.weekPoints || 0}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Week</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                    <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {userStats.streak || 0}
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
                  {safeVisibleReminders.filter(r => !r.completed).length || 0}
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
                  {safeVisibleTodos.filter(t => !t.completed).length || 0}
                </span>
              </button>
            </div>

            {/* Carpool Matches */}
            {safeCarpoolMatches && safeCarpoolMatches.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Carpool Matches</h3>
                <div className="space-y-2">
                  {safeCarpoolMatches.slice(0, 3).map((match) => (
                    <div
                      key={match.event?.id || Math.random()}
                      className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                      onClick={() => {
                        openCarpoolChat(match.event);
                        onClose();
                      }}
                    >
                      <div className="font-medium text-sm">{match.event?.title || 'Event'}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {(match.friends?.length || 0)} friend{(match.friends?.length || 0) !== 1 ? 's' : ''} attending
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current Reminders & Todos Lists */}
            <div className="space-y-4">
              {/* Reminders */}
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Active Reminders ({safeVisibleReminders.filter(r => !r.completed).length || 0})
                </h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {safeVisibleReminders.filter(r => !r.completed).slice(0, 3).map((reminder) => (
                    <div 
                      key={reminder.id} 
                      className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => onToggleComplete(reminder)}
                        className="cursor-pointer"
                      />
                      <span className="text-sm flex-1">{reminder.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* To-dos */}
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Active To-dos ({safeVisibleTodos.filter(t => !t.completed).length || 0})
                </h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {safeVisibleTodos.filter(t => !t.completed).slice(0, 3).map((todo) => (
                    <div 
                      key={todo.id} 
                      className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => onToggleComplete(todo)}
                        className="cursor-pointer"
                      />
                      <span className="text-sm flex-1">{todo.title}</span>
                    </div>
                  ))}
                </div>
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
                📋 Templates & Goals
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
            <div className="pt-4 border-t dark:border-gray-700 space-y-3">
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
              
              <label className="flex items-center gap-2 px-4 py-2">
                <input
                  type="checkbox"
                  checked={gamificationEnabled}
                  onChange={(e) => setGamificationEnabled(e.target.checked)}
                  className="cursor-pointer"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Enable goal tracking & points
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
