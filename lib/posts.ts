// lib/posts.ts
import { supabase } from "@/lib/supabaseClient";

export type Post = {
  id: string;
  user_id: string;
  body: string;
  image_url: string | null;
  privacy: "public" | "friends" | "private";
  created_at: string;
  author?: { id: string; full_name: string | null; avatar_url: string | null };
  like_count?: number;
  liked_by_me?: boolean;
  comment_count?: number;
};

export async function me() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function listHomeFeed(limit = 20, before?: string) {
  const uid = await me();
  if (!uid) return { rows: [], error: "Not signed in" as const };

  // 1) pull posts you can see
  let q = supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) q = q.lt("created_at", before);

  const { data: posts, error } = await q;
  if (error || !posts?.length) return { rows: (posts ?? []) as Post[], error: error?.message || null };

  const ids = posts.map((p: any) => p.id);
  const authorIds = [...new Set(posts.map((p: any) => p.user_id))];

  // 2) hydrate authors
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", authorIds);

  // 3) like counts + my like
  const [{ data: likeCounts }, { data: myLikes }, { data: commentCounts }] = await Promise.all([
    supabase.from("post_likes").select("post_id, count:user_id").in("post_id", ids).group("post_id"),
    supabase.from("post_likes").select("post_id").eq("user_id", uid).in("post_id", ids),
    supabase.from("post_comments").select("post_id, count:id").in("post_id", ids).group("post_id"),
  ]);

  const byId = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
  const likeCountBy = Object.fromEntries((likeCounts ?? []).map((r: any) => [r.post_id, Number(r.count)]));
  const myLikeSet = new Set((myLikes ?? []).map((r: any) => r.post_id));
  const commentCountBy = Object.fromEntries((commentCounts ?? []).map((r: any) => [r.post_id, Number(r.count)]));

  const rows: Post[] = (posts as any[]).map((p) => ({
    ...p,
    author: byId[p.user_id] || null,
    like_count: likeCountBy[p.id] ?? 0,
    liked_by_me: myLikeSet.has(p.id),
    comment_count: commentCountBy[p.id] ?? 0,
  }));

  return { rows, error: null };
}

export async function createPost(body: string, privacy: Post["privacy"] = "friends", image_url?: string) {
  const uid = await me();
  if (!uid) return { ok: false, error: "Not signed in" };
  const { error } = await supabase.from("posts").insert({ user_id: uid, body, privacy, image_url: image_url || null });
  return { ok: !error, error: error?.message || null };
}

export async function toggleLike(post_id: string) {
  const uid = await me();
  if (!uid) return { ok: false, error: "Not signed in" };

  const { data: existing } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("post_id", post_id)
    .eq("user_id", uid)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("post_likes").delete().eq("post_id", post_id).eq("user_id", uid);
    return { ok: !error, liked: false, error: error?.message || null };
  } else {
    const { error } = await supabase.from("post_likes").insert({ post_id, user_id: uid });
    return { ok: !error, liked: true, error: error?.message || null };
  }
}

export async function addComment(post_id: string, body: string) {
  const uid = await me();
  if (!uid) return { ok: false, error: "Not signed in" };
  const { error } = await supabase.from("post_comments").insert({ post_id, user_id: uid, body });
  return { ok: !error, error: error?.message || null };
}

export function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`; const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`; const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`; const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`; const w = Math.floor(d / 7);
  return `${w}w`;
}
