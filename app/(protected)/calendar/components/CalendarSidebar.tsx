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
  carpoolMatches,
  friends,
  visibleReminders,
  visibleTodos,
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
  return (
    <div className="w-80 space-y-4 max-h-[680px] overflow-y-auto custom-scrollbar">
      {/* Carpool Matches Section */}
      {carpoolMatches.length > 0 && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
              <span>🚗</span> Carpool Matches
            </h3>
            <span className="text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
              {carpoolMatches.length} available
            </span>
          </div>
          <div className="space-y-2">
            {carpoolMatches.slice(0, 3).map((match) => (
              <div
                key={match.id}
                className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 cursor-pointer hover:shadow-md transition-all"
                onClick={() => openCarpoolChat(match)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-800 dark:text-gray-200">
                      {match.friendName}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {match.destination} • {match.time}
                    </div>
                  </div>
                  <div className="text-green-600 dark:text-green-400 font-semibold text-sm">
                    Save {match.savings}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => openCarpoolChat()}
            className="mt-3 w-full text-center text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium"
          >
            View all matches →
          </button>
        </div>
      )}

      {/* Reminders Section */}
      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setShowRemindersList(!showRemindersList)}
            className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          >
            <span className={`transform transition-transform ${showRemindersList ? 'rotate-90' : ''}`}>
              ▶
            </span>
            <span>🔔</span>
            Reminders
            <span className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full ml-2">
              {visibleReminders.length}
            </span>
          </button>
          <button
            onClick={() => {
              setQuickModalType('reminder');
              setQuickModalOpen(true);
            }}
            className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
            title="Add Reminder"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        {showRemindersList && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {visibleReminders.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">No reminders</p>
            ) : (
              visibleReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  draggable
                  onDragStart={() => onDragStart(reminder, 'reminder')}
                  onDragEnd={onDragEnd}
                  className={`p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg cursor-move hover:shadow-md transition-all ${
                    reminder.completed ? 'opacity-50' : ''
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
                      <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        {new Date(reminder.date).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteItem(reminder.id);
                      }}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
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
            <span className={`transform transition-transform ${showTodosList ? 'rotate-90' : ''}`}>
              ▶
            </span>
            <span>✅</span>
            To-dos
            <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full ml-2">
              {visibleTodos.length}
            </span>
          </button>
          <button
            onClick={() => {
              setQuickModalType('todo');
              setQuickModalOpen(true);
            }}
            className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
            title="Add To-do"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        {showTodosList && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {visibleTodos.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">No to-dos</p>
            ) : (
              visibleTodos.map((todo) => (
                <div
                  key={todo.id}
                  draggable
                  onDragStart={() => onDragStart(todo, 'todo')}
                  onDragEnd={onDragEnd}
                  className={`p-2 bg-green-50 dark:bg-green-900/20 rounded-lg cursor-move hover:shadow-md transition-all ${
                    todo.completed ? 'opacity-50' : ''
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
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Due: {new Date(todo.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteItem(todo.id);
                      }}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
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
        
        {/* Show Completed Toggle */}
        <div className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            id="show-completed"
            checked={showCompletedItems}
            onChange={(e) => setShowCompletedItems(e.target.checked)}
            className="cursor-pointer"
          />
          <label htmlFor="show-completed" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
            Show completed items
          </label>
        </div>
      </div>

      {/* Progress Stats */}
      {userStats && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4">
          <h3 className="font-semibold text-purple-800 dark:text-purple-300 mb-3">Today's Progress</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Events</span>
              <span className="text-sm font-medium">0 / 5</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">To-dos</span>
              <span className="text-sm font-medium">
                {visibleTodos.filter(t => t.completed).length} / {visibleTodos.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all" 
                style={{ 
                  width: `${visibleTodos.length > 0 ? (visibleTodos.filter(t => t.completed).length / visibleTodos.length * 100) : 0}%` 
                }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
