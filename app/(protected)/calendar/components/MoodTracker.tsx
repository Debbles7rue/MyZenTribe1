// app/(protected)/calendar/components/MoodTracker.tsx

import React, { useState } from 'react';

interface MoodTrackerProps {
  date: Date;
  onClose: () => void;
  onSave: (mood: string) => void;
}

export default function MoodTracker({ date, onClose, onSave }: MoodTrackerProps) {
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [energy, setEnergy] = useState(5);
  const [gratitude, setGratitude] = useState(['', '', '']);

  const moods = [
    { emoji: '😊', label: 'Amazing', value: 'amazing', color: 'from-yellow-400 to-orange-400' },
    { emoji: '🙂', label: 'Good', value: 'good', color: 'from-green-400 to-emerald-400' },
    { emoji: '😐', label: 'Okay', value: 'okay', color: 'from-blue-400 to-cyan-400' },
    { emoji: '😔', label: 'Tough', value: 'tough', color: 'from-purple-400 to-pink-400' },
    { emoji: '😢', label: 'Difficult', value: 'difficult', color: 'from-gray-400 to-slate-400' }
  ];

  const handleSave = () => {
    if (selectedMood) {
      const moodData = {
        mood: selectedMood,
        notes,
        energy,
        gratitude: gratitude.filter(g => g.trim()),
        date: date.toISOString()
      };
      onSave(selectedMood);
      // In a real app, you'd save this to the database
      localStorage.setItem(`mood-${date.toDateString()}`, JSON.stringify(moodData));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            How are you feeling today?
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Mood Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Select your mood
            </label>
            <div className="grid grid-cols-5 gap-2">
              {moods.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => setSelectedMood(mood.value)}
                  className={`p-3 rounded-xl transition-all transform ${
                    selectedMood === mood.value
                      ? `bg-gradient-to-r ${mood.color} scale-110 shadow-lg`
                      : 'bg-gray-100 dark:bg-gray-700 hover:scale-105'
                  }`}
                >
                  <div className="text-2xl mb-1">{mood.emoji}</div>
                  <div className={`text-xs ${
                    selectedMood === mood.value ? 'text-white font-medium' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {mood.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Energy Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Energy level: {energy}/10
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={energy}
              onChange={(e) => setEnergy(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>

          {/* Gratitude */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Three things you're grateful for
            </label>
            <div className="space-y-2">
              {gratitude.map((item, index) => (
                <input
                  key={index}
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const newGratitude = [...gratitude];
                    newGratitude[index] = e.target.value;
                    setGratitude(newGratitude);
                  }}
                  placeholder={`Gratitude ${index + 1}...`}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                           focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Additional notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="How was your day? Any thoughts to record?"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={!selectedMood}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white 
                       rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Save Mood
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                       rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
