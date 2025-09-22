// app/(protected)/calendar/components/HolidayReminders.tsx
import React, { useState } from 'react';

interface Holiday {
  name: string;
  date: string;
  emoji: string;
  description: string;
}

export default function HolidayReminders({ onClose, onAddToCalendar }: any) {
  const currentYear = new Date().getFullYear();
  const [selectedHolidays, setSelectedHolidays] = useState<Set<string>>(new Set());

  const holidays: Holiday[] = [
    { name: "New Year's Day", date: `${currentYear}-01-01`, emoji: "🎊", description: "Start the year with intention" },
    { name: "Valentine's Day", date: `${currentYear}-02-14`, emoji: "💝", description: "Celebrate love" },
    { name: "Easter", date: `${currentYear}-04-20`, emoji: "🐰", description: "Spring renewal" },
    { name: "Independence Day", date: `${currentYear}-07-04`, emoji: "🎆", description: "Celebrate freedom" },
    { name: "Halloween", date: `${currentYear}-10-31`, emoji: "🎃", description: "Spooky fun" },
    { name: "Thanksgiving", date: `${currentYear}-11-27`, emoji: "🦃", description: "Gratitude" },
    { name: "Christmas", date: `${currentYear}-12-25`, emoji: "🎄", description: "Joy and celebration" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-2xl font-bold mb-4">🎄 Holiday Reminders</h2>
        <div className="grid gap-3">
          {holidays.map(h => (
            <div
              key={h.name}
              onClick={() => {
                const newSet = new Set(selectedHolidays);
                newSet.has(h.name) ? newSet.delete(h.name) : newSet.add(h.name);
                setSelectedHolidays(newSet);
              }}
              className={`p-4 rounded-lg cursor-pointer transition-all ${
                selectedHolidays.has(h.name) 
                  ? 'bg-gradient-to-r from-red-50 to-green-50 border-2 border-green-500' 
                  : 'bg-gray-50 border-2 border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{h.emoji}</span>
                <div className="flex-1">
                  <div className="font-semibold">{h.name}</div>
                  <div className="text-sm text-gray-600">{new Date(h.date).toLocaleDateString()} - {h.description}</div>
                </div>
                {selectedHolidays.has(h.name) && <span className="text-green-500">✓</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => {
              holidays.forEach(h => {
                if (selectedHolidays.has(h.name)) onAddToCalendar(h);
              });
              onClose();
            }}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-green-500 text-white rounded-lg font-semibold"
          >
            Add Selected Holidays
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
