// components/PostCard/IndividualPhotoModal.tsx - Fixed scroll blocking issue
"use client";

import { useState, useEffect, useRef } from "react";
import { addComment } from "@/lib/posts";
import { supabase } from "@/lib/supabaseClient";
import styles from "./styles.module.css";

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
  const modalRef = useRef<HTMLDivElement>(null);

  // Get current user on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Handle adding a comment (simplified - just shows functionality)
  const handleAddComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim() || isCommenting || !currentUserId) return;
    
    setIsCommenting(true);
    try {
      // For now, just show an alert - you can connect this to your actual comment system later
      alert(`Comment added: "${commentText.trim()}"`);
      setCommentText("");
    } catch (error) {
      console.error('Error adding photo comment:', error);
      alert("Failed to add comment");
    } finally {
      setIsCommenting(false);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // FIXED: Add event listener to document, but prevent default scroll behavior on modal
    document.addEventListener('keydown', handleKeyDown);
    
    // FIXED: Prevent body scroll without setting overflow: hidden which can cause layout issues
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalStyle;
    };
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    // FIXED: Only close if clicking the overlay itself, not the modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleModalClick = (e: React.MouseEvent) => {
    // FIXED: Prevent clicks inside modal from bubbling up to overlay
    e.stopPropagation();
  };

  return (
    <div className={styles.photoModalOverlay} onClick={handleOverlayClick}>
      <div 
        className={styles.photoModalContent} 
        ref={modalRef}
        onClick={handleModalClick}
      >
        <button className={styles.modalClose} onClick={onClose}>×</button>
        
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
          
          {/* Interactions Side - FIXED: Allow scrolling inside this container */}
          <div className={styles.interactionsSide}>
            <div className="content-section">
              <h3>Interact with this {photo.type}</h3>
              
              {/* Quick Actions */}
              <div className="quick-actions">
                <button 
                  className="action-button like-button"
                  onClick={() => alert('Like functionality coming soon!')}
                >
                  🤍 Like
                </button>
                <button 
                  className="action-button share-button"
                  onClick={() => {
                    navigator.clipboard.writeText(photo.url);
                    alert('Image URL copied to clipboard!');
                  }}
                >
                  🔄 Share
                </button>
              </div>

              {/* Comment Section */}
              <div className="comment-section">
                <h4>Add a comment</h4>
                <p className="comment-hint">Share your thoughts about this {photo.type}</p>
                
                {currentUserId ? (
                  <form onSubmit={handleAddComment} className="comment-form">
                    <textarea
                      placeholder={`Comment on this ${photo.type}...`}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="comment-textarea"
                      disabled={isCommenting}
                      maxLength={500}
                      rows={3}
                    />
                    <div className="comment-actions">
                      <div className="char-count">
                        {commentText.length}/500
                      </div>
                      <button 
                        type="submit"
                        disabled={!commentText.trim() || isCommenting}
                        className="comment-submit"
                      >
                        {isCommenting ? 'Posting...' : 'Post Comment'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="login-prompt">
                    <p>Please log in to comment on this {photo.type}</p>
                  </div>
                )}
              </div>

              {/* Future Features */}
              <div className="future-features">
                <h4>Coming Soon</h4>
                <ul>
                  <li>👍 Reactions (like, love, laugh, etc.)</li>
                  <li>💬 View existing comments</li>
                  <li>✏️ Add captions</li>
                  <li>🏷️ Tag friends in photos</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
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
          padding: 8px 16px;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        .content-section {
          padding: 24px;
          height: 100%;
          overflow-y: auto;
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
          padding: 12px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .action-button:hover {
          background: #f9fafb;
          border-color: #6366f1;
          color: #6366f1;
          transform: translateY(-1px);
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
          gap: 12px;
        }

        .comment-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          resize: vertical;
          min-height: 80px;
          font-family: inherit;
          line-height: 1.5;
        }

        .comment-textarea:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
        }

        .comment-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .char-count {
          font-size: 12px;
          color: #9ca3af;
        }

        .comment-submit {
          padding: 8px 16px;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.2s ease;
        }

        .comment-submit:hover:not(:disabled) {
          background: #4f46e5;
        }

        .comment-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .login-prompt {
          text-align: center;
          padding: 20px;
          background: #f9fafb;
          border-radius: 8px;
          color: #6b7280;
        }

        .future-features {
          padding: 16px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .future-features h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .future-features ul {
          margin: 0;
          padding-left: 20px;
          font-size: 13px;
          color: #6b7280;
          line-height: 1.6;
        }

        .future-features li {
          margin-bottom: 4px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .content-section {
            padding: 16px;
          }

          .content-section h3 {
            font-size: 16px;
          }

          .quick-actions {
            flex-direction: column;
            gap: 8px;
          }

          .comment-textarea {
            font-size: 16px; /* Prevents zoom on iOS */
          }
        }
      `}</style>
    </div>
  );
}
