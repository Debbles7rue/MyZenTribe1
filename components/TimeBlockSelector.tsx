// components/TimeBlockSelector.tsx
"use client";

import React from 'react';

export interface TimeBlock {
  id: string;
  title: string;
  description?: string;
  color: string;
  duration: number; // in minutes
}

interface TimeBlockSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (block: TimeBlock) => void;
  timeBlocks?: TimeBlock[];
  isMobile?: boolean;
}

const DEFAULT_TIME_BLOCKS: TimeBlock[] = [
  { 
    id: 'deep-work', 
    title: 'Deep Work', 
    description: 'Focused work without distractions',
    color: '#8B5CF6', 
    duration: 90 
  },
  { 
    id: 'admin', 
    title: 'Email & Admin', 
    description: 'Check emails and handle admin tasks',
    color: '#3B82F6', 
    duration: 30 
  },
  { 
    id: 'break', 
    title: 'Break', 
    description: 'Rest and recharge',
    color: '#10B981', 
    duration: 15 
  },
  { 
    id: 'meeting', 
    title: 'Meeting', 
    description: 'Scheduled meeting time',
    color: '#F59E0B', 
    duration: 60 
  },
  { 
    id: 'lunch', 
    title: 'Lunch Break', 
    description: 'Meal time',
    color: '#EC4899', 
    duration: 60 
  },
  { 
    id: 'review', 
    title: 'Daily Review', 
    description: 'Reflect and plan',
    color: '#6366F1', 
    duration: 30 
  },
];

export default function TimeBlockSelector({
  isOpen,
  onClose,
  onSelect,
  timeBlocks = DEFAULT_TIME_BLOCKS,
  isMobile = false
}: TimeBlockSelectorProps) {
  
  const handleSelect = (block: TimeBlock) => {
    onSelect(block);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      
      <div 
        className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl ${
          isMobile ? 'w-full max-w-full' : 'max-w-2xl w-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}>⏰ Time Blocks</h2>
              <p className="text-indigo-100 mt-1 text-sm sm:text-base">
                Choose a time block type to schedule
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Time Blocks Grid */}
        <div className="p-4 sm:p-6">
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
            {timeBlocks.map((block) => (
              <button
                key={block.id}
                onClick={() => handleSelect(block)}
                className="p-3 sm:p-4 rounded-lg text-white font-medium hover:scale-105 transition-all shadow-md hover:shadow-lg group"
                style={{ backgroundColor: block.color }}
              >
                <div className="text-sm sm:text-base font-semibold">{block.title}</div>
                <div className="text-xs opacity-90 mt-1">{block.duration} min</div>
                {block.description && (
                  <div className="text-xs opacity-75 mt-2 line-clamp-2">
                    {block.description}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Pro Tip */}
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">
                <strong>Pro tip:</strong> Time blocking helps protect your most important work. 
                Block focus time before meetings fill up your calendar!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export default time blocks for easy import
export { DEFAULT_TIME_BLOCKS };
