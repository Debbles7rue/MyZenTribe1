// components/PostCard.tsx
"use client";

import { useState, useRef } from "react";
import { Post, toggleLike, addComment, timeAgo, updatePost, addMediaToPost, uploadMedia, deletePost } from "@/lib/posts";
import Link from "next/link";

interface PostCardProps {
  post: Post;
  onChanged?: () => void;
  currentUserId?: string;
}

export default function PostCard({ post, onChanged, currentUserId }: PostCardProps) {
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(post.body);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showAllMedia, setShowAllMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if current user can edit (is creator or co-creator)
  const canEdit = currentUserId && (
    post.user_id === currentUserId || 
    (post.co_creators && post.co_creators.includes(currentUserId))
  );

  // Check if current user is the original creator (can delete)
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

  async function saveEdit() {
    if (busy || !editBody.trim()) return;
    setBusy(true);
    const result = await updatePost(post.id, { body: editBody });
    if (result.ok) {
      setIsEditing(false);
      onChanged?.();
    } else {
      alert("Failed to update post. Please try again.");
    }
    setBusy(false);
  }

  async function handleDelete() {
    if (busy) return;
    setBusy(true);
    const result = await deletePost(post.id);
    if (result.ok) {
      onChanged?.();
    } else {
      alert("Failed to delete post. Please try again.");
    }
    setBusy(false);
    setShowDeleteConfirm(false);
  }

  async function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingMedia(true);
    
    for (const file of files) {
      const isVideo = file.type.startsWith('video');
      const { url, error } = await uploadMedia(file, isVideo ? 'video' : 'image');
      
      if (error) {
        alert(`Failed to upload ${file.name}. Please try again.`);
        continue;
      }

      if (url) {
        await addMediaToPost(post.id, url, isVideo ? 'video' : 'image');
      }
    }
    
    setUploadingMedia(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onChanged?.();
  }

  // Combine all media (original + additional)
  const allMedia = [
    ...(post.image_url ? [{ url: post.image_url, type: 'image' as const }] : []),
    ...(post.video_url ? [{ url: post.video_url, type: 'video' as const }] : []),
    ...(post.additional_media || [])
  ];

  const displayedMedia = showAllMedia ? allMedia : allMedia.slice(0, 4);
  const remainingCount = allMedia.length - displayedMedia.length;

  return (
    <article className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <img
              src={(post.author?.avatar_url || "/default-avatar.png") + "?t=1"}
              alt=""
              className="w-10 h-10 rounded-full object-cover ring-2 ring-purple-100"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={`/profile/${post.user_id}`} className="font-semibold text-gray-900 hover:text-purple-600 transition-colors">
                  {post.author?.full_name || "Member"}
                </Link>
                
                {/* Co-creators */}
                {post.co_creators && post.co_creators.length > 0 && (
                  <>
                    <span className="text-gray-500 text-sm">with</span>
                    {post.co_creators_info?.map((coCreator, index) => (
                      <span key={coCreator.id} className="text-sm">
                        <Link 
                          href={`/profile/${coCreator.id}`}
                          className="font-medium text-purple-600 hover:text-purple-700 transition-colors"
                        >
                          {coCreator.full_name || "Member"}
                        </Link>
                        {index < post.co_creators.length - 1 && <span className="text-gray-500">, </span>}
                      </span>
                    ))}
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{timeAgo(post.created_at)}</span>
                <span>•</span>
                <span className="capitalize">{post.privacy}</span>
              </div>
            </div>
          </div>

          {/* Action Menu */}
          {canEdit && (
            <div className="flex items-center gap-2">
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                  title="Edit post"
                >
                  ✏️
                </button>
              )}
              {canDelete && !isEditing && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  title="Delete post"
                >
                  🗑️
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="mt-3">
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={3}
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={saveEdit}
                  disabled={busy || !editBody.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {busy ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditBody(post.body);
                  }}
                  disabled={busy}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-gray-800">{post.body}</p>
          )}
        </div>

        {/* Media Gallery */}
        {allMedia.length > 0 && (
          <div className="mt-3">
            <div className={`grid gap-2 ${allMedia.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {displayedMedia.map((media, index) => (
                <div key={index} className="relative rounded-lg overflow-hidden bg-gray-100">
                  {media.type === 'image' ? (
                    <img 
                      src={media.url} 
                      alt="" 
                      className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                      onClick={() => window.open(media.url, '_blank')}
                    />
                  ) : (
                    <video 
                      src={media.url} 
                      controls 
                      className="w-full h-full"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  
                  {/* Show remaining count on last visible item */}
                  {!showAllMedia && remainingCount > 0 && index === displayedMedia.length - 1 && (
                    <button
                      onClick={() => setShowAllMedia(true)}
                      className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center text-white hover:bg-opacity-70 transition-all"
                    >
                      <span className="text-3xl font-bold">+{remainingCount}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            {showAllMedia && allMedia.length > 4 && (
              <button
                onClick={() => setShowAllMedia(false)}
                className="mt-2 text-sm text-purple-600 hover:text-purple-700"
              >
                Show less
              </button>
            )}
          </div>
        )}

        {/* Add Media Button (for co-creators when editing) */}
        {canEdit && !isEditing && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingMedia}
              className="flex items-center gap-2 px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
            >
              {uploadingMedia ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Uploading...
                </>
              ) : (
                <>
                  <span>📸</span>
                  Add photos/videos
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              style={{ display: 'none' }}
              onChange={handleMediaSelect}
            />
          </div>
        )}
      </div>

      {/* Engagement Bar */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-4">
        <button
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
            post.liked_by_me 
              ? 'bg-purple-100 text-purple-600 hover:bg-purple-200' 
              : 'hover:bg-gray-100 text-gray-600'
          }`}
          onClick={like}
          disabled={busy}
        >
          <span>{post.liked_by_me ? '💜' : '🤍'}</span>
          <span className="text-sm font-medium">{post.like_count || 0}</span>
        </button>
        
        <div className="flex items-center gap-2 text-gray-500">
          <span>💬</span>
          <span className="text-sm">{post.comment_count || 0} comments</span>
        </div>

        {post.allow_share && (
          <button className="ml-auto text-gray-500 hover:text-purple-600 transition-colors">
            <span>🔄</span>
          </button>
        )}
      </div>

      {/* Comment Section */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Write a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendComment()}
          />
          <button
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
            onClick={sendComment}
            disabled={busy || !comment.trim()}
          >
            Post
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-3">Delete Post?</h3>
            <p className="text-gray-600 mb-4">This action cannot be undone. The post and all associated media will be permanently deleted.</p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={busy}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? "Deleting..." : "Delete"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={busy}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
