// components/PostCard/IndividualPhotoModal.tsx - Mobile-Optimized with REAL Photo Interactions
"use client";

import { useState, useEffect, useRef } from "react";
import { addPhotoComment, getPhotoComments, toggleMediaLike, getMediaLikes } from "@/lib/posts";
import { supabase } from "@/lib/supabaseClient";
import styles from "./styles.module.css";

interface PhotoComment {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  author: {
    full_name: string;
    avatar_url: string;
  };
}

interface IndividualPhotoModalProps {
  photo: {url: string; type: 'image' | 'video'; id?: string};
  onClose: () => void;
}

export default function IndividualPhotoModal({ 
  photo, 
  onClose 
}: IndividualPhotoModalProps) {
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [hasImageError, setHasImageError] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  // Photo-specific state
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likedByMe, setLikedByMe] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Get current user on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Load photo comments and likes when photo ID is available
  useEffect(() => {
    if (photo.id) {
      loadPhotoData();
    }
  }, [photo.id]);

  const loadPhotoData = async () => {
    if (!photo.id) return;
    
    setLoadingComments(true);
    
    // Load comments
    const { comments: photoComments } = await getPhotoComments(photo.id);
    setComments(photoComments);
    
    // Load likes
    const { count, liked_by_me } = await getMediaLikes(photo.id);
    setLikeCount(count);
    setLikedByMe(liked_by_me);
    
    setLoadingComments(false);
  };

  // Auto-hide controls on mobile after interaction
  useEffect(() => {
    if (!showControls) return;
    
    const timer = setTimeout(() => {
      if (window.innerWidth <= 768) {
        setShowControls(false);
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [showControls]);

  // Handle liking a photo
  const handleLike = async () => {
    if (isLiking || !currentUserId || !photo.id) return;
    setIsLiking(true);
    
    try {
      const result = await toggleMediaLike(photo.id);
      if (result.ok) {
        setLikedByMe(!likedByMe);
        setLikeCount(likedByMe ? likeCount - 1 : likeCount + 1);
        
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }
    } catch (error) {
      console.error('Error liking photo:', error);
    } finally {
      setIsLiking(false);
    }
  };

  // Handle adding a comment
  const handleAddComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim() || isCommenting || !currentUserId || !photo.id) return;
    
    setIsCommenting(true);
    try {
      const result = await addPhotoComment(photo.id, commentText.trim());
      if (result.ok) {
        setCommentText("");
        // Reload comments to show the new one
        await loadPhotoData();
      } else {
        alert("Failed to add comment: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error('Error adding photo comment:', error);
      alert("Failed to add comment");
    } finally {
      setIsCommenting(false);
    }
  };

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Enter' && e.ctrlKey && commentText.trim()) {
        handleAddComment();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalStyle;
    };
  }, [onClose, commentText]);

  // Enhanced share functionality
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Shared ${photo.type}`,
          text: `Check out this ${photo.type}!`,
          url: photo.url
        });
      } catch (error) {
        // User cancelled, fall back to clipboard
        await navigator.clipboard.writeText(photo.url);
        alert('Link copied to clipboard!');
      }
    } else {
      await navigator.clipboard.writeText(photo.url);
      alert('Link copied to clipboard!');
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowControls(true);
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCommentText(e.target.value);
    
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  // Enhanced comment submit with keyboard support
  const handleCommentKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (commentText.trim() && !isCommenting) {
        handleAddComment();
      }
    }
  };

  return (
    <div className={styles.photoModalOverlay} onClick={handleOverlayClick}>
      <div 
        className={styles.photoModalContent} 
        ref={modalRef}
        onClick={handleModalClick}
      >
        {/* Enhanced Close Button */}
        <button 
          className={`modal-close ${showControls ? 'visible' : ''}`}
          onClick={onClose}
          title="Close (Esc)"
        >
          ✕
        </button>
        
        <div className={styles.photoModalLayout}>
          {/* Media Side */}
          <div className={styles.photoSide}>
            {photo.type === 'video' ? (
              <video 
                src={photo.url} 
                className={styles.modalPhoto}
                controls
                autoPlay
                muted
                playsInline
                onLoadedData={() => setIsImageLoading(false)}
                onError={() => {
                  setIsImageLoading(false);
                  setHasImageError(true);
                }}
              />
            ) : (
              <>
                {isImageLoading && (
                  <div className="media-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading image...</p>
                  </div>
                )}
                {hasImageError ? (
                  <div className="media-error">
                    <span>🖼️</span>
                    <p>Failed to load image</p>
                    <button 
                      className="retry-button"
                      onClick={() => {
                        setHasImageError(false);
                        setIsImageLoading(true);
                      }}
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <img 
                    src={photo.url} 
                    alt="" 
                    className={styles.modalPhoto}
                    draggable={false}
                    onLoad={() => setIsImageLoading(false)}
                    onError={() => {
                      setIsImageLoading(false);
                      setHasImageError(true);
                    }}
                    style={{ display: isImageLoading ? 'none' : 'block' }}
                  />
                )}
              </>
            )}
          </div>
          
          {/* Interactions Side */}
          <div className={styles.interactionsSide}>
            <div className="content-section">
              <h3>Interact with this {photo.type}</h3>
              
              {/* Quick Actions with Real Data */}
              <div className="quick-actions">
                <button 
                  className={`action-button like-button ${likedByMe ? 'liked' : ''}`}
                  onClick={handleLike}
                  disabled={isLiking || !currentUserId}
                  title="Like this media"
                >
                  <span className="action-icon">{likedByMe ? '❤️' : '🤍'}</span>
                  <span className="action-text">
                    {likedByMe ? 'Liked' : 'Like'}
                    {likeCount > 0 && ` (${likeCount})`}
                  </span>
                </button>
                <button 
                  className="action-button share-button"
                  onClick={handleShare}
                  title="Share this media"
                >
                  <span className="action-icon">🔄</span>
                  <span className="action-text">Share</span>
                </button>
                <button 
                  className="action-button caption-button"
                  onClick={() => {
                    if (commentInputRef.current) {
                      commentInputRef.current.focus();
                    }
                  }}
                  title="Add comment"
                >
                  <span className="action-icon">💬</span>
                  <span className="action-text">
                    Comment {comments.length > 0 && `(${comments.length})`}
                  </span>
                </button>
              </div>

              {/* Existing Comments */}
              {comments.length > 0 && (
                <div className="comments-list">
                  <h4>Comments ({comments.length})</h4>
                  <div className="comments-container">
                    {comments.map((comment) => (
                      <div key={comment.id} className="comment-item">
                        <img 
                          src={comment.author.avatar_url} 
                          alt="" 
                          className="comment-avatar"
                        />
                        <div className="comment-content">
                          <div className="comment-header">
                            <span className="comment-author">{comment.author.full_name}</span>
                            <span className="comment-time">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="comment-body">{comment.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comment Section */}
              <div className="comment-section">
                <h4>Add a comment</h4>
                <p className="comment-hint">Share your thoughts about this {photo.type}</p>
                
                {currentUserId ? (
                  <form onSubmit={handleAddComment} className="comment-form">
                    <div className="comment-input-wrapper">
                      <textarea
                        ref={commentInputRef}
                        placeholder={`Comment on this ${photo.type}...`}
                        value={commentText}
                        onChange={handleTextareaChange}
                        onKeyPress={handleCommentKeyPress}
                        className="comment-textarea"
                        disabled={isCommenting}
                        maxLength={500}
                        rows={2}
                      />
                      <div className="textarea-actions">
                        <div className="char-count">
                          {commentText.length}/500
                        </div>
                        <button 
                          type="submit"
                          disabled={!commentText.trim() || isCommenting}
                          className="comment-submit"
                        >
                          {isCommenting ? (
                            <>
                              <span className="submit-spinner">⏳</span>
                              <span>Posting...</span>
                            </>
                          ) : (
                            <>
                              <span>📤</span>
                              <span>Post</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="keyboard-hint">
                      <span>💡 Press Enter to post, Shift+Enter for new line</span>
                    </div>
                  </form>
                ) : (
                  <div className="login-prompt">
                    <div className="login-icon">🔐</div>
                    <p>Please log in to comment on this {photo.type}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-close {
          position: absolute;
          top: 20px;
          right: 20px;
          z-index: 15;
          width: 50px;
          height: 50px;
          background: rgba(0,0,0,0.8);
          color: white;
          border: none;
          border-radius: 50%;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          opacity: 0;
          transform: translateY(-10px);
          backdrop-filter: blur(8px);
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .modal-close.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .modal-close:hover {
          background: rgba(0,0,0,0.9);
          transform: translateY(0) scale(1.05);
        }

        .modal-close:active {
          transform: translateY(0) scale(0.95);
        }

        .media-loading,
        .media-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          gap: 16px;
          min-height: 200px;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid rgba(255,255,255,0.3);
          border-top: 4px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .media-error span {
          font-size: 48px;
        }

        .retry-button {
          padding: 12px 20px;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          min-height: 44px;
          transition: all 0.2s ease;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .retry-button:hover {
          background: #4f46e5;
          transform: translateY(-1px);
        }

        .retry-button:active {
          transform: translateY(0);
        }

        .content-section {
          padding: 24px;
          height: 100%;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .content-section h3 {
          margin: 0 0 20px 0;
          font-size: 18px;
          font-weight: 600;
          color: #374151;
        }

        .quick-actions {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }

        .action-button {
          flex: 1;
          padding: 14px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 64px;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .action-button:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #6366f1;
          color: #6366f1;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99,102,241,0.15);
        }

        .action-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .action-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .action-button.liked {
          background: #fef2f2;
          border-color: #ef4444;
          color: #ef4444;
        }

        .action-icon {
          font-size: 20px;
        }

        .action-text {
          font-size: 12px;
          font-weight: 600;
        }

        .comments-list {
          margin-bottom: 24px;
          padding: 20px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
        }

        .comments-list h4 {
          margin: 0 0 16px 0;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .comments-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: 300px;
          overflow-y: auto;
        }

        .comment-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          background: white;
          border-radius: 8px;
        }

        .comment-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }

        .comment-content {
          flex: 1;
        }

        .comment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .comment-author {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
        }

        .comment-time {
          font-size: 11px;
          color: #9ca3af;
        }

        .comment-body {
          margin: 0;
          font-size: 14px;
          color: #6b7280;
          line-height: 1.5;
        }

        .comment-section {
          margin-bottom: 24px;
        }

        .comment-section h4 {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
          color: #374151;
        }

        .comment-hint {
          margin: 0 0 16px 0;
          font-size: 14px;
          color: #6b7280;
        }

        .comment-form {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .comment-input-wrapper {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .comment-textarea {
          width: 100%;
          padding: 14px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          resize: none;
          min-height: 60px;
          max-height: 120px;
          font-family: inherit;
          line-height: 1.5;
          transition: all 0.2s ease;
          -webkit-appearance: none;
        }

        .comment-textarea:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
        }

        .textarea-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .char-count {
          font-size: 12px;
          color: #9ca3af;
        }

        .comment-submit {
          padding: 10px 16px;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          min-height: 36px;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .comment-submit:hover:not(:disabled) {
          background: #4f46e5;
          transform: translateY(-1px);
        }

        .comment-submit:active:not(:disabled) {
          transform: translateY(0);
        }

        .comment-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .submit-spinner {
          animation: spin 1s linear infinite;
        }

        .keyboard-hint {
          font-size: 11px;
          color: #9ca3af;
          text-align: center;
          font-style: italic;
        }

        .login-prompt {
          text-align: center;
          padding: 24px;
          background: #f9fafb;
          border-radius: 12px;
          color: #6b7280;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .login-icon {
          font-size: 32px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .modal-close {
            top: 15px;
            right: 15px;
            width: 44px;
            height: 44px;
            font-size: 18px;
          }

          .content-section {
            padding: 20px 16px;
          }

          .content-section h3 {
            font-size: 16px;
          }

          .quick-actions {
            gap: 8px;
          }

          .action-button {
            padding: 12px 14px;
            min-height: 60px;
          }

          .action-icon {
            font-size: 18px;
          }

          .action-text {
            font-size: 11px;
          }

          .comment-textarea {
            font-size: 16px;
            padding: 12px;
          }

          .comment-avatar {
            width: 32px;
            height: 32px;
          }
        }

        @media (max-width: 480px) {
          .modal-close {
            top: 10px;
            right: 10px;
            width: 40px;
            height: 40px;
            font-size: 16px;
          }

          .content-section {
            padding: 16px 12px;
          }

          .quick-actions {
            flex-direction: column;
            gap: 8px;
          }

          .action-button {
            flex-direction: row;
            justify-content: center;
            min-height: 48px;
            gap: 8px;
          }

          .action-icon {
            font-size: 16px;
          }

          .action-text {
            font-size: 14px;
          }

          .comment-submit {
            width: 100%;
            justify-content: center;
          }

          .keyboard-hint {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
}
