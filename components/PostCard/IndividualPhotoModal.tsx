// components/PostCard/IndividualPhotoModal.tsx - Enhanced with better mobile UX
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

interface IndividualPhotoModalProps {
  photo: {url: string; type: 'image' | 'video'; id?: string};
  onClose: () => void;
}

interface PhotoComment {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  author?: {
    full_name: string;
    avatar_url: string;
  };
}

interface PhotoReaction {
  id: string;
  reaction_type: string;
  user_id: string;
  created_at: string;
  author?: {
    full_name: string;
    avatar_url: string;
  };
}

const reactionTypes = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'laugh', emoji: '😂', label: 'Laugh' },
  { type: 'wow', emoji: '😮', label: 'Wow' },
  { type: 'sad', emoji: '😢', label: 'Sad' },
  { type: 'angry', emoji: '😠', label: 'Angry' }
];

export default function IndividualPhotoModal({ 
  photo, 
  onClose 
}: IndividualPhotoModalProps) {
  const [photoComments, setPhotoComments] = useState<PhotoComment[]>([]);
  const [photoReactions, setPhotoReactions] = useState<Record<string, PhotoReaction[]>>({});
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isLoadingReactions, setIsLoadingReactions] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [hasImageError, setHasImageError] = useState(false);
  const [activeTab, setActiveTab] = useState<'reactions' | 'comments'>('reactions');
  
  const commentInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Get current user on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Load photo-specific comments
  const loadPhotoComments = useCallback(async () => {
    if (!photo.id || isLoadingComments) return;
    
    setIsLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from("photo_comments")
        .select(`
          id,
          body,
          created_at,
          user_id,
          profiles!inner(
            full_name,
            avatar_url
          )
        `)
        .eq("photo_id", photo.id)
        .order("created_at", { ascending: true });
      
      if (!error && data) {
        const formattedComments = data.map((comment: any) => ({
          id: comment.id,
          body: comment.body,
          created_at: comment.created_at,
          user_id: comment.user_id,
          author: {
            full_name: comment.profiles.full_name || 'User',
            avatar_url: comment.profiles.avatar_url || '/default-avatar.png'
          }
        }));
        setPhotoComments(formattedComments);
      }
    } catch (error) {
      console.error('Error loading photo comments:', error);
    } finally {
      setIsLoadingComments(false);
    }
  }, [photo.id, isLoadingComments]);

  // Load photo-specific reactions
  const loadPhotoReactions = useCallback(async () => {
    if (!photo.id || isLoadingReactions) return;
    
    setIsLoadingReactions(true);
    try {
      const { data, error } = await supabase
        .from("photo_reactions")
        .select(`
          id,
          reaction_type,
          user_id,
          created_at,
          profiles!inner(
            full_name,
            avatar_url
          )
        `)
        .eq("photo_id", photo.id)
        .order("created_at", { ascending: false });
      
      if (!error && data) {
        const formattedReactions = data.map((reaction: any) => ({
          id: reaction.id,
          reaction_type: reaction.reaction_type,
          user_id: reaction.user_id,
          created_at: reaction.created_at,
          author: {
            full_name: reaction.profiles.full_name || 'User',
            avatar_url: reaction.profiles.avatar_url || '/default-avatar.png'
          }
        }));

        // Group reactions by type
        const groupedReactions: Record<string, PhotoReaction[]> = {};
        formattedReactions.forEach((reaction) => {
          if (!groupedReactions[reaction.reaction_type]) {
            groupedReactions[reaction.reaction_type] = [];
          }
          groupedReactions[reaction.reaction_type].push(reaction);
        });

        setPhotoReactions(groupedReactions);

        // Set current user's reaction
        if (currentUserId) {
          const userReaction = formattedReactions.find(r => r.user_id === currentUserId);
          setMyReaction(userReaction?.reaction_type || null);
        }
      }
    } catch (error) {
      console.error('Error loading photo reactions:', error);
    } finally {
      setIsLoadingReactions(false);
    }
  }, [photo.id, currentUserId, isLoadingReactions]);

  // Load data on mount
  useEffect(() => {
    if (photo.id) {
      loadPhotoComments();
      loadPhotoReactions();
    }
  }, [photo.id, currentUserId, loadPhotoComments, loadPhotoReactions]);

  // Handle adding a reaction
  const handleReaction = async (reactionType: string) => {
    if (!currentUserId || !photo.id) return;

    try {
      // If user already has this reaction, remove it
      if (myReaction === reactionType) {
        const { error } = await supabase
          .from("photo_reactions")
          .delete()
          .eq("photo_id", photo.id)
          .eq("user_id", currentUserId);

        if (!error) {
          setMyReaction(null);
          await loadPhotoReactions();
        }
      } else {
        // Remove existing reaction if any
        if (myReaction) {
          await supabase
            .from("photo_reactions")
            .delete()
            .eq("photo_id", photo.id)
            .eq("user_id", currentUserId);
        }

        // Add new reaction
        const { error } = await supabase
          .from("photo_reactions")
          .insert({
            photo_id: photo.id,
            user_id: currentUserId,
            reaction_type: reactionType
          });

        if (!error) {
          setMyReaction(reactionType);
          await loadPhotoReactions();
        }
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
    } finally {
      setShowReactionPicker(false);
    }
  };

  // Handle adding a comment
  const handleAddComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim() || isCommenting || !currentUserId || !photo.id) return;
    
    setIsCommenting(true);
    try {
      const { error } = await supabase
        .from("photo_comments")
        .insert({
          photo_id: photo.id,
          user_id: currentUserId,
          body: commentText.trim()
        });

      if (!error) {
        setCommentText("");
        await loadPhotoComments();
      } else {
        alert("Failed to add comment");
      }
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

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Focus comment input when comments tab is selected
  useEffect(() => {
    if (activeTab === 'comments' && commentInputRef.current) {
      commentInputRef.current.focus();
    }
  }, [activeTab]);

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

  const getTotalReactions = () => {
    return Object.values(photoReactions).reduce((total, reactions) => total + reactions.length, 0);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="photo-modal-overlay" onClick={handleOverlayClick}>
      <div className="photo-modal-content" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          ✕
        </button>
        
        <div className="photo-modal-layout">
          {/* Media Side */}
          <div className="photo-side">
            {photo.type === 'video' ? (
              <video 
                src={photo.url} 
                className="modal-photo"
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
                    className="modal-photo"
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
          <div className="interactions-side">
            {/* Tab Navigation */}
            <div className="tab-navigation">
              <button 
                className={`tab-btn ${activeTab === 'reactions' ? 'active' : ''}`}
                onClick={() => setActiveTab('reactions')}
              >
                <span className="tab-icon">👍</span>
                <span className="tab-label">Reactions</span>
                {getTotalReactions() > 0 && (
                  <span className="tab-count">{getTotalReactions()}</span>
                )}
              </button>
              <button 
                className={`tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
                onClick={() => setActiveTab('comments')}
              >
                <span className="tab-icon">💬</span>
                <span className="tab-label">Comments</span>
                {photoComments.length > 0 && (
                  <span className="tab-count">{photoComments.length}</span>
                )}
              </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'reactions' ? (
                <div className="reactions-tab">
                  {/* Quick Reaction Button */}
                  {currentUserId && (
                    <div className="quick-reactions">
                      <div className="reaction-picker-container">
                        <button 
                          className={`quick-reaction-btn ${myReaction ? 'has-reaction' : ''}`}
                          onClick={() => setShowReactionPicker(!showReactionPicker)}
                        >
                          <span className="reaction-emoji">
                            {myReaction ? reactionTypes.find(r => r.type === myReaction)?.emoji : '👍'}
                          </span>
                          <span className="reaction-text">
                            {myReaction ? reactionTypes.find(r => r.type === myReaction)?.label : 'React'}
                          </span>
                        </button>

                        {showReactionPicker && (
                          <div className="reaction-picker">
                            {reactionTypes.map((reaction) => (
                              <button
                                key={reaction.type}
                                className={`reaction-option ${myReaction === reaction.type ? 'selected' : ''}`}
                                onClick={() => handleReaction(reaction.type)}
                                title={reaction.label}
                              >
                                <span className="reaction-emoji">{reaction.emoji}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Reactions List */}
                  <div className="reactions-content">
                    {isLoadingReactions ? (
                      <div className="loading-state">
                        <div className="small-spinner"></div>
                        <span>Loading reactions...</span>
                      </div>
                    ) : Object.keys(photoReactions).length > 0 ? (
                      <div className="reactions-list">
                        {Object.entries(photoReactions).map(([type, reactions]) => {
                          if (reactions.length === 0) return null;
                          const reactionInfo = reactionTypes.find(r => r.type === type);
                          if (!reactionInfo) return null;
                          
                          return (
                            <div key={type} className="reaction-group">
                              <div className="reaction-header">
                                <span className="reaction-emoji">{reactionInfo.emoji}</span>
                                <span className="reaction-count">{reactions.length}</span>
                              </div>
                              <div className="reaction-users">
                                {reactions.slice(0, 5).map((reaction) => (
                                  <div key={reaction.id} className="reaction-user">
                                    <img 
                                      src={reaction.author?.avatar_url || '/default-avatar.png'}
                                      alt=""
                                      className="reaction-avatar"
                                    />
                                    <span className="reaction-name">
                                      {reaction.author?.full_name || 'User'}
                                    </span>
                                    <span className="reaction-time">
                                      {formatTimeAgo(reaction.created_at)}
                                    </span>
                                  </div>
                                ))}
                                {reactions.length > 5 && (
                                  <div className="more-reactions">
                                    and {reactions.length - 5} others
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <span className="empty-icon">👍</span>
                        <p>No reactions yet</p>
                        <span className="empty-hint">Be the first to react!</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="comments-tab">
                  {/* Comments List */}
                  <div className="comments-content">
                    {isLoadingComments ? (
                      <div className="loading-state">
                        <div className="small-spinner"></div>
                        <span>Loading comments...</span>
                      </div>
                    ) : photoComments.length > 0 ? (
                      <div className="comments-list">
                        {photoComments.map(comment => (
                          <article key={comment.id} className="photo-comment">
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
                              <div className="comment-time">
                                {formatTimeAgo(comment.created_at)}
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <span className="empty-icon">💬</span>
                        <p>No comments yet</p>
                        <span className="empty-hint">Start the conversation!</span>
                      </div>
                    )}
                  </div>

                  {/* Comment Input */}
                  {currentUserId && (
                    <form className="comment-input-section" onSubmit={handleAddComment}>
                      <div className="comment-input-container">
                        <input
                          ref={commentInputRef}
                          type="text"
                          placeholder="Add a comment..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          className="photo-comment-input"
                          disabled={isCommenting}
                          maxLength={500}
                        />
                        <button 
                          type="submit"
                          disabled={!commentText.trim() || isCommenting}
                          className="photo-comment-btn"
                        >
                          {isCommenting ? (
                            <span className="small-spinner"></span>
                          ) : (
                            'Post'
                          )}
                        </button>
                      </div>
                      {commentText.length > 400 && (
                        <div className="char-count">
                          {commentText.length}/500
                        </div>
                      )}
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .photo-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          backdrop-filter: blur(4px);
        }

        .photo-modal-content {
          background: white;
          border-radius: 20px;
          max-width: 1200px;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          position: relative;
          box-shadow: 0 25px 50px rgba(0,0,0,0.3);
        }

        .modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(8px);
          border: none;
          color: white;
          cursor: pointer;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          transition: all 0.2s ease;
        }

        .modal-close:hover {
          background: rgba(0,0,0,0.9);
          transform: scale(1.05);
        }

        .photo-modal-layout {
          display: grid;
          grid-template-columns: 2fr 1fr;
          height: 80vh;
          min-height: 600px;
        }

        .photo-side {
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          border-radius: 20px 0 0 20px;
          overflow: hidden;
        }

        .modal-photo {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .media-loading,
        .media-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          gap: 16px;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid rgba(255,255,255,0.3);
          border-top: 4px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .small-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
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

        .interactions-side {
          display: flex;
          flex-direction: column;
          background: white;
          border-radius: 0 20px 20px 0;
        }

        .tab-navigation {
          display: flex;
          border-bottom: 1px solid #f3f4f6;
          background: #fafafa;
        }

        .tab-btn {
          flex: 1;
          padding: 16px 20px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #6b7280;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
          position: relative;
        }

        .tab-btn:hover {
          background: rgba(99,102,241,0.05);
          color: #6366f1;
        }

        .tab-btn.active {
          color: #6366f1;
          background: white;
          border-bottom: 2px solid #6366f1;
        }

        .tab-icon {
          font-size: 16px;
        }

        .tab-label {
          font-weight: 600;
        }

        .tab-count {
          background: #6366f1;
          color: white;
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 8px;
          min-width: 16px;
          text-align: center;
          font-weight: 600;
        }

        .tab-content {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .reactions-tab,
        .comments-tab {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 20px;
        }

        .quick-reactions {
          margin-bottom: 20px;
        }

        .reaction-picker-container {
          position: relative;
        }

        .quick-reaction-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          transition: all 0.2s ease;
          width: 100%;
          justify-content: center;
        }

        .quick-reaction-btn:hover {
          background: #f1f5f9;
          border-color: #6366f1;
          color: #6366f1;
        }

        .quick-reaction-btn.has-reaction {
          background: #eef2ff;
          border-color: #6366f1;
          color: #6366f1;
        }

        .reaction-picker {
          position: absolute;
          top: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 8px;
          box-shadow: 0 10px 32px rgba(0,0,0,0.15);
          z-index: 10;
          display: flex;
          gap: 4px;
          animation: slideIn 0.2s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .reaction-option {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: none;
          border: 2px solid transparent;
          cursor: pointer;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .reaction-option:hover {
          background: #f8fafc;
          transform: scale(1.1);
        }

        .reaction-option.selected {
          border-color: #6366f1;
          background: #eef2ff;
        }

        .reactions-content,
        .comments-content {
          flex: 1;
          overflow-y: auto;
        }

        .loading-state {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: center;
          padding: 40px 20px;
          color: #6b7280;
          font-size: 14px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-state p {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 500;
          color: #374151;
        }

        .empty-hint {
          font-size: 14px;
          color: #9ca3af;
        }

        .reactions-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .reaction-group {
          background: #f8fafc;
          border-radius: 12px;
          padding: 16px;
          border: 1px solid #e2e8f0;
        }

        .reaction-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .reaction-emoji {
          font-size: 20px;
        }

        .reaction-count {
          background: #6366f1;
          color: white;
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 6px;
          font-weight: 600;
        }

        .reaction-users {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .reaction-user {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .reaction-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid #e5e7eb;
        }

        .reaction-name {
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          flex: 1;
        }

        .reaction-time {
          font-size: 12px;
          color: #9ca3af;
        }

        .more-reactions {
          font-size: 12px;
          color: #9ca3af;
          font-style: italic;
          padding-left: 32px;
        }

        .comments-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .photo-comment {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }

        .comment-avatar-container {
          flex-shrink: 0;
        }

        .comment-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #f8fafc;
        }

        .comment-content {
          flex: 1;
          min-width: 0;
        }

        .comment-bubble {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px 12px;
          margin-bottom: 4px;
        }

        .comment-author {
          font-weight: 600;
          font-size: 12px;
          color: #374151;
          margin-bottom: 4px;
        }

        .comment-text {
          font-size: 13px;
          color: #4a5568;
          line-height: 1.4;
          word-wrap: break-word;
        }

        .comment-time {
          font-size: 11px;
          color: #9ca3af;
          margin-left: 12px;
        }

        .comment-input-section {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #f3f4f6;
        }

        .comment-input-container {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .photo-comment-input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          font-size: 14px;
          background: white;
          transition: border-color 0.2s ease;
        }

        .photo-comment-input:focus {
          outline: none;
          border-color: #6366f1;
        }

        .photo-comment-btn {
          padding: 10px 16px;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: background 0.2s ease;
          min-width: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .photo-comment-btn:hover:not(:disabled) {
          background: #4f46e5;
        }

        .photo-comment-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .char-count {
          text-align: right;
          font-size: 11px;
          color: #9ca3af;
          margin-top: 4px;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .photo-modal-overlay {
            padding: 0;
          }

          .photo-modal-content {
            width: 100vw;
            height: 100vh;
            max-width: 100vw;
            max-height: 100vh;
            border-radius: 0;
          }

          .photo-modal-layout {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr auto;
            height: 100vh;
          }

          .photo-side {
            border-radius: 0;
          }

          .interactions-side {
            max-height: 50vh;
            border-radius: 0;
          }

          .modal-close {
            top: 10px;
            right: 10px;
            width: 36px;
            height: 36px;
            font-size: 16px;
          }

          .tab-btn {
            padding: 12px 16px;
            font-size: 13px;
          }

          .reactions-tab,
          .comments-tab {
            padding: 16px;
          }

          .quick-reaction-btn {
            padding: 10px 14px;
            font-size: 13px;
          }

          .reaction-picker {
            width: calc(100vw - 40px);
            left: 20px;
            right: 20px;
            transform: none;
          }

          .reaction-option {
            width: 36px;
            height: 36px;
            font-size: 18px;
          }

          .empty-state {
            padding: 40px 20px;
          }

          .empty-icon {
            font-size: 40px;
          }

          .photo-comment {
            gap: 8px;
          }

          .comment-avatar {
            width: 28px;
            height: 28px;
          }

          .comment-input-container {
            gap: 6px;
          }

          .photo-comment-input {
            font-size: 16px; /* Prevents zoom on iOS */
            padding: 8px 10px;
          }

          .photo-comment-btn {
            padding: 8px 12px;
            font-size: 12px;
          }
        }

        @media (max-width: 480px) {
          .tab-btn {
            padding: 10px 12px;
            font-size: 12px;
          }

          .tab-icon {
            font-size: 14px;
          }

          .reactions-tab,
          .comments-tab {
            padding: 12px;
          }

          .reaction-group {
            padding: 12px;
          }

          .comment-bubble {
            padding: 8px 10px;
          }

          .comment-author {
            font-size: 11px;
          }

          .comment-text {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}
