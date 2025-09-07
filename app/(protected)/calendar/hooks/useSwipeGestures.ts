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

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.changedTouches[0].screenX;
      touchStartY.current = e.changedTouches[0].screenY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX.current = e.changedTouches[0].screenX;
      touchEndY.current = e.changedTouches[0].screenY;
      handleSwipe();
    };

    const handleSwipe = () => {
      const deltaX = touchEndX.current - touchStartX.current;
      const deltaY = touchEndY.current - touchStartY.current;
      const minSwipeDistance = 50;

      // Horizontal swipes
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          handlers.onSwipeRight?.();
        } else {
          handlers.onSwipeLeft?.();
        }
      }
      // Vertical swipes
      else if (Math.abs(deltaY) > minSwipeDistance) {
        if (deltaY > 0) {
          handlers.onSwipeDown?.();
        } else {
          handlers.onSwipeUp?.();
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handlers]);

  return {
    onTouchStart: () => {},
    onTouchEnd: () => {}
  };
}

// ============================================
// app/(protected)/calendar/hooks/useVoiceCommands.ts
import { useState, useCallback, useRef } from 'react';

interface UseVoiceCommandsProps {
  onCommand: (command: string) => void;
}

export function useVoiceCommands({ onCommand }: UseVoiceCommandsProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('Voice command received:', transcript);
        onCommand(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setIsListening(false);
    }
  }, [onCommand]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  return { isListening, startListening, stopListening };
}

// ============================================
// app/(protected)/calendar/hooks/useGameification.ts
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import confetti from 'canvas-confetti';

interface UserStats {
  level: number;
  points: number;
  streak: number;
  lastAchievement?: string;
  achievements: string[];
}

export function useGameification(userId: string | null) {
  const [userStats, setUserStats] = useState<UserStats>({
    level: 1,
    points: 0,
    streak: 0,
    achievements: []
  });

  // Load user stats from localStorage or database
  useEffect(() => {
    if (!userId) return;
    
    // Load from localStorage for now (you can switch to Supabase later)
    const savedStats = localStorage.getItem(`userStats_${userId}`);
    if (savedStats) {
      setUserStats(JSON.parse(savedStats));
    }
  }, [userId]);

  // Save stats whenever they change
  useEffect(() => {
    if (userId && userStats.points > 0) {
      localStorage.setItem(`userStats_${userId}`, JSON.stringify(userStats));
    }
  }, [userId, userStats]);

  const addPoints = useCallback((points: number, action: string) => {
    setUserStats(prev => {
      const newPoints = prev.points + points;
      const newLevel = Math.floor(newPoints / 100) + 1;
      
      // Check for level up
      if (newLevel > prev.level) {
        showConfetti();
        return {
          ...prev,
          points: newPoints,
          level: newLevel,
          lastAchievement: `Level ${newLevel} reached!`
        };
      }
      
      return { ...prev, points: newPoints };
    });
  }, []);

  const checkAchievements = useCallback((action: string) => {
    // Check for specific achievements
    const achievements: { [key: string]: string } = {
      'first-event': 'First Event Created!',
      'streak-7': 'Week Streak!',
      'streak-30': 'Month Streak!',
      'carpool-hero': 'Carpool Hero!',
      'productivity-master': 'Productivity Master!'
    };

    if (achievements[action]) {
      setUserStats(prev => ({
        ...prev,
        lastAchievement: achievements[action],
        achievements: [...prev.achievements, action]
      }));
      showConfetti();
    }
  }, []);

  const showConfetti = useCallback(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B']
    });
  }, []);

  return {
    userStats,
    addPoints,
    checkAchievements,
    showConfetti
  };
}

// ============================================
// app/(protected)/calendar/hooks/useNotifications.ts
import { useEffect, useCallback, useRef } from 'react';
import type { TodoReminder } from '../types';
import type { DBEvent } from '@/lib/types';

export function useNotifications(
  reminders: TodoReminder[],
  todos: TodoReminder[],
  events: DBEvent[],
  showToast: (toast: any) => void
) {
  const notifiedItems = useRef<Set<string>>(new Set());

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }, []);

  const sendNotification = useCallback((title: string, body: string, icon?: string) => {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: icon || '/icon-192x192.png',
        badge: '/icon-192x192.png',
        vibrate: [200, 100, 200],
        tag: 'calendar-notification',
        requireInteraction: false
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    }
  }, []);

  // Check for upcoming reminders and events
  useEffect(() => {
    const checkUpcoming = () => {
      const now = new Date();
      const in10Minutes = new Date(now.getTime() + 10 * 60000);

      // Check reminders
      reminders.forEach(reminder => {
        if (!reminder.completed && !notifiedItems.current.has(reminder.id)) {
          const reminderTime = new Date(reminder.date);
          if (reminderTime > now && reminderTime <= in10Minutes) {
            sendNotification(
              '⏰ Reminder',
              reminder.title,
              '/icon-192x192.png'
            );
            notifiedItems.current.add(reminder.id);
          }
        }
      });

      // Check events
      events.forEach(event => {
        if (!notifiedItems.current.has(event.id)) {
          const eventTime = new Date(event.start_time);
          if (eventTime > now && eventTime <= in10Minutes) {
            sendNotification(
              '📅 Upcoming Event',
              event.title,
              '/icon-192x192.png'
            );
            notifiedItems.current.add(event.id);
          }
        }
      });
    };

    // Request permission on mount
    requestPermission();

    // Check immediately and then every minute
    checkUpcoming();
    const interval = setInterval(checkUpcoming, 60000);

    return () => clearInterval(interval);
  }, [reminders, todos, events, sendNotification, requestPermission]);

  return { requestPermission, sendNotification };
}

// ============================================
// app/(protected)/calendar/hooks/useCarpoolMatches.ts
import { useState, useEffect, useMemo } from 'react';
import type { DBEvent } from '@/lib/types';
import type { Friend, CarpoolMatch } from '../types';

interface UseCarpoolMatchesProps {
  userId: string | null;
  events: DBEvent[];
  friends: Friend[];
}

export function useCarpoolMatches({ userId, events, friends }: UseCarpoolMatchesProps) {
  const [carpoolMatches, setCarpoolMatches] = useState<CarpoolMatch[]>([]);
  const [suggestedCarpools, setSuggestedCarpools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Find matching events between friends
  useEffect(() => {
    if (!userId || events.length === 0 || friends.length === 0) return;

    const matches: CarpoolMatch[] = [];
    
    // Simple matching logic - find events at same time/location
    events.forEach(event => {
      if (event.location && event.start_time) {
        // This would normally check friend's events too
        // For now, create mock matches for demo
        const randomFriends = friends.slice(0, Math.floor(Math.random() * 3) + 1);
        
        if (Math.random() > 0.7) { // 30% chance of carpool match
          matches.push({
            eventId: event.id,
            eventTitle: event.title,
            eventTime: event.start_time,
            eventLocation: event.location || '',
            matchingFriends: randomFriends.map(f => ({
              friendId: f.friend_id,
              friendName: f.name,
              distance: Math.floor(Math.random() * 10) + 1
            })),
            potentialSavings: Math.floor(Math.random() * 20) + 5,
            co2Saved: Math.floor(Math.random() * 10) + 2
          });
        }
      }
    });

    setCarpoolMatches(matches);
  }, [userId, events, friends]);

  const createCarpoolGroup = async (matchId: string) => {
    // Implementation for creating carpool group
    console.log('Creating carpool group for match:', matchId);
  };

  const sendCarpoolInvite = async (friendId: string, eventId: string) => {
    // Implementation for sending invite
    console.log('Sending carpool invite to:', friendId);
  };

  const calculateImpact = (matches: CarpoolMatch[]) => {
    const totalSavings = matches.reduce((sum, m) => sum + (m.potentialSavings || 0), 0);
    const totalCO2 = matches.reduce((sum, m) => sum + (m.co2Saved || 0), 0);
    return { totalSavings, totalCO2 };
  };

  return {
    carpoolMatches,
    suggestedCarpools,
    loading,
    createCarpoolGroup,
    sendCarpoolInvite,
    calculateImpact
  };
}
