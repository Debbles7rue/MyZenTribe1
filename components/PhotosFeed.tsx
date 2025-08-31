// components/PhotosFeed.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Post = {
  id: string;
  image_path: string;
  caption: string | null;
  description: string | null; // Full description separate from caption
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

export default function PhotosFeed({ userId }: { userId: string | null }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Form state
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  
  // Edit state
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editVisibility, setEditVisibility] = useState<"private" | "public">("private");
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canPost = useMemo(() => !!userId, [userId]);

  // Show success message temporarily
  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  // Show error message temporarily  
  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

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
      showError("Failed to load posts");
    }
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    
    // Validate required fields
    if (!caption.trim()) {
      showError("Please add a caption for your photo");
      return;
    }

    setUploading(true);
    setError(null);
    
    try {
      // Upload file
      const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      const path = `${userId}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from("event-photos")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create post record - THIS IS THE KEY FIX!
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
      await processTags(newPost.id, tags);

      // Clear form
      setCaption("");
      setDescription("");
      setTags("");
      setVisibility("private");
      
      // Refresh posts
      await listPosts();
      
      showSuccess("Photo uploaded successfully! 🎉");
      
    } catch (err: any) {
      console.error("Upload error:", err);
      showError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function processTags(postId: string, tagString: string) {
    const tagNames = tagString.split(",").map(s => s.trim()).filter(Boolean);
    if (tagNames.length === 0) return;

    try {
      // Find users by name
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("full_name", tagNames);

      if (profiles?.length) {
        const tagRows = profiles.map(p => ({
          post_id: postId,
          tagged_user_id: p.id
        }));
        
        await supabase.from("photo_tags").insert(tagRows);
      }
    } catch (err) {
      console.warn("Error processing tags:", err);
    }
  }

  async function startEdit(post: Post) {
    setEditingPost(post.id);
    setEditCaption(post.caption || "");
    setEditDescription(post.description || "");
    setEditTags(post.tags.join(", "));
    setEditVisibility(post.visibility);
  }

  async function saveEdit() {
    if (!editingPost) return;
    
    try {
      // Update post
      const { error } = await supabase
        .from("photo_posts")
        .update({
          caption: editCaption.trim() || null,
          description: editDescription.trim() || null,
          visibility: editVisibility,
        })
        .eq("id", editingPost);

      if (error) throw error;

      // Update tags (delete old ones, insert new ones)
      await supabase.from("photo_tags").delete().eq("post_id", editingPost);
      await processTags(editingPost, editTags);

      setEditingPost(null);
      await listPosts();
      showSuccess("Post updated successfully! ✨");
      
    } catch (err: any) {
      showError(`Update failed: ${err.message}`);
    }
  }

  async function deletePost(postId: string, imagePath: string) {
    if (!confirm("Are you sure you want to delete this post? This cannot be undone.")) {
      return;
    }

    try {
      // Delete from database first
      const { error: dbError } = await supabase
        .from("photo_posts")
        .delete()
        .eq("id", postId);

      if (dbError) throw dbError;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("event-photos")
        .remove([imagePath]);

      if (storageError) console.warn("Storage delete failed:", storageError);

      await listPosts();
      showSuccess("Post deleted successfully");
      
    } catch (err: any) {
      showError(`Delete failed: ${err.message}`);
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
      <h2 className="feed-title">Photos & Memories</h2>

      {/* Success/Error Messages */}
      {success && <div className="message success">✅ {success}</div>}
      {error && <div className="message error">❌ {error}</div>}

      {/* Upload Form */}
      {canPost && (
        <div className="upload-form card">
          <h3>Share a Memory</h3>
          
          <div className="form-field">
            <label>Caption *</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's happening in this photo?"
              className="form-input"
              maxLength={100}
            />
            <small>{100 - caption.length} characters remaining</small>
          </div>

          <div className="form-field">
            <label>Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Went to this event at Tree of Life! The food was fantastic!"
              className="form-input textarea"
              rows={3}
              maxLength={500}
            />
            <small>{500 - description.length} characters remaining</small>
          </div>

          <div className="form-field">
            <label>Tag Friends (Optional)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Type names separated by commas"
              className="form-input"
            />
          </div>

          <div className="form-field">
            <label>Who can see this?</label>
            <div className="visibility-options">
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
                    <div>
                      <div className="option-label">{option.label}</div>
                      <div className="option-description">{option.description}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <label className="upload-button">
              <input 
                type="file" 
                accept="image/*" 
                onChange={onUpload}
                disabled={uploading}
                style={{ display: "none" }}
              />
              <span className="button primary">
                {uploading ? "📤 Uploading..." : "📸 Upload Photo"}
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Posts Feed */}
      <div className="posts-grid">
        {posts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📸</div>
            <h3>No photos yet!</h3>
            <p>Share your first memory to get started</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="post-card">
              {/* Post Header */}
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
                      onClick={() => startEdit(post)}
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

              {/* Post Image */}
              <div className="post-image">
                <img src={post.url} alt={post.caption || "Photo"} />
              </div>

              {/* Post Content */}
              {editingPost === post.id ? (
                // Edit Mode
                <div className="post-edit">
                  <div className="form-field">
                    <input
                      type="text"
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      placeholder="Caption"
                      className="form-input"
                    />
                  </div>
                  
                  <div className="form-field">
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Description"
                      className="form-input textarea"
                      rows={2}
                    />
                  </div>

                  <div className="form-field">
                    <input
                      type="text"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="Tagged friends"
                      className="form-input"
                    />
                  </div>

                  <div className="form-field">
                    <select 
                      value={editVisibility}
                      onChange={(e) => setEditVisibility(e.target.value as any)}
                      className="form-input"
                    >
                      {VISIBILITY_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.icon} {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-actions">
                    <button onClick={saveEdit} className="button primary">Save</button>
                    <button onClick={() => setEditingPost(null)} className="button secondary">Cancel</button>
                  </div>
                </div>
              ) : (
                // View Mode  
                <div className="post-content">
                  {post.caption && (
                    <div className="post-caption">{post.caption}</div>
                  )}
                  
                  {post.description && (
                    <div className="post-description">{post.description}</div>
                  )}
                  
                  {post.tags.length > 0 && (
                    <div className="post-tags">
                      <span className="tags-label">With:</span>
                      {post.tags.map((tag, i) => (
                        <span key={i} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .photos-feed {
          max-width: 600px;
          margin: 0 auto;
        }

        .feed-title {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          color: #1f2937;
        }

        .message {
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          font-weight: 500;
        }

        .message.success {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .message.error {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .upload-form {
          background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(248,250,252,0.8));
          padding: 1.5rem;
          border-radius: 1rem;
          border: 1px solid rgba(139,92,246,0.2);
          margin-bottom: 2rem;
          backdrop-filter: blur(5px);
        }

        .upload-form h3 {
          margin: 0 0 1rem 0;
          color: #374151;
          font-size: 1.125rem;
        }

        .form-field {
          margin-bottom: 1rem;
        }

        .form-field label {
          display: block;
          font-weight: 500;
          margin-bottom: 0.5rem;
          color: #374151;
          font-size: 0.875rem;
        }

        .form-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          background: rgba(255,255,255,0.9);
          transition: border-color 0.2s ease;
          font-family: inherit;
        }

        .form-input:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
        }

        .form-input.textarea {
          resize: vertical;
          min-height: 4rem;
        }

        .form-field small {
          color: #6b7280;
          font-size: 0.75rem;
          margin-top: 0.25rem;
          display: block;
        }

        .visibility-options {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .visibility-option {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          background: rgba(255,255,255,0.8);
        }

        .visibility-option:hover {
          border-color: #8b5cf6;
          background: rgba(255,255,255,0.95);
        }

        .visibility-option input[type="radio"]:checked + .option-content {
          color: #8b5cf6;
        }

        .option-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
        }

        .option-icon {
          font-size: 1.125rem;
        }

        .option-label {
          font-weight: 500;
        }

        .option-description {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .form-actions {
          text-align: center;
          margin-top: 1.5rem;
        }

        .upload-button {
          cursor: pointer;
        }

        .button {
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          border: none;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .button.primary {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          box-shadow: 0 2px 4px rgba(139,92,246,0.2);
        }

        .button.primary:hover {
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(139,92,246,0.3);
        }

        .button.secondary {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .button.secondary:hover {
          background: #e5e7eb;
        }

        .posts-grid {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: #6b7280;
        }

        .empty-icon {
          font-size: 3rem;
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

        .post-edit {
          padding: 1rem;
          background: rgba(139,92,246,0.05);
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

        @media (max-width: 640px) {
          .photos-feed {
            max-width: 100%;
            padding: 0 1rem;
          }
          
          .visibility-options {
            gap: 0.5rem;
          }
          
          .option-content {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </section>
  );
}
