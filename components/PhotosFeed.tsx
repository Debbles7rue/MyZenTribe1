// components/PhotosFeed.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Post = {
  id: string;
  image_path: string;
  caption: string | null;
  description: string | null;
  visibility: "private" | "public";
  created_at: string;
  url: string;
  tags: string[];
  user_id: string;
};

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private", icon: "🔒", description: "Only on your profile" },
  { value: "public", label: "Public", icon: "👥", description: "Friends can see in their feed" },
] as const;

// Create Post Modal Component
function CreatePostModal({ 
  isOpen, 
  onClose, 
  userId, 
  onSuccess 
}: { 
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  onSuccess: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setCaption("");
      setDescription("");
      setTags("");
      setVisibility("private");
      setSelectedFiles([]);
      setPreviewUrls([]);
      setError(null);
    }
  }, [isOpen]);

  // Handle file selection (multiple files)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length === 0) return;

    // Combine existing files with new files, limit total to 5
    const combinedFiles = [...selectedFiles, ...newFiles].slice(0, 5);
    setSelectedFiles(combinedFiles);

    // Create preview URLs for new files only
    const newUrls = newFiles.map(file => URL.createObjectURL(file));
    const combinedUrls = [...previewUrls, ...newUrls].slice(0, 5);
    setPreviewUrls(combinedUrls);
    setError(null);

    // Reset the input so same file can be selected again if needed
    e.target.value = '';
  };

  // Remove a selected file
  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newUrls = previewUrls.filter((_, i) => i !== index);
    
    // Clean up old URL
    URL.revokeObjectURL(previewUrls[index]);
    
    setSelectedFiles(newFiles);
    setPreviewUrls(newUrls);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId || selectedFiles.length === 0) {
      setError("Please select at least one photo or video");
      return;
    }

    if (!caption.trim()) {
      setError("Please add a caption");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // For Phase 2, we'll upload the first file for now
      // Later we'll implement multiple file support
      const file = selectedFiles[0];
      const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      const path = `${userId}/${filename}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("event-photos")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create post record
      const { data: newPost, error: insertError } = await supabase
        .from("photo_posts")
        .insert({
          user_id: userId,
          image_path: path,
          caption: caption.trim(),
          description: description.trim() || null,
          visibility: visibility,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      // Handle tags
      const tagNames = tags.split(",").map(s => s.trim()).filter(Boolean);
      if (tagNames.length > 0) {
        try {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("full_name", tagNames);

          if (profiles?.length) {
            const tagRows = profiles.map(p => ({
              post_id: newPost.id,
              tagged_user_id: p.id
            }));
            
            await supabase.from("photo_tags").insert(tagRows);
          }
        } catch (tagErr) {
          console.warn("Error processing tags:", tagErr);
        }
      }

      // Success!
      onSuccess();
      onClose();
      
    } catch (err: any) {
      setError(err.message || "Failed to create post");
    } finally {
      setUploading(false);
    }
  };

  // Cleanup preview URLs when component unmounts
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Create New Memory</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* File Selection */}
          <div className="form-section">
            <label className="file-upload-area">
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                className="file-input"
              />
              {selectedFiles.length === 0 ? (
                <div className="upload-placeholder">
                  <div className="upload-icon">📸</div>
                  <div className="upload-text">Click to select photos or videos</div>
                  <div className="upload-hint">You can select multiple files</div>
                </div>
              ) : (
                <div className="selected-files">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="file-preview">
                      {selectedFiles[index].type.startsWith('video') ? (
                        <video src={url} className="preview-media" muted />
                      ) : (
                        <img src={url} alt="Preview" className="preview-media" />
                      )}
                      <button
                        type="button"
                        className="remove-file"
                        onClick={() => removeFile(index)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div className="add-more" onClick={() => document.querySelector<HTMLInputElement>('.file-input')?.click()}>
                    <div className="add-more-icon">+</div>
                    <div>Add More</div>
                  </div>
                </div>
              )}
            </label>
          </div>

          {/* Caption */}
          <div className="form-section">
            <label className="form-label">Caption *</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's happening in this moment?"
              className="form-input"
              maxLength={100}
              required
            />
            <div className="character-count">{100 - caption.length} characters remaining</div>
          </div>

          {/* Description */}
          <div className="form-section">
            <label className="form-label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Went to this event at Tree of Life! The food was fantastic!"
              className="form-textarea"
              rows={3}
              maxLength={500}
            />
            <div className="character-count">{500 - description.length} characters remaining</div>
          </div>

          {/* Tags */}
          <div className="form-section">
            <label className="form-label">Tag Friends</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Type names separated by commas"
              className="form-input"
            />
            <div className="form-hint">Friends you tag can collaborate on this post</div>
          </div>

          {/* Visibility */}
          <div className="form-section">
            <label className="form-label">Who can see this?</label>
            <div className="visibility-grid">
              {VISIBILITY_OPTIONS.map(option => (
                <label key={option.value} className="visibility-option">
                  <input
                    type="radio"
                    name="visibility"
                    value={option.value}
                    checked={visibility === option.value}
                    onChange={(e) => setVisibility(e.target.value as any)}
                  />
                  <div className="option-content">
                    <span className="option-icon">{option.icon}</span>
                    <div className="option-text">
                      <div className="option-label">{option.label}</div>
                      <div className="option-description">{option.description}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && <div className="error-message">{error}</div>}

          {/* Form Actions */}
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={uploading} className="btn-primary">
              {uploading ? "Creating..." : "Create Memory"}
            </button>
          </div>
        </form>

        <style jsx>{`
          .modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 1rem;
          }

          .modal-content {
            background: white;
            border-radius: 1rem;
            max-width: 600px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          }

          .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1.5rem 1.5rem 0 1.5rem;
            border-bottom: 1px solid #e5e7eb;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
          }

          .modal-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #1f2937;
            margin: 0;
          }

          .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0.5rem;
            color: #6b7280;
            border-radius: 0.5rem;
          }

          .modal-close:hover {
            background: #f3f4f6;
            color: #374151;
          }

          .modal-form {
            padding: 0 1.5rem 1.5rem 1.5rem;
          }

          .form-section {
            margin-bottom: 1.5rem;
          }

          .file-upload-area {
            display: block;
            border: 2px dashed #d1d5db;
            border-radius: 0.75rem;
            padding: 2rem;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s ease;
            background: #f9fafb;
          }

          .file-upload-area:hover {
            border-color: #8b5cf6;
            background: #f3f4f6;
          }

          .file-input {
            display: none;
          }

          .upload-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
          }

          .upload-icon {
            font-size: 3rem;
          }

          .upload-text {
            font-weight: 500;
            color: #374151;
          }

          .upload-hint {
            font-size: 0.875rem;
            color: #6b7280;
          }

          .selected-files {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            align-items: center;
          }

          .file-preview {
            position: relative;
            width: 100px;
            height: 100px;
            border-radius: 0.5rem;
            overflow: hidden;
          }

          .preview-media {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .remove-file {
            position: absolute;
            top: 0.25rem;
            right: 0.25rem;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            border: none;
            border-radius: 50%;
            width: 1.5rem;
            height: 1.5rem;
            cursor: pointer;
            font-size: 0.75rem;
          }

          .add-more {
            width: 100px;
            height: 100px;
            border: 2px dashed #d1d5db;
            border-radius: 0.5rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: #6b7280;
            font-size: 0.875rem;
            transition: all 0.2s ease;
          }

          .add-more:hover {
            border-color: #8b5cf6;
            color: #8b5cf6;
          }

          .add-more-icon {
            font-size: 1.5rem;
            margin-bottom: 0.25rem;
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
            background: #f9fafb;
            transition: all 0.2s ease;
            font-family: inherit;
            font-size: 16px; /* Prevents zoom on iOS */
          }

          .form-input:focus, .form-textarea:focus {
            outline: none;
            border-color: #8b5cf6;
            background: white;
            box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
          }

          .form-textarea {
            resize: vertical;
            min-height: 4rem;
          }

          .character-count {
            font-size: 0.75rem;
            color: #6b7280;
            margin-top: 0.25rem;
          }

          .form-hint {
            font-size: 0.75rem;
            color: #8b5cf6;
            margin-top: 0.25rem;
          }

          .visibility-grid {
            display: grid;
            gap: 0.75rem;
          }

          .visibility-option {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem;
            border: 1px solid #e5e7eb;
            border-radius: 0.5rem;
            cursor: pointer;
            transition: all 0.2s ease;
            background: #f9fafb;
          }

          .visibility-option:hover {
            border-color: #8b5cf6;
            background: white;
          }

          .visibility-option input[type="radio"] {
            margin: 0;
          }

          .option-content {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex: 1;
          }

          .option-icon {
            font-size: 1.25rem;
          }

          .option-label {
            font-weight: 500;
            color: #374151;
          }

          .option-description {
            font-size: 0.75rem;
            color: #6b7280;
          }

          .error-message {
            background: #fef2f2;
            color: #dc2626;
            padding: 0.75rem;
            border-radius: 0.5rem;
            border: 1px solid #fecaca;
            margin-bottom: 1rem;
          }

          .form-actions {
            display: flex;
            gap: 0.75rem;
            justify-content: flex-end;
            padding-top: 1rem;
            border-top: 1px solid #e5e7eb;
          }

          .btn-secondary {
            padding: 0.75rem 1.5rem;
            background: #f3f4f6;
            color: #374151;
            border: 1px solid #d1d5db;
            border-radius: 0.5rem;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s ease;
          }

          .btn-secondary:hover {
            background: #e5e7eb;
          }

          .btn-primary {
            padding: 0.75rem 1.5rem;
            background: linear-gradient(135deg, #8b5cf6, #7c3aed);
            color: white;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s ease;
          }

          .btn-primary:hover:not(:disabled) {
            background: linear-gradient(135deg, #7c3aed, #6d28d9);
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(139, 92, 246, 0.3);
          }

          .btn-primary:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
          }

          @media (max-width: 640px) {
            .modal-content {
              margin: 0;
              max-height: 100vh;
              border-radius: 0;
            }

            .form-actions {
              flex-direction: column;
            }

            .selected-files {
              justify-content: center;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

export default function PhotosFeed({ userId }: { userId: string | null }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPost, setEditingPost] = useState<string | null>(null);

  const canPost = useMemo(() => !!userId, [userId]);

  async function listPosts() {
    if (!userId) return setPosts([]);
    
    try {
      const { data: rows, error } = await supabase
        .from("photo_posts")
        .select("id, image_path, caption, description, visibility, created_at, user_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const items = await Promise.all((rows ?? []).map(async (r) => {
        const { data: pub } = supabase.storage.from("event-photos").getPublicUrl(r.image_path);
        
        // Get tagged users
        const { data: tagsRows } = await supabase
          .from("photo_tags")
          .select("tagged_user_id")
          .eq("post_id", r.id);
        
        let tagNames: string[] = [];
        if (tagsRows?.length) {
          const ids = tagsRows.map(t => t.tagged_user_id);
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", ids);
          tagNames = (profs ?? []).map(p => p.full_name || "Unknown User");
        }

        return {
          id: r.id,
          image_path: r.image_path,
          caption: r.caption,
          description: r.description,
          visibility: (r.visibility || "private") as Post["visibility"],
          created_at: r.created_at,
          url: pub.publicUrl,
          tags: tagNames,
          user_id: r.user_id,
        };
      }));

      setPosts(items);
    } catch (err: any) {
      console.error("Error loading posts:", err);
    } finally {
      setLoading(false);
    }
  }

  async function deletePost(postId: string, imagePath: string) {
    if (!confirm("Are you sure you want to delete this post? This cannot be undone.")) {
      return;
    }

    try {
      const { error: dbError } = await supabase
        .from("photo_posts")
        .delete()
        .eq("id", postId);

      if (dbError) throw dbError;

      const { error: storageError } = await supabase.storage
        .from("event-photos")
        .remove([imagePath]);

      if (storageError) console.warn("Storage delete failed:", storageError);

      await listPosts();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  useEffect(() => { 
    listPosts(); 
  }, [userId]);

  return (
    <section className="photos-feed">
      <div className="feed-header">
        <h2 className="feed-title">Photos & Memories</h2>
        {canPost && (
          <button 
            className="create-post-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <span className="create-icon">📸</span>
            Create Memory
          </button>
        )}
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        userId={userId}
        onSuccess={listPosts}
      />

      {/* Posts Feed */}
      <div className="posts-grid">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span>Loading memories...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📸</div>
            <h3>No memories yet!</h3>
            <p>Click "Create Memory" to share your first moment</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="post-card">
              <div className="post-header">
                <div className="post-info">
                  <div className="post-visibility">
                    {VISIBILITY_OPTIONS.find(v => v.value === post.visibility)?.icon} 
                    {VISIBILITY_OPTIONS.find(v => v.value === post.visibility)?.label}
                  </div>
                  <div className="post-date">{formatDate(post.created_at)}</div>
                </div>
                
                {post.user_id === userId && (
                  <div className="post-actions">
                    <button 
                      onClick={() => setEditingPost(post.id)}
                      className="action-button edit"
                      title="Edit post"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => deletePost(post.id, post.image_path)}
                      className="action-button delete"
                      title="Delete post"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>

              <div className="post-image">
                <img src={post.url} alt={post.caption || "Photo"} />
              </div>

              <div className="post-content">
                {post.caption && <div className="post-caption">{post.caption}</div>}
                {post.description && <div className="post-description">{post.description}</div>}
                
                {post.tags.length > 0 && (
                  <div className="post-tags">
                    <span className="tags-label">With:</span>
                    {post.tags.map((tag, i) => (
                      <span key={i} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .photos-feed {
          max-width: 600px;
          margin: 0 auto;
        }

        .feed-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
        }

        .feed-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .create-post-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          border: none;
          border-radius: 2rem;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .create-post-btn:hover {
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
        }

        .create-icon {
          font-size: 1.125rem;
        }

        .posts-grid {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 3rem 0;
          color: #6b7280;
        }

        .loading-spinner {
          width: 1.5rem;
          height: 1.5rem;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: #6b7280;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.25rem;
          color: #374151;
        }

        .post-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(248,250,252,0.8));
          border-radius: 1rem;
          overflow: hidden;
          border: 1px solid rgba(139,92,246,0.2);
          backdrop-filter: blur(5px);
          transition: all 0.2s ease;
        }

        .post-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.1);
        }

        .post-header {
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(0,0,0,0.1);
        }

        .post-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .post-visibility {
          font-size: 0.875rem;
          font-weight: 500;
          color: #8b5cf6;
        }

        .post-date {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .post-actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-button {
          background: none;
          border: 1px solid rgba(0,0,0,0.1);
          border-radius: 0.375rem;
          padding: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.875rem;
        }

        .action-button:hover {
          background: rgba(0,0,0,0.05);
          transform: scale(1.05);
        }

        .post-image {
          position: relative;
          width: 100%;
        }

        .post-image img {
          width: 100%;
          height: auto;
          display: block;
          object-fit: cover;
        }

        .post-content {
          padding: 1rem;
        }

        .post-caption {
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #1f2937;
        }

        .post-description {
          color: #374151;
          line-height: 1.5;
          margin-bottom: 0.75rem;
        }

        .post-tags {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        .tags-label {
          color: #6b7280;
          font-weight: 500;
        }

        .tag {
          background: #8b5cf6;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 500;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .photos-feed {
            max-width: 100%;
            padding: 0 1rem;
          }
          
          .feed-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }
          
          .create-post-btn {
            justify-content: center;
          }
        }
      `}</style>
    </section>
  );
}
