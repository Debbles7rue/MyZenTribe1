// lib/posts.ts
import { supabase } from "@/lib/supabaseClient";

export type MediaItem = {
  url: string;
  type: 'image' | 'video';
};

export type Post = {
  id: string;
  user_id: string;
  body: string;
  image_url: string | null;
  video_url: string | null;
  additional_media?: MediaItem[];
  privacy: "public" | "friends" | "private";
  created_at: string;
  allow_share: boolean;
  co_creators?: string[] | null;
  co_creators_info?: Array<{
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  }>;
  author?: { 
    id: string; 
    full_name: string | null; 
    avatar_url: string | null 
  };
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

  // Pull posts that are public or from friends
  let q = supabase
    .from("posts")
    .select(`
      *,
      profiles!posts_user_id_fkey(id, full_name, avatar_url),
      post_media(url, media_type)
    `)
    .or(`privacy.eq.public,user_id.in.(${uid})`) // Simplified for now
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) q = q.lt("created_at", before);

  const { data: posts, error } = await q;
  if (error || !posts?.length) return { rows: (posts ?? []) as Post[], error: error?.message || null };

  const ids = posts.map((p: any) => p.id);
  
  // Get co-creator info
  const coCreatorIds = posts
    .filter((p: any) => p.co_creators && p.co_creators.length > 0)
    .flatMap((p: any) => p.co_creators);
  
  let coCreatorProfiles: any[] = [];
  if (coCreatorIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", coCreatorIds);
    coCreatorProfiles = data || [];
  }
  
  const coCreatorMap = Object.fromEntries(
    coCreatorProfiles.map((p: any) => [p.id, p])
  );

  // Get like counts and my likes
  const [{ data: likeCounts }, { data: myLikes }, { data: commentCounts }] = await Promise.all([
    supabase.from("post_likes").select("post_id, count:user_id").in("post_id", ids).group("post_id"),
    supabase.from("post_likes").select("post_id").eq("user_id", uid).in("post_id", ids),
    supabase.from("post_comments").select("post_id, count:id").in("post_id", ids).group("post_id"),
  ]);

  const likeCountBy = Object.fromEntries((likeCounts ?? []).map((r: any) => [r.post_id, Number(r.count)]));
  const myLikeSet = new Set((myLikes ?? []).map((r: any) => r.post_id));
  const commentCountBy = Object.fromEntries((commentCounts ?? []).map((r: any) => [r.post_id, Number(r.count)]));

  const rows: Post[] = posts.map((p: any) => ({
    ...p,
    author: p.profiles || null,
    additional_media: p.post_media?.map((m: any) => ({ 
      url: m.url, 
      type: m.media_type as 'image' | 'video' 
    })) || [],
    co_creators_info: p.co_creators?.map((id: string) => coCreatorMap[id]).filter(Boolean) || [],
    like_count: likeCountBy[p.id] ?? 0,
    liked_by_me: myLikeSet.has(p.id),
    comment_count: commentCountBy[p.id] ?? 0,
    allow_share: p.allow_share ?? true,
  }));

  return { rows, error: null };
}

export async function createPost(
  body: string, 
  privacy: Post["privacy"] = "friends",
  options?: {
    image_url?: string;
    video_url?: string;
    media_type?: 'image' | 'video';
    allow_share?: boolean;
    co_creators?: string[] | null;
  }
) {
  const uid = await me();
  if (!uid) return { ok: false, error: "Not signed in" };
  
  const postData: any = {
    user_id: uid,
    body,
    privacy,
    allow_share: options?.allow_share ?? true,
    co_creators: options?.co_creators || null,
  };

  // Handle media
  if (options?.image_url) {
    postData.image_url = options.image_url;
  }
  if (options?.video_url) {
    postData.video_url = options.video_url;
  }

  const { data, error } = await supabase
    .from("posts")
    .insert(postData)
    .select()
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  // Send notifications to co-creators
  if (options?.co_creators && options.co_creators.length > 0) {
    await sendCoCreatorNotifications(data.id, uid, options.co_creators);
  }

  return { ok: true, error: null, data };
}

export async function updatePost(
  postId: string,
  updates: {
    body?: string;
    privacy?: Post["privacy"];
    allow_share?: boolean;
  }
) {
  const uid = await me();
  if (!uid) return { ok: false, error: "Not signed in" };

  // Check if user is creator or co-creator
  const { data: post } = await supabase
    .from("posts")
    .select("user_id, co_creators")
    .eq("id", postId)
    .single();

  if (!post) return { ok: false, error: "Post not found" };

  const canEdit = post.user_id === uid || 
    (post.co_creators && post.co_creators.includes(uid));

  if (!canEdit) return { ok: false, error: "Not authorized to edit this post" };

  const { error } = await supabase
    .from("posts")
    .update(updates)
    .eq("id", postId);

  return { ok: !error, error: error?.message || null };
}

export async function deletePost(postId: string) {
  const uid = await me();
  if (!uid) return { ok: false, error: "Not signed in" };

  // Only the original creator can delete
  const { data: post } = await supabase
    .from("posts")
    .select("user_id")
    .eq("id", postId)
    .single();

  if (!post || post.user_id !== uid) {
    return { ok: false, error: "Not authorized to delete this post" };
  }

  // Delete associated media first
  await supabase.from("post_media").delete().eq("post_id", postId);
  
  // Delete the post (likes and comments should cascade delete)
  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId);

  return { ok: !error, error: error?.message || null };
}

export async function addMediaToPost(
  postId: string,
  url: string,
  mediaType: 'image' | 'video'
) {
  const uid = await me();
  if (!uid) return { ok: false, error: "Not signed in" };

  // Check if user can edit
  const { data: post } = await supabase
    .from("posts")
    .select("user_id, co_creators")
    .eq("id", postId)
    .single();

  if (!post) return { ok: false, error: "Post not found" };

  const canEdit = post.user_id === uid || 
    (post.co_creators && post.co_creators.includes(uid));

  if (!canEdit) return { ok: false, error: "Not authorized to add media to this post" };

  // Add to post_media table
  const { error } = await supabase
    .from("post_media")
    .insert({
      post_id: postId,
      url,
      media_type: mediaType,
      uploaded_by: uid
    });

  return { ok: !error, error: error?.message || null };
}

export async function uploadMedia(file: File, type: 'image' | 'video') {
  const uid = await me();
  if (!uid) return { url: null, error: "Not signed in" };

  // File validation
  const maxSize = type === 'image' ? 5 * 1024 * 1024 : 50 * 1024 * 1024; // 5MB for images, 50MB for videos
  if (file.size > maxSize) {
    return { 
      url: null, 
      error: `File too large. Max size: ${type === 'image' ? '5MB' : '50MB'}` 
    };
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${uid}/${Date.now()}.${fileExt}`;
  const bucketName = type === 'image' ? 'post-images' : 'post-videos';

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    return { url: null, error: error.message };
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fileName);

  return { url: publicUrl, error: null };
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
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", post_id)
      .eq("user_id", uid);
    return { ok: !error, liked: false, error: error?.message || null };
  } else {
    const { error } = await supabase
      .from("post_likes")
      .insert({ post_id, user_id: uid });
    return { ok: !error, liked: true, error: error?.message || null };
  }
}

export async function addComment(post_id: string, body: string) {
  const uid = await me();
  if (!uid) return { ok: false, error: "Not signed in" };
  
  const { error } = await supabase
    .from("post_comments")
    .insert({ 
      post_id, 
      user_id: uid, 
      body 
    });
    
  return { ok: !error, error: error?.message || null };
}

export async function sendCoCreatorNotifications(
  postId: string,
  creatorId: string,
  coCreatorIds: string[]
) {
  // Get creator info
  const { data: creator } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", creatorId)
    .single();

  const creatorName = creator?.full_name || "Someone";

  // Send notifications to each co-creator
  const notifications = coCreatorIds.map(userId => ({
    user_id: userId,
    type: 'co_creator_invite',
    title: `${creatorName} tagged you in a post`,
    message: `You've been tagged as a co-creator. You can now add your own photos and videos to this post!`,
    link: `/post/${postId}`,
    created_at: new Date().toISOString()
  }));

  await supabase.from("notifications").insert(notifications);
}

export function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 52) return `${w}w ago`;
  return new Date(iso).toLocaleDateString();
}
