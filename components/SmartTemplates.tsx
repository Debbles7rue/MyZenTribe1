// components/SmartTemplates.tsx
import React from 'react';

interface SmartTemplatesProps {
  open: boolean;
  onClose: () => void;
  onApply: (templateData: any) => void;
  userId: string;
  // Optional props for prepopulating form (when used from calendar page)
  setForm?: (form: any) => void;
  setOpenCreate?: (open: boolean) => void;
  isMobile?: boolean;
}

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  duration: number; // in minutes
  prepopulatedData: {
    title: string;
    description: string;
    duration: number;
    event_type?: string;
  };
}

const TEMPLATES: Template[] = [
  // 🌅 DAILY ROUTINES
  {
    id: 'morning-routine',
    name: 'Morning Routine',
    description: 'Start your day right with a structured morning',
    icon: '☀️',
    category: 'Daily Routines',
    duration: 90,
    prepopulatedData: {
      title: 'Morning Routine',
      description: 'Wake up & stretch (10 min) → Morning coffee (15 min) → Review daily goals (15 min) → Get ready (30 min) → Breakfast (20 min)',
      duration: 90,
      event_type: 'personal'
    }
  },
  {
    id: 'gratitude-journal',
    name: 'Gratitude Journal',
    description: 'Daily gratitude practice & reflection',
    icon: '📝',
    category: 'Daily Routines',
    duration: 15,
    prepopulatedData: {
      title: 'Gratitude Journal',
      description: 'Write 3 things I\'m grateful for today + reflection on positive moments',
      duration: 15,
      event_type: 'personal'
    }
  },
  {
    id: 'evening-wind-down',
    name: 'Evening Wind-Down',
    description: 'Relax and prepare for better sleep',
    icon: '🌙',
    category: 'Daily Routines',
    duration: 90,
    prepopulatedData: {
      title: 'Evening Wind-Down',
      description: 'Dinner (45 min) → Evening walk (30 min) → Prepare for bed (15 min)',
      duration: 90,
      event_type: 'personal'
    }
  },
  
  // 💪 HEALTH & WELLNESS
  {
    id: 'workout-session',
    name: 'Workout Session',
    description: 'Stay fit with exercise',
    icon: '💪',
    category: 'Health & Wellness',
    duration: 45,
    prepopulatedData: {
      title: 'Workout Session',
      description: 'Cardio warm-up (10 min) → Strength training (30 min) → Cool down & stretch (5 min)',
      duration: 45,
      event_type: 'personal'
    }
  },
  {
    id: 'meditation-session',
    name: 'Meditation Session',
    description: 'Mindfulness and relaxation practice',
    icon: '🧘',
    category: 'Health & Wellness',
    duration: 20,
    prepopulatedData: {
      title: 'Meditation Session',
      description: 'Mindfulness practice - breathing exercises, body scan, and relaxation',
      duration: 20,
      event_type: 'personal'
    }
  },
  {
    id: 'walk-fresh-air',
    name: 'Walk/Fresh Air',
    description: 'Get outside and move',
    icon: '🚶',
    category: 'Health & Wellness',
    duration: 30,
    prepopulatedData: {
      title: 'Walk & Fresh Air',
      description: 'Take a refreshing walk outdoors - clear your mind and get some exercise',
      duration: 30,
      event_type: 'personal'
    }
  },
  {
    id: 'self-care',
    name: 'Self-Care Time',
    description: 'Nurture yourself',
    icon: '🛁',
    category: 'Health & Wellness',
    duration: 60,
    prepopulatedData: {
      title: 'Self-Care Time',
      description: 'Dedicated time for self-care - bath, skincare, relaxation, or anything that helps you recharge',
      duration: 60,
      event_type: 'personal'
    }
  },
  
  // 🎯 PRODUCTIVITY & LEARNING
  {
    id: 'study-session',
    name: 'Study Session',
    description: 'Productive study time with breaks',
    icon: '📚',
    category: 'Productivity & Learning',
    duration: 125,
    prepopulatedData: {
      title: 'Study Session',
      description: 'Study Block 1 (45 min) → Break (15 min) → Study Block 2 (45 min) → Review notes (20 min)',
      duration: 125,
      event_type: 'personal'
    }
  },
  {
    id: 'reading-time',
    name: 'Reading Time',
    description: 'Dive into a good book',
    icon: '📖',
    category: 'Productivity & Learning',
    duration: 45,
    prepopulatedData: {
      title: 'Reading Time',
      description: 'Dedicated time to read - books, articles, or learning materials',
      duration: 45,
      event_type: 'personal'
    }
  },
  {
    id: 'creative-hobby',
    name: 'Creative/Hobby Time',
    description: 'Pursue your passions',
    icon: '🎨',
    category: 'Productivity & Learning',
    duration: 60,
    prepopulatedData: {
      title: 'Creative Time',
      description: 'Time for your hobbies - art, music, writing, crafts, or any creative pursuit',
      duration: 60,
      event_type: 'personal'
    }
  },
  
  // ❤️ PERSONAL LIFE
  {
    id: 'family-time',
    name: 'Family Time',
    description: 'Quality time with loved ones',
    icon: '👨‍👩‍👧‍👦',
    category: 'Personal Life',
    duration: 60,
    prepopulatedData: {
      title: 'Family Time',
      description: 'Dedicated time for family activities, conversations, or games',
      duration: 60,
      event_type: 'personal'
    }
  },
  {
    id: 'meal-prep',
    name: 'Meal Prep Sunday',
    description: 'Organize your weekly meals efficiently',
    icon: '🍱',
    category: 'Personal Life',
    duration: 120,
    prepopulatedData: {
      title: 'Meal Prep Sunday',
      description: 'Plan meals for the week, grocery list, batch cooking, and food storage',
      duration: 120,
      event_type: 'personal'
    }
  },
  {
    id: 'custom-template',
    name: 'Custom Template',
    description: 'Create your own recurring activity',
    icon: '✏️',
    category: 'Personal Life',
    duration: 60,
    prepopulatedData: {
      title: '',
      description: '',
      duration: 60,
      event_type: 'personal'
    }
  }
];

export default function SmartTemplates({ 
  open, 
  onClose, 
  onApply, 
  userId,
  setForm,
  setOpenCreate,
  isMobile = false
}: SmartTemplatesProps) {
  
  if (!open) return null;

  const handleTemplateClick = (template: Template) => {
    if (!userId) {
      console.error('Missing userId');
      return;
    }
    
    // If setForm and setOpenCreate are provided (calendar page context)
    // Prepopulate the form instead of creating events directly
    if (setForm && setOpenCreate) {
      const now = new Date();
      const endTime = new Date(now.getTime() + template.duration * 60000);
      
      setForm((prev: any) => ({
        ...prev,
        title: template.prepopulatedData.title,
        description: template.prepopulatedData.description,
        date: now.toISOString().split('T')[0],
        time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
        endTime: `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`,
        event_type: template.prepopulatedData.event_type || 'personal'
      }));
      
      onClose();
      
      // Small delay to ensure modal closes before opening create modal
      setTimeout(() => {
        setOpenCreate(true);
      }, 100);
    } else {
      // Otherwise, pass to onApply for direct event creation (tools page context)
      onApply({
        template: template,
        prepopulatedData: template.prepopulatedData
      });
    }
  };

  // Group templates by category
  const templatesByCategory = TEMPLATES.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  const categoryColors: Record<string, string> = {
    'Daily Routines': 'from-orange-500 to-amber-500',
    'Health & Wellness': 'from-green-500 to-emerald-500',
    'Productivity & Learning': 'from-purple-500 to-pink-500',
    'Personal Life': 'from-blue-500 to-cyan-500'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      
      <div 
        className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full overflow-hidden ${
          isMobile ? 'max-h-[90vh]' : 'max-w-5xl max-h-[85vh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}>✨ Smart Templates</h2>
              <p className={`text-purple-100 mt-1 ${isMobile ? 'text-sm' : ''}`}>
                Click any template to customize and add to your calendar
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className={`p-4 sm:p-6 overflow-y-auto ${isMobile ? 'max-h-[calc(90vh-120px)]' : 'max-h-[calc(85vh-120px)]'}`}>
          {Object.entries(templatesByCategory).map(([category, templates]) => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className={`font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2 ${
                isMobile ? 'text-base' : 'text-lg'
              }`}>
                <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${categoryColors[category]}`} />
                {category}
              </h3>
              
              <div className={`grid gap-3 sm:gap-4 ${
                isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              }`}>
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateClick(template)}
                    className="p-3 sm:p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 
                             bg-white dark:bg-gray-750 hover:border-purple-500 hover:bg-purple-50 
                             dark:hover:bg-purple-900/20 transition-all hover:shadow-lg text-left
                             transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className={`mb-2 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>{template.icon}</div>
                    <h3 className={`font-semibold text-gray-900 dark:text-white ${isMobile ? 'text-base' : ''}`}>
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{template.description}</p>
                    <div className="mt-2 sm:mt-3 flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 font-medium">
                      <span>⏰ {template.duration} min</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          
          {/* Info Banner */}
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className={`text-blue-800 dark:text-blue-200 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                <strong>Tip:</strong> After selecting a template, you'll be able to customize the date, time, and any other details before adding it to your calendar.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
