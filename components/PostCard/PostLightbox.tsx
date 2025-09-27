// components/PostCard/PostLightbox.tsx - Mobile-Optimized with Enhanced Touch
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
  const [showControls, setShowControls] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [showHint, setShowHint] = useState(true);
  
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
      setShowHint(false);
    }
  }, [items.length]);
  
  const goPrev = useCallback(() => {
    if (items.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
      setIsLoading(true);
      setHasError(false);
      setShowHint(false);
    }
  }, [items.length]);

  const goToIndex = useCallback((index: number) => {
    if (index >= 0 && index < items.length) {
      setCurrentIndex(index);
      setIsLoading(true);
      setHasError(false);
      setShowHint(false);
    }
  }, [items.length]);
  
  // Auto-hide controls on mobile
  useEffect(() => {
    if (!showControls) return;
    
    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [showControls, currentIndex]);

  // Hide hint after a few seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHint(false);
    }, 4000);
    
    return () => clearTimeout(timer);
  }, []);
  
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

  // Enhanced touch gestures with visual feedback
  const minSwipeDistance = 50;
  const maxVerticalDistance = 100;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(false);
    setDragOffset(0);
    setShowControls(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const currentTouch = e.targetTouches[0].clientX;
    const currentTouchY = e.targetTouches[0].clientY;
    
    if (!touchStart) return;
    
    const deltaX = currentTouch - touchStart;
    const deltaY = Math.abs(currentTouchY - e.targetTouches[0].clientY);
    
    // Only track horizontal movement if vertical movement is minimal
    if (deltaY < maxVerticalDistance) {
      setTouchEnd(currentTouch);
      setIsDragging(true);
      
      // Limit drag offset for visual feedback
      const maxOffset = window.innerWidth * 0.3;
      setDragOffset(Math.max(-maxOffset, Math.min(maxOffset, deltaX * 0.5)));
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && items.length > 1) {
      goNext();
    } else if (isRightSwipe && items.length > 1) {
      goPrev();
    }
    
    // Reset drag state
    setIsDragging(false);
    setDragOffset(0);
  };

  // Handle tap to toggle controls
  const handleContentTap = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowControls(!showControls);
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
      <div 
        className="lightbox-content"
        onClick={handleContentTap}
        style={{
          transform: isDragging ? `translateX(${dragOffset}px)` : 'none',
          transition: isDragging ? 'none' : 'transform 0.3s ease'
        }}
      >
        {/* Close button */}
        <button 
          className={`lightbox-close ${showControls ? 'visible' : ''}`}
          onClick={onClose}
          title="Close (Esc)"
        >
          ✕
        </button>

        {/* Info toggle button */}
        <button 
          className={`lightbox-info ${showControls ? 'visible' : ''}`}
          onClick={() => setShowInfo(!showInfo)}
          title="Toggle info (I)"
        >
          ℹ️
        </button>
        
        {/* Navigation buttons */}
        {items.length > 1 && (
          <>
            <button 
              className={`lightbox-prev ${showControls ? 'visible' : ''}`}
              onClick={goPrev}
              title="Previous (←)"
              disabled={isLoading}
            >
              ‹
            </button>
            <button 
              className={`lightbox-next ${showControls ? 'visible' : ''}`}
              onClick={goNext}
              title="Next (→)"
              disabled={isLoading}
            >
              ›
            </button>
          </>
        )}
        
        {/* Main content container */}
        <div className="lightbox-image-container">
          {/* Loading indicator */}
          {isLoading && (
            <div className="lightbox-loader">
              <div className="spinner"></div>
              <p>Loading {currentItem.type}...</p>
            </div>
          )}
          
          {/* Error state */}
          {hasError ? (
            <div className="lightbox-error">
              <div className="error-icon">⚠️</div>
              <p>Failed to load {currentItem.type}</p>
              <button 
                className="retry-btn"
                onClick={() => {
                  setHasError(false);
                  setIsLoading(true);
                }}
              >
                <span>🔄</span>
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
              playsInline
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
              draggable={false}
            />
          )}
        </div>
        
        {/* Counter */}
        {items.length > 1 && (
          <div className={`lightbox-counter ${showControls ? 'visible' : ''}`}>
            {safeIndex + 1} / {items.length}
          </div>
        )}

        {/* Progress indicator */}
        {items.length > 1 && (
          <div className={`progress-indicator ${showControls ? 'visible' : ''}`}>
            <div 
              className="progress-bar"
              style={{ width: `${((safeIndex + 1) / items.length) * 100}%` }}
            ></div>
          </div>
        )}

        {/* Thumbnail strip for many items */}
        {items.length > 3 && (
          <div className={`lightbox-thumbnails ${showControls ? 'visible' : ''}`}>
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
                    <img src={item.url} alt={`Thumbnail ${index + 1}`} draggable={false} />
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
                    <li>Tap - Show/hide controls</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile swipe hint */}
        {showHint && items.length > 1 && (
          <div className="mobile-hints">
            <div className="swipe-hint">
              Swipe left or right to navigate
            </div>
          </div>
        )}

        {/* Drag feedback indicator */}
        {isDragging && Math.abs(dragOffset) > 20 && (
          <div className="drag-feedback">
            <div className={`drag-icon ${dragOffset > 0 ? 'right' : 'left'}`}>
              {dragOffset > 0 ? '👈' : '👉'}
            </div>
            <div className="drag-text">
              {dragOffset > 0 ? 'Previous' : 'Next'}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .lightbox-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          touch-action: manipulation;
          user-select: none;
          -webkit-user-select: none;
          overflow: hidden;
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
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          cursor: pointer;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          z-index: 10;
          opacity: 0;
          transform: translateY(-10px);
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .lightbox-close.visible,
        .lightbox-info.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .lightbox-close {
          right: 20px;
        }

        .lightbox-info {
          right: 85px;
        }

        .lightbox-close:hover,
        .lightbox-info:hover {
          background: rgba(0,0,0,0.9);
          transform: translateY(0) scale(1.05);
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }

        .lightbox-close:active,
        .lightbox-info:active {
          transform: translateY(0) scale(0.95);
        }

        .lightbox-prev,
        .lightbox-next {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          cursor: pointer;
          font-size: 28px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          transition: all 0.3s ease;
          opacity: 0;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .lightbox-prev.visible,
        .lightbox-next.visible {
          opacity: 1;
        }

        .lightbox-prev:disabled,
        .lightbox-next:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .lightbox-prev:hover:not(:disabled),
        .lightbox-next:hover:not(:disabled) {
          background: rgba(0,0,0,0.9);
          transform: translateY(-50%) scale(1.05);
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }

        .lightbox-prev:active:not(:disabled),
        .lightbox-next:active:not(:disabled) {
          transform: translateY(-50%) scale(0.95);
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
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          -webkit-user-drag: none;
          user-select: none;
        }

        .lightbox-video {
          background: #000;
        }

        .lightbox-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          color: white;
          text-align: center;
        }

        .spinner {
          width: 56px;
          height: 56px;
          border: 4px solid rgba(255,255,255,0.2);
          border-top: 4px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .lightbox-loader p {
          margin: 0;
          font-size: 18px;
          font-weight: 500;
        }

        .lightbox-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          color: white;
          text-align: center;
          padding: 40px;
        }

        .error-icon {
          font-size: 48px;
        }

        .lightbox-error p {
          margin: 0;
          font-size: 20px;
          font-weight: 500;
        }

        .retry-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          background: #8b5cf6;
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.2s ease;
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

        .lightbox-counter {
          position: absolute;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(12px);
          color: white;
          padding: 12px 20px;
          border-radius: 24px;
          font-size: 16px;
          font-weight: 600;
          border: 1px solid rgba(255,255,255,0.2);
          transition: all 0.3s ease;
          opacity: 0;
          transform: translateX(-50%) translateY(10px);
        }

        .lightbox-counter.visible {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        .progress-indicator {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: rgba(255,255,255,0.2);
          transition: all 0.3s ease;
          opacity: 0;
        }

        .progress-indicator.visible {
          opacity: 1;
        }

        .progress-bar {
          height: 100%;
          background: #8b5cf6;
          transition: width 0.3s ease;
        }

        .lightbox-thumbnails {
          position: absolute;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          max-width: 90vw;
          overflow-x: auto;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 16px;
          padding: 16px;
          transition: all 0.3s ease;
          opacity: 0;
          transform: translateX(-50%) translateY(20px);
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .lightbox-thumbnails::-webkit-scrollbar {
          display: none;
        }

        .lightbox-thumbnails.visible {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        .thumbnail-strip {
          display: flex;
          gap: 12px;
          padding: 4px;
        }

        .thumbnail {
          width: 80px;
          height: 80px;
          border: 2px solid transparent;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          opacity: 0.7;
          transition: all 0.2s ease;
          background: none;
          padding: 0;
          position: relative;
          flex-shrink: 0;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .thumbnail.active {
          border-color: #8b5cf6;
          opacity: 1;
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(139,92,246,0.3);
        }

        .thumbnail:hover {
          opacity: 1;
          transform: scale(1.02);
        }

        .thumbnail:active {
          transform: scale(0.98);
        }

        .thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          -webkit-user-drag: none;
          user-select: none;
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
          font-size: 18px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.8);
        }

        .lightbox-info-panel {
          position: absolute;
          top: 100px;
          left: 20px;
          background: rgba(0,0,0,0.9);
          backdrop-filter: blur(16px);
          color: white;
          padding: 24px;
          border-radius: 16px;
          max-width: 400px;
          z-index: 10;
          border: 1px solid rgba(255,255,255,0.2);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
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
          bottom: 160px;
          left: 50%;
          transform: translateX(-50%);
          animation: fadeInOut 4s ease-in-out forwards;
        }

        .swipe-hint {
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(12px);
          color: white;
          padding: 12px 20px;
          border-radius: 20px;
          font-size: 14px;
          text-align: center;
          border: 1px solid rgba(255,255,255,0.2);
          white-space: nowrap;
          font-weight: 500;
        }

        .drag-feedback {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: white;
          text-align: center;
          z-index: 15;
        }

        .drag-icon {
          font-size: 32px;
          animation: bounce 0.5s ease-in-out infinite alternate;
        }

        .drag-text {
          font-size: 16px;
          font-weight: 600;
          background: rgba(0,0,0,0.8);
          padding: 8px 16px;
          border-radius: 12px;
          backdrop-filter: blur(8px);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
          10%, 80% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        }

        @keyframes bounce {
          from { transform: translateY(0); }
          to { transform: translateY(-10px); }
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .lightbox-close,
          .lightbox-info {
            top: 15px;
            width: 44px;
            height: 44px;
            font-size: 18px;
          }

          .lightbox-close {
            right: 15px;
          }

          .lightbox-info {
            right: 70px;
          }

          .lightbox-prev,
          .lightbox-next {
            width: 52px;
            height: 52px;
            font-size: 24px;
          }

          .lightbox-prev {
            left: 15px;
          }

          .lightbox-next {
            right: 15px;
          }

          .lightbox-counter {
            bottom: 30px;
            font-size: 14px;
            padding: 10px 16px;
          }

          .lightbox-thumbnails {
            bottom: 80px;
            max-width: 95vw;
            padding: 12px;
          }

          .thumbnail {
            width: 64px;
            height: 64px;
          }

          .lightbox-info-panel {
            top: 80px;
            left: 15px;
            right: 15px;
            max-width: none;
            padding: 20px;
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
            bottom: 120px;
          }

          .swipe-hint {
            font-size: 13px;
            padding: 10px 16px;
          }

          .lightbox-image-container {
            max-width: 100vw;
            max-height: 100vh;
            padding: 0 10px;
          }

          .spinner {
            width: 48px;
            height: 48px;
          }

          .lightbox-loader p {
            font-size: 16px;
          }

          .error-icon {
            font-size: 40px;
          }

          .lightbox-error p {
            font-size: 18px;
          }

          .retry-btn {
            padding: 12px 24px;
            font-size: 15px;
          }

          .drag-icon {
            font-size: 28px;
          }

          .drag-text {
            font-size: 14px;
            padding: 6px 12px;
          }
        }

        @media (max-width: 480px) {
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
            font-size: 22px;
          }

          .lightbox-prev {
            left: 10px;
          }

          .lightbox-next {
            right: 10px;
          }

          .thumbnail {
            width: 56px;
            height: 56px;
          }

          .lightbox-info-panel {
            top: 60px;
            left: 10px;
            right: 10px;
            padding: 16px;
          }

          .swipe-hint {
            font-size: 12px;
            padding: 8px 12px;
          }

          .lightbox-counter {
            bottom: 20px;
            font-size: 13px;
            padding: 8px 14px;
          }
        }

        /* Landscape mobile optimizations */
        @media (max-height: 500px) and (orientation: landscape) {
          .lightbox-image-container {
            max-height: 85vh;
          }
          
          .lightbox-counter {
            bottom: 20px;
          }
          
          .lightbox-thumbnails {
            bottom: 60px;
          }
          
          .mobile-hints {
            bottom: 100px;
          }

          .lightbox-info-panel {
            top: 10px;
            max-height: 70vh;
            overflow-y: auto;
          }
        }

        /* High DPI displays */
        @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 2dppx) {
          .lightbox-close,
          .lightbox-info,
          .lightbox-prev,
          .lightbox-next {
            border-width: 0.5px;
          }
        }

        /* Accessibility improvements */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          
          .swipe-hint {
            animation: none;
            opacity: 1;
          }

          .drag-icon {
            animation: none;
          }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .lightbox-overlay {
            background: rgba(0,0,0,0.98);
          }
        }
      `}</style>
    </div>
  );
}
