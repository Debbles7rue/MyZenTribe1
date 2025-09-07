// app/(protected)/calendar/hooks/useSwipeGestures.ts
import { useEffect, useRef } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export function useSwipeGestures(handlers: SwipeHandlers) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);
  const isScrolling = useRef(false);

  const minSwipeDistance = 50;
  const maxScrollThreshold = 10;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isScrolling.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;

    const yDiff = Math.abs(touchEndY.current - touchStartY.current);
    if (yDiff > maxScrollThreshold && !isScrolling.current) {
      isScrolling.current = true;
    }
  };

  const handleTouchEnd = () => {
    if (isScrolling.current) return;

    const xDiff = touchEndX.current - touchStartX.current;
    const yDiff = touchEndY.current - touchStartY.current;
    const absXDiff = Math.abs(xDiff);
    const absYDiff = Math.abs(yDiff);

    if (absXDiff > absYDiff && absXDiff > minSwipeDistance) {
      if (xDiff > 0 && handlers.onSwipeRight) {
        handlers.onSwipeRight();
      } else if (xDiff < 0 && handlers.onSwipeLeft) {
        handlers.onSwipeLeft();
      }
    }
    else if (absYDiff > minSwipeDistance) {
      if (yDiff > 0 && handlers.onSwipeDown) {
        handlers.onSwipeDown();
      } else if (yDiff < 0 && handlers.onSwipeUp) {
        handlers.onSwipeUp();
      }
    }
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}
