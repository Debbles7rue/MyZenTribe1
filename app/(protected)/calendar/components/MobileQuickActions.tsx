// app/(protected)/calendar/components/MobileQuickActions.tsx
import React from 'react';

interface MobileQuickActionsProps {
  onTimeBlock: () => void;
  onVoiceCommand: () => void;
  isListening: boolean;
}

export default function MobileQuickActions({
  onTimeBlock,
  onVoiceCommand,
  isListening
}: MobileQuickActionsProps) {
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-2 px-2 min-w-max">
        <button
          onClick={onTimeBlock}
          className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-center gap-2 
                   active:scale-95 transition-transform hover:shadow-lg"
          aria-label="Time blocking"
        >
          <span>⏰</span>
          <span className="text-xs">Time Block</span>
        </button>
        
        <button
          onClick={onVoiceCommand}
          className={`px-3 py-2 rounded-lg shadow-md flex items-center gap-2 
                   active:scale-95 transition-all ${
                     isListening 
                       ? 'bg-red-500 text-white animate-pulse' 
                       : 'bg-white dark:bg-gray-800 hover:shadow-lg'
                   }`}
          aria-label={isListening ? 'Voice command listening' : 'Start voice command'}
        >
          <span>🎤</span>
          <span className="text-xs">{isListening ? 'Listening...' : 'Voice'}</span>
        </button>
      </div>
    </div>
  );
}
