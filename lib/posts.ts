// lib/posts.ts
import { supabase } from "@/lib/supabaseClient";

export type MediaItem = {
  url: string;
  type: 'image' | 'video';
  id?: string; // Add ID for photo-specific interactions
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

  // FIXED: Add proper filtering for home feed
  let q = supabase
    .from("posts")
    .select("*")
    .or(`user_id.eq.${uid},visibility.eq.public`) // Show my posts + public posts
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) q = q.lt("created_at", before);

  const { data: posts, error } = await q;
  
  if (error) {
    console.error("Error fetching posts:", error);
    return { rows: [], error: error.message };
  }
  
  if (!posts || posts.length === 0) {
    return { rows: [], error: null };
  }

  const ids = posts.map((p: any) => p.id);
  const authorIds = [...new Set(posts.map((p: any) => p.user_id))];

  // Get author profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", authorIds);

  const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));

  // Get co-creator info if they exist
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

  // Try to get likes and comments
  let likeCountBy: Record<string, number> = {};
  let myLikeSet = new Set<string>();
  let commentCountBy: Record<string, number> = {};

  try {
    // Get all likes for these posts
    const { data: likeCounts } = await supabase
      .from("post_likes")
      .select("post_id")
      .in("post_id", ids);

    // Get my likes
    const { data: myLikes } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", uid)
      .in("post_id", ids);

    // Get all comments for these posts
    const { data: commentCounts } = await supabase
      .from("post_comments")
      .select("post_id")
      .in("post_id", ids);

    // Count likes per post
    if (likeCounts) {
      likeCounts.forEach((like: any) => {
        likeCountBy[like.post_id] = (likeCountBy[like.post_id] || 0) + 1;
      });
    }
    
    if (myLikes) {
      myLikeSet = new Set(myLikes.map((r: any) => r.post_id));
    }
    
    // Count comments per post
    if (commentCounts) {
      commentCounts.forEach((comment: any) => {
        commentCountBy[comment.post_id] = (commentCountBy[comment.post_id] || 0) + 1;
      });
    }
  } catch (e) {
    console.log("Error fetching likes/comments:", e);
  }

  // Get additional media from post_media table - FIXED with IDs
  let mediaByPost: Record<string, MediaItem[]> = {};
  
  try {
    // Query all post media at once (much more efficient)
    const { data: allMediaRows, error: mediaError } = await supabase
      .from("post_media")
      .select("id, post_id, storage_path, type")
      .in("post_id", ids)
      .order("sort_order", { ascending: true });
    
    if (!mediaError && allMediaRows) {
      // Group media by post_id
      for (const media of allMediaRows) {
        if (!mediaByPost[media.post_id]) {
          mediaByPost[media.post_id] = [];
        }
        
        // Get public URL from storage path
        const { data } = supabase.storage
          .from('post-media')
          .getPublicUrl(media.storage_path);
        
        mediaByPost[media.post_id].push({
          url: data.publicUrl,
          type: media.type as 'image' | 'video',
          id: media.id // Include media ID for photo-specific interactions
        });
      }
      
      console.log(`Found media for ${Object.keys(mediaByPost).length} posts`);
    }
  } catch (e) {
    console.log("Error fetching media:", e);
  }

  // Build the rows with all the data we have
  const rows: Post[] = posts.map((p: any) => {
    const postMedia = mediaByPost[p.id] || [];
    
    // Log what we're adding to each post
    if (postMedia.length > 0) {
      console.log(`Post ${p.id} has ${postMedia.length} additional media items`);
    }
    
    return {
      id: p.id,
      user_id: p.user_id,
      body: p.body,
      image_url: p.image_url || null,
      video_url: p.video_url || null,
      privacy: p.visibility || p.privacy || 'public', // Handle both field names
      created_at: p.created_at,
      allow_share: p.allow_share ?? true,
      co_creators: p.co_creators || null,
      author: profileMap[p.user_id] || null,
      additional_media: postMedia,
      co_creators_info: p.co_creators?.map((id: string) => coCreatorMap[id]).filter(Boolean) || [],
      like_count: likeCountBy[p.id] ?? 0,
      liked_by_me: myLikeSet.has(p.id),
      comment_count: commentCountBy[p.id] ?? 0,
    };
  });

  console.log('Final posts with media:', rows.map(r => ({
    id: r.id,
    media_count: r.additional_media?.length || 0,
    comment_count: r.comment_count
  })));

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
    media?: Array<{ url: string; type: 'image' | 'video' }>;
  }
) {
  const uid = await me();
  if (!uid) return { ok: false, error: "Not signed in" };
  
  const postData: any = {
    user_id: uid,
    body,
    visibility: privacy,  // Database expects 'visibility', not 'privacy'
    allow_share: options?.allow_share ?? true,
    co_creators: options?.co_creators || null,
  };

  // Handle single media for backward compatibility
  if (options?.image_url) {
    postData.image_url = options.image_url;
  }
  if (options?.video_url) {
    postData.video_url = options.video_url;
  }

  // If we have multiple media, use the first one as the main image/video
  if (options?.media && options.media.length > 0) {
    const firstMedia = options.media[0];
    
    // Get public URL for the first media to store in main fields
    const { data } = supabase.storage
      .from('post-media')
      .getPublicUrl(firstMedia.url);
    
    if (firstMedia.type === 'image') {
      postData.image_url = data.publicUrl;
    } else {
      postData.video_url = data.publicUrl;
    }
  }

  const { data, error } = await supabase
    .from("posts")
    .insert(postData)
    .select()
    .single();

  if (error) {
    console.error("Error creating post:", error);
    return { ok: false, error: error.message };
  }

  // Add ALL media to post_media table
  if (options?.media && options.media.length > 0) {
    const allMedia = options.media.map((m, index) => ({
      post_id: data.id,
      storage_path: m.url,  // This should be the storage path
      type: m.type,
      sort_order: index,
      created_by: uid,
      uploaded_by: uid
    }));

    const { error: mediaError } = await supabase
      .from("post_media")
      .insert(allMedia);

    if (mediaError) {
      console.error("Error adding media:", mediaError);
      // Don't fail the whole post, just log the error
    } else {
      console.log(`Added ${allMedia.length} media items to post ${data.id}`);
    }
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

  // Convert privacy to visibility for database
  const dbUpdates: any = { ...updates };
  if (updates.privacy) {
    dbUpdates.visibility = updates.privacy;
    delete dbUpdates.privacy;
  }

  const { error } = await supabase
    .from("posts")
    .update(dbUpdates)
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

  // Delete associated media from storage and database
  const { data: mediaItems } = await supabase
    .from("post_media")
    .select("storage_path")
    .eq("post_id", postId);

  if (mediaItems && mediaItems.length > 0) {
    // Delete from storage
    const filePaths = mediaItems.map(item => item.storage_path);
    await supabase.storage.from("post-media").remove(filePaths);
    
    // Delete from database
    await supabase.from("post_media").delete().eq("post_id", postId);
  }
  
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

  // Get current max sort_order
  const { data: existingMedia } = await supabase
    .from("post_media")
    .select("sort_order")
    .eq("post_id", postId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextSortOrder = existingMedia && existingMedia.length > 0 
    ? (existingMedia[0].sort_order || 0) + 1 
    : 0;

  // Add to post_media table
  const { error } = await supabase
    .from("post_media")
    .insert({
      post_id: postId,
      storage_path: url,  // This should be the storage path, not public URL
      type: mediaType,    
      created_by: uid,
      uploaded_by: uid,
      sort_order: nextSortOrder
    });

  if (!error) {
    console.log(`Successfully added media to post ${postId}`);
  }

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

  // FIXED: Better file extension handling
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${uid}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  console.log(`Uploading ${type}: ${fileName}`); // Add logging

  const { data, error } = await supabase.storage
    .from('post-media')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    return { url: null, error: error.message };
  }

  console.log(`Upload successful: ${data.path}`); // Add logging

  // Return the storage path, not the public URL
  // This will be stored in the database
  return { url: data.path, error: null };
}

// POST-LEVEL INTERACTIONS (existing)
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
  
  if (!body.trim()) {
    return { ok: false, error: "Comment cannot be empty" };
  }
  
  console.log(`Adding comment to post ${post_id}: "${body}"`);
  
  try {
    const { data, error } = await supabase
      .from("post_comments")
      .insert({ 
        post_id, 
        user_id: uid, 
        body: body.trim() // Ensure trimmed
      })
      .select()
      .single();
      
    if (!error) {
      console.log(`Comment added successfully:`, data);
    } else {
      console.error(`Error adding comment:`, error);
    }
      
    return { ok: !error, error: error?.message || null };
  } catch (err) {
    console.error('Comment error:', err);
    return { ok: false, error: 'Failed to add comment' };
  }
}

// PHOTO-LEVEL INTERACTIONS (new!)
export async function toggleMediaLike(media_id: string, reaction_type: string = 'like') {
  const uid = await me();
  if (!uid) return { ok: false, error: "Not signed in", liked: false };

  const { data: existing } = await supabase
    .from("media_likes")
    .select("media_id")
    .eq("media_id", media_id)
    .eq("user_id", uid)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("media_likes")
      .delete()
      .eq("media_id", media_id)
      .eq("user_id", uid);
    return { ok: !error, liked: false, error: error?.message || null };
  } else {
    const { error } = await supabase
      .from("media_likes")
      .insert({ media_id, user_id: uid, reaction_type });
    return { ok: !error, liked: true, error: error?.message || null };
  }
}

export async function getMediaLikes(media_id: string) {
  const uid = await me();
  
  const { data, error } = await supabase
    .from("media_likes")
    .select("user_id, reaction_type")
    .eq("media_id", media_id);

  if (error) {
    console.error('Error fetching media likes:', error);
    return { likes: [], liked_by_me: false, count: 0 };
  }

  const liked_by_me = uid ? data.some(like => like.user_id === uid) : false;
  
  return {
    likes: data || [],
    liked_by_me,
    count: data?.length || 0
  };
}

export async function addPhotoComment(media_id: string, body: string) {
  const uid = await me();
  if (!uid) return { ok: false, error: "Not signed in" };
  
  if (!body.trim()) {
    return { ok: false, error: "Comment cannot be empty" };
  }
  
  console.log(`Adding comment to photo ${media_id}: "${body}"`);
  
  try {
    // Get the post_id from the media
    const { data: media } = await supabase
      .from("post_media")
      .select("post_id")
      .eq("id", media_id)
      .single();

    if (!media) {
      return { ok: false, error: "Media not found" };
    }

    const { data, error } = await supabase
      .from("photo_comments")
      .insert({ 
        post_id: media.post_id,
        media_id,
        user_id: uid, 
        body: body.trim()
      })
      .select()
      .single();
      
    if (!error) {
      console.log(`Photo comment added successfully:`, data);
    } else {
      console.error(`Error adding photo comment:`, error);
    }
      
    return { ok: !error, data, error: error?.message || null };
  } catch (err) {
    console.error('Photo comment error:', err);
    return { ok: false, error: 'Failed to add photo comment' };
  }
}

export async function getPhotoComments(media_id: string) {
  try {
    // First get all comments for this media
    const { data: commentsData, error: commentsError } = await supabase
      .from("photo_comments")
      .select("id, body, created_at, user_id")
      .eq("media_id", media_id)
      .order("created_at", { ascending: true });
    
    if (commentsError) {
      console.error('Error loading photo comments:', commentsError);
      return { comments: [], error: commentsError.message };
    }
    
    if (!commentsData || commentsData.length === 0) {
      return { comments: [], error: null };
    }
    
    // Then fetch profile data for each unique user_id
    const userIds = [...new Set(commentsData.map(c => c.user_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);
    
    // Create a map of user profiles
    const profilesMap = new Map();
    if (profilesData) {
      profilesData.forEach(profile => {
        profilesMap.set(profile.id, {
          full_name: profile.full_name || 'User',
          avatar_url: profile.avatar_url || '/default-avatar.png'
        });
      });
    }
    
    // Combine comments with their profile data
    const formattedComments = commentsData.map((comment) => ({
      id: comment.id,
      body: comment.body,
      created_at: comment.created_at,
      user_id: comment.user_id,
      author: profilesMap.get(comment.user_id) || {
        full_name: 'User',
        avatar_url: '/default-avatar.png'
      }
    }));
    
    return { comments: formattedComments, error: null };
  } catch (error) {
    console.error('Error loading photo comments:', error);
    return { comments: [], error: 'Failed to load comments' };
  }
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

  // ============================================
// UNIVERSAL COMMENT SYSTEM
// Add these functions to the END of lib/posts.ts
// ============================================

export type EntityType = 'post' | 'album' | 'gallery' | 'event' | 'good_news' | 'photo';

export interface Comment {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  parent_id?: string | null;
  author?: {
    full_name: string;
    avatar_url: string;
  };
  replies?: Comment[];
}

// Map entity types to their table names and column names
const COMMENT_CONFIG = {
  post: { table: 'post_comments', idColumn: 'post_id', parentColumn: 'parent_comment_id', bodyColumn: 'body' },
  album: { table: 'album_comments', idColumn: 'album_id', parentColumn: 'parent_id', bodyColumn: 'body' },
  gallery: { table: 'gallery_comments', idColumn: 'gallery_item_id', parentColumn: 'parent_id', bodyColumn: 'text' },
  event: { table: 'event_comments', idColumn: 'event_id', parentColumn: 'parent_id', bodyColumn: 'body' },
  good_news: { table: 'good_news_comments', idColumn: 'post_id', parentColumn: 'parent_id', bodyColumn: 'content' },
  photo: { table: 'photo_comments', idColumn: 'media_id', parentColumn: 'parent_id', bodyColumn: 'body' }
};

/**
 * Get all comments for an entity (posts, albums, events, galleries, etc.)
 */
export async function getComments(entityType: EntityType, entityId: string) {
  try {
    const config = COMMENT_CONFIG[entityType];
    if (!config) {
      return { comments: [], error: 'Invalid entity type' };
    }

    // Get all comments for this entity
    const { data: commentsData, error: commentsError } = await supabase
      .from(config.table)
      .select('id, user_id, created_at, ' + config.bodyColumn + ', ' + config.parentColumn)
      .eq(config.idColumn, entityId)
      .order('created_at', { ascending: true });
    
    if (commentsError) {
      console.error(`Error loading ${entityType} comments:`, commentsError);
      return { comments: [], error: commentsError.message };
    }
    
    if (!commentsData || commentsData.length === 0) {
      return { comments: [], error: null };
    }
    
    // Get unique user IDs
    const userIds = [...new Set(commentsData.map((c: any) => c.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);
    
    // Create profile map
    const profilesMap = new Map();
    if (profilesData) {
      profilesData.forEach(profile => {
        profilesMap.set(profile.id, {
          full_name: profile.full_name || 'User',
          avatar_url: profile.avatar_url || '/default-avatar.png'
        });
      });
    }
    
    // Format comments with consistent structure
    const formattedComments: Comment[] = commentsData.map((comment: any) => ({
      id: comment.id,
      body: comment[config.bodyColumn],
      created_at: comment.created_at,
      user_id: comment.user_id,
      parent_id: comment[config.parentColumn] || null,
      author: profilesMap.get(comment.user_id) || {
        full_name: 'User',
        avatar_url: '/default-avatar.png'
      }
    }));
    
    // Build threaded structure (parent comments with nested replies)
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];
    
    // First pass: create map and identify root comments
    formattedComments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
      if (!comment.parent_id) {
        rootComments.push(commentMap.get(comment.id)!);
      }
    });
    
    // Second pass: build reply tree
    formattedComments.forEach(comment => {
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies = parent.replies || [];
          parent.replies.push(commentMap.get(comment.id)!);
        }
      }
    });
    
    return { comments: rootComments, error: null };
  } catch (error) {
    console.error(`Error loading ${entityType} comments:`, error);
    return { comments: [], error: 'Failed to load comments' };
  }
}

/**
 * Add a comment or reply to an entity
 */
export async function addEntityComment(
  entityType: EntityType, 
  entityId: string, 
  body: string,
  parentId?: string | null
) {
  const uid = await me();
  if (!uid) return { ok: false, error: 'Not signed in' };
  
  if (!body.trim()) {
    return { ok: false, error: 'Comment cannot be empty' };
  }
  
  const config = COMMENT_CONFIG[entityType];
  if (!config) {
    return { ok: false, error: 'Invalid entity type' };
  }
  
  try {
    const insertData: any = {
      [config.idColumn]: entityId,
      user_id: uid,
      [config.bodyColumn]: body.trim()
    };
    
    // Add parent_id if this is a reply
    if (parentId) {
      insertData[config.parentColumn] = parentId;
    }
    
    // Special case for photo comments - need post_id
    if (entityType === 'photo') {
      const { data: media } = await supabase
        .from('post_media')
        .select('post_id')
        .eq('id', entityId)
        .single();
      
      if (media) {
        insertData.post_id = media.post_id;
      }
    }
    
    const { data, error } = await supabase
      .from(config.table)
      .insert(insertData)
      .select()
      .single();
      
    if (!error) {
      console.log(`${entityType} comment added successfully:`, data);
    } else {
      console.error(`Error adding ${entityType} comment:`, error);
    }
      
    return { ok: !error, data, error: error?.message || null };
  } catch (err) {
    console.error(`${entityType} comment error:`, err);
    return { ok: false, error: 'Failed to add comment' };
  }
}

/**
 * Update a comment
 */
export async function updateEntityComment(
  entityType: EntityType,
  commentId: string,
  body: string
) {
  const uid = await me();
  if (!uid) return { ok: false, error: 'Not signed in' };
  
  if (!body.trim()) {
    return { ok: false, error: 'Comment cannot be empty' };
  }
  
  const config = COMMENT_CONFIG[entityType];
  if (!config) {
    return { ok: false, error: 'Invalid entity type' };
  }
  
  try {
    const updateData: any = {
      [config.bodyColumn]: body.trim(),
      is_edited: true,
      edited_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from(config.table)
      .update(updateData)
      .eq('id', commentId)
      .eq('user_id', uid);
    
    return { ok: !error, error: error?.message || null };
  } catch (err) {
    console.error(`Error updating ${entityType} comment:`, err);
    return { ok: false, error: 'Failed to update comment' };
  }
}

/**
 * Delete a comment
 */
export async function deleteEntityComment(
  entityType: EntityType,
  commentId: string
) {
  const uid = await me();
  if (!uid) return { ok: false, error: 'Not signed in' };
  
  const config = COMMENT_CONFIG[entityType];
  if (!config) {
    return { ok: false, error: 'Invalid entity type' };
  }
  
  try {
    const { error } = await supabase
      .from(config.table)
      .delete()
      .eq('id', commentId)
      .eq('user_id', uid);
    
    return { ok: !error, error: error?.message || null };
  } catch (err) {
    console.error(`Error deleting ${entityType} comment:`, err);
    return { ok: false, error: 'Failed to delete comment' };
  }
}
