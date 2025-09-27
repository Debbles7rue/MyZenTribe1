// components/PostCard/PostLightbox.tsx - Enhanced with better mobile UX
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
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
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
      setIsZoomed(false);
      setZoomLevel(1);
      setDragOffset({ x: 0, y: 0 });
    }
  }, [items.length]);
  
  const goPrev = useCallback(() => {
    if (items.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
      setIsLoading(true);
      setHasError(false);
      setIsZoomed(false);
      setZoomLevel(1);
      setDragOffset({ x: 0, y: 0 });
    }
  }, [items.length]);

  const goToIndex = useCallback((index: number) => {
    if (index >= 0 && index < items.length) {
      setCurrentIndex(index);
      setIsLoading(true);
      setHasError(false);
      setIsZoomed(false);
      setZoomLevel(1);
      setDragOffset({ x: 0, y: 0 });
    }
  }, [items.length]);

  // Zoom functionality
  const handleZoom = useCallback((delta: number, clientX?: number, clientY?: number) => {
    if (currentItem.type !== 'image') return;
    
    const newZoom = Math.max(1, Math.min(4, zoomLevel + delta));
    setZoomLevel(newZoom);
    setIsZoomed(newZoom > 1);
    
    if (newZoom === 1) {
      setDragOffset({ x: 0, y: 0 });
    }
  }, [zoomLevel, currentItem.type]);

  const resetZoom = useCallback(() => {
    setZoomLevel(1);
    setIsZoomed(false);
    setDragOffset({ x: 0, y: 0 });
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
          if (!isZoomed) goNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (!isZoomed) goPrev();
          break;
        case 'Home':
          e.preventDefault();
          if (!isZoomed) goToIndex(0);
          break;
        case 'End':
          e.preventDefault();
          if (!isZoomed) goToIndex(items.length - 1);
          break;
        case 'i':
        case 'I':
          e.preventDefault();
          setShowInfo(!showInfo);
          break;
        case 't':
        case 'T':
          e.preventDefault();
          setShowThumbnails(!showThumbnails);
          break;
        case '=':
        case '+':
          e.preventDefault();
          handleZoom(0.25);
          break;
        case '-':
          e.preventDefault();
          handleZoom(-0.25);
          break;
        case '0':
          e.preventDefault();
          resetZoom();
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showInfo, showThumbnails, isZoomed, goNext, goPrev, goToIndex, handleZoom, resetZoom, onClose]);

  // Handle wheel zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.25 : 0.25;
        handleZoom(delta, e.clientX, e.clientY);
      }
    };

    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => document.removeEventListener('wheel', handleWheel);
  }, [handleZoom]);

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
    if (!touchStart || !touchEnd || isZoomed) return;
    
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

  // Handle pinch zoom on mobile
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);

  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setLastTouchDistance(getTouchDistance(e.touches));
    } else if (e.touches.length === 1) {
      onTouchStart(e);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance && currentItem.type === 'image') {
      e.preventDefault();
      const newDistance = getTouchDistance(e.touches);
      const scale = newDistance / lastTouchDistance;
      const delta = (scale - 1) * 2;
      handleZoom(delta);
      setLastTouchDistance(newDistance);
    } else if (e.touches.length === 1) {
      onTouchMove(e);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setLastTouchDistance(null);
      onTouchEnd();
    }
  };

  // Handle image loading
  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleVideoLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleVideoError = () => {
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

  // Auto-hide UI elements on mobile after inactivity
  const [showUI, setShowUI] = useState(true);
  const [uiTimeout, setUiTimeout] = useState<NodeJS.Timeout | null>(null);

  const resetUITimeout = useCallback(() => {
    setShowUI(true);
    if (uiTimeout) clearTimeout(uiTimeout);
    
    if (window.innerWidth <= 768) {
      const timeout = setTimeout(() => setShowUI(false), 3000);
      setUiTimeout(timeout);
    }
  }, [uiTimeout]);

  useEffect(() => {
    resetUITimeout();
    return () => {
      if (uiTimeout) clearTimeout(uiTimeout);
    };
  }, [currentIndex]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (isZoomed) {
        resetZoom();
      } else {
        onClose();
      }
    }
  };
  
  return (
    <div 
      className="lightbox-overlay"
      onClick={handleOverlayClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseMove={resetUITimeout}
    >
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        {/* Control Buttons */}
        <div className={`lightbox-controls ${showUI ? 'visible' : 'hidden'}`}>
          <button 
            className="lightbox-close" 
            onClick={onClose}
            title="Close (Esc)"
          >
            ✕
          </button>

          <button 
            className="lightbox-info" 
            onClick={() => setShowInfo(!showInfo)}
            title="Toggle info (I)"
          >
            ℹ️
          </button>

          {items.length > 3 && (
            <button 
              className="lightbox-thumbnails" 
              onClick={() => setShowThumbnails(!showThumbnails)}
              title="Toggle thumbnails (T)"
            >
              🎞️
            </button>
          )}

          {currentItem.type === 'image' && (
            <div className="zoom-controls">
              <button 
                className="zoom-btn"
                onClick={() => handleZoom(-0.25)}
                disabled={zoomLevel <= 1}
                title="Zoom out (-)"
              >
                🔍−
              </button>
              <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
              <button 
                className="zoom-btn"
                onClick={() => handleZoom(0.25)}
                disabled={zoomLevel >= 4}
                title="Zoom in (+)"
              >
                🔍+
              </button>
              {isZoomed && (
                <button 
                  className="zoom-reset"
                  onClick={resetZoom}
                  title="Reset zoom (0)"
                >
                  ↻
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Navigation buttons */}
        {items.length > 1 && !isZoomed && (
          <div className={`navigation-buttons ${showUI ? 'visible' : 'hidden'}`}>
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
          </div>
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
              onLoadedData={handleVideoLoad}
              onError={handleVideoError}
              style={{ display: isLoading ? 'none' : 'block' }}
            />
          ) : (
            <img 
              src={currentItem.url} 
              alt={`${currentItem.type} ${safeIndex + 1} of ${items.length}`}
              className="lightbox-image"
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{ 
                display: isLoading ? 'none' : 'block',
                transform: `scale(${zoomLevel}) translate(${dragOffset.x}px, ${dragOffset.y}px)`,
                cursor: isZoomed ? 'grab' : 'zoom-in'
              }}
              onDoubleClick={() => isZoomed ? resetZoom() : handleZoom(1)}
            />
          )}
        </div>
        
        {/* Counter */}
        {items.length > 1 && (
          <div className={`lightbox-counter ${showUI ? 'visible' : 'hidden'}`}>
            {safeIndex + 1} / {items.length}
          </div>
        )}

        {/* Thumbnail strip */}
        {showThumbnails && items.length > 1 && (
          <div className="lightbox-thumbnails-container">
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
                <p><strong>URL:</strong> <span className="url-text">{currentItem.url}</span></p>
                {currentItem.type === 'image' && (
                  <p><strong>Zoom:</strong> {Math.round(zoomLevel * 100)}%</p>
                )}
                <div className="info-shortcuts">
                  <p><strong>Shortcuts:</strong></p>
                  <ul>
                    <li>Esc - Close lightbox</li>
                    <li>← → / Space - Navigate</li>
                    <li>Home/End - First/last item</li>
                    <li>I - Toggle info</li>
                    <li>T - Toggle thumbnails</li>
                    {currentItem.type === 'image' && (
                      <>
                        <li>+/- - Zoom in/out</li>
                        <li>0 - Reset zoom</li>
                        <li>Double-click - Toggle zoom</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile hints */}
        <div className={`mobile-hints ${showUI ? 'visible' : 'hidden'}`}>
          <div className="swipe-hint">
            {items.length > 1 && !isZoomed && 'Swipe left or right to navigate'}
            {currentItem.type === 'image' && isZoomed && 'Pinch to zoom • Tap to reset'}
            {currentItem.type === 'image' && !isZoomed && 'Double-tap to zoom • Pinch to zoom'}
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

        .lightbox-controls {
          position: absolute;
          top: 20px;
          right: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 10;
          transition: opacity 0.3s ease;
        }

        .lightbox-controls.visible {
          opacity: 1;
        }

        .lightbox-controls.hidden {
          opacity: 0;
          pointer-events: none;
        }

        .lightbox-close,
        .lightbox-info,
        .lightbox-thumbnails {
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
        }

        .lightbox-close:hover,
        .lightbox-info:hover,
        .lightbox-thumbnails:hover {
          background: rgba(0,0,0,0.9);
          transform: scale(1.05);
        }

        .zoom-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 22px;
          padding: 6px 12px;
        }

        .zoom-btn,
        .zoom-reset {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 14px;
          transition: background 0.2s ease;
        }

        .zoom-btn:hover,
        .zoom-reset:hover {
          background: rgba(255,255,255,0.1);
        }

        .zoom-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .zoom-level {
          color: white;
          font-size: 12px;
          font-weight: 500;
          min-width: 40px;
          text-align: center;
        }

        .navigation-buttons {
          position: absolute;
          inset: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }

        .navigation-buttons.visible {
          opacity: 1;
        }

        .navigation-buttons.hidden {
          opacity: 0;
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
          pointer-events: auto;
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
          transition: transform 0.3s ease;
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
          transition: opacity 0.3s ease;
        }

        .lightbox-counter.visible {
          opacity: 1;
        }

        .lightbox-counter.hidden {
          opacity: 0;
        }

        .lightbox-thumbnails-container {
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

        .url-text {
          word-break: break-all;
          font-family: monospace;
          font-size: 12px;
          opacity: 0.8;
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
          transition: opacity 0.3s ease;
          pointer-events: none;
        }

        .mobile-hints.visible {
          opacity: 1;
        }

        .mobile-hints.hidden {
          opacity: 0;
        }

        .swipe-hint {
          background: rgba(0,0,0
