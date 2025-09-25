// app/(protected)/calendar/components/MobileListsBottomSheet.tsx

import React, { useState, useRef } from 'react';

interface MobileListsBottomSheetProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export default function MobileListsBottomSheet({ 
  open, 
  onClose, 
  onNavigate 
}: MobileListsBottomSheetProps) {
  const [dragPosition, setDragPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff > 0) {
      setDragPosition(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragPosition > 100) {
      onClose();
    }
    setDragPosition(0);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 z-40 md:hidden"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div 
        className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl z-50 md:hidden transition-transform`}
        style={{ 
          transform: `translateY(${dragPosition}px)`,
          maxHeight: '70vh'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>
        
        {/* Title */}
        <div className="px-6 pb-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Lists</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Tap to view or drag items to calendar</p>
        </div>
        
        {/* List Options */}
        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={() => {
              console.log('Navigating to /todos');
              onNavigate('/todos');
              onClose();
            }}
            className="w-full p-4 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-between group hover:bg-green-100 dark:hover:bg-green-900/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white">To-dos</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tasks & projects</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={() => {
              console.log('Navigating to /reminders');
              onNavigate('/reminders');
              onClose();
            }}
            className="w-full p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-between group hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🔔</span>
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white">Reminders</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Time-based alerts</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={() => {
              console.log('Navigating to /shopping');
              onNavigate('/shopping');
              onClose();
            }}
            className="w-full p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-between group hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🛒</span>
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white">Shopping List</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Things to buy</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
