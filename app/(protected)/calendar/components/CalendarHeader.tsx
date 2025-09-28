// app/(protected)/calendar/components/CalendarHeader.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ListItem {
  id: string;
  title: string;
  type: 'todo' | 'reminder' | 'shopping';
  completed?: boolean;
  due_date?: string;
  time?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  description?: string;
  notes?: string;
  quantity?: number;
  unit?: string;
}

interface CalendarHeaderProps {
  mode: "my" | "whats";
  setMode: (mode: "my" | "whats") => void;
  isMobile: boolean;
  setOpenCreate: (open: boolean) => void;
  // Lists data
  todos?: ListItem[];
  reminders?: ListItem[];
  shoppingItems?: ListItem[];
  // Drag and drop handlers
  onItemDragStart?: (item: ListItem) => void;
  // Loading states
  listsLoading?: boolean;
}

export default function CalendarHeader({
  mode,
  setMode,
  isMobile,
  setOpenCreate,
  todos = [],
  reminders = [],
  shoppingItems = [],
  onItemDragStart,
  listsLoading = false
}: CalendarHeaderProps) {
  const router = useRouter();
  const [listsDropdownOpen, setListsDropdownOpen] = useState(false);
  const [activeListTab, setActiveListTab] = useState<'todos' | 'reminders' | 'shopping'>('todos');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setListsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate counts for badges
  const todosCount = todos.filter(t => !t.completed).length;
  const remindersCount = reminders.filter(r => !r.completed).length;
  const shoppingCount = shoppingItems.filter(s => !s.completed).length;
  const totalListsCount = todosCount + remindersCount + shoppingCount;

  // Handle drag start
  const handleDragStart = (item: ListItem) => {
    if (onItemDragStart) {
      onItemDragStart(item);
    }
    console.log('Dragging item:', item);
  };

  // Navigate to specific list pages
  const navigateToList = (listType: 'todos' | 'reminders' | 'shopping') => {
    const routes = {
      todos: '/todos',
      reminders: '/reminders', 
      shopping: '/shopping'
    };
    router.push(routes[listType]);
    setListsDropdownOpen(false);
  };

  // Get current list items based on active tab
  const getCurrentListItems = () => {
    switch (activeListTab) {
      case 'todos':
        return todos.filter(t => !t.completed);
      case 'reminders':
        return reminders.filter(r => !r.completed);
      case 'shopping':
        return shoppingItems.filter(s => !s.completed);
      default:
        return [];
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'todo': return '✅';
      case 'reminder': return '🔔';
      case 'shopping': return '🛒';
      default: return '•';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-30 transition-all duration-300">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6">
        
        {/* Mobile Header */}
        {isMobile ? (
          <div className="py-3">
            <div className="flex items-center justify-between mb-3">
              {/* Left: Lists Button */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setListsDropdownOpen(!listsDropdownOpen)}
                  className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200"
                  aria-label="Open lists"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Lists</span>
                  {totalListsCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {totalListsCount}
                    </span>
                  )}
                  <svg className={`w-4 h-4 text-gray-500 transition-transform ${listsDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Mobile Lists Dropdown */}
                {listsDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                    {/* Tabs */}
                    <div className="flex border-b dark:border-gray-700">
                      <button
                        onClick={() => setActiveListTab('todos')}
                        className={`flex-1 px-4 py-3 text-sm font-medium ${
                          activeListTab === 'todos'
                            ? 'text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        ✅ Todos {todosCount > 0 && <span className="ml-1 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full text-xs">{todosCount}</span>}
                      </button>
                      <button
                        onClick={() => setActiveListTab('reminders')}
                        className={`flex-1 px-4 py-3 text-sm font-medium ${
                          activeListTab === 'reminders'
                            ? 'text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        🔔 Reminders {remindersCount > 0 && <span className="ml-1 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full text-xs">{remindersCount}</span>}
                      </button>
                      <button
                        onClick={() => setActiveListTab('shopping')}
                        className={`flex-1 px-4 py-3 text-sm font-medium ${
                          activeListTab === 'shopping'
                            ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        🛒 Shopping {shoppingCount > 0 && <span className="ml-1 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full text-xs">{shoppingCount}</span>}
                      </button>
                    </div>

                    {/* List Items */}
                    <div className="max-h-64 overflow-y-auto p-2">
                      {listsLoading ? (
                        <div className="p-4 text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto"></div>
                          <p className="text-sm text-gray-500 mt-2">Loading...</p>
                        </div>
                      ) : getCurrentListItems().length > 0 ? (
                        getCurrentListItems().map((item) => (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={() => handleDragStart(item)}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-grab active:cursor-grabbing transition-colors"
                          >
                            <span className="text-lg">{getItemIcon(item.type)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {item.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {item.due_date && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    📅 {new Date(item.due_date).toLocaleDateString()}
                                  </span>
                                )}
                                {item.time && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    🕒 {item.time}
                                  </span>
                                )}
                                {item.priority && (
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${getPriorityColor(item.priority)}`}>
                                    {item.priority}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              Drag to calendar
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                          No {activeListTab} items
                        </div>
                      )}
                    </div>

                    {/* Footer - Navigate to full page */}
                    <div className="border-t dark:border-gray-700 p-3">
                      <button
                        onClick={() => navigateToList(activeListTab)}
                        className="w-full text-center text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        View all {activeListTab} →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Extras and Create */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push('/calendar/tools')}
                  className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-200 flex items-center gap-1"
                  title="Extras & Tools"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-xs font-medium">Extras</span>
                </button>
                
                <button
                  onClick={() => setOpenCreate(true)}
                  className="p-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  aria-label="Create event"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Center: Mode Switcher with Description */}
            <div className="text-center">
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1.5 shadow-inner justify-center">
                <button
                  onClick={() => setMode("my")}
                  className={`px-6 py-3 text-base font-semibold rounded-lg transition-all duration-200 ${
                    mode === "my"
                      ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  My Calendar
                </button>
                <button
                  onClick={() => setMode("whats")}
                  className={`px-6 py-3 text-base font-semibold rounded-lg transition-all duration-200 ${
                    mode === "whats"
                      ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  What's Happening
                </button>
              </div>
              
              {/* Description Text */}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 px-4">
                {mode === "my" 
                  ? "Your events, saved interests, and RSVPs." 
                  : "Events from followed businesses and friend invites."
                }
              </p>
            </div>
          </div>
        ) : (
          /* Desktop Header */
          <div className="py-4">
            <div className="flex items-center justify-between mb-3">
              
              {/* Left: Lists Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setListsDropdownOpen(!listsDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
                >
                  <span className="font-medium">Lists</span>
                  {totalListsCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                      {totalListsCount}
                    </span>
                  )}
                  <svg className={`w-4 h-4 transition-transform ${listsDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Desktop Lists Dropdown */}
                {listsDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                    {/* Tabs */}
                    <div className="flex border-b dark:border-gray-700">
                      <button
                        onClick={() => setActiveListTab('todos')}
                        className={`flex-1 px-4 py-3 text-sm font-medium ${
                          activeListTab === 'todos'
                            ? 'text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        ✅ Todos {todosCount > 0 && <span className="ml-1 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full text-xs">{todosCount}</span>}
                      </button>
                      <button
                        onClick={() => setActiveListTab('reminders')}
                        className={`flex-1 px-4 py-3 text-sm font-medium ${
                          activeListTab === 'reminders'
                            ? 'text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        🔔 Reminders {remindersCount > 0 && <span className="ml-1 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full text-xs">{remindersCount}</span>}
                      </button>
                      <button
                        onClick={() => setActiveListTab('shopping')}
                        className={`flex-1 px-4 py-3 text-sm font-medium ${
                          activeListTab === 'shopping'
                            ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        🛒 Shopping {shoppingCount > 0 && <span className="ml-1 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full text-xs">{shoppingCount}</span>}
                      </button>
                    </div>

                    {/* List Items */}
                    <div className="max-h-80 overflow-y-auto p-3">
                      {listsLoading ? (
                        <div className="p-6 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto"></div>
                          <p className="text-sm text-gray-500 mt-3">Loading lists...</p>
                        </div>
                      ) : getCurrentListItems().length > 0 ? (
                        getCurrentListItems().map((item) => (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={() => handleDragStart(item)}
                            className="group flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-grab active:cursor-grabbing transition-colors mb-2"
                          >
                            <span className="text-lg">{getItemIcon(item.type)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {item.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {item.due_date && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    📅 Due: {new Date(item.due_date).toLocaleDateString()}
                                  </span>
                                )}
                                {item.time && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    🕒 {item.time}
                                  </span>
                                )}
                                {item.priority && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(item.priority)}`}>
                                    {item.priority}
                                  </span>
                                )}
                                {item.category && (
                                  <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900 px-2 py-0.5 rounded-full">
                                    {item.category}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              Drag to schedule
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                          <div className="text-2xl mb-2">{getItemIcon(activeListTab.slice(0, -1) as any)}</div>
                          <p>No {activeListTab} items</p>
                          <p className="text-xs mt-1">Create some to get started!</p>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="border-t dark:border-gray-700 p-3 space-y-2">
                      <button
                        onClick={() => navigateToList(activeListTab)}
                        className="w-full text-center text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        View all {activeListTab} →
                      </button>
                      <button
                        onClick={() => {
                          navigateToList(activeListTab);
                          // Could trigger quick add modal here in the future
                        }}
                        className="w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 py-1"
                      >
                        + Add new {activeListTab.slice(0, -1)}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Extras and Create */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/calendar/tools')}
                  className="px-5 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Extras
                </button>

                <button
                  onClick={() => setOpenCreate(true)}
                  className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Event
                </button>
              </div>
            </div>

            {/* Center: Mode Switcher with Description */}
            <div className="text-center">
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1.5 shadow-inner justify-center max-w-lg mx-auto">
                <button
                  onClick={() => setMode("my")}
                  className={`px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-200 ${
                    mode === "my"
                      ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  My Calendar
                </button>
                <button
                  onClick={() => setMode("whats")}
                  className={`px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-200 ${
                    mode === "whats"
                      ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  What's Happening
                </button>
              </div>
              
              {/* Description Text */}
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 max-w-md mx-auto">
                {mode === "my" 
                  ? "Your events, saved interests, and RSVPs." 
                  : "Events from followed businesses and friend invites."
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
