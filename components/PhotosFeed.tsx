"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type MediaFile = {
  id: string;
  url: string;
  path: string;
  type: 'image' | 'video';
};

type Post = {
  id: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  image_path: string;
  caption: string | null;
  description: string | null;
  visibility: "private" | "friends" | "acquaintances" | "public";
  created_at: string;
  updated_at: string;
  url: string;
  tags: { id: string; name: string; can_edit?: boolean }[];
  media_files?: MediaFile[];
  post_media?: any[];
  collaborators?: { user_id: string; name: string; status: 'invited' | 'accepted' | 'declined'; can_edit: boolean }[];
};

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  body: string;
  created_at: string;
};

type RelationshipType = 'friend' | 'acquaintance' | 'restricted' | 'none';

interface PhotosFeedProps {
  userId: string | null; // Profile being viewed
  viewerUserId?: string | null; // Current logged-in user
  isPublicView?: boolean; // True when viewing someone else's profile
  relationshipType?: RelationshipType; // Relationship between viewer and profile owner
}

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private (Only me)", icon: "🔒" },
  { value: "friends", label: "Friends", icon: "👥" },
  { value: "acquaintances", label: "Friends & Acquaintances", icon: "🤝" },
  { value: "public", label: "Public (Everyone)", icon: "🌍" },
] as const;

export default function PhotosFeed({ 
  userId, 
  viewerUserId, 
  isPublicView = false,
  relationshipType = 'none' 
}: PhotosFeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<{ [postId: string]: Comment[] }>({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<Post["visibility"]>("friends");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editVisibility, setEditVisibility] = useState<Post["visibility"]>("friends");
  const [editFiles, setEditFiles] = useState<FileList | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<{ [postId: string]: string }>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [expandedMedia, setExpandedMedia] = useState<Set<string>>(new Set());
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<{ [postId: string]: number }>({});
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  // Determine if current user can post (only on their own profile)
  const canPost = useMemo(() => {
    return !isPublicView && userId && userId === viewerUserId;
  }, [userId, viewerUserId, isPublicView]);

  // Check if user can edit a post (creator OR accepted collaborator)
  const canEditPost = (post: Post) => {
    if (!viewerUserId) return false;
    
    // Creator can always edit
    if (post.user_id === viewerUserId) return true;
    
    // Check if user is a tagged collaborator with edit permissions
    const taggedUser = post.tags?.find(t => t.id === viewerUserId);
    if (taggedUser?.can_edit) return true;
    
    // Check collaborators list
    const collaborator = post.collaborators?.find(
      c => c.user_id === viewerUserId && c.status === 'accepted' && c.can_edit
    );
    return !!collaborator;
  };

  // Check if user can delete (only creator)
  const canDeletePost = (post: Post) => {
    return viewerUserId && post.user_id === viewerUserId;
  };

  // Determine if current user is viewing their own profile
  const isOwnProfile = userId === viewerUserId;

  // Show temporary message
  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Filter posts based on relationship
  const filterPostsByRelationship = (posts: Post[]): Post[] => {
    if (isOwnProfile) {
      return posts;
    }

    return posts.filter(post => {
      switch (post.visibility) {
        case 'public':
          return true;
        case 'acquaintances':
          return relationshipType === 'friend' || relationshipType === 'acquaintance';
        case 'friends':
          return relationshipType === 'friend';
        case 'private':
          return false;
        default:
          return false;
      }
    });
  };

  async function listPosts() {
    if (!userId) return setPosts([]);

    try {
      // Get posts where user is creator
      const { data: createdPosts, error: createdError } = await supabase
        .from("photo_posts")
        .select(`
          id, user_id, image_path, caption, description, 
          visibility, created_at, updated_at
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (createdError) throw createdError;

      // Get posts where user is a collaborator
      const { data: collabPosts, error: collabError } = await supabase
        .from("photo_posts")
        .select(`
          id, user_id, image_path, caption, description, 
          visibility, created_at, updated_at
        `)
        .in("id", 
          await supabase
            .from("photo_tags")
            .select("post_id")
            .eq("tagged_user_id", userId)
            .then(res => res.data?.map(r => r.post_id) || [])
        );

      // Combine and deduplicate posts
      const allPosts = [...(createdPosts || []), ...(collabPosts || [])];
      const uniquePosts = Array.from(new Map(allPosts.map(p => [p.id, p])).values());

      const items = await Promise.all(uniquePosts.map(async (r) => {
        // Get creator info
        const { data: creator } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("id", r.user_id)
          .single();

        // Get main image URL
        const { data: pub } = supabase.storage.from("event-photos").getPublicUrl(r.image_path);
        
        // Get additional media files if they exist
        const { data: mediaFiles } = await supabase
          .from("post_media")
          .select("id, storage_path, media_type")
          .eq("post_id", r.id)
          .order("sort_order", { ascending: true });

        const processedMedia: MediaFile[] = [];
        if (mediaFiles && mediaFiles.length > 0) {
          for (const media of mediaFiles) {
            const { data: mediaUrl } = supabase.storage
              .from("event-photos")
              .getPublicUrl(media.storage_path);
            processedMedia.push({
              id: media.id,
              url: mediaUrl.publicUrl,
              path: media.storage_path,
              type: media.media_type as 'image' | 'video'
            });
          }
        }
        
        // Get tags with user info and edit permissions
        const { data: tagsRows } = await supabase
          .from("photo_tags")
          .select("tagged_user_id, can_edit")
          .eq("post_id", r.id);

        let taggedUsers: { id: string; name: string; can_edit?: boolean }[] = [];
        if (tagsRows?.length) {
          const ids = tagsRows.map(t => t.tagged_user_id);
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", ids);
          
          taggedUsers = (profs ?? []).map(p => {
            const tagRow = tagsRows.find(t => t.tagged_user_id === p.id);
            return { 
              id: p.id, 
              name: p.full_name ?? "User",
              can_edit: tagRow?.can_edit || false
            };
          });
        }

        // Get collaborators
        const { data: collabs } = await supabase
          .from("post_collaborators")
          .select(`
            user_id, status, can_edit,
            profiles!inner(full_name)
          `)
          .eq("post_id", r.id);

        const collaborators = collabs?.map(c => ({
          user_id: c.user_id,
          name: (c as any).profiles?.full_name || "User",
          status: c.status as 'invited' | 'accepted' | 'declined',
          can_edit: c.can_edit
        })) || [];

        return {
          ...r,
          user_name: creator?.full_name || "User",
          user_avatar: creator?.avatar_url,
          url: pub.publicUrl,
          tags: taggedUsers,
          media_files: processedMedia.length > 0 ? processedMedia : undefined,
          collaborators
        };
      }));

      // Filter posts based on relationship
      const filteredPosts = filterPostsByRelationship(items);
      setPosts(filteredPosts);

      // Load comments for visible posts
      const postIds = filteredPosts.map(p => p.id);
      if (postIds.length > 0) {
        const { data: allComments } = await supabase
          .from("photo_comments")
          .select(`
            id, post_id, user_id, body, created_at,
            profiles!inner(full_name, avatar_url)
          `)
          .in("post_id", postIds)
          .order("created_at", { ascending: true });

        const commentsByPost: { [key: string]: Comment[] } = {};
        (allComments ?? []).forEach((c: any) => {
          if (!commentsByPost[c.post_id]) commentsByPost[c.post_id] = [];
          commentsByPost[c.post_id].push({
            id: c.id,
            post_id: c.post_id,
            user_id: c.user_id,
            user_name: c.profiles?.full_name ?? "Anonymous",
            user_avatar: c.profiles?.avatar_url,
            body: c.body,
            created_at: c.created_at
          });
        });
        setComments(commentsByPost);

        // Load likes
        if (viewerUserId) {
          const { data: likes } = await supabase
            .from("photo_likes")
            .select("post_id")
            .eq("user_id", viewerUserId)
            .in("post_id", postIds);
          
          setLikedPosts(new Set(likes?.map(l => l.post_id) ?? []));
        }

        // Load like counts
        const { data: likeCounts } = await supabase
          .from("photo_likes")
          .select("post_id")
          .in("post_id", postIds);
        
        const counts: { [key: string]: number } = {};
        postIds.forEach(id => counts[id] = 0);
        likeCounts?.forEach(l => counts[l.post_id]++);
        setLikeCounts(counts);
      }
    } catch (err: any) {
      console.error("Error loading posts:", err);
      showMessage("error", "Failed to load posts");
    }
  }

  // Handle MULTIPLE file uploads
  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !userId || !canPost) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Create the post first
      const postData = {
        user_id: userId,
        image_path: "", // Will update with first image
        caption: caption.trim() || null,
        description: description.trim() || null,
        visibility,
      };

      // Upload first file and create post
      const firstFile = files[0];
      const firstFilename = `${Date.now()}-0-${firstFile.name}`;
      const firstPath = `${userId}/${firstFilename}`;

      const firstUpload = await supabase.storage
        .from("event-photos")
        .upload(firstPath, firstFile, {
          cacheControl: "3600",
          upsert: false,
        });
      
      if (firstUpload.error) throw firstUpload.error;

      // Create post with first image
      postData.image_path = firstPath;
      const ins = await supabase
        .from("photo_posts")
        .insert(postData)
        .select()
        .single();
      
      if (ins.error) throw ins.error;

      // Upload remaining files and add to post_media table
      if (files.length > 1) {
        for (let i = 1; i < files.length; i++) {
          setUploadProgress(Math.round((i / files.length) * 100));
          
          const file = files[i];
          const filename = `${Date.now()}-${i}-${file.name}`;
          const path = `${userId}/${filename}`;

          const upload = await supabase.storage
            .from("event-photos")
            .upload(path, file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (!upload.error) {
            // Add to post_media table
            await supabase.from("post_media").insert({
              post_id: ins.data.id,
              storage_path: path,
              media_type: file.type.startsWith('video') ? 'video' : 'image',
              sort_order: i
            });
          }
        }
      }

      // Handle tags - now with edit permissions for collaborators
      const tagEmails = tags.split(",").map(s => s.trim()).filter(Boolean);
      if (tagEmails.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id")
          .in("full_name", tagEmails);
        
        if (profiles?.length) {
          const tagRows = profiles.map(p => ({ 
            post_id: ins.data.id, 
            tagged_user_id: p.id,
            can_edit: true // Allow tagged users to edit
          }));
          await supabase.from("photo_tags").insert(tagRows);

          // Send notifications to tagged users
          const notifications = profiles.map(p => ({
            user_id: p.id,
            type: 'photo_tag',
            message: `You've been tagged in a photo post. You can add your own photos!`,
            post_id: ins.data.id
          }));
          await supabase.from("notifications").insert(notifications);
        }
      }

      // Reset form
      setCaption("");
      setDescription("");
      setTags("");
      setVisibility("friends");
      setSelectedFiles(null);
      setUploadProgress(0);
      
      showMessage("success", `${files.length} photo(s) uploaded successfully! 🎉`);
      await listPosts();
    } catch (err: any) {
      console.error("Upload error:", err);
      showMessage("error", err.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      e.currentTarget.value = "";
    }
  }

  // Edit post with ability to add more media
  async function saveEdit() {
    if (!editingPostId) return;

    try {
      const post = posts.find(p => p.id === editingPostId);
      if (!post) return;

      // Update post details
      const { error } = await supabase
        .from("photo_posts")
        .update({
          caption: editCaption.trim() || null,
          description: editDescription.trim() || null,
          visibility: editVisibility,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingPostId);

      if (error) throw error;

      // Upload new files if any
      if (editFiles && editFiles.length > 0) {
        const existingMediaCount = post.media_files?.length || 0;
        
        for (let i = 0; i < editFiles.length; i++) {
          const file = editFiles[i];
          const filename = `${Date.now()}-${existingMediaCount + i}-${file.name}`;
          const path = `${userId}/${filename}`;

          const upload = await supabase.storage
            .from("event-photos")
            .upload(path, file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (!upload.error) {
            await supabase.from("post_media").insert({
              post_id: editingPostId,
              storage_path: path,
              media_type: file.type.startsWith('video') ? 'video' : 'image',
              sort_order: existingMediaCount + i
            });
          }
        }
      }

      // Update tags
      await supabase.from("photo_tags").delete().eq("post_id", editingPostId);
      
      const tagNames = editTags.split(",").map(s => s.trim()).filter(Boolean);
      if (tagNames.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id")
          .in("full_name", tagNames);
        
        if (profiles?.length) {
          const tagRows = profiles.map(p => ({ 
            post_id: editingPostId, 
            tagged_user_id: p.id,
            can_edit: true
          }));
          await supabase.from("photo_tags").insert(tagRows);
        }
      }

      setEditingPostId(null);
      setEditFiles(null);
      showMessage("success", "Post updated! ✨");
      await listPosts();
    } catch (err: any) {
      console.error("Edit error:", err);
      showMessage("error", "Failed to update post");
    }
  }

  // Delete post with proper cleanup
  async function deletePost(postId: string) {
    if (!confirm("Delete this post? This cannot be undone.")) return;

    setDeletingPostId(postId);
    
    try {
      const post = posts.find(p => p.id === postId);
      
      // Delete media files from storage
      if (post) {
        // Delete main image
        if (post.image_path) {
          await supabase.storage
            .from("event-photos")
            .remove([post.image_path]);
        }
        
        // Delete additional media
        if (post.media_files && post.media_files.length > 0) {
          const paths = post.media_files.map(m => m.path);
          await supabase.storage
            .from("event-photos")
            .remove(paths);
        }
      }

      // Delete from database (cascades to related tables)
      const { error } = await supabase
        .from("photo_posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      showMessage("success", "Post deleted successfully");
      await listPosts();
    } catch (err: any) {
      console.error("Delete error:", err);
      showMessage("error", "Failed to delete post. Please try again.");
    } finally {
      setDeletingPostId(null);
    }
  }

  // Remove single media item
  async function removeMedia(postId: string, mediaId: string, mediaPath: string) {
    if (!confirm("Remove this photo/video?")) return;

    try {
      // Delete from storage
      await supabase.storage.from("event-photos").remove([mediaPath]);
      
      // Delete from database
      await supabase.from("post_media").delete().eq("id", mediaId);
      
      showMessage("success", "Media removed");
      await listPosts();
    } catch (err: any) {
      showMessage("error", "Failed to remove media");
    }
  }

  async function toggleLike(postId: string) {
    if (!viewerUserId) {
      showMessage("error", "Please sign in to like posts");
      return;
    }

    try {
      if (likedPosts.has(postId)) {
        await supabase
          .from("photo_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", viewerUserId);
        
        setLikedPosts(prev => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
        setLikeCounts(prev => ({ ...prev, [postId]: Math.max(0, prev[postId] - 1) }));
      } else {
        await supabase
          .from("photo_likes")
          .insert({ post_id: postId, user_id: viewerUserId });
        
        setLikedPosts(prev => new Set([...prev, postId]));
        setLikeCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
      }
    } catch (err: any) {
      console.error("Like error:", err);
      showMessage("error", "Failed to update like");
    }
  }

  async function startEdit(post: Post) {
    if (!canEditPost(post)) return;
    
    setEditingPostId(post.id);
    setEditCaption(post.caption || "");
    setEditDescription(post.description || "");
    setEditTags(post.tags.map(t => t.name).join(", "));
    setEditVisibility(post.visibility);
  }

  async function handleCommentSubmit(postId: string) {
    if (!viewerUserId || !commentText[postId]?.trim()) return;

    try {
      const { error } = await supabase.from("photo_comments").insert({
        post_id: postId,
        user_id: viewerUserId,
        body: commentText[postId].trim()
      });

      if (error) throw error;

      setCommentText({ ...commentText, [postId]: "" });
      showMessage("success", "Comment added! 💬");
      await listPosts();
    } catch (err: any) {
      console.error("Comment error:", err);
      showMessage("error", "Failed to add comment");
    }
  }

  // Respond to collaboration invite
  async function respondToCollabInvite(postId: string, accept: boolean) {
    if (!viewerUserId) return;

    try {
      if (accept) {
        // Update tag to allow editing
        await supabase
          .from("photo_tags")
          .update({ can_edit: true })
          .eq("post_id", postId)
          .eq("tagged_user_id", viewerUserId);
      } else {
        // Remove tag
        await supabase
          .from("photo_tags")
          .delete()
          .eq("post_id", postId)
          .eq("tagged_user_id", viewerUserId);
      }

      showMessage("success", accept ? "You can now add photos!" : "Tag removed");
      await listPosts();
    } catch (err: any) {
      showMessage("error", "Failed to update");
    }
  }

  // Render post media with support for multiple files
  const renderPostMedia = (post: Post) => {
    const allMedia: MediaFile[] = [];
    
    // Add main image
    if (post.url) {
      allMedia.push({
        id: 'main',
        url: post.url,
        path: post.image_path,
        type: 'image'
      });
    }
    
    // Add additional media
    if (post.media_files && post.media_files.length > 0) {
      allMedia.push(...post.media_files);
    }

    if (allMedia.length === 0) return null;

    const isExpanded = expandedMedia.has(post.id);
    const displayMedia = isExpanded ? allMedia : allMedia.slice(0, 4);

    return (
      <>
        <div className={`media-grid ${allMedia.length === 1 ? 'single' : ''}`}>
          {displayMedia.map((media, idx) => (
            <div key={media.id} className="media-item">
              {media.type === 'video' ? (
                <video 
                  src={media.url} 
                  controls
                  className="post-media"
                />
              ) : (
                <img 
                  src={media.url} 
                  alt=""
                  className="post-media"
                  onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                />
              )}
              
              {/* Show count on 4th item if more exist */}
              {!isExpanded && idx === 3 && allMedia.length > 4 && (
                <div className="more-overlay">
                  <span>+{allMedia.length - 4}</span>
                </div>
              )}
              
              {/* Delete button for media in edit mode */}
              {editingPostId === post.id && canEditPost(post) && allMedia.length > 1 && (
                <button
                  className="media-delete"
                  onClick={() => removeMedia(post.id, media.id, media.path)}
                  aria-label="Remove media"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        
        {/* Show more/less button */}
        {allMedia.length > 4 && (
          <button
            className="show-more-btn"
            onClick={() => {
              const newExpanded = new Set(expandedMedia);
              if (isExpanded) {
                newExpanded.delete(post.id);
              } else {
                newExpanded.add(post.id);
              }
              setExpandedMedia(newExpanded);
            }}
          >
            {isExpanded ? "Show less" : `Show all ${allMedia.length} items`}
          </button>
        )}
      </>
    );
  };

  useEffect(() => { 
    listPosts(); 
  }, [userId, viewerUserId, relationshipType]);

  return (
    <section className="photos-feed">
      {/* Only show title and upload on own profile */}
      {!isPublicView && (
        <>
          <h2 className="feed-title">
            Photos & Memories
          </h2>

          {/* Message Toast */}
          {message && (
            <div className={`message-toast ${message.type}`}>
              {message.text}
            </div>
          )}

          {/* Upload Section - Only on own profile */}
          {canPost && (
            <div className="upload-card">
              <div className="upload-form">
                <div className="form-group">
                  <label className="form-label">Caption</label>
                  <input 
                    className="form-input" 
                    value={caption} 
                    onChange={(e) => setCaption(e.target.value.slice(0, 100))} 
                    placeholder="Share this moment..." 
                    maxLength={100}
                  />
                  <span className="char-count">{caption.length}/100</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea 
                    className="form-textarea" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value.slice(0, 500))} 
                    placeholder="Tell the story..."
                    rows={2}
                    maxLength={500}
                  />
                  <span className="char-count">{description.length}/500</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Tag Friends (they can add photos too!)</label>
                  <input 
                    className="form-input" 
                    value={tags} 
                    onChange={(e) => setTags(e.target.value)} 
                    placeholder="Names separated by commas" 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Visibility</label>
                  <select 
                    className="form-select" 
                    value={visibility} 
                    onChange={(e) => setVisibility(e.target.value as any)}
                  >
                    {VISIBILITY_OPTIONS.map(v => (
                      <option key={v.value} value={v.value}>
                        {v.icon} {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* File selection preview */}
                {selectedFiles && selectedFiles.length > 0 && (
                  <div className="selected-files">
                    <span className="files-count">
                      {selectedFiles.length} file(s) selected
                    </span>
                  </div>
                )}

                <label className="upload-button">
                  <input 
                    type="file" 
                    accept="image/*,video/*" 
                    multiple
                    className="file-input" 
                    onChange={(e) => {
                      setSelectedFiles(e.target.files);
                      onUpload(e);
                    }}
                    disabled={uploading}
                  />
                  {uploading ? `Uploading... ${uploadProgress}%` : "📸 Upload Photos/Videos"}
                </label>

                {/* Upload progress bar */}
                {uploading && uploadProgress > 0 && (
                  <div className="upload-progress">
                    <div 
                      className="upload-progress-bar" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Posts Grid */}
      <div className="posts-grid">
        {posts.map(post => {
          const isCollabInvite = post.tags.some(t => t.id === viewerUserId) && 
                                 !post.tags.find(t => t.id === viewerUserId)?.can_edit;

          return (
            <div key={post.id} className="post-card">
              {/* Collaboration Invite Banner */}
              {isCollabInvite && (
                <div className="collab-invite">
                  <p>You've been tagged! Add your own photos to this post.</p>
                  <div className="invite-actions">
                    <button 
                      className="invite-accept"
                      onClick={() => respondToCollabInvite(post.id, true)}
                    >
                      ✓ Accept & Add Photos
                    </button>
                    <button 
                      className="invite-decline"
                      onClick={() => respondToCollabInvite(post.id, false)}
                    >
                      × Untag Me
                    </button>
                  </div>
                </div>
              )}

              <div className="post-image-container">
                {renderPostMedia(post)}
                
                {/* Like button overlay */}
                <button
                  className={`like-button ${likedPosts.has(post.id) ? 'liked' : ''}`}
                  onClick={() => toggleLike(post.id)}
                  aria-label={likedPosts.has(post.id) ? 'Unlike' : 'Like'}
                >
                  {likedPosts.has(post.id) ? '❤️' : '🤍'}
                </button>
              </div>
              
              <div className="post-content">
                {editingPostId === post.id ? (
                  /* Edit Mode */
                  <div className="edit-mode">
                    <input
                      className="edit-input"
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value.slice(0, 100))}
                      placeholder="Caption"
                    />
                    <textarea
                      className="edit-textarea"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value.slice(0, 500))}
                      placeholder="Description"
                      rows={2}
                    />
                    <input
                      className="edit-input"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="Tags"
                    />
                    <select
                      className="edit-select"
                      value={editVisibility}
                      onChange={(e) => setEditVisibility(e.target.value as any)}
                    >
                      {VISIBILITY_OPTIONS.map(v => (
                        <option key={v.value} value={v.value}>
                          {v.icon} {v.label}
                        </option>
                      ))}
                    </select>
                    
                    {/* Add more media in edit mode */}
                    <label className="add-media-btn">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="file-input"
                        onChange={(e) => setEditFiles(e.target.files)}
                      />
                      + Add More Photos/Videos
                    </label>
                    {editFiles && editFiles.length > 0 && (
                      <span className="edit-files-count">
                        {editFiles.length} new file(s) selected
                      </span>
                    )}
                    
                    <div className="edit-actions">
                      <button
                        onClick={saveEdit}
                        className="btn-save"
                        disabled={uploading}
                      >
                        {uploading ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => {
                          setEditingPostId(null);
                          setEditFiles(null);
                        }}
                        className="btn-cancel"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <>
                    {/* Creator info with clickable link */}
                    <div className="post-creator">
                      <Link href={`/profile/${post.user_id}`} className="creator-link">
                        {post.user_avatar && (
                          <img 
                            src={post.user_avatar} 
                            alt={post.user_name}
                            className="creator-avatar"
                          />
                        )}
                        <span className="creator-name">{post.user_name}</span>
                      </Link>
                      
                      {/* Show collaborators */}
                      {post.tags.filter(t => t.can_edit).length > 0 && (
                        <>
                          <span className="with-text">with</span>
                          {post.tags.filter(t => t.can_edit).map((tag, idx, arr) => (
                            <span key={tag.id}>
                              <Link href={`/profile/${tag.id}`} className="creator-link">
                                {tag.name}
                              </Link>
                              {idx < arr.length - 1 && ", "}
                            </span>
                          ))}
                        </>
                      )}
                    </div>

                    {post.caption && (
                      <h3 className="post-caption">{post.caption}</h3>
                    )}
                    
                    {(expandedPost === post.id || !post.description || post.description.length < 100) && post.description && (
                      <p className="post-description">{post.description}</p>
                    )}
                    
                    {post.description && post.description.length >= 100 && expandedPost !== post.id && (
                      <button 
                        className="read-more"
                        onClick={() => setExpandedPost(post.id)}
                      >
                        Read more...
                      </button>
                    )}
                    
                    {/* Tags with clickable profile links */}
                    {post.tags.filter(t => !t.can_edit).length > 0 && (
                      <div className="post-tags">
                        <span className="tag-label">Also tagged:</span>
                        {post.tags.filter(t => !t.can_edit).map((tag, idx) => (
                          <span key={tag.id}>
                            <Link 
                              href={`/profile/${tag.id}`}
                              className="tag-link"
                            >
                              {tag.name}
                            </Link>
                            {idx < post.tags.filter(t => !t.can_edit).length - 1 && ", "}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Post Meta */}
                    <div className="post-meta">
                      <div className="meta-left">
                        <span className="visibility-badge">
                          {VISIBILITY_OPTIONS.find(v => v.value === post.visibility)?.icon}
                        </span>
                        <span className="like-count">
                          {likeCounts[post.id] || 0} likes
                        </span>
                      </div>
                      <span className="post-date">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="post-actions">
                      {canEditPost(post) && (
                        <button
                          onClick={() => startEdit(post)}
                          className="btn-edit"
                        >
                          {post.user_id === viewerUserId ? "Edit" : "Add Photos"}
                        </button>
                      )}
                      {canDeletePost(post) && (
                        <button
                          onClick={() => deletePost(post.id)}
                          className="btn-delete"
                          disabled={deletingPostId === post.id}
                        >
                          {deletingPostId === post.id ? "Deleting..." : "Delete"}
                        </button>
                      )}
                    </div>

                    {/* Comments Section */}
                    <div className="comments-section">
                      <h4 className="comments-title">Comments</h4>
                      
                      {/* Display Comments */}
                      <div className="comments-list">
                        {comments[post.id]?.map(comment => (
                          <div key={comment.id} className="comment">
                            <Link 
                              href={`/profile/${comment.user_id}`}
                              className="comment-author"
                            >
                              {comment.user_avatar && (
                                <img 
                                  src={comment.user_avatar} 
                                  alt={comment.user_name}
                                  className="comment-avatar"
                                />
                              )}
                              {comment.user_name}
                            </Link>
                            <span className="comment-body">{comment.body}</span>
                          </div>
                        ))}
                      </div>

                      {/* Add Comment */}
                      {viewerUserId && (
                        <div className="comment-form">
                          <input
                            className="comment-input"
                            placeholder="Add a comment..."
                            value={commentText[post.id] || ""}
                            onChange={(e) => setCommentText({
                              ...commentText,
                              [post.id]: e.target.value
                            })}
                            onKeyPress={(e) => {
                              if (e.key === "Enter") handleCommentSubmit(post.id);
                            }}
                          />
                          <button
                            onClick={() => handleCommentSubmit(post.id)}
                            className="comment-submit"
                            disabled={!commentText[post.id]?.trim()}
                          >
                            Post
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {!posts.length && (
        <div className="empty-state">
          {isPublicView && relationshipType === 'none' ? (
            <>
              <p className="empty-title">No public photos</p>
              <p className="empty-subtitle">Connect as friends to see more content</p>
            </>
          ) : (
            <>
              <p className="empty-title">No photos yet</p>
              <p className="empty-subtitle">
                {canPost ? "Share your first memory!" : "Check back later for updates"}
              </p>
            </>
          )}
        </div>
      )}

      <style jsx>{`
        .photos-feed {
          position: relative;
        }

        .feed-title {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        @media (max-width: 640px) {
          .feed-title {
            font-size: 1.5rem;
          }
        }

        /* Message Toast */
        .message-toast {
          position: fixed;
          top: 5rem;
          right: 1rem;
          z-index: 50;
          padding: 1rem;
          border-radius: 0.5rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: slideIn 0.3s ease;
          color: white;
          font-weight: 500;
          max-width: 90vw;
        }

        .message-toast.success {
          background: #10b981;
        }

        .message-toast.error {
          background: #ef4444;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        /* Upload Card */
        .upload-card {
          background: white;
          border-radius: 1rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          border: 1px solid #e5e7eb;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        @media (max-width: 640px) {
          .upload-card {
            padding: 1rem;
            border-radius: 0.75rem;
          }
        }

        .upload-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-group {
          position: relative;
        }

        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 0.25rem;
          color: #374151;
        }

        .form-input, .form-textarea, .form-select {
          width: 100%;
          padding: 0.625rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 16px; /* Prevents iOS zoom */
          transition: all 0.2s;
          -webkit-appearance: none; /* Better mobile rendering */
        }

        .form-input:focus, .form-textarea:focus, .form-select:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
        }

        .form-textarea {
          resize: vertical;
          min-height: 4rem;
        }

        .char-count {
          position: absolute;
          right: 0.5rem;
          bottom: -1.25rem;
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .selected-files {
          padding: 0.5rem;
          background: #f3f4f6;
          border-radius: 0.375rem;
        }

        .files-count {
          font-size: 0.875rem;
          color: #10b981;
          font-weight: 500;
        }

        .upload-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          color: white;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          touch-action: manipulation; /* Better mobile tap handling */
        }

        .upload-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139,92,246,0.3);
        }

        .upload-button:active {
          transform: translateY(0);
        }

        .file-input {
          display: none;
        }

        .upload-progress {
          height: 4px;
          background: #e5e7eb;
          border-radius: 2px;
          overflow: hidden;
        }

        .upload-progress-bar {
          height: 100%;
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          transition: width 0.3s ease;
        }

        /* Posts Grid */
        .posts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        @media (max-width: 640px) {
          .posts-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }

        .post-card {
          background: white;
          border-radius: 1rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          overflow: hidden;
          transition: all 0.2s;
        }

        .post-card:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          transform: translateY(-2px);
        }

        @media (hover: none) {
          .post-card:hover {
            transform: none;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          }
        }

        /* Collaboration Invite */
        .collab-invite {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          padding: 1rem;
          border-bottom: 2px solid #f59e0b;
        }

        .collab-invite p {
          margin: 0 0 0.5rem 0;
          color: #92400e;
          font-weight: 500;
        }

        .invite-actions {
          display: flex;
          gap: 0.5rem;
        }

        .invite-accept, .invite-decline {
          padding: 0.375rem 0.75rem;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .invite-accept {
          background: #10b981;
          color: white;
        }

        .invite-accept:hover {
          background: #059669;
        }

        .invite-decline {
          background: #ef4444;
          color: white;
        }

        .invite-decline:hover {
          background: #dc2626;
        }

        /* Media Grid */
        .post-image-container {
          position: relative;
          background: #f3f4f6;
        }

        .media-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2px;
        }

        .media-grid.single {
          grid-template-columns: 1fr;
        }

        .media-item {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
        }

        .post-media {
          width: 100%;
          height: 100%;
          object-fit: cover;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .post-media:hover {
          transform: scale(1.05);
        }

        @media (hover: none) {
          .post-media:hover {
            transform: none;
          }
        }

        .more-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.7);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: bold;
        }

        .media-delete {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          width: 2rem;
          height: 2rem;
          background: rgba(239,68,68,0.9);
          color: white;
          border: none;
          border-radius: 50%;
          font-size: 1.25rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .show-more-btn {
          width: 100%;
          padding: 0.5rem;
          background: #f3f4f6;
          border: none;
          font-size: 0.875rem;
          color: #6b7280;
          cursor: pointer;
          transition: background 0.2s;
        }

        .show-more-btn:hover {
          background: #e5e7eb;
        }

        .like-button {
          position: absolute;
          bottom: 0.75rem;
          right: 0.75rem;
          width: 2.5rem;
          height: 2.5rem;
          background: rgba(255,255,255,0.9);
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1.25rem;
          transition: all 0.2s;
          backdrop-filter: blur(10px);
          -webkit-tap-highlight-color: transparent;
        }

        .like-button:hover {
          transform: scale(1.1);
        }

        .like-button:active {
          transform: scale(0.95);
        }

        .like-button.liked {
          background: rgba(239,68,68,0.1);
        }

        @media (max-width: 640px) {
          .like-button {
            width: 3rem;
            height: 3rem;
            font-size: 1.5rem;
          }
        }

        .post-content {
          padding: 1rem;
        }

        /* Creator Info */
        .post-creator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          flex-wrap: wrap;
        }

        .creator-link {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          color: #8b5cf6;
          text-decoration: none;
          font-weight: 600;
        }

        .creator-link:hover {
          text-decoration: underline;
        }

        .creator-avatar {
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 50%;
          object-fit: cover;
        }

        .creator-name {
          font-size: 0.875rem;
        }

        .with-text {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .post-caption {
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
          word-wrap: break-word;
        }

        .post-description {
          color: #6b7280;
          font-size: 0.875rem;
          line-height: 1.5;
          margin-bottom: 0.75rem;
          word-wrap: break-word;
        }

        .read-more {
          color: #8b5cf6;
          background: none;
          border: none;
          font-size: 0.875rem;
          cursor: pointer;
          padding: 0;
          margin-bottom: 0.75rem;
        }

        .read-more:hover {
          text-decoration: underline;
        }

        .post-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
          margin-bottom: 0.75rem;
          font-size: 0.875rem;
        }

        .tag-label {
          color: #6b7280;
        }

        .tag-link {
          color: #8b5cf6;
          text-decoration: none;
        }

        .tag-link:hover {
          text-decoration: underline;
        }

        .post-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 0.5rem;
          border-top: 1px solid #f3f4f6;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .meta-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .visibility-badge {
          font-size: 0.875rem;
        }

        .like-count {
          font-weight: 500;
        }

        .post-date {
          color: #9ca3af;
        }

        .post-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }

        .btn-edit, .btn-delete {
          padding: 0.375rem 0.75rem;
          border-radius: 0.375rem;
          border: none;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          -webkit-tap-highlight-color: transparent;
        }

        @media (max-width: 640px) {
          .btn-edit, .btn-delete {
            padding: 0.5rem 1rem;
            font-size: 1rem;
          }
        }

        .btn-edit {
          background: #3b82f6;
          color: white;
        }

        .btn-edit:hover {
          background: #2563eb;
        }

        .btn-edit:active {
          transform: scale(0.95);
        }

        .btn-delete {
          background: #ef4444;
          color: white;
        }

        .btn-delete:hover {
          background: #dc2626;
        }

        .btn-delete:active {
          transform: scale(0.95);
        }

        /* Edit Mode */
        .edit-mode {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .edit-input, .edit-textarea, .edit-select {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          -webkit-appearance: none;
        }

        @media (max-width: 640px) {
          .edit-input, .edit-textarea, .edit-select {
            font-size: 16px;
            padding: 0.625rem;
          }
        }

        .edit-textarea {
          resize: vertical;
          min-height: 3rem;
        }

        .add-media-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
          background: #f3f4f6;
          border: 2px dashed #d1d5db;
          border-radius: 0.375rem;
          color: #6b7280;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-media-btn:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
        }

        .edit-files-count {
          font-size: 0.75rem;
          color: #10b981;
        }

        .edit-actions {
          display: flex;
          gap: 0.5rem;
        }

        .btn-save, .btn-cancel {
          flex: 1;
          padding: 0.5rem;
          border-radius: 0.375rem;
          border: none;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          -webkit-tap-highlight-color: transparent;
        }

        @media (max-width: 640px) {
          .btn-save, .btn-cancel {
            padding: 0.625rem;
            font-size: 1rem;
          }
        }

        .btn-save {
          background: #10b981;
          color: white;
        }

        .btn-save:hover {
          background: #059669;
        }

        .btn-save:active {
          transform: scale(0.95);
        }

        .btn-cancel {
          background: #6b7280;
          color: white;
        }

        .btn-cancel:hover {
          background: #4b5563;
        }

        .btn-cancel:active {
          transform: scale(0.95);
        }

        /* Comments Section */
        .comments-section {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #f3f4f6;
        }

        .comments-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 0.75rem 0;
        }

        .comments-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          max-height: 200px;
          overflow-y: auto;
        }

        .comment {
          font-size: 0.875rem;
          line-height: 1.5;
          word-wrap: break-word;
        }

        .comment-author {
          font-weight: 600;
          color: #8b5cf6;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          margin-right: 0.25rem;
        }

        .comment-author:hover {
          text-decoration: underline;
        }

        .comment-avatar {
          width: 1.25rem;
          height: 1.25rem;
          border-radius: 50%;
          object-fit: cover;
        }

        .comment-body {
          color: #4b5563;
        }

        .comment-form {
          display: flex;
          gap: 0.5rem;
        }

        .comment-input {
          flex: 1;
          padding: 0.375rem 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          -webkit-appearance: none;
        }

        @media (max-width: 640px) {
          .comment-input {
            font-size: 16px;
            padding: 0.5rem;
          }
        }

        .comment-input:focus {
          outline: none;
          border-color: #8b5cf6;
        }

        .comment-submit {
          padding: 0.375rem 0.75rem;
          background: #8b5cf6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          -webkit-tap-highlight-color: transparent;
        }

        @media (max-width: 640px) {
          .comment-submit {
            padding: 0.5rem 1rem;
            font-size: 1rem;
          }
        }

        .comment-submit:hover:not(:disabled) {
          background: #7c3aed;
        }

        .comment-submit:active {
          transform: scale(0.95);
        }

        .comment-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #6b7280;
        }

        .empty-title {
          font-size: 1.125rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }

        .empty-subtitle {
          font-size: 0.875rem;
          color: #9ca3af;
        }

        /* Mobile Optimizations */
        @media (max-width: 640px) {
          .message-toast {
            right: 0.5rem;
            left: 0.5rem;
            font-size: 0.875rem;
          }

          .posts-grid {
            padding: 0;
          }

          .post-card {
            border-radius: 0.75rem;
          }

          .post-content {
            padding: 0.75rem;
          }

          .comment-form {
            position: sticky;
            bottom: 0;
            background: white;
            padding: 0.5rem;
            border-top: 1px solid #e5e7eb;
            margin: 0 -0.75rem -0.75rem;
            z-index: 10;
          }

          button, .upload-button, .tag-link {
            min-height: 44px;
            min-width: 44px;
          }
        }

        /* Touch-friendly on mobile */
        @media (hover: none) {
          .post-image:hover {
            transform: none;
          }
          
          .like-button:hover {
            transform: none;
          }
        }

        /* Accessibility improvements */
        button:focus-visible,
        .upload-button:focus-visible,
        .tag-link:focus-visible,
        input:focus-visible,
        textarea:focus-visible,
        select:focus-visible {
          outline: 2px solid #8b5cf6;
          outline-offset: 2px;
        }

        /* Smooth scrolling for comments */
        .comments-list::-webkit-scrollbar {
          width: 4px;
        }

        .comments-list::-webkit-scrollbar-track {
          background: #f3f4f6;
        }

        .comments-list::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 2px;
        }

        .comments-list::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </section>
  );
}
