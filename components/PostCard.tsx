// components/PostCard.tsx
"use client";

import { useState, useEffect } from "react";
import { Post } from "@/lib/posts";
import Link from "next/link";
import CoCreatorEditModal from "@/components/CoCreatorEditModal";

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
  const images = media.filter(m => m.type === 'image');
  const videos = media.filter(m => m.type === 'video');
  
  if (media.length === 0) return null;
  
  // Different layouts based on photo count
  if (images.length === 1 && videos.length === 0) {
    // Single image - full width
    return (
      <div className="photo-grid single">
        <div 
          className="photo-item"
          onClick={() => onPhotoClick(0)}
        >
          <img src={images[0].url} alt="" />
        </div>
      </div>
    );
  }
  
  if (images.length === 2) {
    // Two images - side by side
    return (
      <div className="photo-grid two">
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
    );
  }
  
  if (images.length === 3) {
    // Three images - one big, two small
    return (
      <div className="photo-grid three">
        <div 
          className="photo-item main"
          onClick={() => onPhotoClick(0)}
        >
          <img src={images[0].url} alt="" />
        </div>
        <div className="side-photos">
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
    );
  }
  
  if (images.length === 4) {
    // Four images - 2x2 grid
    return (
      <div className="photo-grid four">
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
    );
  }
  
  // 5 or more images
  return (
    <div className="photo-grid many">
      <div className="main-row">
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
        ))}
      </div>
      
      {/* Videos section if any */}
      {videos.length > 0 && (
        <div className="videos-row">
          {videos.map((vid, idx) => (
            <div key={idx} className="video-item">
              <video src={vid.url} controls />
            </div>
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
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const images = media.filter(m => m.type === 'image');
  
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
        
        <img src={images[currentIndex].url} alt="" />
        
        {images.length > 1 && (
          <div className="lightbox-counter">
            {currentIndex + 1} / {images.length}
          </div>
        )}
        
        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="lightbox-thumbnails">
            {images.map((img, idx) => (
              <div
                key={idx}
                className={`thumbnail ${idx === currentIndex ? 'active' : ''}`}
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

export default function PostCard({ post, onChanged, currentUserId }: PostCardProps) {
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxStartIndex, setLightboxStartIndex] = useState(0);
  const [showEditMenu, setShowEditMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isCoCreator, setIsCoCreator] = useState(false);
  
  // Check if current user is a co-creator
  useEffect(() => {
    if (currentUserId && post.co_creators) {
      setIsCoCreator(post.co_creators.includes(currentUserId));
    }
  }, [currentUserId, post.co_creators]);
  
  const handlePhotoClick = (index: number) => {
    setLightboxStartIndex(index);
    setShowLightbox(true);
  };
  
  const canEdit = currentUserId === post.user_id || isCoCreator;
  const canDelete = currentUserId === post.user_id; // Only original author can delete
  
  // Format the display name with co-creators
  const getDisplayName = () => {
    // Try different possible field names
    let name = post.author_name || post.user_name || post.full_name || 'User';
    if (post.co_creators && post.co_creators.length > 0) {
      const coCreatorNames = post.co_creator_names || [];
      if (coCreatorNames.length > 0) {
        name += ` with ${coCreatorNames.join(', ')}`;
      }
    }
    return name;
  };
  
  return (
    <>
      <div className="post-card">
        {/* Header */}
        <div className="post-header">
          <div className="author-info">
            <img 
              src={post.author_avatar || '/default-avatar.png'} 
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
              >
                ⋯
              </button>
              {showEditMenu && (
                <div className="menu-dropdown">
                  {isCoCreator && !canDelete && (
                    <>
                      <button className="menu-item" onClick={() => setShowEditModal(true)}>Add Photos</button>
                      <button className="menu-item" onClick={() => setShowEditModal(true)}>Edit My Content</button>
                      <button className="menu-item">Remove Tag</button>
                    </>
                  )}
                  {canDelete && (
                    <>
                      <button className="menu-item" onClick={() => setShowEditModal(true)}>Edit Post</button>
                      <button className="menu-item">Change Privacy</button>
                      <button className="menu-item danger">Delete Post</button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="post-content">
          {post.body && <p className="post-text">{post.body}</p>}
          
          {/* Photo Grid */}
          {post.media && post.media.length > 0 && (
            <PhotoGrid 
              media={post.media} 
              onPhotoClick={handlePhotoClick}
            />
          )}
        </div>
        
        {/* Footer */}
        <div className="post-footer">
          <div className="engagement-stats">
            {post.likes_count > 0 && (
              <span>{post.likes_count} likes</span>
            )}
            {post.comments_count > 0 && (
              <span>{post.comments_count} comments</span>
            )}
          </div>
          
          <div className="action-buttons">
            <button className="action-btn">
              👍 Like
            </button>
            <button className="action-btn">
              💬 Comment
            </button>
            {post.allow_share && (
              <button className="action-btn">
                🔄 Share
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Lightbox */}
      {showLightbox && post.media && (
        <PhotoLightbox
          media={post.media}
          startIndex={lightboxStartIndex}
          onClose={() => setShowLightbox(false)}
        />
      )}
      
      {/* Co-Creator Edit Modal */}
      {showEditModal && (
        <CoCreatorEditModal
          postId={post.id}
          currentUserId={currentUserId || ''}
          isCreator={currentUserId === post.user_id}
          onClose={() => setShowEditModal(false)}
          onUpdate={() => {
            setShowEditModal(false);
            if (onChanged) onChanged();
          }}
        />
      )}
      
      <style jsx>{`
        .post-card {
          background: white;
          border-radius: 0.75rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          margin-bottom: 1rem;
        }
        
        .post-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 1rem;
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
        
        /* Photo Grid Styles */
        .photo-grid {
          margin: 0.5rem 0;
          border-radius: 0.5rem;
          overflow: hidden;
        }
        
        .photo-grid.single .photo-item {
          width: 100%;
          max-height: 500px;
        }
        
        .photo-grid.two {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2px;
        }
        
        .photo-grid.three {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2px;
        }
        
        .photo-grid.three .side-photos {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .photo-grid.four {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
          gap: 2px;
        }
        
        .photo-grid.many .main-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2px;
          margin-bottom: 2px;
        }
        
        .photo-grid.many .bottom-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
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
        
        /* Lightbox Styles */
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
        
        /* Post Footer */
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
        
        /* Menu */
        .post-actions {
          position: relative;
        }
        
        .menu-btn {
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
        }
        
        .menu-dropdown {
          position: absolute;
          right: 0;
          top: 100%;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          min-width: 150px;
          z-index: 10;
        }
        
        .menu-item {
          display: block;
          width: 100%;
          padding: 0.5rem 1rem;
          background: none;
          border: none;
          text-align: left;
          cursor: pointer;
        }
        
        .menu-item:hover {
          background: #f7fafc;
        }
        
        .menu-item.danger {
          color: #e53e3e;
        }
      `}</style>
    </>
  );
}
