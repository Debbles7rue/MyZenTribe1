// app/(protected)/calendar/components/PersonalDates.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface PersonalDate {
  id: string;
  name: string;
  type: 'birthday' | 'anniversary' | 'memorial' | 'custom';
  date: string; // MM-DD format for recurring
  year?: number; // Original year for age calculation
  person_name: string;
  notes?: string;
  reminder_days_before?: number;
  emoji?: string;
}

interface PersonalDatesProps {
  onClose: () => void;
  userId: string | null;
}

export default function PersonalDates({ onClose, userId }: PersonalDatesProps) {
  const [personalDates, setPersonalDates] = useState<PersonalDate[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'view' | 'add'>('view');
  
  const [newDate, setNewDate] = useState({
    type: 'birthday' as PersonalDate['type'],
    person_name: '',
    date: '',
    year: '',
    notes: '',
    reminder_days_before: 7
  });

  const typeEmojis = {
    birthday: '🎂',
    anniversary: '💑',
    memorial: '🕊️',
    custom: '⭐'
  };

  useEffect(() => {
    loadPersonalDates();
  }, [userId]);

  const loadPersonalDates = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Load from a personal_dates table or from events with special type
      const { data, error } = await supabase
        .from('personal_dates')
        .select('*')
        .eq('user_id', userId)
        .order('date');
      
      if (error) {
        // If table doesn't exist, use localStorage as fallback
        const stored = localStorage.getItem(`personal_dates_${userId}`);
        if (stored) {
          setPersonalDates(JSON.parse(stored));
        }
      } else {
        setPersonalDates(data || []);
      }
    } catch (e) {
      console.error('Error loading personal dates:', e);
      // Fallback to localStorage
      const stored = localStorage.getItem(`personal_dates_${userId}`);
      if (stored) {
        setPersonalDates(JSON.parse(stored));
      }
    } finally {
      setLoading(false);
    }
  };

  const savePersonalDate = async () => {
    if (!userId || !newDate.person_name || !newDate.date) return;

    const personalDate: Omit<PersonalDate, 'id'> = {
      type: newDate.type,
      person_name: newDate.person_name.trim(),
      name: `${newDate.person_name}'s ${newDate.type}`,
      date: newDate.date.slice(5), // Store as MM-DD
      year: newDate.year ? parseInt(newDate.year) : undefined,
      notes: newDate.notes.trim(),
      reminder_days_before: newDate.reminder_days_before,
      emoji: typeEmojis[newDate.type]
    };

    try {
      // Try to save to Supabase
      const { data, error } = await supabase
        .from('personal_dates')
        .insert({
          ...personalDate,
          user_id: userId
        })
        .select()
        .single();

      if (error) throw error;
      
      setPersonalDates([...personalDates, data]);
    } catch (e) {
      // Fallback to localStorage
      const newItem = { ...personalDate, id: `local_${Date.now()}` };
      const updated = [...personalDates, newItem];
      setPersonalDates(updated);
      localStorage.setItem(`personal_dates_${userId}`, JSON.stringify(updated));
    }

    // Reset form
    setNewDate({
      type: 'birthday',
      person_name: '',
      date: '',
      year: '',
      notes: '',
      reminder_days_before: 7
    });
    setShowAddForm(false);

    // Create calendar events for this year and next
    await createRecurringEvents(personalDate);
  };

  const createRecurringEvents = async (personalDate: Omit<PersonalDate, 'id'>) => {
    const currentYear = new Date().getFullYear();
    
    for (const year of [currentYear, currentYear + 1]) {
      const eventDate = `${year}-${personalDate.date}`;
      
      // Calculate age if birthday with year
      let title = personalDate.name;
      if (personalDate.type === 'birthday' && personalDate.year) {
        const age = year - personalDate.year;
        title = `${personalDate.person_name}'s ${age}th Birthday`;
      } else if (personalDate.type === 'anniversary' && personalDate.year) {
        const years = year - personalDate.year;
        title = `${personalDate.person_name} - ${years} Year Anniversary`;
      }

      try {
        await supabase.from('events').insert({
          title,
          description: personalDate.notes,
          start_time: `${eventDate}T00:00:00`,
          end_time: `${eventDate}T23:59:59`,
          created_by: userId,
          event_type: 'personal_date',
          visibility: 'private',
          all_day: true,
          recurring_type: personalDate.type
        });

        // Create reminder if requested
        if (personalDate.reminder_days_before && personalDate.reminder_days_before > 0) {
          const reminderDate = new Date(eventDate);
          reminderDate.setDate(reminderDate.getDate() - personalDate.reminder_days_before);
          
          await supabase.from('events').insert({
            title: `Reminder: ${title} in ${personalDate.reminder_days_before} days`,
            start_time: reminderDate.toISOString(),
            end_time: reminderDate.toISOString(),
            created_by: userId,
            event_type: 'reminder',
            visibility: 'private'
          });
        }
      } catch (e) {
        console.error('Error creating recurring event:', e);
      }
    }
  };

  const deletePersonalDate = async (id: string) => {
    try {
      if (id.startsWith('local_')) {
        // Local storage item
        const updated = personalDates.filter(d => d.id !== id);
        setPersonalDates(updated);
        localStorage.setItem(`personal_dates_${userId}`, JSON.stringify(updated));
      } else {
        // Supabase item
        await supabase.from('personal_dates').delete().eq('id', id);
        setPersonalDates(personalDates.filter(d => d.id !== id));
      }
    } catch (e) {
      console.error('Error deleting:', e);
    }
  };

  const getUpcoming = () => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    
    return personalDates
      .map(pd => {
        const [month, day] = pd.date.split('-').map(Number);
        let daysUntil = 0;
        
        // Calculate days until next occurrence
        const thisYear = new Date(today.getFullYear(), month - 1, day);
        if (thisYear >= today) {
          daysUntil = Math.ceil((thisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        } else {
          const nextYear = new Date(today.getFullYear() + 1, month - 1, day);
          daysUntil = Math.ceil((nextYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }
        
        return { ...pd, daysUntil };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-3xl">🎉</span>
                Personal Dates & Memories
              </h2>
              <p className="text-sm mt-1 text-white/90">Never forget another special day</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-4 border-b dark:border-gray-700">
          <button
            onClick={() => setActiveTab('view')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'view'
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            View All
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'add'
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Add New
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'view' ? (
            <>
              {/* Upcoming Section */}
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-gray-200">
                  📅 Upcoming
                </h3>
                <div className="grid gap-3">
                  {getUpcoming().map(pd => (
                    <div key={pd.id} className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{pd.emoji}</span>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {pd.person_name}'s {pd.type}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              In {pd.daysUntil} days
                              {pd.year && pd.type === 'birthday' && ` • Turning ${new Date().getFullYear() - pd.year}`}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => deletePersonalDate(pd.id)}
                          className="text-red-500 hover:text-red-700 p-2"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* All Dates */}
              <div>
                <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-gray-200">
                  📋 All Personal Dates
                </h3>
                <div className="grid gap-2">
                  {personalDates.map(pd => (
                    <div key={pd.id} className="bg-white dark:bg-gray-700 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span>{pd.emoji}</span>
                        <div>
                          <span className="font-medium">{pd.person_name}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                            {pd.type} • {pd.date}
                            {pd.notes && ` • ${pd.notes}`}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deletePersonalDate(pd.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Add Form */
            <div className="max-w-md mx-auto">
              <div className="space-y-4">
                {/* Type Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(typeEmojis).map(([type, emoji]) => (
                      <button
                        key={type}
                        onClick={() => setNewDate({ ...newDate, type: type as PersonalDate['type'] })}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          newDate.type === type
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        <span className="text-2xl mr-2">{emoji}</span>
                        <span className="capitalize">{type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Person Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {newDate.type === 'anniversary' ? 'Names/Title' : 'Person\'s Name'}
                  </label>
                  <input
                    type="text"
                    value={newDate.person_name}
                    onChange={(e) => setNewDate({ ...newDate, person_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700"
                    placeholder={newDate.type === 'anniversary' ? 'John & Jane' : 'John Doe'}
                  />
                </div>

                {/* Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Date (Every Year)</label>
                    <input
                      type="date"
                      value={newDate.date}
                      onChange={(e) => setNewDate({ ...newDate, date: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {newDate.type === 'birthday' ? 'Birth Year' : 'Start Year'} (Optional)
                    </label>
                    <input
                      type="number"
                      value={newDate.year}
                      onChange={(e) => setNewDate({ ...newDate, year: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700"
                      placeholder="1990"
                      min="1900"
                      max={new Date().getFullYear()}
                    />
                  </div>
                </div>

                {/* Reminder */}
                <div>
                  <label className="block text-sm font-medium mb-2">Remind me (days before)</label>
                  <select
                    value={newDate.reminder_days_before}
                    onChange={(e) => setNewDate({ ...newDate, reminder_days_before: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700"
                  >
                    <option value={0}>No reminder</option>
                    <option value={1}>1 day before</option>
                    <option value={3}>3 days before</option>
                    <option value={7}>1 week before</option>
                    <option value={14}>2 weeks before</option>
                    <option value={30}>1 month before</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                  <textarea
                    value={newDate.notes}
                    onChange={(e) => setNewDate({ ...newDate, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700"
                    rows={3}
                    placeholder="Gift ideas, favorite things, memories..."
                  />
                </div>

                {/* Save Button */}
                <button
                  onClick={savePersonalDate}
                  disabled={!newDate.person_name || !newDate.date}
                  className={`w-full py-3 rounded-lg font-medium transition-all ${
                    newDate.person_name && newDate.date
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Save Personal Date
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
