// components/PhotosFeed.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  createPostRPC, 
  uploadMediaToPost, 
  listPostMedia,
  removeMedia,
  inviteCollaborator,
  listMyInvites,
  respondToInvite 
} from "@/lib/collab-demo";

type Post = {
  id: string;
  caption: string | null;
  description: string | null;
  visibility: "private" | "friends";
  created_at: string;
  created_by: string;
  media: MediaItem[];
  collaborators: string[];
  tags: string[];
};

type MediaItem = {
  id: string;
  storage_path: string;
  type: "image" | "video";
  created_by: string;
  url: string;
};

type Invite = {
  post_id: string;
  status: string;
  added_by: string;
  created_at: string;
};

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private", icon: "🔒", description: "Only on your profile + tagged friends" },
  { value: "friends", label: "Public", icon: "👥", description: "Shows in friends' feeds" },
] as const;

// Collaboration Invites Component
function CollaborationInvites({ 
  userId, 
  onInviteResponded 
}: { 
  userId: string | null;
  onInviteResponded: () => void;
}) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  const loadInvites = async () => {
    if (!userId) return;
    try {
      const inviteData = await listMyInvites();
      const pendingInvites = inviteData.filter(inv => inv.status === "invited");
      setInvites(pendingInvites);
    } catch (err) {
      console.error("Failed to load invites:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteResponse = async (postId: string, accept: boolean) => {
    setResponding(postId);
    try {
      await respondToInvite(postId, accept);
      await loadInvites();
      onInviteResponded();
    } catch (err: any) {
      alert(`Failed to respond to invite: ${err.message}`);
    } finally {
      setResponding(null);
    }
  };

  useEffect(() => {
    loadInvites();
  }, [userId]);

  if (loading || invites.length === 0) return null;

  return (
    <div className="collaboration-invites">
      <h3 className="invites-title">Collaboration Invites</h3>
      <div className="invites-list">
        {invites.map(invite => (
          <div key={invite.post_id} className="invite-card">
            <div className="invite-content">
              <div className="invite-text">
                <span className="invite-icon">🤝</span>
                Someone invited you to collaborate on their post!
              </div>
              <div className="invite-actions">
                <button
                  onClick={() => handleInviteResponse(invite.post_id, true)}
                  disabled={responding === invite.post_id}
                  className="btn-accept"
                >
                  {responding === invite.post_id ? "..." : "Accept & Add Photos"}
                </button>
                <button
                  onClick={() => handleInviteResponse(invite.post_id, false)}
                  disabled={responding === invite.post_id}
                  className="btn-decline"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <style jsx>{`
        .collaboration-invites {
          margin-bottom: 2rem;
        }
        
        .invites-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #8b5cf6;
          margin-bottom: 1rem;
        }
        
        .invites-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .invite-card {
          background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
          border: 2px solid #8b5cf6;
          border-radius: 1rem;
          padding: 1rem;
        }
        
        .invite-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }
        
        .invite-text {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
          color: #374151;
        }
        
        .invite-icon {
          font-size: 1.25rem;
        }
        
        .invite-actions {
          display: flex;
          gap: 0.5rem;
        }
        
        .btn-accept, .btn-decline {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        
        .btn-accept {
          background: #8b5cf6;
          color: white;
        }
        
        .btn-accept:hover:not(:disabled) {
          background: #7c3aed;
        }
        
        .btn-decline {
          background: #f3f4f6;
          color: #6b7280;
        }
        
        .btn-decline:hover:not(:disabled) {
          background: #e5e7eb;
        }
        
        .btn-accept:disabled, .btn-decline:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        @media (max-width: 640px) {
          .invite-content {
            flex-direction: column;
            align-items: stretch;
          }
          
          .invite-actions {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

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
  const [visibility, setVisibility] = useState<"private" | "friends">("private");
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

  // Handle file selection (unlimited photos/videos)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length === 0) return;

    // Combine existing files with new files (no limit!)
    const combinedFiles = [...selectedFiles, ...newFiles];
    setSelectedFiles(combinedFiles);

    // Create preview URLs for new files only
    const newUrls = newFiles.map(file => URL.createObjectURL(file));
    const combinedUrls = [...previewUrls, ...newUrls];
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
      // 1. Create the collaborative post
      const postId = await createPostRPC({
        caption: caption.trim(),
        description: description.trim() || null,
        visibility: visibility,
      });

      // 2. Upload ALL selected files (not just the first!)
      await uploadMediaToPost(postId, selectedFiles);

      // 3. Send collaboration invites to tagged friends
      const tagNames = tags.split(",").map(s => s.trim()).filter(Boolean);
      if (tagNames.length > 0) {
        try {
          // Find users by name and invite them
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("full_name", tagNames);

          if (profiles?.length) {
            for (const profile of profiles) {
              await inviteCollaborator(postId, profile.id);
            }
          }
        } catch (tagErr) {
          console.warn("Error sending collaboration invites:", tagErr);
        }
      }

      // Success!
      onSuccess();
      onClose();
      
    } catch (err: any) {
      setError(err.message || "Failed to create collaborative post");
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
          <h2 className="modal-title">Create Collaborative Memory</h2>
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
                  <div className="upload-hint">Select as many files as you want - all will upload!</div>
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
            <label className="form-label">Tag Friends to Collaborate</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Type names separated by commas"
              className="form-input"
            />
            <div className="form-hint">Tagged friends will get invites to add their own photos and videos!</div>
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
              {uploading ? "Creating Collaborative Post..." : "Create Collaborative Memory"}
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
            color: #8b5cf6;
            font-weight: 500;
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
            font-weight: 500;
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
  const [inviteCount, setInviteCount] = useState(0);

  const canPost = useMemo(() => !!userId, [userId]);

  async function loadPosts() {
    if (!userId) {
      setPosts([]);
      setLoading(false);
      return;
    }
    
    try {
      // Load collaborative posts where user is owner or collaborator
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(`
          id,
          caption,
          description, 
          visibility,
          created_at,
          created_by
        `)
        .or(`created_by.eq.${userId},id.in.(${await getCollaborativePosts(userId)})`)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      // Load media and collaborators for each post
      const enrichedPosts = await Promise.all((postsData || []).map(async (post) => {
        const [mediaData, collabData] = await Promise.all([
          listPostMedia(post.id),
          getPostCollaborators(post.id)
        ]);

        // Convert storage paths to public URLs
        const mediaWithUrls = await Promise.all(mediaData.map(async (media) => {
          const { data: urlData } = supabase.storage
            .from("post-media")
            .getPublicUrl(media.storage_path.replace("post-media/", ""));
          
          return {
            ...media,
            url: urlData.publicUrl
          };
        }));

        return {
          id: post.id,
          caption: post.caption,
          description: post.description,
          visibility: post.visibility as "private" | "friends",
          created_at: post.created_at,
          created_by: post.created_by,
          media: mediaWithUrls,
          collaborators: collabData,
          tags: [] // Will be filled with actual tagged user names
        };
      }));

      setPosts(enrichedPosts);
    } catch (err: any) {
      console.error("Error loading posts:", err);
    } finally {
      setLoading(false);
    }
  }

  // Helper function to get posts where user is a collaborator
  async function getCollaborativePosts(userId: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from("post_collaborators")
        .select("post_id")
        .eq("user_id", userId)
        .eq("status", "accepted");
      
      if (error) throw error;
      
      const postIds = data?.map(item => item.post_id) || [];
      return postIds.length > 0 ? postIds.join(",") : "''";
    } catch (err) {
      console.error("Error getting collaborative posts:", err);
      return "''";
    }
  }

  // Helper function to get post collaborators
  async function getPostCollaborators(postId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from("post_collaborators")
        .select(`
          user_id,
          profiles!inner(full_name)
        `)
        .eq("post_id", postId)
        .eq("status", "accepted");
      
      if (error) throw error;
      
      return data?.map(item => (item.profiles as any)?.full_name || "Unknown") || [];
    } catch (err) {
      console.error("Error getting collaborators:", err);
      return [];
    }
  }

  async function deletePost(postId: string) {
    if (!confirm("Are you sure you want to delete this collaborative post? This cannot be undone.")) {
      return;
    }

    try {
      // Delete post (cascading deletes should handle media and collaborators)
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      await loadPosts();
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

  const handleInviteResponse = () => {
    loadPosts(); // Reload posts after accepting/declining invites
  };

  useEffect(() => { 
    loadPosts(); 
  }, [userId]);

  return (
    <section className="photos-feed">
      <div className="feed-header">
        <h2 className="feed-title">Collaborative Memories</h2>
        {canPost && (
          <button 
            className="create-post-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <span className="create-icon">🤝</span>
            Create Collaborative Memory
          </button>
        )}
      </div>

      {/* Collaboration Invites */}
      <CollaborationInvites 
        userId={userId}
        onInviteResponded={handleInviteResponse}
      />

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        userId={userId}
        onSuccess={loadPosts}
      />

      {/* Posts Feed */}
      <div className="posts-grid">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span>Loading collaborative memories...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🤝</div>
            <h3>No collaborative memories yet!</h3>
            <p>Create your first memory and invite friends to collaborate</p>
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
                  {post.collaborators.length > 0 && (
                    <div className="collaborators">
                      <span className="collab-icon">🤝</span>
                      Collaborators: {post.collaborators.join(", ")}
                    </div>
                  )}
                </div>
                
                {post.created_by === userId && (
                  <div className="post-actions">
                    <button 
                      onClick={() => deletePost(post.id)}
                      className="action-button delete"
                      title="Delete post"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>

              {/* Multi-Media Gallery */}
              <div className="media-gallery">
                {post.media.length === 1 ? (
                  <div className="single-media">
                    {post.media[0].type === "video" ? (
                      <video src={post.media[0].url} controls className="media-item" />
                    ) : (
                      <img src={post.media[0].url} alt={post.caption || "Photo"} className="media-item" />
                    )}
                  </div>
                ) : (
                  <div className={`multi-media grid-${Math.min(post.media.length, 4)}`}>
                    {post.media.slice(0, 4).map((media, index) => (
                      <div key={media.id} className="media-container">
                        {media.type === "video" ? (
                          <video src={media.url} muted className="media-item" />
                        ) : (
                          <img src={media.url} alt={`Media ${index + 1}`} className="media-item" />
                        )}
                        {index === 3 && post.media.length > 4 && (
                          <div className="media-overlay">
                            <span>+{post.media.length - 4} more</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="post-content">
                {post.caption && <div className="post-caption">{post.caption}</div>}
                {post.description && <div className="post-description">{post.description}</div>}
                
                <div className="post-meta">
                  <span className="media-count">{post.media.length} {post.media.length === 1 ? 'item' : 'items'}</span>
                  {post.collaborators.length > 0 && (
                    <span className="collab-count">{post.collaborators.length} collaborator{post.collaborators.length === 1 ? '' : 's'}</span>
                  )}
                </div>
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
          align-items: flex-start;
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

        .collaborators {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: #8b5cf6;
          font-weight: 500;
        }

        .collab-icon {
          font-size: 0.875rem;
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

        .media-gallery {
          position: relative;
          width: 100%;
        }

        .single-media {
          width: 100%;
        }

        .multi-media {
          display: grid;
          gap: 2px;
        }

        .grid-2 {
          grid-template-columns: 1fr 1fr;
        }

        .grid-3 {
          grid-template-columns: 2fr 1fr;
        }

        .grid-3 .media-container:first-child {
          grid-row: span 2;
        }

        .grid-4 {
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
        }

        .media-container {
          position: relative;
          overflow: hidden;
          aspect-ratio: 1;
        }

        .single-media .media-item {
          aspect-ratio: auto;
        }

        .media-item {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .media-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 500;
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

        .post-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .media-count, .collab-count {
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
          
          .post-header {
            flex-direction: column;
            gap: 0.75rem;
          }
          
          .post-actions {
            align-self: flex-end;
          }
        }
      `}</style>
    </section>
  );
}
