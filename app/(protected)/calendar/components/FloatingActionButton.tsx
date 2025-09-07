// app/(protected)/calendar/components/FloatingActionButton.tsx

import React, { useState, useRef } from 'react';

interface FloatingActionButtonProps {
  onClick: () => void;
  onLongPress?: () => void;
}

export default function FloatingActionButton({ onClick, onLongPress }: FloatingActionButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout>();

  const handleTouchStart = () => {
    setIsPressed(true);
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        onLongPress();
        // Vibrate on long press
        if ('vibrate' in navigator) {
          navigator.vibrate(20);
        }
      }, 500);
    }
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      className={`fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 
                text-white rounded-full shadow-lg flex items-center justify-center z-40
                transform transition-all duration-200 ${
                  isPressed ? 'scale-90' : 'hover:scale-110'
                } active:scale-90`}
      aria-label="Create new event"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    </button>
  );
}
