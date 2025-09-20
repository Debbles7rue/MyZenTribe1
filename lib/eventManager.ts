// lib/eventManager.ts
// Centralized Event Management System for MyZenTribe
// Consolidates all event-related logic for easier control and debugging

import { supabase } from '@/lib/supabaseClient';
import type { DBEvent, Visibility } from '@/lib/types';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface EventForm {
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
  visibility: Visibility;
  event_type: string;
  community_id: string;
  source: 'personal' | 'business';
  image_path: string;
  
  // Privacy settings
  hide_exact_address?: boolean;
  show_email_only?: boolean;
  hide_attendee_count?: boolean;
  
  // Additional fields
  capacity?: number;
  is_virtual?: boolean;
  virtual_link?: string;
  recurring_pattern?: string;
  tags?: string[];
}

export interface FeedEvent extends DBEvent {
  _eventSource?: 'business' | 'community' | 'friend_invite';
  _userRelation?: 'following' | 'member' | 'invited';
  _dismissed?: boolean;
  creator_name?: string;
  creator_avatar?: string;
  rsvp_count?: number;
  interested_count?: number;
}

export interface EventFilters {
  visibility?: Visibility[];
  eventType?: string[];
  source?: ('personal' | 'business')[];
  dateRange?: { from: Date; to: Date };
  searchTerm?: string;
  communityId?: string;
  businessId?: string;
}

export interface EventStats {
  total: number;
  hosting: number;
  attending: number;
  interested: number;
  thisWeek: number;
  thisMonth: number;
}

// ============================================
// EVENT CREATION & MANAGEMENT
// ============================================

/**
 * Create a new event
 * Can be called from calendar, business dashboard, or community pages
 */
export async function createEvent(
  event: Partial<EventForm>, 
  userId: string,
  context: 'calendar' | 'business' | 'community' = 'calendar'
): Promise<{ data?: DBEvent; error?: Error }> {
  try {
    if (!event.title || !event.start) {
      throw new Error('Event title and start time are required');
    }

    const payload: any = {
      title: event.title.trim(),
      description: event.description?.trim() || null,
      location: event.location?.trim() || null,
      start_time: new Date(event.start).toISOString(),
      end_time: event.end 
        ? new Date(event.end).toISOString() 
        : new Date(new Date(event.start).getTime() + 60 * 60 * 1000).toISOString(),
      visibility: event.visibility || 'public',
      created_by: userId,
      event_type: event.event_type || null,
      rsvp_public: event.visibility !== 'private',
      community_id: event.community_id || null,
      image_path: event.image_path || null,
      source: event.source || context === 'business' ? 'business' : 'personal',
      status: 'scheduled',
      
      // Privacy settings
      hide_exact_address: event.hide_exact_address || false,
      show_email_only: event.show_email_only || false,
      hide_attendee_count: event.hide_attendee_count || false,
      
      // Additional fields
      capacity: event.capacity || null,
      is_virtual: event.is_virtual || false,
      virtual_link: event.virtual_link || null,
      recurring_pattern: event.recurring_pattern || null,
      tags: event.tags || [],
    };

    const { data, error } = await supabase
      .from('events')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return { data };
  } catch (error) {
    console.error('Create event error:', error);
    return { error: error as Error };
  }
}

/**
 * Update an existing event
 */
export async function updateEvent(
  eventId: string,
  updates: Partial<EventForm>,
  userId: string
): Promise<{ data?: DBEvent; error?: Error }> {
  try {
    // First check if user owns the event
    const { data: existingEvent } = await supabase
      .from('events')
      .select('created_by')
      .eq('id', eventId)
      .single();

    if (!existingEvent || existingEvent.created_by !== userId) {
      throw new Error('You do not have permission to edit this event');
    }

    const payload: any = {};
    
    // Only include fields that are being updated
    if (updates.title !== undefined) payload.title = updates.title.trim();
    if (updates.description !== undefined) payload.description = updates.description?.trim() || null;
    if (updates.location !== undefined) payload.location = updates.location?.trim() || null;
    if (updates.start !== undefined) payload.start_time = new Date(updates.start).toISOString();
    if (updates.end !== undefined) payload.end_time = new Date(updates.end).toISOString();
    if (updates.visibility !== undefined) payload.visibility = updates.visibility;
    if (updates.event_type !== undefined) payload.event_type = updates.event_type;
    if (updates.community_id !== undefined) payload.community_id = updates.community_id;
    if (updates.image_path !== undefined) payload.image_path = updates.image_path;
    if (updates.hide_exact_address !== undefined) payload.hide_exact_address = updates.hide_exact_address;
    if (updates.show_email_only !== undefined) payload.show_email_only = updates.show_email_only;
    if (updates.hide_attendee_count !== undefined) payload.hide_attendee_count = updates.hide_attendee_count;

    const { data, error } = await supabase
      .from('events')
      .update(payload)
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw error;

    return { data };
  } catch (error) {
    console.error('Update event error:', error);
    return { error: error as Error };
  }
}

/**
 * Delete an event
 */
export async function deleteEvent(
  eventId: string,
  userId: string
): Promise<{ success: boolean; error?: Error }> {
  try {
    // Check ownership
    const { data: event } = await supabase
      .from('events')
      .select('created_by')
      .eq('id', eventId)
      .single();

    if (!event || event.created_by !== userId) {
      throw new Error('You do not have permission to delete this event');
    }

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Delete event error:', error);
    return { success: false, error: error as Error };
  }
}

// ============================================
// EVENT LOADING & QUERIES
// ============================================

/**
 * Load calendar events for a user
 * Includes personal events, RSVPs, and optionally friend/business events
 */
export async function loadCalendarEvents(
  userId: string,
  mode: 'my-calendar' | 'whats-happening' = 'my-calendar',
  filters?: EventFilters
): Promise<{ events: DBEvent[]; error?: Error }> {
  try {
    const from = filters?.dateRange?.from || new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    const to = filters?.dateRange?.to || new Date(new Date().getFullYear(), new Date().getMonth() + 3, 0);

    let query = supabase
      .from('events')
      .select('*')
      .gte('start_time', from.toISOString())
      .lte('start_time', to.toISOString())
      .order('start_time', { ascending: true });

    if (mode === 'my-calendar') {
      // Show only user's events and events they've RSVP'd to
      query = query.or(`created_by.eq.${userId}`);
    } else {
      // What's Happening mode - show public events
      query = query.eq('visibility', 'public');
    }

    // Apply filters
    if (filters?.visibility?.length) {
      query = query.in('visibility', filters.visibility);
    }
    if (filters?.eventType?.length) {
      query = query.in('event_type', filters.eventType);
    }
    if (filters?.source?.length) {
      query = query.in('source', filters.source);
    }
    if (filters?.searchTerm) {
      query = query.or(`title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`);
    }
    if (filters?.communityId) {
      query = query.eq('community_id', filters.communityId);
    }
    if (filters?.businessId) {
      query = query.eq('created_by', filters.businessId);
    }

    const { data: events, error } = await query;

    if (error) throw error;

    // Get RSVP status for all events
    if (events && events.length > 0) {
      const eventIds = events.map(e => e.id);
      const { data: rsvps } = await supabase
        .from('event_attendees')
        .select('event_id, status')
        .eq('user_id', userId)
        .in('event_id', eventIds);

      // Merge RSVP data
      const rsvpMap = new Map(rsvps?.map(r => [r.event_id, r.status]) || []);
      const eventsWithRsvp = events.map(event => ({
        ...event,
        user_rsvp_status: rsvpMap.get(event.id) || null
      }));

      return { events: eventsWithRsvp };
    }

    return { events: events || [] };
  } catch (error) {
    console.error('Load calendar events error:', error);
    return { events: [], error: error as Error };
  }
}

/**
 * Load What's Happening feed
 * Shows events from friends, followed businesses, and joined communities
 */
export async function loadEventFeed(userId: string): Promise<{ 
  feed: FeedEvent[]; 
  error?: Error 
}> {
  try {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    const to = new Date(now.getFullYear(), now.getMonth() + 2, now.getDate());
    
    let allFeedEvents: FeedEvent[] = [];

    // 1. Get friends list
    const { data: friendsData } = await supabase
      .from('friends_view')
      .select('friend_id')
      .limit(500);
    const friendIds = (friendsData || []).map(r => r.friend_id);

    // 2. Get businesses they follow
    const { data: businessData } = await supabase
      .from('business_follows')
      .select('business_id')
      .eq('user_id', userId);
    const businessIds = (businessData || []).map(r => r.business_id);

    // 3. Get communities they're part of
    const { data: communityData } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', userId);
    const communityIds = (communityData || []).map(r => r.community_id);

    // Load business events
    if (businessIds.length > 0) {
      const { data: businessEvents } = await supabase
        .from('events')
        .select(`
          *,
          business:business_profiles!events_created_by_fkey(
            display_name,
            logo_url
          )
        `)
        .in('created_by', businessIds)
        .eq('source', 'business')
        .eq('visibility', 'public')
        .gte('start_time', from.toISOString())
        .lte('start_time', to.toISOString());

      if (businessEvents) {
        allFeedEvents.push(...businessEvents.map(e => ({
          ...e,
          _eventSource: 'business' as const,
          _userRelation: 'following' as const,
          creator_name: e.business?.display_name,
          creator_avatar: e.business?.logo_url
        })));
      }
    }

    // Load friend events
    if (friendIds.length > 0) {
      const { data: friendEvents } = await supabase
        .from('events')
        .select(`
          *,
          creator:profiles!events_created_by_fkey(
            full_name,
            avatar_url
          )
        `)
        .in('created_by', friendIds)
        .in('visibility', ['public', 'friends'])
        .gte('start_time', from.toISOString())
        .lte('start_time', to.toISOString())
        .neq('created_by', userId);

      if (friendEvents) {
        allFeedEvents.push(...friendEvents.map(e => ({
          ...e,
          _eventSource: 'friend_invite' as const,
          _userRelation: 'invited' as const,
          creator_name: e.creator?.full_name,
          creator_avatar: e.creator?.avatar_url
        })));
      }
    }

    // Load community events
    if (communityIds.length > 0) {
      const { data: communityEvents } = await supabase
        .from('events')
        .select(`
          *,
          community:communities!events_community_id_fkey(
            name
          )
        `)
        .in('community_id', communityIds)
        .in('visibility', ['public', 'community'])
        .gte('start_time', from.toISOString())
        .lte('start_time', to.toISOString())
        .neq('created_by', userId);

      if (communityEvents) {
        allFeedEvents.push(...communityEvents.map(e => ({
          ...e,
          _eventSource: 'community' as const,
          _userRelation: 'member' as const
        })));
      }
    }

    // Remove duplicates and sort
    const uniqueEvents = allFeedEvents.filter((event, index, self) => 
      index === self.findIndex(e => e.id === event.id)
    );
    uniqueEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    return { feed: uniqueEvents };
  } catch (error) {
    console.error('Load event feed error:', error);
    return { feed: [], error: error as Error };
  }
}

/**
 * Load events for a specific community
 */
export async function loadCommunityEvents(
  communityId: string,
  includePrivate: boolean = false
): Promise<{ events: DBEvent[]; error?: Error }> {
  try {
    const from = new Date();
    const to = new Date(from.getFullYear(), from.getMonth() + 3, 0);

    let query = supabase
      .from('events')
      .select(`
        *,
        creator:profiles!events_created_by_fkey(
          full_name,
          avatar_url
        )
      `)
      .eq('community_id', communityId)
      .gte('start_time', from.toISOString())
      .lte('start_time', to.toISOString())
      .order('start_time', { ascending: true });

    if (!includePrivate) {
      query = query.in('visibility', ['public', 'community']);
    }

    const { data: events, error } = await query;

    if (error) throw error;

    return { events: events || [] };
  } catch (error) {
    console.error('Load community events error:', error);
    return { events: [], error: error as Error };
  }
}

/**
 * Load events for a specific business
 */
export async function loadBusinessEvents(
  businessId: string
): Promise<{ events: DBEvent[]; error?: Error }> {
  try {
    const from = new Date();
    const to = new Date(from.getFullYear(), from.getMonth() + 3, 0);

    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('created_by', businessId)
      .eq('source', 'business')
      .gte('start_time', from.toISOString())
      .lte('start_time', to.toISOString())
      .order('start_time', { ascending: true });

    if (error) throw error;

    return { events: events || [] };
  } catch (error) {
    console.error('Load business events error:', error);
    return { events: [], error: error as Error };
  }
}

// ============================================
// RSVP & ATTENDANCE MANAGEMENT
// ============================================

/**
 * RSVP to an event
 */
export async function rsvpToEvent(
  eventId: string,
  userId: string,
  status: 'going' | 'interested' | 'maybe' | 'not_going' = 'going'
): Promise<{ success: boolean; error?: Error }> {
  try {
    const { error } = await supabase
      .from('event_attendees')
      .upsert({ 
        event_id: eventId, 
        user_id: userId,
        status: status,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('RSVP error:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Remove RSVP from an event
 */
export async function removeRsvp(
  eventId: string,
  userId: string
): Promise<{ success: boolean; error?: Error }> {
  try {
    const { error } = await supabase
      .from('event_attendees')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Remove RSVP error:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Get event attendees
 */
export async function getEventAttendees(
  eventId: string
): Promise<{ attendees: any[]; error?: Error }> {
  try {
    const { data: attendees, error } = await supabase
      .from('event_attendees')
      .select(`
        user_id,
        status,
        is_co_host,
        carpool_available,
        user:profiles!event_attendees_user_id_fkey(
          full_name,
          avatar_url
        )
      `)
      .eq('event_id', eventId);

    if (error) throw error;

    return { attendees: attendees || [] };
  } catch (error) {
    console.error('Get attendees error:', error);
    return { attendees: [], error: error as Error };
  }
}

// ============================================
// EVENT STATISTICS
// ============================================

/**
 * Calculate event statistics for a user
 */
export async function calculateEventStats(
  userId: string
): Promise<{ stats: EventStats; error?: Error }> {
  try {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Get all relevant events
    const { data: allEvents } = await supabase
      .from('events')
      .select(`
        *,
        event_attendees!left(
          user_id,
          status
        )
      `)
      .or(`created_by.eq.${userId},visibility.eq.public`)
      .gte('start_time', now.toISOString());

    const events = allEvents || [];
    
    // Calculate stats
    const hosting = events.filter(e => e.created_by === userId);
    const attending = events.filter(e => 
      e.event_attendees?.some((a: any) => a.user_id === userId && a.status === 'going')
    );
    const interested = events.filter(e => 
      e.event_attendees?.some((a: any) => a.user_id === userId && a.status === 'interested')
    );

    const stats: EventStats = {
      total: events.length,
      hosting: hosting.length,
      attending: attending.length,
      interested: interested.length,
      thisWeek: events.filter(e => new Date(e.start_time) <= weekFromNow).length,
      thisMonth: events.filter(e => new Date(e.start_time) <= monthFromNow).length,
    };

    return { stats };
  } catch (error) {
    console.error('Calculate stats error:', error);
    return { 
      stats: {
        total: 0,
        hosting: 0,
        attending: 0,
        interested: 0,
        thisWeek: 0,
        thisMonth: 0
      },
      error: error as Error 
    };
  }
}

// ============================================
// EVENT HELPERS
// ============================================

/**
 * Format event date/time for display
 */
export function formatEventTime(start: string, end?: string): string {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;
  
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };
  
  if (!endDate || startDate.toDateString() === endDate.toDateString()) {
    // Same day event
    return startDate.toLocaleDateString('en-US', options);
  } else {
    // Multi-day event
    const startStr = startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    const endStr = endDate.toLocaleDateString('en-US', options);
    return `${startStr} - ${endStr}`;
  }
}

/**
 * Get event color based on type and source
 */
export function getEventColor(event: DBEvent & { user_rsvp_status?: string }): {
  bg: string;
  border: string;
  text: string;
} {
  // Priority: RSVP status > Event type > Source > Default
  
  if (event.user_rsvp_status === 'going') {
    return {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      border: 'border-purple-500',
      text: 'text-purple-800 dark:text-purple-200'
    };
  }
  
  if (event.event_type === 'reminder') {
    return {
      bg: 'bg-red-100 dark:bg-red-900/30',
      border: 'border-red-500',
      text: 'text-red-800 dark:text-red-200'
    };
  }
  
  if (event.event_type === 'todo') {
    return {
      bg: 'bg-green-100 dark:bg-green-900/30',
      border: 'border-green-500',
      text: 'text-green-800 dark:text-green-200'
    };
  }
  
  if (event.source === 'business') {
    return {
      bg: 'bg-gray-900 dark:bg-gray-100',
      border: 'border-gray-900',
      text: 'text-white dark:text-gray-900'
    };
  }
  
  if (event.visibility === 'public') {
    return {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      border: 'border-blue-500',
      text: 'text-blue-800 dark:text-blue-200'
    };
  }
  
  // Default (private events)
  return {
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-400',
    text: 'text-gray-800 dark:text-gray-200'
  };
}

/**
 * Check if user can edit an event
 */
export function canEditEvent(event: DBEvent, userId: string): boolean {
  return event.created_by === userId;
}

/**
 * Check for carpool opportunities
 */
export async function checkCarpoolOpportunities(
  eventId: string,
  userId: string
): Promise<{ hasCarpoolMatch: boolean; carpoolFriends: string[] }> {
  try {
    // Get friends who are also attending and have carpool available
    const { data: attendees } = await supabase
      .from('event_attendees')
      .select(`
        user_id,
        carpool_available,
        user:profiles!event_attendees_user_id_fkey(
          full_name
        )
      `)
      .eq('event_id', eventId)
      .eq('status', 'going')
      .eq('carpool_available', true)
      .neq('user_id', userId);

    const carpoolFriends = (attendees || [])
      .filter(a => a.carpool_available)
      .map(a => a.user?.full_name || 'Friend');

    return {
      hasCarpoolMatch: carpoolFriends.length > 0,
      carpoolFriends
    };
  } catch (error) {
    console.error('Check carpool error:', error);
    return { hasCarpoolMatch: false, carpoolFriends: [] };
  }
}

// ============================================
// EVENT TEMPLATES (for quick creation)
// ============================================

export const EVENT_TEMPLATES = {
  meditation: {
    title: 'Group Meditation',
    description: 'Join us for a peaceful meditation session',
    event_type: 'meditation',
    visibility: 'public' as Visibility,
    tags: ['meditation', 'mindfulness', 'wellness']
  },
  drumCircle: {
    title: 'Drum Circle',
    description: 'Bring your drums and join our rhythmic gathering',
    event_type: 'drum_circle',
    visibility: 'public' as Visibility,
    tags: ['drums', 'music', 'community']
  },
  soundBath: {
    title: 'Sound Bath Healing',
    description: 'Experience deep relaxation with healing sound frequencies',
    event_type: 'sound_bath',
    visibility: 'public' as Visibility,
    tags: ['sound healing', 'relaxation', 'wellness']
  },
  yoga: {
    title: 'Community Yoga',
    description: 'All levels welcome for this gentle yoga practice',
    event_type: 'yoga',
    visibility: 'public' as Visibility,
    tags: ['yoga', 'fitness', 'wellness']
  },
  workshop: {
    title: 'Workshop',
    description: '',
    event_type: 'workshop',
    visibility: 'public' as Visibility,
    tags: ['education', 'learning']
  }
};

// ============================================
// EVENT SEARCH SUGGESTIONS
// ============================================

export const EVENT_TYPE_SUGGESTIONS = [
  'Drum Circle',
  'Sound Bath',
  'Qi Gong',
  'Yoga',
  'Zen Tangle',
  'Meditation',
  'Workshop',
  'Community Gathering',
  'Healing Circle',
  'Art Therapy',
  'Nature Walk',
  'Breathwork',
  'Reiki Share',
  'Book Club',
  'Tea Ceremony'
];

// Export everything for use in components
export default {
  createEvent,
  updateEvent,
  deleteEvent,
  loadCalendarEvents,
  loadEventFeed,
  loadCommunityEvents,
  loadBusinessEvents,
  rsvpToEvent,
  removeRsvp,
  getEventAttendees,
  calculateEventStats,
  formatEventTime,
  getEventColor,
  canEditEvent,
  checkCarpoolOpportunities,
  EVENT_TEMPLATES,
  EVENT_TYPE_SUGGESTIONS
};
