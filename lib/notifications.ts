// lib/notifications.ts - FIXED VERSION (Gifts Removed)
import { supabase } from "@/lib/supabaseClient";

export type NotificationRow = {
  id: string;
  recipient_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  target_url: string | null;
  entity_table: string | null;
  entity_id: string | null;
  actor_id: string | null;
  due_at: string | null;
  created_at: string;
  read_at: string | null;
  is_read: boolean;
  metadata: any | null;
};

export type ListOpts = {
  onlyUnread?: boolean;
  type?: string;
  pageSize?: number;
  before?: string | null;
};

export async function getUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user?.id ?? null;
}

export async function listNotifications(opts: ListOpts = {}) {
  const { onlyUnread = false, type, pageSize = 20, before = null } = opts;
  const me = await getUserId();
  if (!me) return { rows: [], error: "Not signed in" as const };

  let q = supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", me)
    .order("created_at", { ascending: false })
    .limit(pageSize);

  if (onlyUnread) q = q.eq("is_read", false);
  if (type) q = q.eq("type", type);
  if (before) q = q.lt("created_at", before);

  const { data, error } = await q;
  
  if (error) {
    console.error("Error fetching notifications:", error);
    return { rows: [], error: error.message };
  }
  
  console.log(`✅ Fetched ${data?.length || 0} notifications for user ${me.substring(0, 8)}`);
  return { rows: (data || []) as NotificationRow[], error: null };
}

export async function unreadCount() {
  // Prefer the view if it exists; fall back to count(*)
  const me = await getUserId();
  if (!me) return 0;

  // Try view first
  const { data: viewData, error: viewErr } = await supabase
    .from("notifications_unread_count")
    .select("unread")
    .single();

  if (!viewErr && viewData) {
    console.log(`📬 Unread notifications (from view): ${viewData.unread ?? 0}`);
    return viewData.unread ?? 0;
  }

  // Fallback to direct count
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", me)
    .eq("is_read", false);

  if (error) {
    console.error("Error fetching unread count:", error);
    return 0;
  }

  console.log(`📬 Unread notifications (from count): ${count || 0}`);
  return count ?? 0;
}

export async function markRead(id: string) {
  const me = await getUserId();
  if (!me) return { ok: false, error: "Not signed in" };
  
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({ 
      read_at: now,
      is_read: true 
    })
    .eq("id", id)
    .eq("recipient_id", me);
    
  if (error) {
    console.error("Error marking notification as read:", error);
    return { ok: false, error: error.message };
  }
  
  console.log(`✓ Marked notification ${id.substring(0, 8)} as read`);
  return { ok: true, error: null };
}

export async function markAllRead() {
  const me = await getUserId();
  if (!me) return { ok: false, error: "Not signed in" };
  
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({ 
      read_at: now,
      is_read: true 
    })
    .eq("recipient_id", me)
    .eq("is_read", false);
    
  if (error) {
    console.error("Error marking all notifications as read:", error);
    return { ok: false, error: error.message };
  }
  
  console.log(`✓ Marked all notifications as read for user ${me.substring(0, 8)}`);
  return { ok: true, error: null };
}

// Helper function to determine 'kind' from 'type'
function getNotificationKind(type: string): string {
  if (type.startsWith('friend.')) return 'friend';
  if (type.startsWith('event.')) return 'event';
  if (type.startsWith('community.')) return 'community';
  if (type.startsWith('carpool.')) return 'event';
  if (type.startsWith('system.')) return 'system';
  if (type.startsWith('todo.') || type.startsWith('reminder.')) return 'warning';
  if (type.startsWith('post.') || type.startsWith('album.') || type.startsWith('comment.')) return 'info';
  if (type.startsWith('message.')) return 'info';
  return 'info'; // default
}

// Create a new notification
export async function createNotification(data: {
  recipient_id: string;
  type: string;
  title: string;
  body?: string | null;
  target_url?: string | null;
  entity_table?: string | null;
  entity_id?: string | null;
  actor_id?: string | null;
  due_at?: string | null;
  metadata?: any;
}) {
  const kind = getNotificationKind(data.type);
  
  const { error } = await supabase
    .from("notifications")
    .insert({
      user_id: data.recipient_id,
      recipient_id: data.recipient_id,
      type: data.type,
      kind: kind,
      title: data.title,
      body: data.body || null,
      target_url: data.target_url || null,
      entity_table: data.entity_table || null,
      entity_id: data.entity_id || null,
      actor_id: data.actor_id || null,
      due_at: data.due_at || null,
      is_read: false,
      read_at: null,
      metadata: data.metadata || null,
    });

  if (error) {
    console.error("Error creating notification:", error);
    return { ok: false, error: error.message };
  }
  
  console.log(`✅ Created notification for user ${data.recipient_id.substring(0, 8)} (type: ${data.type}, kind: ${kind})`);
  return { ok: true, error: null };
}

// Realtime subscription
export async function subscribeNotifications(
  onChange: (payload: { event: "INSERT" | "UPDATE" | "DELETE" }) => void
) {
  const me = await getUserId();
  if (!me) {
    console.warn("⚠️ Cannot subscribe to notifications: user not signed in");
    return null;
  }

  console.log(`🔔 Subscribing to notifications for user ${me.substring(0, 8)}`);
  
  const channel = supabase
    .channel(`notifications-rt-${me}`)
    .on(
      "postgres_changes",
      { 
        event: "*", 
        schema: "public", 
        table: "notifications", 
        filter: `recipient_id=eq.${me}` 
      },
      (payload) => {
        console.log("🔔 Notification event received:", payload.eventType);
        onChange({ event: payload.eventType as any });
      }
    )
    .subscribe((status) => {
      console.log("🔔 Subscription status:", status);
    });

  return channel;
}

// Utility: relative time label
export function relativeTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.floor((now - d) / 1000);
  const mins = Math.floor(diff / 60);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}
