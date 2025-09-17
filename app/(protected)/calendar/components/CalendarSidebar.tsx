// app/(protected)/calendar/components/CalendarSidebar.tsx

import React from 'react';
import { TodoReminder, Friend, CarpoolMatch } from '../types';

interface CalendarSidebarProps {
  carpoolMatches: CarpoolMatch[];
  friends: Friend[];
  visibleReminders: TodoReminder[];
  visibleTodos: TodoReminder[];
  showRemindersList: boolean;
  setShowRemindersList: (show: boolean) => void;
  showTodosList: boolean;
  setShowTodosList: (show: boolean) => void;
  showCompletedItems: boolean;
  setShowCompletedItems: (show: boolean) => void;
  openCarpoolChat: (event?: any) => void;
  setQuickModalType: (type: 'reminder' | 'todo') => void;
  setQuickModalOpen: (open: boolean) => void;
  onDragStart: (item: TodoReminder, type: 'reminder' | 'todo') => void;
  onDragEnd: () => void;
  onToggleComplete: (item: TodoReminder) => void;
  onDeleteItem: (id: string) => void;
  userStats: any;
}

export default function CalendarSidebar({
  carpoolMatches = [],
  friends = [],
  visibleReminders = [],
  visibleTodos = [],
  showRemindersList,
  setShowRemindersList,
  showTodosList,
  setShowTodosList,
  showCompletedItems,
  setShowCompletedItems,
  openCarpoolChat,
  setQuickModalType,
  setQuickModalOpen,
  onDragStart,
  onDragEnd,
  onToggleComplete,
  onDeleteItem,
  userStats
}: CalendarSidebarProps) {
  // Safe array checks
  const safeCarpoolMatches = carpoolMatches || [];
  const safeVisibleReminders = visibleReminders || [];
  const safeVisibleTodos = visibleTodos || [];

  return (
    <div className="w-80 shrink-0 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
      
      {/* User Stats Summary - Only if gamification is enabled (userStats not null) */}
      {userStats && (
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Daily Progress</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Level {userStats.level || 1}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-2">
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {userStats.todayPoints || 0}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Today</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-2">
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {userStats.weekPoints || 0}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">This Week</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg p-2">
              <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {userStats.streak || 0}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Streak</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Carpool Matches Section */}
      {safeCarpoolMatches && safeCarpoolMatches.length > 0 && (
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
              <span>🚗</span> Carpool Matches
            </h3>
            <span className="text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
              {safeCarpoolMatches.length} available
            </span>
          </div>
          <div className="space-y-2">
            {safeCarpoolMatches.slice(0, 3).map((match) => (
              <div
                key={match.event?.id || Math.random()}
                className="bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-900/20 rounded-lg p-3 cursor-pointer hover:shadow-md transition-all"
                onClick={() => openCarpoolChat(match.event)}
              >
                <div className="font-medium text-sm text-gray-800 dark:text-gray-200">
                  {match.event?.title || 'Event'}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {(match.friends?.length || 0)} friend{(match.friends?.length || 0) !== 1 ? 's' : ''} attending
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Reminders Section */}
      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setShowRemindersList(!showRemindersList)}
            className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          >
            <span className={`transform transition-transform ${showRemindersList ? 'rotate-90' : ''}`}>▶</span>
            Reminders
            <span className="text-xs bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-2 py-1 rounded-full">
              {safeVisibleReminders.filter(r => !r.completed).length || 0}
            </span>
          </button>
          <button
            onClick={() => {
              setQuickModalType('reminder');
              setQuickModalOpen(true);
            }}
            className="text-xs px-2 py-1 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
          >
            + Add
          </button>
        </div>
        
        {showRemindersList && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-2">
              <input
                type="checkbox"
                checked={showCompletedItems}
                onChange={(e) => setShowCompletedItems(e.target.checked)}
                className="rounded"
              />
              Show completed
            </label>
            
            {safeVisibleReminders.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No reminders yet</p>
            ) : (
              safeVisibleReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  draggable={!reminder.completed}
                  onDragStart={() => !reminder.completed && onDragStart(reminder, 'reminder')}
                  onDragEnd={onDragEnd}
                  className={`group bg-gradient-to-br from-white to-amber-50 dark:from-gray-800 dark:to-amber-900/20 
                            rounded-lg p-3 cursor-move hover:shadow-md transition-all ${
                    reminder.completed ? 'opacity-50 cursor-default' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={reminder.completed}
                      onChange={() => onToggleComplete(reminder)}
                      className="mt-1 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${
                        reminder.completed ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-200'
                      }`}>
                        {reminder.title}
                      </div>
                      {reminder.description && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          {reminder.description}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteItem(reminder.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* To-dos Section */}
      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setShowTodosList(!showTodosList)}
            className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          >
            <span className={`transform transition-transform ${showTodosList ? 'rotate-90' : ''}`}>▶</span>
            To-dos
            <span className="text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
              {safeVisibleTodos.filter(t => !t.completed).length || 0}
            </span>
          </button>
          <button
            onClick={() => {
              setQuickModalType('todo');
              setQuickModalOpen(true);
            }}
            className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            + Add
          </button>
        </div>
        
        {showTodosList && (
          <div className="space-y-2">
            {safeVisibleTodos.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No to-dos yet</p>
            ) : (
              safeVisibleTodos.map((todo) => (
                <div
                  key={todo.id}
                  draggable={!todo.completed}
                  onDragStart={() => !todo.completed && onDragStart(todo, 'todo')}
                  onDragEnd={onDragEnd}
                  className={`group bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-900/20 
                            rounded-lg p-3 cursor-move hover:shadow-md transition-all ${
                    todo.completed ? 'opacity-50 cursor-default' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => onToggleComplete(todo)}
                      className="mt-1 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${
                        todo.completed ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-200'
                      }`}>
                        {todo.title}
                      </div>
                      {todo.description && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          {todo.description}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteItem(todo.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
            
            {!safeVisibleTodos.every(t => t.completed) && safeVisibleTodos.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                Drag items to calendar to schedule them
              </p>
            )}
          </div>
        )}
      </div>
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.5);
        }
      `}</style>
    </div>
  );
}
