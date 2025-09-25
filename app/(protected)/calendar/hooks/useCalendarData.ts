// app/(protected)/calendar/hooks/useCalendarData.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { DBEvent } from '@/lib/types';
import type { TodoReminder, Friend, FeedEvent, CalendarForm, QuickModalForm } from '../types';

export function useCalendarData() {
  // User state
  const [me, setMe] = useState<string | null>(null);
  
  // Events data - Initialize as empty arrays to prevent undefined errors
  const [events, setEvents] = useState<DBEvent[]>([]);
  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selected items
  const [selected, setSelected] = useState<DBEvent | null>(null);
  const [selectedFeedEvent, setSelectedFeedEvent] = useState<FeedEvent | null>(null);
  const [selectedCarpoolEvent, setSelectedCarpoolEvent] = useState<any>(null);
  const [selectedCarpoolFriends, setSelectedCarpoolFriends] = useState<Set<string>>(new Set());
  
  // Lists - Initialize as empty arrays, never undefined
  const [reminders, setReminders] = useState<TodoReminder[]>([]);
  const [todos, setTodos] = useState<TodoReminder[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  
  // Forms
  const [form, setForm] = useState<CalendarForm>({
    title: '',
    description: '',
    location: '',
    start: '',
    end: '',
    visibility: 'private',
    event_type: '',
    community_id: '',
    source: 'personal',
    image_path: '',
  });
  
  const [quickModalForm, setQuickModalForm] = useState<QuickModalForm>({
    title: '',
    description: '',
    date: '',
    time: '',
    enableNotification: true,
    notificationMinutes: 10
  });

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setMe(user.id);
      }
    };
    loadUser();
  }, []);

  // Load calendar data
  const loadCalendar = useCallback(async () => {
    if (!me) return;
    
    setLoading(true);
    try {
      // Load events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('created_by', me)
        .order('start_time', { ascending: true });
      
      if (eventsData && Array.isArray(eventsData)) {
        setEvents(eventsData);
        
        // Separate reminders and todos - with safety checks
        const remindersList = eventsData.filter(e => e && e.event_type === 'reminder') || [];
        const todosList = eventsData.filter(e => e && e.event_type === 'todo') || [];
        
        setReminders(remindersList.map(r => ({
          id: r.id,
          title: r.title || '',
          description: r.description || '',
          date: r.start_time,
          completed: r.completed || false,
          type: 'reminder' as const
        })));
        
        setTodos(todosList.map(t => ({
          id: t.id,
          title: t.title || '',
          description: t.description || '',
          date: t.start_time,
          completed: t.completed || false,
          type: 'todo' as const
        })));
      } else {
        // If no data, ensure arrays remain empty, not undefined
        setEvents([]);
        setReminders([]);
        setTodos([]);
      }
      
      // Load friends
      const { data: friendsData } = await supabase
        .from('friends')
        .select('*')
        .eq('user_id', me);
      
      if (friendsData && Array.isArray(friendsData)) {
        setFriends(friendsData.map(f => ({
          friend_id: f.friend_id,
          name: f.friend_name || 'Friend',
          avatar: f.friend_avatar || null,
          lastCarpoolDate: null
        })));
      } else {
        setFriends([]);
      }
      
    } catch (error) {
      console.error('Error loading calendar:', error);
      // On error, ensure arrays are still arrays, not undefined
      setEvents([]);
      setReminders([]);
      setTodos([]);
      setFriends([]);
    } finally {
      setLoading(false);
    }
  }, [me]);

  // Load feed data
  const loadFeed = useCallback(async () => {
    if (!me) return;
    
    try {
      // Load community and friend events
      const { data: feedData } = await supabase
        .from('events')
        .select('*')
        .neq('created_by', me)
        .in('visibility', ['public', 'friends'])
        .order('start_time', { ascending: true })
        .limit(20);
      
      if (feedData && Array.isArray(feedData)) {
        setFeed(feedData.map(e => ({
          ...e,
          _dismissed: false
        })));
      } else {
        setFeed([]);
      }
    } catch (error) {
      console.error('Error loading feed:', error);
      setFeed([]);
    }
  }, [me]);

  // Initial load
  useEffect(() => {
    if (me) {
      loadCalendar();
      loadFeed();
    }
  }, [me, loadCalendar, loadFeed]);

  // Reset form
  const resetForm = useCallback(() => {
    setForm({
      title: '',
      description: '',
      location: '',
      start: '',
      end: '',
      visibility: 'private',
      event_type: '',
      community_id: '',
      source: 'personal',
      image_path: '',
    });
  }, []);

  return {
    me,
    events: events || [],  // Always return array
    loading,
    feed: feed || [],  // Always return array
    selected,
    setSelected,
    selectedFeedEvent,
    setSelectedFeedEvent,
    reminders: reminders || [],  // Always return array
    todos: todos || [],  // Always return array
    friends: friends || [],  // Always return array
    selectedCarpoolEvent,
    setSelectedCarpoolEvent,
    selectedCarpoolFriends,
    setSelectedCarpoolFriends,
    form,
    setForm,
    quickModalForm,
    setQuickModalForm,
    loadCalendar,
    loadFeed,
    resetForm
  };
}
