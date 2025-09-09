// app/(protected)/calendar/hooks/useSwipeGestures.ts

import { useEffect, useRef } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export function useSwipeGestures(handlers: SwipeHandlers) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchEndY.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchStartY.current || !touchEndX.current || !touchEndY.current) {
      return;
    }

    const distanceX = touchStartX.current - touchEndX.current;
    const distanceY = touchStartY.current - touchEndY.current;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    const isUpSwipe = distanceY > minSwipeDistance;
    const isDownSwipe = distanceY < -minSwipeDistance;

    // Prioritize horizontal swipes over vertical
    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (isRightSwipe && handlers.onSwipeRight) {
        handlers.onSwipeRight();
      } else if (isLeftSwipe && handlers.onSwipeLeft) {
        handlers.onSwipeLeft();
      }
    } else {
      if (isDownSwipe && handlers.onSwipeDown) {
        handlers.onSwipeDown();
      } else if (isUpSwipe && handlers.onSwipeUp) {
        handlers.onSwipeUp();
      }
    }
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
}
