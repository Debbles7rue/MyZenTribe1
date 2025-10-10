// app/(protected)/calendar/hooks/useSwipeGestures.ts
// COMPLETE REPLACEMENT - Enhanced with tap detection to prevent click interference

import { useRef, useCallback } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeResult {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

const SWIPE_THRESHOLD = 50; // Minimum distance for swipe (in pixels)
const TAP_THRESHOLD = 10; // Maximum movement for a tap (in pixels)
const SWIPE_VELOCITY_THRESHOLD = 0.3; // Minimum velocity
const MAX_SWIPE_TIME = 300; // Maximum time for a swipe (in ms)

export function useSwipeGestures(handlers: SwipeHandlers): SwipeResult {
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchEnd = useRef<{ x: number; y: number; time: number } | null>(null);
  const isSwiping = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Don't interfere if touching a button, input, or interactive element
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[role="button"]')
    ) {
      console.log('🚫 Touch on interactive element - ignoring');
      touchStart.current = null;
      return;
    }

    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    touchEnd.current = null;
    isSwiping.current = false;
    
    console.log('👆 Touch start:', touchStart.current);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;

    const touch = e.touches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;
    
    const deltaX = Math.abs(currentX - touchStart.current.x);
    const deltaY = Math.abs(currentY - touchStart.current.y);
    
    // If movement exceeds tap threshold, mark as swiping
    if (deltaX > TAP_THRESHOLD || deltaY > TAP_THRESHOLD) {
      isSwiping.current = true;
      console.log('👉 Swiping detected:', { deltaX, deltaY });
    }

    touchEnd.current = {
      x: currentX,
      y: currentY,
      time: Date.now()
    };
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current || !touchEnd.current) {
      console.log('❌ No touch data - allowing normal click');
      touchStart.current = null;
      touchEnd.current = null;
      isSwiping.current = false;
      return;
    }

    const deltaX = touchEnd.current.x - touchStart.current.x;
    const deltaY = touchEnd.current.y - touchStart.current.y;
    const deltaTime = touchEnd.current.time - touchStart.current.time;
    
    const distanceX = Math.abs(deltaX);
    const distanceY = Math.abs(deltaY);
    const velocity = Math.max(distanceX, distanceY) / deltaTime;

    console.log('🏁 Touch end:', {
      deltaX,
      deltaY,
      deltaTime,
      distanceX,
      distanceY,
      velocity,
      isSwiping: isSwiping.current
    });

    // If this was just a tap (minimal movement), don't process as swipe
    if (distanceX < TAP_THRESHOLD && distanceY < TAP_THRESHOLD) {
      console.log('✅ Tap detected - allowing normal click');
      touchStart.current = null;
      touchEnd.current = null;
      isSwiping.current = false;
      return;
    }

    // Check if swipe is valid (sufficient distance and velocity)
    if (
      isSwiping.current &&
      (distanceX > SWIPE_THRESHOLD || distanceY > SWIPE_THRESHOLD) &&
      velocity > SWIPE_VELOCITY_THRESHOLD &&
      deltaTime < MAX_SWIPE_TIME
    ) {
      // Determine swipe direction
      if (distanceX > distanceY) {
        // Horizontal swipe
        if (deltaX > 0 && handlers.onSwipeRight) {
          console.log('➡️ Swipe RIGHT');
          e.preventDefault();
          handlers.onSwipeRight();
        } else if (deltaX < 0 && handlers.onSwipeLeft) {
          console.log('⬅️ Swipe LEFT');
          e.preventDefault();
          handlers.onSwipeLeft();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0 && handlers.onSwipeDown) {
          console.log('⬇️ Swipe DOWN');
          e.preventDefault();
          handlers.onSwipeDown();
        } else if (deltaY < 0 && handlers.onSwipeUp) {
          console.log('⬆️ Swipe UP');
          e.preventDefault();
          handlers.onSwipeUp();
        }
      }
    } else {
      console.log('🚫 Swipe not valid - allowing normal click');
    }

    touchStart.current = null;
    touchEnd.current = null;
    isSwiping.current = false;
  }, [handlers]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
}
