// components/CalendarAnalytics.tsx
import React from 'react';

interface CalendarAnalyticsProps {
  events: any[];
  userId: string;
  onClose: () => void;
}

export default function CalendarAnalytics({ events, userId, onClose }: CalendarAnalyticsProps) {
  // Calculate basic stats
  const userEvents = events.filter(e => e.created_by === userId);
  const totalEvents = userEvents.length;
  const thisMonth = userEvents.filter(e => {
    const eventDate = new Date(e.start_time);
    const now = new Date();
    return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
  }).length;
  
  const eventTypes = userEvents.reduce((acc, event) => {
    const type = event.event_type || 'Event';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">📊 Calendar Analytics</h2>
              <p className="text-purple-100 mt-1">Your activity overview</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl">
              <div className="text-3xl font-bold text-purple-600">{totalEvents}</div>
              <div className="text-sm text-gray-600 mt-1">Total Events</div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl">
              <div className="text-3xl font-bold text-blue-600">{thisMonth}</div>
              <div className="text-sm text-gray-600 mt-1">This Month</div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl">
              <div className="text-3xl font-bold text-green-600">
                {Object.keys(eventTypes).length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Event Types</div>
            </div>
          </div>

          {/* Event Types Breakdown */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">Event Types Breakdown</h3>
            <div className="space-y-2">
              {Object.entries(eventTypes).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">{type}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${(count / totalEvents) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Insights */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <h3 className="font-semibold text-purple-800 mb-2">💡 Insights</h3>
            <ul className="space-y-1 text-sm text-purple-700">
              <li>• You have {totalEvents} total events in your calendar</li>
              <li>• {thisMonth} events scheduled this month</li>
              {eventTypes.reminder && (
                <li>• {eventTypes.reminder} reminders to keep you on track</li>
              )}
              {eventTypes.todo && (
                <li>• {eventTypes.todo} to-dos in your list</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
