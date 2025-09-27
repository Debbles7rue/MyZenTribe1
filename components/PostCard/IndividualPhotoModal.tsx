// components/PostCard/IndividualPhotoModal.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./styles.module.css";

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

  // Get current user on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Load photo-specific comments
  const loadPhotoComments = async () => {
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
  };

  // Load photo-specific reactions
  const loadPhotoReactions = async () => {
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
  };

  // Load data on mount
  useEffect(() => {
    if (photo.id) {
      loadPhotoComments();
      loadPhotoReactions();
    }
  }, [photo.id, currentUserId]);

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
    }
  };

  // Handle adding a comment
  const handleAddComment = async () => {
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

  const reactionTypes = [
    { type: 'like', emoji: '👍', label: 'Like' },
    { type: 'love', emoji: '❤️', label: 'Love' },
    { type: 'laugh', emoji: '😂', label: 'Laugh' },
    { type: 'wow', emoji: '😮', label: 'Wow' },
    { type: 'sad', emoji: '😢', label: 'Sad' },
    { type: 'angry', emoji: '😠', label: 'Angry' }
  ];

  return (
    <div className={styles.photoModalOverlay} onClick={onClose}>
      <div className={styles.photoModalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose}>×</button>
        
        <div className={styles.photoModalLayout}>
          <div className={styles.photoSide}>
            {photo.type === 'video' ? (
              <video 
                src={photo.url} 
                className={styles.modalPhoto}
                controls
                autoPlay
                muted
              />
            ) : (
              <img src={photo.url} alt="" className={styles.modalPhoto} />
            )}
          </div>
          
          <div className={styles.interactionsSide}>
            <div className={styles.photoReactions}>
              <h4>Reactions</h4>
              <div className={styles.reactionButtons}>
                {reactionTypes.map((reaction) => {
                  const count = photoReactions[reaction.type]?.length || 0;
                  const isActive = myReaction === reaction.type;
                  
                  return (
                    <button 
                      key={reaction.type}
                      className={`${styles.reactionBtn} ${isActive ? styles.active : ''}`}
                      onClick={() => handleReaction(reaction.type)}
                      disabled={!currentUserId}
                      title={`${reaction.label} this photo`}
                    >
                      {reaction.emoji} {reaction.label} {count > 0 && `(${count})`}
                    </button>
                  );
                })}
              </div>
              
              {/* Show who reacted */}
              {Object.keys(photoReactions).length > 0 && (
                <div className={styles.reactionsList}>
                  {Object.entries(photoReactions).map(([type, reactions]) => {
                    if (reactions.length === 0) return null;
                    const reactionInfo = reactionTypes.find(r => r.type === type);
                    if (!reactionInfo) return null;
                    
                    return (
                      <div key={type} className={styles.reactionGroup}>
                        <span className={styles.reactionEmoji}>{reactionInfo.emoji}</span>
                        <div className={styles.reactionNames}>
                          {reactions.slice(0, 3).map((reaction, idx) => (
                            <span key={reaction.id}>
                              {reaction.author?.full_name}
                              {idx < Math.min(reactions.length, 3) - 1 ? ', ' : ''}
                            </span>
                          ))}
                          {reactions.length > 3 && (
                            <span> and {reactions.length - 3} others</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={styles.photoComments}>
              <h4>Comments on this photo</h4>
              
              <div className={styles.commentsList}>
                {isLoadingComments ? (
                  <div className={styles.loadingComments}>Loading comments...</div>
                ) : photoComments.length > 0 ? (
                  photoComments.map(comment => (
                    <div key={comment.id} className={styles.photoComment}>
                      <img 
                        src={comment.author?.avatar_url || '/default-avatar.png'} 
                        alt="" 
                        className={styles.commentAvatar}
                      />
                      <div className={styles.commentContent}>
                        <div className={styles.commentAuthor}>{comment.author?.full_name}</div>
                        <div className={styles.commentText}>{comment.body}</div>
                        <div className={styles.commentTime}>
                          {new Date(comment.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.noComments}>No comments on this photo yet</div>
                )}
              </div>

              {currentUserId && (
                <div className={styles.commentInputSection}>
                  <input
                    type="text"
                    placeholder="Comment on this photo..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                    className={styles.photoCommentInput}
                    disabled={isCommenting}
                  />
                  <button 
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || isCommenting}
                    className={styles.photoCommentBtn}
                  >
                    {isCommenting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
