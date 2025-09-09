// app/(protected)/calendar/components/MobileQuickActions.tsx
import React from 'react';

interface MobileQuickActionsProps {
  onTimeBlock: () => void;
  onVoiceCommand: () => void;
  onPersonal: () => void;
  onTemplates: () => void;
  isListening: boolean;
  activeTab: string;
}

export default function MobileQuickActions({
  onTimeBlock,
  onVoiceCommand,
  onPersonal,
  onTemplates,
  isListening,
  activeTab
}: MobileQuickActionsProps) {
  return (
    <div className="mb-4 overflow-x-auto">
      <div className="flex gap-2 px-2 min-w-max">
        <button
          onClick={onPersonal}
          className={`px-3 py-2 rounded-lg shadow-md flex items-center gap-2 
                   active:scale-95 transition-all ${
                     activeTab === 'personal'
                       ? 'bg-purple-500 text-white'
                       : 'bg-white dark:bg-gray-800'
                   }`}
        >
          <span>📝</span>
          <span className="text-xs font-medium">Personal</span>
        </button>
        
        <button
          onClick={onTemplates}
          className={`px-3 py-2 rounded-lg shadow-md flex items-center gap-2 
                   active:scale-95 transition-all ${
                     activeTab === 'templates'
                       ? 'bg-purple-500 text-white'
                       : 'bg-white dark:bg-gray-800'
                   }`}
        >
          <span>📋</span>
          <span className="text-xs font-medium">Templates</span>
        </button>
        
        <button
          onClick={onTimeBlock}
          className="px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg shadow-md 
                   flex items-center gap-2 active:scale-95 transition-all"
        >
          <span>⏰</span>
          <span className="text-xs font-medium">Time Block</span>
        </button>
        
        <button
          onClick={onVoiceCommand}
          className={`px-3 py-2 rounded-lg shadow-md flex items-center gap-2 
                   active:scale-95 transition-all ${
                     isListening 
                       ? 'bg-red-500 text-white animate-pulse' 
                       : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                   }`}
        >
          <span>🎤</span>
          <span className="text-xs font-medium">{isListening ? 'Listening' : 'Voice'}</span>
        </button>
      </div>
    </div>
  );
}
