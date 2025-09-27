// components/PostCard/PhotoGrid.tsx - Mobile-Optimized with ALL Features Preserved
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

  // Enhanced photo click with mobile feedback
  const handlePhotoClick = (index: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Mobile touch feedback
    const target = event.currentTarget as HTMLElement;
    target.style.transform = 'scale(0.98)';
    setTimeout(() => {
      target.style.transform = '';
    }, 150);
    
    // Haptic feedback on supported devices
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    onPhotoClick(index);
  };

  // COMPACT MODE - Use existing CSS classes with mobile enhancements
  if (isCompact) {
    if (validMedia.length === 0) return null;
    
    // Single media item
    if (validMedia.length === 1) {
      const item = validMedia[0];
      return (
        <div className={styles.photoGridContainerCompact}>
          <div 
            className={styles.compactSinglePhoto} 
            onClick={(e) => handlePhotoClick(0, e)}
          >
            {item.type === 'video' ? (
              <div className="video-container">
                <video 
                  src={item.url} 
                  className="media-content"
                  muted
                  playsInline
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
                    draggable={false}
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
              <div 
                key={idx} 
                className={styles.compactPhotoItem} 
                onClick={(e) => handlePhotoClick(idx, e)}
              >
                {item.type === 'video' ? (
                  <div className="video-container">
                    <video 
                      src={item.url} 
                      className="media-content"
                      muted
                      playsInline
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
                        draggable={false}
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
            <div 
              className={`${styles.compactPhotoItem} ${styles.main}`} 
              onClick={(e) => handlePhotoClick(0, e)}
            >
              {validMedia[0].type === 'video' ? (
                <div className="video-container">
                  <video 
                    src={validMedia[0].url} 
                    className="media-content"
                    muted
                    playsInline
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
                      draggable={false}
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
                <div 
                  key={idx} 
                  className={styles.compactPhotoItem} 
                  onClick={(e) => handlePhotoClick(idx + 1, e)}
                >
                  {item.type === 'video' ? (
                    <div className="video-container">
                      <video 
                        src={item.url} 
                        className="media-content"
                        muted
                        playsInline
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
                          draggable={false}
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
              <div 
                className={styles.compactPhotoItem} 
                onClick={(e) => handlePhotoClick(0, e)}
              >
                {validMedia[0].type === 'video' ? (
                  <div className="video-container">
                    <video 
                      src={validMedia[0].url} 
                      className="media-content"
                      muted
                      playsInline
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
                        draggable={false}
                        onLoad={() => handleImageLoad(validMedia[0].url)}
                        onError={() => handleImageError(validMedia[0].url)}
                        onLoadStart={() => handleImageLoadStart(validMedia[0].url)}
                        style={{ display: loadingImages.has(validMedia[0].url) ? 'none' : 'block' }}
                      />
                    )}
                  </>
                )}
              </div>
              <div 
                className={styles.compactPhotoItem} 
                onClick={(e) => handlePhotoClick(1, e)}
              >
                {validMedia[1].type === 'video' ? (
                  <div className="video-container">
                    <video 
                      src={validMedia[1].url} 
                      className="media-content"
                      muted
                      playsInline
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
                        draggable={false}
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
              <div 
                className={styles.compactPhotoItem} 
                onClick={(e) => handlePhotoClick(2, e)}
              >
                {validMedia[2].type === 'video' ? (
                  <div className="video-container">
                    <video 
                      src={validMedia[2].url} 
                      className="media-content"
                      muted
                      playsInline
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
                        draggable={false}
                        onLoad={() => handleImageLoad(validMedia[2].url)}
                        onError={() => handleImageError(validMedia[2].url)}
                        onLoadStart={() => handleImageLoadStart(validMedia[2].url)}
                        style={{ display: loadingImages.has(validMedia[2].url) ? 'none' : 'block' }}
                      />
                    )}
                  </>
                )}
              </div>
              <div 
                className={styles.compactPhotoItem} 
                onClick={(e) => handlePhotoClick(3, e)}
              >
                {validMedia[3].type === 'video' ? (
                  <div className="video-container">
                    <video 
                      src={validMedia[3].url} 
                      className="media-content"
                      muted
                      playsInline
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
                        draggable={false}
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
  
  // EXPANDED MODE - Individual media with WORKING interaction buttons + mobile enhancements
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
                  playsInline
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
                      draggable={false}
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
                  // Haptic feedback
                  if ('vibrate' in navigator) {
                    navigator.vibrate(50);
                  }
                  // Use the parent's like function if available
                  if (onLike) {
                    onLike();
                  } else {
                    console.log('Like clicked for:', item.id);
                  }
                }}
                disabled={!currentUserId}
                title="Like this photo"
              >
                <span>🤍</span>
                <span>Like</span>
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
                title="Comment on this photo"
              >
                <span>💬</span>
                <span>Comment</span>
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
                title="Edit caption"
              >
                <span>✏️</span>
                <span>Caption</span>
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
          -webkit-user-drag: none;
          user-select: none;
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
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .video-play-overlay:hover,
        .video-play-overlay-small:hover {
          background: rgba(0,0,0,0.6);
        }

        .play-button {
          width: 60px;
          height: 60px;
          background: rgba(255,255,255,0.95);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: #374151;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          transition: all 0.2s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .play-button-small {
          width: 40px;
          height: 40px;
          background: rgba(255,255,255,0.95);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          color: #374151;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transition: all 0.2s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .play-button:hover,
        .play-button-small:hover {
          background: white;
          transform: scale(1.1);
        }

        .play-button:active,
        .play-button-small:active {
          transform: scale(0.95);
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
          padding: 12px 20px;
          background: #8b5cf6;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
          min-height: 44px;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .retry-btn:hover {
          background: #7c3aed;
          transform: translateY(-1px);
        }

        .retry-btn:active {
          transform: translateY(0);
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Mobile Optimizations */
        @media (max-width: 768px) {
          .play-button {
            width: 50px;
            height: 50px;
            font-size: 20px;
          }

          .play-button-small {
            width: 36px;
            height: 36px;
            font-size: 14px;
          }

          .loading-overlay {
            font-size: 28px;
          }

          .loading-overlay-small {
            font-size: 20px;
          }

          .individual-error span {
            font-size: 40px;
          }

          .retry-btn {
            padding: 10px 16px;
            font-size: 13px;
          }
        }

        @media (max-width: 480px) {
          .play-button {
            width: 44px;
            height: 44px;
            font-size: 18px;
          }

          .play-button-small {
            width: 32px;
            height: 32px;
            font-size: 12px;
          }

          .individual-error span {
            font-size: 32px;
          }

          .individual-error p {
            font-size: 14px;
          }

          .retry-btn {
            padding: 8px 14px;
            font-size: 12px;
          }
        }

        /* Touch device optimizations */
        @media (hover: none) and (pointer: coarse) {
          .video-play-overlay,
          .video-play-overlay-small,
          .play-button,
          .play-button-small,
          .retry-btn {
            -webkit-tap-highlight-color: rgba(139, 92, 246, 0.1);
          }
        }
      `}</style>
    </div>
  );
}
