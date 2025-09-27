// components/PostCard/PhotoGrid.tsx - Enhanced with better mobile UX
"use client";

import { useState } from "react";

interface PhotoGridProps {
  media: Array<{url: string; type: 'image' | 'video'; id?: string}>;
  onPhotoClick: (index: number) => void;
  isCompact?: boolean;
  onIndividualPhotoClick?: (photo: {url: string; type: 'image' | 'video'; id?: string}) => void;
}

export default function PhotoGrid({ 
  media, 
  onPhotoClick,
  isCompact = false,
  onIndividualPhotoClick
}: PhotoGridProps) {
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  if (!media || !Array.isArray(media) || media.length === 0) {
    return null;
  }
  
  const validMedia = media.filter(m => {
    return m && typeof m === 'object' && m.url && typeof m.url === 'string' && m.type;
  });
  
  if (validMedia.length === 0) return null;
  
  const images = validMedia.filter(m => m.type === 'image');
  const videos = validMedia.filter(m => m.type === 'video');
  
  const handleImageLoad = (url: string) => {
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(url);
      return newSet;
    });
  };

  const handleImageError = (url: string) => {
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(url);
      return newSet;
    });
    setFailedImages(prev => new Set(prev).add(url));
  };

  const handleImageLoadStart = (url: string) => {
    setLoadingImages(prev => new Set(prev).add(url));
  };

  // COMPACT MODE - Clean grid with better loading states
  if (isCompact) {
    if (images.length === 0 && videos.length === 0) return null;
    
    // Single media item
    if (validMedia.length === 1) {
      const item = validMedia[0];
      return (
        <div className="photo-grid-container-compact">
          <div className="compact-single-media" onClick={() => onPhotoClick(0)}>
            {item.type === 'video' ? (
              <div className="video-thumbnail">
                <video 
                  src={item.url} 
                  className="media-content"
                  muted
                  preload="metadata"
                />
                <div className="video-overlay">
                  <div className="play-button">▶</div>
                </div>
              </div>
            ) : (
              <>
                {loadingImages.has(item.url) && <div className="image-loading">📸</div>}
                {failedImages.has(item.url) ? (
                  <div className="image-failed">
                    <span>🖼️</span>
                    <p>Image unavailable</p>
                  </div>
                ) : (
                  <img 
                    src={item.url} 
                    alt="" 
                    className="media-content"
                    onLoad={() => handleImageLoad(item.url)}
                    onError={() => handleImageError(item.url)}
                    onLoadStart={() => handleImageLoadStart(item.url)}
                  />
                )}
              </>
            )}
          </div>
        </div>
      );
    }
    
    // Two items side by side
    if (validMedia.length === 2) {
      return (
        <div className="photo-grid-container-compact">
          <div className="compact-two-media">
            {validMedia.map((item, idx) => (
              <div key={idx} className="compact-media-item" onClick={() => onPhotoClick(idx)}>
                {item.type === 'video' ? (
                  <div className="video-thumbnail">
                    <video 
                      src={item.url} 
                      className="media-content"
                      muted
                      preload="metadata"
                    />
                    <div className="video-overlay-small">
                      <div className="play-button-small">▶</div>
                    </div>
                  </div>
                ) : (
                  <>
                    {loadingImages.has(item.url) && <div className="image-loading-small">📸</div>}
                    {failedImages.has(item.url) ? (
                      <div className="image-failed-small">🖼️</div>
                    ) : (
                      <img 
                        src={item.url} 
                        alt="" 
                        className="media-content"
                        onLoad={() => handleImageLoad(item.url)}
                        onError={() => handleImageError(item.url)}
                        onLoadStart={() => handleImageLoadStart(item.url)}
                      />
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    // Three items - one large, two stacked
    if (validMedia.length === 3) {
      return (
        <div className="photo-grid-container-compact">
          <div className="compact-three-media">
            <div className="compact-media-item main" onClick={() => onPhotoClick(0)}>
              {validMedia[0].type === 'video' ? (
                <div className="video-thumbnail">
                  <video 
                    src={validMedia[0].url} 
                    className="media-content"
                    muted
                    preload="metadata"
                  />
                  <div className="video-overlay">
                    <div className="play-button">▶</div>
                  </div>
                </div>
              ) : (
                <>
                  {loadingImages.has(validMedia[0].url) && <div className="image-loading">📸</div>}
                  {failedImages.has(validMedia[0].url) ? (
                    <div className="image-failed">
                      <span>🖼️</span>
                      <p>Image unavailable</p>
                    </div>
                  ) : (
                    <img 
                      src={validMedia[0].url} 
                      alt="" 
                      className="media-content"
                      onLoad={() => handleImageLoad(validMedia[0].url)}
                      onError={() => handleImageError(validMedia[0].url)}
                      onLoadStart={() => handleImageLoadStart(validMedia[0].url)}
                    />
                  )}
                </>
              )}
            </div>
            <div className="compact-side-stack">
              {validMedia.slice(1, 3).map((item, idx) => (
                <div key={idx} className="compact-media-item" onClick={() => onPhotoClick(idx + 1)}>
                  {item.type === 'video' ? (
                    <div className="video-thumbnail">
                      <video 
                        src={item.url} 
                        className="media-content"
                        muted
                        preload="metadata"
                      />
                      <div className="video-overlay-small">
                        <div className="play-button-small">▶</div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {loadingImages.has(item.url) && <div className="image-loading-small">📸</div>}
                      {failedImages.has(item.url) ? (
                        <div className="image-failed-small">🖼️</div>
                      ) : (
                        <img 
                          src={item.url} 
                          alt="" 
                          className="media-content"
                          onLoad={() => handleImageLoad(item.url)}
                          onError={() => handleImageError(item.url)}
                          onLoadStart={() => handleImageLoadStart(item.url)}
                        />
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    
    // Four or more items
    if (validMedia.length >= 4) {
      return (
        <div className="photo-grid-container-compact">
          <div className="compact-many-media">
            <div className="compact-top-row">
              <div className="compact-media-item" onClick={() => onPhotoClick(0)}>
                {validMedia[0].type === 'video' ? (
                  <div className="video-thumbnail">
                    <video 
                      src={validMedia[0].url} 
                      className="media-content"
                      muted
                      preload="metadata"
                    />
                    <div className="video-overlay-small">
                      <div className="play-button-small">▶</div>
                    </div>
                  </div>
                ) : (
                  <>
                    {loadingImages.has(validMedia[0].url) && <div className="image-loading-small">📸</div>}
                    {failedImages.has(validMedia[0].url) ? (
                      <div className="image-failed-small">🖼️</div>
                    ) : (
                      <img 
                        src={validMedia[0].url} 
                        alt="" 
                        className="media-content"
                        onLoad={() => handleImageLoad(validMedia[0].url)}
                        onError={() => handleImageError(validMedia[0].url)}
                        onLoadStart={() => handleImageLoadStart(validMedia[0].url)}
                      />
                    )}
                  </>
                )}
              </div>
              <div className="compact-media-item" onClick={() => onPhotoClick(1)}>
                {validMedia[1].type === 'video' ? (
                  <div className="video-thumbnail">
                    <video 
                      src={validMedia[1].url} 
                      className="media-content"
                      muted
                      preload="metadata"
                    />
                    <div className="video-overlay-small">
                      <div className="play-button-small">▶</div>
                    </div>
                  </div>
                ) : (
                  <>
                    {loadingImages.has(validMedia[1].url) && <div className="image-loading-small">📸</div>}
                    {failedImages.has(validMedia[1].url) ? (
                      <div className="image-failed-small">🖼️</div>
                    ) : (
                      <img 
                        src={validMedia[1].url} 
                        alt="" 
                        className="media-content"
                        onLoad={() => handleImageLoad(validMedia[1].url)}
                        onError={() => handleImageError(validMedia[1].url)}
                        onLoadStart={() => handleImageLoadStart(validMedia[1].url)}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="compact-bottom-row">
              <div className="compact-media-item" onClick={() => onPhotoClick(2)}>
                {validMedia[2].type === 'video' ? (
                  <div className="video-thumbnail">
                    <video 
                      src={validMedia[2].url} 
                      className="media-content"
                      muted
                      preload="metadata"
                    />
                    <div className="video-overlay-small">
                      <div className="play-button-small">▶</div>
                    </div>
                  </div>
                ) : (
                  <>
                    {loadingImages.has(validMedia[2].url) && <div className="image-loading-small">📸</div>}
                    {failedImages.has(validMedia[2].url) ? (
                      <div className="image-failed-small">🖼️</div>
                    ) : (
                      <img 
                        src={validMedia[2].url} 
                        alt="" 
                        className="media-content"
                        onLoad={() => handleImageLoad(validMedia[2].url)}
                        onError={() => handleImageError(validMedia[2].url)}
                        onLoadStart={() => handleImageLoadStart(validMedia[2].url)}
                      />
                    )}
                  </>
                )}
              </div>
              <div className="compact-media-item" onClick={() => onPhotoClick(3)}>
                {validMedia[3].type === 'video' ? (
                  <div className="video-thumbnail">
                    <video 
                      src={validMedia[3].url} 
                      className="media-content"
                      muted
                      preload="metadata"
                    />
                    <div className="video-overlay-small">
                      <div className="play-button-small">▶</div>
                    </div>
                  </div>
                ) : (
                  <>
                    {loadingImages.has(validMedia[3].url) && <div className="image-loading-small">📸</div>}
                    {failedImages.has(validMedia[3].url) ? (
                      <div className="image-failed-small">🖼️</div>
                    ) : (
                      <img 
                        src={validMedia[3].url} 
                        alt="" 
                        className="media-content"
                        onLoad={() => handleImageLoad(validMedia[3].url)}
                        onError={() => handleImageError(validMedia[3].url)}
                        onLoadStart={() => handleImageLoadStart(validMedia[3].url)}
                      />
                    )}
                  </>
                )}
                {validMedia.length > 4 && (
                  <div className="more-media-overlay">
                    <span>+{validMedia.length - 4}</span>
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
  
  // EXPANDED MODE - Individual media with improved interactions
  return (
    <div className="photo-grid-expanded">
      {validMedia.map((item, idx) => (
        <div key={idx} className="individual-media-container">
          <div className="media-wrapper">
            <div className="media-border">
              {item.type === 'video' ? (
                <div className="video-container">
                  <video 
                    src={item.url} 
                    className="individual-video"
                    controls
                    preload="metadata"
                    onClick={() => onPhotoClick(idx)}
                  />
                </div>
              ) : (
                <>
                  {loadingImages.has(item.url) && (
                    <div className="individual-loading">
                      <div className="loading-spinner"></div>
                      <p>Loading image...</p>
                    </div>
                  )}
                  {failedImages.has(item.url) ? (
                    <div className="individual-failed">
                      <span>🖼️</span>
                      <p>Image unavailable</p>
                      <button 
                        className="retry-button"
                        onClick={() => {
                          setFailedImages(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(item.url);
                            return newSet;
                          });
                          handleImageLoadStart(item.url);
                        }}
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    <img 
                      src={item.url} 
                      alt="" 
                      className="individual-photo"
                      onClick={() => onPhotoClick(idx)}
                      onLoad={() => handleImageLoad(item.url)}
                      onError={() => handleImageError(item.url)}
                      onLoadStart={() => handleImageLoadStart(item.url)}
                      style={{ display: loadingImages.has(item.url) ? 'none' : 'block' }}
                    />
                  )}
                </>
              )}
            </div>
            <div className="media-interaction-bar">
              <button 
                className="media-interact-btn like-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Handle individual media like
                  console.log('Like media:', item.id);
                }}
                aria-label={`Like this ${item.type}`}
              >
                <span className="btn-icon">🤍</span>
                <span className="btn-text">Like</span>
              </button>
              <button 
                className="media-interact-btn comment-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onIndividualPhotoClick?.(item);
                }}
                aria-label={`Comment on this ${item.type}`}
              >
                <span className="btn-icon">💬</span>
                <span className="btn-text">Comment</span>
              </button>
              <button 
                className="media-interact-btn caption-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Handle add/edit caption
                  console.log('Edit caption for:', item.id);
                }}
                aria-label={`Edit caption for this ${item.type}`}
              >
                <span className="btn-icon">✏️</span>
                <span className="btn-text">Caption</span>
              </button>
              <button 
                className="media-interact-btn delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete this ${item.type}?`)) {
                    // TODO: Handle delete media
                    console.log('Delete media:', item.id);
                  }
                }}
                aria-label={`Delete this ${item.type}`}
              >
                <span className="btn-icon">🗑️</span>
                <span className="btn-text">Delete</span>
              </button>
            </div>
          </div>
        </div>
      ))}

      <style jsx>{`
        /* Compact Grid Styles */
        .photo-grid-container-compact {
          margin: 8px 20px 16px;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          background: white;
          min-height: 320px;
          position: relative;
        }

        .compact-single-media {
          width: 100%;
          height: 320px;
          cursor: pointer;
          overflow: hidden;
          border-radius: 16px;
          position: relative;
        }

        .compact-two-media {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          height: 280px;
        }

        .compact-three-media {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          height: 280px;
        }

        .compact-side-stack {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .compact-many-media {
          height: 280px;
        }

        .compact-top-row,
        .compact-bottom-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          height: calc(50% - 2px);
        }

        .compact-bottom-row {
          margin-top: 4px;
        }

        .compact-media-item {
          position: relative;
          cursor: pointer;
          overflow: hidden;
          background: #f7fafc;
          border-radius: 12px;
          transition: transform 0.2s ease;
        }

        .compact-media-item:hover {
          transform: scale(1.02);
        }

        .compact-media-item.main {
          grid-row: 1 / 3;
        }

        .media-content {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .compact-media-item:hover .media-content {
          transform: scale(1.05);
        }

        /* Video Overlay Styles */
        .video-thumbnail {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .video-overlay,
        .video-overlay-small {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease;
        }

        .video-overlay:hover,
        .video-overlay-small:hover {
          background: rgba(0,0,0,0.6);
        }

        .play-button {
          width: 60px;
          height: 60px;
          background: rgba(255,255,255,0.9);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: #374151;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          transition: all 0.2s ease;
        }

        .play-button-small {
          width: 40px;
          height: 40px;
          background: rgba(255,255,255,0.9);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          color: #374151;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        .play-button:hover,
        .play-button-small:hover {
          background: white;
          transform: scale(1.1);
        }

        /* Loading States */
        .image-loading,
        .image-loading-small {
          position: absolute;
          inset: 0;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          color: #9ca3af;
          animation: pulse 2s infinite;
        }

        .image-loading-small {
          font-size: 24px;
        }

        .image-failed,
        .image-failed-small {
          position: absolute;
          inset: 0;
          background: #fef2f2;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          text-align: center;
          padding: 12px;
        }

        .image-failed span,
        .image-failed-small {
          font-size: 28px;
          margin-bottom: 8px;
        }

        .image-failed p {
          margin: 0;
          font-size: 12px;
          font-weight: 500;
        }

        .more-media-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
          font-weight: 700;
          backdrop-filter: blur(2px);
        }

        /* Expanded Grid Styles */
        .photo-grid-expanded {
          padding: 0 24px 20px;
        }

        .individual-media-container {
          margin-bottom: 28px;
        }

        .media-wrapper {
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 6px 20px rgba(0,0,0,0.1);
          border: 1px solid #f3f4f6;
          transition: all 0.3s ease;
        }

        .media-wrapper:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.15);
        }

        .media-border {
          padding: 8px;
          background: linear-gradient(45deg, #f8fafc, #f1f5f9);
          border-radius: 20px;
        }

        .individual-photo,
        .individual-video {
          width: 100%;
          height: auto;
          max-height: 600px;
          object-fit: contain;
          cursor: pointer;
          border-radius: 16px;
          background: white;
          transition: transform 0.3s ease;
          display: block;
        }

        .individual-photo:hover {
          transform: scale(1.02);
        }

        .video-container {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
        }

        .individual-video {
          max-height: 600px;
          background: #000;
        }

        /* Loading States for Individual Media */
        .individual-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          color: #6b7280;
          gap: 16px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #f3f4f6;
          border-top: 3px solid #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .individual-failed {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          color: #6b7280;
          text-align: center;
          gap: 12px;
        }

        .individual-failed span {
          font-size: 48px;
        }

        .individual-failed p {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
        }

        .retry-button {
          padding: 8px 16px;
          background: #8b5cf6;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.2s ease;
        }

        .retry-button:hover {
          background: #7c3aed;
        }

        /* Interaction Bar */
        .media-interaction-bar {
          display: flex;
          justify-content: space-around;
          padding: 20px;
          background: #fafafa;
          border-top: 1px solid #f3f4f6;
        }

        .media-interact-btn {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 24px;
          padding: 12px 16px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          color: #4a5568;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          min-width: 80px;
          justify-content: center;
        }

        .media-interact-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.1);
        }

        .like-btn:hover {
          background: #fef2f2;
          border-color: #dc2626;
          color: #dc2626;
        }

        .comment-btn:hover {
          background: #eff6ff;
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .caption-btn:hover {
          background: #f0fdf4;
          border-color: #16a34a;
          color: #16a34a;
        }

        .delete-btn:hover {
          background: #fef2f2;
          border-color: #dc2626;
          color: #dc2626;
        }

        .btn-icon {
          font-size: 16px;
        }

        .btn-text {
          font-size: 13px;
        }

        /* Animations */
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .photo-grid-container-compact {
            margin: 8px 16px 12px;
            min-height: 240px;
          }

          .compact-single-media {
            height: 240px;
          }

          .compact-two-media,
          .compact-three-media,
          .compact-many-media {
            height: 200px;
          }

          .photo-grid-expanded {
            padding: 0 16px 16px;
          }

          .individual-media-container {
            margin-bottom: 20px;
          }

          .media-wrapper {
            border-radius: 16px;
          }

          .media-border {
            padding: 6px;
            border-radius: 16px;
          }

          .individual-photo,
          .individual-video {
            max-height: 400px;
            border-radius: 12px;
          }

          .media-interaction-bar {
            padding: 16px 12px;
            gap: 8px;
          }

          .media-interact-btn {
            padding: 10px 12px;
            font-size: 13px;
            min-width: 70px;
            flex-direction: column;
            gap: 4px;
          }

          .btn-text {
            font-size: 11px;
          }

          .btn-icon {
            font-size: 14px;
          }

          .play-button {
            width: 50px;
            height: 50px;
            font-size: 20px;
          }

          .play-button-small {
            width: 32px;
            height: 32px;
            font-size: 14px;
          }
        }

        @media (max-width: 480px) {
          .compact-single-media {
            height: 200px;
          }

          .compact-two-media,
          .compact-three-media,
          .compact-many-media {
            height: 180px;
          }

          .individual-photo,
          .individual-video {
            max-height: 300px;
          }

          .media-interaction-bar {
            padding: 12px 8px;
            flex-wrap: wrap;
            gap: 6px;
          }

          .media-interact-btn {
            padding: 8px 10px;
            font-size: 12px;
            min-width: 60px;
            flex: 1;
          }

          .btn-text {
            font-size: 10px;
          }

          .play-button {
            width: 40px;
            height: 40px;
            font-size: 16px;
          }

          .play-button-small {
            width: 28px;
            height: 28px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}
