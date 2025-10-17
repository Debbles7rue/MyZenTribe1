// lib/invites.ts
"use client";

import { supabase } from "@/lib/supabaseClient";
import { createNotification } from "@/lib/notifications";

export type InviteType = 'event' | 'carpool' | 'casual';
export type InviteStatus = 'pending' | 'accepted' | 'declined';

export interface Invite {
  id: string;
  type: InviteType;
  inviter_id: string;
  invitee_id: string;
  status: InviteStatus;
  created_at: string;
  event_id?: string;
  carpool_group_id?: string;
  message?: string;
  inviter?: {
    full_name: string;
    avatar_url: string;
  };
  event?: {
    title: string;
    start_time: string;
    location?: string;
  };
}

async function getUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Get all pending invites for the current user
 */
export async function getPendingInvites() {
  const userId = await getUserId();
  if (!userId) return { invites: [], error: 'Not signed in' };

  try {
    // Get event invites
    const { data: eventInvites, error: eventError } = await supabase
      .from('event_rsvps')
      .select(`
        id,
        event_id,
        user_id,
        status,
        created_at,
        events (
          id,
          title,
          start_time,
          location,
          created_by
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'invited')
      .order('created_at', { ascending: false });

    if (eventError) {
      console.error('Error fetching event invites:', eventError);
      return { invites: [], error: eventError.message };
    }

    // Get carpool invites
    const { data: carpoolInvites, error: carpoolError } = await supabase
      .from('carpool_members')
      .select(`
        id,
        carpool_group_id,
        user_id,
        status,
        created_at,
        carpool_groups (
          id,
          event_id,
          created_by,
          events (
            title,
            start_time,
            location
          )
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'invited')
      .order('created_at', { ascending: false });

    if (carpoolError) {
      console.error('Error fetching carpool invites:', carpoolError);
    }

    // Format event invites
    const formattedEventInvites: Invite[] = (eventInvites || []).map((inv: any) => ({
      id: inv.id,
      type: 'event' as InviteType,
      inviter_id: inv.events?.created_by || '',
      invitee_id: userId,
      status: 'pending' as InviteStatus,
      created_at: inv.created_at,
      event_id: inv.event_id,
      event: inv.events ? {
        title: inv.events.title,
        start_time: inv.events.start_time,
        location: inv.events.location
      } : undefined
    }));

    // Format carpool invites
    const formattedCarpoolInvites: Invite[] = (carpoolInvites || []).map((inv: any) => ({
      id: inv.id,
      type: 'carpool' as InviteType,
      inviter_id: inv.carpool_groups?.created_by || '',
      invitee_id: userId,
      status: 'pending' as InviteStatus,
      created_at: inv.created_at,
      carpool_group_id: inv.carpool_group_id,
      event_id: inv.carpool_groups?.event_id,
      event: inv.carpool_groups?.events ? {
        title: inv.carpool_groups.events.title,
        start_time: inv.carpool_groups.events.start_time,
        location: inv.carpool_groups.events.location
      } : undefined
    }));

    // Combine and get inviter profiles
    const allInvites = [...formattedEventInvites, ...formattedCarpoolInvites];
    const inviterIds = [...new Set(allInvites.map(inv => inv.inviter_id))];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', inviterIds);

    const profileMap = new Map(
      (profiles || []).map(p => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }])
    );

    // Add inviter info
    allInvites.forEach(invite => {
      invite.inviter = profileMap.get(invite.inviter_id);
    });

    return { invites: allInvites, error: null };
  } catch (error: any) {
    console.error('Error in getPendingInvites:', error);
    return { invites: [], error: error.message };
  }
}

/**
 * Accept an event invite
 */
export async function acceptEventInvite(inviteId: string, eventId: string) {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Not signed in' };

  try {
    // Update RSVP status
    const { error: rsvpError } = await supabase
      .from('event_rsvps')
      .update({ status: 'going' })
      .eq('id', inviteId)
      .eq('user_id', userId);

    if (rsvpError) throw rsvpError;

    // Get event details for notification
    const { data: event } = await supabase
      .from('events')
      .select('title, created_by')
      .eq('id', eventId)
      .single();

    // Notify event creator
    if (event && event.created_by !== userId) {
      const { data: accepterProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      await createNotification({
        recipient_id: event.created_by,
        type: 'event.rsvp_accepted',
        title: 'RSVP Accepted',
        body: `${accepterProfile?.full_name || 'Someone'} is going to ${event.title}`,
        target_url: `/calendar?event=${eventId}`,
        entity_table: 'events',
        entity_id: eventId,
        actor_id: userId
      });
    }

    return { ok: true, error: null };
  } catch (error: any) {
    console.error('Error accepting event invite:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Decline an event invite
 */
export async function declineEventInvite(inviteId: string) {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Not signed in' };

  try {
    const { error } = await supabase
      .from('event_rsvps')
      .update({ status: 'not_going' })
      .eq('id', inviteId)
      .eq('user_id', userId);

    if (error) throw error;
    return { ok: true, error: null };
  } catch (error: any) {
    console.error('Error declining event invite:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Accept a carpool invite
 */
export async function acceptCarpoolInvite(inviteId: string, carpoolGroupId: string) {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Not signed in' };

  try {
    // Update carpool member status
    const { error: memberError } = await supabase
      .from('carpool_members')
      .update({ status: 'confirmed' })
      .eq('id', inviteId)
      .eq('user_id', userId);

    if (memberError) throw memberError;

    // Get carpool details for notification
    const { data: carpool } = await supabase
      .from('carpool_groups')
      .select('event_id, created_by, events(title)')
      .eq('id', carpoolGroupId)
      .single();

    // Notify carpool creator
    if (carpool && carpool.created_by !== userId) {
      const { data: accepterProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      await createNotification({
        recipient_id: carpool.created_by,
        type: 'carpool.invite_accepted',
        title: 'Carpool Accepted',
        body: `${accepterProfile?.full_name || 'Someone'} joined your carpool for ${carpool.events?.title}`,
        target_url: `/calendar?carpool=${carpoolGroupId}`,
        entity_table: 'carpool_groups',
        entity_id: carpoolGroupId,
        actor_id: userId
      });
    }

    return { ok: true, error: null };
  } catch (error: any) {
    console.error('Error accepting carpool invite:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Decline a carpool invite
 */
export async function declineCarpoolInvite(inviteId: string) {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Not signed in' };

  try {
    const { error } = await supabase
      .from('carpool_members')
      .delete()
      .eq('id', inviteId)
      .eq('user_id', userId);

    if (error) throw error;
    return { ok: true, error: null };
  } catch (error: any) {
    console.error('Error declining carpool invite:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Send a casual hangout invite
 */
export async function sendCasualInvite(data: {
  friendIds: string[];
  message: string;
  suggestedTime?: string;
  suggestedLocation?: string;
}) {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Not signed in' };

  try {
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    const senderName = senderProfile?.full_name || 'Someone';

    // Send notification to each friend
    const notificationPromises = data.friendIds.map(friendId =>
      createNotification({
        recipient_id: friendId,
        type: 'invite.casual',
        title: 'Casual Invite',
        body: `${senderName} invited you: "${data.message}"`,
        target_url: '/calendar?tab=invites',
        actor_id: userId,
        metadata: {
          message: data.message,
          suggested_time: data.suggestedTime,
          suggested_location: data.suggestedLocation
        }
      })
    );

    await Promise.all(notificationPromises);
    return { ok: true, error: null };
  } catch (error: any) {
    console.error('Error sending casual invite:', error);
    return { ok: false, error: error.message };
  }
}
