// components/PostCard/PostInteractions.tsx - Enhanced with better UX
"use client";

import { useState, useRef, useEffect } from "react";
import { Post } from "@/lib/posts";

interface Comment {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  author?: {
    full_name: string;
    avatar_url: string;
  };
}

interface PostInteractionsProps {
  post: Post;
  localLikeCount: number;
  localLikedByMe: boolean;
  isLiking: boolean;
  currentUserId?: string;
  comments: Comment[];
  showAllComments: boolean;
  showCommentInput: boolean;
  commentText: string;
  isCommenting: boolean;
  allCommentsCount: number;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onToggleCommentInput: () => void;
  onCommentTextChange: (text: string) => void;
  onShowAllComments: () => void;
}

export default function PostInteractions({
  post,
  localLikeCount,
  localLikedByMe,
  isLiking,
  currentUserId,
  comments,
  showAllComments,
  showCommentInput,
  commentText,
  isCommenting,
  allCommentsCount,
  onLike,
  onComment,
  onShare,
  onToggleCommentInput,
  onCommentTextChange,
  onShowAllComments
}: PostInteractionsProps) {
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  // Focus comment input when it becomes visible
  useEffect(() => {
    if (showCommentInput && commentInputRef.current) {
      commentInputRef.current.focus();
    }
  }, [showCommentInput]);

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setIsShareMenuOpen(false);
      }
    };

    if (isShareMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isShareMenuOpen]);

  const handleShare = async (type: 'link' | 'text') => {
    try {
      const postUrl = `${window.location.origin}/post/${post.id}`;
      const shareText = `Check out this post: ${post.body || 'Shared a moment'}`;

      if (type === 'link') {
        await navigator.clipboard.writeText(postUrl);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      } else if (navigator.share) {
        await navigator.share({
          title: 'Shared Post',
          text: shareText,
          url: postUrl,
        });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${postUrl}`);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      }
      
      setIsShareMenuOpen(false);
    } catch (error) {
      console.error('Error sharing:', error);
      // Fallback to the original share function
      onShare();
      setIsShareMenuOpen(false);
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim() && !isCommenting) {
      onComment();
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  const getEngagementText = () => {
    const parts = [];
    if (localLikeCount > 0) {
      if (localLikeCount === 1) {
        parts.push(localLikedByMe ? 'You like this' : '1 like');
      } else {
        parts.push(localLikedByMe 
          ? `You and ${localLikeCount - 1} others like this`
          : `${localLikeCount} likes`
        );
      }
    }
    if (post.comment_count > 0) {
      parts.push(post.comment_count === 1 ? '1 comment' : `${post.comment_count} comments`);
    }
    return parts.join(' • ');
  };
  
  return (
    <div className="post-footer">
      {/* Engagement Stats */}
      {(localLikeCount > 0 || post.comment_count > 0) && (
        <div className="engagement-stats">
          <span className="engagement-text">{getEngagementText()}</span>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="action-buttons">
        <button 
          className={`action-btn like-btn ${localLikedByMe ? 'liked' : ''}`}
          onClick={onLike}
          disabled={isLiking || !currentUserId}
          aria-label={localLikedByMe ? 'Unlike this post' : 'Like this post'}
        >
          <span className="btn-icon">
            {isLiking ? (
              <span className="pulse-heart">💗</span>
            ) : localLikedByMe ? (
              '❤️'
            ) : (
              '🤍'
            )}
          </span>
          <span className="btn-text">
            {localLikedByMe ? 'Liked' : 'Like'}
          </span>
          {localLikeCount > 0 && (
            <span className="btn-count">{localLikeCount}</span>
          )}
        </button>

        <button 
          className={`action-btn comment-btn ${showCommentInput ? 'active' : ''}`}
          onClick={onToggleCommentInput}
          disabled={!currentUserId}
          aria-label="Comment on this post"
        >
          <span className="btn-icon">💬</span>
          <span className="btn-text">Comment</span>
          {post.comment_count > 0 && (
            <span className="btn-count">{post.comment_count}</span>
          )}
        </button>

        {post.allow_share && (
          <div className="share-container" ref={shareMenuRef}>
            <button 
              className={`action-btn share-btn ${isShareMenuOpen ? 'active' : ''}`}
              onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
              aria-label="Share this post"
            >
              <span className="btn-icon">🔄</span>
              <span className="btn-text">Share</span>
            </button>

            {isShareMenuOpen && (
              <div className="share-menu">
                <button 
                  className="share-option"
                  onClick={() => handleShare('link')}
                >
                  <span className="share-icon">🔗</span>
                  <span className="share-text">Copy Link</span>
                </button>
                
                {navigator.share && (
                  <button 
                    className="share-option"
                    onClick={() => handleShare('text')}
                  >
                    <span className="share-icon">📱</span>
                    <span className="share-text">Share via...</span>
                  </button>
                )}
              </div>
            )}

            {shareSuccess && (
              <div className="share-success">
                <span>✅ Copied to clipboard!</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Comments Section */}
      {comments.length > 0 && (
        <div className="comments-section">
          <div className="comments-list">
            {comments.map((comment) => (
              <article key={comment.id} className="comment">
                <div className="comment-avatar-container">
                  <img 
                    src={comment.author?.avatar_url || '/default-avatar.png'} 
                    alt={`${comment.author?.full_name || 'User'}'s profile picture`}
                    className="comment-avatar"
                  />
                </div>
                <div className="comment-content">
                  <div className="comment-bubble">
                    <div className="comment-author">{comment.author?.full_name || 'User'}</div>
                    <div className="comment-text">{comment.body}</div>
                  </div>
                  <div className="comment-meta">
                    <span className="comment-time">{formatTimeAgo(comment.created_at)}</span>
                    <button className="comment-like-btn" disabled>
                      <span>🤍</span>
                      <span>Like</span>
                    </button>
                    <button className="comment-reply-btn" disabled>
                      <span>Reply</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          
          {allCommentsCount > 3 && !showAllComments && (
            <button 
              className="show-more-comments"
              onClick={onShowAllComments}
            >
              <span className="expand-icon">💬</span>
              View all {allCommentsCount} comments
            </button>
          )}
        </div>
      )}
      
      {/* Comment Input */}
      {showCommentInput && (
        <form className="comment-input-section" onSubmit={handleCommentSubmit}>
          <div className="comment-input-container">
            <input
              ref={commentInputRef}
              type="text"
              className="comment-input"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => onCommentTextChange(e.target.value)}
              disabled={isCommenting}
              maxLength={500}
              aria-label="Write a comment"
            />
            <button 
              type="submit"
              className="comment-submit"
              disabled={!commentText.trim() || isCommenting}
              aria-label="Post comment"
            >
              {isCommenting ? (
                <span className="posting-spinner">⏳</span>
              ) : (
                <span>Post</span>
              )}
            </button>
          </div>
          {commentText.length > 400 && (
            <div className="comment-char-count">
              {commentText.length}/500 characters
            </div>
          )}
        </form>
      )}

      <style jsx>{`
        .post-footer {
          padding: 20px 24px;
          border-top: 1px solid #f3f4f6;
          background: #fafafa;
        }

        .engagement-stats {
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f3f4f6;
        }

        .engagement-text {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .action-btn {
          flex: 1;
          padding: 12px 16px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          color: #4a5568;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          position: relative;
          min-height: 44px;
        }

        .action-btn:hover:not(:disabled) {
          background: #f9fafb;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .like-btn:hover:not(:disabled) {
          border-color: #f87171;
          color: #dc2626;
        }

        .like-btn.liked {
          background: #fef2f2;
          border-color: #f87171;
          color: #dc2626;
        }

        .comment-btn:hover:not(:disabled),
        .comment-btn.active {
          border-color: #60a5fa;
          color: #2563eb;
        }

        .share-btn:hover:not(:disabled),
        .share-btn.active {
          border-color: #34d399;
          color: #059669;
        }

        .btn-icon {
          font-size: 16px;
          display: flex;
          align-items: center;
        }

        .btn-text {
          font-size: 14px;
        }

        .btn-count {
          background: #e5e7eb;
          color: #6b7280;
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 8px;
          margin-left: 4px;
          font-weight: 500;
        }

        .like-btn.liked .btn-count {
          background: #fecaca;
          color: #dc2626;
        }

        .pulse-heart {
          animation: pulse 0.3s ease-in-out;
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        .share-container {
          position: relative;
          flex: 1;
        }

        .share-menu {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 10px 32px rgba(0,0,0,0.15);
          z-index: 10;
          margin-bottom: 8px;
          overflow: hidden;
          min-width: 180px;
          animation: slideUp 0.2s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .share-option {
          width: 100%;
          padding: 12px 16px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          color: #374151;
          transition: background 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .share-option:hover {
          background: #f9fafb;
        }

        .share-icon {
          font-size: 16px;
        }

        .share-text {
          font-weight: 500;
        }

        .share-success {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #10b981;
          color: white;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          margin-bottom: 8px;
          animation: fadeInOut 2s ease-in-out;
          white-space: nowrap;
        }

        @keyframes fadeInOut {
          0%, 100% { opacity: 0; transform: translateX(-50%) translateY(4px); }
          10%, 90% { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .comments-section {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #f3f4f6;
        }

        .comments-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .comment {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .comment-avatar-container {
          flex-shrink: 0;
        }

        .comment-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #f8fafc;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .comment-content {
          flex: 1;
          min-width: 0;
        }

        .comment-bubble {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 12px 16px;
          margin-bottom: 6px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .comment-author {
          font-weight: 600;
          font-size: 13px;
          color: #374151;
          margin-bottom: 4px;
        }

        .comment-text {
          font-size: 14px;
          color: #4a5568;
          line-height: 1.5;
          word-wrap: break-word;
        }

        .comment-meta {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-left: 16px;
        }

        .comment-time {
          font-size: 12px;
          color: #9ca3af;
          font-weight: 500;
        }

        .comment-like-btn,
        .comment-reply-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
          padding: 4px 8px;
          border-radius: 6px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .comment-like-btn:hover:not(:disabled),
        .comment-reply-btn:hover:not(:disabled) {
          background: #f3f4f6;
          color: #374151;
        }

        .comment-like-btn:disabled,
        .comment-reply-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .show-more-comments {
          background: none;
          border: none;
          color: #6366f1;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          padding: 12px 0;
          margin-top: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: color 0.2s ease;
        }

        .show-more-comments:hover {
          color: #4f46e5;
        }

        .expand-icon {
          font-size: 16px;
        }

        .comment-input-section {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #f3f4f6;
        }

        .comment-input-container {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .comment-input {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 24px;
          font-size: 14px;
          background: white;
          transition: all 0.2s ease;
          line-height: 1.4;
        }

        .comment-input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
        }

        .comment-input:disabled {
          background: #f9fafb;
          cursor: not-allowed;
        }

        .comment-submit {
          padding: 12px 20px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          border: none;
          border-radius: 24px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(99,102,241,0.3);
          min-width: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .comment-submit:hover:not(:disabled) {
          background: linear-gradient(135deg, #4f46e5, #3730a3);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(99,102,241,0.4);
        }

        .comment-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .posting-spinner {
          display: inline-block;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .comment-char-count {
          text-align: right;
          font-size: 12px;
          color: #9ca3af;
          margin-top: 6px;
          margin-right: 80px;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .post-footer {
            padding: 16px 20px;
          }

          .action-buttons {
            gap: 6px;
          }

          .action-btn {
            padding: 10px 12px;
            font-size: 13px;
            min-height: 40px;
          }

          .btn-text {
            font-size: 13px;
          }

          .btn-icon {
            font-size: 15px;
          }

          .share-menu {
            min-width: 160px;
            left: auto;
            right: 0;
            transform: none;
          }

          .comment {
            gap: 10px;
          }

          .comment-avatar {
            width: 32px;
            height: 32px;
          }

          .comment-bubble {
            padding: 10px 12px;
            border-radius: 12px;
          }

          .comment-meta {
            gap: 12px;
            margin-left: 12px;
          }

          .comment-input-container {
            gap: 8px;
          }

          .comment-input {
            padding: 10px 14px;
            font-size: 16px; /* Prevents zoom on iOS */
          }

          .comment-submit {
            padding: 10px 16px;
            font-size: 13px;
          }
        }

        @media (max-width: 480px) {
          .action-buttons {
            gap: 4px;
          }

          .action-btn {
            padding: 8px 10px;
            font-size: 12px;
            flex-direction: column;
            gap: 4px;
            min-height: 50px;
          }

          .btn-text {
            font-size: 11px;
          }

          .btn-icon {
            font-size: 16px;
          }

          .btn-count {
            position: absolute;
            top: 4px;
            right: 4px;
            margin: 0;
            min-width: 16px;
            height: 16px;
            font-size: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .comment-input-container {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }

          .comment-submit {
            align-self: flex-end;
            min-width: 80px;
          }

          .comment-char-count {
            margin-right: 0;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
