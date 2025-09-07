// app/(protected)/calendar/hooks/useGameification.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import confetti from 'canvas-confetti';

interface UserStats {
  points: number;
  level: number;
  streak: number;
  achievements: string[];
  lastAchievement?: string;
}

export function useGameification(userId: string | null) {
  const [userStats, setUserStats] = useState<UserStats>({
    points: 0,
    level: 1,
    streak: 0,
    achievements: []
  });

  // Load user stats
  useEffect(() => {
    if (!userId) return;

    const loadStats = async () => {
      // This would normally load from database
      // For now, using localStorage as fallback
      const savedStats = localStorage.getItem(`userStats_${userId}`);
      if (savedStats) {
        setUserStats(JSON.parse(savedStats));
      }
    };

    loadStats();
  }, [userId]);

  // Save stats
  const saveStats = useCallback((stats: UserStats) => {
    if (!userId) return;
    localStorage.setItem(`userStats_${userId}`, JSON.stringify(stats));
    setUserStats(stats);
  }, [userId]);

  // Add points
  const addPoints = useCallback((points: number, reason: string) => {
    setUserStats(prev => {
      const newPoints = prev.points + points;
      const newLevel = Math.floor(newPoints / 100) + 1;
      
      const updated = {
        ...prev,
        points: newPoints,
        level: newLevel
      };
      
      // Check for level up
      if (newLevel > prev.level) {
        updated.lastAchievement = `Level ${newLevel} reached!`;
        showConfetti();
      }
      
      saveStats(updated);
      return updated;
    });
  }, [saveStats]);

  // Check achievements
  const checkAchievements = useCallback((action: string, count: number = 1) => {
    const achievements: Record<string, { threshold: number; title: string; points: number }> = {
      'first-event': { threshold: 1, title: 'First Event Created!', points: 50 },
      'event-master': { threshold: 10, title: 'Event Master - 10 events!', points: 100 },
      'todo-warrior': { threshold: 20, title: 'Todo Warrior - 20 tasks completed!', points: 150 },
      'social-butterfly': { threshold: 5, title: 'Social Butterfly - 5 friend events!', points: 75 },
      'carpool-hero': { threshold: 3, title: 'Carpool Hero - 3 carpools organized!', points: 100 },
      'streak-week': { threshold: 7, title: 'Week Streak - 7 days active!', points: 200 },
      'early-bird': { threshold: 5, title: 'Early Bird - 5 morning events!', points: 50 },
      'night-owl': { threshold: 5, title: 'Night Owl - 5 evening events!', points: 50 }
    };

    const achievement = achievements[action];
    if (achievement && count >= achievement.threshold) {
      setUserStats(prev => {
        if (!prev.achievements.includes(achievement.title)) {
          const updated = {
            ...prev,
            achievements: [...prev.achievements, achievement.title],
            points: prev.points + achievement.points,
            lastAchievement: achievement.title
          };
          
          saveStats(updated);
          showConfetti();
          return updated;
        }
        return prev;
      });
    }
  }, [saveStats]);

  // Show confetti animation
  const showConfetti = useCallback(() => {
    if (typeof window !== 'undefined' && confetti) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe']
      });
    }
  }, []);

  // Update streak
  const updateStreak = useCallback(() => {
    const today = new Date().toDateString();
    const lastActive = localStorage.getItem(`lastActive_${userId}`);
    
    if (lastActive !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      
      setUserStats(prev => {
        const newStreak = lastActive === yesterday ? prev.streak + 1 : 1;
        const updated = { ...prev, streak: newStreak };
        
        // Check streak achievements
        if (newStreak === 7) {
          checkAchievements('streak-week', newStreak);
        }
        
        saveStats(updated);
        return updated;
      });
      
      localStorage.setItem(`lastActive_${userId}`, today);
    }
  }, [userId, checkAchievements, saveStats]);

  // Update streak on mount
  useEffect(() => {
    if (userId) {
      updateStreak();
    }
  }, [userId, updateStreak]);

  return {
    userStats,
    addPoints,
    checkAchievements,
    showConfetti,
    updateStreak
  };
}
