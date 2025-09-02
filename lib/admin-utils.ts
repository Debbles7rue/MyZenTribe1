// lib/admin-utils.ts
// Copy this entire file to lib/admin-utils.ts in your project

import { supabase } from "@/lib/supabaseClient";
import type { 
  AdminProfile, 
  InboxMessage, 
  ContentReport, 
  UserModeration,
  CommunityInboxMessage,
  AdminLog,
  AdminStats,
  AdminPermission 
} from "./admin-types";

// ============================================
// AUTHENTICATION & PERMISSIONS
// ============================================

export async function checkIsAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("is_app_admin")
    .eq("id", user.id)
    .single();

  return !error && data?.is_app_admin === true;
}

export async function getAdminPermissions(adminId: string): Promise<AdminPermission[]> {
  const { data, error } = await supabase
    .from("app_admin_permissions")
    .select("permission")
    .eq("admin_id", adminId);

  if (error || !data) return [];
  return data.map(p => p.permission as AdminPermission);
}

export async function hasPermission(permission: AdminPermission): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const permissions = await getAdminPermissions(user.id);
  return permissions.includes(permission);
}

// ============================================
// INBOX MANAGEMENT
// ============================================

export async function getInboxMessages(
  type?: 'contact' | 'suggestion' | 'report',
  status?: 'unread' | 'read' | 'responded' | 'archived'
): Promise<{ data: InboxMessage[], error: any }> {
  let query = supabase
    .from("inbox_messages")
    .select(`
      *,
      sender:profiles!sender_id (
        full_name,
        avatar_url
      )
    `)
    .order("created_at", { ascending: false });

  if (type) query = query.eq("type", type);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  return { data: data || [], error };
}

export async function markMessageRead(messageId: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from("inbox_messages")
    .update({ 
      status: 'read',
      updated_at: new Date().toISOString()
    })
    .eq("id", messageId);

  return { error };
}

export async function respondToMessage(
  messageId: string,
  response: string
): Promise<{ error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Not authenticated") };

  const { error } = await supabase
    .from("inbox_messages")
    .update({
      status: 'responded',
      response,
      responded_at: new Date().toISOString(),
      responded_by: user.id,
      updated_at: new Date().toISOString()
    })
    .eq("id", messageId);

  await logAdminAction('respond_message', 'inbox_message', messageId, { response });
  return { error };
}

export async function sendContactMessage(
  type: 'contact' | 'suggestion',
  subject: string,
  message: string
): Promise<{ error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { error } = await supabase
    .from("inbox_messages")
    .insert({
      type,
      sender_id: user?.id || null,
      subject,
      message,
      status: 'unread',
      priority: 'normal'
    });

  return { error };
}

// ============================================
// CONTENT REPORTS
// ============================================

export async function getContentReports(
  status?: 'pending' | 'reviewing' | 'resolved' | 'dismissed'
): Promise<{ data: ContentReport[], error: any }> {
  let query = supabase
    .from("content_reports")
    .select(`
      *,
      reporter:profiles!reporter_id (
        full_name,
        avatar_url
      )
    `)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  return { data: data || [], error };
}

export async function resolveReport(
  reportId: string,
  resolution: string,
  status: 'resolved' | 'dismissed' = 'resolved'
): Promise<{ error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Not authenticated") };

  const { error } = await supabase
    .from("content_reports")
    .update({
      status,
      resolution,
      resolved_at: new Date().toISOString(),
      resolved_by: user.id
    })
    .eq("id", reportId);

  await logAdminAction('resolve_report', 'content_report', reportId, { resolution, status });
  return { error };
}

export async function reportContent(
  contentType: ContentReport['content_type'],
  contentId: string,
  reason: ContentReport['reason'],
  description?: string
): Promise<{ error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { error } = await supabase
    .from("content_reports")
    .insert({
      reporter_id: user?.id || null,
      content_type: contentType,
      content_id: contentId,
      reason,
      description
    });

  return { error };
}

// ============================================
// USER MODERATION
// ============================================

export async function getUserModerationHistory(userId: string): Promise<{ 
  data: UserModeration[], 
  error: any 
}> {
  const { data, error } = await supabase
    .from("user_moderation")
    .select(`
      *,
      user:profiles!user_id (
        full_name,
        avatar_url,
        email
      )
    `)
    .eq("user_id", userId)
    .order("issued_at", { ascending: false });

  return { data: data || [], error };
}

export async function moderateUser(
  userId: string,
  action: UserModeration['action'],
  reason: string,
  durationHours?: number,
  notes?: string
): Promise<{ error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Not authenticated") };

  const expiresAt = durationHours 
    ? new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await supabase
    .from("user_moderation")
    .insert({
      user_id: userId,
      action,
      reason,
      duration_hours: durationHours || null,
      expires_at: expiresAt,
      issued_by: user.id,
      notes
    });

  await logAdminAction('moderate_user', 'user', userId, { action, reason });
  return { error };
}

export async function liftModeration(moderationId: string): Promise<{ error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Not authenticated") };

  const { error } = await supabase
    .from("user_moderation")
    .update({
      is_active: false,
      lifted_at: new Date().toISOString(),
      lifted_by: user.id
    })
    .eq("id", moderationId);

  await logAdminAction('lift_moderation', 'moderation', moderationId);
  return { error };
}

export async function isUserBanned(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .rpc("is_user_banned", { user_uuid: userId });

  return !error && data === true;
}

// ============================================
// COMMUNITY ADMIN FUNCTIONS
// ============================================

export async function getCommunityInbox(
  communityId: string
): Promise<{ data: CommunityInboxMessage[], error: any }> {
  const { data, error } = await supabase
    .from("community_inbox")
    .select(`
      *,
      sender:profiles!sender_id (
        full_name,
        avatar_url
      )
    `)
    .eq("community_id", communityId)
    .order("created_at", { ascending: false });

  return { data: data || [], error };
}

export async function sendToCommunityInbox(
  communityId: string,
  type: 'report' | 'suggestion' | 'announcement',
  subject: string,
  message: string
): Promise<{ error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { error } = await supabase
    .from("community_inbox")
    .insert({
      community_id: communityId,
      type,
      sender_id: user?.id || null,
      subject,
      message
    });

  return { error };
}

export async function isUserCommunityAdmin(
  userId: string,
  communityId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("community_members")
    .select("role")
    .eq("user_id", userId)
    .eq("community_id", communityId)
    .single();

  return !error && data && ['owner', 'moderator'].includes(data.role);
}

// ============================================
// ADMIN MANAGEMENT
// ============================================

export async function grantAdminPrivileges(
  userId: string,
  permissions: AdminPermission[]
): Promise<{ error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Not authenticated") };

  // First, mark user as admin
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      is_app_admin: true,
      admin_granted_at: new Date().toISOString(),
      admin_granted_by: user.id
    })
    .eq("id", userId);

  if (profileError) return { error: profileError };

  // Then grant permissions
  const permissionInserts = permissions.map(permission => ({
    admin_id: userId,
    permission,
    granted_by: user.id
  }));

  const { error } = await supabase
    .from("app_admin_permissions")
    .insert(permissionInserts);

  await logAdminAction('grant_admin', 'user', userId, { permissions });
  return { error };
}

export async function revokeAdminPrivileges(userId: string): Promise<{ error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Not authenticated") };

  // Remove admin flag
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      is_app_admin: false
    })
    .eq("id", userId);

  if (profileError) return { error: profileError };

  // Remove all permissions
  const { error } = await supabase
    .from("app_admin_permissions")
    .delete()
    .eq("admin_id", userId);

  await logAdminAction('revoke_admin', 'user', userId);
  return { error };
}

// ============================================
// ADMIN STATISTICS
// ============================================

export async function getAdminStats(): Promise<{ data: AdminStats | null, error: any }> {
  try {
    // Get counts in parallel
    const [
      users,
      events,
      communities,
      reports,
      pendingReports,
      unreadMessages,
      activeModeration,
      todaySignups
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: 'exact' }),
      supabase.from("events").select("id", { count: 'exact' }),
      supabase.from("communities").select("id", { count: 'exact' }),
      supabase.from("content_reports").select("id", { count: 'exact' }),
      supabase.from("content_reports").select("id", { count: 'exact' }).eq("status", "pending"),
      supabase.from("inbox_messages").select("id", { count: 'exact' }).eq("status", "unread"),
      supabase.from("user_moderation").select("id", { count: 'exact' }).eq("is_active", true),
      supabase
        .from("profiles")
        .select("id", { count: 'exact' })
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
    ]);

    const stats: AdminStats = {
      totalUsers: users.count || 0,
      totalEvents: events.count || 0,
      totalCommunities: communities.count || 0,
      totalReports: reports.count || 0,
      pendingReports: pendingReports.count || 0,
      unreadMessages: unreadMessages.count || 0,
      activeModeration: activeModeration.count || 0,
      todaySignups: todaySignups.count || 0
    };

    return { data: stats, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// ============================================
// ADMIN LOGGING
// ============================================

export async function logAdminAction(
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Record<string, any>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("admin_logs")
    .insert({
      admin_id: user.id,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
      user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null
    });
}

export async function getAdminLogs(
  limit: number = 100
): Promise<{ data: AdminLog[], error: any }> {
  const { data, error } = await supabase
    .from("admin_logs")
    .select(`
      *,
      admin:profiles!admin_id (
        full_name,
        email
      )
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  return { data: data || [], error };
}

// ============================================
// CONTENT DELETION
// ============================================

export async function deleteContent(
  contentType: ContentReport['content_type'],
  contentId: string
): Promise<{ error: any }> {
  let table: string;
  
  switch (contentType) {
    case 'event':
      table = 'events';
      break;
    case 'post':
      table = 'posts';
      break;
    case 'comment':
      table = 'comments'; // if you have comments table
      break;
    case 'community':
      table = 'communities';
      break;
    default:
      return { error: new Error(`Cannot delete content type: ${contentType}`) };
  }

  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', contentId);

  await logAdminAction('delete_content', contentType, contentId);
  return { error };
}
