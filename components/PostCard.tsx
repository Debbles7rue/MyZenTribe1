// components/PostCard.tsx - Compact Cards with Individual Photo Interactions - SYNTAX FIXED
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
        
        <style jsx>{`
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
        `}</style>
      </div>
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
        
        <style jsx>{`
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
          
          .photo-grid-expanded {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            margin: 1rem 0;
          }
          
          .individual-photo-container {
            border-radius: 0.75rem;
            overflow: hidden;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
          }
          
          .photo-wrapper {
            position: relative;
          }
          
          .individual-photo {
            width: 100%;
            max-height: 400px;
            object-fit: cover;
            cursor: pointer;
            transition: transform 0.2s ease;
          }
          
          .individual-photo:hover {
            transform: scale(1.01);
          }
          
          .photo-interaction-bar {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(transparent, rgba(0,0,0,0.8));
            padding: 2rem 1rem 1rem;
            display: flex;
            gap: 0.75rem;
            opacity: 0;
            transition: opacity 0.3s ease;
          }
          
          .individual-photo-container:hover .photo-interaction-bar {
            opacity: 1;
          }
          
          .photo-interact-btn {
            background: rgba(255,255,255,0.95);
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 1.5rem;
            font-size: 0.875rem;
            cursor: pointer;
            font-weight: 500;
            color: #374151;
            backdrop-filter: blur(4px);
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 0.375rem;
          }
          
          .photo-interact-btn:hover {
            background: white;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          
          .like-btn:hover {
            background: #fef2f2;
            color: #dc2626;
          }
          
          .comment-btn:hover {
            background: #eff6ff;
            color: #2563eb;
          }
          
          .caption-btn:hover {
            background: #f0fdf4;
            color: #16a34a;
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
        `}</style>
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
          
          <style jsx>{`
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
          `}</style>
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
      
      <style jsx>{`
        .photo-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.95);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }
        
        .photo-modal-content {
          position: relative;
          background: white;
          border-radius: 1rem;
          max-width: 1200px;
          max-height: 90vh;
          width: 100%;
          overflow: hidden;
        }
        
        .modal-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: rgba(0,0,0,0.5);
          color: white;
          border: none;
          border-radius: 50%;
          width: 3rem;
          height: 3rem;
          font-size: 1.5rem;
          cursor: pointer;
          z-index: 10;
        }
        
        .photo-modal-layout {
          display: grid;
          grid-template-columns: 2fr 1fr;
          height: 80vh;
        }
        
        .photo-side {
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        
        .modal-photo {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        
        .interactions-side {
          padding: 1.5rem;
          overflow-y: auto;
          background: white;
        }
        
        .photo-reactions {
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .photo-reactions h4 {
          margin: 0 0 1rem 0;
          font-size: 1.1rem;
          color: #374151;
        }
        
        .reaction-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        
        .reaction-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 2rem;
          background: white;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }
        
        .reaction-btn:hover {
          background: #f8fafc;
        }
        
        .photo-comments h4 {
          margin: 0 0 1rem 0;
          font-size: 1.1rem;
          color: #374151;
        }
        
        .comments-list {
          max-height: 300px;
          overflow-y: auto;
          margin-bottom: 1rem;
        }
        
        .photo-comment {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        
        .comment-avatar {
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          object-fit: cover;
        }
        
        .comment-content {
          flex: 1;
        }
        
        .comment-author {
          font-weight: 600;
          font-size: 0.875rem;
          color: #374151;
        }
        
        .comment-text {
          margin: 0.25rem 0;
          font-size: 0.875rem;
          line-height: 1.4;
        }
        
        .comment-time {
          font-size: 0.75rem;
          color: #9ca3af;
        }
        
        .no-comments {
          color: #9ca3af;
          text-align: center;
          padding: 2rem;
          font-style: italic;
        }
        
        .photo-comment-input {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          font-size: 0.875rem;
        }
        
        .photo-comment-input:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
        }
        
        .photo-comment-btn {
          padding: 0.75rem 1.5rem;
          background: #8b5cf6;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          cursor: pointer;
          white-space: nowrap;
        }
        
        .photo-comment-btn:disabled {
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
        
        .edit-modal-content.professional {
          max-width: 650px;
          width: 95%;
          max-height: 85vh;
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
        
        .edit-section {
          margin-bottom: 2rem;
        }
        
        .edit-label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.75rem;
          font-size: 0.9375rem;
        }
        
        .edit-textarea-clean {
          width: 100%;
          padding: 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 0.75rem;
          resize: vertical;
          font-size: 1rem;
          line-height: 1.5;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s ease;
        }
        
        .edit-textarea-clean:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
        }
        
        .edit-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        
        .action-card {
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 1rem;
          padding: 1.5rem;
          text-align: center;
          transition: all 0.2s ease;
        }
        
        .action-card:hover {
          border-color: #cbd5e0;
          background: #f1f5f9;
        }
        
        .action-card h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.125rem;
          color: #1f2937;
        }
        
        .action-card p {
          margin: 0 0 1rem 0;
          color: #6b7280;
          font-size: 0.875rem;
        }
        
        .action-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 1.5rem;
          border-radius: 0.75rem;
          font-weight: 600;
          font-size: 0.9375rem;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          min-width: 120px;
        }
        
        .action-button.primary {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
        }
        
        .action-button.primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 16px rgba(139,92,246,0.3);
        }
        
        .action-button.secondary {
          background: white;
          color: #374151;
          border: 2px solid #e5e7eb;
        }
        
        .action-button.secondary:hover {
          border-color: #8b5cf6;
          color: #8b5cf6;
        }
        
        .privacy-select {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 0.5rem;
          font-size: 0.9375rem;
          background: white;
          cursor: pointer;
        }
        
        .privacy-select:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
        }
        
        .file-preview {
          margin-top: 0.75rem;
          padding: 0.5rem;
          background: rgba(139,92,246,0.1);
          color: #7c3aed;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
        }
        
        .co-creators-section {
          background: #fefce8;
          border: 2px solid #fde047;
          border-radius: 1rem;
          padding: 1.5rem;
          margin-top: 1rem;
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
        
        .save-button.primary {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
        }
        
        .save-button.primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 16px rgba(16,185,129,0.3);
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
        
        @media (max-width: 768px) {
          .photo-modal-layout {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr auto;
          }
          
          .interactions-side {
            max-height: 40vh;
            overflow-y: auto;
          }
          
          .photo-side {
            height: 60vh;
          }
          
          .individual-photo {
            max-height: 300px;
          }
          
          .edit-actions-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
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
