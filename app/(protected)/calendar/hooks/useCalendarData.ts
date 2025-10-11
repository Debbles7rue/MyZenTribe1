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
      
      // Load friends with carpool info
      const { data: friendshipsData } = await supabase
        .from('friendships')
        .select(`
          friend_id,
          safe_to_carpool,
          friend:profiles!friendships_friend_id_fkey(id, full_name, avatar_url)
        `)
        .eq('user_id', me)
        .eq('status', 'accepted');
      
      if (friendshipsData && Array.isArray(friendshipsData)) {
        setFriends(friendshipsData.map((f: any) => ({
          friend_id: f.friend_id,
          name: f.friend?.full_name || 'Friend',
          avatar: f.friend?.avatar_url || null,
          safe_to_carpool: f.safe_to_carpool || false,
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

  // FIXED: Load feed data WITH user's RSVP status
  const loadFeed = useCallback(async () => {
    if (!me) return;
    
    try {
      // Load public/friends events with RSVP counts and user's status
      const { data: feedData, error } = await supabase
        .from('events')
        .select(`
          *,
          going_count:event_rsvps!event_rsvps_event_id_fkey(count),
          interested_count:event_rsvps!event_rsvps_event_id_fkey(count),
          user_rsvp:event_rsvps!event_rsvps_event_id_fkey(status)
        `)
        .neq('created_by', me)
        .in('visibility', ['public', 'friends'])
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(50);
      
      if (error) {
        console.error('Error loading feed:', error);
        setFeed([]);
        return;
      }

      if (feedData && Array.isArray(feedData)) {
        // Process the data to get proper counts and user status
        const processedFeed = await Promise.all(
          feedData.map(async (event: any) => {
            // Get accurate counts
            const { data: rsvps } = await supabase
              .from('event_rsvps')
              .select('status, user_id')
              .eq('event_id', event.id);

            const goingCount = rsvps?.filter(r => r.status === 'going').length || 0;
            const interestedCount = rsvps?.filter(r => r.status === 'interested').length || 0;
            const userRsvp = rsvps?.find(r => r.user_id === me);

            return {
              ...event,
              going_count: goingCount,
              interested_count: interestedCount,
              user_rsvp_status: userRsvp?.status || null,
              user_going: userRsvp?.status === 'going',
              user_interested: userRsvp?.status === 'interested',
              _dismissed: false
            };
          })
        );

        setFeed(processedFeed);
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

  // Set up real-time subscription for feed updates
  useEffect(() => {
    if (!me) return;

    const channel = supabase
      .channel('feed-rsvps')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_rsvps'
        },
        () => {
          // Refresh feed when any RSVP changes
          loadFeed();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [me, loadFeed]);

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
