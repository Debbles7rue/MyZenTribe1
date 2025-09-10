// lib/posts.ts
import { supabase } from "@/lib/supabaseClient";

export type Post = {
  id: string;
  user_id: string;
  body: string;
  images: any[] | null;  // jsonb field
  image_url: string | null;
  video_url: string | null;
  gif_url: string | null;
  media_type: 'image' | 'video' | 'gif' | null;
  visibility: string;  // Required field
  privacy: "public" | "friends" | "private";  // Nullable field
  allow_share: boolean;
  co_creators: string[] | null;
  shared_from_id: string | null;
  created_at: string;
  edited_at: string | null;
  like_count: number;
  comment_count: number;
  updated_at: string | null;
  author?: { id: string; full_name: string | null; avatar_url: string | null };
  co_authors?: Array<{ id: string; full_name: string | null; avatar_url: string | null }>;
  original_post?: Post | null;
  liked_by_me?: boolean;
  share_count?: number;
  comments?: Array<{
    id: string;
    body: string;
    user_id: string;
    created_at: string;
    author?: { id: string; full_name: string | null; avatar_url: string | null };
  }>;
};

export async function me() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function uploadMedia(file: File, type: 'image' | 'video' | 'gif') {
  const uid = await me();
  if (!uid) return { url: null, error: "Not signed in" };

  const bucketName = `post-${type}s`;
  const fileName = `${uid}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error(`Error uploading ${type}:`, error);
    return { url: null, error: error.message };
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fileName);

  return { url: publicUrl, error: null };
}

export async function listHomeFeed(limit = 20, before?: string) {
  const uid = await me();
  if (!uid) return { rows: [], error: "Not signed in" as const };

  let q = supabase
    .from("posts")
    .select("*")
    .or(`user_id.eq.${uid},visibility.eq.public,privacy.eq.public`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) q = q.lt("created_at", before);

  console.log("Fetching posts for user:", uid);

  const { data: posts, error } = await q;
  
  if (error) {
    console.error("Error fetching posts:", error);
    return { rows: [], error: error.message };
  }
  
  if (!posts?.length) {
    console.log("No posts found");
    return { rows: [], error: null };
  }

  console.log(`Found ${posts.length} posts`);

  const ids = posts.map((p: any) => p.id);
  const authorIds = [...new Set(posts.flatMap((p: any) => [p.user_id, ...(p.co_creators || [])].filter(Boolean)))];

  const [
    { data: profs },
    { data: likeCounts },
    { data: myLikes },
    { data: commentData },
    { data: shareCounts }
  ] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url").in("id", authorIds),
    supabase.from("post_likes").select("post_id").in("post_id", ids),
    supabase.from("post_likes").select("post_id").eq("user_id", uid).in("post_id", ids),
    supabase.from("post_comments")
      .select("*")
      .in("post_id", ids)
      .order("created_at", { ascending: true }),
    supabase.from("posts").select("id").in("shared_from_id", ids)
  ]);

  const byId = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
  const likeCountBy = Object.fromEntries(
    ids.map(id => [id, (likeCounts ?? []).filter((l: any) => l.post_id === id).length])
  );
  const myLikeSet = new Set((myLikes ?? []).map((r: any) => r.post_id));
  const commentsByPost = Object.fromEntries(
    ids.map(id => [id, (commentData ?? []).filter((c: any) => c.post_id === id)])
  );
  const shareCountBy = Object.fromEntries(
    ids.map(id => [id, (shareCounts ?? []).filter((s: any) => s.shared_from_id === id).length])
  );

  const commentAuthorIds = [...new Set((commentData ?? []).map((c: any) => c.user_id))];
  const { data: commentAuthors } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", commentAuthorIds);
  const commentAuthorById = Object.fromEntries((commentAuthors ?? []).map((p: any) => [p.id, p]));

  const commentsWithAuthors = (commentData ?? []).map((c: any) => ({
    ...c,
    author: commentAuthorById[c.user_id] || { id: c.user_id, full_name: "Anonymous", avatar_url: null }
  }));

  const rows: Post[] = posts.map((p: any) => ({
    ...p,
    privacy: p.privacy || p.visibility,  // Use privacy if set, otherwise visibility
    author: byId[p.user_id] || { id: p.user_id, full_name: "Anonymous", avatar_url: null },
    co_authors: (p.co_creators || []).map((id: string) => byId[id] || { id, full_name: "Anonymous", avatar_url: null }),
    liked_by_me: myLikeSet.has(p.id),
    comments: commentsWithAuthors.filter((c: any) => c.post_id === p.id),
    share_count: shareCountBy[p.id] ?? 0,
  }));

  return { rows, error: null };
}

export async function createPost(
  body: string,
  privacy: Post["privacy"] = "friends",
  options?: {
    image_url?: string;
    video_url?: string;
    gif_url?: string;
    media_type?: 'image' | 'video' | 'gif';
    allow_share?: boolean;
    co_creators?: string[];
    shared_from_id?: string;
  }
) {
  const uid = await me();
  if (!uid) {
    console.error("Cannot create post: Not signed in");
    return { ok: false, error: "Not signed in" };
  }
  
  const postData: any = {
    user_id: uid,
    visibility: privacy,  // visibility is required
    privacy: privacy,     // also set privacy field
    body: body || null,
  };

  // Handle images array if we have an image_url
  if (options?.image_url) {
    postData.images = [{ url: options.image_url }];
    postData.image_url = options.image_url;
  }

  // Add optional fields
  if (options?.video_url) postData.video_url = options.video_url;
  if (options?.gif_url) postData.gif_url = options.gif_url;
  if (options?.media_type) postData.media_type = options.media_type;
  if (options?.allow_share !== undefined) postData.allow_share = options.allow_share;
  if (options?.co_creators) postData.co_creators = options.co_creators;
  if (options?.shared_from_id) postData.shared_from_id = options.shared_from_id;
  
  console.log("Creating post with data:", postData);
  
  const { data, error } = await supabase
    .from("posts")
    .insert(postData)
    .select()
    .single();
  
  if (error) {
    console.error("Supabase error creating post:", error);
    return { ok: false, error: error.message };
  }
  
  console.log("Post created successfully:", data);
  return { ok: true, error: null, data };
}

export async function updatePost(postId: string, updates: { body?: string; privacy?: Post["privacy"] }) {
  const uid = await me();
  if (!uid) return { ok: false, error: "Not signed in" };
  
  const { data: post } = await supabase
    .from("posts")
    .select("user_id, co_creators")
    .eq("id", postId)
    .single();
    
  if (!post) return { ok: false, error: "Post not found" };
  
  const isAuthorized = post.user_id === uid || (post.co_creators || []).includes(uid);
  if (!isAuthorized) return { ok: false, error: "Not authorized" };
  
  const updateData: any = {};
  if (updates.body !== undefined) updateData.body = updates.body;
  if (updates.privacy !== undefined) {
    updateData.visibility = updates.privacy;
    updateData.privacy = updates.privacy;
  }
  updateData.edited_at = new Date().toISOString();
  
  const { error } = await supabase
    .from("posts")
    .update(updateData)
    .eq("id", postId);
    
  return { ok: !error, error: error?.message || null };
}

export async function deletePost(postId: string) {
  const uid = await me();
  if (!uid) return { ok: false, error: "Not signed in" };
  
  const { data: post } = await supabase
    .from("posts")
    .select("user_id")
    .eq("id", postId)
    .single();
    
  if (!post || post.user_id !== uid) {
    return { ok: false, error: "Not authorized" };
  }
  
  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId);
    
  return { ok: !error, error: error?.message || null };
}

export async function sharePost(postId: string, target: 'feed' | 'calendar', body?: string) {
  const uid = await me();
  if (!uid) return { ok: false, error: "Not signed in" };
  
  const { data: post } = await supabase
    .from("posts")
    .select("allow_share")
    .eq("id", postId)
    .single();
    
  if (!post?.allow_share) {
    return { ok: false, error: "This post cannot be shared" };
  }
  
  if (target === 'feed') {
    return createPost(body || "Shared a post", "friends", { shared_from_id: postId });
  } else {
    return { ok: true, error: null, message: "Added to calendar" };
  }
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

export async function deleteComment(commentId: string) {
  const uid = await me();
  if (!uid) return { ok: false, error: "Not signed in" };
  
  const { error } = await supabase
    .from("post_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", uid);
    
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
