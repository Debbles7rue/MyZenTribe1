// components/PostCard.tsx
"use client";
import { Post, toggleLike, addComment, deleteComment, timeAgo, updatePost, deletePost, sharePost, me } from "@/lib/posts";
import { useState, useEffect } from "react";

export default function PostCard({ post, onChanged }: { post: Post; onChanged?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(post.body);
  const [editPrivacy, setEditPrivacy] = useState(post.privacy);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    me().then(setCurrentUserId);
  }, []);

  const isCreator = currentUserId && (post.user_id === currentUserId || (post.co_creators || []).includes(currentUserId));
  const canEdit = isCreator;
  const canDelete = currentUserId && post.user_id === currentUserId;

  async function like() {
    if (busy) return;
    setBusy(true);
    await toggleLike(post.id);
    setBusy(false);
    onChanged?.();
  }

  async function sendComment() {
    if (!comment.trim() || busy) return;
    setBusy(true);
    await addComment(post.id, comment.trim());
    setComment("");
    setBusy(false);
    onChanged?.();
  }

  async function removeComment(commentId: string) {
    if (busy) return;
    setBusy(true);
    await deleteComment(commentId);
    setBusy(false);
    onChanged?.();
  }

  async function saveEdit() {
    if (busy) return;
    setBusy(true);
    const result = await updatePost(post.id, { body: editBody, privacy: editPrivacy });
    if (result.ok) {
      setIsEditing(false);
    } else {
      alert("Failed to update post");
    }
    setBusy(false);
    onChanged?.();
  }

  async function removePost() {
    if (!confirm("Are you sure you want to delete this post?")) return;
    setBusy(true);
    const result = await deletePost(post.id);
    if (!result.ok) {
      alert("Failed to delete post");
    }
    setBusy(false);
    onChanged?.();
  }

  async function share(target: 'feed' | 'calendar') {
    if (busy) return;
    setBusy(true);
    const result = await sharePost(post.id, target, shareMessage);
    if (result.ok) {
      alert(target === 'calendar' ? 'Added to your calendar!' : 'Shared to your feed!');
      setShowShareMenu(false);
      setShareMessage("");
    } else {
      alert(result.error || 'Failed to share');
    }
    setBusy(false);
    onChanged?.();
  }

  return (
    <article className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 pb-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={(post.author?.avatar_url || "/default-avatar.png") + "?t=1"}
                alt=""
                width={42}
                height={42}
                className="rounded-full object-cover ring-2 ring-purple-100"
              />
              {post.co_creators && post.co_creators.length > 0 && (
                <div className="absolute -bottom-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  +{post.co_creators.length}
                </div>
              )}
            </div>
            <div>
              <div className="font-medium text-gray-900 flex items-center gap-2">
                {post.author?.full_name || "Member"}
                {post.co_creators && post.co_creators.length > 0 && (
                  <span className="text-xs text-purple-600">& {post.co_creators.length} others</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{timeAgo(post.created_at)}</span>
                {post.edited_at && <span>• edited</span>}
                <span>• {post.privacy === 'public' ? '🌍' : post.privacy === 'friends' ? '🤝' : '🔒'}</span>
              </div>
            </div>
          </div>
          
          {canEdit && (
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ⋮
            </button>
          )}
        </div>

        {/* Action Menu */}
        {showActions && canEdit && (
          <div className="absolute right-4 mt-1 bg-white border rounded-lg shadow-lg py-1 z-10">
            <button
              onClick={() => { setIsEditing(true); setShowActions(false); }}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
            >
              ✏️ Edit
            </button>
            {canDelete && (
              <button
                onClick={() => { removePost(); setShowActions(false); }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm text-red-600"
              >
                🗑️ Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Shared Post Indicator */}
      {post.original_post && (
        <div className="mx-4 mt-2 p-2 bg-purple-50 rounded-lg text-sm">
          <span className="text-purple-700">↻ Shared from {post.original_post.author?.full_name}</span>
        </div>
      )}

      {/* Body */}
      <div className="p-4">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-purple-500"
              rows={3}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
            />
            <div className="flex gap-2">
              <select
                className="px-3 py-2 border border-gray-200 rounded-lg"
                value={editPrivacy}
                onChange={(e) => setEditPrivacy(e.target.value as any)}
              >
                <option value="friends">Friends</option>
                <option value="public">Public</option>
                <option value="private">Only me</option>
              </select>
              <button
                onClick={saveEdit}
                disabled={busy}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => { setIsEditing(false); setEditBody(post.body); }}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="whitespace-pre-wrap text-gray-800">{post.body}</div>
        )}

        {/* Media Display */}
        {post.image_url && (
          <div className="mt-3 rounded-lg overflow-hidden">
            <img src={post.image_url} alt="" className="w-full" />
          </div>
        )}
        {post.video_url && (
          <div className="mt-3 rounded-lg overflow-hidden">
            <video src={post.video_url} controls className="w-full" />
          </div>
        )}
        {post.gif_url && (
          <div className="mt-3 rounded-lg overflow-hidden">
            <img src={post.gif_url} alt="" className="w-full" />
          </div>
        )}
      </div>

      {/* Actions Bar */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
                post.liked_by_me 
                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                  : 'hover:bg-gray-100'
              }`}
              onClick={like}
              disabled={busy}
            >
              <span className={post.liked_by_me ? 'animate-pulse' : ''}>
                {post.liked_by_me ? '💜' : '🤍'}
              </span>
              <span className="text-sm font-medium">{post.like_count || 0}</span>
            </button>
            
            <button
              className="px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-all flex items-center gap-2"
              onClick={() => setShowComments(!showComments)}
            >
              💬 <span className="text-sm font-medium">{post.comment_count || 0}</span>
            </button>
            
            {post.allow_share && (
              <button
                className="px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-all flex items-center gap-2"
                onClick={() => setShowShareMenu(!showShareMenu)}
              >
                ↗️ <span className="text-sm font-medium">{post.share_count || 0}</span>
              </button>
            )}
          </div>
        </div>

        {/* Share Menu */}
        {showShareMenu && post.allow_share && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
            <input
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              placeholder="Add a message (optional)..."
              value={shareMessage}
              onChange={(e) => setShareMessage(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => share('feed')}
                disabled={busy}
                className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
              >
                📢 Share to Feed
              </button>
              <button
                onClick={() => share('calendar')}
                disabled={busy}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                📅 Add to Calendar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="px-4 pb-4 space-y-3">
          {/* Comment Input */}
          <div className="flex gap-2">
            <input
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
              placeholder="Share your thoughts..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendComment()}
            />
            <button
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
              onClick={sendComment}
              disabled={busy || !comment.trim()}
            >
              Send
            </button>
          </div>

          {/* Comments List */}
          {post.comments && post.comments.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {post.comments.map((c) => (
                <div key={c.id} className="flex gap-2 p-2 bg-gray-50 rounded-lg">
                  <img
                    src={(c.author?.avatar_url || "/default-avatar.png") + "?t=1"}
                    alt=""
                    width={28}
                    height={28}
                    className="rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{c.author?.full_name || "Member"}</span>
                      <span className="text-xs text-gray-500">{timeAgo(c.created_at)}</span>
                      {c.user_id === currentUserId && (
                        <button
                          onClick={() => removeComment(c.id)}
                          className="ml-auto text-xs text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <div className="text-sm text-gray-700 mt-1">{c.body}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
