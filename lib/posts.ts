// lib/posts.ts - FIXED: Image Upload & Comments System
import { supabase } from "./supabaseClient";

// Get current user ID
async function me(): Promise<string | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user.id;
}

export interface Post {
  id: string;
  user_id: string;
  body?: string;
  image_url?: string;
  video_url?: string;
  privacy: 'private' | 'friends' | 'public';
  created_at: string;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  allow_share: boolean;
  co_creators?: string[];
  tagged_users?: string[];
  author?: {
    full_name: string;
    avatar_url: string;
  };
  // FIXED: Add media array for multiple files
  media?: Array<{ url: string; type: 'image' | 'video' }>;
}

// FIXED: Upload media to storage
export async function uploadMedia(file: File, type: 'image' | 'video') {
  const uid = await me();
  if (!uid) return { url: null, error: "Not signed in" };

  // File validation
  const maxSize = type === 'image' ? 10 * 1024 * 1024 : 100 * 1024 * 1024; // 10MB for images, 100MB for videos
  if (file.size > maxSize) {
    return { 
      url: null, 
      error: `File too large. Max size: ${type === 'image' ? '10MB' : '100MB'}` 
    };
  }

  // Get file extension
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const allowedTypes = type === 'image' 
    ? ['jpg', 'jpeg', 'png', 'gif', 'webp']
    : ['mp4', 'mov', 'avi', 'mkv', 'webm'];

  if (!allowedTypes.includes(fileExt)) {
    return {
      url: null,
      error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`
    };
  }

  try {
    // Create unique filename with timestamp
    const timestamp = Date.now();
    const fileName = `${uid}/${type}s/${timestamp}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    console.log(`Uploading ${type}: ${fileName}`);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('post-media')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Storage upload error:', error);
      return { url: null, error: error.message };
    }

    if (!data) {
      return { url: null, error: 'Upload failed - no data returned' };
    }

    console.log(`Successfully uploaded to: ${data.path}`);
    
    // Return the storage path (not the public URL) for database storage
    return { url: data.path, error: null };

  } catch (error) {
    console.error('Upload error:', error);
    return { url: null, error: 'Upload failed' };
  }
}

// FIXED: Add media to existing post
export async function addMediaToPost(
  postId: string,
  storagePath: string,
  mediaType: 'image' | 'video'
) {
  const uid = await me();
  if (!uid) return { ok: false, error: "Not signed in" };

  try {
    // Check if user can edit this post
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

    // Insert into post_media table
    const { error } = await supabase
      .from("post_media")
      .insert({
        post_id: postId,
        storage_path: storagePath,  // Store the storage path
        type: mediaType,    
        created_by: uid,
        uploaded_by: uid,
        sort_order: nextSortOrder
      });

    if (error) {
      console.error('Error adding media to post:', error);
      return { ok: false, error: error.message };
    }

    console.log(`Successfully added ${mediaType} to post ${postId}`);
    return { ok: true, error: null };

  } catch (error) {
    console.error('Error in addMediaToPost:', error);
    return { ok: false, error: 'Failed to add media to post' };
  }
}

// FIXED: Create post with multiple media support
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
  
  try {
    const postData: any = {
      user_id: uid,
      body,
      visibility: privacy,  // Database uses 'visibility' field
      allow_share: options?.allow_share ?? true,
      co_creators: options?.co_creators || null,
    };

    // Handle legacy single media
    if (options?.image_url) {
      postData.image_url = options.image_url;
    }
    if (options?.video_url) {
      postData.video_url = options.video_url;
    }

    // Create the post
    const { data, error } = await supabase
      .from("posts")
      .insert(postData)
      .select()
      .single();

    if (error) {
      console.error("Error creating post:", error);
      return { ok: false, error: error.message };
    }

    // FIXED: Add all media to post_media table
    if (options?.media && options.media.length > 0) {
      console.log(`Adding ${options.media.length} media items to post ${data.id}`);
      
      const mediaInserts = options.media.map((m, index) => ({
        post_id: data.id,
        storage_path: m.url,  // This should be the storage path from uploadMedia
        type: m.type,
        sort_order: index,
        created_by: uid,
        uploaded_by: uid
      }));

      const { error: mediaError } = await supabase
        .from("post_media")
        .insert(mediaInserts);

      if (mediaError) {
        console.error("Error adding media to post:", mediaError);
        // Don't fail the whole post creation, just log the error
      } else {
        console.log(`Successfully added ${mediaInserts.length} media items`);
      }
    }

    return { ok: true, error: null, data };

  } catch (error) {
    console.error("Error in createPost:", error);
    return { ok: false, error: 'Failed to create post' };
  }
}

// FIXED: Update post
export async function updatePost(
  postId: string,
  updates: {
    body?: string;
    privacy?: Post["privacy"];
    allow_share?: boolean;
    co_creators?: string[];
    tagged_users?: string[];
  }
) {
  const uid = await me();
  if (!uid) return { ok: false, error: "Not signed in" };

  try {
    // Check if user can edit
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

    if (error) {
      console.error('Error updating post:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true, error: null };

  } catch (error) {
    console.error('Error in updatePost:', error);
    return { ok: false, error: 'Failed to update post' };
  }
}

// FIXED: Delete post and associated media
export async function deletePost(postId: string) {
  const uid = await me();
  if (!uid) return { ok: false, error: "Not signed in" };

  try {
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
    
    // Delete the post (comments and likes should cascade)
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);

    if (error) {
      console.error('Error deleting post:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true, error: null };

  } catch (error) {
    console.error('Error in deletePost:', error);
    return { ok: false, error: 'Failed to delete post' };
  }
}

// FIXED: Toggle like
export async function toggleLike(postId: string) {
  const uid = await me();
  if (!uid) return { ok: false, error: "Not signed in" };

  try {
    // Check if already liked
    const { data: existingLike } = await supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", uid)
      .single();

    if (existingLike) {
      // Unlike
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", uid);

      if (error) {
        console.error('Error removing like:', error);
        return { ok: false, error: error.message };
      }
    } else {
      // Like
      const { error } = await supabase
        .from("post_likes")
        .insert({ post_id: postId, user_id: uid });

      if (error) {
        console.error('Error adding like:', error);
        return { ok: false, error: error.message };
      }
    }

    return { ok: true, error: null };

  } catch (error) {
    console.error('Error in toggleLike:', error);
    return { ok: false, error: 'Failed to toggle like' };
  }
}

// FIXED: Add comment
export async function addComment(postId: string, body: string) {
  const uid = await me();
  if (!uid) return { ok: false, error: "Not signed in" };

  if (!body.trim()) {
    return { ok: false, error: "Comment cannot be empty" };
  }

  try {
    const { error } = await supabase
      .from("post_comments")
      .insert({
        post_id: postId,
        user_id: uid,
        body: body.trim()
      });

    if (error) {
      console.error('Error adding comment:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true, error: null };

  } catch (error) {
    console.error('Error in addComment:', error);
    return { ok: false, error: 'Failed to add comment' };
  }
}

// FIXED: Fetch posts with proper media loading
export async function fetchPosts(userId?: string): Promise<Post[]> {
  const uid = await me();
  if (!uid) return [];

  try {
    let query = supabase
      .from("posts")
      .select(`
        id,
        user_id,
        body,
        image_url,
        video_url,
        visibility,
        created_at,
        allow_share,
        co_creators,
        tagged_users,
        profiles!inner(
          full_name,
          avatar_url
        )
      `)
      .order("created_at", { ascending: false });

    // Filter by user if specified
    if (userId) {
      query = query.eq("user_id", userId);
    } else {
      // For feed, show posts from friends or public posts
      query = query.or(`user_id.eq.${uid},visibility.eq.public,co_creators.cs.{${uid}}`);
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error("Error fetching posts:", error);
      return [];
    }

    if (!posts) return [];

    const postIds = posts.map(p => p.id);

    // FIXED: Get likes, comments, and media in parallel
    const [likeData, commentData, mediaData] = await Promise.all([
      // Get like counts and user's likes
      supabase
        .from("post_likes")
        .select("post_id, user_id")
        .in("post_id", postIds),

      // Get comment counts
      supabase
        .from("post_comments")
        .select("post_id")
        .in("post_id", postIds),

      // Get additional media
      supabase
        .from("post_media")
        .select("post_id, storage_path, type, sort_order")
        .in("post_id", postIds)
        .order("sort_order", { ascending: true })
    ]);

    // Process likes
    const likeCountBy: Record<string, number> = {};
    const myLikeSet = new Set<string>();
    
    if (likeData.data) {
      likeData.data.forEach((like: any) => {
        likeCountBy[like.post_id] = (likeCountBy[like.post_id] || 0) + 1;
        if (like.user_id === uid) {
          myLikeSet.add(like.post_id);
        }
      });
    }

    // Process comments
    const commentCountBy: Record<string, number> = {};
    if (commentData.data) {
      commentData.data.forEach((comment: any) => {
        commentCountBy[comment.post_id] = (commentCountBy[comment.post_id] || 0) + 1;
      });
    }

    // FIXED: Process media properly
    const mediaByPost: Record<string, Array<{ url: string; type: 'image' | 'video' }>> = {};
    if (mediaData.data) {
      mediaData.data.forEach((media: any) => {
        if (!mediaByPost[media.post_id]) {
          mediaByPost[media.post_id] = [];
        }
        
        // Get public URL from storage path
        const { data } = supabase.storage
          .from('post-media')
          .getPublicUrl(media.storage_path);
        
        mediaByPost[media.post_id].push({
          url: data.publicUrl,
          type: media.type
        });
      });
    }

    // Build final post objects
    const result: Post[] = posts.map((p: any) => ({
      id: p.id,
      user_id: p.user_id,
      body: p.body,
      image_url: p.image_url,
      video_url: p.video_url,
      privacy: p.visibility || 'friends', // Map visibility back to privacy
      created_at: p.created_at,
      like_count: likeCountBy[p.id] || 0,
      comment_count: commentCountBy[p.id] || 0,
      liked_by_me: myLikeSet.has(p.id),
      allow_share: p.allow_share ?? true,
      co_creators: p.co_creators || [],
      tagged_users: p.tagged_users || [],
      author: {
        full_name: p.profiles.full_name || 'Unknown User',
        avatar_url: p.profiles.avatar_url || '/default-avatar.png'
      },
      // FIXED: Include additional media
      media: mediaByPost[p.id] || []
    }));

    console.log(`Fetched ${result.length} posts with media`);
    return result;

  } catch (error) {
    console.error("Error in fetchPosts:", error);
    return [];
  }
}
