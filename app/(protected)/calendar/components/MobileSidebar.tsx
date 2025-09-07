// app/(protected)/calendar/components/MobileSidebar.tsx
import React from 'react';
import type { Friend, TodoReminder, CarpoolMatch } from '../types';

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
  onDeleteItem: (itemId: string) => void;
  userStats?: any;
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
    <div className="fixed inset-0 z-50 lg:hidden">
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity duration-300" 
        onClick={onClose} 
      />
      
      <div className={`fixed left-0 top-0 h-full w-80 bg-white dark:bg-gray-800 shadow-xl overflow-y-auto
                    transform transition-transform duration-300 ease-out
                    ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <h2 className="font-semibold text-lg">My Lists</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 transform hover:scale-110 active:scale-95 transition-all"
          >
            ✕
          </button>
        </div>

        {/* User Stats */}
        {userStats && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Today's Progress</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Level {userStats.level}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((userStats.todayCompleted / userStats.weeklyGoal) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {userStats.points} pts
              </span>
            </div>
            {userStats.streak > 0 && (
              <div className="text-xs text-center text-gray-600 dark:text-gray-400">
                🔥 {userStats.streak} day streak!
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                setShowTemplates(true);
                onClose();
              }}
              className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300
                       hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors
                       flex flex-col items-center gap-1"
            >
              <span className="text-xl">✨</span>
              <span className="text-xs">Templates</span>
            </button>
            
            <button
              onClick={() => {
                setShowAnalytics(true);
                onClose();
              }}
              className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300
                       hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors
                       flex flex-col items-center gap-1"
            >
              <span className="text-xl">📊</span>
              <span className="text-xs">Analytics</span>
            </button>
            
            <button
              onClick={() => {
                setShowMeetingCoordinator(true);
                onClose();
              }}
              className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300
                       hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors
                       flex flex-col items-center gap-1"
            >
              <span className="text-xl">🤝</span>
              <span className="text-xs">Meetings</span>
            </button>
          </div>
        </div>
        
        {/* Carpool Section */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Carpool</h3>
            <button
              onClick={() => {
                openCarpoolChat();
                onClose();
              }}
              className="text-xs px-2 py-1 bg-green-500 text-white rounded
                       transform hover:scale-105 active:scale-95 transition-all"
            >
              + Start
            </button>
          </div>

          {carpoolMatches.length > 0 ? (
            <div className="space-y-2 mb-3">
              {carpoolMatches.slice(0, 3).map((match, idx) => (
                <div
                  key={idx}
                  className="p-2 border border-green-400 dark:border-green-600 bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-900/20 rounded-lg active:shadow-md
                           transform active:scale-95 transition-all"
                  onClick={() => {
                    openCarpoolChat(match.event);
                    onClose();
                  }}
                >
                  <div className="text-xs font-medium text-green-800 dark:text-green-300">
                    {match.event.title}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {match.friends.length} friend{match.friends.length > 1 ? 's' : ''} going
                  </div>
                </div>
              ))}
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-3">
              <p className="text-sm text-gray-400 mb-2">No friends added yet</p>
              <button className="text-xs px-3 py-1 bg-blue-500 text-white rounded
                               transform hover:scale-105 active:scale-95 transition-all">
                Invite Friends
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">
              No carpool matches found
            </p>
          )}
        </div>

        {/* Reminders Section */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">
              Reminders ({visibleReminders.filter((r: any) => !r.completed).length})
            </h3>
            <button
              onClick={() => {
                setQuickModalType('reminder');
                setQuickModalOpen(true);
                onClose();
              }}
              className="text-xs px-2 py-1 bg-amber-500 text-white rounded
                       transform hover:scale-105 active:scale-95 transition-all"
            >
              + Add
            </button>
          </div>

          <div className="mb-2">
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
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
            {visibleReminders.length === 0 ? (
              <p className="text-sm text-gray-400 italic p-2">No reminders yet</p>
            ) : (
              visibleReminders.map((r: any) => (
                <div key={r.id} className={`p-2 border border-amber-400 dark:border-amber-600 bg-gradient-to-br from-white to-amber-50 dark:from-gray-800 dark:to-amber-900/20 rounded-lg flex items-center gap-2
                                          active:shadow-md transition-all ${
                  r.completed ? 'opacity-50' : ''
                }`}>
                  <input
                    type="checkbox"
                    checked={r.completed || false}
                    onChange={() => onToggleComplete(r)}
                    className="rounded-sm accent-amber-500"
                  />
                  <span className={`flex-1 text-sm text-amber-700 dark:text-amber-300 ${r.completed ? 'line-through' : ''}`}>
                    {r.title}
                  </span>
                  <button
                    onClick={() => onDeleteItem(r.id)}
                    className="text-red-500 text-xs transform hover:scale-110 active:scale-95 transition-all"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* To-dos Section */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">
              To-dos ({visibleTodos.filter((t: any) => !t.completed).length})
            </h3>
            <button
              onClick={() => {
                setQuickModalType('todo');
                setQuickModalOpen(true);
                onClose();
              }}
              className="text-xs px-2 py-1 bg-green-500 text-white rounded
                       transform hover:scale-105 active:scale-95 transition-all"
            >
              + Add
            </button>
          </div>
          
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {visibleTodos.length === 0 ? (
              <p className="text-sm text-gray-400 italic p-2">No to-dos yet</p>
            ) : (
              visibleTodos.map((t: any) => (
                <div key={t.id} className={`p-2 border border-green-400 dark:border-green-600 bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-900/20 rounded-lg flex items-center gap-2
                                        active:shadow-lg transition-all ${
                  t.completed ? 'opacity-50' : ''
                }`}>
                  <input
                    type="checkbox"
                    checked={t.completed || false}
                    onChange={() => onToggleComplete(t)}
                    className="rounded-sm accent-green-500"
                  />
                  <span className={`flex-1 text-sm font-medium text-green-700 dark:text-green-300 ${t.completed ? 'line-through' : ''}`}>
                    {t.title}
                  </span>
                  <button
                    onClick={() => onDeleteItem(t.id)}
                    className="text-red-500 text-xs transform hover:scale-110 active:scale-95 transition-all"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== FeedView.tsx =====
interface FeedViewProps {
  feed: any[];
  onDismiss: (eventId: string) => void;
  onInterested: (event: any) => void;
  onRSVP: (event: any) => void;
  onShowDetails: (event: any) => void;
  isMobile?: boolean;
}

export function FeedView({ 
  feed, 
  onDismiss, 
  onInterested, 
  onRSVP, 
  onShowDetails,
  isMobile = false
}: FeedViewProps) {
  const [dismissedEvents, setDismissedEvents] = React.useState<Set<string>>(new Set());

  const handleDismiss = (eventId: string) => {
    setDismissedEvents(prev => new Set([...prev, eventId]));
    onDismiss(eventId);
  };

  const visibleFeed = feed.filter(e => !dismissedEvents.has(e.id));

  if (visibleFeed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500 dark:text-gray-400">
        <span className="text-6xl mb-4">📅</span>
        <p className="text-lg font-medium">No upcoming events</p>
        <p className="text-sm mt-2">Check back later for community and business events</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
        What's Happening in Your Community
      </h2>
      
      <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}`}>
        {visibleFeed.map((event) => (
          <div
            key={event.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all duration-300
                     transform hover:scale-[1.02] border border-gray-200 dark:border-gray-700"
          >
            {/* Event Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {event._eventSource === 'business' && (
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                        Business
                      </span>
                    )}
                    {event._eventSource === 'community' && (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                        Community
                      </span>
                    )}
                    {event._eventSource === 'friend_invite' && (
                      <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                        Friend Invite
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-800 dark:text-white text-lg">
                    {event.title}
                  </h3>
                </div>
                <button
                  onClick={() => handleDismiss(event.id)}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Dismiss"
                >
                  <span className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</span>
                </button>
              </div>
            </div>

            {/* Event Body */}
            <div className="p-4">
              {event.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                  {event.description}
                </p>
              )}
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <span>📅</span>
                  <span>
                    {new Date(event.start_time).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                
                {event.location && (
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <span>📍</span>
                    <span>{event.location}</span>
                  </div>
                )}

                {event.rsvp_count !== undefined && (
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <span>👥</span>
                    <span>{event.rsvp_count} attending</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <button
                onClick={() => onShowDetails(event)}
                className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg
                         hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                Details
              </button>
              <button
                onClick={() => onInterested(event)}
                className="flex-1 px-3 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg
                         hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors text-sm font-medium"
              >
                Interested
              </button>
              <button
                onClick={() => onRSVP(event)}
                className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg
                         hover:from-purple-700 hover:to-pink-700 transition-colors text-sm font-medium
                         transform hover:scale-105 active:scale-95"
              >
                RSVP
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
