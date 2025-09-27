// components/PostCard.tsx - Main Component with Modular Imports
"use client";

import { useState, useEffect } from "react";
import { Post, toggleLike, addComment, deletePost } from "@/lib/posts";
import { supabase } from "@/lib/supabaseClient";
import PhotoGrid from "./PostCard/PhotoGrid";
import PostLightbox from "./PostCard/PostLightbox";
import IndividualPhotoModal from "./PostCard/IndividualPhotoModal";
import EditPostModal from "./PostCard/EditPostModal";
import DeleteConfirmModal from "./PostCard/DeleteConfirmModal";
import PostInteractions from "./PostCard/PostInteractions";
import styles from "./PostCard/styles.module.css";

interface PostCardProps {
  post: Post;
  onChanged?: () => void;
  currentUserId?: string;
}

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

export default function PostCard({ post, onChanged, currentUserId }: PostCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxStartIndex, setLightboxStartIndex] = useState(0);
  const [showEditMenu, setShowEditMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{url: string; type: 'image' | 'video'; id?: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCoCreator, setIsCoCreator] = useState(false);
  const [processedMedia, setProcessedMedia] = useState<Array<{url: string; type: 'image' | 'video'; id?: string}>>([]);
  
  // Like, Comment, Share states
  const [isLiking, setIsLiking] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(post.like_count || 0);
  const [localLikedByMe, setLocalLikedByMe] = useState(post.liked_by_me || false);
  
  // Comment loading and display
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  
  useEffect(() => {
    if (currentUserId && post.co_creators) {
      setIsCoCreator(post.co_creators.includes(currentUserId));
    }
  }, [currentUserId, post.co_creators]);
  
  // Media processing with IDs for individual interactions
  useEffect(() => {
    const processed = [];
    
    try {
      if (post.image_url) {
        processed.push({ 
          url: post.image_url, 
          type: 'image' as const,
          id: `${post.id}_main_image`
        });
      }
      if (post.video_url) {
        processed.push({ 
          url: post.video_url, 
          type: 'video' as const,
          id: `${post.id}_main_video`
        });
      }
      
      if (post.additional_media && Array.isArray(post.additional_media)) {
        post.additional_media.forEach((item, index) => {
          if (item && item.url && item.type) {
            const isDuplicate = (item.type === 'image' && item.url === post.image_url) ||
                              (item.type === 'video' && item.url === post.video_url);
            if (!isDuplicate) {
              processed.push({ 
                url: item.url, 
                type: item.type,
                id: `${post.id}_media_${index}`
              });
            }
          }
        });
      }
      
      setProcessedMedia(processed);
    } catch (error) {
      console.error('Error processing media:', error);
      setProcessedMedia([]);
    }
  }, [post.image_url, post.video_url, post.additional_media]);
  
  const loadComments = async () => {
    if (loadingComments) return;
    setLoadingComments(true);
    
    try {
      const { data, error } = await supabase
        .from("post_comments")
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
        .eq("post_id", post.id)
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
        setComments(formattedComments);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };
  
  useEffect(() => {
    if (isExpanded && post.comment_count > 0 && comments.length === 0 && !loadingComments) {
      loadComments();
    }
  }, [isExpanded, post.comment_count]);
  
  const handleLike = async () => {
    if (isLiking || !currentUserId) return;
    setIsLiking(true);
    
    try {
      const result = await toggleLike(post.id);
      if (result.ok) {
        setLocalLikedByMe(!localLikedByMe);
        setLocalLikeCount(localLikedByMe ? localLikeCount - 1 : localLikeCount + 1);
      }
    } catch (error) {
      console.error("Error liking post:", error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || isCommenting || !currentUserId) return;
    setIsCommenting(true);
    
    try {
      const result = await addComment(post.id, commentText.trim());
      if (result.ok) {
        setCommentText("");
        await loadComments();
        if (onChanged) {
          setTimeout(() => onChanged(), 100);
        }
      } else {
        alert("Failed to add comment: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("Failed to add comment");
    } finally {
      setIsCommenting(false);
    }
  };

  const handleShare = () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(postUrl);
    alert("Post link copied to clipboard!");
  };

  const handleDelete = async () => {
    if (!confirm("Delete this post? This cannot be undone.")) {
      setShowDeleteConfirm(false);
      return;
    }
    
    setIsDeleting(true);
    try {
      const result = await deletePost(post.id);
      if (result.ok) {
        setShowDeleteConfirm(false);
        setTimeout(() => {
          if (onChanged) onChanged();
        }, 100);
      } else {
        alert(result.error || "Failed to delete post");
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handlePhotoClick = (index: number) => {
    if (isExpanded && processedMedia && processedMedia.length > 0) {
      setLightboxStartIndex(index);
      setShowLightbox(true);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a, .menu-btn, .action-btn, .photo-interact-btn')) {
      return;
    }
    setIsExpanded(!isExpanded);
  };

  const handleIndividualPhotoClick = (photo: {url: string; type: 'image' | 'video'; id?: string}) => {
    setSelectedPhoto(photo);
  };
  
  const canEdit = currentUserId === post.user_id || isCoCreator;
  const canDelete = currentUserId === post.user_id;
  
  const getDisplayName = () => {
    let name = post.author?.full_name || 'User';
    if (post.co_creators && post.co_creators.length > 0) {
      const coCreatorNames = post.co_creators_info?.map(c => c.full_name).filter(Boolean) || [];
      if (coCreatorNames.length > 0) {
        name += ` with ${coCreatorNames.join(', ')}`;
      }
    }
    return name;
  };
  
  const displayedComments = showAllComments ? comments : comments.slice(0, 3);

  // COMPACT MODE - Card preview
  if (!isExpanded) {
    return (
      <div className={styles.postCardCompact} onClick={handleCardClick}>
        <div className={styles.compactHeader}>
          <div className={styles.compactAuthor}>
            <img 
              src={post.author?.avatar_url || '/default-avatar.png'} 
              alt=""
              className={styles.compactAvatar}
            />
            <div className={styles.compactAuthorInfo}>
              <div className={styles.compactName}>{getDisplayName()}</div>
              <div className={styles.compactMeta}>
                <span className={styles.compactTime}>
                  {new Date(post.created_at).toLocaleDateString()}
                </span>
                {post.privacy && (
                  <span className={styles.privacyIcon}>
                    {post.privacy === 'public' ? '🌍' : '🔒'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {post.body && (
          <div className={styles.compactText}>
            {post.body.length > 150 ? `${post.body.substring(0, 150)}...` : post.body}
          </div>
        )}
        
        {processedMedia.length > 0 && (
          <PhotoGrid 
            media={processedMedia} 
            onPhotoClick={() => {}}
            isCompact={true}
          />
        )}
        
        <div className={styles.compactFooter}>
          <div className={styles.compactStats}>
            {localLikeCount > 0 && <span className={styles.statItem}>❤️ {localLikeCount}</span>}
            {post.comment_count > 0 && <span className={styles.statItem}>💬 {post.comment_count}</span>}
            {processedMedia.length > 0 && <span className={styles.statItem}>📷 {processedMedia.length}</span>}
          </div>
        </div>
      </div>
    );
  }
  
  // EXPANDED MODE - Full post with interactions
  return (
    <>
      <div className={styles.postCardExpanded}>
        <div className={styles.postHeader}>
          <div className={styles.authorInfo}>
            <img 
              src={post.author?.avatar_url || '/default-avatar.png'} 
              alt=""
              className={styles.authorAvatar}
            />
            <div className={styles.authorDetails}>
              <div className={styles.authorName}>{getDisplayName()}</div>
              <div className={styles.postMeta}>
                <span className={styles.postTime}>
                  {new Date(post.created_at).toLocaleDateString()}
                </span>
                {post.privacy && (
                  <span className={styles.postPrivacy}>
                    {post.privacy === 'public' ? '🌍' : '🔒'}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className={styles.headerActions}>
            <button 
              className={styles.closeBtn}
              onClick={() => setIsExpanded(false)}
              title="Close post"
            >
              ×
            </button>
            
            {canEdit && (
              <div className={styles.postActions}>
                <button 
                  className={styles.menuBtn}
                  onClick={() => setShowEditMenu(!showEditMenu)}
                  title="Post options"
                >
                  ⋯
                </button>
                {showEditMenu && (
                  <div className={styles.menuDropdown}>
                    {isCoCreator && !canDelete && (
                      <>
                        <button className={styles.menuItem} onClick={() => {
                          setShowEditModal(true);
                          setShowEditMenu(false);
                        }}>📷 Add Photos</button>
                        <button className={styles.menuItem}>🏷️ Remove Tag</button>
                      </>
                    )}
                    {canDelete && (
                      <>
                        <button className={styles.menuItem} onClick={() => {
                          setShowEditModal(true);
                          setShowEditMenu(false);
                        }}>✏️ Edit Post</button>
                        <button className={`${styles.menuItem} ${styles.danger}`} onClick={() => {
                          setShowDeleteConfirm(true);
                          setShowEditMenu(false);
                        }}>🗑️ Delete Post</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className={styles.postContent}>
          {post.body && <p className={styles.postText}>{post.body}</p>}
          
          {processedMedia && processedMedia.length > 0 && (
            <PhotoGrid 
              media={processedMedia} 
              onPhotoClick={handlePhotoClick}
              isCompact={false}
              onIndividualPhotoClick={handleIndividualPhotoClick}
            />
          )}
        </div>
        
        <PostInteractions
          post={post}
          localLikeCount={localLikeCount}
          localLikedByMe={localLikedByMe}
          isLiking={isLiking}
          currentUserId={currentUserId}
          comments={displayedComments}
          showAllComments={showAllComments}
          showCommentInput={showCommentInput}
          commentText={commentText}
          isCommenting={isCommenting}
          onLike={handleLike}
          onComment={handleComment}
          onShare={handleShare}
          onToggleCommentInput={() => {
            setShowCommentInput(!showCommentInput);
            if (!showCommentInput && comments.length === 0 && post.comment_count > 0) {
              loadComments();
            }
          }}
          onCommentTextChange={setCommentText}
          onShowAllComments={() => setShowAllComments(true)}
          allCommentsCount={comments.length}
        />
      </div>
      
      {/* Modals */}
      {selectedPhoto && (
        <IndividualPhotoModal 
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
      
      {showDeleteConfirm && (
        <DeleteConfirmModal
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {showEditModal && (
        <EditPostModal
          post={post}
          currentMedia={processedMedia}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            setShowEditModal(false);
            if (onChanged) onChanged();
          }}
        />
      )}
      
      {showLightbox && processedMedia && processedMedia.length > 0 && (
        <PostLightbox
          media={processedMedia}
          startIndex={lightboxStartIndex}
          onClose={() => setShowLightbox(false)}
        />
      )}
    </>
  );
}
