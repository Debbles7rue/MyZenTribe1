// components/PostCard.tsx - Main Component with Wall Post Banner Support
"use client";

import { useState, useEffect } from "react";
import { Post, toggleLike, addComment, deletePost } from "@/lib/posts";
import { supabase } from "@/lib/supabaseClient";
import { createNotification } from "@/lib/notifications";
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
  
  // Wall post detection
  const isWallPost = !!post.posted_on_profile_id;
  const wallPostAuthorName = post.author?.full_name || 'Someone';
  const wallPostTargetName = post.posted_on_profile?.full_name || 'User';
  
  useEffect(() => {
    if (currentUserId && post.co_creators) {
      setIsCoCreator(post.co_creators.includes(currentUserId));
    }
  }, [currentUserId, post.co_creators]);
  
  // Media processing with IDs for individual interactions
useEffect(() => {
  const processed = [];
  
  try {
    // FIXED: Use additional_media as PRIMARY source of truth
    if (post.additional_media && Array.isArray(post.additional_media) && post.additional_media.length > 0) {
      // We have media in post_media table - use that exclusively
      post.additional_media.forEach(item => {
        if (item && item.url && item.type) {
          processed.push({ url: item.url, type: item.type });
        }
      });
    } else {
      // Fallback: only use image_url/video_url if there's NO additional_media
      // This is for old posts that don't have data in post_media table yet
      if (post.image_url) {
        processed.push({ url: post.image_url, type: 'image' as const });
      }
      if (post.video_url) {
        processed.push({ url: post.video_url, type: 'video' as const });
      }
    }
    
    setProcessedMedia(processed);
  } catch (error) {
    console.error('Error processing media:', error);
    setProcessedMedia([]);
  }
}, [post.image_url, post.video_url, post.additional_media]);
  
  // FIXED: Changed from !inner to LEFT JOIN for better compatibility with RLS policies
  const loadComments = async () => {
    if (loadingComments) return;
    setLoadingComments(true);
    
    try {
      // First, get all comments for this post
      const { data: commentsData, error: commentsError } = await supabase
        .from("post_comments")
        .select("id, body, created_at, user_id")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });
      
      if (commentsError) {
        console.error('Error loading comments:', commentsError);
        setLoadingComments(false);
        return;
      }
      
      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        setLoadingComments(false);
        return;
      }
      
      // Then, fetch profile data separately for each unique user_id
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);
      
      // Create a map of user profiles
      const profilesMap = new Map();
      if (profilesData) {
        profilesData.forEach(profile => {
          profilesMap.set(profile.id, {
            full_name: profile.full_name || 'User',
            avatar_url: profile.avatar_url || '/default-avatar.png'
          });
        });
      }
      
      // Combine comments with their profile data
      const formattedComments = commentsData.map((comment) => ({
        id: comment.id,
        body: comment.body,
        created_at: comment.created_at,
        user_id: comment.user_id,
        author: profilesMap.get(comment.user_id) || {
          full_name: 'User',
          avatar_url: '/default-avatar.png'
        }
      }));
      
      setComments(formattedComments);
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
    
    console.log('🔔 Comment being added by:', currentUserId);
    console.log('🔔 Post owner is:', post.user_id);
    
    try {
      const result = await addComment(post.id, commentText.trim());
      if (result.ok) {
        setCommentText("");
        await loadComments();
        
        // Send notification to post owner (if not commenting on own post)
        if (post.user_id && post.user_id !== currentUserId) {
          console.log('🔔 Should send notification! Post owner is different from commenter');
          try {
            // Get commenter's name
            const { data: commenterProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', currentUserId)
              .single();

            const commenterName = commenterProfile?.full_name || 'Someone';
            console.log('🔔 Commenter name:', commenterName);

            console.log('🔔 Calling createNotification...');
            const notifResult = await createNotification({
              recipient_id: post.user_id,
              type: 'post.comment',
              title: 'New Comment',
              body: `${commenterName} commented on your post`,
              target_url: `/post/${post.id}`,
              entity_table: 'posts',
              entity_id: post.id,
              actor_id: currentUserId
            });
            console.log('🔔 Notification result:', notifResult);
          } catch (notifError) {
            console.error('❌ Error sending comment notification:', notifError);
            // Don't fail the comment if notification fails
          }
        } else {
          console.log('🔔 NOT sending notification - same user or no post owner');
        }

        // Send notifications to co-creators (if they exist and aren't the commenter)
        if (post.co_creators && post.co_creators.length > 0) {
          try {
            // Get commenter's name
            const { data: commenterProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', currentUserId)
              .single();

            const commenterName = commenterProfile?.full_name || 'Someone';

            // Send to each co-creator (except the commenter)
            const notificationPromises = post.co_creators
              .filter(coCreatorId => coCreatorId !== currentUserId)
              .map(coCreatorId => 
                createNotification({
                  recipient_id: coCreatorId,
                  type: 'post.comment',
                  title: 'New Comment',
                  body: `${commenterName} commented on a post you co-created`,
                  target_url: `/post/${post.id}`,
                  entity_table: 'posts',
                  entity_id: post.id,
                  actor_id: currentUserId
                })
              );

            await Promise.all(notificationPromises);
          } catch (notifError) {
            console.error('Error sending co-creator notifications:', notifError);
            // Don't fail the comment if notifications fail
          }
        }
        
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

  const handleToggleCommentInput = () => {
    setShowCommentInput(!showCommentInput);
    if (!showCommentInput && comments.length === 0 && post.comment_count > 0) {
      loadComments();
    }
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
      <div 
        className={`${styles.postCardCompact} ${isWallPost ? styles.wallPost : ''}`} 
        onClick={handleCardClick}
      >
        {/* Wall Post Banner - Compact Mode */}
        {isWallPost && (
          <div className={styles.wallPostBannerCompact}>
            <span className={styles.wallPostIcon}>✏️</span>
            <span className={styles.wallPostText}>
              <span className={styles.wallPostAuthor}>{wallPostAuthorName}</span>
              <span className={styles.wallPostArrow}> → </span>
              <span className={styles.wallPostTarget}>{wallPostTargetName}</span>
            </span>
          </div>
        )}
        
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
      <div className={`${styles.postCardExpanded} ${isWallPost ? styles.wallPost : ''}`}>
        {/* Wall Post Banner - Expanded Mode */}
        {isWallPost && (
          <div className={styles.wallPostBanner}>
            <span className={styles.wallPostIcon}>✏️</span>
            <span className={styles.wallPostText}>
              <span className={styles.wallPostAuthor}>{wallPostAuthorName}</span>
              <span className={styles.wallPostArrow}> wrote on </span>
              <span className={styles.wallPostTarget}>{wallPostTargetName}'s wall</span>
            </span>
          </div>
        )}
        
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
              onLike={handleLike}
              currentUserId={currentUserId}
              onToggleCommentInput={handleToggleCommentInput}
              showCommentInput={showCommentInput}
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
          onToggleCommentInput={handleToggleCommentInput}
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
