// hooks/useEvents.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  loadCalendarEvents, 
  loadEventFeed,
  loadCommunityEvents,
  loadBusinessEvents,
  type DBEvent,
  type FeedEvent,
  type EventFilters 
} from '@/lib/eventManager';

// Hook for calendar events
export function useCalendarEvents(
  userId: string | null,
  mode: 'my-calendar' | 'whats-happening' = 'my-calendar',
  filters?: EventFilters
) {
  const [events, setEvents] = useState<DBEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { events, error } = await loadCalendarEvents(userId, mode, filters);
      if (error) throw error;
      setEvents(events);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [userId, mode, filters]);

  useEffect(() => {
    load();
  }, [load]);

  return { events, loading, error, refresh: load };
}

// Hook for event feed
export function useEventFeed(userId: string | null) {
  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { feed, error } = await loadEventFeed(userId);
      if (error) throw error;
      setFeed(feed);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { feed, loading, error, refresh: load };
}

// Hook for community events
export function useCommunityEvents(communityId: string | null) {
  const [events, setEvents] = useState<DBEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!communityId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { events, error } = await loadCommunityEvents(communityId);
      if (error) throw error;
      setEvents(events);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    load();
  }, [load]);

  return { events, loading, error, refresh: load };
}

// Hook for business events
export function useBusinessEvents(businessId: string | null) {
  const [events, setEvents] = useState<DBEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { events, error } = await loadBusinessEvents(businessId);
      if (error) throw error;
      setEvents(events);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  return { events, loading, error, refresh: load };
}

// Hook for realtime event updates
export function useRealtimeEvents(
  channelName: string = 'events',
  callback?: (payload: any) => void
) {
  useEffect(() => {
    const channel = supabase.channel(channelName)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'events' },
        (payload) => {
          console.log('Event change:', payload);
          callback?.(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, callback]);
}

// Hook for current user
export function useCurrentUser() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      setLoading(false);
    }
    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { userId, loading };
}
