// app/(protected)/calendar/components/CalendarSidebar.tsx
import React from 'react';
import CarpoolSection from './CarpoolSection';
import RemindersSection from './RemindersSection';
import TodosSection from './TodosSection';
import type { Friend, TodoReminder, CarpoolMatch } from '../types';

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
  onDeleteItem: (itemId: string) => void;
  userStats?: any;
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
    <div className="w-64 shrink-0 hidden lg:block">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        
        {/* User Stats Summary - if gamification enabled */}
        {userStats && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-t-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Daily Progress</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {userStats.todayCompleted}/{userStats.weeklyGoal}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((userStats.todayCompleted / userStats.weeklyGoal) * 100, 100)}%` }}
              />
            </div>
            {userStats.streak > 0 && (
              <div className="mt-2 text-xs text-center text-gray-600 dark:text-gray-400">
                🔥 {userStats.streak} day streak!
              </div>
            )}
          </div>
        )}

        {/* Carpool Section */}
        <CarpoolSection
          carpoolMatches={carpoolMatches}
          friends={friends}
          openCarpoolChat={openCarpoolChat}
        />

        {/* Reminders Section */}
        <RemindersSection
          reminders={visibleReminders}
          showRemindersList={showRemindersList}
          setShowRemindersList={setShowRemindersList}
          showCompletedItems={showCompletedItems}
          setShowCompletedItems={setShowCompletedItems}
          onAdd={() => {
            setQuickModalType('reminder');
            setQuickModalOpen(true);
          }}
          onDragStart={(item) => onDragStart(item, 'reminder')}
          onDragEnd={onDragEnd}
          onToggleComplete={onToggleComplete}
          onDelete={onDeleteItem}
        />

        {/* To-dos Section */}
        <TodosSection
          todos={visibleTodos}
          showTodosList={showTodosList}
          setShowTodosList={setShowTodosList}
          showCompletedItems={showCompletedItems}
          onAdd={() => {
            setQuickModalType('todo');
            setQuickModalOpen(true);
          }}
          onDragStart={(item) => onDragStart(item, 'todo')}
          onDragEnd={onDragEnd}
          onToggleComplete={onToggleComplete}
          onDelete={onDeleteItem}
        />
      </div>
    </div>
  );
}

// ===== CarpoolSection.tsx =====
export function CarpoolSection({ carpoolMatches, friends, openCarpoolChat }: any) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300">Carpool</h3>
          <button
            onClick={() => openCarpoolChat()}
            className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600
                     transform hover:scale-105 active:scale-95 transition-all duration-200"
          >
            + Start
          </button>
        </div>

        {/* Carpool Matches */}
        {carpoolMatches.length > 0 ? (
          <div className="space-y-2 mb-3">
            {carpoolMatches.slice(0, 3).map((match: any, idx: number) => (
              <div
                key={idx}
                className="p-2 border border-green-500 bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-900/20 rounded-lg cursor-pointer hover:shadow-md
                         transform hover:scale-[1.02] transition-all duration-200"
                onClick={() => openCarpoolChat(match.event)}
              >
                <div className="text-xs font-medium text-green-800 dark:text-green-300">
                  {match.event.title}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {match.friends.length} friend{match.friends.length > 1 ? 's' : ''} going
                </div>
                {match.savings && (
                  <div className="text-xs text-green-500 mt-1">
                    Save ${match.savings.amount} • {match.savings.co2Saved.toFixed(1)}kg CO₂
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-3">
            <p className="text-xs text-gray-400 mb-2">No friends added yet</p>
            <button className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600
                             transform hover:scale-105 active:scale-95 transition-all duration-200">
              Invite Friends
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic mb-3">
            No carpool matches found
          </p>
        )}

        {/* Manual Carpool Button */}
        <button
          onClick={() => openCarpoolChat()}
          className="w-full text-xs px-3 py-2 border border-blue-300 dark:border-blue-600 bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg
                   hover:shadow-md transition-all flex items-center justify-center gap-2
                   transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>🚗</span>
          <span>Manual Carpool Setup</span>
        </button>
      </div>
    </div>
  );
}

// ===== RemindersSection.tsx =====
export function RemindersSection({ 
  reminders, 
  showRemindersList, 
  setShowRemindersList,
  showCompletedItems,
  setShowCompletedItems,
  onAdd,
  onDragStart,
  onDragEnd,
  onToggleComplete,
  onDelete 
}: any) {
  const incompleteCount = reminders.filter((r: any) => !r.completed).length;
  
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setShowRemindersList(!showRemindersList)}
            className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <span className="transform transition-transform duration-200">
              {showRemindersList ? '▼' : '▶'}
            </span>
            <span>Reminders</span>
            {incompleteCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">
                {incompleteCount}
              </span>
            )}
          </button>
          <button
            onClick={onAdd}
            className="text-xs px-2 py-1 bg-amber-500 text-white rounded hover:bg-amber-600
                     transform hover:scale-105 active:scale-95 transition-all duration-200"
          >
            + Add
          </button>
        </div>

        {showRemindersList && (
          <>
            <div className="mb-2">
              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCompletedItems}
                  onChange={(e) => setShowCompletedItems(e.target.checked)}
                  className="rounded accent-amber-500"
                />
                Show completed
              </label>
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto">
              {reminders.length === 0 ? (
                <p className="text-xs text-gray-400 italic p-2">No reminders yet</p>
              ) : (
                reminders.map((r: any) => (
                  <div
                    key={r.id}
                    className={`group p-2 border border-amber-400 dark:border-amber-600 bg-gradient-to-br from-white to-amber-50 dark:from-gray-800 dark:to-amber-900/20 rounded-lg flex items-center gap-2
                              hover:shadow-md transition-all duration-200
                              transform hover:scale-[1.02] ${
                      r.completed ? 'opacity-50' : ''
                    }`}
                    draggable={true}
                    onDragStart={() => onDragStart(r)}
                    onDragEnd={onDragEnd}
                  >
                    <input
                      type="checkbox"
                      checked={r.completed || false}
                      onChange={(e) => {
                        e.stopPropagation();
                        onToggleComplete(r);
                      }}
                      className="rounded-sm cursor-pointer accent-amber-500"
                    />
                    <span className={`flex-1 text-sm text-amber-800 dark:text-amber-300 cursor-move ${
                      r.completed ? 'line-through' : ''
                    }`}>
                      {r.title}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(r.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700
                               text-xs transition-opacity transform hover:scale-110"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>

            {reminders.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                Drag items to calendar to schedule
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ===== TodosSection.tsx =====
export function TodosSection({ 
  todos, 
  showTodosList, 
  setShowTodosList,
  showCompletedItems,
  onAdd,
  onDragStart,
  onDragEnd,
  onToggleComplete,
  onDelete 
}: any) {
  const incompleteCount = todos.filter((t: any) => !t.completed).length;
  
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setShowTodosList(!showTodosList)}
          className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <span className="transform transition-transform duration-200">
            {showTodosList ? '▼' : '▶'}
          </span>
          <span>To-dos</span>
          {incompleteCount > 0 && (
            <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
              {incompleteCount}
            </span>
          )}
        </button>
        <button
          onClick={onAdd}
          className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600
                   transform hover:scale-105 active:scale-95 transition-all duration-200"
        >
          + Add
        </button>
      </div>

      {showTodosList && (
        <>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {todos.length === 0 ? (
              <p className="text-xs text-gray-400 italic p-2">No to-dos yet</p>
            ) : (
              todos.map((t: any) => (
                <div
                  key={t.id}
                  className={`group p-2 border border-green-400 dark:border-green-600 bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-900/20 rounded-lg flex items-center gap-2
                            hover:shadow-md transition-all duration-200
                            transform hover:scale-[1.02] ${
                    t.completed ? 'opacity-50' : ''
                  }`}
                  draggable={true}
                  onDragStart={() => onDragStart(t)}
                  onDragEnd={onDragEnd}
                >
                  <input
                    type="checkbox"
                    checked={t.completed || false}
                    onChange={(e) => {
                      e.stopPropagation();
                      onToggleComplete(t);
                    }}
                    className="rounded-sm cursor-pointer accent-green-500"
                  />
                  <span className={`flex-1 text-sm text-green-700 dark:text-green-300 cursor-move ${
                    t.completed ? 'line-through' : ''
                  }`}>
                    {t.title}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(t.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700
                             text-xs transition-opacity transform hover:scale-110"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {todos.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
              Drag items to calendar to schedule
            </p>
          )}
        </>
      )}
    </div>
  );
}
