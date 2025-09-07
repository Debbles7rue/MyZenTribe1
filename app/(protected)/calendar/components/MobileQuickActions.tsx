// app/(protected)/calendar/components/MobileQuickActions.tsx
import React from 'react';

interface MobileQuickActionsProps {
  onMoodTrack: () => void;
  onPhotoMemories: () => void;
  onPomodoro: () => void;
  onTimeBlock: () => void;
  onVoiceCommand: () => void;
  isListening: boolean;
}

export default function MobileQuickActions({
  onMoodTrack,
  onPhotoMemories,
  onPomodoro,
  onTimeBlock,
  onVoiceCommand,
  isListening
}: MobileQuickActionsProps) {
  return (
    <div className="mb-3 overflow-x-auto">
      <div className="flex gap-2 px-2 min-w-max">
        <button
          onClick={onMoodTrack}
          className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-xl shadow-md
                   hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all"
        >
          <span className="text-2xl mb-1">😊</span>
          <span className="text-xs text-gray-600 dark:text-gray-300">Mood</span>
        </button>

        <button
          onClick={onPhotoMemories}
          className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-xl shadow-md
                   hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all"
        >
          <span className="text-2xl mb-1">📸</span>
          <span className="text-xs text-gray-600 dark:text-gray-300">Memories</span>
        </button>

        <button
          onClick={onPomodoro}
          className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-xl shadow-md
                   hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all"
        >
          <span className="text-2xl mb-1">🍅</span>
          <span className="text-xs text-gray-600 dark:text-gray-300">Focus</span>
        </button>

        <button
          onClick={onTimeBlock}
          className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-xl shadow-md
                   hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all"
        >
          <span className="text-2xl mb-1">⏰</span>
          <span className="text-xs text-gray-600 dark:text-gray-300">Time Block</span>
        </button>

        <button
          onClick={onVoiceCommand}
          className={`flex flex-col items-center p-3 rounded-xl shadow-md
                   transform hover:scale-105 active:scale-95 transition-all ${
            isListening 
              ? 'bg-red-500 text-white animate-pulse' 
              : 'bg-white dark:bg-gray-800'
          }`}
        >
          <span className="text-2xl mb-1">🎤</span>
          <span className={`text-xs ${isListening ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
            {isListening ? 'Listening...' : 'Voice'}
          </span>
        </button>
      </div>
    </div>
  );
}

// ===== FloatingActionButton.tsx =====
interface FloatingActionButtonProps {
  onClick: () => void;
  onLongPress: () => void;
}

export function FloatingActionButton({ onClick, onLongPress }: FloatingActionButtonProps) {
  const [isPressed, setIsPressed] = React.useState(false);
  const longPressTimer = React.useRef<NodeJS.Timeout>();

  const handleTouchStart = () => {
    setIsPressed(true);
    longPressTimer.current = setTimeout(() => {
      onLongPress();
      setIsPressed(false);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      if (isPressed) {
        onClick();
      }
    }
    setIsPressed(false);
  };

  return (
    <button
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={() => setIsPressed(false)}
      className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-lg
                bg-gradient-to-r from-purple-600 to-pink-600 text-white
                flex items-center justify-center transform transition-all duration-200 ${
        isPressed ? 'scale-90 rotate-90' : 'hover:scale-110 hover:rotate-12'
      }`}
    >
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    </button>
  );
}

// ===== MoodTracker.tsx =====
interface MoodTrackerProps {
  date: Date;
  onClose: () => void;
  onSave: (mood: string) => void;
}

export function MoodTracker({ date, onClose, onSave }: MoodTrackerProps) {
  const moods = [
    { emoji: '😊', label: 'Happy', color: 'bg-yellow-400' },
    { emoji: '😎', label: 'Cool', color: 'bg-blue-400' },
    { emoji: '😴', label: 'Tired', color: 'bg-gray-400' },
    { emoji: '😤', label: 'Frustrated', color: 'bg-red-400' },
    { emoji: '🤗', label: 'Loved', color: 'bg-pink-400' },
    { emoji: '😌', label: 'Calm', color: 'bg-green-400' },
    { emoji: '🤔', label: 'Thoughtful', color: 'bg-purple-400' },
    { emoji: '🎉', label: 'Excited', color: 'bg-orange-400' },
  ];

  const [selectedMood, setSelectedMood] = React.useState<string | null>(null);
  const [note, setNote] = React.useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full
                    transform transition-all animate-bounce-in">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
          How are you feeling today?
        </h2>
        
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {moods.map((mood) => (
            <button
              key={mood.label}
              onClick={() => setSelectedMood(mood.label)}
              className={`p-4 rounded-xl border-2 transition-all transform hover:scale-110 ${
                selectedMood === mood.label
                  ? `${mood.color} border-transparent scale-110 shadow-lg`
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              <div className="text-3xl mb-1">{mood.emoji}</div>
              <div className="text-xs text-gray-600 dark:text-gray-300">{mood.label}</div>
            </button>
          ))}
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note about your day... (optional)"
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg
                   bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                   focus:outline-none focus:ring-2 focus:ring-purple-500"
          rows={3}
        />

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => selectedMood && onSave(selectedMood)}
            disabled={!selectedMood}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg
                     font-medium transform hover:scale-105 active:scale-95 transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Mood
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg
                     hover:bg-gray-300 dark:hover:bg-gray-600 transform hover:scale-105 active:scale-95 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== PhotoMemories.tsx =====
interface PhotoMemoriesProps {
  date: Date;
  onClose: () => void;
  userId: string | null;
}

export function PhotoMemories({ date, onClose, userId }: PhotoMemoriesProps) {
  // Mock data - in real app, fetch from database
  const memories = [
    { year: 2023, photo: '📷', caption: 'Team lunch at the new restaurant' },
    { year: 2022, photo: '🎂', caption: 'Birthday celebration!' },
    { year: 2021, photo: '🏖️', caption: 'Beach vacation with family' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 dark:bg-gray-700
                   hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
          📸 On This Day
        </h2>
        
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
        </div>

        <div className="space-y-4">
          {memories.map((memory) => (
            <div
              key={memory.year}
              className="p-4 border border-gray-200 dark:border-gray-600 rounded-xl
                       hover:shadow-lg transition-all hover:scale-[1.02]"
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl">{memory.photo}</div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 dark:text-white mb-1">
                    {memory.year}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {memory.caption}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          className="w-full mt-6 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg
                   font-medium transform hover:scale-105 active:scale-95 transition-all"
        >
          📷 Add Today's Photo
        </button>
      </div>
    </div>
  );
}
