// components/PostCard.tsx - Compact Preview with Click-to-Expand
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

// Photo Grid Component - FIXED for proper Facebook-style collage layout
function PhotoGrid({ 
  media, 
  onPhotoClick,
  isCompact = false
}: { 
  media: Array<{url: string; type: 'image' | 'video'}>;
  onPhotoClick: (index: number) => void;
  isCompact?: boolean;
}) {
  if (!media || !Array.isArray(media) || media.length === 0) {
    return null;
  }
  
  const validMedia = media.filter(m => {
    return m && typeof m === 'object' && m.url && typeof m.url === 'string' && m.type;
  });
  
  if (validMedia.length === 0) return null;
  
  const images = validMedia.filter(m => m.type === 'image');
  const videos = validMedia.filter(m => m.type === 'video');
  
  // In compact mode, show only first image as small preview
  if (isCompact) {
    const firstImage = images[0];
    if (!firstImage) return null;
    
    return (
      <div className="photo-grid-container compact">
        <div className="compact-preview" onClick={() => onPhotoClick(0)}>
          <img src={firstImage.url} alt="" />
          {images.length > 1 && (
            <div className="media-count-overlay">
              +{images.length - 1}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Single image layout
  if (images.length === 1 && videos.length === 0) {
    return (
      <div className="photo-grid-container">
        <div 
          className="single-photo"
          onClick={() => onPhotoClick(0)}
        >
          <img src={images[0].url} alt="" />
        </div>
      </div>
    );
  }
  
  // Two images side by side
  if (images.length === 2) {
    return (
      <div className="photo-grid-container">
        <div className="two-photos">
          {images.map((img, idx) => (
            <div 
              key={idx}
              className="photo-item"
              onClick={() => onPhotoClick(idx)}
            >
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
      <div className="photo-grid-container">
        <div className="three-photos">
          <div 
            className="main-photo"
            onClick={() => onPhotoClick(0)}
          >
            <img src={images[0].url} alt="" />
          </div>
          <div className="side-stack">
            {images.slice(1, 3).map((img, idx) => (
              <div 
                key={idx}
                className="photo-item"
                onClick={() => onPhotoClick(idx + 1)}
              >
                <img src={img.url} alt="" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  // Four images in grid
  if (images.length === 4) {
    return (
      <div className="photo-grid-container">
        <div className="four-photos">
          {images.map((img, idx) => (
            <div 
              key={idx}
              className="photo-item"
              onClick={() => onPhotoClick(idx)}
            >
              <img src={img.url} alt="" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Five or more images
  if (images.length >= 5) {
    return (
      <div className="photo-grid-container">
        <div className="many-photos">
          <div className="top-row">
            <div 
              className="photo-item large"
              onClick={() => onPhotoClick(0)}
            >
              <img src={images[0].url} alt="" />
            </div>
            <div 
              className="photo-item large"
              onClick={() => onPhotoClick(1)}
            >
              <img src={images[1].url} alt="" />
            </div>
          </div>
          <div className="bottom-row">
            {images.slice(2, 5).map((img, idx) => (
              <div 
                key={idx}
                className="photo-item small"
                onClick={() => onPhotoClick(idx + 2)}
              >
                <img src={img.url} alt="" />
                {idx === 2 && images.length > 5 && (
                  <div className="more-overlay">
                    <span>+{images.length - 5}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return null;
}

// Lightbox Component - FIXED to prevent freezing
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
  
  // Filter to only images for lightbox
  const images = media.filter(m => m && m.type === 'image' && m.url);
  
  if (!images || images.length === 0) {
    onClose();
    return null;
  }
  
  // Ensure index is valid
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
        
        {images.length > 1 && (
          <div className="lightbox-thumbnails">
            {images.map((img, idx) => (
              <div
                key={idx}
                className={`thumbnail ${idx === safeIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(idx)}
              >
                <img src={img.url} alt="" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Edit Modal Component
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setNewFiles(Array.from(files));
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Update post text
      if (editBody !== post.body) {
        await updatePost(post.id, { body: editBody });
      }

      // Upload and add new files
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
      <div className="edit-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="edit-modal-header">
          <h2>Edit Post</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        
        <div className="edit-modal-body">
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            placeholder="What's on your mind?"
            rows={6}
            className="edit-textarea"
          />

          {currentMedia.length > 0 && (
            <div className="current-media">
              <h3>Current Media ({currentMedia.length})</h3>
              <div className="media-grid">
                {currentMedia.map((media, idx) => (
                  <div key={idx} className="media-item">
                    {media.type === 'image' ? (
                      <img src={media.url} alt="" />
                    ) : (
                      <video src={media.url} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="file-upload">
            <label className="upload-button">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <span>📸</span>
              <span>Add More Photos/Videos</span>
            </label>
            {newFiles.length > 0 && (
              <p className="file-count">
                <span>{newFiles.length}</span>
                new file{newFiles.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        </div>

        <div className="edit-modal-footer">
          <button onClick={onClose} disabled={isSaving} className="cancel-button">
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving || uploadingFiles}
            className="save-button"
          >
            {isSaving ? (
              <>
                <span className="spinner">⏳</span>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCoCreator, setIsCoCreator] = useState(false);
  const [processedMedia, setProcessedMedia] = useState<Array<{url: string; type: 'image' | 'video'}>>([]);
  
  // Like, Comment, Share states
  const [isLiking, setIsLiking] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(post.like_count || 0);
  const [localLikedByMe, setLocalLikedByMe] = useState(post.liked_by_me || false);
  
  // NEW: Comment loading and display
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  
  useEffect(() => {
    if (currentUserId && post.co_creators) {
      setIsCoCreator(post.co_creators.includes(currentUserId));
    }
  }, [currentUserId, post.co_creators]);
  
  // FIXED: Media processing with better error handling
  useEffect(() => {
    const processed = [];
    
    try {
      // Add main image/video if exists
      if (post.image_url) {
        processed.push({ url: post.image_url, type: 'image' as const });
      }
      if (post.video_url) {
        processed.push({ url: post.video_url, type: 'video' as const });
      }
      
      // Add additional media with validation
      if (post.additional_media && Array.isArray(post.additional_media)) {
        post.additional_media.forEach(item => {
          if (item && item.url && item.type) {
            // Don't add duplicates of the main image/video
            const isDuplicate = (item.type === 'image' && item.url === post.image_url) ||
                              (item.type === 'video' && item.url === post.video_url);
            if (!isDuplicate) {
              processed.push({ url: item.url, type: item.type });
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
  
  // NEW: Load comments when needed
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
  
  // Load comments when comment count > 0 and we haven't loaded them yet
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
        // Reload comments to show the new one
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
    // Don't expand if clicking on buttons, links, or already expanded
    if ((e.target as HTMLElement).closest('button, a, .menu-btn, .action-btn')) {
      return;
    }
    
    setIsExpanded(!isExpanded);
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
  
  // Show first 3 comments by default, with option to see more
  const displayedComments = showAllComments ? comments : comments.slice(0, 3);

  // Compact preview mode
  if (!isExpanded) {
    return (
      <div className="post-card compact" onClick={handleCardClick}>
        <div className="compact-layout">
          <div className="compact-content">
            <div className="compact-header">
              <img 
                src={post.author?.avatar_url || '/default-avatar.png'} 
                alt=""
                className="compact-avatar"
              />
              <div className="compact-info">
                <div className="compact-name">{getDisplayName()}</div>
                <div className="compact-meta">
                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  {post.privacy && (
                    <span className="privacy-icon">
                      {post.privacy === 'public' ? '🌍' : '🔒'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {post.body && (
              <div className="compact-text">
                {post.body.length > 100 ? `${post.body.substring(0, 100)}...` : post.body}
              </div>
            )}
            
            <div className="compact-stats">
              {localLikeCount > 0 && <span>❤️ {localLikeCount}</span>}
              {post.comment_count > 0 && <span>💬 {post.comment_count}</span>}
              {processedMedia.length > 0 && <span>📷 {processedMedia.length}</span>}
            </div>
          </div>
          
          {processedMedia.length > 0 && (
            <div className="compact-media">
              <PhotoGrid 
                media={processedMedia} 
                onPhotoClick={() => {}} // Don't open lightbox in compact mode
                isCompact={true}
              />
            </div>
          )}
        </div>
        
        <style jsx>{`
          .post-card.compact {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 0.75rem;
            margin-bottom: 1rem;
            cursor: pointer;
            transition: all 0.2s ease;
            overflow: hidden;
          }
          
          .post-card.compact:hover {
            border-color: #cbd5e0;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            transform: translateY(-1px);
          }
          
          .compact-layout {
            display: flex;
            padding: 1rem;
            gap: 1rem;
          }
          
          .compact-content {
            flex: 1;
          }
          
          .compact-header {
            display: flex;
            gap: 0.75rem;
            margin-bottom: 0.75rem;
          }
          
          .compact-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            object-fit: cover;
          }
          
          .compact-info {
            flex: 1;
          }
          
          .compact-name {
            font-weight: 600;
            font-size: 0.875rem;
            color: #1a202c;
            line-height: 1.2;
          }
          
          .compact-meta {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.75rem;
            color: #718096;
            margin-top: 0.125rem;
          }
          
          .privacy-icon {
            font-size: 0.75rem;
          }
          
          .compact-text {
            font-size: 0.875rem;
            line-height: 1.4;
            color: #374151;
            margin-bottom: 0.75rem;
          }
          
          .compact-stats {
            display: flex;
            gap: 1rem;
            font-size: 0.75rem;
            color: #718096;
          }
          
          .compact-media {
            width: 80px;
            flex-shrink: 0;
          }
          
          .photo-grid-container.compact {
            margin: 0;
          }
          
          .compact-preview {
            width: 80px;
            height: 80px;
            border-radius: 0.5rem;
            overflow: hidden;
            position: relative;
            cursor: pointer;
          }
          
          .compact-preview img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          
          .media-count-overlay {
            position: absolute;
            bottom: 0.25rem;
            right: 0.25rem;
            background: rgba(0,0,0,0.7);
            color: white;
            font-size: 0.6875rem;
            padding: 0.125rem 0.375rem;
            border-radius: 0.25rem;
            font-weight: 600;
          }
        `}</style>
      </div>
    );
  }
  
  // Expanded mode - full post display
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
          
          {/* NEW: Display comments */}
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
      
      {/* All modals and popups remain the same */}
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
        <PhotoLightbox
          media={processedMedia}
          startIndex={lightboxStartIndex}
          onClose={() => setShowLightbox(false)}
        />
      )}
      
      <style jsx>{`
        /* Compact mode styling is above in the compact return */
        
        /* Expanded mode styling */
        .post-card.expanded {
          background: white;
          border: 2px solid #f1f5f9;
          border-radius: 1rem;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
          margin-bottom: 2rem;
          position: relative;
          max-width: 100%;
          overflow: hidden;
          transition: all 0.2s ease-in-out;
        }
        
        .post-card.expanded:hover {
          border-color: #e2e8f0;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
        }
        
        .post-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 1rem;
          position: relative;
        }
        
        .author-info {
          display: flex;
          gap: 0.75rem;
        }
        
        .author-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }
        
        .author-name {
          font-weight: 600;
          color: #1a202c;
        }
        
        .post-meta {
          display: flex;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #718096;
        }
        
        .header-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
        
        .collapse-btn {
          background: rgba(0,0,0,0.05);
          border: none;
          font-size: 1rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #718096;
          transition: all 0.2s;
        }
        
        .collapse-btn:hover {
          background: rgba(0,0,0,0.1);
          color: #4a5568;
        }
        
        .post-content {
          padding: 0 1rem;
        }
        
        .post-text {
          margin-bottom: 0.75rem;
          line-height: 1.5;
        }
        
        /* Facebook-style photo grid layouts */
        .photo-grid-container {
          margin: 0.5rem 0;
          border-radius: 0.5rem;
          overflow: hidden;
          background: #f8f9fa;
        }
        
        .single-photo {
          width: 100%;
          height: 300px;
          cursor: pointer;
          overflow: hidden;
        }
        
        .single-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.2s;
        }
        
        .single-photo:hover img {
          transform: scale(1.02);
        }
        
        .two-photos {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2px;
          height: 250px;
        }
        
        .three-photos {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2px;
          height: 250px;
        }
        
        .three-photos .main-photo {
          height: 100%;
        }
        
        .three-photos .side-stack {
          display: flex;
          flex-direction: column;
          gap: 2px;
          height: 100%;
        }
        
        .three-photos .side-stack .photo-item {
          flex: 1;
        }
        
        .four-photos {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
          gap: 2px;
          height: 250px;
        }
        
        .many-photos {
          height: 250px;
        }
        
        .many-photos .top-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2px;
          height: 60%;
          margin-bottom: 2px;
        }
        
        .many-photos .bottom-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
          height: calc(40% - 2px);
        }
        
        .photo-item {
          position: relative;
          cursor: pointer;
          overflow: hidden;
          background: #f7fafc;
        }
        
        .photo-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.2s;
        }
        
        .photo-item:hover img {
          transform: scale(1.05);
        }
        
        .more-overlay {
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
        
        .post-footer {
          padding: 0.75rem 1rem;
          border-top: 1px solid #e2e8f0;
        }
        
        .engagement-stats {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
          color: #718096;
          margin-bottom: 0.5rem;
        }
        
        .action-buttons {
          display: flex;
          gap: 1rem;
        }
        
        .action-btn {
          flex: 1;
          padding: 0.5rem;
          background: none;
          border: none;
          color: #4a5568;
          cursor: pointer;
          border-radius: 0.375rem;
          transition: background 0.2s;
        }
        
        .action-btn:hover {
          background: #f7fafc;
        }
        
        .action-btn.liked {
          color: #e53e3e;
        }
        
        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* Comments styling */
        .comments-section {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid #f1f5f9;
        }
        
        .comment {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }
        
        .comment-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }
        
        .comment-content {
          flex: 1;
        }
        
        .comment-author {
          font-weight: 600;
          font-size: 0.875rem;
          color: #1a202c;
        }
        
        .comment-text {
          font-size: 0.875rem;
          color: #374151;
          margin: 0.25rem 0;
        }
        
        .comment-time {
          font-size: 0.75rem;
          color: #9ca3af;
        }
        
        .show-more-comments {
          background: none;
          border: none;
          color: #4a5568;
          font-size: 0.875rem;
          cursor: pointer;
          padding: 0.25rem 0;
          text-decoration: underline;
        }
        
        .comment-input-section {
          display: flex;
          gap: 0.5rem;
          padding: 0.75rem 0;
          margin-top: 0.75rem;
          border-top: 1px solid #f1f5f9;
        }
        
        .comment-input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.2s;
        }
        
        .comment-input:focus {
          border-color: #4299e1;
          box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
        }
        
        .comment-submit {
          padding: 0.5rem 1rem;
          background: #4299e1;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          cursor: pointer;
        }
        
        .comment-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .post-actions {
          position: relative;
        }
        
        .menu-btn {
          background: rgba(0,0,0,0.05);
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #718096;
          transition: all 0.2s;
        }
        
        .menu-btn:hover {
          background: rgba(0,0,0,0.1);
          color: #4a5568;
        }
        
        .menu-dropdown {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
          min-width: 180px;
          z-index: 100;
          overflow: hidden;
        }
        
        .menu-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 0.75rem 1rem;
          background: none;
          border: none;
          text-align: left;
          cursor: pointer;
          font-size: 0.875rem;
          color: #374151;
          transition: background 0.2s;
        }
        
        .menu-item:hover {
          background: #f8fafc;
        }
        
        .menu-item.danger {
          color: #dc2626;
        }
        
        .menu-item.danger:hover {
          background: #fef2f2;
        }
        
        /* All lightbox, modal, and edit modal styles remain exactly the same as original */
        .lightbox-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.95);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .lightbox-content {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
        }
        
        .lightbox-content img {
          max-width: 100%;
          max-height: 80vh;
          object-fit: contain;
        }
        
        .lightbox-close {
          position: absolute;
          top: -40px;
          right: 0;
          background: none;
          border: none;
          color: white;
          font-size: 3rem;
          cursor: pointer;
          z-index: 10001;
        }
        
        .lightbox-prev,
        .lightbox-next {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255,255,255,0.1);
          border: none;
          color: white;
          font-size: 3rem;
          padding: 1rem;
          cursor: pointer;
          z-index: 10001;
        }
        
        .lightbox-prev {
          left: -60px;
        }
        
        .lightbox-next {
          right: -60px;
        }
        
        .lightbox-counter {
          position: absolute;
          bottom: -30px;
          left: 50%;
          transform: translateX(-50%);
          color: white;
        }
        
        .lightbox-thumbnails {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
          margin-top: 1rem;
          padding: 0.5rem;
        }
        
        .thumbnail {
          width: 60px;
          height: 60px;
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s;
          border: 2px solid transparent;
        }
        
        .thumbnail.active {
          opacity: 1;
          border-color: white;
        }
        
        .thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        /* Modal styling */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 9998;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-content {
          background: white;
          border-radius: 0.75rem;
          padding: 1.5rem;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .confirm-modal {
          max-width: 400px;
        }

        .modal-content h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }

        .modal-content p {
          color: #4a5568;
          margin-bottom: 1.5rem;
        }

        .modal-buttons {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }

        .modal-cancel, .modal-delete {
          padding: 0.5rem 1.25rem;
          border-radius: 0.375rem;
          border: none;
          font-weight: 500;
          cursor: pointer;
        }

        .modal-cancel {
          background: #e2e8f0;
          color: #4a5568;
        }

        .modal-delete {
          background: #e53e3e;
          color: white;
        }

        .modal-cancel:hover {
          background: #cbd5e0;
        }

        .modal-delete:hover {
          background: #c53030;
        }

        .modal-cancel:disabled,
        .modal-delete:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .edit-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          z-index: 9998;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          overflow-y: auto;
        }

        .edit-modal-content {
          background: white;
          border-radius: 1rem;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
          margin: auto;
          position: relative;
        }

        .edit-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .edit-modal-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1a202c;
          margin: 0;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 2rem;
          color: #718096;
          cursor: pointer;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .close-button:hover {
          background: #f7fafc;
          color: #2d3748;
        }

        .edit-modal-body {
          padding: 1.5rem;
          overflow-y: auto;
          flex: 1;
        }

        .edit-textarea {
          width: 100%;
          padding: 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 0.75rem;
          resize: vertical;
          margin-bottom: 1.5rem;
          font-size: 1rem;
          line-height: 1.5;
          font-family: inherit;
          outline: none;
          min-height: 150px;
        }

        .edit-textarea:focus {
          border-color: #4299e1;
          box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
        }

        .current-media {
          margin-bottom: 1.5rem;
          padding: 1.25rem;
          background: #f8fafc;
          border-radius: 0.75rem;
        }

        .current-media h3 {
          font-size: 0.875rem;
          font-weight: 600;
          color: #4a5568;
          margin: 0 0 0.75rem 0;
        }

        .media-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 0.75rem;
        }

        .media-item {
          aspect-ratio: 1;
          overflow: hidden;
          border-radius: 0.5rem;
          background: white;
          border: 2px solid white;
        }

        .media-item img,
        .media-item video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .file-upload {
          margin-bottom: 1rem;
        }

        .upload-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 0.75rem;
          cursor: pointer;
          font-weight: 500;
          font-size: 1rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .upload-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
        }

        .file-count {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #4a5568;
          margin-top: 0.75rem;
          margin-bottom: 0;
        }

        .file-count span:first-child {
          background: #667eea;
          color: white;
          padding: 0.125rem 0.625rem;
          border-radius: 9999px;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .edit-modal-footer {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          padding: 1.25rem 1.5rem;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .cancel-button,
        .save-button {
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel-button {
          background: white;
          color: #4a5568;
          border: 2px solid #e2e8f0;
        }

        .cancel-button:hover {
          background: #f7fafc;
          border-color: #cbd5e0;
        }

        .save-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .save-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
        }

        .save-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .spinner {
          display: inline-block;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .compact-layout {
            flex-direction: column;
            gap: 0.75rem;
          }
          
          .compact-media {
            width: 100%;
            display: flex;
            justify-content: center;
          }
          
          .compact-preview {
            width: 120px;
            height: 120px;
          }
          
          .single-photo {
            height: 250px;
          }
          
          .two-photos,
          .three-photos,
          .four-photos,
          .many-photos {
            height: 200px;
          }
          
          .lightbox-prev,
          .lightbox-next {
            font-size: 2rem;
            padding: 0.5rem;
          }
          
          .lightbox-prev {
            left: 10px;
          }
          
          .lightbox-next {
            right: 10px;
          }
        }
      `}</style>
    </>
  );
}
