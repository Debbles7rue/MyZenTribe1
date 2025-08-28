// lib/notifications.ts
import { supabase } from "@/lib/supabaseClient";

export type NotificationRow = {
  id: string;
  recipient_id: string;
  type: string;              // e.g., 'friend.accepted','event.upcoming','todo.due','reminder.due','community.invited'
  title: string;
  body: string | null;
  target_url: string | null; // deep link: '/calendar?focus=<id>', '/friends/<id>/edit?new=1', etc.
  entity_table: string | null;
  entity_id: string | null;
  actor_id: string | null;
  due_at: string | null;     // ISO
  created_at: string;        // ISO
  read_at: string | null;    // ISO
};

export type ListOpts = {
  onlyUnread?: boolean;
  type?: string;           // filter by type
  pageSize?: number;       // default 20
  before?: string | null;  // pagination cursor (created_at)
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

  if (onlyUnread) q = q.is("read_at", null);
  if (type) q = q.eq("type", type);
  if (before) q = q.lt("created_at", before);

  const { data, error } = await q;
  return { rows: (data || []) as NotificationRow[], error: error?.message || null };
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

  if (!viewErr && viewData) return viewData.unread ?? 0;

  // Fallback
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", me)
    .is("read_at", null);

  return count ?? 0;
}

export async function markRead(id: string) {
  const me = await getUserId();
  if (!me) return { ok: false, error: "Not signed in" };
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_id", me);
  return { ok: !error, error: error?.message || null };
}

export async function markAllRead() {
  const me = await getUserId();
  if (!me) return { ok: false, error: "Not signed in" };
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", me)
    .is("read_at", null);
  return { ok: !error, error: error?.message || null };
}

// Realtime subscription (INSERT/UPDATE/DELETE on your own notifications)
export async function subscribeNotifications(
  onChange: (payload: { event: "INSERT" | "UPDATE" | "DELETE" }) => void
) {
  const me = await getUserId();
  if (!me) return null;

  const channel = supabase
    .channel("notifications-rt")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${me}` },
      () => onChange({ event: "INSERT" })
    )
    .subscribe();

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
