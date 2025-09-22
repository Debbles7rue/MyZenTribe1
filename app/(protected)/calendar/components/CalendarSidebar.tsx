// app/(protected)/calendar/components/CalendarSidebar.tsx

import React, { useState, useEffect } from 'react';
import { TodoReminder, Friend, CarpoolMatch } from '../types';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ShoppingItem {
  id: string;
  title: string;
  quantity?: number;
  unit?: string;
  category?: string;
  completed: boolean;
  notes?: string;
}

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
  setQuickModalType: (type: 'reminder' | 'todo' | 'shopping') => void;
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
  const [activeTab, setActiveTab] = useState<'reminders' | 'todos' | 'shopping'>('reminders');
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [showShoppingList, setShowShoppingList] = useState(true);
  const [loadingShop, setLoadingShop] = useState(false);

  // Load shopping items
  useEffect(() => {
    loadShoppingItems();

    // Subscribe to changes
    const subscription = supabase
      .channel('shopping-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'todos' },
        () => loadShoppingItems()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [showCompletedItems]);

  const loadShoppingItems = async () => {
    setLoadingShop(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .eq('list_type', 'shopping')
      .order('completed', { ascending: true })
      .order('category', { ascending: true });

    if (!error && data) {
      const filtered = showCompletedItems ? data : data.filter(item => !item.completed);
      setShoppingItems(filtered);
    }
    setLoadingShop(false);
  };

  const toggleShoppingItem = async (item: ShoppingItem) => {
    const { error } = await supabase
      .from('todos')
      .update({ 
        completed: !item.completed,
        updated_at: new Date().toISOString()
      })
      .eq('id', item.id);

    if (!error) {
      await loadShoppingItems();
    }
  };

  const deleteShoppingItem = async (id: string) => {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);

    if (!error) {
      await loadShoppingItems();
    }
  };

  return (
    <div className="w-80 shrink-0 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
      
      {/* User Stats Summary - Only if gamification is enabled */}
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
      {carpoolMatches.length > 0 && (
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-xl p-4">
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
                key={match.event.id}
                className="bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-900/20 rounded-lg p-3 cursor-pointer hover:shadow-md transition-all"
                onClick={() => openCarpoolChat(match.event)}
              >
                <div className="font-medium text-sm text-gray-800 dark:text-gray-200">
                  {match.event.title}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {match.friends.length} friend{match.friends.length > 1 ? 's' : ''} attending
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Lists Section with Tabs */}
      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-xl p-4">
        {/* Tab Headers */}
        <div className="flex items-center gap-1 mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('reminders')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'reminders'
                ? 'bg-white dark:bg-gray-600 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            🔔 Reminders
            {visibleReminders.filter(r => !r.completed).length > 0 && (
              <span className="ml-1 text-xs bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded-full">
                {visibleReminders.filter(r => !r.completed).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('todos')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'todos'
                ? 'bg-white dark:bg-gray-600 text-green-600 dark:text-green-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            ✅ To-dos
            {visibleTodos.filter(t => !t.completed).length > 0 && (
              <span className="ml-1 text-xs bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-1.5 py-0.5 rounded-full">
                {visibleTodos.filter(t => !t.completed).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('shopping')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'shopping'
                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            🛒 Shopping
            {shoppingItems.filter(s => !s.completed).length > 0 && (
              <span className="ml-1 text-xs bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded-full">
                {shoppingItems.filter(s => !s.completed).length}
              </span>
            )}
          </button>
        </div>

        {/* Show Completed Checkbox */}
        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-3">
          <input
            type="checkbox"
            checked={showCompletedItems}
            onChange={(e) => setShowCompletedItems(e.target.checked)}
            className="rounded"
          />
          Show completed items
        </label>

        {/* Tab Content */}
        <div className="min-h-[200px]">
          {/* Reminders Tab */}
          {activeTab === 'reminders' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Reminders</h3>
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
              
              {visibleReminders.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-8">No reminders yet</p>
              ) : (
                visibleReminders.map((reminder) => (
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
                        className="mt-1 cursor-pointer accent-amber-500"
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
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-all"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* To-dos Tab */}
          {activeTab === 'todos' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">To-dos</h3>
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
              
              {visibleTodos.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-8">No to-dos yet</p>
              ) : (
                <>
                  {visibleTodos.map((todo) => (
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
                          className="mt-1 cursor-pointer accent-green-500"
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
                          className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-all"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {!visibleTodos.every(t => t.completed) && visibleTodos.length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 italic text-center">
                      Drag items to calendar to schedule
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Shopping Tab */}
          {activeTab === 'shopping' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Shopping List</h3>
                <a
                  href="/shopping"
                  target="_blank"
                  className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Open Full List →
                </a>
              </div>
              
              {loadingShop ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : shoppingItems.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-8">Shopping list is empty</p>
              ) : (
                <>
                  {shoppingItems.map((item) => (
                    <div
                      key={item.id}
                      className={`group bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-900/20 
                                rounded-lg p-3 hover:shadow-md transition-all ${
                        item.completed ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => toggleShoppingItem(item)}
                          className="mt-1 cursor-pointer accent-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${
                            item.completed ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-200'
                          }`}>
                            {item.quantity && item.quantity > 1 && (
                              <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-1 py-0.5 rounded mr-1">
                                {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                              </span>
                            )}
                            {item.title}
                          </div>
                          {item.category && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                              {item.category}
                            </div>
                          )}
                          {item.notes && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                              {item.notes}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteShoppingItem(item.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-all"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <a
                    href="/shopping"
                    className="block text-center text-xs text-blue-600 dark:text-blue-400 hover:underline mt-3"
                  >
                    View all items & manage categories →
                  </a>
                </>
              )}
            </div>
          )}
        </div>
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
