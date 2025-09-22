// app/(protected)/calendar/components/MobileSidebar.tsx

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
}

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
  setQuickModalType: (type: 'reminder' | 'todo' | 'shopping') => void;
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
  const [activeTab, setActiveTab] = useState<'lists' | 'tools'>('lists');
  const [shoppingCount, setShoppingCount] = useState(0);

  // Safe arrays with fallbacks
  const safeVisibleReminders = visibleReminders || [];
  const safeVisibleTodos = visibleTodos || [];
  const safeCarpoolMatches = carpoolMatches || [];

  // Load shopping count
  useEffect(() => {
    loadShoppingCount();
    
    const subscription = supabase
      .channel('shopping-count-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'todos' },
        () => loadShoppingCount()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadShoppingCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { count } = await supabase
      .from('todos')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('list_type', 'shopping')
      .eq('completed', false);

    setShoppingCount(count || 0);
  };

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
          {/* Header */}
          <div className="p-4 border-b dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Quick Access</h2>
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

          {/* Tab Switcher */}
          <div className="flex p-2 gap-1 bg-gray-50 dark:bg-gray-900">
            <button
              onClick={() => setActiveTab('lists')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'lists'
                  ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Lists & Tasks
            </button>
            <button
              onClick={() => setActiveTab('tools')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'tools'
                  ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Tools & Settings
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {activeTab === 'lists' ? (
              <>
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

                {/* Quick Actions for Lists */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Quick Add</h3>
                  
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
                    {safeVisibleReminders.filter(r => !r.completed).length > 0 && (
                      <span className="ml-auto text-sm bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full">
                        {safeVisibleReminders.filter(r => !r.completed).length}
                      </span>
                    )}
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
                    {safeVisibleTodos.filter(t => !t.completed).length > 0 && (
                      <span className="ml-auto text-sm bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full">
                        {safeVisibleTodos.filter(t => !t.completed).length}
                      </span>
                    )}
                  </button>

                  <a
                    href="/shopping"
                    className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    onClick={onClose}
                  >
                    <span className="text-xl">🛒</span>
                    <span className="font-medium">Shopping List</span>
                    {shoppingCount > 0 && (
                      <span className="ml-auto text-sm bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
                        {shoppingCount}
                      </span>
                    )}
                  </a>
                </div>

                {/* View Full Lists */}
                <div className="space-y-2 pt-4 border-t dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">View Full Lists</h3>
                  
                  <a
                    href="/reminders"
                    className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    onClick={onClose}
                  >
                    <span>📅</span>
                    <span className="text-sm">All Reminders</span>
                    <svg className="w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                  
                  <a
                    href="/todos"
                    className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    onClick={onClose}
                  >
                    <span>📋</span>
                    <span className="text-sm">All To-dos</span>
                    <svg className="w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>

                {/* Carpool Matches */}
                {safeCarpoolMatches.length > 0 && (
                  <div className="pt-4 border-t dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Carpool Matches ({safeCarpoolMatches.length})
                    </h3>
                    <div className="space-y-2">
                      {safeCarpoolMatches.slice(0, 2).map((match) => (
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

                {/* Active Items Preview */}
                <div className="pt-4 border-t dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Today's Overview</h3>
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={showCompletedItems}
                        onChange={(e) => setShowCompletedItems(e.target.checked)}
                        className="mr-1"
                      />
                      Show done
                    </label>
                  </div>
                  
                  {/* Quick preview of active items */}
                  <div className="space-y-1 text-sm">
                    {safeVisibleReminders.filter(r => !r.completed).length > 0 && (
                      <div className="text-amber-600 dark:text-amber-400">
                        🔔 {safeVisibleReminders.filter(r => !r.completed).length} active reminder{safeVisibleReminders.filter(r => !r.completed).length !== 1 ? 's' : ''}
                      </div>
                    )}
                    {safeVisibleTodos.filter(t => !t.completed).length > 0 && (
                      <div className="text-green-600 dark:text-green-400">
                        ✅ {safeVisibleTodos.filter(t => !t.completed).length} pending to-do{safeVisibleTodos.filter(t => !t.completed).length !== 1 ? 's' : ''}
                      </div>
                    )}
                    {shoppingCount > 0 && (
                      <div className="text-blue-600 dark:text-blue-400">
                        🛒 {shoppingCount} item{shoppingCount !== 1 ? 's' : ''} to buy
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Tools Tab Content */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Calendar Tools</h3>
                  
                  <button
                    onClick={() => {
                      setShowTemplates(true);
                      onClose();
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-3"
                  >
                    <span className="text-xl">📋</span>
                    <div>
                      <div className="font-medium">Templates</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Quick event templates</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowAnalytics(true);
                      onClose();
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-3"
                  >
                    <span className="text-xl">📊</span>
                    <div>
                      <div className="font-medium">Analytics</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">View your statistics</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowMeetingCoordinator(true);
                      onClose();
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-3"
                  >
                    <span className="text-xl">🤝</span>
                    <div>
                      <div className="font-medium">Meeting Coordinator</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Schedule with friends</div>
                    </div>
                  </button>
                </div>

                {/* Settings */}
                <div className="pt-4 border-t dark:border-gray-700 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Settings</h3>
                  
                  <label className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gamificationEnabled}
                      onChange={(e) => setGamificationEnabled(e.target.checked)}
                      className="cursor-pointer"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Goal Tracking
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Points, streaks & achievements
                      </div>
                    </div>
                  </label>

                  <a
                    href="/calendar"
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                    onClick={onClose}
                  >
                    <span className="text-xl">⚙️</span>
                    <div>
                      <div className="text-sm font-medium">Calendar Settings</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">More options</div>
                    </div>
                  </a>
                </div>

                {/* Quick Help */}
                <div className="pt-4 border-t dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <p>💡 Tip: Swipe left/right to change dates</p>
                    <p>💡 Long-press the + button for quick actions</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
