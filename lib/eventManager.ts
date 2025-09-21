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
  
  // Pre/Post Event fields
  pre_event?: {
    title: string;
    time: string;
    location?: string;
  };
  post_event?: {
    title: string;
    time: string;
    location?: string;
  };
  cover_photo?: string;
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
      source: event.source || (context === 'business' ? 'business' : 'personal'),
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
      
      // Pre/Post Event fields
      pre_event: event.pre_event && event.pre_event.title ? event.pre_event : null,
      post_event: event.post_event && event.post_event.title ? event.post_event : null,
      cover_photo: event.cover_photo || null,
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
    const payload: any = {};
    
    // Only include fields that are being updated
    if ('title' in updates) payload.title = updates.title?.trim();
    if ('description' in updates) payload.description = updates.description?.trim() || null;
    if ('location' in updates) payload.location = updates.location?.trim() || null;
    if ('start' in updates) payload.start_time = new Date(updates.start!).toISOString();
    if ('end' in updates) {
      payload.end_time = updates.end 
        ? new Date(updates.end).toISOString()
        : null;
    }
    if ('visibility' in updates) payload.visibility = updates.visibility;
    if ('event_type' in updates) payload.event_type = updates.event_type || null;
    if ('community_id' in updates) payload.community_id = updates.community_id || null;
    if ('image_path' in updates) payload.image_path = updates.image_path || null;
    if ('source' in updates) payload.source = updates.source;
    
    // Privacy settings
    if ('hide_exact_address' in updates) payload.hide_exact_address = updates.hide_exact_address;
    if ('show_email_only' in updates) payload.show_email_only = updates.show_email_only;
    if ('hide_attendee_count' in updates) payload.hide_attendee_count = updates.hide_attendee_count;
    
    // Additional fields
    if ('capacity' in updates) payload.capacity = updates.capacity || null;
    if ('is_virtual' in updates) payload.is_virtual = updates.is_virtual;
    if ('virtual_link' in updates) payload.virtual_link = updates.virtual_link || null;
    if ('recurring_pattern' in updates) payload.recurring_pattern = updates.recurring_pattern || null;
    if ('tags' in updates) payload.tags = updates.tags || [];
    
    // Pre/Post Event fields
    if ('pre_event' in updates) {
      payload.pre_event = updates.pre_event && updates.pre_event.title ? updates.pre_event : null;
    }
    if ('post_event' in updates) {
      payload.post_event = updates.post_event && updates.post_event.title ? updates.post_event : null;
    }
    if ('cover_photo' in updates) {
      payload.cover_photo = updates.cover_photo || null;
    }
    
    const { data, error } = await supabase
      .from('events')
      .update(payload)
      .eq('id', eventId)
      .eq('created_by', userId)
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
): Promise<{ error?: Error }> {
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('created_by', userId);

    if (error) throw error;

    return {};
  } catch (error) {
    console.error('Delete event error:', error);
    return { error: error as Error };
  }
}

// ============================================
// EVENT LOADING & FETCHING
// ============================================

/**
 * Load calendar events for a user
 */
export async function loadCalendarEvents(
  userId: string,
  mode: 'my-calendar' | 'whats-happening' = 'my-calendar',
  filters?: EventFilters
): Promise<{ events: DBEvent[]; error?: Error }> {
  try {
    let query = supabase.from('events').select('*');

    if (mode === 'my-calendar') {
      query = query.eq('created_by', userId);
    } else {
      query = query.neq('visibility', 'private');
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
    if (filters?.communityId) {
      query = query.eq('community_id', filters.communityId);
    }
    if (filters?.businessId) {
      query = query.eq('business_id', filters.businessId);
    }
    if (filters?.dateRange) {
      query = query
        .gte('start_time', filters.dateRange.from.toISOString())
        .lte('start_time', filters.dateRange.to.toISOString());
    }
    if (filters?.searchTerm) {
      query = query.or(`title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`);
    }

    const { data, error } = await query.order('start_time', { ascending: true });

    if (error) throw error;

    return { events: data || [] };
  } catch (error) {
    console.error('Load calendar events error:', error);
    return { events: [], error: error as Error };
  }
}

/**
 * Load event feed (public events, friends' events, etc.)
 */
export async function loadEventFeed(
  userId: string
): Promise<{ feed: FeedEvent[]; error?: Error }> {
  try {
    // Get public events
    const { data: publicEvents } = await supabase
      .from('events')
      .select('*, profiles!events_created_by_fkey(id, name, avatar_url)')
      .eq('visibility', 'public')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(50);

    // Get friends' events
    const { data: friendIds } = await supabase
      .from('friends')
      .select('friend_id')
      .eq('user_id', userId)
      .eq('status', 'accepted');

    let friendsEvents: any[] = [];
    if (friendIds?.length) {
      const { data } = await supabase
        .from('events')
        .select('*, profiles!events_created_by_fkey(id, name, avatar_url)')
        .in('created_by', friendIds.map(f => f.friend_id))
        .in('visibility', ['public', 'friends'])
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(30);
      
      friendsEvents = data || [];
    }

    // Combine and sort
    const feed = [...(publicEvents || []), ...friendsEvents]
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .map(event => ({
        ...event,
        creator_name: event.profiles?.name,
        creator_avatar: event.profiles?.avatar_url
      }));

    return { feed };
  } catch (error) {
    console.error('Load event feed error:', error);
    return { feed: [], error: error as Error };
  }
}

/**
 * Load events for a specific community
 */
export async function loadCommunityEvents(
  communityId: string
): Promise<{ events: DBEvent[]; error?: Error }> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('community_id', communityId)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    if (error) throw error;

    return { events: data || [] };
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
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('business_id', businessId)
      .eq('source', 'business')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    if (error) throw error;

    return { events: data || [] };
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
  status: 'going' | 'interested'
): Promise<{ error?: Error }> {
  try {
    const { error } = await supabase
      .from('event_rsvps')
      .upsert({
        event_id: eventId,
        user_id: userId,
        status,
        created_at: new Date().toISOString()
      }, { onConflict: 'event_id,user_id' });

    if (error) throw error;

    return {};
  } catch (error) {
    console.error('RSVP error:', error);
    return { error: error as Error };
  }
}

/**
 * Remove RSVP from an event
 */
export async function removeRsvp(
  eventId: string,
  userId: string
): Promise<{ error?: Error }> {
  try {
    const { error } = await supabase
      .from('event_rsvps')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (error) throw error;

    return {};
  } catch (error) {
    console.error('Remove RSVP error:', error);
    return { error: error as Error };
  }
}

/**
 * Get event attendees
 */
export async function getEventAttendees(
  eventId: string
): Promise<{ attendees: any[]; error?: Error }> {
  try {
    const { data, error } = await supabase
      .from('event_rsvps')
      .select('*, profiles(id, name, avatar_url)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { attendees: data || [] };
  } catch (error) {
    console.error('Get attendees error:', error);
    return { attendees: [], error: error as Error };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Calculate event statistics for a user
 */
export async function calculateEventStats(
  userId: string
): Promise<EventStats> {
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const { data: hostedEvents } = await supabase
    .from('events')
    .select('id')
    .eq('created_by', userId);

  const { data: rsvps } = await supabase
    .from('event_rsvps')
    .select('status, events(start_time)')
    .eq('user_id', userId);

  const stats: EventStats = {
    total: hostedEvents?.length || 0,
    hosting: hostedEvents?.length || 0,
    attending: rsvps?.filter(r => r.status === 'going').length || 0,
    interested: rsvps?.filter(r => r.status === 'interested').length || 0,
    thisWeek: 0,
    thisMonth: 0
  };

  // Calculate upcoming events
  rsvps?.forEach(rsvp => {
    const startTime = new Date((rsvp as any).events?.start_time);
    if (startTime <= weekFromNow) stats.thisWeek++;
    if (startTime <= monthFromNow) stats.thisMonth++;
  });

  return stats;
}

/**
 * Format event time for display
 */
export function formatEventTime(event: DBEvent): string {
  const start = new Date(event.start_time);
  const end = event.end_time ? new Date(event.end_time) : null;
  
  const dateOptions: Intl.DateTimeFormatOptions = { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  };
  
  const timeOptions: Intl.DateTimeFormatOptions = { 
    hour: 'numeric', 
    minute: '2-digit' 
  };

  const dateStr = start.toLocaleDateString('en-US', dateOptions);
  const startTimeStr = start.toLocaleTimeString('en-US', timeOptions);
  const endTimeStr = end ? end.toLocaleTimeString('en-US', timeOptions) : '';

  if (end && start.toDateString() === end.toDateString()) {
    return `${dateStr}, ${startTimeStr} - ${endTimeStr}`;
  } else if (end) {
    return `${dateStr} ${startTimeStr} - ${end.toLocaleDateString('en-US', dateOptions)} ${endTimeStr}`;
  } else {
    return `${dateStr}, ${startTimeStr}`;
  }
}

/**
 * Get event color based on type
 */
export function getEventColor(event: DBEvent): string {
  const colorMap: Record<string, string> = {
    'drum_circle': '#8B5CF6',
    'sound_bath': '#3B82F6',
    'qi_gong': '#10B981',
    'yoga': '#F59E0B',
    'zen_tangle': '#EC4899',
    'meditation': '#6366F1',
    'workshop': '#EF4444',
    'default': '#6B7280'
  };

  return colorMap[event.event_type || 'default'] || colorMap.default;
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
): Promise<{ matches: any[]; error?: Error }> {
  try {
    // Get event details
    const { data: event } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (!event) throw new Error('Event not found');

    // Get friends attending
    const { data: friendIds } = await supabase
      .from('friends')
      .select('friend_id')
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (!friendIds?.length) return { matches: [] };

    const { data: friendRsvps } = await supabase
      .from('event_rsvps')
      .select('*, profiles(id, name, avatar_url, location)')
      .eq('event_id', eventId)
      .eq('status', 'going')
      .in('user_id', friendIds.map(f => f.friend_id));

    // Calculate potential matches based on proximity
    // This is a simplified version - you'd want more sophisticated matching
    const matches = friendRsvps?.filter(rsvp => {
      // Add distance calculation logic here
      return true;
    }) || [];

    return { matches };
  } catch (error) {
    console.error('Carpool check error:', error);
    return { matches: [], error: error as Error };
  }
}

/**
 * Format pre/post events for display
 */
export function formatPrePostEvent(event: any) {
  const items = [];
  
  if (event.pre_event) {
    items.push({
      type: 'pre',
      title: event.pre_event.title,
      time: new Date(event.pre_event.time),
      location: event.pre_event.location,
      badge: '🍽️ Pre-Event'
    });
  }
  
  items.push({
    type: 'main',
    title: event.title,
    time: new Date(event.start_time),
    endTime: event.end_time ? new Date(event.end_time) : null,
    location: event.location,
    badge: '📅 Main Event'
  });
  
  if (event.post_event) {
    items.push({
      type: 'post',
      title: event.post_event.title,
      time: new Date(event.post_event.time),
      location: event.post_event.location,
      badge: '🍻 Post-Event'
    });
  }
  
  return items;
}

// ============================================
// EVENT TEMPLATES
// ============================================

export const EVENT_TEMPLATES: Record<string, Partial<EventForm>> = {
  drumCircle: {
    title: 'Community Drum Circle',
    description: 'Join us for a rhythmic journey! All skill levels welcome - bring your own drum or use one of ours.',
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
  formatPrePostEvent,
  EVENT_TEMPLATES,
  EVENT_TYPE_SUGGESTIONS
};
