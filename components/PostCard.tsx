// components/PostCard.tsx
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

// Photo Grid Component
function PhotoGrid({ 
  media, 
  onPhotoClick 
}: { 
  media: Array<{url: string; type: 'image' | 'video'}>;
  onPhotoClick: (index: number) => void;
}) {
  if (!media || !Array.isArray(media)) {
    return null;
  }
  
  const validMedia = media.filter(m => {
    return m && typeof m === 'object' && m.url && typeof m.url === 'string' && m.type;
  });
  
  const images = validMedia.filter(m => m.type === 'image');
  const videos = validMedia.filter(m => m.type === 'video');
  
  if (validMedia.length === 0) return null;
  
  if (images.length === 1 && videos.length === 0) {
    const img = images[0];
    if (!img || !img.url) return null;
    
    return (
      <div className="photo-grid single">
        <div 
          className="photo-item"
          onClick={() => onPhotoClick(0)}
        >
          <img src={img.url} alt="" />
        </div>
      </div>
    );
  }
  
  if (images.length === 2) {
    return (
      <div className="photo-grid two">
        {images.map((img, idx) => (
          img && img.url ? (
            <div 
              key={idx}
              className="photo-item"
              onClick={() => onPhotoClick(idx)}
            >
              <img src={img.url} alt="" />
            </div>
          ) : null
        ))}
      </div>
    );
  }
  
  if (images.length === 3) {
    const mainImg = images[0];
    if (!mainImg || !mainImg.url) return null;
    
    return (
      <div className="photo-grid three">
        <div 
          className="photo-item main"
          onClick={() => onPhotoClick(0)}
        >
          <img src={mainImg.url} alt="" />
        </div>
        <div className="side-photos">
          {images.slice(1, 3).map((img, idx) => (
            img && img.url ? (
              <div 
                key={idx}
                className="photo-item"
                onClick={() => onPhotoClick(idx + 1)}
              >
                <img src={img.url} alt="" />
              </div>
            ) : null
          ))}
        </div>
      </div>
    );
  }
  
  if (images.length === 4) {
    return (
      <div className="photo-grid four">
        {images.map((img, idx) => (
          img && img.url ? (
            <div 
              key={idx}
              className="photo-item"
              onClick={() => onPhotoClick(idx)}
            >
              <img src={img.url} alt="" />
            </div>
          ) : null
        ))}
      </div>
    );
  }
  
  const firstImg = images[0];
  const secondImg = images[1];
  if (!firstImg || !firstImg.url || !secondImg || !secondImg.url) return null;
  
  return (
    <div className="photo-grid many">
      <div className="main-row">
        <div 
          className="photo-item large"
          onClick={() => onPhotoClick(0)}
        >
          <img src={firstImg.url} alt="" />
        </div>
        <div 
          className="photo-item large"
          onClick={() => onPhotoClick(1)}
        >
          <img src={secondImg.url} alt="" />
        </div>
      </div>
      <div className="bottom-row">
        {images.slice(2, 5).map((img, idx) => (
          img && img.url ? (
            <div 
              key={idx}
              className="photo-item"
              onClick={() => onPhotoClick(idx + 2)}
            >
              <img src={img.url} alt="" />
              {idx === 2 && images.length > 5 && (
                <div className="more-overlay">
                  <span>+{images.length - 5}</span>
                </div>
              )}
            </div>
          ) : null
        ))}
      </div>
      
      {videos.length > 0 && (
        <div className="videos-row">
          {videos.map((vid, idx) => (
            vid && vid.url ? (
              <div key={idx} className="video-item">
                <video src={vid.url} controls />
              </div>
            ) : null
          ))}
        </div>
      )}
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
  if (!media || !Array.isArray(media) || media.length === 0) {
    onClose();
    return null;
  }
  
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const images = media.filter(m => m && m.type === 'image');
  
  if (!images || images.length === 0) {
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
  
  const safeIndex = Math.min(currentIndex, images.length - 1);
  const currentImage = images[safeIndex];
  
  if (!currentImage || !currentImage.url) {
    onClose();
    return null;
  }
  
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
              img && img.url ? (
                <div
                  key={idx}
                  className={`thumbnail ${idx === safeIndex ? 'active' : ''}`}
                  onClick={() => setCurrentIndex(idx)}
                >
                  <img src={img.url} alt="" />
                </div>
              ) : null
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Edit Modal Component for adding/removing photos
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
        <div className="edit-modal-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px 24px 20px 24px',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#1a202c',
            margin: 0
          }}>Edit Post</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '32px',
              color: '#718096',
              cursor: 'pointer',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#f7fafc';
              e.currentTarget.style.color = '#2d3748';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = '#718096';
            }}
          >×</button>
        </div>
        
        <div className="edit-modal-body" style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1
        }}>
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            placeholder="What's on your mind?"
            rows={6}
            style={{
              width: '100%',
              padding: '16px',
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              resize: 'vertical',
              marginBottom: '24px',
              fontSize: '16px',
              lineHeight: '1.5',
              fontFamily: 'inherit',
              outline: 'none',
              minHeight: '150px'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#4299e1';
              e.target.style.boxShadow = '0 0 0 3px rgba(66, 153, 225, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e2e8f0';
              e.target.style.boxShadow = 'none';
            }}
          />

          {currentMedia.length > 0 && (
            <div style={{
              marginBottom: '24px',
              padding: '20px',
              background: '#f8fafc',
              borderRadius: '12px'
            }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#4a5568',
                marginBottom: '12px',
                margin: '0 0 12px 0'
              }}>Current Media ({currentMedia.length})</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: '12px'
              }}>
                {currentMedia.map((media, idx) => (
                  <div key={idx} style={{
                    aspectRatio: '1',
                    overflow: 'hidden',
                    borderRadius: '8px',
                    background: 'white',
                    border: '2px solid white'
                  }}>
                    {media.type === 'image' ? (
                      <img 
                        src={media.url} 
                        alt="" 
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <video 
                        src={media.url}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '16px',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(102, 126, 234, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <span style={{ fontSize: '20px' }}>📸</span>
              <span>Add More Photos/Videos</span>
            </label>
            {newFiles.length > 0 && (
              <p style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: '#4a5568',
                marginTop: '12px',
                marginBottom: 0
              }}>
                <span style={{
                  background: '#667eea',
                  color: 'white',
                  padding: '2px 10px',
                  borderRadius: '9999px',
                  fontWeight: '600',
                  fontSize: '14px'
                }}>{newFiles.length}</span>
                new file{newFiles.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        </div>

        <div className="edit-modal-footer" style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'flex-end',
          padding: '20px 24px',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc'
        }}>
          <button 
            onClick={onClose}
            disabled={isSaving}
            style={{
              padding: '12px 24px',
              background: 'white',
              color: '#4a5568',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              if (!isSaving) {
                e.currentTarget.style.background = '#f7fafc';
                e.currentTarget.style.borderColor = '#cbd5e0';
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving || uploadingFiles}
            style={{
              padding: '12px 24px',
              background: isSaving ? '#cbd5e0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              opacity: (isSaving || uploadingFiles) ? 0.7 : 1
            }}
            onMouseOver={(e) => {
              if (!isSaving && !uploadingFiles) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(102, 126, 234, 0.4)';
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {isSaving ? (
              <>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
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
  
  useEffect(() => {
    if (currentUserId && post.co_creators) {
      setIsCoCreator(post.co_creators.includes(currentUserId));
    }
  }, [currentUserId, post.co_creators]);
  
  // FIXED: Simplified media processing - data already comes in the right format
  useEffect(() => {
    const processed = [];
    
    // Add main image/video if exists
    if (post.image_url) {
      processed.push({ url: post.image_url, type: 'image' as const });
    }
    if (post.video_url) {
      processed.push({ url: post.video_url, type: 'video' as const });
    }
    
    // Add additional media - it already comes with proper URLs from the backend
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
  }, [post.image_url, post.video_url, post.additional_media]);
  
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
        setShowCommentInput(false);
        // Force immediate refresh with delay for database update
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
        // Add a small delay to let the database update complete
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
  
  const mediaToDisplay = processedMedia;
  
  const handlePhotoClick = (index: number) => {
    if (mediaToDisplay && mediaToDisplay.length > 0) {
      setLightboxStartIndex(index);
      setShowLightbox(true);
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
  
  return (
    <>
      <div className="post-card">
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
        
        <div className="post-content">
          {post.body && <p className="post-text">{post.body}</p>}
          
          {mediaToDisplay && mediaToDisplay.length > 0 && (
            <PhotoGrid 
              media={mediaToDisplay} 
              onPhotoClick={handlePhotoClick}
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
              {localLikedByMe ? '❤️' : '🤍'} {localLikeCount > 0 ? localLikeCount : 'Like'}
            </button>
            <button 
              className="action-btn"
              onClick={() => setShowCommentInput(!showCommentInput)}
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

      {/* Edit Post Modal */}
      {showEditModal && (
        <EditPostModal
          post={post}
          currentMedia={mediaToDisplay}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            setShowEditModal(false);
            if (onChanged) onChanged();
          }}
        />
      )}
      
      {showLightbox && mediaToDisplay && mediaToDisplay.length > 0 && (
        <PhotoLightbox
          media={mediaToDisplay}
          startIndex={lightboxStartIndex}
          onClose={() => setShowLightbox(false)}
        />
      )}
      
      <style jsx>{`
        .post-card {
          background: white;
          border-radius: 0.75rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          margin-bottom: 1rem;
          position: relative;
          max-width: 100%;
          overflow: hidden;
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
        
        .post-content {
          padding: 0 1rem;
        }
        
        .post-text {
          margin-bottom: 0.75rem;
          line-height: 1.5;
        }
        
        .photo-grid {
          margin: 0.5rem 0;
          border-radius: 0.5rem;
          overflow: hidden;
          max-height: 500px; /* FIXED: Limit maximum height */
        }
        
        .photo-grid.single .photo-item {
          width: 100%;
          max-height: 400px; /* FIXED: Reasonable max height for single images */
          overflow: hidden;
        }
        
        .photo-grid.single .photo-item img {
          width: 100%;
          height: 100%;
          max-height: 400px; /* FIXED: Consistent with container */
          object-fit: cover;
        }
        
        .photo-grid.two {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2px;
          max-height: 300px; /* FIXED: Limit height for multiple photos */
        }
        
        .photo-grid.three {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2px;
          max-height: 300px; /* FIXED: Consistent height */
        }
        
        .photo-grid.three .side-photos {
          display: flex;
          flex-direction: column;
          gap: 2px;
          height: 100%;
        }
        
        .photo-grid.four {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
          gap: 2px;
          max-height: 300px; /* FIXED: Consistent height */
        }
        
        .photo-grid.many {
          max-height: 400px; /* FIXED: Limit height for many photos */
        }
        
        .photo-grid.many .main-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2px;
          margin-bottom: 2px;
          height: 200px; /* FIXED: Set explicit height */
        }
        
        .photo-grid.many .bottom-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
          height: 100px; /* FIXED: Set explicit height */
        }
        
        .photo-item {
          position: relative;
          cursor: pointer;
          overflow: hidden;
          background: #f7fafc;
          min-height: 0; /* FIXED: Allow shrinking */
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
        
        .videos-row {
          margin-top: 8px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .video-item {
          flex: 1;
          min-width: 200px;
          max-height: 200px; /* FIXED: Limit video height */
        }
        
        .video-item video {
          width: 100%;
          height: 100%;
          max-height: 200px; /* FIXED: Consistent with container */
          object-fit: cover;
          border-radius: 8px;
        }
        
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
        
        .comment-input-section {
          display: flex;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-top: 1px solid #e2e8f0;
        }
        
        .comment-input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.375rem;
          font-size: 0.875rem;
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
          background: rgba(0,0,0,0.05); /* FIXED: Subtle background instead of red */
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

        .modal-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1rem;
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

        .modal-cancel, .modal-save, .modal-delete {
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

        .modal-save {
          background: #4299e1;
          color: white;
        }

        .modal-delete {
          background: #e53e3e;
          color: white;
        }

        .modal-cancel:hover {
          background: #cbd5e0;
        }

        .modal-save:hover {
          background: #3182ce;
        }

        .modal-delete:hover {
          background: #c53030;
        }

        .modal-cancel:disabled,
        .modal-save:disabled,
        .modal-delete:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .edit-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          z-index: 9998;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
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
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* FIXED: Mobile responsiveness */
        @media (max-width: 768px) {
          .photo-grid.single .photo-item {
            max-height: 300px;
          }
          
          .photo-grid.single .photo-item img {
            max-height: 300px;
          }
          
          .photo-grid.two,
          .photo-grid.three,
          .photo-grid.four {
            max-height: 250px;
          }
          
          .photo-grid.many .main-row {
            height: 150px;
          }
          
          .photo-grid.many .bottom-row {
            height: 75px;
          }
          
          .video-item {
            max-height: 150px;
            min-width: 150px;
          }
          
          .video-item video {
            max-height: 150px;
          }
        }
      `}</style>
    </>
  );
}
