// components/PostCard/PhotoGrid.tsx
"use client";

import styles from "./styles.module.css";

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
        <div className={styles.photoGridContainerCompact}>
          <div className={styles.compactSinglePhoto} onClick={() => onPhotoClick(0)}>
            <img src={images[0].url} alt="" />
          </div>
        </div>
      );
    }
    
    // Two images side by side
    if (images.length === 2) {
      return (
        <div className={styles.photoGridContainerCompact}>
          <div className={styles.compactTwoPhotos}>
            {images.map((img, idx) => (
              <div key={idx} className={styles.compactPhotoItem} onClick={() => onPhotoClick(idx)}>
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
        <div className={styles.photoGridContainerCompact}>
          <div className={styles.compactThreePhotos}>
            <div className={`${styles.compactPhotoItem} ${styles.main}`} onClick={() => onPhotoClick(0)}>
              <img src={images[0].url} alt="" />
            </div>
            <div className={styles.compactSideStack}>
              {images.slice(1, 3).map((img, idx) => (
                <div key={idx} className={styles.compactPhotoItem} onClick={() => onPhotoClick(idx + 1)}>
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
        <div className={styles.photoGridContainerCompact}>
          <div className={styles.compactManyPhotos}>
            <div className={styles.compactTopRow}>
              <div className={styles.compactPhotoItem} onClick={() => onPhotoClick(0)}>
                <img src={images[0].url} alt="" />
              </div>
              <div className={styles.compactPhotoItem} onClick={() => onPhotoClick(1)}>
                <img src={images[1].url} alt="" />
              </div>
            </div>
            <div className={styles.compactBottomRow}>
              <div className={styles.compactPhotoItem} onClick={() => onPhotoClick(2)}>
                <img src={images[2].url} alt="" />
              </div>
              <div className={styles.compactPhotoItem} onClick={() => onPhotoClick(3)}>
                <img src={images[3].url} alt="" />
                {images.length > 4 && (
                  <div className={styles.morePhotosOverlay}>
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
  
  // EXPANDED MODE - Individual photos with clear photo boundaries
  return (
    <div className={styles.photoGridExpanded}>
      {images.map((photo, idx) => (
        <div key={idx} className={styles.individualPhotoContainer}>
          <div className={styles.photoWrapper}>
            <div className={styles.photoBorder}>
              <img 
                src={photo.url} 
                alt="" 
                className={styles.individualPhoto}
                onClick={() => onPhotoClick(idx)}
              />
            </div>
            <div className={styles.photoInteractionBar}>
              <button 
                className={`${styles.photoInteractBtn} ${styles.likeBtn}`}
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle photo like
                }}
              >
                🤍 Like
              </button>
              <button 
                className={`${styles.photoInteractBtn} ${styles.commentBtn}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onIndividualPhotoClick?.(photo);
                }}
              >
                💬 Comment
              </button>
              <button 
                className={`${styles.photoInteractBtn} ${styles.captionBtn}`}
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
