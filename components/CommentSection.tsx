// components/CommentSection.tsx - Universal Comment System with Replies
"use client";

import { useState, useEffect } from "react";
import { getComments, addEntityComment, updateEntityComment, deleteEntityComment, type EntityType, type Comment } from "@/lib/posts";
import { supabase } from "@/lib/supabaseClient";

interface CommentSectionProps {
  entityType: EntityType;
  entityId: string;
  currentUserId?: string;
  placeholder?: string;
  maxDepth?: number; // Maximum reply nesting depth (default 3)
}

export default function CommentSection({
  entityType,
  entityId,
  currentUserId,
  placeholder,
  maxDepth = 3
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [userId, setUserId] = useState<string | null>(currentUserId || null);

  useEffect(() => {
    if (!currentUserId) {
      const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUserId(user?.id || null);
      };
      getCurrentUser();
    }
  }, [currentUserId]);

  useEffect(() => {
    loadComments();
  }, [entityType, entityId]);

  const loadComments = async () => {
    setLoading(true);
    const { comments: fetchedComments } = await getComments(entityType, entityId);
    setComments(fetchedComments);
    setLoading(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isCommenting || !userId) return;
    
    setIsCommenting(true);
    const result = await addEntityComment(entityType, entityId, commentText.trim());
    
    if (result.ok) {
      setCommentText("");
      await loadComments();
    } else {
      alert("Failed to add comment: " + (result.error || "Unknown error"));
    }
    setIsCommenting(false);
  };

  const handleAddReply = async (parentId: string) => {
    if (!replyText.trim() || isCommenting || !userId) return;
    
    setIsCommenting(true);
    const result = await addEntityComment(entityType, entityId, replyText.trim(), parentId);
    
    if (result.ok) {
      setReplyText("");
      setReplyingTo(null);
      await loadComments();
    } else {
      alert("Failed to add reply: " + (result.error || "Unknown error"));
    }
    setIsCommenting(false);
  };

  const handleEditComment = async (commentId: string) => {
    if (!editText.trim() || isCommenting || !userId) return;
    
    setIsCommenting(true);
    const result = await updateEntityComment(entityType, commentId, editText.trim());
    
    if (result.ok) {
      setEditingId(null);
      setEditText("");
      await loadComments();
    } else {
      alert("Failed to update comment: " + (result.error || "Unknown error"));
    }
    setIsCommenting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Delete this comment? This cannot be undone.")) return;
    
    const result = await deleteEntityComment(entityType, commentId);
    if (result.ok) {
      await loadComments();
    } else {
      alert("Failed to delete comment: " + (result.error || "Unknown error"));
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditText(comment.body);
    setReplyingTo(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const startReply = (commentId: string) => {
    setReplyingTo(commentId);
    setEditingId(null);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyText("");
  };

  const renderComment = (comment: Comment, depth: number = 0) => {
    const isEditing = editingId === comment.id;
    const isReplying = replyingTo === comment.id;
    const canReply = depth < maxDepth;
    const isOwner = userId === comment.user_id;

    return (
      <div key={comment.id} className="comment-wrapper" style={{ marginLeft: depth > 0 ? '32px' : '0' }}>
        <div className="comment-item">
          <img 
            src={comment.author?.avatar_url || '/default-avatar.png'} 
            alt="" 
            className="comment-avatar"
          />
          <div className="comment-content">
            <div className="comment-header">
              <span className="comment-author">{comment.author?.full_name || 'User'}</span>
              <span className="comment-time">
                {new Date(comment.created_at).toLocaleDateString()}
              </span>
            </div>
            
            {isEditing ? (
              <div className="comment-edit-form">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="comment-edit-input"
                  rows={2}
                />
                <div className="comment-edit-actions">
                  <button onClick={() => handleEditComment(comment.id)} className="btn-save">
                    Save
                  </button>
                  <button onClick={cancelEdit} className="btn-cancel">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="comment-body">{comment.body}</p>
            )}
            
            {!isEditing && (
              <div className="comment-actions">
                {canReply && userId && (
                  <button onClick={() => startReply(comment.id)} className="btn-action">
                    💬 Reply
                  </button>
                )}
                {isOwner && !isEditing && (
                  <>
                    <button onClick={() => startEdit(comment)} className="btn-action">
                      ✏️ Edit
                    </button>
                    <button onClick={() => handleDeleteComment(comment.id)} className="btn-action danger">
                      🗑️ Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {isReplying && (
          <div className="reply-form" style={{ marginLeft: depth > 0 ? '48px' : '0' }}>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="reply-input"
              rows={2}
            />
            <div className="reply-actions">
              <button 
                onClick={() => handleAddReply(comment.id)} 
                disabled={!replyText.trim() || isCommenting}
                className="btn-save"
              >
                {isCommenting ? 'Posting...' : 'Post Reply'}
              </button>
              <button onClick={cancelReply} className="btn-cancel">
                Cancel
              </button>
            </div>
          </div>
        )}

        {comment.replies && comment.replies.length > 0 && (
          <div className="comment-replies">
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="comment-section">
      <h3 className="comment-section-title">
        Comments ({comments.length})
      </h3>

      {userId ? (
        <form onSubmit={handleAddComment} className="comment-form">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={placeholder || "Add a comment..."}
            className="comment-input"
            rows={3}
            disabled={isCommenting}
          />
          <button 
            type="submit"
            disabled={!commentText.trim() || isCommenting}
            className="comment-submit"
          >
            {isCommenting ? 'Posting...' : 'Post Comment'}
          </button>
        </form>
      ) : (
        <div className="login-prompt">
          <p>Please log in to comment</p>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="no-comments">No comments yet. Be the first!</div>
      ) : (
        <div className="comments-list">
          {comments.map(comment => renderComment(comment, 0))}
        </div>
      )}

      <style jsx>{`
        .comment-section {
          margin-top: 32px;
          padding: 24px;
          background: #f9fafb;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
        }

        .comment-section-title {
          margin: 0 0 20px 0;
          font-size: 18px;
          font-weight: 600;
          color: #374151;
        }

        .comment-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }

        .comment-input {
          width: 100%;
          padding: 14px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          resize: vertical;
          min-height: 80px;
          font-family: inherit;
          line-height: 1.5;
          background: white;
        }

        .comment-input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
        }

        .comment-submit {
          align-self: flex-end;
          padding: 10px 20px;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 40px;
        }

        .comment-submit:hover:not(:disabled) {
          background: #4f46e5;
          transform: translateY(-1px);
        }

        .comment-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .login-prompt {
          padding: 20px;
          text-align: center;
          color: #6b7280;
          background: white;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .loading,
        .no-comments {
          padding: 20px;
          text-align: center;
          color: #9ca3af;
          font-size: 14px;
        }

        .comments-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .comment-wrapper {
          transition: all 0.2s ease;
        }

        .comment-item {
          display: flex;
          gap: 12px;
          padding: 16px;
          background: white;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .comment-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }

        .comment-content {
          flex: 1;
          min-width: 0;
        }

        .comment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .comment-author {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .comment-time {
          font-size: 12px;
          color: #9ca3af;
        }

        .comment-body {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #6b7280;
          line-height: 1.6;
          word-wrap: break-word;
        }

        .comment-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .btn-action {
          background: none;
          border: none;
          color: #6366f1;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .btn-action:hover {
          background: #f3f4f6;
        }

        .btn-action.danger {
          color: #ef4444;
        }

        .btn-action.danger:hover {
          background: #fee2e2;
        }

        .comment-edit-form {
          margin-bottom: 8px;
        }

        .comment-edit-input {
          width: 100%;
          padding: 10px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
          resize: vertical;
          min-height: 60px;
          font-family: inherit;
          line-height: 1.5;
          margin-bottom: 8px;
        }

        .comment-edit-input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
        }

        .comment-edit-actions,
        .reply-actions {
          display: flex;
          gap: 8px;
        }

        .btn-save {
          padding: 8px 16px;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 36px;
        }

        .btn-save:hover:not(:disabled) {
          background: #4f46e5;
        }

        .btn-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-cancel {
          padding: 8px 16px;
          background: #f3f4f6;
          color: #6b7280;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 36px;
        }

        .btn-cancel:hover {
          background: #e5e7eb;
        }

        .reply-form {
          margin-top: 12px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .reply-input {
          width: 100%;
          padding: 10px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
          resize: vertical;
          min-height: 60px;
          font-family: inherit;
          line-height: 1.5;
          background: white;
          margin-bottom: 8px;
        }

        .reply-input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
        }

        .comment-replies {
          margin-top: 8px;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .comment-section {
            padding: 16px;
            margin-top: 24px;
          }

          .comment-section-title {
            font-size: 16px;
          }

          .comment-input,
          .reply-input,
          .comment-edit-input {
            font-size: 16px; /* Prevents zoom on iOS */
          }

          .comment-item {
            padding: 12px;
          }

          .comment-avatar {
            width: 36px;
            height: 36px;
          }

          .comment-wrapper {
            margin-left: 0 !important; /* Less indentation on mobile */
          }

          .comment-replies .comment-wrapper {
            margin-left: 20px !important;
          }
        }

        @media (max-width: 480px) {
          .comment-section {
            padding: 12px;
            border-radius: 8px;
          }

          .comment-author {
            font-size: 13px;
          }

          .comment-time {
            font-size: 11px;
          }

          .comment-body {
            font-size: 13px;
          }

          .btn-action {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
}
