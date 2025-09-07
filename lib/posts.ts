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

  // First, get the list of friend IDs (if you have a friends table)
  // For now, we'll implement a basic version that shows:
  // 1. Your own posts (any privacy)
  // 2. Public posts from everyone
  // 3. Friends posts from your friends (when friends system is added)
  
  // Build the query with proper filtering
  let q = supabase
    .from("posts")
    .select("*")
    .or(`user_id.eq.${uid},privacy.eq.public`) // Show your own posts and all public posts
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) q = q.lt("created_at", before);

  console.log("Fetching posts for user:", uid); // Debug log

  const { data: posts, error } = await q;
  
  if (error) {
    console.error("Error fetching posts:", error);
    return { rows: [], error: error.message };
  }
  
  if (!posts || posts.length === 0) {
    console.log("No posts found");
    return { rows: [], error: null };
  }

  console.log(`Found ${posts.length} posts`); // Debug log

  const ids = posts.map((p: any) => p.id);
  const authorIds = [...new Set(posts.map((p: any) => p.user_id))];

  // 2) hydrate authors
  const { data: profs, error: profsError } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", authorIds);

  if (profsError) {
    console.error("Error fetching profiles:", profsError);
  }

  // 3) like counts + my likes + comment counts
  const [{ data: likeCounts }, { data: myLikes }, { data: commentCounts }] = await Promise.all([
    supabase
      .from("post_likes")
      .select("post_id")
      .in("post_id", ids)
      .then(({ data }) => ({
        data: data ? ids.map(id => ({
          post_id: id,
          count: (data || []).filter(like => like.post_id === id).length
        })) : []
      })),
    supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", uid)
      .in("post_id", ids),
    supabase
      .from("post_comments")
      .select("post_id")
      .in("post_id", ids)
      .then(({ data }) => ({
        data: data ? ids.map(id => ({
          post_id: id,
          count: (data || []).filter(comment => comment.post_id === id).length
        })) : []
      })),
  ]);

  const byId = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
  const likeCountBy = Object.fromEntries((likeCounts ?? []).map((r: any) => [r.post_id, r.count]));
  const myLikeSet = new Set((myLikes ?? []).map((r: any) => r.post_id));
  const commentCountBy = Object.fromEntries((commentCounts ?? []).map((r: any) => [r.post_id, r.count]));

  const rows: Post[] = (posts as any[]).map((p) => ({
    ...p,
    author: byId[p.user_id] || { id: p.user_id, full_name: "Anonymous", avatar_url: null },
    like_count: likeCountBy[p.id] ?? 0,
    liked_by_me: myLikeSet.has(p.id),
    comment_count: commentCountBy[p.id] ?? 0,
  }));

  console.log("Returning posts:", rows.length); // Debug log
  return { rows, error: null };
}

export async function createPost(body: string, privacy: Post["privacy"] = "friends", image_url?: string) {
  const uid = await me();
  if (!uid) return { ok: false, error: "Not signed in" };
  
  console.log("Creating post:", { user_id: uid, body, privacy }); // Debug log
  
  const { data, error } = await supabase
    .from("posts")
    .insert({ 
      user_id: uid, 
      body, 
      privacy, 
      image_url: image_url || null 
    })
    .select()
    .single();
  
  if (error) {
    console.error("Error creating post:", error);
    return { ok: false, error: error.message };
  }
  
  console.log("Post created successfully:", data);
  return { ok: true, error: null };
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

// Helper function to get friends (for future implementation)
export async function getFriends(userId: string) {
  // This will need a friends/connections table in Supabase
  // For now, returning empty array
  // When you set up friends table, update this to:
  /*
  const { data } = await supabase
    .from("friends")
    .select("friend_id")
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .eq("status", "accepted");
  
  return data?.map(f => f.friend_id === userId ? f.user_id : f.friend_id) || [];
  */
  return [];
}
