// components/PostCard/PhotoGrid.tsx - Fixed with working interactions
"use client";

import { useState } from "react";
import styles from "./styles.module.css";

interface PhotoGridProps {
  media: Array<{url: string; type: 'image' | 'video'; id?: string}>;
  onPhotoClick: (index: number) => void;
  isCompact?: boolean;
  onIndividualPhotoClick?: (photo: {url: string; type: 'image' | 'video'; id?: string}) => void;
  // Add these props to connect to parent functions
  onLike?: () => void;
  currentUserId?: string;
  showCommentInput?: boolean;
  onToggleCommentInput?: () => void;
}

export default function PhotoGrid({ 
  media, 
  onPhotoClick,
  isCompact = false,
  onIndividualPhotoClick,
  onLike,
  currentUserId,
  showCommentInput,
  onToggleCommentInput
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

  // COMPACT MODE - Use existing CSS classes
  if (isCompact) {
    if (validMedia.length === 0) return null;
    
    // Single media item
    if (validMedia.length === 1) {
      const item = validMedia[0];
      return (
        <div className={styles.photoGridContainerCompact}>
          <div className={styles.compactSinglePhoto} onClick={() => onPhotoClick(0)}>
            {item.type === 'video' ? (
              <div className="video-container">
                <video 
                  src={item.url} 
                  className="media-content"
                  muted
                  preload="metadata"
                />
                <div className="video-play-overlay">
                  <div className="play-button">▶</div>
                </div>
              </div>
            ) : (
              <>
                {loadingImages.has(item.url) && (
                  <div className="loading-overlay">
                    <div className="loading-spinner">📸</div>
                  </div>
                )}
                {failedImages.has(item.url) ? (
                  <div className="error-overlay">
                    <span>🖼️</span>
                    <p>Image unavailable</p>
                  </div>
                ) : (
                  <img 
                    src={item.url} 
                    alt="" 
                    onLoad={() => handleImageLoad(item.url)}
                    onError={() => handleImageError(item.url)}
                    onLoadStart={() => handleImageLoadStart(item.url)}
                    style={{ display: loadingImages.has(item.url) ? 'none' : 'block' }}
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
        <div className={styles.photoGridContainerCompact}>
          <div className={styles.compactTwoPhotos}>
            {validMedia.map((item, idx) => (
              <div key={idx} className={styles.compactPhotoItem} onClick={() => onPhotoClick(idx)}>
                {item.type === 'video' ? (
                  <div className="video-container">
                    <video 
                      src={item.url} 
                      className="media-content"
                      muted
                      preload="metadata"
                    />
                    <div className="video-play-overlay-small">
                      <div className="play-button-small">▶</div>
                    </div>
                  </div>
                ) : (
                  <>
                    {loadingImages.has(item.url) && (
                      <div className="loading-overlay-small">📸</div>
                    )}
                    {failedImages.has(item.url) ? (
                      <div className="error-overlay-small">🖼️</div>
                    ) : (
                      <img 
                        src={item.url} 
                        alt="" 
                        onLoad={() => handleImageLoad(item.url)}
                        onError={() => handleImageError(item.url)}
                        onLoadStart={() => handleImageLoadStart(item.url)}
                        style={{ display: loadingImages.has(item.url) ? 'none' : 'block' }}
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
        <div className={styles.photoGridContainerCompact}>
          <div className={styles.compactThreePhotos}>
            <div className={`${styles.compactPhotoItem} ${styles.main}`} onClick={() => onPhotoClick(0)}>
              {validMedia[0].type === 'video' ? (
                <div className="video-container">
                  <video 
                    src={validMedia[0].url} 
                    className="media-content"
                    muted
                    preload="metadata"
                  />
                  <div className="video-play-overlay">
                    <div className="play-button">▶</div>
                  </div>
                </div>
              ) : (
                <>
                  {loadingImages.has(validMedia[0].url) && (
                    <div className="loading-overlay">📸</div>
                  )}
                  {failedImages.has(validMedia[0].url) ? (
                    <div className="error-overlay">
                      <span>🖼️</span>
                      <p>Error</p>
                    </div>
                  ) : (
                    <img 
                      src={validMedia[0].url} 
                      alt="" 
                      onLoad={() => handleImageLoad(validMedia[0].url)}
                      onError={() => handleImageError(validMedia[0].url)}
                      onLoadStart={() => handleImageLoadStart(validMedia[0].url)}
                      style={{ display: loadingImages.has(validMedia[0].url) ? 'none' : 'block' }}
                    />
                  )}
                </>
              )}
            </div>
            <div className={styles.compactSideStack}>
              {validMedia.slice(1, 3).map((item, idx) => (
                <div key={idx} className={styles.compactPhotoItem} onClick={() => onPhotoClick(idx + 1)}>
                  {item.type === 'video' ? (
                    <div className="video-container">
                      <video 
                        src={item.url} 
                        className="media-content"
                        muted
                        preload="metadata"
                      />
                      <div className="video-play-overlay-small">
                        <div className="play-button-small">▶</div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {loadingImages.has(item.url) && (
                        <div className="loading-overlay-small">📸</div>
                      )}
                      {failedImages.has(item.url) ? (
                        <div className="error-overlay-small">🖼️</div>
                      ) : (
                        <img 
                          src={item.url} 
                          alt="" 
                          onLoad={() => handleImageLoad(item.url)}
                          onError={() => handleImageError(item.url)}
                          onLoadStart={() => handleImageLoadStart(item.url)}
                          style={{ display: loadingImages.has(item.url) ? 'none' : 'block' }}
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
        <div className={styles.photoGridContainerCompact}>
          <div className={styles.compactManyPhotos}>
            <div className={styles.compactTopRow}>
              <div className={styles.compactPhotoItem} onClick={() => onPhotoClick(0)}>
                {validMedia[0].type === 'video' ? (
                  <div className="video-container">
                    <video 
                      src={validMedia[0].url} 
                      className="media-content"
                      muted
                      preload="metadata"
                    />
                    <div className="video-play-overlay-small">
                      <div className="play-button-small">▶</div>
                    </div>
                  </div>
                ) : (
                  <>
                    {loadingImages.has(validMedia[0].url) && (
                      <div className="loading-overlay-small">📸</div>
                    )}
                    {failedImages.has(validMedia[0].url) ? (
                      <div className="error-overlay-small">🖼️</div>
                    ) : (
                      <img 
                        src={validMedia[0].url} 
                        alt="" 
                        onLoad={() => handleImageLoad(validMedia[0].url)}
                        onError={() => handleImageError(validMedia[0].url)}
                        onLoadStart={() => handleImageLoadStart(validMedia[0].url)}
                        style={{ display: loadingImages.has(validMedia[0].url) ? 'none' : 'block' }}
                      />
                    )}
                  </>
                )}
              </div>
              <div className={styles.compactPhotoItem} onClick={() => onPhotoClick(1)}>
                {validMedia[1].type === 'video' ? (
                  <div className="video-container">
                    <video 
                      src={validMedia[1].url} 
                      className="media-content"
                      muted
                      preload="metadata"
                    />
                    <div className="video-play-overlay-small">
                      <div className="play-button-small">▶</div>
                    </div>
                  </div>
                ) : (
                  <>
                    {loadingImages.has(validMedia[1].url) && (
                      <div className="loading-overlay-small">📸</div>
                    )}
                    {failedImages.has(validMedia[1].url) ? (
                      <div className="error-overlay-small">🖼️</div>
                    ) : (
                      <img 
                        src={validMedia[1].url} 
                        alt="" 
                        onLoad={() => handleImageLoad(validMedia[1].url)}
                        onError={() => handleImageError(validMedia[1].url)}
                        onLoadStart={() => handleImageLoadStart(validMedia[1].url)}
                        style={{ display: loadingImages.has(validMedia[1].url) ? 'none' : 'block' }}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
            <div className={styles.compactBottomRow}>
              <div className={styles.compactPhotoItem} onClick={() => onPhotoClick(2)}>
                {validMedia[2].type === 'video' ? (
                  <div className="video-container">
                    <video 
                      src={validMedia[2].url} 
                      className="media-content"
                      muted
                      preload="metadata"
                    />
                    <div className="video-play-overlay-small">
                      <div className="play-button-small">▶</div>
                    </div>
                  </div>
                ) : (
                  <>
                    {loadingImages.has(validMedia[2].url) && (
                      <div className="loading-overlay-small">📸</div>
                    )}
                    {failedImages.has(validMedia[2].url) ? (
                      <div className="error-overlay-small">🖼️</div>
                    ) : (
                      <img 
                        src={validMedia[2].url} 
                        alt="" 
                        onLoad={() => handleImageLoad(validMedia[2].url)}
                        onError={() => handleImageError(validMedia[2].url)}
                        onLoadStart={() => handleImageLoadStart(validMedia[2].url)}
                        style={{ display: loadingImages.has(validMedia[2].url) ? 'none' : 'block' }}
                      />
                    )}
                  </>
                )}
              </div>
              <div className={styles.compactPhotoItem} onClick={() => onPhotoClick(3)}>
                {validMedia[3].type === 'video' ? (
                  <div className="video-container">
                    <video 
                      src={validMedia[3].url} 
                      className="media-content"
                      muted
                      preload="metadata"
                    />
                    <div className="video-play-overlay-small">
                      <div className="play-button-small">▶</div>
                    </div>
                  </div>
                ) : (
                  <>
                    {loadingImages.has(validMedia[3].url) && (
                      <div className="loading-overlay-small">📸</div>
                    )}
                    {failedImages.has(validMedia[3].url) ? (
                      <div className="error-overlay-small">🖼️</div>
                    ) : (
                      <img 
                        src={validMedia[3].url} 
                        alt="" 
                        onLoad={() => handleImageLoad(validMedia[3].url)}
                        onError={() => handleImageError(validMedia[3].url)}
                        onLoadStart={() => handleImageLoadStart(validMedia[3].url)}
                        style={{ display: loadingImages.has(validMedia[3].url) ? 'none' : 'block' }}
                      />
                    )}
                  </>
                )}
                {validMedia.length > 4 && (
                  <div className={styles.morePhotosOverlay}>
                    +{validMedia.length - 4}
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
  
  // EXPANDED MODE - Individual media with WORKING interaction buttons
  return (
    <div className={styles.photoGridExpanded}>
      {validMedia.map((item, idx) => (
        <div key={idx} className={styles.individualPhotoContainer}>
          <div className={styles.photoWrapper}>
            <div className={styles.photoBorder}>
              {item.type === 'video' ? (
                <video 
                  src={item.url} 
                  className={styles.individualPhoto}
                  controls
                  preload="metadata"
                  onClick={() => onPhotoClick(idx)}
                />
              ) : (
                <>
                  {loadingImages.has(item.url) && (
                    <div className="individual-loading">
                      <div className="loading-spinner-big"></div>
                      <p>Loading image...</p>
                    </div>
                  )}
                  {failedImages.has(item.url) ? (
                    <div className="individual-error">
                      <span>🖼️</span>
                      <p>Image unavailable</p>
                      <button 
                        className="retry-btn"
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
                      className={styles.individualPhoto}
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
            <div className={styles.photoInteractionBar}>
              <button 
                className={styles.photoInteractBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  // Use the parent's like function if available
                  if (onLike) {
                    onLike();
                  } else {
                    console.log('Like clicked for:', item.id);
                  }
                }}
                disabled={!currentUserId}
              >
                🤍 Like
              </button>
              <button 
                className={styles.photoInteractBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  // Use the parent's comment toggle function if available
                  if (onToggleCommentInput) {
                    onToggleCommentInput();
                  } else if (onIndividualPhotoClick) {
                    onIndividualPhotoClick(item);
                  }
                }}
                disabled={!currentUserId}
              >
                💬 Comment
              </button>
              <button 
                className={styles.photoInteractBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  // For now, just open the individual photo modal for caption editing
                  if (onIndividualPhotoClick) {
                    onIndividualPhotoClick(item);
                  }
                }}
                disabled={!currentUserId}
              >
                ✏️ Caption
              </button>
            </div>
          </div>
        </div>
      ))}

      <style jsx>{`
        .video-container {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .media-content {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .video-play-overlay,
        .video-play-overlay-small {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease;
        }

        .video-play-overlay:hover,
        .video-play-overlay-small:hover {
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

        .loading-overlay,
        .loading-overlay-small {
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

        .loading-overlay-small {
          font-size: 24px;
        }

        .error-overlay,
        .error-overlay-small {
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

        .error-overlay span {
          font-size: 28px;
          margin-bottom: 8px;
        }

        .error-overlay p {
          margin: 0;
          font-size: 12px;
          font-weight: 500;
        }

        .error-overlay-small {
          font-size: 20px;
        }

        .individual-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          color: #6b7280;
          gap: 16px;
        }

        .loading-spinner-big {
          width: 40px;
          height: 40px;
          border: 3px solid #f3f4f6;
          border-top: 3px solid #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .individual-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          color: #6b7280;
          text-align: center;
          gap: 12px;
        }

        .individual-error span {
          font-size: 48px;
        }

        .individual-error p {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
        }

        .retry-btn {
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

        .retry-btn:hover {
          background: #7c3aed;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
