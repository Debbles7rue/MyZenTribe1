// lib/sidebarQueries.ts
// Helper functions for sidebar widget data

import { supabase } from "@/lib/supabaseClient";

/**
 * Get count of pending friend requests for current user
 */
export async function getPendingFriendRequestsCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('friend_requests')
      .select('*', { count: 'exact', head: true })
      .eq('to_user', user.id)
      .eq('status', 'pending');

    if (error) {
      console.error('Error fetching friend requests:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getPendingFriendRequestsCount:', error);
    return 0;
  }
}

/**
 * Get count of unread messages for current user
 */
export async function getUnreadMessagesCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    // Get all threads where user is a participant
    const { data: threads, error: threadsError } = await supabase
      .from('dm_threads')
      .select('id, user_a, user_b')
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

    if (threadsError || !threads || threads.length === 0) {
      return 0;
    }

    // For each thread, get the last message and check if it's unread
    let unreadCount = 0;

    for (const thread of threads) {
      // Get the last message in this thread
      const { data: lastMessage, error: messageError } = await supabase
        .from('dm_messages')
        .select('sender_id')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // If the last message exists and was NOT sent by current user, count it as unread
      // (In a real app, you'd have a 'read_at' field, but this is a simple approximation)
      if (lastMessage && lastMessage.sender_id !== user.id) {
        unreadCount++;
      }
    }

    return unreadCount;
  } catch (error) {
    console.error('Error in getUnreadMessagesCount:', error);
    return 0;
  }
}

/**
 * Get count of upcoming events (this week) for current user
 */
export async function getUpcomingEventsCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get events user created or is attending
    const { data: rsvps } = await supabase
      .from('event_rsvps')
      .select('event_id')
      .eq('user_id', user.id)
      .eq('status', 'going');

    const rsvpEventIds = rsvps?.map(r => r.event_id) || [];

    // Get events - either created by user or they're attending
    const { count, error } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .or(`created_by.eq.${user.id},id.in.(${rsvpEventIds.length > 0 ? rsvpEventIds.join(',') : 'null'})`)
      .gte('start_time', now.toISOString())
      .lte('start_time', weekFromNow.toISOString());

    if (error) {
      console.error('Error fetching upcoming events:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getUpcomingEventsCount:', error);
    return 0;
  }
}

/**
 * Get count of pending event invites for current user
 */
export async function getPendingEventInvitesCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    // Get event invites that haven't been responded to
    const { data: invites, error: invitesError } = await supabase
      .from('event_invites')
      .select('event_id')
      .eq('invitee_user_id', user.id);

    if (invitesError || !invites) {
      return 0;
    }

    // Check which events are still upcoming
    const eventIds = invites.map(inv => inv.event_id).filter(Boolean);
    
    if (eventIds.length === 0) return 0;

    // Check if user has already RSVP'd to these events
    const { data: rsvps } = await supabase
      .from('event_rsvps')
      .select('event_id')
      .eq('user_id', user.id)
      .in('event_id', eventIds);

    const rsvpEventIds = new Set(rsvps?.map(r => r.event_id) || []);

    // Count invites where user hasn't RSVP'd yet and event is in the future
    const { data: futureEvents } = await supabase
      .from('events')
      .select('id')
      .in('id', eventIds)
      .gte('start_time', new Date().toISOString());

    const pendingInvites = futureEvents?.filter(event => !rsvpEventIds.has(event.id)) || [];

    return pendingInvites.length;
  } catch (error) {
    console.error('Error in getPendingEventInvitesCount:', error);
    return 0;
  }
}

/**
 * Get suggested friend connections with mutual friend counts
 */
export interface SuggestedFriend {
  id: string;
  name: string;
  avatar_url?: string;
  mutualFriends: number;
}

export async function getSuggestedConnections(limit: number = 3): Promise<SuggestedFriend[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get user's current friends
    const { data: myFriends } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    const myFriendIds = new Set(myFriends?.map(f => f.friend_id) || []);
    myFriendIds.add(user.id); // Don't suggest self

    // Get pending/sent requests to exclude
    const { data: pendingRequests } = await supabase
      .from('friend_requests')
      .select('to_user, from_user')
      .or(`to_user.eq.${user.id},from_user.eq.${user.id}`)
      .eq('status', 'pending');

    const excludeIds = new Set([...myFriendIds]);
    pendingRequests?.forEach(req => {
      excludeIds.add(req.to_user);
      excludeIds.add(req.from_user);
    });

    // Get friends of friends
    const friendsOfFriends = new Map<string, number>(); // userId -> mutual count

    for (const friendId of myFriendIds) {
      if (friendId === user.id) continue;

      const { data: theirFriends } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', friendId)
        .eq('status', 'accepted');

      theirFriends?.forEach(f => {
        if (!excludeIds.has(f.friend_id)) {
          friendsOfFriends.set(
            f.friend_id, 
            (friendsOfFriends.get(f.friend_id) || 0) + 1
          );
        }
      });
    }

    // Sort by mutual friend count and get top suggestions
    const suggestions = Array.from(friendsOfFriends.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id, mutualCount]) => ({ id, mutualCount }));

    if (suggestions.length === 0) return [];

    // Get profile info for suggestions
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', suggestions.map(s => s.id));

    const suggestedFriends: SuggestedFriend[] = suggestions.map(suggestion => {
      const profile = profiles?.find(p => p.id === suggestion.id);
      return {
        id: suggestion.id,
        name: profile?.full_name || 'Member',
        avatar_url: profile?.avatar_url,
        mutualFriends: suggestion.mutualCount
      };
    });

    return suggestedFriends;
  } catch (error) {
    console.error('Error in getSuggestedConnections:', error);
    return [];
  }
}

/**
 * Load all sidebar data at once
 */
export async function loadAllSidebarData() {
  const [
    friendRequests,
    unreadMessages,
    upcomingEvents,
    eventInvites,
    suggestedFriends
  ] = await Promise.all([
    getPendingFriendRequestsCount(),
    getUnreadMessagesCount(),
    getUpcomingEventsCount(),
    getPendingEventInvitesCount(),
    getSuggestedConnections(3)
  ]);

  return {
    friendRequests,
    unreadMessages,
    upcomingEvents,
    eventInvites,
    suggestedFriends
  };
}
