// components/PostCard/PostLightbox.tsx
"use client";

import { useState, useEffect } from "react";
import styles from "./styles.module.css";

interface PostLightboxProps {
  media: Array<{url: string; type: 'image' | 'video'}>;
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
  
  // Filter to only images for the lightbox
  const images = media.filter(m => m && m.type === 'image' && m.url);
  
  if (!images || images.length === 0) {
    onClose();
    return null;
  }
  
  // Ensure index is within bounds
  const safeIndex = Math.max(0, Math.min(currentIndex, images.length - 1));
  const currentImage = images[safeIndex];
  
  if (!currentImage || !currentImage.url) {
    onClose();
    return null;
  }
  
  // Navigation functions
  const goNext = () => {
    if (images.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % images.length);
      setIsLoading(true);
      setHasError(false);
    }
  };
  
  const goPrev = () => {
    if (images.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
      setIsLoading(true);
      setHasError(false);
    }
  };

  const goToIndex = (index: number) => {
    if (index >= 0 && index < images.length) {
      setCurrentIndex(index);
      setIsLoading(true);
      setHasError(false);
    }
  };
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowRight':
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
          goToIndex(images.length - 1);
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
  }, [showInfo]);

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

    if (isLeftSwipe && images.length > 1) {
      goNext();
    }
    if (isRightSwipe && images.length > 1) {
      goPrev();
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

  // Reset loading state when index changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [currentIndex]);

  // Preload adjacent images for smoother navigation
  useEffect(() => {
    const preloadImages = () => {
      const indicesToPreload = [
        (currentIndex + 1) % images.length,
        (currentIndex - 1 + images.length) % images.length
      ];

      indicesToPreload.forEach(index => {
        if (index !== currentIndex && images[index]) {
          const img = new Image();
          img.src = images[index].url;
        }
      });
    };

    if (images.length > 1) {
      preloadImages();
    }
  }, [currentIndex, images]);
  
  return (
    <div 
      className={styles.lightboxOverlay} 
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button 
          className={styles.lightboxClose} 
          onClick={onClose}
          title="Close (Esc)"
        >
          ×
        </button>

        {/* Info toggle button */}
        <button 
          className={styles.lightboxInfo} 
          onClick={() => setShowInfo(!showInfo)}
          title="Toggle info (I)"
        >
          ℹ️
        </button>
        
        {/* Navigation buttons */}
        {images.length > 1 && (
          <>
            <button 
              className={styles.lightboxPrev} 
              onClick={goPrev}
              title="Previous image (←)"
              disabled={isLoading}
            >
              ‹
            </button>
            <button 
              className={styles.lightboxNext} 
              onClick={goNext}
              title="Next image (→)"
              disabled={isLoading}
            >
              ›
            </button>
          </>
        )}
        
        {/* Main image */}
        <div className={styles.lightboxImageContainer}>
          {isLoading && (
            <div className={styles.lightboxLoader}>
              <div className={styles.spinner}></div>
              <p>Loading image...</p>
            </div>
          )}
          
          {hasError ? (
            <div className={styles.lightboxError}>
              <p>Failed to load image</p>
              <button 
                className={styles.retryBtn}
                onClick={() => {
                  setHasError(false);
                  setIsLoading(true);
                }}
              >
                Retry
              </button>
            </div>
          ) : (
            <img 
              src={currentImage.url} 
              alt={`Image ${safeIndex + 1} of ${images.length}`}
              className={styles.lightboxImage}
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{ display: isLoading ? 'none' : 'block' }}
            />
          )}
        </div>
        
        {/* Counter and info */}
        {images.length > 1 && (
          <div className={styles.lightboxCounter}>
            {safeIndex + 1} / {images.length}
          </div>
        )}

        {/* Thumbnail strip for many images */}
        {images.length > 3 && (
          <div className={styles.lightboxThumbnails}>
            <div className={styles.thumbnailStrip}>
              {images.map((image, index) => (
                <button
                  key={index}
                  className={`${styles.thumbnail} ${index === currentIndex ? styles.active : ''}`}
                  onClick={() => goToIndex(index)}
                  title={`Go to image ${index + 1}`}
                >
                  <img src={image.url} alt={`Thumbnail ${index + 1}`} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Extended info panel */}
        {showInfo && (
          <div className={styles.lightboxInfoPanel}>
            <div className={styles.infoContent}>
              <h3>Image {safeIndex + 1} of {images.length}</h3>
              <div className={styles.infoDetails}>
                <p><strong>URL:</strong> {currentImage.url}</p>
                <p><strong>Navigation:</strong> Use arrow keys or swipe on mobile</p>
                <p><strong>Shortcuts:</strong></p>
                <ul>
                  <li>Esc - Close lightbox</li>
                  <li>← → - Navigate images</li>
                  <li>Home/End - Go to first/last image</li>
                  <li>I - Toggle this info</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Navigation hints for mobile */}
        <div className={styles.mobileHints}>
          <div className={styles.swipeHint}>
            {images.length > 1 && 'Swipe left or right to navigate'}
          </div>
        </div>
      </div>
    </div>
  );
}
