// app/(protected)/calendar/components/HolidayReminders.tsx
import React, { useState } from 'react';

interface Holiday {
  name: string;
  date: string;
  emoji: string;
  description: string;
}

interface HolidayRemindersProps {
  onClose: () => void;
  onAddToCalendar: (holiday: Holiday) => void;
}

export default function HolidayReminders({ onClose, onAddToCalendar }: HolidayRemindersProps) {
  const currentYear = new Date().getFullYear();
  
  const holidays: Holiday[] = [
    { name: "New Year's Day", date: `${currentYear}-01-01`, emoji: "🎊", description: "Start the year with intention" },
    { name: "Martin Luther King Jr. Day", date: `${currentYear}-01-20`, emoji: "✊", description: "Day of service and reflection" },
    { name: "Valentine's Day", date: `${currentYear}-02-14`, emoji: "💝", description: "Celebrate love and friendship" },
    { name: "Presidents' Day", date: `${currentYear}-02-17`, emoji: "🎩", description: "Honor past leaders" },
    { name: "St. Patrick's Day", date: `${currentYear}-03-17`, emoji: "☘️", description: "Irish heritage celebration" },
    { name: "Easter Sunday", date: `${currentYear}-04-20`, emoji: "🐰", description: "Spring renewal and hope" },
    { name: "Earth Day", date: `${currentYear}-04-22`, emoji: "🌍", description: "Environmental awareness" },
    { name: "Memorial Day", date: `${currentYear}-05-26`, emoji: "🇺🇸", description: "Remember those who served" },
    { name: "Juneteenth", date: `${currentYear}-06-19`, emoji: "✊", description: "Freedom and emancipation" },
    { name: "Independence Day", date: `${currentYear}-07-04`, emoji: "🎆", description: "Celebrate freedom" },
    { name: "Labor Day", date: `${currentYear}-09-01`, emoji: "⚒️", description: "Honor workers" },
    { name: "Halloween", date: `${currentYear}-10-31`, emoji: "🎃", description: "Spooky fun and treats" },
    { name: "Veterans Day", date: `${currentYear}-11-11`, emoji: "🎖️", description: "Thank our veterans" },
    { name: "Thanksgiving", date: `${currentYear}-11-27`, emoji: "🦃", description: "Gratitude and family" },
    { name: "Christmas Eve", date: `${currentYear}-12-24`, emoji: "🎅", description: "Night before Christmas" },
    { name: "Christmas Day", date: `${currentYear}-12-25`, emoji: "🎄", description: "Joy and celebration" },
    { name: "New Year's Eve", date: `${currentYear}-12-31`, emoji: "🎉", description: "End the year with reflection" }
  ];

  const [selectedHolidays, setSelectedHolidays] = useState<Set<string>>(new Set());

  const toggleHoliday = (holidayName: string) => {
    setSelectedHolidays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(holidayName)) {
        newSet.delete(holidayName);
      } else {
        newSet.add(holidayName);
      }
      return newSet;
    });
  };

  const addSelectedHolidays = () => {
    holidays.forEach(holiday => {
      if (selectedHolidays.has(holiday.name)) {
        onAddToCalendar(holiday);
      }
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity duration-300" 
        onClick={onClose} 
      />
      
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-green-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">🎄 Holiday Reminders</h2>
              <p className="text-sm mt-1 text-white/90">Add special dates to your calendar</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Holiday List */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid gap-3">
            {holidays.map(holiday => {
              const date = new Date(holiday.date);
              const isPast = date < new Date();
              
              return (
                <div
                  key={holiday.name}
                  onClick={() => !isPast && toggleHoliday(holiday.name)}
                  className={`
                    relative group rounded-lg p-4 border transition-all cursor-pointer
                    ${selectedHolidays.has(holiday.name) 
                      ? 'bg-gradient-to-r from-red-50 to-green-50 dark:from-red-900/20 dark:to-green-900/20 border-green-500' 
                      : 'bg-white dark:bg-gray-700 border-gray-200
