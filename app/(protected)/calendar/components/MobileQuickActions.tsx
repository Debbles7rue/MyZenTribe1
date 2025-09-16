// app/(protected)/calendar/components/MobileQuickActions.tsx

import React from 'react';

interface MobileQuickActionsProps {
  onMoodTrack: () => void;
  onPomodoro: () => void;
  onTimeBlock: () => void;
  onVoiceCommand: () => void;
  isListening: boolean;
}

export default function MobileQuickActions({
  onMoodTrack,
  onPomodoro,
  onTimeBlock,
  onVoiceCommand,
  isListening
}: MobileQuickActionsProps) {
  return (
    <div className="mb-4 overflow-x-auto">
      <div className="flex gap-2 px-2 min-w-max">
        <button
          onClick={onMoodTrack}
          className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-center gap-2 
                   active:scale-95 transition-transform hover:shadow-lg"
          aria-label="Track mood"
        >
          <span>😊</span>
          <span className="text-xs">Mood</span>
        </button>
        
        <button
          onClick={onPomodoro}
          className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-center gap-2 
                   active:scale-95 transition-transform hover:shadow-lg"
          aria-label="Start Pomodoro timer"
        >
          <span>🍅</span>
          <span className="text-xs">Focus</span>
        </button>
        
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
