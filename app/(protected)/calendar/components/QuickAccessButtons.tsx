// app/(protected)/calendar/components/QuickAccessButtons.tsx

import React from 'react';

interface QuickAccessButtonsProps {
  onHolidayReminders: () => void;
  onBirthdayReminders?: () => void;
  onMoodTracker?: () => void;
  className?: string;
}

export default function QuickAccessButtons({
  onHolidayReminders,
  onBirthdayReminders,
  onMoodTracker,
  className = ''
}: QuickAccessButtonsProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {/* Holiday Reminders Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Holiday Reminders button clicked');
          onHolidayReminders();
        }}
        className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-green-500 text-white rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95"
        type="button"
      >
        🎄 Holiday Reminders
      </button>

      {/* Birthday Reminders Button (if handler provided) */}
      {onBirthdayReminders && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Birthday Reminders button clicked');
            onBirthdayReminders();
          }}
          className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95"
          type="button"
        >
          🎂 Birthday Reminders
        </button>
      )}

      {/* Mood Tracker Button (if handler provided) */}
      {onMoodTracker && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Mood Tracker button clicked');
            onMoodTracker();
          }}
          className="px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95"
          type="button"
        >
          😊 Mood Tracker
        </button>
      )}
    </div>
  );
}
