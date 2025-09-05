// components/SmartTemplates.tsx
import React, { useState } from 'react';

interface SmartTemplatesProps {
  open: boolean;
  onClose: () => void;
  onApply: (events: any[]) => void;
  userId: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  events: any[];
}

const TEMPLATES: Template[] = [
  {
    id: 'morning-routine',
    name: 'Morning Routine',
    description: 'Start your day right with a structured morning',
    icon: '☀️',
    events: [
      { title: 'Wake up & Stretch', duration: 10, time: '06:00' },
      { title: 'Morning Coffee', duration: 15, time: '06:10' },
      { title: 'Review daily goals', duration: 15, time: '06:25' },
      { title: 'Get ready', duration: 30, time: '06:40' }
    ]
  },
  {
    id: 'workout-week',
    name: 'Weekly Workout',
    description: 'Stay fit with a balanced workout schedule',
    icon: '💪',
    events: [
      { title: 'Monday: Cardio', duration: 45, dayOffset: 1, time: '07:00' },
      { title: 'Wednesday: Strength', duration: 60, dayOffset: 3, time: '07:00' },
      { title: 'Friday: Yoga', duration: 45, dayOffset: 5, time: '07:00' },
      { title: 'Sunday: Rest Day Walk', duration: 30, dayOffset: 7, time: '09:00' }
    ]
  },
  {
    id: 'meal-prep',
    name: 'Meal Prep Sunday',
    description: 'Organize your weekly meals efficiently',
    icon: '🍱',
    events: [
      { title: 'Grocery Shopping', duration: 60, time: '10:00' },
      { title: 'Meal Prep', duration: 120, time: '14:00' },
      { title: 'Clean Kitchen', duration: 30, time: '16:00' }
    ]
  },
  {
    id: 'study-session',
    name: 'Study Session',
    description: 'Productive study time with breaks',
    icon: '📚',
    events: [
      { title: 'Study Block 1', duration: 45, time: '14:00' },
      { title: 'Break', duration: 15, time: '14:45' },
      { title: 'Study Block 2', duration: 45, time: '15:00' },
      { title: 'Review Notes', duration: 20, time: '15:45' }
    ]
  },
  {
    id: 'evening-wind-down',
    name: 'Evening Wind-Down',
    description: 'Relax and prepare for better sleep',
    icon: '🌙',
    events: [
      { title: 'Dinner', duration: 45, time: '18:30' },
      { title: 'Evening Walk', duration: 30, time: '19:15' },
      { title: 'Read/Journal', duration: 30, time: '20:30' },
      { title: 'Prepare for bed', duration: 30, time: '21:00' }
    ]
  }
];

export default function SmartTemplates({ open, onClose, onApply, userId }: SmartTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  if (!open) return null;

  const handleApply = () => {
    if (!selectedTemplate || !selectedDate) return;
    
    const baseDate = new Date(selectedDate);
    const events = selectedTemplate.events.map((event) => {
      const eventDate = new Date(baseDate);
      
      // Add day offset if specified
      if (event.dayOffset) {
        eventDate.setDate(eventDate.getDate() + event.dayOffset - 1);
      }
      
      // Set time
      if (event.time) {
        const [hours, minutes] = event.time.split(':');
        eventDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      
      const startTime = new Date(eventDate);
      const endTime = new Date(eventDate);
      endTime.setMinutes(endTime.getMinutes() + (event.duration || 60));
      
      return {
        title: event.title,
        description: `From ${selectedTemplate.name} template`,
        location: '',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        visibility: 'private',
        created_by: userId,
        event_type: 'template',
        source: 'personal'
      };
    });
    
    onApply(events);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">✨ Smart Templates</h2>
              <p className="text-purple-100 mt-1">Quick-start your perfect routine</p>
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
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
          {/* Template Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-lg ${
                  selectedTemplate?.id === template.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                <div className="text-3xl mb-2">{template.icon}</div>
                <h3 className="font-semibold text-gray-900">{template.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                <div className="mt-3 text-xs text-purple-600 font-medium">
                  {template.events.length} events
                </div>
              </button>
            ))}
          </div>
          
          {/* Selected Template Details */}
          {selectedTemplate && (
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <h3 className="font-semibold text-gray-700 mb-3">
                {selectedTemplate.icon} {selectedTemplate.name} - Events Preview
              </h3>
              <div className="space-y-2">
                {selectedTemplate.events.map((event, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    <span className="text-gray-500">
                      {event.time || 'Flexible'}
                    </span>
                    <span className="font-medium text-gray-700">
                      {event.title}
                    </span>
                    <span className="text-gray-400">
                      ({event.duration} min)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Date Selection */}
          {selectedTemplate && (
            <div className="bg-blue-50 rounded-xl p-4 mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select starting date:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}
          
          {/* Apply Button */}
          {selectedTemplate && (
            <button
              onClick={handleApply}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white 
                       font-medium rounded-xl hover:from-purple-700 hover:to-pink-700 
                       transition-all transform hover:scale-[1.02] shadow-lg"
            >
              Apply {selectedTemplate.name} Template
            </button>
          )}
          
          {!selectedTemplate && (
            <div className="text-center py-8 text-gray-500">
              <p>Select a template above to get started!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
