"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link"; // Added for profile links
import { supabase } from "@/lib/supabaseClient";

type Post = {
  id: string;
  user_id: string; // Added to support profile links
  image_path: string;
  caption: string | null;
  description: string | null; // Added for future collaborative features
  visibility: "private" | "public"; // Simplified to private/public
  created_at: string;
  updated_at: string;
  url: string;
  tags: { id: string; name: string }[]; // Enhanced to include user IDs
};

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  body: string;
  created_at: string;
};

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private (Only on my profile)", icon: "🔒" },
  { value: "public", label: "Public (Friends can see)", icon: "🌍" },
] as const;

export default function PhotosFeed({ userId }: { userId: string | null }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<{ [postId: string]: Comment[] }>({});
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editVisibility, setEditVisibility] = useState<"private" | "public">("private");
  const [commentText, setCommentText] = useState<{ [postId: string]: string }>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const canPost = useMemo(() => !!userId, [userId]);

  // Show temporary message
  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  async function listPosts() {
    if (!userId) return setPosts([]);

    try {
      const { data: rows, error } = await supabase
        .from("photo_posts")
        .select(`
          id, user_id, image_path, caption, description, 
          visibility, created_at, updated_at
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const items = await Promise.all((rows ?? []).map(async (r) => {
        const { data: pub } = supabase.storage.from("event-photos").getPublicUrl(r.image_path);
        
        // Get tags with user info
        const { data: tagsRows } = await supabase
          .from("photo_tags")
          .select("tagged_user_id")
          .eq("post_id", r.id);

        let taggedUsers: { id: string; name: string }[] = [];
        if (tagsRows?.length) {
          const ids = tagsRows.map(t => t.tagged_user_id);
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", ids);
          taggedUsers = (profs ?? []).map(p => ({ 
            id: p.id, 
            name: p.full_name ?? "User" 
          }));
        }

        return {
          ...r,
          url: pub.publicUrl,
          tags: taggedUsers,
        };
      }));

      setPosts(items);

      // Load comments for all posts
      const postIds = items.map(p => p.id);
      if (postIds.length > 0) {
        const { data: allComments } = await supabase
          .from("photo_comments")
          .select(`
            id, post_id, user_id, body, created_at,
            profiles!inner(full_name)
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
            body: c.body,
            created_at: c.created_at
          });
        });
        setComments(commentsByPost);
      }
    } catch (err: any) {
      console.error("Error loading posts:", err);
      showMessage("error", "Failed to load posts");
    }
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    
    setUploading(true);
    try {
      const filename = `${Date.now()}-${file.name}`;
      const path = `${userId}/${filename}`;

      const up = await supabase.storage.from("event-photos").upload(path, file, {
        cacheControl: "3600", 
        upsert: false,
      });
      if (up.error) throw up.error;

      // Create post with caption, description, visibility
      const ins = await supabase.from("photo_posts").insert({
        user_id: userId,
        image_path: path,
        caption: caption.trim() || null,
        description: description.trim() || null,
        visibility,
      }).select().single();
      
      if (ins.error) throw ins.error;

      // Handle tags
      const tagEmails = tags.split(",").map(s => s.trim()).filter(Boolean);
      if (tagEmails.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id")
          .in("full_name", tagEmails);
        
        if (profiles?.length) {
          const tagRows = profiles.map(p => ({ 
            post_id: ins.data.id, 
            tagged_user_id: p.id 
          }));
          await supabase.from("photo_tags").insert(tagRows);
        }
      }

      // Reset form
      setCaption("");
      setDescription("");
      setTags("");
      setVisibility("private");
      
      showMessage("success", "Photo uploaded successfully!");
      await listPosts();
    } catch (err: any) {
      console.error("Upload error:", err);
      showMessage("error", err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.currentTarget.value = "";
    }
  }

  async function startEdit(post: Post) {
    setEditingPostId(post.id);
    setEditCaption(post.caption || "");
    setEditDescription(post.description || "");
    setEditTags(post.tags.map(t => t.name).join(", "));
    setEditVisibility(post.visibility);
  }

  async function saveEdit() {
    if (!editingPostId) return;

    try {
      // Update post
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

      // Update tags (delete old, insert new)
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
            tagged_user_id: p.id 
          }));
          await supabase.from("photo_tags").insert(tagRows);
        }
      }

      setEditingPostId(null);
      showMessage("success", "Post updated!");
      await listPosts();
    } catch (err: any) {
      console.error("Edit error:", err);
      showMessage("error", "Failed to update post");
    }
  }

  async function deletePost(postId: string) {
    if (!confirm("Delete this post? This cannot be undone.")) return;

    try {
      const { error } = await supabase
        .from("photo_posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      showMessage("success", "Post deleted");
      await listPosts();
    } catch (err: any) {
      console.error("Delete error:", err);
      showMessage("error", "Failed to delete post");
    }
  }

  async function handleCommentSubmit(postId: string) {
    if (!userId || !commentText[postId]?.trim()) return;

    try {
      const { error } = await supabase.from("photo_comments").insert({
        post_id: postId,
        user_id: userId,
        body: commentText[postId].trim()
      });

      if (error) throw error;

      setCommentText({ ...commentText, [postId]: "" });
      showMessage("success", "Comment added!");
      await listPosts();
    } catch (err: any) {
      console.error("Comment error:", err);
      showMessage("error", "Failed to add comment");
    }
  }

  useEffect(() => { 
    listPosts(); 
  }, [userId]);

  return (
    <section className="relative">
      <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
        Photos & Memories
      </h2>

      {/* Message Toast */}
      {message && (
        <div className={`fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg animate-bounce-in
          ${message.type === "success" ? "bg-green-500" : "bg-red-500"} text-white`}>
          {message.text}
        </div>
      )}

      {/* Upload Section */}
      {canPost && (
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Caption</label>
              <input 
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" 
                value={caption} 
                onChange={(e) => setCaption(e.target.value.slice(0, 100))} 
                placeholder="Share this moment..." 
                maxLength={100}
              />
              <span className="text-xs text-gray-500">{caption.length}/100</span>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea 
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" 
                value={description} 
                onChange={(e) => setDescription(e.target.value.slice(0, 500))} 
                placeholder="Tell the story..."
                rows={2}
                maxLength={500}
              />
              <span className="text-xs text-gray-500">{description.length}/500</span>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tag Friends</label>
              <input 
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" 
                value={tags} 
                onChange={(e) => setTags(e.target.value)} 
                placeholder="Names separated by commas" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Visibility</label>
              <select 
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" 
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

            <label className="relative inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition cursor-pointer">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={onUpload} 
                disabled={uploading}
              />
              {uploading ? "Uploading..." : "📸 Upload Photo"}
            </label>
          </div>
        </div>
      )}

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map(post => (
          <div key={post.id} className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-lg transition">
            <img 
              src={post.url} 
              alt={post.caption || ""} 
              className="w-full h-64 object-cover"
            />
            
            <div className="p-4">
              {editingPostId === post.id ? (
                /* Edit Mode */
                <div className="space-y-2">
                  <input
                    className="w-full px-2 py-1 border rounded"
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value.slice(0, 100))}
                    placeholder="Caption"
                  />
                  <textarea
                    className="w-full px-2 py-1 border rounded"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value.slice(0, 500))}
                    placeholder="Description"
                    rows={2}
                  />
                  <input
                    className="w-full px-2 py-1 border rounded"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="Tags"
                  />
                  <select
                    className="w-full px-2 py-1 border rounded"
                    value={editVisibility}
                    onChange={(e) => setEditVisibility(e.target.value as any)}
                  >
                    {VISIBILITY_OPTIONS.map(v => (
                      <option key={v.value} value={v.value}>
                        {v.icon} {v.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingPostId(null)}
                      className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  {post.caption && (
                    <h3 className="font-semibold text-gray-800 mb-1">{post.caption}</h3>
                  )}
                  {post.description && (
                    <p className="text-gray-600 text-sm mb-2">{post.description}</p>
                  )}
                  
                  {/* Tags with clickable profile links */}
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      <span className="text-sm text-gray-500">Tagged:</span>
                      {post.tags.map((tag, idx) => (
                        <span key={tag.id}>
                          <Link 
                            href={`/profile/${tag.id}`}
                            className="text-sm text-purple-600 hover:underline"
                          >
                            {tag.name}
                          </Link>
                          {idx < post.tags.length - 1 && ", "}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>{VISIBILITY_OPTIONS.find(v => v.value === post.visibility)?.icon} {post.visibility}</span>
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>

                  {/* Action Buttons - Only for post owner */}
                  {post.user_id === userId && (
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => startEdit(post)}
                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deletePost(post.id)}
                        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  )}

                  {/* Comments Section */}
                  <div className="border-t pt-3">
                    <h4 className="text-sm font-semibold mb-2">Comments</h4>
                    
                    {/* Display Comments */}
                    {comments[post.id]?.map(comment => (
                      <div key={comment.id} className="mb-2 text-sm">
                        <Link 
                          href={`/profile/${comment.user_id}`}
                          className="font-medium text-purple-600 hover:underline"
                        >
                          {comment.user_name}
                        </Link>
                        <span className="text-gray-700 ml-1">{comment.body}</span>
                      </div>
                    ))}

                    {/* Add Comment */}
                    {userId && (
                      <div className="flex gap-2 mt-2">
                        <input
                          className="flex-1 px-2 py-1 text-sm border rounded"
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
                          className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600"
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
        ))}
      </div>

      {!posts.length && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No photos yet</p>
          <p className="text-sm">Share your first memory!</p>
        </div>
      )}
    </section>
  );
}
