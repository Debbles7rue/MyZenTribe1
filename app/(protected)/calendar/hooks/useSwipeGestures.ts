// app/(protected)/calendar/hooks/useSwipeGestures.ts
import { useEffect, useRef } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export function useSwipeGestures(handlers: SwipeHandlers) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);
  const isScrolling = useRef(false);

  const minSwipeDistance = 50;
  const maxScrollThreshold = 10;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isScrolling.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;

    // Detect if user is scrolling rather than swiping
    const yDiff = Math.abs(touchEndY.current - touchStartY.current);
    if (yDiff > maxScrollThreshold && !isScrolling.current) {
      isScrolling.current = true;
    }
  };

  const handleTouchEnd = () => {
    if (isScrolling.current) return;

    const xDiff = touchEndX.current - touchStartX.current;
    const yDiff = touchEndY.current - touchStartY.current;
    const absXDiff = Math.abs(xDiff);
    const absYDiff = Math.abs(yDiff);

    // Horizontal swipe
    if (absXDiff > absYDiff && absXDiff > minSwipeDistance) {
      if (xDiff > 0 && handlers.onSwipeRight) {
        handlers.onSwipeRight();
      } else if (xDiff < 0 && handlers.onSwipeLeft) {
        handlers.onSwipeLeft();
      }
    }
    // Vertical swipe
    else if (absYDiff > minSwipeDistance) {
      if (yDiff > 0 && handlers.onSwipeDown) {
        handlers.onSwipeDown();
      } else if (yDiff < 0 && handlers.onSwipeUp) {
        handlers.onSwipeUp();
      }
    }
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}

// ===== useVoiceCommands.ts =====
import { useState, useCallback, useRef } from 'react';

interface VoiceCommandOptions {
  onCommand: (command: string) => void;
  language?: string;
}

export function useVoiceCommands({ onCommand, language = 'en-US' }: VoiceCommandOptions) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    
    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language;

      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        setTranscript(transcript);

        if (event.results[current].isFinal) {
          onCommand(transcript);
          setTimeout(() => setTranscript(''), 2000);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  }, [isListening, language, onCommand]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
  };
}

// ===== useGameification.ts =====
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface UserStats {
  points: number;
  streak: number;
  level: number;
  achievements: string[];
  lastAchievement?: string;
  todayCompleted: number;
  weeklyGoal: number;
  karma: number;
}

export function useGameification(userId: string | null) {
  const [userStats, setUserStats] = useState<UserStats>({
    points: 0,
    streak: 0,
    level: 1,
    achievements: [],
    todayCompleted: 0,
    weeklyGoal: 20,
    karma: 0,
  });

  const [showConfettiState, setShowConfettiState] = useState(false);

  // Load user stats
  useEffect(() => {
    if (!userId) return;

    const loadStats = async () => {
      const { data } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (data) {
        setUserStats(data);
      }
    };

    loadStats();
  }, [userId]);

  const addPoints = useCallback(async (points: number, action: string) => {
    if (!userId) return;

    const newPoints = userStats.points + points;
    const newLevel = Math.floor(newPoints / 100) + 1;
    
    setUserStats(prev => ({
      ...prev,
      points: newPoints,
      level: newLevel,
    }));

    // Check for achievements
    checkAchievements(action, newPoints);

    // Save to database
    await supabase
      .from('user_stats')
      .upsert({
        user_id: userId,
        points: newPoints,
        level: newLevel,
        updated_at: new Date().toISOString(),
      });
  }, [userId, userStats.points]);

  const checkAchievements = useCallback((action: string, points: number) => {
    const achievements = [];

    if (points >= 100 && !userStats.achievements.includes('century')) {
      achievements.push('Century Club - 100 points!');
      setUserStats(prev => ({
        ...prev,
        achievements: [...prev.achievements, 'century'],
        lastAchievement: 'Century Club - 100 points!',
      }));
    }

    if (userStats.streak >= 7 && !userStats.achievements.includes('week_streak')) {
      achievements.push('Week Warrior - 7 day streak!');
      setUserStats(prev => ({
        ...prev,
        achievements: [...prev.achievements, 'week_streak'],
        lastAchievement: 'Week Warrior - 7 day streak!',
      }));
    }

    if (action === 'carpool-create' && !userStats.achievements.includes('eco_warrior')) {
      achievements.push('Eco Warrior - First carpool!');
      setUserStats(prev => ({
        ...prev,
        achievements: [...prev.achievements, 'eco_warrior'],
        lastAchievement: 'Eco Warrior - First carpool!',
        karma: prev.karma + 50,
      }));
    }

    if (achievements.length > 0) {
      setShowConfettiState(true);
      setTimeout(() => setShowConfettiState(false), 5000);
    }
  }, [userStats]);

  const showConfetti = useCallback(() => {
    setShowConfettiState(true);
    
    // Create confetti effect
    if (typeof window !== 'undefined') {
      const confettiCount = 100;
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '9999';
      document.body.appendChild(container);

      for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'absolute';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'][Math.floor(Math.random() * 6)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-10px';
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        confetti.style.animation = `confetti-fall ${2 + Math.random() * 2}s ease-out`;
        container.appendChild(confetti);
      }

      // Add CSS animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes confetti-fall {
          to {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);

      setTimeout(() => {
        document.body.removeChild(container);
        document.head.removeChild(style);
        setShowConfettiState(false);
      }, 4000);
    }
  }, []);

  return {
    userStats,
    checkAchievements,
    addPoints,
    showConfetti,
  };
}

// ===== useNotifications.ts =====
import { useEffect, useRef } from 'react';

export function useNotifications(
  reminders: any[],
  todos: any[],
  events: any[],
  showToast: (toast: any) => void
) {
  const notifiedItems = useRef(new Set<string>());

  useEffect(() => {
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const checkNotifications = () => {
      const now = new Date();
      const upcoming = [];

      // Check reminders
      reminders.forEach(reminder => {
        if (reminder.start_time && !reminder.completed) {
          const reminderTime = new Date(reminder.start_time);
          const timeDiff = reminderTime.getTime() - now.getTime();
          const minutesDiff = Math.floor(timeDiff / 60000);

          if (minutesDiff > 0 && minutesDiff <= 10) {
            const key = `reminder-${reminder.id}-${reminderTime.getTime()}`;
            if (!notifiedItems.current.has(key)) {
              upcoming.push({
                title: reminder.title,
                minutes: minutesDiff,
                type: 'reminder',
              });
              notifiedItems.current.add(key);
            }
          }
        }
      });

      // Check events
      events.forEach(event => {
        const eventTime = new Date(event.start_time);
        const timeDiff = eventTime.getTime() - now.getTime();
        const minutesDiff = Math.floor(timeDiff / 60000);

        if (minutesDiff > 0 && minutesDiff <= 15) {
          const key = `event-${event.id}-${eventTime.getTime()}`;
          if (!notifiedItems.current.has(key)) {
            upcoming.push({
              title: event.title,
              minutes: minutesDiff,
              type: 'event',
            });
            notifiedItems.current.add(key);
          }
        }
      });

      // Show notifications
      upcoming.forEach(item => {
        const icon = item.type === 'reminder' ? '⏰' : '📅';
        const message = `${icon} ${item.title} in ${item.minutes} minutes!`;
        
        showToast({
          type: 'info',
          message,
          duration: 5000,
        });

        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(item.type === 'reminder' ? 'Reminder' : 'Event Starting Soon', {
            body: `${item.title} in ${item.minutes} minutes`,
            icon: '/icon.png',
            tag: `${item.type}-${Date.now()}`,
            requireInteraction: false,
          });
        }
      });
    };

    // Check every 30 seconds
    const interval = setInterval(checkNotifications, 30000);
    checkNotifications(); // Initial check

    return () => clearInterval(interval);
  }, [reminders, todos, events, showToast]);
}

// ===== useCarpoolMatches.ts =====
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useCarpoolMatches(userId: string | null, friends: any[], events: any[]) {
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    if (!userId || friends.length === 0) return;

    const findMatches = () => {
      const carpoolFriends = friends.filter(f => f.safe_to_carpool);
      if (carpoolFriends.length === 0) return;

      const potentialMatches: any[] = [];

      events.forEach(event => {
        // Find friends attending the same event
        const attendingFriends = carpoolFriends.filter(friend => {
          return events.some(e => 
            e.created_by === friend.friend_id &&
            e.title === event.title &&
            Math.abs(new Date(e.start_time).getTime() - new Date(event.start_time).getTime()) < 3600000 && // Within 1 hour
            e.location === event.location
          );
        });

        if (attendingFriends.length > 0) {
          potentialMatches.push({
            event,
            friends: attendingFriends,
            savings: calculateCarpoolSavings(attendingFriends.length + 1),
          });
        }
      });

      setMatches(potentialMatches);
    };

    findMatches();
  }, [userId, friends, events]);

  const calculateCarpoolSavings = (peopleCount: number) => {
    const avgGasPrice = 3.50; // $ per gallon
    const avgMpg = 25;
    const avgDistance = 10; // miles
    
    const individualCost = (avgDistance / avgMpg) * avgGasPrice;
    const sharedCost = individualCost / peopleCount;
    const savings = individualCost - sharedCost;
    
    return {
      amount: savings.toFixed(2),
      co2Saved: (peopleCount - 1) * 8.89, // kg CO2 per gallon
    };
  };

  return matches;
}
