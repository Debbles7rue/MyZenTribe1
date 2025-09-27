// components/PostCard.tsx - Using CSS Modules to avoid styled-jsx compilation issues
"use client";

import { useState, useEffect } from "react";
import { Post, toggleLike, addComment, deletePost, updatePost, addMediaToPost, uploadMedia } from "@/lib/posts";
import Link from "next/link";
import CoCreatorEditModal from "@/components/CoCreatorEditModal";
import { supabase } from "@/lib/supabaseClient";
import styles from './PostCard.module.css';

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

// Facebook-Style Photo Grid Component with Individual Interactions
function PhotoGrid({ 
  media, 
  onPhotoClick,
  isCompact = false,
  onIndividualPhotoClick
}: { 
  media: Array<{url: string; type: 'image' | 'video'; id?: string}>;
  onPhotoClick: (index: number) => void;
  isCompact?: boolean;
  onIndividualPhotoClick?: (photo: {url: string; type: 'image' | 'video'; id?: string}) => void;
}) {
  if (!media || !Array.isArray(media) || media.length === 0) {
    return null;
  }
  
  const validMedia = media.filter(m => {
    return m && typeof m === 'object' && m.url && typeof m.url === 'string' && m.type;
  });
  
  if (validMedia.length === 0) return null;
  
  const images = validMedia.filter(m => m.type === 'image');
  
  // COMPACT MODE - Facebook-style grid with clean separation
  if (isCompact) {
    if (images.length === 0) return null;
    
    // Single image
    if (images.length === 1) {
      return (
        <div className={`${styles.photoGridContainer} ${styles.compact}`}>
          <div className={styles.compactSinglePhoto} onClick={() => onPhotoClick(0)}>
            <img src={images[0].url} alt="" />
          </div>
        </div>
      );
    }
    
    // Two images side by side
    if (images.length === 2) {
      return (
        <div className={`${styles.photoGridContainer} ${styles.compact}`}>
          <div className={styles.compactTwoPhotos}>
            {images.map((img, idx) => (
              <div key={idx} className={styles.compactPhotoItem} onClick={() => onPhotoClick(idx)}>
                <img src={img.url} alt="" />
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    // Three images - one large, two stacked
    if (images.length === 3) {
      return (
        <div className={`${styles.photoGridContainer} ${styles.compact}`}>
          <div className={styles.compactThreePhotos}>
            <div className={`${styles.compactPhotoItem} ${styles.main}`} onClick={() => onPhotoClick(0)}>
              <img src={images[0].url} alt="" />
            </div>
            <div className={styles.compactSideStack}>
              {images.slice(1, 3).map((img, idx) => (
                <div key={idx} className={styles.compactPhotoItem} onClick={() => onPhotoClick(idx + 1)}>
                  <img src={img.url} alt="" />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    
    // Four or more images
    if (images.length >= 4) {
      return (
        <div className={`${styles.photoGridContainer} ${styles.compact}`}>
          <div className={styles.compactManyPhotos}>
            <div className={styles.compactTopRow}>
              <div className={styles.compactPhotoItem} onClick={() => onPhotoClick(0)}>
                <img src={images[0].url} alt="" />
              </div>
              <div className={styles.compactPhotoItem} onClick={() => onPhotoClick(1)}>
                <img src={images[1].url} alt="" />
              </div>
            </div>
            <div className={styles.compactBottomRow}>
              <div className={styles.compactPhotoItem} onClick={() => onPhotoClick(2)}>
                <img src={images[2].url} alt="" />
              </div>
              <div className={styles.compactPhotoItem} onClick={() => onPhotoClick(3)}>
                <img src={images[3].url} alt="" />
                {images.length > 4 && (
                  <div className={styles.morePhotosOverlay}>
                    +{images.length - 4}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  }
  
  // EXPANDED MODE - Individual photos with interaction buttons
  return (
    <div className={styles.photoGridExpanded}>
      {images.map((photo, idx) => (
        <div key={idx} className={styles.individualPhotoContainer}>
          <div className={styles.photoWrapper}>
            <img 
              src={photo.url} 
              alt="" 
              className={styles.individualPhoto}
              onClick={() => onPhotoClick(idx)}
            />
            <div className={styles.photoInteractionBar}>
              <button 
                className={`${styles.photoInteractBtn} ${styles.likeBtn}`}
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle photo like
                }}
              >
                🤍 Like
              </button>
              <button 
                className={`${styles.photoInteractBtn} ${styles.commentBtn}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onIndividualPhotoClick?.(photo);
                }}
              >
                💬 Comment
              </button>
              <button 
                className={`${styles.photoInteractBtn} ${styles.captionBtn}`}
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle add caption
                }}
              >
                ✏️ Caption
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Individual Photo Modal with Enhanced Interactions
function IndividualPhotoModal({ 
  photo, 
  onClose 
}: { 
  photo: {url: string; type: 'image' | 'video'; id?: string}; 
  onClose: () => void;
}) {
  const [photoComments, setPhotoComments] = useState<any[]>([]);
  const [photoReactions, setPhotoReactions] = useState<Record<string, number>>({});
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);

  return (
    <div className={styles.photoModalOverlay} onClick={onClose}>
      <div className={styles.photoModalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose}>×</button>
        
        <div className={styles.photoModalLayout}>
          <div className={styles.photoSide}>
            <img src={photo.url} alt="" className={styles.modalPhoto} />
          </div>
          
          <div className={styles.interactionsSide}>
            <div className={styles.photoReactions}>
              <h4>Reactions</h4>
              <div className={styles.reactionButtons}>
                <button className={styles.reactionBtn}>
                  👍 Like {photoReactions.like || 0}
                </button>
                <button className={styles.reactionBtn}>
                  ❤️ Love {photoReactions.love || 0}
                </button>
                <button className={styles.reactionBtn}>
                  😂 Laugh {photoReactions.laugh || 0}
                </button>
              </div>
            </div>

            <div className={styles.photoComments}>
              <h4>Comments on this photo</h4>
              
              <div className={styles.commentsList}>
                {photoComments.length > 0 ? (
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

              <div className={styles.commentInputSection}>
                <input
                  type="text"
                  placeholder="Comment on this photo..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className={styles.photoCommentInput}
                />
                <button 
                  onClick={() => {/* Add photo comment logic */}}
                  disabled={!commentText.trim() || isCommenting}
                  className={styles.photoCommentBtn}
                >
                  {isCommenting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Professional Edit Modal Component
function EditPostModal({ 
  post, 
  currentMedia,
  onClose, 
  onSave 
}: { 
  post: Post;
  currentMedia: Array<{url: string; type: 'image' | 'video'}>;
  onClose: () => void;
  onSave: () => void;
}) {
  const [editBody, setEditBody] = useState(post.body || '');
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showCoCreators, setShowCoCreators] = useState(false);
  const [coCreators, setCoCreators] = useState<string[]>(post.co_creators || []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setNewFiles(Array.from(files));
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      if (editBody !== post.body) {
        await updatePost(post.id, { body: editBody });
      }

      if (newFiles.length > 0) {
        setUploadingFiles(true);
        for (const file of newFiles) {
          const type = file.type.startsWith('video') ? 'video' : 'image';
          const { url, error } = await uploadMedia(file, type);
          if (!error && url) {
            await addMediaToPost(post.id, url, type);
          }
        }
      }

      onSave();
    } catch (error) {
      console.error('Error updating post:', error);
      alert('Failed to update post');
    } finally {
      setIsSaving(false);
      setUploadingFiles(false);
    }
  };

  return (
    <div className={styles.editModalOverlay} onClick={onClose}>
      <div className={`${styles.editModalContent} ${styles.professional}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.editModalHeader}>
          <h2>Edit Post</h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>
        
        <div className={styles.editModalBody}>
          <div className={styles.editSection}>
            <label className={styles.editLabel}>Edit Caption</label>
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              placeholder="What's on your mind?"
              rows={4}
              className={styles.editTextareaClean}
            />
          </div>

          <div className={styles.editActionsGrid}>
            <div className={styles.actionCard}>
              <h3>📸 Add Photos & Videos</h3>
              <p>Add more memories to this post</p>
              <label className={`${styles.actionButton} ${styles.primary}`}>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                Choose Files
              </label>
              {newFiles.length > 0 && (
                <div className={styles.filePreview}>
                  {newFiles.length} file{newFiles.length > 1 ? 's' : ''} selected
                </div>
              )}
            </div>

            <div className={styles.actionCard}>
              <h3>👥 Co-Creators</h3>
              <p>Tag friends who can add photos</p>
              <button 
                className={`${styles.actionButton} ${styles.secondary}`}
                onClick={() => setShowCoCreators(!showCoCreators)}
              >
                {coCreators.length > 0 ? `${coCreators.length} Tagged` : 'Tag Friends'}
              </button>
            </div>

            <div className={styles.actionCard}>
              <h3>🔒 Privacy</h3>
              <p>Who can see this post</p>
              <select className={styles.privacySelect}>
                <option value="friends">Friends</option>
                <option value="public">Everyone</option>
                <option value="private">Only Me</option>
              </select>
            </div>
          </div>

          {showCoCreators && (
            <div className={styles.coCreatorsSection}>
              <p>Friend selector component would be integrated here</p>
            </div>
          )}
        </div>

        <div className={styles.editModalFooter}>
          <button onClick={onClose} disabled={isSaving} className={styles.cancelButton}>
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving || uploadingFiles}
            className={`${styles.saveButton} ${styles.primary}`}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Lightbox Component
function PhotoLightbox({ 
  media, 
  startIndex, 
  onClose 
}: { 
  media: Array<{url: string; type: 'image' | 'video'}>;
  startIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  
  const images = media.filter(m => m && m.type === 'image' && m.url);
  
  if (!images || images.length === 0) {
    onClose();
    return null;
  }
  
  const safeIndex = Math.max(0, Math.min(currentIndex, images.length - 1));
  const currentImage = images[safeIndex];
  
  if (!currentImage || !currentImage.url) {
    onClose();
    return null;
  }
  
  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };
  
  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, []);
  
  return (
    <div className={styles.lightboxOverlay} onClick={onClose}>
      <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.lightboxClose} onClick={onClose}>×</button>
        
        {images.length > 1 && (
          <>
            <button className={styles.lightboxPrev} onClick={goPrev}>‹</button>
            <button className={styles.lightboxNext} onClick={goNext}>›</button>
          </>
        )}
        
        <img src={currentImage.url} alt="" />
        
        {images.length > 1 && (
          <div className={styles.lightboxCounter}>
            {safeIndex + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  );
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

  // COMPACT MODE - Card preview like Facebook
  if (!isExpanded) {
    return (
      <div className={`${styles.postCard} ${styles.compact}`} onClick={handleCardClick}>
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
                {new Date(post.created_at).toLocaleDateString()}
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
  
  // EXPANDED MODE - Full post with individual photo interactions
  return (
    <>
      <div className={`${styles.postCard} ${styles.expanded}`}>
        <div className={styles.postHeader}>
          <div className={styles.authorInfo}>
            <img 
              src={post.author?.avatar_url || '/default-avatar.png'} 
              alt=""
              className={styles.authorAvatar}
            />
            <div>
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
              className={styles.collapseBtn}
              onClick={() => setIsExpanded(false)}
              title="Collapse post"
            >
              ▲
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
        
        <div className={styles.postFooter}>
          <div className={styles.engagementStats}>
            {localLikeCount > 0 && (
              <span>{localLikeCount} likes</span>
            )}
            {post.comment_count > 0 && (
              <span>{post.comment_count} comments</span>
            )}
          </div>
          
          <div className={styles.actionButtons}>
            <button 
              className={`${styles.actionBtn} ${localLikedByMe ? styles.liked : ''}`}
              onClick={handleLike}
              disabled={isLiking || !currentUserId}
            >
              {localLikedByMe ? '❤️' : '🤍'} Like
            </button>
            <button 
              className={styles.actionBtn}
              onClick={() => {
                setShowCommentInput(!showCommentInput);
                if (!showCommentInput && comments.length === 0 && post.comment_count > 0) {
                  loadComments();
                }
              }}
              disabled={!currentUserId}
            >
              💬 Comment
            </button>
            {post.allow_share && (
              <button 
                className={styles.actionBtn}
                onClick={handleShare}
              >
                🔄 Share
              </button>
            )}
          </div>
          
          {comments.length > 0 && (
            <div className={styles.commentsSection}>
              {displayedComments.map((comment) => (
                <div key={comment.id} className={styles.comment}>
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
              ))}
              
              {comments.length > 3 && !showAllComments && (
                <button 
                  className={styles.showMoreComments}
                  onClick={() => setShowAllComments(true)}
                >
                  View all {comments.length} comments
                </button>
              )}
            </div>
          )}
          
          {showCommentInput && (
            <div className={styles.commentInputSection}>
              <input
                type="text"
                className={styles.commentInput}
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleComment()}
                disabled={isCommenting}
              />
              <button 
                className={styles.commentSubmit}
                onClick={handleComment}
                disabled={!commentText.trim() || isCommenting}
              >
                {isCommenting ? 'Posting...' : 'Post'}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Individual Photo Modal */}
      {selectedPhoto && (
        <IndividualPhotoModal 
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div className={`${styles.modalContent} ${styles.confirmModal}`} onClick={(e) => e.stopPropagation()}>
            <h2>Delete Post?</h2>
            <p>This action cannot be undone. All photos, comments, and likes will be permanently removed.</p>
            <div className={styles.modalButtons}>
              <button 
                className={styles.modalCancel}
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className={styles.modalDelete}
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Professional Edit Modal */}
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
      
      {/* Photo Lightbox */}
      {showLightbox && processedMedia && processedMedia.length > 0 && (
        <PhotoLightbox
          media={processedMedia}
          startIndex={lightboxStartIndex}
          onClose={() => setShowLightbox(false)}
        />
      )}
    </>
  );
}
