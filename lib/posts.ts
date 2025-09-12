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

  console.log(`Loading feed for user: ${uid}`);

  // Get current user's friends
  const { data: friendships } = await supabase
    .from("friendships")
    .select("user_id, friend_id")
    .or(`user_id.eq.${uid},friend_id.eq.${uid}`)
    .eq("status", "accepted");

  const friendIds = new Set<string>();
  (friendships || []).forEach(f => {
    if (f.user_id === uid) {
      friendIds.add(f.friend_id);
    } else {
      friendIds.add(f.user_id);
    }
  });
  
  const friendIdsArray = Array.from(friendIds);
  console.log(`User has ${friendIdsArray.length} friends:`, friendIdsArray);

  // Fetch posts from social_posts table (NOTE: Changed from 'posts' to 'social_posts')
  let q = supabase
    .from("social_posts")  // CHANGED TO social_posts
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit * 3);

  if (before) q = q.lt("created_at", before);

  const { data: allPosts, error } = await q;
  
  if (error) {
    console.error("Error fetching posts:", error);
    return { rows: [], error: error.message };
  }
  
  if (!allPosts?.length) {
    console.log("No posts found");
    return { rows: [], error: null };
  }

  console.log(`Fetched ${allPosts.length} posts from database`);

  // Filter posts based on visibility
  const visiblePosts = allPosts.filter(post => {
    // User's own posts
    if (post.user_id === uid) {
      console.log(`Post ${post.id}: Own post - VISIBLE`);
      return true;
    }
    
    // Posts where user is a co-creator
    if (post.co_creators?.includes(uid)) {
      console.log(`Post ${post.id}: Co-creator - VISIBLE`);
      return true;
    }
    
    // Public posts
    if (post.visibility === "public") {
      console.log(`Post ${post.id}: Public - VISIBLE`);
      return true;
    }
    
    // Private posts - skip unless creator/co-creator
    if (post.visibility === "private") {
      console.log(`Post ${post.id}: Private - HIDDEN`);
      return false;
    }
    
    // Friends posts - check if user is friends with creator OR any co-creator
    if (post.visibility === "friends") {
      // Check creator
      if (friendIdsArray.includes(post.user_id)) {
        console.log(`Post ${post.id}: Friend's post - VISIBLE`);
        return true;
      }
      
      // Check co-creators
      if (post.co_creators?.length) {
        const isFriendWithCoCreator = post.co_creators.some(id => friendIdsArray.includes(id));
        if (isFriendWithCoCreator) {
          console.log(`Post ${post.id}: Friend is co-creator - VISIBLE`);
          return true;
        }
      }
      
      console.log(`Post ${post.id}: Not friends with any creator - HIDDEN`);
      return false;
    }
    
    return false;
  }).slice(0, limit);

  console.log(`Showing ${visiblePosts.length} posts after filtering`);

  if (!visiblePosts.length) {
    return { rows: [], error: null };
  }

  // Get all the additional data
  const postIds = visiblePosts.map(p => p.id);
  const allUserIds = new Set<string>();
  
  visiblePosts.forEach(p => {
    allUserIds.add(p.user_id);
    p.co_creators?.forEach(id => allUserIds.add(id));
  });

  const [
    { data: profiles },
    { data: likes },
    { data: myLikes },
    { data: comments },
    { data: shares }
  ] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url").in("id", Array.from(allUserIds)),
    supabase.from("post_likes").select("post_id").in("post_id", postIds),
    supabase.from("post_likes").select("post_id").eq("user_id", uid).in("post_id", postIds),
    supabase.from("post_comments").select("*").in("post_id", postIds).order("created_at"),
    supabase.from("social_posts").select("id").in("shared_from_id", postIds)  // CHANGED TO social_posts
  ]);

  // Build lookup maps
  const profilesById = Object.fromEntries((profiles || []).map(p => [p.id, p]));
  const likesByPost = postIds.reduce((acc, id) => {
    acc[id] = (likes || []).filter(l => l.post_id === id).length;
    return acc;
  }, {} as Record<string, number>);
  const myLikedPosts = new Set((myLikes || []).map(l => l.post_id));
  const sharesByPost = postIds.reduce((acc, id) => {
    acc[id] = (shares || []).filter(s => s.shared_from_id === id).length;
    return acc;
  }, {} as Record<string, number>);

  // Get comment authors
  const commentAuthorIds = [...new Set((comments || []).map(c => c.user_id))];
  const { data: commentAuthors } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", commentAuthorIds);
  
  const commentAuthorsById = Object.fromEntries((commentAuthors || []).map(p => [p.id, p]));

  // Build final post objects
  const rows: Post[] = visiblePosts.map(post => {
    const postComments = (comments || [])
      .filter(c => c.post_id === post.id)
      .map(c => ({
        ...c,
        author: commentAuthorsById[c.user_id] || { id: c.user_id, full_name: "Anonymous", avatar_url: null }
      }));

    const coAuthors = (post.co_creators || [])
      .filter(id => id !== post.user_id)
      .map(id => profilesById[id] || { id, full_name: "Anonymous", avatar_url: null });

    return {
      ...post,
      privacy: post.privacy || post.visibility,
      author: profilesById[post.user_id] || { id: post.user_id, full_name: "Anonymous", avatar_url: null },
      co_authors: coAuthors,
      like_count: likesByPost[post.id] || 0,
      liked_by_me: myLikedPosts.has(post.id),
      comment_count: postComments.length,
      comments: postComments,
      share_count: sharesByPost[post.id] || 0
    };
  });

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
    visibility: privacy,
    privacy: privacy,
    body: body || null,
    allow_share: options?.allow_share ?? true,
    co_creators: options?.co_creators || []
  };

  // Add media fields
  if (options?.image_url) {
    postData.images = [{ url: options.image_url }];
    postData.image_url = options.image_url;
  }
  if (options?.video_url) postData.video_url = options.video_url;
  if (options?.gif_url) postData.gif_url = options.gif_url;
  if (options?.media_type) postData.media_type = options.media_type;
  if (options?.shared_from_id) postData.shared_from_id = options.shared_from_id;
  
  console.log("Creating post with data:", postData);
  
  // Insert into social_posts table (CHANGED FROM posts)
  const { data, error } = await supabase
    .from("social_posts")  // CHANGED TO social_posts
    .insert(postData)
    .select()
    .single();
  
  if (error) {
    console.error("Error creating post:", error);
    return { ok: false, error: error.message };
  }
  
  console.log("Post created successfully:", data);
  
  // Send notifications to co-creators
  if (options?.co_creators?.length) {
    const { data: creatorProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", uid)
      .single();
    
    const notifications = options.co_creators.map(coCreatorId => ({
      user_id: coCreatorId,
      type: 'co_creator_added',
      title: 'You were added as a co-creator!',
      body: `${creatorProfile?.full_name || "Someone"} added you as a co-creator on their post`,
      related_post_id: data.id,
      from_user_id: uid,
      read: false
    }));
    
    await supabase.from("notifications").insert(notifications);
  }
  
  return { ok: true, error: null, data };
}

export async function updatePost(postId: string, updates: { body?: string; privacy?: Post["privacy"] }) {
  const uid = await me();
  if (!uid) return { ok: false, error: "Not signed in" };
  
  const { data: post } = await supabase
    .from("social_posts")  // CHANGED TO social_posts
    .select("user_id, co_creators")
    .eq("id", postId)
    .single();
    
  if (!post) return { ok: false, error: "Post not found" };
  
  const isAuthorized = post.user_id === uid || (post.co_creators || []).includes(uid);
  if (!isAuthorized) return { ok: false, error: "Not authorized" };
  
  const updateData: any = {
    edited_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  if (updates.body !== undefined) updateData.body = updates.body;
  if (updates.privacy !== undefined) {
    updateData.visibility = updates.privacy;
    updateData.privacy = updates.privacy;
  }
  
  const { error } = await supabase
    .from("social_posts")  // CHANGED TO social_posts
    .update(updateData)
    .eq("id", postId);
    
  return { ok: !error, error: error?.message || null };
}

export async function deletePost(postId: string) {
  const uid = await me();
  if (!uid) return { ok: false, error: "Not signed in" };
  
  const { data: post } = await supabase
    .from("social_posts")  // CHANGED TO social_posts
    .select("user_id")
    .eq("id", postId)
    .single();
    
  if (!post || post.user_id !== uid) {
    return { ok: false, error: "Not authorized" };
  }
  
  const { error } = await supabase
    .from("social_posts")  // CHANGED TO social_posts
    .delete()
    .eq("id", postId);
    
  return { ok: !error, error: error?.message || null };
}

export async function sharePost(postId: string, target: 'feed' | 'calendar', body?: string) {
  const uid = await me();
  if (!uid) return { ok: false, error: "Not signed in" };
  
  const { data: post } = await supabase
    .from("social_posts")  // CHANGED TO social_posts
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
