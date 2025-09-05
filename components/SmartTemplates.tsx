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
  category: 'wellness' | 'productivity' | 'routine';
  events: any[];
}

const TEMPLATES: Template[] = [
  // Wellness Templates
  {
    id: 'gratitude-journal',
    name: 'Gratitude Journal',
    description: 'Daily practice to cultivate gratitude and positivity',
    icon: '🙏',
    category: 'wellness',
    events: [
      { 
        title: 'Morning Gratitude', 
        duration: 10, 
        time: '07:00',
        recurring: 'daily',
        event_type: 'gratitude',
        prompts: [
          'What are 3 things you\'re grateful for today?',
          'Who made a positive impact on your life recently?',
          'What small joy did you experience yesterday?'
        ]
      },
      { 
        title: 'Evening Reflection', 
        duration: 10, 
        time: '21:00',
        recurring: 'daily',
        event_type: 'gratitude',
        prompts: [
          'What went well today?',
          'What lesson did you learn?',
          'How did you make someone else\'s day better?'
        ]
      }
    ]
  },
  {
    id: 'meditation-journal',
    name: 'Meditation & Mindfulness',
    description: 'Track your meditation practice and mindful moments',
    icon: '🧘',
    category: 'wellness',
    events: [
      { 
        title: 'Morning Meditation', 
        duration: 15, 
        time: '06:30',
        recurring: 'daily',
        event_type: 'meditation',
        meditation_type: 'guided',
        notes: 'Start with 5 minutes if you\'re a beginner'
      },
      { 
        title: 'Mindful Break', 
        duration: 5, 
        time: '12:00',
        recurring: 'weekdays',
        event_type: 'meditation',
        meditation_type: 'breathing',
        notes: 'Quick reset during the day'
      },
      { 
        title: 'Evening Wind-down Meditation', 
        duration: 20, 
        time: '20:00',
        recurring: 'daily',
        event_type: 'meditation',
        meditation_type: 'body-scan',
        notes: 'Prepare for restful sleep'
      }
    ]
  },
  {
    id: 'wellness-combo',
    name: 'Complete Wellness Routine',
    description: 'Combine gratitude, meditation, and self-care',
    icon: '💚',
    category: 'wellness',
    events: [
      { 
        title: 'Morning Pages & Gratitude', 
        duration: 20, 
        time: '06:30',
        event_type: 'gratitude',
        notes: 'Free writing and gratitude practice'
      },
      { 
        title: 'Meditation Session', 
        duration: 15, 
        time: '06:50',
        event_type: 'meditation'
      },
      { 
        title: 'Mindful Lunch', 
        duration: 30, 
        time: '12:30',
        event_type: 'wellness',
        notes: 'Eat without distractions'
      },
      { 
        title: 'Afternoon Check-in', 
        duration: 5, 
        time: '15:00',
        event_type: 'gratitude',
        notes: 'Quick gratitude pause'
      },
      { 
        title: 'Evening Reflection', 
        duration: 15, 
        time: '21:00',
        event_type: 'gratitude'
      }
    ]
  },
  // Routine Templates
  {
    id: 'morning-routine',
    name: 'Morning Routine',
    description: 'Start your day right with a structured morning',
    icon: '☀️',
    category: 'routine',
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
    category: 'routine',
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
    category: 'routine',
    events: [
      { title: 'Grocery Shopping', duration: 60, time: '10:00' },
      { title: 'Meal Prep', duration: 120, time: '14:00' },
      { title: 'Clean Kitchen', duration: 30, time: '16:00' }
    ]
  },
  // Productivity Templates
  {
    id: 'study-session',
    name: 'Study Session',
    description: 'Productive study time with breaks',
    icon: '📚',
    category: 'productivity',
    events: [
      { title: 'Study Block 1', duration: 45, time: '14:00' },
      { title: 'Break', duration: 15, time: '14:45' },
      { title: 'Study Block 2', duration: 45, time: '15:00' },
      { title: 'Review Notes', duration: 20, time: '15:45' }
    ]
  },
  {
    id: 'deep-work',
    name: 'Deep Work Session',
    description: 'Focused work blocks for maximum productivity',
    icon: '🎯',
    category: 'productivity',
    events: [
      { title: 'Email & Planning', duration: 30, time: '09:00' },
      { title: 'Deep Work Block 1', duration: 90, time: '09:30' },
      { title: 'Break & Walk', duration: 15, time: '11:00' },
      { title: 'Deep Work Block 2', duration: 90, time: '11:15' },
      { title: 'Review & Wrap-up', duration: 30, time: '12:45' }
    ]
  },
  {
    id: 'evening-wind-down',
    name: 'Evening Wind-Down',
    description: 'Relax and prepare for better sleep',
    icon: '🌙',
    category: 'routine',
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
  const [activeCategory, setActiveCategory] = useState<'all' | 'wellness' | 'productivity' | 'routine'>('all');
  const [customizeEvents, setCustomizeEvents] = useState(false);
  const [editedEvents, setEditedEvents] = useState<any[]>([]);
  
  if (!open) return null;

  const filteredTemplates = activeCategory === 'all' 
    ? TEMPLATES 
    : TEMPLATES.filter(t => t.category === activeCategory);

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setEditedEvents([...template.events]);
    setCustomizeEvents(false);
  };

  const handleApply = () => {
    if (!selectedTemplate || !selectedDate) return;
    
    const baseDate = new Date(selectedDate);
    const eventsToApply = customizeEvents ? editedEvents : selectedTemplate.events;
    
    const events = eventsToApply.map((event) => {
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
      
      // Build the event object
      const eventData: any = {
        title: event.title,
        description: event.notes || `From ${selectedTemplate.name} template`,
        location: '',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        visibility: 'private',
        created_by: userId,
        event_type: event.event_type || 'template',
        source: 'personal',
        completed: false
      };

      // Add specific metadata for journal entries
      if (event.event_type === 'gratitude' && event.prompts) {
        eventData.metadata = {
          prompts: event.prompts,
          template_id: selectedTemplate.id
        };
      } else if (event.event_type === 'meditation') {
        eventData.metadata = {
          meditation_type: event.meditation_type,
          template_id: selectedTemplate.id
        };
      }

      // Handle recurring events (simplified for now - you can expand this)
      if (event.recurring) {
        eventData.recurring = event.recurring;
      }
      
      return eventData;
    });
    
    onApply(events);
    onClose();
  };

  const updateEventTime = (index: number, field: 'time' | 'duration', value: string | number) => {
    const updated = [...editedEvents];
    updated[index] = { ...updated[index], [field]: value };
    setEditedEvents(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
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

          {/* Category Tabs */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            {[
              { id: 'all', label: 'All Templates', icon: '🎯' },
              { id: 'wellness', label: 'Wellness', icon: '💚' },
              { id: 'productivity', label: 'Productivity', icon: '⚡' },
              { id: 'routine', label: 'Routines', icon: '📅' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-4 py-2 rounded-full flex items-center gap-2 whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-white text-purple-600 shadow-lg'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                <span>{cat.icon}</span>
                <span className="text-sm font-medium">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
          {/* Template Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-lg transform hover:scale-[1.02] ${
                  selectedTemplate?.id === template.id
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                <div className="text-3xl mb-2">{template.icon}</div>
                <h3 className="font-semibold text-gray-900">{template.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-purple-600 font-medium">
                    {template.events.length} events
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    template.category === 'wellness' ? 'bg-green-100 text-green-700' :
                    template.category === 'productivity' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {template.category}
                  </span>
                </div>
              </button>
            ))}
          </div>
          
          {/* Selected Template Details */}
          {selectedTemplate && (
            <>
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-700">
                    {selectedTemplate.icon} {selectedTemplate.name} - Events Preview
                  </h3>
                  <button
                    onClick={() => setCustomizeEvents(!customizeEvents)}
                    className="text-sm px-3 py-1 bg-white rounded-lg text-purple-600 hover:bg-purple-50 transition-colors"
                  >
                    {customizeEvents ? '✓ Customizing' : '✏️ Customize'}
                  </button>
                </div>
                
                <div className="space-y-2">
                  {(customizeEvents ? editedEvents : selectedTemplate.events).map((event, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm bg-white rounded-lg p-2">
                      {customizeEvents ? (
                        <>
                          <input
                            type="time"
                            value={event.time || '09:00'}
                            onChange={(e) => updateEventTime(idx, 'time', e.target.value)}
                            className="px-2 py-1 border rounded"
                          />
                          <input
                            type="text"
                            value={event.title}
                            onChange={(e) => {
                              const updated = [...editedEvents];
                              updated[idx].title = e.target.value;
                              setEditedEvents(updated);
                            }}
                            className="flex-1 px-2 py-1 border rounded"
                          />
                          <input
                            type="number"
                            value={event.duration}
                            onChange={(e) => updateEventTime(idx, 'duration', parseInt(e.target.value))}
                            className="w-16 px-2 py-1 border rounded"
                            min="5"
                            step="5"
                          />
                          <span className="text-gray-400 text-xs">min</span>
                        </>
                      ) : (
                        <>
                          <span className="text-gray-500">
                            {event.time || 'Flexible'}
                          </span>
                          <span className="font-medium text-gray-700 flex-1">
                            {event.title}
                          </span>
                          <span className="text-gray-400">
                            ({event.duration} min)
                          </span>
                          {event.event_type && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              event.event_type === 'gratitude' ? 'bg-purple-100 text-purple-700' :
                              event.event_type === 'meditation' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {event.event_type}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Special notes for journal templates */}
                {selectedTemplate.category === 'wellness' && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>💡 Tip:</strong> 
                      {selectedTemplate.id === 'gratitude-journal' && 
                        ' Your gratitude entries will be tracked and you can view insights in the Analytics dashboard.'}
                      {selectedTemplate.id === 'meditation-journal' && 
                        ' Track your meditation streak and mindfulness progress over time.'}
                      {selectedTemplate.id === 'wellness-combo' && 
                        ' This complete routine combines multiple wellness practices for holistic wellbeing.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Date Selection */}
              <div className="bg-blue-50 rounded-xl p-4 mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select starting date:
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {selectedTemplate.events.some(e => e.recurring) && (
                    <span className="text-sm text-blue-700">
                      📅 This template includes recurring events
                    </span>
                  )}
                </div>
              </div>

              {/* Apply Button */}
              <button
                onClick={handleApply}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white 
                         font-medium rounded-xl hover:from-purple-700 hover:to-pink-700 
                         transition-all transform hover:scale-[1.02] shadow-lg"
              >
                Apply {selectedTemplate.name} Template
              </button>
            </>
          )}
          
          {!selectedTemplate && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">🎯</div>
              <p className="text-lg font-medium mb-2">Select a template to get started!</p>
              <p className="text-sm">Choose from wellness routines, productivity boosters, or daily schedules</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
