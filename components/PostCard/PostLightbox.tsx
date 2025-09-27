// components/PostCard/PostLightbox.tsx - Complete and Enhanced
"use client";

import { useState, useEffect, useCallback } from "react";

interface PostLightboxProps {
  media: Array<{url: string; type: 'image' | 'video'; id?: string}>;
  startIndex: number;
  onClose: () => void;
}

export default function PostLightbox({ 
  media, 
  startIndex, 
  onClose 
}: PostLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  // Filter to images and videos for the lightbox
  const items = media.filter(m => m && (m.type === 'image' || m.type === 'video') && m.url);
  
  if (!items || items.length === 0) {
    onClose();
    return null;
  }
  
  // Ensure index is within bounds
  const safeIndex = Math.max(0, Math.min(currentIndex, items.length - 1));
  const currentItem = items[safeIndex];
  
  if (!currentItem || !currentItem.url) {
    onClose();
    return null;
  }
  
  // Navigation functions
  const goNext = useCallback(() => {
    if (items.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % items.length);
      setIsLoading(true);
      setHasError(false);
    }
  }, [items.length]);
  
  const goPrev = useCallback(() => {
    if (items.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
      setIsLoading(true);
      setHasError(false);
    }
  }, [items.length]);

  const goToIndex = useCallback((index: number) => {
    if (index >= 0 && index < items.length) {
      setCurrentIndex(index);
      setIsLoading(true);
      setHasError(false);
    }
  }, [items.length]);
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          goNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goPrev();
          break;
        case 'Home':
          e.preventDefault();
          goToIndex(0);
          break;
        case 'End':
          e.preventDefault();
          goToIndex(items.length - 1);
          break;
        case 'i':
        case 'I':
          e.preventDefault();
          setShowInfo(!showInfo);
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showInfo, goNext, goPrev, goToIndex, onClose]);

  // Handle touch gestures for mobile
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && items.length > 1) {
      goNext();
    }
    if (isRightSwipe && items.length > 1) {
      goPrev();
    }
  };

  // Handle image/video loading
  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Reset loading state when index changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [currentIndex]);

  // Preload adjacent items for smoother navigation
  useEffect(() => {
    const preloadItems = () => {
      const indicesToPreload = [
        (currentIndex + 1) % items.length,
        (currentIndex - 1 + items.length) % items.length
      ];

      indicesToPreload.forEach(index => {
        if (index !== currentIndex && items[index] && items[index].type === 'image') {
          const img = new Image();
          img.src = items[index].url;
        }
      });
    };

    if (items.length > 1) {
      preloadItems();
    }
  }, [currentIndex, items]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <div 
      className="lightbox-overlay"
      onClick={handleOverlayClick}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="lightbox-content">
        {/* Close button */}
        <button 
          className="lightbox-close" 
          onClick={onClose}
          title="Close (Esc)"
        >
          ×
        </button>

        {/* Info toggle button */}
        <button 
          className="lightbox-info" 
          onClick={() => setShowInfo(!showInfo)}
          title="Toggle info (I)"
        >
          ℹ️
        </button>
        
        {/* Navigation buttons */}
        {items.length > 1 && (
          <>
            <button 
              className="lightbox-prev" 
              onClick={goPrev}
              title="Previous (←)"
              disabled={isLoading}
            >
              ‹
            </button>
            <button 
              className="lightbox-next" 
              onClick={goNext}
              title="Next (→)"
              disabled={isLoading}
            >
              ›
            </button>
          </>
        )}
        
        {/* Main content */}
        <div className="lightbox-image-container">
          {isLoading && (
            <div className="lightbox-loader">
              <div className="spinner"></div>
              <p>Loading {currentItem.type}...</p>
            </div>
          )}
          
          {hasError ? (
            <div className="lightbox-error">
              <p>Failed to load {currentItem.type}</p>
              <button 
                className="retry-btn"
                onClick={() => {
                  setHasError(false);
                  setIsLoading(true);
                }}
              >
                Retry
              </button>
            </div>
          ) : currentItem.type === 'video' ? (
            <video 
              src={currentItem.url} 
              className="lightbox-video"
              controls
              autoPlay
              muted
              onLoadedData={handleLoad}
              onError={handleError}
              style={{ display: isLoading ? 'none' : 'block' }}
            />
          ) : (
            <img 
              src={currentItem.url} 
              alt={`${currentItem.type} ${safeIndex + 1} of ${items.length}`}
              className="lightbox-image"
              onLoad={handleLoad}
              onError={handleError}
              style={{ display: isLoading ? 'none' : 'block' }}
            />
          )}
        </div>
        
        {/* Counter */}
        {items.length > 1 && (
          <div className="lightbox-counter">
            {safeIndex + 1} / {items.length}
          </div>
        )}

        {/* Thumbnail strip for many items */}
        {items.length > 3 && (
          <div className="lightbox-thumbnails">
            <div className="thumbnail-strip">
              {items.map((item, index) => (
                <button
                  key={index}
                  className={`thumbnail ${index === currentIndex ? 'active' : ''}`}
                  onClick={() => goToIndex(index)}
                  title={`Go to ${item.type} ${index + 1}`}
                >
                  {item.type === 'video' ? (
                    <div className="thumbnail-video">
                      <video src={item.url} muted />
                      <div className="video-indicator">▶</div>
                    </div>
                  ) : (
                    <img src={item.url} alt={`Thumbnail ${index + 1}`} />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Extended info panel */}
        {showInfo && (
          <div className="lightbox-info-panel">
            <div className="info-content">
              <h3>{currentItem.type.charAt(0).toUpperCase() + currentItem.type.slice(1)} {safeIndex + 1} of {items.length}</h3>
              <div className="info-details">
                <p><strong>Type:</strong> {currentItem.type}</p>
                <p><strong>Navigation:</strong> Use arrow keys or swipe on mobile</p>
                <div className="info-shortcuts">
                  <p><strong>Shortcuts:</strong></p>
                  <ul>
                    <li>Esc - Close lightbox</li>
                    <li>← → / Space - Navigate</li>
                    <li>Home/End - First/last item</li>
                    <li>I - Toggle info</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile hints */}
        <div className="mobile-hints">
          <div className="swipe-hint">
            {items.length > 1 && 'Swipe left or right to navigate'}
          </div>
        </div>
      </div>

      <style jsx>{`
        .lightbox-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          touch-action: manipulation;
          user-select: none;
        }

        .lightbox-content {
          position: relative;
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .lightbox-close,
        .lightbox-info {
          position: absolute;
          top: 20px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          cursor: pointer;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          z-index: 10;
        }

        .lightbox-close {
          right: 20px;
        }

        .lightbox-info {
          right: 80px;
        }

        .lightbox-close:hover,
        .lightbox-info:hover {
          background: rgba(0,0,0,0.9);
          transform: scale(1.05);
        }

        .lightbox-prev,
        .lightbox-next {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          cursor: pointer;
          font-size: 24px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          transition: all 0.2s ease;
        }

        .lightbox-prev:disabled,
        .lightbox-next:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .lightbox-prev:hover:not(:disabled),
        .lightbox-next:hover:not(:disabled) {
          background: rgba(0,0,0,0.9);
          transform: translateY(-50%) scale(1.05);
        }

        .lightbox-prev {
          left: 20px;
        }

        .lightbox-next {
          right: 20px;
        }

        .lightbox-image-container {
          position: relative;
          max-width: 95vw;
          max-height: 95vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .lightbox-image,
        .lightbox-video {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 8px;
        }

        .lightbox-video {
          background: #000;
        }

        .lightbox-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          color: white;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid rgba(255,255,255,0.3);
          border-top: 4px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .lightbox-loader p {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
        }

        .lightbox-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          color: white;
          text-align: center;
        }

        .lightbox-error p {
          margin: 0;
          font-size: 18px;
          font-weight: 500;
        }

        .retry-btn {
          padding: 12px 24px;
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

        .lightbox-counter {
          position: absolute;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(8px);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
          border: 1px solid rgba(255,255,255,0.2);
        }

        .lightbox-thumbnails {
          position: absolute;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          max-width: 90vw;
          overflow-x: auto;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 12px;
          padding: 12px;
        }

        .thumbnail-strip {
          display: flex;
          gap: 8px;
          padding: 4px;
        }

        .thumbnail {
          width: 80px;
          height: 80px;
          border: 2px solid transparent;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          opacity: 0.7;
          transition: all 0.2s ease;
          background: none;
          padding: 0;
          position: relative;
        }

        .thumbnail.active {
          border-color: #8b5cf6;
          opacity: 1;
          transform: scale(1.05);
        }

        .thumbnail:hover {
          opacity: 1;
          transform: scale(1.02);
        }

        .thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .thumbnail-video {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .thumbnail-video video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .video-indicator {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 16px;
          text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        }

        .lightbox-info-panel {
          position: absolute;
          top: 80px;
          left: 20px;
          background: rgba(0,0,0,0.9);
          backdrop-filter: blur(12px);
          color: white;
          padding: 20px;
          border-radius: 12px;
          max-width: 400px;
          z-index: 10;
          border: 1px solid rgba(255,255,255,0.2);
        }

        .info-content h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .info-details p {
          margin: 0 0 8px 0;
          font-size: 14px;
          line-height: 1.4;
        }

        .info-shortcuts {
          margin-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.2);
          padding-top: 16px;
        }

        .info-shortcuts ul {
          margin: 8px 0 0 0;
          padding-left: 20px;
          font-size: 13px;
          line-height: 1.6;
        }

        .mobile-hints {
          position: absolute;
          bottom: 120px;
          left: 50%;
          transform: translateX(-50%);
          display: none;
        }

        .swipe-hint {
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(8px);
          color: white;
          padding: 8px 16px;
          border-radius: 16px;
          font-size: 13px;
          text-align: center;
          border: 1px solid rgba(255,255,255,0.2);
          white-space: nowrap;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .lightbox-close,
          .lightbox-info {
            top: 10px;
            width: 40px;
            height: 40px;
            font-size: 16px;
          }

          .lightbox-close {
            right: 10px;
          }

          .lightbox-info {
            right: 60px;
          }

          .lightbox-prev,
          .lightbox-next {
            width: 48px;
            height: 48px;
            font-size: 20px;
          }

          .lightbox-prev {
            left: 10px;
          }

          .lightbox-next {
            right: 10px;
          }

          .lightbox-counter {
            bottom: 20px;
            font-size: 13px;
            padding: 6px 12px;
          }

          .lightbox-thumbnails {
            bottom: 60px;
            max-width: 95vw;
            padding: 8px;
          }

          .thumbnail {
            width: 60px;
            height: 60px;
          }

          .lightbox-info-panel {
            top: 60px;
            left: 10px;
            right: 10px;
            max-width: none;
            padding: 16px;
          }

          .info-content h3 {
            font-size: 16px;
            margin-bottom: 12px;
          }

          .info-details p {
            font-size: 13px;
          }

          .info-shortcuts ul {
            font-size: 12px;
          }

          .mobile-hints {
            display: block;
            bottom: 100px;
          }

          .swipe-hint {
            font-size: 12px;
            padding: 6px 12px;
          }

          .lightbox-image-container {
            max-width: 100vw;
            max-height: 100vh;
            padding: 0 10px;
          }
        }

        @media (max-width: 480px) {
          .lightbox-close,
          .lightbox-info {
            top: 5px;
            width: 36px;
            height: 36px;
            font-size: 14px;
          }

          .lightbox-close {
            right: 5px;
          }

          .lightbox-info {
            right: 50px;
          }

          .lightbox-prev,
          .lightbox-next {
            width: 44px;
            height: 44px;
            font-size: 18px;
          }

          .lightbox-prev {
            left: 5px;
          }

          .lightbox-next {
            right: 5px;
          }

          .thumbnail {
            width: 50px;
            height: 50px;
          }

          .lightbox-info-panel {
            top: 50px;
            left: 5px;
            right: 5px;
            padding: 12px;
          }

          .swipe-hint {
            font-size: 11px;
            padding: 4px 8px;
          }
        }

        /* Accessibility */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
