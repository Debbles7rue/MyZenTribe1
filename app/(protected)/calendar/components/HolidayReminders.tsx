// app/(protected)/calendar/components/HolidayReminders.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Holiday {
  name: string;
  date: string;
  emoji: string;
  description: string;
  category: 'traditional' | 'fun' | 'personal' | 'special' | 'international';
  recurring?: boolean;
  color?: string;
}

interface HolidayRemindersProps {
  onClose: () => void;
  onAddToCalendar: (holiday: Holiday) => Promise<boolean> | void;
  onRemoveFromCalendar?: (eventId: string) => Promise<void>;
  existingEvents?: any[];
  showToast?: (toast: { type: string; message: string }) => void;
}

// Move holiday data outside component to avoid initialization issues
const getCurrentYearHolidays = (year: number) => {
  const traditionalHolidays: Holiday[] = [
    { name: "New Year's Day", date: `${year}-01-01`, emoji: "🎊", description: "Fresh starts and resolutions", category: 'traditional', color: '#FFD700' },
    { name: "Martin Luther King Jr. Day", date: `${year}-01-20`, emoji: "✊", description: "Day of service", category: 'traditional', color: '#4B5563' },
    { name: "Valentine's Day", date: `${year}-02-14`, emoji: "💝", description: "Love is in the air", category: 'traditional', color: '#EC4899' },
    { name: "Presidents' Day", date: `${year}-02-17`, emoji: "🎩", description: "Honoring leadership", category: 'traditional', color: '#3B82F6' },
    { name: "Easter", date: `${year}-04-20`, emoji: "🐰", description: "Spring celebration", category: 'traditional', color: '#FCD34D' },
    { name: "Memorial Day", date: `${year}-05-26`, emoji: "🇺🇸", description: "Remember and honor", category: 'traditional', color: '#EF4444' },
    { name: "Independence Day", date: `${year}-07-04`, emoji: "🎆", description: "Fireworks and freedom", category: 'traditional', color: '#3B82F6' },
    { name: "Labor Day", date: `${year}-09-01`, emoji: "⚒️", description: "Celebrating workers", category: 'traditional', color: '#6B7280' },
    { name: "Halloween", date: `${year}-10-31`, emoji: "🎃", description: "Tricks and treats", category: 'traditional', color: '#F97316' },
    { name: "Thanksgiving", date: `${year}-11-27`, emoji: "🦃", description: "Gratitude and pie", category: 'traditional', color: '#92400E' },
    { name: "Christmas", date: `${year}-12-25`, emoji: "🎄", description: "Joy to the world", category: 'traditional', color: '#059669' },
    { name: "New Year's Eve", date: `${year}-12-31`, emoji: "🎉", description: "Out with the old, in with the new", category: 'traditional', color: '#FFD700' },
  ];

  const funHolidays: Holiday[] = [
    { name: "National Spaghetti Day", date: `${year}-01-04`, emoji: "🍝", description: "Pasta la vista!", category: 'fun', color: '#DC2626' },
    { name: "National Pizza Day", date: `${year}-02-09`, emoji: "🍕", description: "Pizza party time!", category: 'fun', color: '#EF4444' },
    { name: "Palindrome Day", date: `${year}-02-22`, emoji: "🔄", description: "2/22!", category: 'fun', color: '#3B82F6' },
    { name: "National Pancake Day", date: `${year}-02-28`, emoji: "🥞", description: "Stack 'em high", category: 'fun', color: '#FCD34D' },
    { name: "Pi Day", date: `${year}-03-14`, emoji: "🥧", description: "3.14159...", category: 'fun', color: '#8B5CF6' },
    { name: "National Puppy Day", date: `${year}-03-23`, emoji: "🐶", description: "Celebrate puppies!", category: 'fun', color: '#92400E' },
    { name: "Star Wars Day", date: `${year}-05-04`, emoji: "⚔️", description: "May the 4th be with you", category: 'fun', color: '#1E40AF' },
    { name: "National Donut Day", date: `${year}-06-07`, emoji: "🍩", description: "Sweet treats allowed", category: 'fun', color: '#EC4899' },
    { name: "National Cheese Day", date: `${year}-06-04`, emoji: "🧀", description: "Say cheese!", category: 'fun', color: '#FCD34D' },
    { name: "World UFO Day", date: `${year}-07-02`, emoji: "🛸", description: "The truth is out there", category: 'fun', color: '#10B981' },
    { name: "World Chocolate Day", date: `${year}-07-07`, emoji: "🍫", description: "Sweet indulgence", category: 'fun', color: '#7C2D12' },
    { name: "World Emoji Day", date: `${year}-07-17`, emoji: "😀", description: "Express yourself!", category: 'fun', color: '#FCD34D' },
    { name: "National Ice Cream Day", date: `${year}-07-21`, emoji: "🍦", description: "Cool treats", category: 'fun', color: '#06B6D4' },
    { name: "National Dog Day", date: `${year}-08-26`, emoji: "🐕", description: "Celebrate all dogs", category: 'fun', color: '#92400E' },
    { name: "International Bacon Day", date: `${year}-08-31`, emoji: "🥓", description: "Sizzle sizzle", category: 'fun', color: '#DC2626' },
    { name: "Talk Like a Pirate Day", date: `${year}-09-19`, emoji: "🏴‍☠️", description: "Ahoy matey!", category: 'fun', color: '#991B1B' },
    { name: "National Coffee Day", date: `${year}-09-29`, emoji: "☕", description: "Caffeine celebration", category: 'fun', color: '#92400E' },
    { name: "National Taco Day", date: `${year}-10-04`, emoji: "🌮", description: "Taco Tuesday special!", category: 'fun', color: '#FCD34D' },
    { name: "National Pasta Day", date: `${year}-10-17`, emoji: "🍜", description: "Carb loading day!", category: 'fun', color: '#F59E0B' },
    { name: "National Cat Day", date: `${year}-10-29`, emoji: "🐱", description: "Meow meow", category: 'fun', color: '#7C3AED' },
    { name: "Origami Day", date: `${year}-11-11`, emoji: "🗾", description: "The art of paper folding", category: 'fun', color: '#8B5CF6' },
    { name: "National Cookie Day", date: `${year}-12-04`, emoji: "🍪", description: "Fresh from the oven", category: 'fun', color: '#92400E' },
  ];

  const specialDays: Holiday[] = [
    { name: "Mother's Day", date: `${year}-05-11`, emoji: "💐", description: "Celebrate Mom", category: 'special', color: '#EC4899' },
    { name: "Father's Day", date: `${year}-06-15`, emoji: "👔", description: "Dad's special day", category: 'special', color: '#3B82F6' },
    { name: "Grandparents Day", date: `${year}-09-07`, emoji: "👴👵", description: "Honor grandparents", category: 'special', color: '#8B5CF6' },
    { name: "National Daughters Day", date: `${year}-09-25`, emoji: "👧", description: "Celebrate daughters", category: 'special', color: '#EC4899' },
    { name: "National Sons Day", date: `${year}-03-04`, emoji: "👦", description: "Celebrate sons", category: 'special', color: '#3B82F6' },
    { name: "National Siblings Day", date: `${year}-04-10`, emoji: "👫", description: "Brother & sister love", category: 'special', color: '#8B5CF6' },
    { name: "Earth Day", date: `${year}-04-22`, emoji: "🌍", description: "Planet awareness", category: 'special', color: '#10B981' },
    { name: "April Fool's Day", date: `${year}-04-01`, emoji: "🃏", description: "Pranks allowed!", category: 'special', color: '#F59E0B' },
    { name: "St. Patrick's Day", date: `${year}-03-17`, emoji: "☘️", description: "Luck of the Irish", category: 'special', color: '#10B981' },
    { name: "Groundhog Day", date: `${year}-02-02`, emoji: "🦫", description: "6 more weeks?", category: 'special', color: '#92400E' },
    { name: "Friday the 13th", date: `${year}-09-13`, emoji: "😱", description: "Spooky day", category: 'special', color: '#1F2937' },
    { name: "Leap Day", date: `${year}-02-29`, emoji: "🐸", description: "Extra special (if leap year)", category: 'special', color: '#10B981' },
    { name: "National Pet Day", date: `${year}-04-11`, emoji: "🐾", description: "All pets deserve love", category: 'special', color: '#F59E0B' },
    { name: "National Bird Day", date: `${year}-01-05`, emoji: "🦜", description: "Tweet tweet!", category: 'special', color: '#06B6D4' },
    { name: "Charlie Kirk Remembrance Day", date: `${year}-10-14`, emoji: "🕊️", description: "National Day of Remembrance", category: 'special', color: '#1F2937' },
  ];

  const internationalHolidays: Holiday[] = [
    { name: "Chinese New Year", date: `${year}-02-10`, emoji: "🐉", description: "Year of the Dragon", category: 'international', color: '#DC2626' },
    { name: "Mardi Gras", date: `${year}-02-13`, emoji: "🎭", description: "Let the good times roll", category: 'international', color: '#7C3AED' },
    { name: "Ramadan Begins", date: `${year}-03-01`, emoji: "🌙", description: "Islamic holy month", category: 'international', color: '#059669' },
    { name: "Purim", date: `${year}-03-24`, emoji: "👑", description: "Festival of lots", category: 'international', color: '#EC4899' },
    { name: "Eid al-Fitr", date: `${year}-04-10`, emoji: "🌟", description: "Breaking of the fast", category: 'international', color: '#F59E0B' },
    { name: "Passover (First Day)", date: `${year}-04-23`, emoji: "🍷", description: "Festival of freedom", category: 'international', color: '#3B82F6' },
    { name: "Cinco de Mayo", date: `${year}-05-05`, emoji: "🇲🇽", description: "Mexican heritage", category: 'international', color: '#059669' },
    { name: "Victoria Day (Canada)", date: `${year}-05-19`, emoji: "🇨🇦", description: "Queen Victoria's birthday", category: 'international', color: '#DC2626' },
    { name: "Shavuot", date: `${year}-06-12`, emoji: "📜", description: "Feast of Weeks", category: 'international', color: '#10B981' },
    { name: "Midsummer's Eve", date: `${year}-06-21`, emoji: "☀️", description: "Summer solstice celebration", category: 'international', color: '#F59E0B' },
    { name: "Canada Day", date: `${year}-07-01`, emoji: "🍁", description: "Canadian Independence", category: 'international', color: '#DC2626' },
    { name: "Bastille Day", date: `${year}-07-14`, emoji: "🇫🇷", description: "French National Day", category: 'international', color: '#3B82F6' },
    { name: "Oktoberfest", date: `${year}-09-21`, emoji: "🍺", description: "German celebration", category: 'international', color: '#F59E0B' },
    { name: "Canadian Thanksgiving", date: `${year}-10-13`, emoji: "🦃", description: "Harvest celebration", category: 'international', color: '#F97316' },
    { name: "Rosh Hashanah", date: `${year}-10-03`, emoji: "🍎", description: "Jewish New Year", category: 'international', color: '#F59E0B' },
    { name: "Yom Kippur", date: `${year}-10-12`, emoji: "📖", description: "Day of Atonement", category: 'international', color: '#8B5CF6' },
    { name: "Sukkot", date: `${year}-10-17`, emoji: "🌿", description: "Feast of Tabernacles", category: 'international', color: '#10B981' },
    { name: "Diwali", date: `${year}-11-01`, emoji: "🪔", description: "Festival of Lights", category: 'international', color: '#F59E0B' },
    { name: "Day of the Dead", date: `${year}-11-02`, emoji: "💀", description: "Día de los Muertos", category: 'international', color: '#7C3AED' },
    { name: "Guy Fawkes Day", date: `${year}-11-05`, emoji: "🎆", description: "Bonfire Night (UK)", category: 'international', color: '#DC2626' },
    { name: "Remembrance Day (Canada)", date: `${year}-11-11`, emoji: "🌺", description: "Honor veterans", category: 'international', color: '#DC2626' },
    { name: "St. Lucia Day", date: `${year}-12-13`, emoji: "🕯️", description: "Festival of Light (Sweden)", category: 'international', color: '#FCD34D' },
    { name: "Hanukkah (First Night)", date: `${year}-12-25`, emoji: "🕎", description: "Festival of dedication", category: 'international', color: '#3B82F6' },
    { name: "Kwanzaa", date: `${year}-12-26`, emoji: "🕯️", description: "African heritage", category: 'international', color: '#DC2626' },
    { name: "Boxing Day", date: `${year}-12-26`, emoji: "🎁", description: "UK/Canada/Australia", category: 'international', color: '#10B981' },
  ];

  return {
    traditionalHolidays,
    funHolidays,
    specialDays,
    internationalHolidays
  };
};

export default function HolidayReminders({ onClose, onAddToCalendar, onRemoveFromCalendar, existingEvents = [], showToast }: HolidayRemindersProps) {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedHolidays, setSelectedHolidays] = useState<Set<string>>(new Set());
  const [personalEvents, setPersonalEvents] = useState<Holiday[]>([]);
  const [showAddPersonal, setShowAddPersonal] = useState(false);
  const [newPersonalEvent, setNewPersonalEvent] = useState({
    name: '',
    date: '',
    type: 'birthday' as 'birthday' | 'anniversary' | 'other',
    description: ''
  });
  const [enabledCategories, setEnabledCategories] = useState<Set<string>>(
    new Set(['traditional', 'special', 'fun', 'personal'])
  );
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  const [isAddingAll, setIsAddingAll] = useState(false);
  const [addProgress, setAddProgress] = useState(0);
  const [showRemoveMode, setShowRemoveMode] = useState(false);

  // Get holiday data
  const { traditionalHolidays, funHolidays, specialDays, internationalHolidays } = useMemo(
    () => getCurrentYearHolidays(currentYear),
    [currentYear]
  );

  // Load personal events from Supabase
  useEffect(() => {
    loadPersonalEvents();
  }, [currentYear]);

  const loadPersonalEvents = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('personal_holidays')
      .select('*')
      .eq('user_id', user.id);

    if (data && !error) {
      const formattedEvents = data.map(event => ({
        name: event.name,
        date: `${currentYear}-${event.month.toString().padStart(2, '0')}-${event.day.toString().padStart(2, '0')}`,
        emoji: event.emoji || (event.type === 'birthday' ? '🎂' : event.type === 'anniversary' ? '💑' : '⭐'),
        description: event.description || '',
        category: 'personal' as const,
        recurring: true,
        color: event.type === 'birthday' ? '#EC4899' : event.type === 'anniversary' ? '#8B5CF6' : '#3B82F6'
      }));
      setPersonalEvents(formattedEvents);
    }
  };

  // Combine all holidays
  const allHolidays = useMemo(() => [
    ...traditionalHolidays,
    ...funHolidays,
    ...specialDays,
    ...internationalHolidays,
    ...personalEvents
  ], [traditionalHolidays, funHolidays, specialDays, internationalHolidays, personalEvents]);

  // Get matching events for each holiday
  const getMatchingEvents = useCallback((holiday: Holiday) => {
    if (!existingEvents || existingEvents.length === 0) return [];
    
    return existingEvents.filter(event => {
      if (!event.title) return false;
      
      const eventTitle = event.title.toLowerCase();
      const holidayName = holiday.name.toLowerCase();
      const holidayEmoji = holiday.emoji;
      
      // Check if event title matches the holiday
      if (eventTitle.includes(holidayName) || 
          eventTitle === `${holidayEmoji} ${holidayName}` ||
          eventTitle === holidayName) {
        // Check if it's for current or next year
        const eventDate = new Date(event.start_time || event.start);
        const eventYear = eventDate.getFullYear();
        
        if (eventYear === currentYear || eventYear === nextYear) {
          return true;
        }
      }
      return false;
    });
  }, [existingEvents, currentYear, nextYear]);

  // Check which holidays are already added
  const addedHolidays = useMemo(() => {
    const added = new Set<string>();
    
    allHolidays.forEach(holiday => {
      const matchingEvents = getMatchingEvents(holiday);
      matchingEvents.forEach(event => {
        const eventDate = new Date(event.start_time || event.start);
        const eventYear = eventDate.getFullYear();
        added.add(`${holiday.name}-${eventYear}`);
      });
    });
    
    return added;
  }, [allHolidays, getMatchingEvents]);

  const filteredHolidays = useMemo(() => {
    return activeCategory === 'all' 
      ? allHolidays.filter(h => enabledCategories.has(h.category))
      : allHolidays.filter(h => h.category === activeCategory && enabledCategories.has(h.category));
  }, [activeCategory, allHolidays, enabledCategories]);

  const categories = [
    { id: 'all', label: 'All', emoji: '✨', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
    { id: 'traditional', label: 'Traditional', emoji: '🎊', color: 'bg-blue-500' },
    { id: 'fun', label: 'Fun & Quirky', emoji: '🎉', color: 'bg-yellow-500' },
    { id: 'special', label: 'Special Days', emoji: '💝', color: 'bg-pink-500' },
    { id: 'international', label: 'International', emoji: '🌍', color: 'bg-green-500' },
    { id: 'personal', label: 'Personal', emoji: '🎂', color: 'bg-purple-500' },
  ];

  const toggleCategory = (categoryId: string) => {
    if (categoryId === 'all') return;
    setEnabledCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleAddHoliday = async (holiday: Holiday, forNextYear: boolean = false) => {
    const date = new Date(holiday.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Determine the target year
    const targetYear = forNextYear ? nextYear : 
                       (date < today ? nextYear : currentYear);
    
    // Check if already added for this year
    const alreadyAddedKey = `${holiday.name}-${targetYear}`;
    if (addedHolidays.has(alreadyAddedKey) || recentlyAdded.has(alreadyAddedKey)) {
      showToast?.({ 
        type: 'info', 
        message: `${holiday.name} is already on your calendar for ${targetYear}` 
      });
      return;
    }
    
    // Create holiday with adjusted date
    const adjustedHoliday = {
      ...holiday,
      date: holiday.date.replace(currentYear.toString(), targetYear.toString())
    };
    
    // Add to recently added set for immediate UI feedback
    setRecentlyAdded(prev => new Set(prev).add(alreadyAddedKey));
    
    // Call the parent's onAddToCalendar
    await onAddToCalendar(adjustedHoliday);
    
    // Show success feedback with animation
    const element = document.getElementById(`holiday-${holiday.name.replace(/[^a-zA-Z0-9]/g, '-')}`);
    if (element) {
      element.classList.add('animate-pulse', 'bg-green-100', 'dark:bg-green-900/30');
      setTimeout(() => {
        element.classList.remove('animate-pulse', 'bg-green-100', 'dark:bg-green-900/30');
      }, 1000);
    }
  };

  const handleRemoveHoliday = async (holiday: Holiday, event: any) => {
    if (!onRemoveFromCalendar) {
      showToast?.({ 
        type: 'error', 
        message: 'Remove functionality not available. Please delete from calendar view.' 
      });
      return;
    }

    try {
      await onRemoveFromCalendar(event.id);
      
      // Remove from recently added
      const eventDate = new Date(event.start_time || event.start);
      const eventYear = eventDate.getFullYear();
      setRecentlyAdded(prev => {
        const newSet = new Set(prev);
        newSet.delete(`${holiday.name}-${eventYear}`);
        return newSet;
      });
      
      showToast?.({ 
        type: 'success', 
        message: `Removed ${holiday.name} from ${eventYear}` 
      });
      
      // Reload to refresh the UI
      window.location.reload();
    } catch (error) {
      showToast?.({ 
        type: 'error', 
        message: 'Failed to remove holiday' 
      });
    }
  };

  const addAllInCategory = async () => {
    const toAdd = filteredHolidays.filter(h => {
      const date = new Date(h.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const targetYear = date < today ? nextYear : currentYear;
      const key = `${h.name}-${targetYear}`;
      
      return !addedHolidays.has(key) && !recentlyAdded.has(key);
    });

    if (toAdd.length === 0) {
      showToast?.({ type: 'info', message: 'All holidays in this category are already added' });
      return;
    }

    setIsAddingAll(true);
    setAddProgress(0);

    // Add holidays with progress animation
    for (let i = 0; i < toAdd.length; i++) {
      const holiday = toAdd[i];
      const date = new Date(holiday.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const targetYear = date < today ? nextYear : currentYear;
      const adjustedHoliday = {
        ...holiday,
        date: holiday.date.replace(currentYear.toString(), targetYear.toString())
      };
      
      setRecentlyAdded(prev => new Set(prev).add(`${holiday.name}-${targetYear}`));
      await onAddToCalendar(adjustedHoliday);
      
      setAddProgress(Math.round(((i + 1) / toAdd.length) * 100));
      
      // Small delay for visual effect
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    showToast?.({ type: 'success', message: `🎉 Added ${toAdd.length} holidays to your calendar!` });
    
    setTimeout(() => {
      setIsAddingAll(false);
      onClose();
    }, 1500);
  };

  const savePersonalEvent = async () => {
    if (!newPersonalEvent.name || !newPersonalEvent.date) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dateObj = new Date(newPersonalEvent.date);
    const emoji = newPersonalEvent.type === 'birthday' ? '🎂' : 
                   newPersonalEvent.type === 'anniversary' ? '💑' : '⭐';

    const { error } = await supabase
      .from('personal_holidays')
      .insert({
        user_id: user.id,
        name: newPersonalEvent.name,
        type: newPersonalEvent.type,
        month: dateObj.getMonth() + 1,
        day: dateObj.getDate(),
        emoji: emoji,
        description: newPersonalEvent.description
      });

    if (!error) {
      await loadPersonalEvents();
      setShowAddPersonal(false);
      setNewPersonalEvent({ name: '', date: '', type: 'birthday', description: '' });
      showToast?.({ type: 'success', message: `Added ${newPersonalEvent.name} to your personal holidays!` });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300" 
        onClick={onClose} 
      />
      
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] my-auto overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold flex items-center gap-2">
                🎊 Holiday & Celebration Manager
              </h2>
              <p className="text-sm mt-1 text-white/90">
                Add holidays, birthdays, and fun celebrations to your calendar
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRemoveMode(!showRemoveMode)}
                className={`text-white/80 hover:text-white transition-colors p-2 rounded-lg ${
                  showRemoveMode ? 'bg-red-500/30' : 'hover:bg-white/20'
                }`}
                title={showRemoveMode ? 'Exit remove mode' : 'Remove holidays'}
              >
                {showRemoveMode ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/20 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Remove Mode Indicator */}
          {showRemoveMode && (
            <div className="mt-3 p-2 bg-red-500/30 rounded-lg text-sm">
              🗑️ Remove mode active - Click on added holidays to remove them
            </div>
          )}
          
          {/* Progress bar when adding all */}
          {isAddingAll && (
            <div className="mt-4">
              <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-white h-full transition-all duration-300 ease-out"
                  style={{ width: `${addProgress}%` }}
                />
              </div>
              <p className="text-xs mt-1 text-white/80">Adding holidays... {addProgress}%</p>
            </div>
          )}
        </div>

        {/* Category Tabs */}
        <div className="bg-gray-50 dark:bg-gray-900 p-4 border-b dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-2">
                <button
                  onClick={() => setActiveCategory(cat.id)}
                  className={`
                    px-4 py-2 rounded-full font-medium transition-all transform hover:scale-105
                    ${activeCategory === cat.id 
                      ? `${cat.color} text-white shadow-lg` 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  <span className="mr-2">{cat.emoji}</span>
                  {cat.label}
                </button>
                {cat.id !== 'all' && (
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabledCategories.has(cat.id)}
                      onChange={() => toggleCategory(cat.id)}
                      className="sr-only"
                    />
                    <div className={`
                      w-10 h-6 rounded-full transition-colors duration-200
                      ${enabledCategories.has(cat.id) ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}
                    `}>
                      <div className={`
                        w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200
                        ${enabledCategories.has(cat.id) ? 'translate-x-5' : 'translate-x-1'}
                        mt-1
                      `} />
                    </div>
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add Personal Event Button */}
        {activeCategory === 'personal' && (
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border-b dark:border-gray-700">
            {!showAddPersonal ? (
              <button
                onClick={() => setShowAddPersonal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all transform hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Birthday/Anniversary
              </button>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Name (e.g., Mom's Birthday)"
                    value={newPersonalEvent.name}
                    onChange={(e) => setNewPersonalEvent({ ...newPersonalEvent, name: e.target.value })}
                    className="px-3 py-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                  <input
                    type="date"
                    value={newPersonalEvent.date}
                    onChange={(e) => setNewPersonalEvent({ ...newPersonalEvent, date: e.target.value })}
                    className="px-3 py-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>
                <div className="flex gap-3">
                  <select
                    value={newPersonalEvent.type}
                    onChange={(e) => setNewPersonalEvent({ ...newPersonalEvent, type: e.target.value as any })}
                    className="px-3 py-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 transition-all"
                  >
                    <option value="birthday">🎂 Birthday</option>
                    <option value="anniversary">💑 Anniversary</option>
                    <option value="other">⭐ Other</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newPersonalEvent.description}
                    onChange={(e) => setNewPersonalEvent({ ...newPersonalEvent, description: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                  <button
                    onClick={savePersonalEvent}
                    disabled={!newPersonalEvent.name || !newPersonalEvent.date}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setShowAddPersonal(false);
                      setNewPersonalEvent({ name: '', date: '', type: 'birthday', description: '' });
                    }}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Holiday Grid */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 280px)' }}>
          <div className="grid gap-2">
            {filteredHolidays.map(holiday => {
              const date = new Date(holiday.date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isPast = date < today;
              
              const matchingEvents = getMatchingEvents(holiday);
              const hasCurrentYear = matchingEvents.some(e => new Date(e.start_time || e.start).getFullYear() === currentYear);
              const hasNextYear = matchingEvents.some(e => new Date(e.start_time || e.start).getFullYear() === nextYear);
              
              // Check if added for current year or next year
              const isAddedThisYear = hasCurrentYear || recentlyAdded.has(`${holiday.name}-${currentYear}`);
              const isAddedNextYear = hasNextYear || recentlyAdded.has(`${holiday.name}-${nextYear}`);
              
              // Determine what year we'd add it for
              const targetYear = isPast ? nextYear : currentYear;
              const isAlreadyAdded = isPast ? isAddedNextYear : isAddedThisYear;
              
              return (
                <div
                  key={`${holiday.name}-${holiday.date}`}
                  id={`holiday-${holiday.name.replace(/[^a-zA-Z0-9]/g, '-')}`}
                  className={`
                    relative group rounded-lg p-3 border transition-all duration-300
                    ${isAlreadyAdded 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-400' 
                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
                    }
                    ${showRemoveMode && matchingEvents.length > 0 ? 'cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20' : ''}
                  `}
                  style={{
                    borderLeftWidth: '4px',
                    borderLeftColor: holiday.color || '#6B7280'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{holiday.emoji}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        {holiday.name}
                        {holiday.recurring && (
                          <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded-full">
                            Yearly
                          </span>
                        )}
                        {isPast && !isAddedNextYear && (
                          <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 px-2 py-0.5 rounded-full">
                            Past - Add for {nextYear}
                          </span>
                        )}
                        {matchingEvents.length > 1 && (
                          <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300 px-2 py-0.5 rounded-full">
                            {matchingEvents.length}x on calendar
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} 
                        {holiday.description && ` • ${holiday.description}`}
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      {showRemoveMode && matchingEvents.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {matchingEvents.map((event, idx) => {
                            const eventYear = new Date(event.start_time || event.start).getFullYear();
                            return (
                              <button
                                key={event.id || idx}
                                onClick={() => handleRemoveHoliday(holiday, event)}
                                className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-all"
                              >
                                Remove {eventYear}
                              </button>
                            );
                          })}
                        </div>
                      ) : isAlreadyAdded ? (
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                          </svg>
                          <span className="text-sm font-medium">
                            {isPast ? `Added for ${nextYear}` : 'Added'}
                          </span>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleAddHoliday(holiday, isPast)}
                            className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 font-medium shadow-md"
                          >
                            Add {isPast && `for ${targetYear}`}
                          </button>
                          {!isPast && !isAddedNextYear && (
                            <button
                              onClick={() => handleAddHoliday(holiday, true)}
                              className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-all transform hover:scale-105"
                              title={`Also add for ${nextYear}`}
                            >
                              +{nextYear}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {filteredHolidays.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No holidays in this category</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{filteredHolidays.length} holidays</span>
              <span className="text-xs">
                {showRemoveMode ? '🗑️ Click holidays to remove' : 'Click to add instantly • Past holidays add for next year'}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all transform hover:scale-105"
              >
                Close
              </button>
              {!showRemoveMode && (
                <button
                  onClick={addAllInCategory}
                  disabled={isAddingAll}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingAll ? 'Adding...' : `Add All ${activeCategory === 'all' ? 'Enabled' : categories.find(c => c.id === activeCategory)?.label} Holidays`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
