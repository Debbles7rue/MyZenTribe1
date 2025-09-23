// components/PostComposer.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import SimpleFriendDropdown from "@/components/SimpleFriendDropdown";

// Types
type MediaFile = {
  id?: string;
  url: string;
  storage_path: string;
  type: 'image' | 'video';
  preview?: string;
  uploaded_by?: string;
};

type Post = {
  id: string;
  user_id: string;
  body: string | null;
  caption: string | null;
  description: string | null;
  privacy: "private" | "friends" | "public";
  allow_share: boolean;
  co_creators: string[] | null;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  media_files?: MediaFile[];
  co_creators_info?: Array<{
    id: string;
    full_name: string;
    avatar_url: string | null;
    status: 'invited' | 'accepted' | 'declined';
  }>;
  likes_count: number;
  comments_count: number;
  comments?: Comment[];
  liked_by_viewer?: boolean;
};

type Comment = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  author?: {
    full_name: string;
    avatar_url: string | null;
  };
};

export type { Post }; // Export Post type for PostCard

interface PostComposerProps {
  mode?: 'feed' | 'profile' | 'both';
  userId?: string | null;
  viewerUserId?: string | null;
  onPostCreated?: () => void;
  showComposer?: boolean;
  className?: string;
}

// Helper function to upload media (for backward compatibility with PostCard)
export async function uploadMedia(file: File, type: 'image' | 'video'): Promise<{ url: string | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { url: null, error: 'Not authenticated' };

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const filename = `${timestamp}-${randomStr}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const path = `posts/${user.id}/${filename}`;

    const { error: uploadError, data } = await supabase.storage
      .from("post-media")
      .upload(path, file);

    if (uploadError) return { url: null, error: uploadError.message };

    const { data: urlData } = supabase.storage
      .from("post-media")
      .getPublicUrl(path);

    return { url: urlData.publicUrl, error: null };
  } catch (error: any) {
    return { url: null, error: error.message };
  }
}

export default function PostComposer({
  mode = 'both',
  userId,
  viewerUserId,
  onPostCreated,
  showComposer = true,
  className = ""
}: PostComposerProps) {
  // Composer State
  const [body, setBody] = useState("");
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<Post["privacy"]>("friends");
  const [allowShare, setAllowShare] = useState(true);
  const [coCreators, setCoCreators] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCoCreators, setShowCoCreators] = useState(false);
  
  // Display State
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrivacy, setEditPrivacy] = useState<Post["privacy"]>("friends");
  const [editFiles, setEditFiles] = useState<FileList | null>(null);
  const [commentText, setCommentText] = useState<{ [postId: string]: string }>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  const canPost = showComposer && viewerUserId && (!userId || userId === viewerUserId);

  // Meditation-themed emojis
  const zenEmojis = ['🧘', '🙏', '✨', '💜', '🌸', '☮️', '🕉️', '💫', '🌟', '🤲', '🧘‍♀️', '🧘‍♂️', '🌺', '🍃', '🌿'];

  // Show message helper
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Load posts
  async function loadPosts() {
    setLoading(true);
    try {
      let query = supabase
        .from("posts")
        .select(`
          *,
          profiles!posts_user_id_fkey(id, full_name, avatar_url)
        `)
        .order("created_at", { ascending: false });

      // Filter based on mode and userId
      if (mode === 'profile' && userId) {
        // Get posts by user OR where user is co-creator
        query = query.or(`user_id.eq.${userId},co_creators.cs.{${userId}}`);
      } else if (mode === 'feed') {
        // Get public posts and friends' posts
        if (viewerUserId) {
          // TODO: Add friend relationship filtering
          query = query.or('privacy.eq.public,privacy.eq.friends');
        } else {
          query = query.eq('privacy', 'public');
        }
      }

      const { data: posts, error } = await query;
      if (error) throw error;

      // Process posts with media
      const processedPosts = await Promise.all((posts || []).map(async (post) => {
        // Get media files
        const { data: mediaData } = await supabase
          .from("post_media")
          .select("*")
          .eq("post_id", post.id)
          .order("sort_order");

        const mediaFiles: MediaFile[] = [];
        for (const media of mediaData || []) {
          // Handle both buckets for backward compatibility
          const bucket = media.storage_path.includes('event-photos') ? 'event-photos' : 'post-media';
          const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(media.storage_path);
          
          mediaFiles.push({
            id: media.id,
            url: urlData.publicUrl,
            storage_path: media.storage_path,
            type: media.type as 'image' | 'video',
            uploaded_by: media.uploaded_by
          });
        }

        // Get co-creator info if exists
        let coCreatorsInfo = [];
        if (post.co_creators?.length) {
          const { data: coCreatorProfiles } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", post.co_creators);
          
          // Get co-creator statuses
          const { data: coCreatorStatuses } = await supabase
            .from("post_collaborators")
            .select("user_id, status")
            .eq("post_id", post.id)
            .in("user_id", post.co_creators);
          
          coCreatorsInfo = (coCreatorProfiles || []).map(profile => ({
            ...profile,
            status: coCreatorStatuses?.find(s => s.user_id === profile.id)?.status || 'invited'
          }));
        }

        // Get likes and comments counts
        const [{ count: likesCount }, { count: commentsCount }] = await Promise.all([
          supabase.from("post_likes").select("*", { count: 'exact', head: true }).eq("post_id", post.id),
          supabase.from("post_comments").select("*", { count: 'exact', head: true }).eq("post_id", post.id)
        ]);

        // Check if viewer liked
        let likedByViewer = false;
        if (viewerUserId) {
          const { data: like } = await supabase
            .from("post_likes")
            .select("id")
            .eq("post_id", post.id)
            .eq("user_id", viewerUserId)
            .single();
          likedByViewer = !!like;
        }

        // Get comments
        const { data: comments } = await supabase
          .from("post_comments")
          .select(`
            *,
            profiles!inner(full_name, avatar_url)
          `)
          .eq("post_id", post.id)
          .order("created_at");

        return {
          ...post,
          author: post.profiles,
          media_files: mediaFiles,
          co_creators_info: coCreatorsInfo,
          likes_count: likesCount || 0,
          comments_count: commentsCount || 0,
          comments: comments?.map(c => ({
            ...c,
            author: c.profiles
          })) || [],
          liked_by_viewer: likedByViewer
        };
      }));

      setPosts(processedPosts);
    } catch (err) {
      console.error("Error loading posts:", err);
      showMessage('error', 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }

  // Create post
  async function createPost() {
    if (!viewerUserId) return;
    if (!body.trim() && !caption.trim() && !selectedFiles?.length) {
      showMessage('error', 'Please add content or media');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Prepare post data
      const postData: any = {
        user_id: viewerUserId,
        body: body.trim() || caption.trim() || "Shared a moment",
        privacy,
        allow_share: allowShare,
        co_creators: coCreators.length > 0 ? coCreators : null
      };

      // Add caption and description if they exist
      if (caption.trim()) postData.caption = caption.trim();
      if (description.trim()) postData.description = description.trim();

      // Create post
      const { data: newPost, error: postError } = await supabase
        .from("posts")
        .insert(postData)
        .select()
        .single();

      if (postError) throw postError;

      // Upload media if any
      if (selectedFiles && selectedFiles.length > 0) {
        const mediaRecords = [];
        
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
          
          const timestamp = Date.now();
          const randomStr = Math.random().toString(36).substring(7);
          const filename = `${timestamp}-${randomStr}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const path = `posts/${viewerUserId}/${filename}`;

          const { error: uploadError } = await supabase.storage
            .from("post-media")
            .upload(path, file);

          if (uploadError) {
            console.error(`Failed to upload file ${i + 1}:`, uploadError);
            continue;
          }

          mediaRecords.push({
            post_id: newPost.id,
            storage_path: path,
            type: file.type.startsWith('video') ? 'video' : 'image',
            sort_order: i,
            uploaded_by: viewerUserId
          });
        }

        // Insert media records
        if (mediaRecords.length > 0) {
          await supabase.from("post_media").insert(mediaRecords);
        }
      }

      // Add collaborators
      if (coCreators.length > 0) {
        const collaboratorRecords = coCreators.map(userId => ({
          post_id: newPost.id,
          user_id: userId,
          status: 'invited',
          can_edit: true
        }));
        
        try {
          await supabase.from("post_collaborators").insert(collaboratorRecords);
        } catch (err) {
          console.error("Error adding collaborators:", err);
        }

        // Send notifications
        const notifications = coCreators.map(userId => ({
          user_id: userId,
          type: 'collaboration_invite',
          message: `You've been invited to collaborate on a post`,
          post_id: newPost.id,
          from_user_id: viewerUserId
        }));
        
        try {
          await supabase.from("notifications").insert(notifications);
        } catch (err) {
          console.error("Error sending notifications:", err);
        }
      }

      // Reset form
      setBody("");
      setCaption("");
      setDescription("");
      setPrivacy("friends");
      setAllowShare(true);
      setCoCreators([]);
      setSelectedFiles(null);
      setShowCoCreators(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";

      showMessage('success', 'Post created successfully! 🎉');
      await loadPosts();
      
      if (onPostCreated) onPostCreated();
    } catch (err: any) {
      console.error("Error creating post:", err);
      showMessage('error', err.message || 'Failed to create post');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  // Handle media selection
  async function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(files);
    }
  }

  // Remove media
  function removeMedia() {
    setSelectedFiles(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  }

  // Update post
  async function updatePost() {
    if (!editingPostId || !viewerUserId) return;

    setUploading(true);
    try {
      const post = posts.find(p => p.id === editingPostId);
      if (!post) return;

      // Update post content
      const updateData: any = {
        body: editBody.trim() || null,
        privacy: editPrivacy,
        updated_at: new Date().toISOString()
      };

      // Add caption and description if they exist
      if (editCaption.trim()) updateData.caption = editCaption.trim();
      if (editDescription.trim()) updateData.description = editDescription.trim();

      await supabase
        .from("posts")
        .update(updateData)
        .eq("id", editingPostId);

      // Upload new media if any
      if (editFiles && editFiles.length > 0) {
        const { data: existingMedia } = await supabase
          .from("post_media")
          .select("id")
          .eq("post_id", editingPostId);

        const startIndex = existingMedia?.length || 0;
        const mediaRecords = [];

        for (let i = 0; i < editFiles.length; i++) {
          const file = editFiles[i];
          setUploadProgress(Math.round(((i + 1) / editFiles.length) * 100));
          
          const timestamp = Date.now();
          const randomStr = Math.random().toString(36).substring(7);
          const filename = `${timestamp}-${randomStr}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const path = `posts/${viewerUserId}/${filename}`;

          const { error: uploadError } = await supabase.storage
            .from("post-media")
            .upload(path, file);

          if (!uploadError) {
            mediaRecords.push({
              post_id: editingPostId,
              storage_path: path,
              type: file.type.startsWith('video') ? 'video' : 'image',
              sort_order: startIndex + i,
              uploaded_by: viewerUserId
            });
          }
        }

        if (mediaRecords.length > 0) {
          await supabase.from("post_media").insert(mediaRecords);
        }
      }

      setEditingPostId(null);
      setEditFiles(null);
      showMessage('success', 'Post updated! ✨');
      await loadPosts();
    } catch (err: any) {
      showMessage('error', 'Failed to update post');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  // Delete post
  async function deletePost(postId: string) {
    if (!confirm("Delete this post? This cannot be undone.")) return;

    try {
      const post = posts.find(p => p.id === postId);
      
      // Delete media from storage
      if (post?.media_files?.length) {
        for (const media of post.media_files) {
          const bucket = media.storage_path.includes('event-photos') ? 'event-photos' : 'post-media';
          try {
            await supabase.storage.from(bucket).remove([media.storage_path]);
          } catch (err) {
            console.error("Error deleting media:", err);
          }
        }
      }

      // Delete post (cascades to media records)
      await supabase.from("posts").delete().eq("id", postId);
      
      showMessage('success', 'Post deleted');
      await loadPosts();
    } catch (err) {
      showMessage('error', 'Failed to delete post');
    }
  }

  // Toggle like
  async function toggleLike(postId: string) {
    if (!viewerUserId) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    try {
      if (post.liked_by_viewer) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", viewerUserId);
      } else {
        await supabase
          .from("post_likes")
          .insert({ post_id: postId, user_id: viewerUserId });
      }
      
      // Update local state
      setPosts(posts.map(p => 
        p.id === postId 
          ? { 
              ...p, 
              liked_by_viewer: !p.liked_by_viewer,
              likes_count: p.liked_by_viewer ? p.likes_count - 1 : p.likes_count + 1
            }
          : p
      ));
    } catch (err) {
      showMessage('error', 'Failed to update like');
    }
  }

  // Add comment
  async function addComment(postId: string) {
    if (!viewerUserId || !commentText[postId]?.trim()) return;

    try {
      await supabase.from("post_comments").insert({
        post_id: postId,
        user_id: viewerUserId,
        body: commentText[postId].trim()
      });

      setCommentText({ ...commentText, [postId]: "" });
      showMessage('success', 'Comment added!');
      await loadPosts();
    } catch (err) {
      showMessage('error', 'Failed to add comment');
    }
  }

  // Respond to collaboration invite
  async function respondToInvite(postId: string, accept: boolean) {
    if (!viewerUserId) return;

    try {
      await supabase
        .from("post_collaborators")
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq("post_id", postId)
        .eq("user_id", viewerUserId);

      showMessage('success', accept ? 'You can now add content!' : 'Invite declined');
      await loadPosts();
    } catch (err) {
      showMessage('error', 'Failed to respond to invite');
    }
  }

  // Delete media
  async function deleteMedia(postId: string, mediaId: string, mediaPath: string) {
    if (!confirm("Remove this media?")) return;

    try {
      const post = posts.find(p => p.id === postId);
      if (post?.media_files?.length === 1) {
        showMessage('error', 'Cannot remove last media. Delete the post instead.');
        return;
      }

      const bucket = mediaPath.includes('event-photos') ? 'event-photos' : 'post-media';
      await supabase.storage.from(bucket).remove([mediaPath]);
      await supabase.from("post_media").delete().eq("id", mediaId);
      
      showMessage('success', 'Media removed');
      await loadPosts();
    } catch (err) {
      showMessage('error', 'Failed to remove media');
    }
  }

  // Insert emoji
  function insertEmoji(emoji: string) {
    setBody(body + emoji);
    setShowEmojiPicker(false);
  }

  // Check permissions
  const canEdit = (post: Post) => {
    if (!viewerUserId) return false;
    if (post.user_id === viewerUserId) return true;
    const coCreator = post.co_creators_info?.find(c => c.id === viewerUserId);
    return coCreator?.status === 'accepted';
  };

  const canDelete = (post: Post) => viewerUserId && post.user_id === viewerUserId;

  const hasPendingInvite = (post: Post) => {
    if (!viewerUserId) return false;
    const coCreator = post.co_creators_info?.find(c => c.id === viewerUserId);
    return coCreator?.status === 'invited';
  };

  useEffect(() => {
    if (mode !== 'feed' || showComposer) {
      loadPosts();
    }
  }, [mode, userId, viewerUserId]);

  // Render only composer for feed mode with existing HomeFeed
  if (mode === 'feed' && !posts.length && showComposer) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 ${className}`}>
        {message && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white ${
            message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {message.text}
          </div>
        )}

        {/* Mood Check-in */}
        <div className="mb-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">How are you feeling today?</p>
          <div className="flex gap-2 flex-wrap">
            {['😌 Peaceful', '😊 Grateful', '💪 Energized', '😔 Struggling', '🤗 Loved'].map(mood => (
              <button
                key={mood}
                className="px-3 py-1 bg-white rounded-full text-sm hover:bg-purple-100 transition-colors"
                onClick={() => setBody(`Feeling ${mood} today. ${body}`)}
              >
                {mood}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <textarea
            className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base pr-12"
            rows={3}
            placeholder="Share your journey, gratitude, or intention..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button
            className="absolute right-2 top-2 text-2xl hover:scale-110 transition-transform"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            🧘
          </button>
          
          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="absolute right-0 top-12 bg-white border rounded-lg shadow-lg p-3 z-10">
              <div className="grid grid-cols-5 gap-2">
                {zenEmojis.map(emoji => (
                  <button
                    key={emoji}
                    className="text-2xl hover:bg-purple-100 rounded p-1 transition-colors"
                    onClick={() => insertEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Caption and Description for media posts */}
        {selectedFiles && selectedFiles.length > 0 && (
          <>
            <input
              type="text"
              className="w-full mt-2 p-2 border border-gray-200 rounded-lg text-sm"
              placeholder="Add a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, 100))}
              maxLength={100}
            />
            <textarea
              className="w-full mt-2 p-2 border border-gray-200 rounded-lg text-sm resize-none"
              placeholder="Add description..."
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              maxLength={500}
              rows={2}
            />
          </>
        )}
        
        {/* Media Preview */}
        {selectedFiles && selectedFiles.length > 0 && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {selectedFiles.length} file(s) selected
              </span>
              <button
                onClick={removeMedia}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
            {uploading && (
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        )}
        
        {/* Media Upload Section */}
        <div className="mt-3 flex flex-wrap items-center gap-2 pb-3 border-b border-gray-100">
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-lg transition-all"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            📷 Photos
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 rounded-lg transition-all"
            onClick={() => videoInputRef.current?.click()}
            disabled={uploading}
          >
            🎥 Videos
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gradient-to-r from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100 rounded-lg transition-all"
            onClick={() => setShowCoCreators(!showCoCreators)}
          >
            👥 Co-creators {coCreators.length > 0 && `(${coCreators.length})`}
          </button>
          
          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleMediaSelect}
          />
          <input
            ref={videoInputRef}
            type="file"
            multiple
            accept="video/*"
            style={{ display: 'none' }}
            onChange={handleMediaSelect}
          />
        </div>

        {/* Co-creators Section */}
        {showCoCreators && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">
              <strong>👥 Add Co-creators:</strong> They'll be notified and can add their own photos & videos!
            </p>
            <SimpleFriendDropdown
              value={coCreators}
              onChange={setCoCreators}
            />
            {coCreators.length > 0 && (
              <button
                type="button"
                onClick={() => setCoCreators([])}
                className="mt-2 text-sm text-red-600 hover:text-red-700 hover:underline"
              >
                Clear all selections
              </button>
            )}
          </div>
        )}
        
        {/* Post Options */}
        <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select 
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base"
            value={privacy} 
            onChange={(e) => setPrivacy(e.target.value as any)}
          >
            <option value="friends">🤝 Friends Only</option>
            <option value="public">🌍 Everyone</option>
            <option value="private">🔒 Only Me</option>
          </select>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowShare}
              onChange={(e) => setAllowShare(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <span className="text-sm">Allow others to share</span>
          </label>
          
          <button 
            className="sm:ml-auto px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 text-base min-h-[44px] hover:scale-105 active:scale-95"
            onClick={createPost} 
            disabled={uploading || (!body.trim() && !selectedFiles?.length)}
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span> Uploading... {uploadProgress}%
              </span>
            ) : (
              <span className="flex items-center gap-2">
                ✨ Post
              </span>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Full render for profile mode or when showing posts
  return (
    <div className="post-composer-full">
      {/* Toast Message */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white ${
          message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {message.text}
        </div>
      )}

      {/* Composer for profile mode */}
      {canPost && mode !== 'feed' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <h3 className="text-lg font-semibold mb-4">Create a Post</h3>
          
          <input
            type="text"
            placeholder="Add a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, 100))}
            className="w-full p-3 border border-gray-200 rounded-lg mb-3"
            maxLength={100}
          />
          
          <textarea
            placeholder="Tell your story..."
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            className="w-full p-3 border border-gray-200 rounded-lg mb-3 resize-none"
            rows={3}
            maxLength={500}
          />
          
          <textarea
            placeholder="Share your thoughts..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg mb-3 resize-none"
            rows={2}
          />

          {selectedFiles && selectedFiles.length > 0 && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {selectedFiles.length} file(s) selected
                </span>
                <button
                  onClick={removeMedia}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {uploading && (
            <div className="mb-3 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-3 items-center">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              style={{ display: 'none' }}
              onChange={handleMediaSelect}
            />
            
            <button
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              📷 Add Media
            </button>

            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value as Post["privacy"])}
              className="px-4 py-2 border border-gray-200 rounded-lg"
            >
              <option value="private">🔒 Private</option>
              <option value="friends">👥 Friends</option>
              <option value="public">🌍 Public</option>
            </select>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allowShare}
                onChange={(e) => setAllowShare(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Allow sharing</span>
            </label>

            <button
              className="ml-auto px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
              onClick={createPost}
              disabled={uploading || (!body.trim() && !caption.trim() && !selectedFiles?.length)}
            >
              {uploading ? `Uploading... ${uploadProgress}%` : "Post"}
            </button>
          </div>
        </div>
      )}

      {/* Posts List for profile mode */}
      {mode !== 'feed' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No posts yet</p>
              {canPost && <p className="text-sm text-gray-400 mt-2">Create your first post above!</p>}
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Collaboration Invite */}
                {hasPendingInvite(post) && (
                  <div className="bg-yellow-50 border-b-2 border-yellow-400 p-4">
                    <p className="text-sm font-medium text-yellow-800 mb-2">
                      You've been invited to collaborate on this post!
                    </p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => respondToInvite(post.id, true)}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Accept
                      </button>
                      <button 
                        onClick={() => respondToInvite(post.id, false)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {/* Post Header */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Link href={`/profile/${post.user_id}`} className="flex items-center gap-2">
                        {post.author?.avatar_url && (
                          <img src={post.author.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                        )}
                        <span className="font-semibold">{post.author?.full_name || 'User'}</span>
                      </Link>
                      
                      {post.co_creators_info && post.co_creators_info.length > 0 && (
                        <span className="text-gray-500">
                          with {post.co_creators_info
                            .filter(c => c.status === 'accepted')
                            .map(c => c.full_name)
                            .join(', ')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>

                      {canEdit(post) && (
                        <div className="flex gap-1">
                          <button 
                            onClick={() => {
                              setEditingPostId(post.id);
                              setEditBody(post.body || "");
                              setEditCaption(post.caption || "");
                              setEditDescription(post.description || "");
                              setEditPrivacy(post.privacy);
                            }}
                            className="px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Edit
                          </button>
                          
                          {canDelete(post) && (
                            <button 
                              onClick={() => deletePost(post.id)}
                              className="px-2 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Edit Mode or Display Mode */}
                {editingPostId === post.id ? (
                  <div className="p-4">
                    <input
                      type="text"
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value.slice(0, 100))}
                      placeholder="Caption"
                      className="w-full p-2 border border-gray-200 rounded mb-2"
                      maxLength={100}
                    />
                    
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value.slice(0, 500))}
                      placeholder="Description"
                      className="w-full p-2 border border-gray-200 rounded mb-2 resize-none"
                      rows={2}
                      maxLength={500}
                    />
                    
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      placeholder="Content"
                      className="w-full p-2 border border-gray-200 rounded mb-2 resize-none"
                      rows={2}
                    />
                    
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={(e) => setEditFiles(e.target.files)}
                      className="mb-2"
                    />
                    
                    <select
                      value={editPrivacy}
                      onChange={(e) => setEditPrivacy(e.target.value as Post["privacy"])}
                      className="w-full p-2 border border-gray-200 rounded mb-3"
                    >
                      <option value="private">🔒 Private</option>
                      <option value="friends">👥 Friends</option>
                      <option value="public">🌍 Public</option>
                    </select>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={updatePost} 
                        disabled={uploading}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {uploading ? `Saving... ${uploadProgress}%` : "Save"}
                      </button>
                      <button 
                        onClick={() => setEditingPostId(null)}
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Post Content */}
                    <div className="p-4">
                      {post.caption && <h3 className="font-semibold text-lg mb-1">{post.caption}</h3>}
                      {post.description && <p className="text-gray-600 mb-2">{post.description}</p>}
                      {post.body && <p className="text-gray-800">{post.body}</p>}
                    </div>

                    {/* Media Grid */}
                    {post.media_files && post.media_files.length > 0 && (
                      <div className={`grid gap-1 ${
                        post.media_files.length === 1 ? 'grid-cols-1' :
                        post.media_files.length === 2 ? 'grid-cols-2' :
                        post.media_files.length === 3 ? 'grid-cols-2' :
                        'grid-cols-2'
                      }`}>
                        {post.media_files.slice(0, 4).map((media, idx) => (
                          <div key={media.id || idx} className="relative aspect-square bg-gray-100">
                            {media.type === 'video' ? (
                              <video 
                                src={media.url} 
                                controls 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img 
                                src={media.url} 
                                alt="" 
                                className="w-full h-full object-cover"
                              />
                            )}
                            {idx === 3 && post.media_files!.length > 4 && (
                              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white text-2xl font-semibold">
                                +{post.media_files!.length - 4}
                              </div>
                            )}
                            {editingPostId === post.id && canEdit(post) && post.media_files!.length > 1 && (
                              <button
                                onClick={() => deleteMedia(post.id, media.id!, media.storage_path)}
                                className="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Post Footer */}
                    <div className="p-4 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => toggleLike(post.id)}
                            className={`flex items-center gap-1 ${
                              post.liked_by_viewer ? 'text-red-500' : 'text-gray-500'
                            } hover:scale-110 transition-transform`}
                          >
                            {post.liked_by_viewer ? '❤️' : '🤍'} {post.likes_count}
                          </button>
                          
                          <span className="text-gray-500">
                            💬 {post.comments_count}
                          </span>
                          
                          {post.allow_share && (
                            <button className="text-gray-500 hover:text-gray-700">
                              🔄 Share
                            </button>
                          )}
                        </div>
                        
                        <span className="text-xs text-gray-400">
                          {post.privacy === 'private' ? '🔒' : post.privacy === 'friends' ? '👥' : '🌍'}
                        </span>
                      </div>

                      {/* Comments */}
                      <div className="space-y-2">
                        {post.comments?.map(comment => (
                          <div key={comment.id} className="flex gap-2 text-sm">
                            <Link 
                              href={`/profile/${comment.user_id}`}
                              className="font-semibold text-purple-600 hover:underline"
                            >
                              {comment.author?.full_name || 'User'}
                            </Link>
                            <span className="text-gray-700">{comment.body}</span>
                          </div>
                        ))}
                        
                        {viewerUserId && (
                          <div className="flex gap-2 mt-2">
                            <input
                              type="text"
                              placeholder="Add a comment..."
                              value={commentText[post.id] || ""}
                              onChange={(e) => setCommentText({
                                ...commentText,
                                [post.id]: e.target.value
                              })}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') addComment(post.id);
                              }}
                              className="flex-1 px-3 py-1 border border-gray-200 rounded-full text-sm"
                            />
                            <button 
                              onClick={() => addComment(post.id)}
                              className="px-4 py-1 bg-purple-600 text-white text-sm rounded-full hover:bg-purple-700"
                            >
                              Post
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
