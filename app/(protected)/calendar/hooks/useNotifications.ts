// app/(protected)/calendar/hooks/useNotifications.ts

import { useEffect, useRef } from 'react';
import type { TodoReminder } from '../types';
import type { DBEvent } from '@/lib/types';

interface UseNotificationsProps {
  reminders: TodoReminder[];
  todos: TodoReminder[];
  events: DBEvent[];
  showToast: (toast: any) => void;
}

export function useNotifications(
  reminders: TodoReminder[], 
  todos: TodoReminder[], 
  events: DBEvent[],
  showToast: (toast: any) => void
) {
  const notifiedItems = useRef<Set<string>>(new Set());
  const checkInterval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Check for upcoming items every minute
    const checkUpcoming = () => {
      const now = new Date();
      const in10Minutes = new Date(now.getTime() + 10 * 60000);
      const in30Minutes = new Date(now.getTime() + 30 * 60000);

      // Check reminders
      reminders.forEach(reminder => {
        if (reminder.completed || notifiedItems.current.has(reminder.id)) return;
        
        const reminderTime = new Date(reminder.date);
        if (reminderTime > now && reminderTime <= in10Minutes) {
          notifyItem('reminder', reminder.title, '10 minutes');
          notifiedItems.current.add(reminder.id);
        }
      });

      // Check todos
      todos.forEach(todo => {
        if (todo.completed || notifiedItems.current.has(todo.id)) return;
        
        const todoTime = new Date(todo.date);
        if (todoTime > now && todoTime <= in30Minutes) {
          notifyItem('todo', todo.title, '30 minutes');
          notifiedItems.current.add(todo.id);
        }
      });

      // Check events
      events.forEach(event => {
        if (notifiedItems.current.has(event.id)) return;
        
        const eventTime = new Date(event.start_time);
        if (eventTime > now && eventTime <= in10Minutes) {
          notifyItem('event', event.title, '10 minutes');
          notifiedItems.current.add(event.id);
        }
      });
    };

    // Initial check
    checkUpcoming();

    // Set up interval
    checkInterval.current = setInterval(checkUpcoming, 60000); // Check every minute

    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
    };
  }, [reminders, todos, events, showToast]);

  const notifyItem = (type: string, title: string, timeString: string) => {
    const icon = type === 'reminder' ? '🔔' : type === 'todo' ? '✅' : '📅';
    const message = `${icon} ${title} - ${timeString}`;

    // Show toast
    showToast({
      type: 'info',
      message,
      duration: 5000
    });

    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`${type.charAt(0).toUpperCase()}${type.slice(1)} Alert`, {
        body: `${title} - coming up in ${timeString}`,
        icon: '/icon-192x192.png',
        tag: `notification-${type}-${title}`,
        requireInteraction: false
      });
    }

    // Vibrate on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  };

  // Clean up old notifications
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = new Date();
      const pastIds = new Set<string>();

      [...reminders, ...todos].forEach(item => {
        if (new Date(item.date) < now) {
          pastIds.add(item.id);
        }
      });

      events.forEach(event => {
        if (new Date(event.start_time) < now) {
          pastIds.add(event.id);
        }
      });

      // Remove past items from notified set
      pastIds.forEach(id => notifiedItems.current.delete(id));
    }, 3600000); // Clean up every hour

    return () => clearInterval(cleanup);
  }, [reminders, todos, events]);
}
