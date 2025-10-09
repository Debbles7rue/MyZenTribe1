// lib/notifications/send-notifications.ts
// Complete file for sending all types of notifications

import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// Main function to send any notification
export async function sendNotification({
  userId,
  type,
  title,
  body,
  targetUrl,
  entityId,
  actorId,
  entityTable,
  dueAt
}: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  targetUrl?: string;
  entityId?: string;
  actorId?: string;
  entityTable?: string;
  dueAt?: string;
}) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        recipient_id: userId, // Your table has both user_id and recipient_id
        type,
        title,
        body: body || '',
        target_url: targetUrl,
        entity_id: entityId,
        actor_id: actorId,
        entity_table: entityTable,
        due_at: dueAt,
        is_read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    
    console.log('Notification sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error };
  }
}

// ============================================
// CARPOOL NOTIFICATIONS
// ============================================

export async function sendCarpoolInvites({
  eventId,
  eventTitle,
  carpoolId,
  inviterUserId,
  inviterName,
  invitedUserIds,
  message
}: {
  eventId: string;
  eventTitle: string;
  carpoolId: string;
  inviterUserId: string;
  inviterName: string;
  invitedUserIds: string[];
  message?: string;
}) {
  try {
    // Create notifications for each invited user
    const notifications = invitedUserIds.map(userId => ({
      user_id: userId,
      recipient_id: userId,
      type: 'carpool.invited',
      title: `Carpool Invitation from ${inviterName}`,
      body: `${inviterName} invited you to carpool for ${eventTitle}. ${message || 'Click to view details and respond.'}`,
      target_url: `/calendar?event=${eventId}&openCarpool=${carpoolId}`,
      entity_id: carpoolId,
      entity_table: 'carpool_groups',
      actor_id: inviterUserId,
      is_read: false,
      created_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) throw error;
    
    console.log(`Sent ${notifications.length} carpool invites`);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending carpool invites:', error);
    return { success: false, error };
  }
}

export async function notifyCarpoolAccepted({
  carpoolCreatorId,
  accepterUserId,
  accepterName,
  eventTitle,
  carpoolId,
  eventId
}: {
  carpoolCreatorId: string;
  accepterUserId: string;
  accepterName: string;
  eventTitle: string;
  carpoolId: string;
  eventId: string;
}) {
  return sendNotification({
    userId: carpoolCreatorId,
    type: 'carpool.accepted',
    title: `${accepterName} joined your carpool`,
    body: `${accepterName} accepted your carpool invitation for ${eventTitle}`,
    targetUrl: `/calendar?event=${eventId}&openCarpool=${carpoolId}`,
    entityId: carpoolId,
    entityTable: 'carpool_groups',
    actorId: accepterUserId
  });
}

export async function notifyCarpoolSafeFriends({
  userId,
  eventId,
  eventTitle,
  friendNames,
  friendCount
}: {
  userId: string;
  eventId: string;
  eventTitle: string;
  friendNames: string[];
  friendCount: number;
}) {
  const displayNames = friendNames.slice(0, 3).join(', ');
  const others = friendCount > 3 ? ` and ${friendCount - 3} others` : '';
  
  return sendNotification({
    userId,
    type: 'carpool.safe_friends',
    title: 'Carpool opportunity!',
    body: `${displayNames}${others} are also interested in ${eventTitle}. Start a carpool together!`,
    targetUrl: `/calendar?event=${eventId}&suggestCarpool=true`,
    entityId: eventId,
    entityTable: 'events'
  });
}

// ============================================
// FRIEND NOTIFICATIONS
// ============================================

export async function sendFriendRequest({
  targetUserId,
  requesterUserId,
  requesterName
}: {
  targetUserId: string;
  requesterUserId: string;
  requesterName: string;
}) {
  return sendNotification({
    userId: targetUserId,
    type: 'friend.request',
    title: `${requesterName} sent you a friend request`,
    body: 'Accept to connect and share activities',
    targetUrl: `/friends/${requesterUserId}`,
    actorId: requesterUserId,
    entityTable: 'profiles'
  });
}

export async function sendFriendAccepted({
  targetUserId,
  accepterUserId,
  accepterName
}: {
  targetUserId: string;
  accepterUserId: string;
  accepterName: string;
}) {
  return sendNotification({
    userId: targetUserId,
    type: 'friend.accepted',
    title: `${accepterName} accepted your friend request`,
    body: 'You are now connected!',
    targetUrl: `/friends/${accepterUserId}`,
    actorId: accepterUserId,
    entityTable: 'profiles'
  });
}

// ============================================
// EVENT NOTIFICATIONS
// ============================================

export async function sendEventInvite({
  invitedUserId,
  eventId,
  eventTitle,
  inviterUserId,
  inviterName,
  eventDate
}: {
  invitedUserId: string;
  eventId: string;
  eventTitle: string;
  inviterUserId: string;
  inviterName: string;
  eventDate?: string;
}) {
  return sendNotification({
    userId: invitedUserId,
    type: 'event.invited',
    title: `${inviterName} invited you to ${eventTitle}`,
    body: eventDate ? `Event on ${new Date(eventDate).toLocaleDateString()}` : 'Click to view event details',
    targetUrl: `/calendar?event=${eventId}`,
    entityId: eventId,
    entityTable: 'events',
    actorId: inviterUserId
  });
}

export async function sendEventUpdate({
  userId,
  eventId,
  eventTitle,
  updateType
}: {
  userId: string;
  eventId: string;
  eventTitle: string;
  updateType: string;
}) {
  return sendNotification({
    userId,
    type: 'event.update',
    title: `${eventTitle} has been ${updateType}`,
    body: 'Check the updated event details',
    targetUrl: `/calendar?event=${eventId}`,
    entityId: eventId,
    entityTable: 'events'
  });
}

// ============================================
// COMMENT NOTIFICATIONS
// ============================================

export async function sendCommentNotification({
  contentOwnerId,
  commenterId,
  commenterName,
  contentId,
  contentType,
  contentTitle
}: {
  contentOwnerId: string;
  commenterId: string;
  commenterName: string;
  contentId: string;
  contentType: 'post' | 'album' | 'event';
  contentTitle?: string;
}) {
  const targetUrl = contentType === 'event' 
    ? `/calendar?event=${contentId}` 
    : `/feed/${contentId}`;

  return sendNotification({
    userId: contentOwnerId,
    type: `${contentType}.comment`,
    title: `${commenterName} commented on your ${contentType}`,
    body: contentTitle || 'View the comment',
    targetUrl,
    entityId: contentId,
    entityTable: `${contentType}s`,
    actorId: commenterId
  });
}

// ============================================
// REACTION NOTIFICATIONS
// ============================================

export async function sendPostReaction({
  postOwnerId,
  reactorId,
  reactorName,
  postId,
  reactionType,
  contentType = 'post'
}: {
  postOwnerId: string;
  reactorId: string;
  reactorName: string;
  postId: string;
  reactionType: string; // like, love, laugh, etc.
  contentType?: 'post' | 'album';
}) {
  const emoji = reactionType === 'like' ? '👍' : 
                reactionType === 'love' ? '❤️' :
                reactionType === 'laugh' ? '😂' : '👍';
  
  return sendNotification({
    userId: postOwnerId,
    type: `${contentType}.reaction`,
    title: `${reactorName} reacted ${emoji} to your ${contentType}`,
    body: 'View your post',
    targetUrl: `/feed/${postId}`,
    entityId: postId,
    entityTable: `${contentType}s`,
    actorId: reactorId
  });
}

export async function sendCommentReaction({
  commentOwnerId,
  reactorId,
  reactorName,
  commentId,
  postId,
  reactionType
}: {
  commentOwnerId: string;
  reactorId: string;
  reactorName: string;
  commentId: string;
  postId: string;
  reactionType: string;
}) {
  const emoji = reactionType === 'like' ? '👍' : 
                reactionType === 'love' ? '❤️' :
                reactionType === 'laugh' ? '😂' : '👍';
  
  return sendNotification({
    userId: commentOwnerId,
    type: 'comment.reaction',
    title: `${reactorName} reacted ${emoji} to your comment`,
    body: 'View the conversation',
    targetUrl: `/feed/${postId}`,
    entityId: commentId,
    entityTable: 'comments',
    actorId: reactorId
  });
}

// ============================================
// TAG NOTIFICATIONS
// ============================================

export async function sendTagNotification({
  taggedUserId,
  taggerId,
  taggerName,
  contentId,
  contentType
}: {
  taggedUserId: string;
  taggerId: string;
  taggerName: string;
  contentId: string;
  contentType: 'post' | 'album';
}) {
  return sendNotification({
    userId: taggedUserId,
    type: `${contentType}.tagged`,
    title: `${taggerName} tagged you in a ${contentType}`,
    body: 'View the post',
    targetUrl: `/feed/${contentId}`,
    entityId: contentId,
    entityTable: `${contentType}s`,
    actorId: taggerId
  });
}

// ============================================
// CO-CREATOR NOTIFICATIONS
// ============================================

export async function sendCoCreatorInvite({
  invitedUserId,
  inviterId,
  inviterName,
  contentId,
  contentType,
  contentTitle
}: {
  invitedUserId: string;
  inviterId: string;
  inviterName: string;
  contentId: string;
  contentType: 'album' | 'post';
  contentTitle?: string;
}) {
  return sendNotification({
    userId: invitedUserId,
    type: `${contentType}.cocreator`,
    title: `${inviterName} invited you as co-creator`,
    body: contentTitle ? `For: ${contentTitle}` : `For their ${contentType}`,
    targetUrl: `/feed/${contentId}`,
    entityId: contentId,
    entityTable: `${contentType}s`,
    actorId: inviterId
  });
}

// ============================================
// MESSAGE NOTIFICATIONS
// ============================================

export async function sendMessageNotification({
  recipientId,
  senderId,
  senderName,
  messagePreview
}: {
  recipientId: string;
  senderId: string;
  senderName: string;
  messagePreview?: string;
}) {
  return sendNotification({
    userId: recipientId,
    type: 'message.received',
    title: `New message from ${senderName}`,
    body: messagePreview ? messagePreview.substring(0, 100) : 'Open to read message',
    targetUrl: `/messages/${senderId}`,
    actorId: senderId,
    entityTable: 'messages'
  });
}

// ============================================
// GIFT NOTIFICATIONS
// ============================================

export async function sendGiftNotification({
  recipientId,
  senderId,
  senderName,
  giftType,
  giftId
}: {
  recipientId: string;
  senderId: string;
  senderName: string;
  giftType: string;
  giftId?: string;
}) {
  return sendNotification({
    userId: recipientId,
    type: 'gift.received',
    title: `${senderName} sent you a ${giftType}!`,
    body: 'Open to see your gift',
    targetUrl: giftId ? `/gifts/${giftId}` : '/gifts',
    entityId: giftId,
    entityTable: 'gifts',
    actorId: senderId
  });
}

// ============================================
// COMMUNITY NOTIFICATIONS
// ============================================

export async function sendCommunityInvite({
  invitedUserId,
  communityId,
  communityName,
  inviterId,
  inviterName
}: {
  invitedUserId: string;
  communityId: string;
  communityName: string;
  inviterId: string;
  inviterName: string;
}) {
  return sendNotification({
    userId: invitedUserId,
    type: 'community.invited',
    title: `${inviterName} invited you to ${communityName}`,
    body: 'Join the community to connect with members',
    targetUrl: `/communities/${communityId}`,
    entityId: communityId,
    entityTable: 'communities',
    actorId: inviterId
  });
}

export async function sendCommunityUpdate({
  userId,
  communityId,
  communityName,
  updateType
}: {
  userId: string;
  communityId: string;
  communityName: string;
  updateType: string;
}) {
  return sendNotification({
    userId,
    type: 'community.update',
    title: `Update in ${communityName}`,
    body: updateType,
    targetUrl: `/communities/${communityId}`,
    entityId: communityId,
    entityTable: 'communities'
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Delete old read notifications to keep table clean
export async function deleteOldReadNotifications(userId: string, daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .eq('is_read', true)
    .lt('created_at', cutoffDate.toISOString());
    
  if (error) {
    console.error('Error deleting old notifications:', error);
    return { success: false, error };
  }
  
  return { success: true };
}

// Mark multiple notifications as read
export async function markNotificationsRead(notificationIds: string[]) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .in('id', notificationIds);
    
  if (error) {
    console.error('Error marking notifications as read:', error);
    return { success: false, error };
  }
  
  return { success: true };
}
