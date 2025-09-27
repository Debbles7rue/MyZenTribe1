// components/PostCard.tsx - Single File Solution (No CSS Modules)
"use client";

import { useState, useEffect } from "react";
import { Post, toggleLike, addComment, deletePost, updatePost, addMediaToPost, uploadMedia } from "@/lib/posts";
import Link from "next/link";
import CoCreatorEditModal from "@/components/CoCreatorEditModal";
import { supabase } from "@/lib/supabaseClient";

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
        <div className="photo-grid-container compact">
          <div className="compact-single-photo" onClick={() => onPhotoClick(0)}>
            <img src={images[0].url} alt="" />
          </div>
        </div>
      );
    }
    
    // Two images side by side
    if (images.length === 2) {
      return (
        <div className="photo-grid-container compact">
          <div className="compact-two-photos">
            {images.map((img, idx) => (
              <div key={idx} className="compact-photo-item" onClick={() => onPhotoClick(idx)}>
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
        <div className="photo-grid-container compact">
          <div className="compact-three-photos">
            <div className="compact-photo-item main" onClick={() => onPhotoClick(0)}>
              <img src={images[0].url} alt="" />
            </div>
            <div className="compact-side-stack">
              {images.slice(1, 3).map((img, idx) => (
                <div key={idx} className="compact-photo-item" onClick={() => onPhotoClick(idx + 1)}>
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
        <div className="photo-grid-container compact">
          <div className="compact-many-photos">
            <div className="compact-top-row">
              <div className="compact-photo-item" onClick={() => onPhotoClick(0)}>
                <img src={images[0].url} alt="" />
              </div>
              <div className="compact-photo-item" onClick={() => onPhotoClick(1)}>
                <img src={images[1].url} alt="" />
              </div>
            </div>
            <div className="compact-bottom-row">
              <div className="compact-photo-item" onClick={() => onPhotoClick(2)}>
                <img src={images[2].url} alt="" />
              </div>
              <div className="compact-photo-item" onClick={() => onPhotoClick(3)}>
                <img src={images[3].url} alt="" />
                {images.length > 4 && (
                  <div className="more-photos-overlay">
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
    <div className="photo-grid-expanded">
      {images.map((photo, idx) => (
        <div key={idx} className="individual-photo-container">
          <div className="photo-wrapper">
            <img 
              src={photo.url} 
              alt="" 
              className="individual-photo"
              onClick={() => onPhotoClick(idx)}
            />
            <div className="photo-interaction-bar">
              <button 
                className="photo-interact-btn like-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle photo like
                }}
              >
                🤍 Like
              </button>
              <button 
                className="photo-interact-btn comment-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onIndividualPhotoClick?.(photo);
                }}
              >
                💬 Comment
              </button>
              <button 
                className="photo-interact-btn caption-btn"
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
    <div className="photo-modal-overlay" onClick={onClose}>
      <div className="photo-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="photo-modal-layout">
          <div className="photo-side">
            <img src={photo.url} alt="" className="modal-photo" />
          </div>
          
          <div className="interactions-side">
            <div className="photo-reactions">
              <h4>Reactions</h4>
              <div className="reaction-buttons">
                <button className="reaction-btn">
                  👍 Like {photoReactions.like || 0}
                </button>
                <button className="reaction-btn">
                  ❤️ Love {photoReactions.love || 0}
                </button>
                <button className="reaction-btn">
                  😂 Laugh {photoReactions.laugh || 0}
                </button>
              </div>
            </div>

            <div className="photo-comments">
              <h4>Comments on this photo</h4>
              
              <div className="comments-list">
                {photoComments.length > 0 ? (
                  photoComments.map(comment => (
                    <div key={comment.id} className="photo-comment">
                      <img 
                        src={comment.author?.avatar_url || '/default-avatar.png'} 
                        alt="" 
                        className="comment-avatar"
                      />
                      <div className="comment-content">
                        <div className="comment-author">{comment.author?.full_name}</div>
                        <div className="comment-text">{comment.body}</div>
                        <div className="comment-time">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-comments">No comments on this photo yet</div>
                )}
              </div>

              <div className="comment-input-section">
                <input
                  type="text"
                  placeholder="Comment on this photo..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="photo-comment-input"
                />
                <button 
                  onClick={() => {/* Add photo comment logic */}}
                  disabled={!commentText.trim() || isCommenting}
                  className="photo-comment-btn"
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
    <div className="edit-modal-overlay" onClick={onClose}>
      <div className="edit-modal-content professional" onClick={(e) => e.stopPropagation()}>
        <div className="edit-modal-header">
          <h2>Edit Post</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        
        <div className="edit-modal-body">
          <div className="edit-section">
            <label className="edit-label">Edit Caption</label>
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              placeholder="What's on your mind?"
              rows={4}
              className="edit-textarea-clean"
            />
          </div>

          <div className="edit-actions-grid">
            <div className="action-card">
              <h3>📸 Add Photos & Videos</h3>
              <p>Add more memories to this post</p>
              <label className="action-button primary">
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
                <div className="file-preview">
                  {newFiles.length} file{newFiles.length > 1 ? 's' : ''} selected
                </div>
              )}
            </div>

            <div className="action-card">
              <h3>👥 Co-Creators</h3>
              <p>Tag friends who can add photos</p>
              <button 
                className="action-button secondary"
                onClick={() => setShowCoCreators(!showCoCreators)}
              >
                {coCreators.length > 0 ? `${coCreators.length} Tagged` : 'Tag Friends'}
              </button>
            </div>

            <div className="action-card">
              <h3>🔒 Privacy</h3>
              <p>Who can see this post</p>
              <select className="privacy-select">
                <option value="friends">Friends</option>
                <option value="public">Everyone</option>
                <option value="private">Only Me</option>
              </select>
            </div>
          </div>

          {showCoCreators && (
            <div className="co-creators-section">
              <p>Friend selector component would be integrated here</p>
            </div>
          )}
        </div>

        <div className="edit-modal-footer">
          <button onClick={onClose} disabled={isSaving} className="cancel-button">
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving || uploadingFiles}
            className="save-button primary"
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
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose}>×</button>
        
        {images.length > 1 && (
          <>
            <button className="lightbox-prev" onClick={goPrev}>‹</button>
            <button className="lightbox-next" onClick={goNext}>›</button>
          </>
        )}
        
        <img src={currentImage.url} alt="" />
        
        {images.length > 1 && (
          <div className="lightbox-counter">
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
      <>
        <div className="post-card compact" onClick={handleCardClick}>
          <div className="compact-header">
            <div className="compact-author">
              <img 
                src={post.author?.avatar_url || '/default-avatar.png'} 
                alt=""
                className="compact-avatar"
              />
              <div className="compact-author-info">
                <div className="compact-name">{getDisplayName()}</div>
                <div className="compact-meta">
                  {new Date(post.created_at).toLocaleDateString()}
                  {post.privacy && (
                    <span className="privacy-icon">
                      {post.privacy === 'public' ? '🌍' : '🔒'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {post.body && (
            <div className="compact-text">
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
          
          <div className="compact-footer">
            <div className="compact-stats">
              {localLikeCount > 0 && <span className="stat-item">❤️ {localLikeCount}</span>}
              {post.comment_count > 0 && <span className="stat-item">💬 {post.comment_count}</span>}
              {processedMedia.length > 0 && <span className="stat-item">📷 {processedMedia.length}</span>}
            </div>
          </div>
        </div>
        
        <style>
          {`
            .post-card.compact {
              background: white;
              border: 1px solid #e2e8f0;
              border-radius: 1rem;
              margin-bottom: 1.5rem;
              cursor: pointer;
              transition: all 0.3s ease;
              overflow: hidden;
              box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            }
            
            .post-card.compact:hover {
              border-color: #cbd5e0;
              box-shadow: 0 8px 24px rgba(0,0,0,0.12);
              transform: translateY(-2px);
            }
            
            .compact-header {
              padding: 1rem 1rem 0.5rem;
            }
            
            .compact-author {
              display: flex;
              gap: 0.5rem;
              align-items: center;
            }
            
            .compact-avatar {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              object-fit: cover;
            }
            
            .compact-author-info {
              flex: 1;
            }
            
            .compact-name {
              font-weight: 600;
              font-size: 1rem;
              color: #1a202c;
              line-height: 1.3;
            }
            
            .compact-meta {
              display: flex;
              align-items: center;
              gap: 0.5rem;
              font-size: 0.875rem;
              color: #718096;
              margin-top: 0.25rem;
            }
            
            .privacy-icon {
              font-size: 0.875rem;
            }
            
            .compact-text {
              padding: 0.5rem 1rem;
              font-size: 0.875rem;
              line-height: 1.4;
              color: #374151;
            }
            
            .compact-footer {
              padding: 0.5rem 1rem 1rem;
            }
            
            .compact-stats {
              display: flex;
              gap: 1.5rem;
              font-size: 0.875rem;
              color: #718096;
            }
            
            .stat-item {
              display: flex;
              align-items: center;
              gap: 0.25rem;
            }
            
            .photo-grid-container.compact {
              margin: 0.5rem 1rem 1rem;
              border-radius: 0.75rem;
              overflow: hidden;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              background: white;
            }
            
            .compact-single-photo {
              width: 100%;
              height: 250px;
              cursor: pointer;
              overflow: hidden;
            }
            
            .compact-single-photo img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              transition: transform 0.2s ease;
            }
            
            .compact-single-photo:hover img {
              transform: scale(1.02);
            }
            
            .compact-two-photos {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 3px;
              height: 200px;
            }
            
            .compact-three-photos {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 3px;
              height: 200px;
            }
            
            .compact-side-stack {
              display: flex;
              flex-direction: column;
              gap: 3px;
            }
            
            .compact-many-photos {
              height: 200px;
            }
            
            .compact-top-row {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 3px;
              height: calc(50% - 1.5px);
              margin-bottom: 3px;
            }
            
            .compact-bottom-row {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 3px;
              height: calc(50% - 1.5px);
            }
            
            .compact-photo-item {
              position: relative;
              cursor: pointer;
              overflow: hidden;
              background: #f7fafc;
            }
            
            .compact-photo-item img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              transition: transform 0.2s ease;
            }
            
            .compact-photo-item:hover img {
              transform: scale(1.05);
            }
            
            .compact-photo-item.main {
              grid-row: 1 / 3;
            }
            
            .more-photos-overlay {
              position: absolute;
              inset: 0;
              background: rgba(0,0,0,0.6);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 1.5rem;
              font-weight: 600;
            }
            
            @media (max-width: 768px) {
              .compact-single-photo {
                height: 180px;
              }
              
              .compact-two-photos,
              .compact-many-photos {
                height: 160px;
              }
            }
          `}
        </style>
      </>
    );
  }
  
  // EXPANDED MODE - Full post with individual photo interactions
  return (
    <>
      <div className="post-card expanded">
        <div className="post-header">
          <div className="author-info">
            <img 
              src={post.author?.avatar_url || '/default-avatar.png'} 
              alt=""
              className="author-avatar"
            />
            <div>
              <div className="author-name">{getDisplayName()}</div>
              <div className="post-meta">
                <span className="post-time">
                  {new Date(post.created_at).toLocaleDateString()}
                </span>
                {post.privacy && (
                  <span className="post-privacy">
                    {post.privacy === 'public' ? '🌍' : '🔒'}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="header-actions">
            <button 
              className="collapse-btn"
              onClick={() => setIsExpanded(false)}
              title="Collapse post"
            >
              ▲
            </button>
            
            {canEdit && (
              <div className="post-actions">
                <button 
                  className="menu-btn"
                  onClick={() => setShowEditMenu(!showEditMenu)}
                  title="Post options"
                >
                  ⋯
                </button>
                {showEditMenu && (
                  <div className="menu-dropdown">
                    {isCoCreator && !canDelete && (
                      <>
                        <button className="menu-item" onClick={() => {
                          setShowEditModal(true);
                          setShowEditMenu(false);
                        }}>📷 Add Photos</button>
                        <button className="menu-item">🏷️ Remove Tag</button>
                      </>
                    )}
                    {canDelete && (
                      <>
                        <button className="menu-item" onClick={() => {
                          setShowEditModal(true);
                          setShowEditMenu(false);
                        }}>✏️ Edit Post</button>
                        <button className="menu-item danger" onClick={() => {
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
        
        <div className="post-content">
          {post.body && <p className="post-text">{post.body}</p>}
          
          {processedMedia && processedMedia.length > 0 && (
            <PhotoGrid 
              media={processedMedia} 
              onPhotoClick={handlePhotoClick}
              isCompact={false}
              onIndividualPhotoClick={handleIndividualPhotoClick}
            />
          )}
        </div>
        
        <div className="post-footer">
          <div className="engagement-stats">
            {localLikeCount > 0 && (
              <span>{localLikeCount} likes</span>
            )}
            {post.comment_count > 0 && (
              <span>{post.comment_count} comments</span>
            )}
          </div>
          
          <div className="action-buttons">
            <button 
              className={`action-btn ${localLikedByMe ? 'liked' : ''}`}
              onClick={handleLike}
              disabled={isLiking || !currentUserId}
            >
              {localLikedByMe ? '❤️' : '🤍'} Like
            </button>
            <button 
              className="action-btn"
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
                className="action-btn"
                onClick={handleShare}
              >
                🔄 Share
              </button>
            )}
          </div>
          
          {comments.length > 0 && (
            <div className="comments-section">
              {displayedComments.map((comment) => (
                <div key={comment.id} className="comment">
                  <img 
                    src={comment.author?.avatar_url || '/default-avatar.png'} 
                    alt=""
                    className="comment-avatar"
                  />
                  <div className="comment-content">
                    <div className="comment-author">{comment.author?.full_name}</div>
                    <div className="comment-text">{comment.body}</div>
                    <div className="comment-time">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
              
              {comments.length > 3 && !showAllComments && (
                <button 
                  className="show-more-comments"
                  onClick={() => setShowAllComments(true)}
                >
                  View all {comments.length} comments
                </button>
              )}
            </div>
          )}
          
          {showCommentInput && (
            <div className="comment-input-section">
              <input
                type="text"
                className="comment-input"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleComment()}
                disabled={isCommenting}
              />
              <button 
                className="comment-submit"
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
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Post?</h2>
            <p>This action cannot be undone. All photos, comments, and likes will be permanently removed.</p>
            <div className="modal-buttons">
              <button 
                className="modal-cancel"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className="modal-delete"
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
      
      <style>
        {`
          /* Expanded Mode CSS would go here - but splitting it into multiple style blocks 
             to avoid the styled-jsx compilation issue. I'll need to continue this in parts. */
        `}
      </style>
    </>
  );
}
