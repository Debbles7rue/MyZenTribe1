// components/PhotosFeed.tsx - PHASE 2: Multi-Media Support
"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

type MediaItem = {
  id: string;
  url: string;
  type: 'image' | 'video';
  filename: string;
};

type Post = {
  id: string;
  user_id: string;
  caption: string | null;
  description: string | null; // New field for collaborative editing
  visibility: "private" | "public";
  created_at: string;
  media: MediaItem[];
  tags: string[];
  isEditing?: boolean;
};

const VISIBILITY_OPTIONS = [
  { value: "private", label: "🔒 Private", description: "Only on your profile" },
  { value: "public", label: "🌍 Public", description: "Shows in friends' feeds" },
] as const;

interface PhotosFeedProps {
  userId: string | null;
  maxPhotos?: number;
  allowEdit?: boolean;
}

export default function PhotosFeed({ 
  userId, 
  maxPhotos = 20, 
  allowEdit = true 
}: PhotosFeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  // Form state
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canPost = !!userId;

  // Show status messages briefly
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Load posts on mount
  useEffect(() => {
    if (userId) {
      loadPosts();
    } else {
      setLoading(false);
    }
  }, [userId]);

  async function loadPosts() {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Get posts with media
      const { data: postsData, error: postsError } = await supabase
        .from("photo_posts")
        .select(`
          id, user_id, caption, description, visibility, created_at,
          post_media (
            id, storage_path, media_type, filename, created_at
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      // Format posts with media URLs
      const formattedPosts = await Promise.all((postsData || []).map(async (post) => {
        // Get media URLs
        const media = await Promise.all((post.post_media || []).map(async (item) => {
          const bucket = item.media_type === 'video' ? 'post-videos' : 'event-photos';
          const { data } = supabase.storage.from(bucket).getPublicUrl(item.storage_path);
          
          return {
            id: item.id,
            url: data.publicUrl,
            type: item.media_type as 'image' | 'video',
            filename: item.filename
          };
        }));

        // Get tags
        const { data: tagsData } = await supabase
          .from("photo_tags")
          .select(`
            tagged_user_id,
            profiles!photo_tags_tagged_user_id_fkey(full_name)
          `)
          .eq("post_id", post.id);

        const tags = (tagsData || [])
          .map(t => t.profiles?.full_name)
          .filter(Boolean) as string[];

        return {
          id: post.id,
          user_id: post.user_id,
          caption: post.caption,
          description: post.description,
          visibility: post.visibility as "private" | "public",
          created_at: post.created_at,
          media: media,
          tags: tags,
          isEditing: false
        };
      }));

      setPosts(formattedPosts);
    } catch (err) {
      console.error("Error loading posts:", err);
      setStatus({ type: 'error', message: 'Failed to load posts' });
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit
      
      if (!isImage && !isVideo) {
        setStatus({ type: 'error', message: 'Please select images or videos only' });
        return false;
      }
      
      if (!isValidSize) {
        setStatus({ type: 'error', message: `${file.name} is too large (max 50MB)` });
        return false;
      }
      
      return true;
    });

    if (validFiles.length > 10) {
      setStatus({ type: 'error', message: 'Maximum 10 files per post' });
      return;
    }

    setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 10));
  }

  function removeFile(index: number) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }

  async function createPost() {
    if (!userId || (!selectedFiles.length && !caption.trim())) {
      setStatus({ type: 'error', message: 'Please add media or write a caption' });
      return;
    }

    setUploading(true);
    setStatus({ type: 'info', message: 'Creating post...' });

    try {
      // Create post record
      const { data: newPost, error: postError } = await supabase
        .from("photo_posts")
        .insert({
          user_id: userId,
          caption: caption.trim() || null,
          description: description.trim() || null,
          visibility: visibility
        })
        .select()
        .single();

      if (postError) throw postError;

      // Upload media files
      if (selectedFiles.length > 0) {
        const mediaPromises = selectedFiles.map(async (file, index) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${newPost.id}_${index}.${fileExt}`;
          const filePath = `${userId}/${fileName}`;
          const bucket = file.type.startsWith('video/') ? 'post-videos' : 'event-photos';

          // Upload file
          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          // Create media record
          const { error: mediaError } = await supabase
            .from("post_media")
            .insert({
              post_id: newPost.id,
              storage_path: filePath,
              media_type: file.type.startsWith('video/') ? 'video' : 'image',
              filename: file.name
            });

          if (mediaError) throw mediaError;
        });

        await Promise.all(mediaPromises);
      }

      // Handle tags
      if (tags.trim()) {
        const tagNames = tags.split(',').map(t => t.trim()).filter(Boolean);
        
        if (tagNames.length > 0) {
          // Find users by name
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("full_name", tagNames);

          if (profiles && profiles.length > 0) {
            const tagRecords = profiles.map(profile => ({
              post_id: newPost.id,
              tagged_user_id: profile.id
            }));

            await supabase.from("photo_tags").insert(tagRecords);
            
            // TODO: Create notifications for tagged users
            // This is where Phase 3 notification system will go
          }
        }
      }

      // Reset form
      setCaption("");
      setDescription("");
      setTags("");
      setVisibility("private");
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";

      setStatus({ type: 'success', message: 'Post created successfully!' });
      await loadPosts(); // Refresh posts

    } catch (err: any) {
      console.error("Error creating post:", err);
      setStatus({ type: 'error', message: err.message || 'Failed to create post' });
    } finally {
      setUploading(false);
    }
  }

  async function toggleEdit(postId: string) {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, isEditing: !post.isEditing }
        : { ...post, isEditing: false }
    ));
  }

  async function updatePost(postId: string, updates: { caption?: string; description?: string; visibility?: "private" | "public" }) {
    try {
      const { error } = await supabase
        .from("photo_posts")
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq("id", postId)
        .eq("user_id", userId); // Security: only owner can edit

      if (error) throw error;

      setStatus({ type: 'success', message: 'Post updated successfully!' });
      await loadPosts();
    } catch (err: any) {
      console.error("Error updating post:", err);
      setStatus({ type: 'error', message: 'Failed to update post' });
    }
  }

  async function deletePost(postId: string) {
    if (!confirm("Delete this post? This cannot be undone.")) return;

    try {
      // Delete media files from storage
      const post = posts.find(p => p.id === postId);
      if (post?.media) {
        const deletePromises = post.media.map(async (item) => {
          const bucket = item.type === 'video' ? 'post-videos' : 'event-photos';
          // Extract storage path from URL or use stored path
          const pathParts = item.url.split('/');
          const path = pathParts.slice(-2).join('/'); // userId/filename
          
          await supabase.storage.from(bucket).remove([path]);
        });
        
        await Promise.all(deletePromises);
      }

      // Delete post record (cascades to media and tags)
      const { error } = await supabase
        .from("photo_posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", userId); // Security: only owner can delete

      if (error) throw error;

      setStatus({ type: 'success', message: 'Post deleted successfully!' });
      await loadPosts();
    } catch (err: any) {
      console.error("Error deleting post:", err);
      setStatus({ type: 'error', message: 'Failed to delete post' });
    }
  }

  if (loading) {
    return (
      <div className="photos-feed">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <span>Loading your photos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="photos-feed">
      {/* Status Messages */}
      {status && (
        <div className={`status-message ${status.type}`}>
          {status.message}
        </div>
      )}

      {/* Create Post Form */}
      {canPost && (
        <div className="create-post-card">
          <h3 className="create-title">Share a Memory</h3>
          
          <div className="form-group">
            <label className="form-label">Caption</label>
            <input
              type="text"
              className="form-input"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's this moment about?"
              maxLength={200}
            />
            <div className="char-count">{caption.length}/200</div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell the full story... (friends you tag can add to this later!)"
              rows={3}
              maxLength={1000}
            />
            <div className="char-count">{description.length}/1000</div>
          </div>

          <div className="form-group">
            <label className="form-label">Tag Friends</label>
            <input
              type="text"
              className="form-input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Friend names, separated by commas"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Visibility</label>
            <div className="visibility-options">
              {VISIBILITY_OPTIONS.map(option => (
                <label key={option.value} className="visibility-option">
                  <input
                    type="radio"
                    name="visibility"
                    value={option.value}
                    checked={visibility === option.value}
                    onChange={(e) => setVisibility(e.target.value as "private" | "public")}
                  />
                  <div className="option-content">
                    <div className="option-label">{option.label}</div>
                    <div className="option-description">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* File Selection */}
          <div className="form-group">
            <label className="form-label">Photos & Videos</label>
            <div className="file-upload-area">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="file-input"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="file-upload-label">
                <span className="upload-icon">📁</span>
                <span>Choose photos & videos</span>
                <span className="upload-hint">Up to 10 files, 50MB each</span>
              </label>
            </div>

            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <div className="selected-files">
                <div className="files-header">
                  <span>Selected Files ({selectedFiles.length}/10)</span>
                  <button 
                    onClick={() => setSelectedFiles([])}
                    className="clear-all-btn"
                  >
                    Clear All
                  </button>
                </div>
                <div className="files-grid">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="file-preview">
                      {file.type.startsWith('image/') ? (
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt="Preview"
                          className="preview-image"
                        />
                      ) : (
                        <div className="video-preview">
                          <span className="video-icon">🎥</span>
                          <span className="video-name">{file.name}</span>
                        </div>
                      )}
                      <button 
                        onClick={() => removeFile(index)}
                        className="remove-file-btn"
                        title="Remove file"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button 
            className="create-post-btn"
            onClick={createPost}
            disabled={uploading || (!selectedFiles.length && !caption.trim())}
          >
            {uploading ? "Creating..." : "Share Memory"}
          </button>
        </div>
      )}

      {/* Posts Grid */}
      <div className="posts-section">
        {posts.length > 0 ? (
          <div className="posts-grid">
            {posts.map(post => (
              <div key={post.id} className="post-card">
                {/* Media Display */}
                {post.media.length > 0 && (
                  <div className={`media-container ${post.media.length > 1 ? 'multi-media' : ''}`}>
                    {post.media.map((item, index) => (
                      <div key={item.id} className="media-item">
                        {item.type === 'image' ? (
                          <img 
                            src={item.url} 
                            alt={`Media ${index + 1}`}
                            className="media-image"
                            loading="lazy"
                          />
                        ) : (
                          <video 
                            src={item.url}
                            className="media-video"
                            controls
                            preload="metadata"
                          />
                        )}
                      </div>
                    ))}
                    {post.media.length > 1 && (
                      <div className="media-count">
                        {post.media.length} files
                      </div>
                    )}
                  </div>
                )}

                {/* Post Content */}
                <div className="post-content">
                  {!post.isEditing ? (
                    <>
                      {post.caption && (
                        <h4 className="post-caption">{post.caption}</h4>
                      )}
                      {post.description && (
                        <p className="post-description">{post.description}</p>
                      )}
                      <div className="post-meta">
                        <span className="post-visibility">
                          {visibility === "private" ? "🔒 Private" : "🌍 Public"}
                        </span>
                        {post.tags.length > 0 && (
                          <span className="post-tags">
                            Tagged: {post.tags.join(", ")}
                          </span>
                        )}
                        <span className="post-date">
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Actions - Only for post owner */}
                      {allowEdit && post.user_id === userId && (
                        <div className="post-actions">
                          <button 
                            onClick={() => toggleEdit(post.id)}
                            className="action-btn edit-btn"
                          >
                            ✏️ Edit
                          </button>
                          <button 
                            onClick={() => deletePost(post.id)}
                            className="action-btn delete-btn"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <EditPostForm 
                      post={post}
                      onSave={(updates) => {
                        updatePost(post.id, updates);
                        toggleEdit(post.id);
                      }}
                      onCancel={() => toggleEdit(post.id)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📸</div>
            <p className="empty-text">No photos yet</p>
            <p className="empty-subtext">
              {canPost 
                ? "Share your first memory above!" 
                : "Photos will appear here when shared"
              }
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        .photos-feed {
          max-width: 600px;
          margin: 0 auto;
          padding: 1rem;
        }

        /* Status Messages */
        .status-message {
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          font-weight: 500;
          text-align: center;
        }

        .status-message.success {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .status-message.error {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .status-message.info {
          background: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        }

        /* Create Post Card */
        .create-post-card {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          border: 1px solid rgba(139,92,246,0.1);
        }

        .create-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 1.5rem 0;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: block;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .form-input, .form-textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 1rem;
          transition: all 0.2s;
          font-family: inherit;
        }

        .form-input:focus, .form-textarea:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
        }

        .form-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .char-count {
          text-align: right;
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }

        /* Visibility Options */
        .visibility-options {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .visibility-option {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .visibility-option:hover {
          border-color: #8b5cf6;
          background: rgba(139,92,246,0.02);
        }

        .visibility-option input[type="radio"] {
          margin-top: 0.125rem;
        }

        .visibility-option input[type="radio"]:checked + .option-content {
          color: #8b5cf6;
        }

        .option-content {
          flex: 1;
        }

        .option-label {
          font-weight: 500;
          margin-bottom: 0.25rem;
        }

        .option-description {
          font-size: 0.875rem;
          color: #6b7280;
        }

        /* File Upload */
        .file-upload-area {
          position: relative;
        }

        .file-input {
          display: none;
        }

        .file-upload-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          border: 2px dashed #d1d5db;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          background: #f9fafb;
        }

        .file-upload-label:hover {
          border-color: #8b5cf6;
          background: rgba(139,92,246,0.02);
        }

        .upload-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .upload-hint {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }

        /* Selected Files */
        .selected-files {
          margin-top: 1rem;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
        }

        .files-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .clear-all-btn {
          background: none;
          border: none;
          color: #dc2626;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .clear-all-btn:hover {
          text-decoration: underline;
        }

        .files-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 0.75rem;
        }

        .file-preview {
          position: relative;
          aspect-ratio: 1;
          border-radius: 0.5rem;
          overflow: hidden;
          background: white;
          border: 1px solid #e5e7eb;
        }

        .preview-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .video-preview {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 0.5rem;
          text-align: center;
        }

        .video-icon {
          font-size: 1.5rem;
          margin-bottom: 0.25rem;
        }

        .video-name {
          font-size: 0.75rem;
          color: #6b7280;
          word-break: break-all;
        }

        .remove-file-btn {
          position: absolute;
          top: 0.25rem;
          right: 0.25rem;
          width: 1.5rem;
          height: 1.5rem;
          background: rgba(0,0,0,0.7);
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .remove-file-btn:hover {
          background: #dc2626;
        }

        /* Create Post Button */
        .create-post-btn {
          width: 100%;
          padding: 0.875rem;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .create-post-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139,92,246,0.3);
        }

        .create-post-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        /* Posts Grid */
        .posts-section {
          margin-top: 2rem;
        }

        .posts-grid {
          display: grid;
          gap: 2rem;
        }

        .post-card {
          background: white;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .post-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }

        /* Media Container */
        .media-container {
          position: relative;
        }

        .media-container.multi-media {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          max-height: 400px;
          overflow: hidden;
        }

        .media-item {
          position: relative;
        }

        .media-image, .media-video {
          width: 100%;
          height: 300px;
          object-fit: cover;
        }

        .media-container.multi-media .media-image,
        .media-container.multi-media .media-video {
          height: 200px;
        }

        .media-count {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: rgba(0,0,0,0.7);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
        }

        /* Post Content */
        .post-content {
          padding: 1.5rem;
        }

        .post-caption {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .post-description {
          color: #4b5563;
          line-height: 1.6;
          margin: 0 0 1rem 0;
        }

        .post-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 1rem;
        }

        .post-visibility {
          font-weight: 500;
        }

        .post-actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          background: white;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .edit-btn:hover {
          border-color: #8b5cf6;
          color: #8b5cf6;
        }

        .delete-btn:hover {
          border-color: #dc2626;
          color: #dc2626;
        }

        /* Loading State */
        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 3rem;
        }

        .loading-spinner {
          width: 1.5rem;
          height: 1.5rem;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Empty State */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
          text-align: center;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-text {
          font-size: 1.125rem;
          font-weight: 600;
          color: #4b5563;
          margin: 0 0 0.5rem 0;
        }

        .empty-subtext {
          color: #9ca3af;
          margin: 0;
        }

        /* Mobile Responsiveness */
        @media (max-width: 640px) {
          .photos-feed {
            padding: 0.5rem;
          }

          .create-post-card {
            padding: 1rem;
          }

          .files-grid {
            grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          }

          .visibility-options {
            gap: 0.5rem;
          }

          .visibility-option {
            padding: 0.75rem;
          }

          .post-content {
            padding: 1rem;
          }

          .media-container.multi-media {
            grid-template-columns: 1fr;
          }

          .post-actions {
            flex-direction: column;
          }

          .action-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

// Edit Post Form Component
function EditPostForm({ 
  post, 
  onSave, 
  onCancel 
}: { 
  post: Post; 
  onSave: (updates: { caption?: string; description?: string; visibility?: "private" | "public" }) => void;
  onCancel: () => void;
}) {
  const [caption, setCaption] = useState(post.caption || "");
  const [description, setDescription] = useState(post.description || "");
  const [visibility, setVisibility] = useState(post.visibility);

  const handleSave = () => {
    onSave({
      caption: caption.trim() || undefined,
      description: description.trim() || undefined,
      visibility
    });
  };

  return (
    <div className="edit-form">
      <div className="form-group">
        <label className="form-label">Caption</label>
        <input
          type="text"
          className="form-input"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={200}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea
          className="form-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={1000}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Visibility</label>
        <select 
          className="form-input"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as "private" | "public")}
        >
          {VISIBILITY_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="edit-actions">
        <button onClick={handleSave} className="save-btn">
          Save Changes
        </button>
        <button onClick={onCancel} className="cancel-btn">
          Cancel
        </button>
      </div>

      <style jsx>{`
        .edit-form {
          padding: 1rem;
          background: #f9fafb;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-label {
          display: block;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .form-input, .form-textarea {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }

        .form-input:focus, .form-textarea:focus {
          outline: none;
          border-color: #8b5cf6;
        }

        .edit-actions {
          display: flex;
          gap: 0.5rem;
        }

        .save-btn {
          background: #8b5cf6;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .cancel-btn {
          background: white;
          color: #6b7280;
          border: 1px solid #d1d5db;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .save-btn:hover {
          background: #7c3aed;
        }

        .cancel-btn:hover {
          background: #f9fafb;
        }
      `}</style>
    </div>
  );
}
