// app/(protected)/calendar/components/EventCountdown.tsx
import React, { useState, useEffect } from 'react';
import type { DBEvent } from '@/lib/types';

interface EventCountdownProps {
  events: DBEvent[];
  onEventStart: (event: DBEvent) => void;
}

export default function EventCountdown({ events, onEventStart }: EventCountdownProps) {
  const [countdowns, setCountdowns] = useState<Map<string, string>>(new Map());
  const [urgentEvents, setUrgentEvents] = useState<Set<string>>(new Set());

  useEffect(() => {
    const updateCountdowns = () => {
      const now = new Date();
      const newCountdowns = new Map<string, string>();
      const newUrgent = new Set<string>();

      // Get upcoming events in next 24 hours
      const upcomingEvents = events.filter(event => {
        const eventStart = new Date(event.start_time);
        const timeDiff = eventStart.getTime() - now.getTime();
        return timeDiff > 0 && timeDiff < 24 * 60 * 60 * 1000;
      });

      upcomingEvents.forEach(event => {
        const eventStart = new Date(event.start_time);
        const timeDiff = eventStart.getTime() - now.getTime();
        
        if (timeDiff <= 0) {
          onEventStart(event);
          return;
        }

        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        let countdown = '';
        if (hours > 0) {
          countdown = `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
          countdown = `${minutes}m ${seconds}s`;
        } else {
          countdown = `${seconds}s`;
        }

        newCountdowns.set(event.id, countdown);
        
        // Mark as urgent if less than 15 minutes
        if (timeDiff < 15 * 60 * 1000) {
          newUrgent.add(event.id);
        }
      });

      setCountdowns(newCountdowns);
      setUrgentEvents(newUrgent);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);

    return () => clearInterval(interval);
  }, [events, onEventStart]);

  if (countdowns.size === 0) return null;

  return (
    <div className="fixed bottom-20 right-6 z-40 space-y-2 max-w-sm">
      {Array.from(countdowns.entries()).slice(0, 3).map(([eventId, countdown]) => {
        const event = events.find(e => e.id === eventId);
        if (!event) return null;

        const isUrgent = urgentEvents.has(eventId);

        return (
          <div
            key={eventId}
            className={`p-3 rounded-lg shadow-lg backdrop-blur-lg transition-all transform hover:scale-105 ${
              isUrgent 
                ? 'bg-red-500/90 text-white animate-pulse' 
                : 'bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-3">
                <div className="font-medium text-sm truncate">
                  {event.title}
                </div>
                <div className={`text-xs ${isUrgent ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'}`}>
                  {new Date(event.start_time).toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
              <div className={`text-lg font-bold ${
                isUrgent ? 'text-white' : 'text-purple-600 dark:text-purple-400'
              }`}>
                {countdown}
              </div>
            </div>
            {isUrgent && (
              <div className="mt-2 text-xs text-white/90">
                ⚠️ Starting soon!
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ===== LiveAttendanceCounter.tsx =====
import { supabase } from '@/lib/supabaseClient';

interface LiveAttendanceCounterProps {
  event: DBEvent;
  userId: string;
}

export function LiveAttendanceCounter({ event, userId }: LiveAttendanceCounterProps) {
  const [attendance, setAttendance] = useState({
    confirmed: 0,
    maybe: 0,
    declined: 0,
    pending: 0
  });
  const [userStatus, setUserStatus] = useState<'confirmed' | 'maybe' | 'declined' | 'pending'>('pending');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Load initial attendance
    loadAttendance();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`event-${event.id}-attendance`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'event_attendance',
        filter: `event_id=eq.${event.id}`
      }, () => {
        loadAttendance();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event.id]);

  const loadAttendance = async () => {
    const { data, error } = await supabase
      .from('event_attendance')
      .select('status, user_id')
      .eq('event_id', event.id);

    if (!error && data) {
      const counts = {
        confirmed: 0,
        maybe: 0,
        declined: 0,
        pending: 0
      };

      data.forEach(record => {
        counts[record.status as keyof typeof counts]++;
        if (record.user_id === userId) {
          setUserStatus(record.status as any);
        }
      });

      setAttendance(counts);
    }
  };

  const updateStatus = async (newStatus: typeof userStatus) => {
    setIsUpdating(true);

    const { error } = await supabase
      .from('event_attendance')
      .upsert({
        event_id: event.id,
        user_id: userId,
        status: newStatus,
        updated_at: new Date().toISOString()
      });

    if (!error) {
      setUserStatus(newStatus);
      
      // Optimistic update
      setAttendance(prev => ({
        ...prev,
        [userStatus]: Math.max(0, prev[userStatus] - 1),
        [newStatus]: prev[newStatus] + 1
      }));
    }

    setIsUpdating(false);
  };

  const total = attendance.confirmed + attendance.maybe;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 dark:text-white">
          Live Attendance
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {total}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            attending
          </span>
        </div>
      </div>

      {/* Attendance Breakdown */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {attendance.confirmed}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Going</div>
        </div>
        <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
          <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
            {attendance.maybe}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Maybe</div>
        </div>
        <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
          <div className="text-lg font-bold text-red-600 dark:text-red-400">
            {attendance.declined}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Can't Go</div>
        </div>
      </div>

      {/* User's RSVP */}
      <div className="border-t pt-3">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Your RSVP:</p>
        <div className="flex gap-2">
          <button
            onClick={() => updateStatus('confirmed')}
            disabled={isUpdating}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              userStatus === 'confirmed'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            } disabled:opacity-50`}
          >
            Going
          </button>
          <button
            onClick={() => updateStatus('maybe')}
            disabled={isUpdating}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              userStatus === 'maybe'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            } disabled:opacity-50`}
          >
            Maybe
          </button>
          <button
            onClick={() => updateStatus('declined')}
            disabled={isUpdating}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              userStatus === 'declined'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            } disabled:opacity-50`}
          >
            Can't Go
          </button>
        </div>
      </div>

      {/* Live Updates Animation */}
      <div className="mt-3 flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Live updates enabled
        </span>
      </div>
    </div>
  );
}

// ===== WeatherSmartSuggestions.tsx =====
interface WeatherSmartSuggestionsProps {
  event: DBEvent;
  onSuggestion: (suggestion: string) => void;
}

export function WeatherSmartSuggestions({ event, onSuggestion }: WeatherSmartSuggestionsProps) {
  const [weather, setWeather] = useState<any>(null);
  const [suggestion, setSuggestion] = useState<string>('');

  useEffect(() => {
    // This would integrate with a weather API
    // For demo, using mock data
    const mockWeather = {
      date: new Date(event.start_time),
      condition: 'rainy',
      temperature: 65,
      precipitation: 80
    };

    setWeather(mockWeather);

    // Generate smart suggestions
    if (mockWeather.condition === 'rainy' && event.location?.toLowerCase().includes('park')) {
      setSuggestion('☔ Rain expected! Consider moving to an indoor venue or rescheduling.');
    } else if (mockWeather.temperature > 90 && event.event_type === 'sports') {
      setSuggestion('🌡️ High temperature warning! Remember to bring water and sunscreen.');
    } else if (mockWeather.condition === 'sunny' && event.event_type === 'meeting') {
      setSuggestion('☀️ Beautiful weather! Consider having this meeting outdoors?');
    }
  }, [event]);

  if (!suggestion) return null;

  return (
    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🌤️</span>
        <div className="flex-1">
          <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
            Weather Alert
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
            {suggestion}
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onSuggestion('reschedule')}
              className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Reschedule
            </button>
            <button
              onClick={() => onSuggestion('change-venue')}
              className="text-xs px-3 py-1 bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Change Venue
            </button>
            <button
              onClick={() => onSuggestion('dismiss')}
              className="text-xs px-3 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== PomodoroTimer.tsx (Full Implementation) =====
interface PomodoroTimerProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function PomodoroTimer({ open, onClose, onComplete }: PomodoroTimerProps) {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [cycles, setCycles] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && (minutes > 0 || seconds > 0)) {
      interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            // Timer complete
            handleComplete();
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, minutes, seconds]);

  const handleComplete = () => {
    setIsActive(false);
    
    if (isBreak) {
      // Break is over, start new work session
      setMinutes(25);
      setSeconds(0);
      setIsBreak(false);
      setCycles(cycles + 1);
    } else {
      // Work session complete, start break
      const breakTime = cycles % 4 === 3 ? 15 : 5; // Long break every 4 cycles
      setMinutes(breakTime);
      setSeconds(0);
      setIsBreak(true);
    }

    // Play notification sound
    const audio = new Audio('/notification.mp3');
    audio.play().catch(() => {});
    
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(isBreak ? 'Break time is over!' : 'Time for a break!', {
        body: isBreak ? 'Ready to focus again?' : 'Great work! Take a short break.',
        icon: '/icon.png'
      });
    }

    if (onComplete) onComplete();
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setMinutes(25);
    setSeconds(0);
    setIsBreak(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          ✕
        </button>

        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">
            🍅 Pomodoro Timer
          </h2>
          
          <div className="mb-6">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              isBreak 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}>
              {isBreak ? '☕ Break Time' : '💪 Focus Time'}
            </span>
          </div>

          <div className="text-6xl font-bold text-gray-800 dark:text-white mb-8">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>

          <div className="flex gap-3 justify-center mb-6">
            <button
              onClick={toggleTimer}
              className={`px-6 py-3 rounded-lg font-medium text-white transform hover:scale-105 active:scale-95 transition-all ${
                isActive 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {isActive ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={resetTimer}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg
                       hover:bg-gray-300 dark:hover:bg-gray-600 transform hover:scale-105 active:scale-95 transition-all"
            >
              Reset
            </button>
          </div>

          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Cycles completed:</span>
            <span className="font-bold text-purple-600 dark:text-purple-400">{cycles}</span>
          </div>

          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Work: 25 min • Short break: 5 min • Long break: 15 min (every 4 cycles)
          </div>
        </div>
      </div>
    </div>
  );
}
