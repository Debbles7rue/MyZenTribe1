// app/(protected)/calendar/components/FeedView.tsx

import React, { useState } from 'react';
import type { FeedEvent } from '../types';

interface FeedViewProps {
  feed: FeedEvent[];
  onDismiss: (eventId: string) => string;
  onInterested: (event: FeedEvent) => void;
  onRSVP: (event: FeedEvent) => void;
  onShowDetails: (event: FeedEvent) => void;
  isMobile: boolean;
}

export default function FeedView({
  feed,
  onDismiss,
  onInterested,
  onRSVP,
  onShowDetails,
  isMobile
}: FeedViewProps) {
  const [loadingEventId, setLoadingEventId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<'interested' | 'rsvp' | null>(null);

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'business':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'social':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'community':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'sports':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const formatEventTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();
    
    const daysDiff = Math.floor((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    let dayText = '';
    if (daysDiff === 0) dayText = 'Today';
    else if (daysDiff === 1) dayText = 'Tomorrow';
    else if (daysDiff > 1 && daysDiff <= 7) dayText = `In ${daysDiff} days`;
    else dayText = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const timeText = `${start.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    })} - ${end.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    })}`;
    
    return { dayText, timeText };
  };

  const handleInterested = async (event: FeedEvent) => {
    setLoadingEventId(event.id);
    setLoadingAction('interested');
    try {
      await onInterested(event);
    } finally {
      setLoadingEventId(null);
      setLoadingAction(null);
    }
  };

  const handleRSVP = async (event: FeedEvent) => {
    setLoadingEventId(event.id);
    setLoadingAction('rsvp');
    try {
      await onRSVP(event);
    } finally {
      setLoadingEventId(null);
      setLoadingAction(null);
    }
  };

  // Get user's RSVP status for an event
  const getUserRsvpStatus = (event: FeedEvent): 'going' | 'interested' | null => {
    // Check if event has user_rsvp_status property
    if ((event as any).user_rsvp_status) {
      return (event as any).user_rsvp_status;
    }
    // Fallback to checking individual flags
    if ((event as any).user_going) return 'going';
    if ((event as any).user_interested) return 'interested';
    return null;
  };

  if (feed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500 dark:text-gray-400">
        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-lg font-medium">No events in your feed</p>
        <p className="text-sm mt-2">Check back later for community events!</p>
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'} p-4`}>
      {feed.map((event) => {
        const { dayText, timeText } = formatEventTime(event.start_time, event.end_time);
        const userStatus = getUserRsvpStatus(event);
        const isLoading = loadingEventId === event.id;
        const isInterested = userStatus === 'interested';
        const isGoing = userStatus === 'going';
        
        return (
          <div
            key={event.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group"
          >
            {/* Event Header with Image or Gradient */}
            <div className="h-32 bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 relative">
              {event.image_path && (
                <img 
                  src={event.image_path} 
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute top-2 right-2">
                <button
                  onClick={() => onDismiss(event.id)}
                  className="p-1.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full hover:bg-white dark:hover:bg-gray-700 transition-colors"
                  title="Dismiss"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Time Badge */}
              <div className="absolute bottom-2 left-2">
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg px-3 py-1">
                  <div className="text-xs font-semibold text-gray-900 dark:text-white">{dayText}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{timeText}</div>
                </div>
              </div>
              
              {/* RSVP Status Badge */}
              {userStatus && (
                <div className="absolute top-2 left-2">
                  <div className={`px-2 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${
                    isGoing 
                      ? 'bg-green-500/90 text-white' 
                      : 'bg-purple-500/90 text-white'
                  }`}>
                    {isGoing ? '✓ Going' : '⭐ Interested'}
                  </div>
                </div>
              )}
            </div>

            {/* Event Content */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 
                  className="font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  onClick={() => onShowDetails(event)}
                >
                  {event.title}
                </h3>
                {event.event_type && (
                  <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ml-2 ${getCategoryColor(event.event_type)}`}>
                    {event.event_type}
                  </span>
                )}
              </div>

              {event.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {event.description}
                </p>
              )}

              {event.location && (
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="truncate">{event.location}</span>
                </div>
              )}

              {/* RSVP Counts (if available) */}
              {((event as any).going_count > 0 || (event as any).interested_count > 0) && (
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                  {(event as any).going_count > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="text-green-600 dark:text-green-400 font-semibold">
                        {(event as any).going_count}
                      </span> going
                    </span>
                  )}
                  {(event as any).interested_count > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="text-purple-600 dark:text-purple-400 font-semibold">
                        {(event as any).interested_count}
                      </span> interested
                    </span>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleInterested(event)}
                  disabled={isLoading}
                  className={`flex-1 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                    isInterested
                      ? 'bg-purple-500 text-white hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700 ring-2 ring-purple-300 dark:ring-purple-500'
                      : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoading && loadingAction === 'interested' ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>...</span>
                    </span>
                  ) : (
                    <>
                      {isInterested ? '⭐ Interested' : '🌟 Interested'}
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleRSVP(event)}
                  disabled={isLoading}
                  className={`flex-1 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                    isGoing
                      ? 'bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 ring-2 ring-green-300 dark:ring-green-500'
                      : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoading && loadingAction === 'rsvp' ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>...</span>
                    </span>
                  ) : (
                    <>
                      {isGoing ? '✓ Going' : '✓ RSVP'}
                    </>
                  )}
                </button>
              </div>

              {/* Additional Info for RSVP'd Events */}
              {isGoing && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Added to your calendar</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
