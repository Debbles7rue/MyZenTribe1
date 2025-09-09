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
    <div className="mb-4 overflow-x-auto">
      <div className="flex gap-2 px-2 justify-center">
        <button
          onClick={onTimeBlock}
          className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg shadow-md 
                   flex items-center gap-2 active:scale-95 transition-all hover:shadow-lg
                   min-w-[120px] justify-center"
        >
          <span className="text-lg">⏰</span>
          <span className="text-sm font-medium">Time Block</span>
        </button>
        
        <button
          onClick={onVoiceCommand}
          className={`px-4 py-2.5 rounded-lg shadow-md flex items-center gap-2 
                   active:scale-95 transition-all hover:shadow-lg min-w-[120px] justify-center ${
                     isListening 
                       ? 'bg-red-500 text-white animate-pulse' 
                       : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                   }`}
        >
          <span className="text-lg">🎤</span>
          <span className="text-sm font-medium">{isListening ? 'Listening...' : 'Voice'}</span>
        </button>
      </div>
    </div>
  );
}
