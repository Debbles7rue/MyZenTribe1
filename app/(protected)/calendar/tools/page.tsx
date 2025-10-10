// app/(protected)/calendar/tools/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Import the actual calendar components
import CalendarAnalytics from '@/components/CalendarAnalytics';
import SmartTemplates from '@/components/SmartTemplates';
import SmartMeetingCoordinator from '@/components/SmartMeetingCoordinator';
import EventCarpoolModal from '../components/EventCarpoolModal';
import CarpoolFriendSelector from '@/components/CarpoolFriendSelector';
import { useToast } from '@/components/ToastProvider';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// NEW: Event Form Data Interface
interface EventFormData {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  repeatOption: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
  customDays?: string[];
  reminderOption: 'none' | '10min' | '30min' | '1hour' | '1day';
  location?: string;
  event_type: string;
}

// NEW: Time Block Interface
interface TimeBlock {
  id: string;
  title: string;
  color: string;
  duration: number;
}

// NEW: Template Interface
interface QuickTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  duration: number;
  event_type: string;
}

// NEW: Time Blocks Definition
const TIME_BLOCKS: TimeBlock[] = [
  { id: 'deep-work', title: 'Deep Work', color: '#8B5CF6', duration: 90 },
  { id: 'admin', title: 'Email & Admin', color: '#3B82F6', duration: 30 },
  { id: 'break', title: 'Break', color: '#10B981', duration: 15 },
  { id: 'meeting', title: 'Meeting', color: '#F59E0B', duration: 60 },
  { id: 'lunch', title: 'Lunch Break', color: '#EC4899', duration: 60 },
  { id: 'review', title: 'Daily Review', color: '#6366F1', duration: 30 },
];

// NEW: Quick Templates Definition
const QUICK_TEMPLATES: QuickTemplate[] = [
  { id: 'gratitude', name: 'Gratitude Journal', description: 'Write 3 things I\'m grateful for', icon: '📝', duration: 15, event_type: 'personal' },
  { id: 'meditation', name: 'Meditation', description: 'Mindfulness practice', icon: '🧘', duration: 20, event_type: 'personal' },
  { id: 'workout', name: 'Workout', description: 'Exercise session', icon: '💪', duration: 45, event_type: 'personal' },
  { id: 'study', name: 'Study Session', description: 'Focused learning', icon: '📚', duration: 90, event_type: 'personal' },
];

// NEW: Weekdays for custom repeat
const WEEKDAYS = [
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
  { id: 'sat', label: 'Sat' },
  { id: 'sun', label: 'Sun' },
];

// Carpool Management Types
interface CarpoolGroup {
  id: string;
  event_id: string;
  driver_id: string;
  event_title: string;
  event_date: string;
  event_location: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  participants: CarpoolParticipant[];
  messages_count: number;
  total_savings: number;
  co2_saved: number;
  meetup_location?: string;
  departure_time?: string;
  car_details?: {
    make: string;
    color: string;
    seats: number;
  };
  created_at: string;
  updated_at: string;
}

interface CarpoolParticipant {
  id: string;
  user_id: string;
  name: string;
  avatar_url?: string;
  role: 'driver' | 'passenger';
  status: 'confirmed' | 'pending' | 'declined';
  joined_at: string;
}

interface CarpoolStats {
  totalGroups: number;
  totalSavings: number;
  totalCO2Saved: number;
  totalTrips: number;
  averageGroupSize: number;
}

export default function CalendarToolsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState('overview');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedCarpoolEvent, setSelectedCarpoolEvent] = useState<any>(null);

  // Modal states for actual components
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showMeetingCoordinator, setShowMeetingCoordinator] = useState(false);
  const [showTimeBlocking, setShowTimeBlocking] = useState(false);
  const [showCarpoolChat, setShowCarpoolChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // NEW: Event Form Modal States
  const [showTimeBlockSelector, setShowTimeBlockSelector] = useState(false);
  const [showQuickTemplateSelector, setShowQuickTemplateSelector] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventFormData, setEventFormData] = useState<EventFormData>({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    repeatOption: 'none',
    customDays: [],
    reminderOption: 'none',
    event_type: 'personal'
  });
  const [isMobile, setIsMobile] = useState(false);

  // Carpool Management State
  const [carpoolGroups, setCarpoolGroups] = useState<CarpoolGroup[]>([]);
  const [carpoolStats, setCarpoolStats] = useState<CarpoolStats>({
    totalGroups: 0,
    totalSavings: 0,
    totalCO2Saved: 0,
    totalTrips: 0,
    averageGroupSize: 0
  });
  const [showCarpoolManagement, setShowCarpoolManagement] = useState(false);
  const [selectedCarpoolGroup, setSelectedCarpoolGroup] = useState<CarpoolGroup | null>(null);
  const [carpoolFilter, setCarpoolFilter] = useState<'all' | 'upcoming' | 'active' | 'completed'>('all');
  const [showCreateCarpoolGroup, setShowCreateCarpoolGroup] = useState(false);
  const [selectedEventForCarpool, setSelectedEventForCarpool] = useState<any>(null);

  // Load user and data
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const initializeData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
          // Load events for analytics
          const { data: eventsData } = await supabase
            .from('events')
            .select('*')
            .eq('created_by', user.id);
          
          if (eventsData) {
            setEvents(eventsData);
          }

          // Load friends for meeting coordinator
          const { data: friendsData } = await supabase
            .from('friendships')
            .select(`
              friend_id,
              profiles!friendships_friend_id_fkey(
                id,
                name,
                avatar_url
              )
            `)
            .eq('user_id', user.id)
            .eq('status', 'accepted');
          
          if (friendsData) {
            const formattedFriends = friendsData.map(f => ({
              friend_id: f.friend_id,
              name: f.profiles?.name || 'Unknown',
              avatar_url: f.profiles?.avatar_url,
              safe_to_carpool: false
            }));
            setFriends(formattedFriends);
          }

          await loadCarpoolData(user.id);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        showToast({ type: 'error', message: 'Failed to load calendar data' });
      } finally {
        setLoading(false);
      }
    };

    initializeData();
    return () => window.removeEventListener('resize', checkMobile);
  }, [showToast]);

  // Load Carpool Data Function
  const loadCarpoolData = async (userId: string) => {
    try {
      const { data: groups, error } = await supabase
        .from('carpool_groups')
        .select(`
          *,
          events!carpool_groups_event_id_fkey (
            title,
            start_time,
            location
          )
        `)
        .or(`driver_id.eq.${userId},participants.cs.["${userId}"]`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedGroups: CarpoolGroup[] = (groups || []).map(group => {
        const event = group.events;
        const eventDate = new Date(event?.start_time || group.created_at);
        const now = new Date();
        
        let status: CarpoolGroup['status'] = 'upcoming';
        if (eventDate < now) {
          status = 'completed';
        } else if (eventDate.getTime() - now.getTime() < 86400000) {
          status = 'active';
        }

        let participants: CarpoolParticipant[] = [];
        try {
          participants = JSON.parse(group.selected_friends || '[]').map((friendId: string, index: number) => ({
            id: `participant-${index}`,
            user_id: friendId,
            name: `Friend ${index + 1}`,
            role: friendId === group.driver_id ? 'driver' : 'passenger',
            status: 'confirmed',
            joined_at: group.created_at
          }));
        } catch (e) {
          console.warn('Failed to parse participants:', e);
        }

        const participantCount = participants.length + 1;
        const estimatedDistance = 20;
        const gasPrice = 3.50;
        const mpg = 25;
        const totalCost = (estimatedDistance / mpg) * gasPrice;
        const savings = totalCost * (participantCount - 1) / participantCount;
        const co2Saved = (estimatedDistance / mpg) * 8.89 * (participantCount - 1) / participantCount;

        return {
          id: group.id,
          event_id: group.event_id,
          driver_id: group.driver_id,
          event_title: event?.title || 'Unknown Event',
          event_date: event?.start_time || group.created_at,
          event_location: event?.location || 'Location TBD',
          status,
          participants,
          messages_count: group.messages ? JSON.parse(group.messages).length : 0,
          total_savings: savings,
          co2_saved: co2Saved,
          meetup_location: group.event_details ? JSON.parse(group.event_details).meetupLocation : undefined,
          departure_time: group.event_details ? JSON.parse(group.event_details).departureTime : undefined,
          car_details: group.car_details ? JSON.parse(group.car_details) : undefined,
          created_at: group.created_at,
          updated_at: group.updated_at
        };
      });

      setCarpoolGroups(enrichedGroups);
      
      const totalSavings = enrichedGroups.reduce((sum, group) => sum + group.total_savings, 0);
      const totalCO2Saved = enrichedGroups.reduce((sum, group) => sum + group.co2_saved, 0);
      const totalParticipants = enrichedGroups.reduce((sum, group) => sum + group.participants.length + 1, 0);

      setCarpoolStats({
        totalGroups: enrichedGroups.length,
        totalSavings,
        totalCO2Saved,
        totalTrips: enrichedGroups.filter(g => g.status === 'completed').length,
        averageGroupSize: enrichedGroups.length > 0 ? totalParticipants / enrichedGroups.length : 0
      });

    } catch (error) {
      console.error('Failed to load carpool data:', error);
    }
  };

  // NEW: Calculate end time from duration
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  };

  // NEW: Handle quick template selection
  const handleQuickTemplateSelect = (template: QuickTemplate) => {
    const now = new Date();
    const startTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const endTime = calculateEndTime(startTime, template.duration);

    setEventFormData({
      title: template.name,
      description: template.description,
      date: now.toISOString().split('T')[0],
      startTime,
      endTime,
      repeatOption: 'none',
      customDays: [],
      reminderOption: 'none',
      event_type: template.event_type
    });
    setShowQuickTemplateSelector(false);
    setShowEventForm(true);
  };

  // NEW: Handle time block selection
  const handleTimeBlockSelect = (block: TimeBlock) => {
    const now = new Date();
    const startTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const endTime = calculateEndTime(startTime, block.duration);

    setEventFormData({
      title: block.title,
      description: `Time blocked for ${block.title}`,
      date: now.toISOString().split('T')[0],
      startTime,
      endTime,
      repeatOption: 'none',
      customDays: [],
      reminderOption: 'none',
      event_type: 'personal'
    });
    setShowTimeBlockSelector(false);
    setShowEventForm(true);
  };

  // NEW: Toggle custom day
  const toggleCustomDay = (dayId: string) => {
    setEventFormData(prev => ({
      ...prev,
      customDays: prev.customDays?.includes(dayId)
        ? prev.customDays.filter(d => d !== dayId)
        : [...(prev.customDays || []), dayId]
    }));
  };

  // NEW: Handle event form submission
  const handleEventFormSubmit = async () => {
    if (!user) {
      showToast({ type: 'error', message: 'Please log in first' });
      return;
    }

    if (!eventFormData.title || !eventFormData.date || !eventFormData.startTime || !eventFormData.endTime) {
      showToast({ type: 'error', message: 'Please fill in all required fields' });
      return;
    }

    try {
      const startDateTime = new Date(`${eventFormData.date}T${eventFormData.startTime}`);
      const endDateTime = new Date(`${eventFormData.date}T${eventFormData.endTime}`);

      let reminderTime = null;
      if (eventFormData.reminderOption !== 'none') {
        const reminderMinutes = {
          '10min': 10,
          '30min': 30,
          '1hour': 60,
          '1day': 1440
        }[eventFormData.reminderOption] || 0;
        reminderTime = new Date(startDateTime.getTime() - reminderMinutes * 60000);
      }

      const eventToCreate = {
        title: eventFormData.title,
        description: eventFormData.description,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        created_by: user.id,
        visibility: 'private',
        source: 'personal',
        event_type: eventFormData.event_type,
        location: eventFormData.location || null,
        reminder_time: reminderTime,
        recurrence_rule: eventFormData.repeatOption !== 'none' ? eventFormData.repeatOption : null,
        recurrence_days: eventFormData.repeatOption === 'custom' ? eventFormData.customDays?.join(',') : null,
        completed: false
      };

      const { error } = await supabase.from('events').insert(eventToCreate);

      if (error) {
        console.error('Error creating event:', error);
        showToast({ type: 'error', message: 'Failed to create event' });
        return;
      }

      showToast({ type: 'success', message: '✨ Event added to calendar!' });
      setShowEventForm(false);
      
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('created_by', user.id);
      if (eventsData) setEvents(eventsData);
      
      setEventFormData({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        repeatOption: 'none',
        customDays: [],
        reminderOption: 'none',
        event_type: 'personal'
      });
    } catch (error) {
      console.error('Event creation error:', error);
      showToast({ type: 'error', message: 'Failed to create event' });
    }
  };

  // Handler functions
  const handleTemplatesClick = () => {
    console.log('Templates clicked');
    setShowTemplates(true);
  };

  const handleAnalyticsClick = () => {
    console.log('Analytics clicked');
    setShowAnalytics(true);
  };

  const handleMeetingCoordinatorClick = () => {
    console.log('Meeting Coordinator clicked');
    setShowMeetingCoordinator(true);
  };

  const handleTimeBlockingClick = () => {
    console.log('Time Blocking clicked');
    setShowTimeBlockSelector(true);
  };

  const handleCarpoolChatClick = () => {
    console.log('Carpool Chat clicked');
    const sampleEvent = {
      id: 'demo-event',
      title: 'Sample Event for Carpool',
      start_time: new Date().toISOString(),
      location: 'Sample Location',
      created_by: user?.id || 'demo-user'
    };
    setSelectedCarpoolEvent(sampleEvent);
    setShowCarpoolChat(true);
  };

  const handleCarpoolManagementClick = () => {
    console.log('Carpool Management clicked');
    setShowCarpoolManagement(true);
  };

  const handleCreateNewCarpoolGroup = () => {
    console.log('Create new carpool group clicked');
    setShowCreateCarpoolGroup(true);
  };

  const handleSettingsClick = () => {
    console.log('Settings clicked');
    setShowSettings(true);
  };

  // Template apply handler
  const handleApplyTemplate = async (templateEvents: any[]) => {
    if (!user) {
      showToast({ type: 'error', message: 'Please log in first' });
      return;
    }

    try {
      console.log('Applying template events:', templateEvents);
      
      const { error } = await supabase.from('events').insert(templateEvents);
      
      if (error) {
        console.error('Error creating template events:', error);
        showToast({ type: 'error', message: 'Failed to apply template' });
        return;
      }
      
      showToast({ type: 'success', message: '✨ Template applied to calendar!' });
      setShowTemplates(false);
      
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('created_by', user.id);
      
      if (eventsData) {
        setEvents(eventsData);
      }
    } catch (error) {
      console.error('Template application error:', error);
      showToast({ type: 'error', message: 'Failed to apply template' });
    }
  };

  // Meeting schedule handler
  const handleScheduleMeeting = async (meetingData: any) => {
    console.log('Scheduling meeting:', meetingData);
    showToast({ type: 'success', message: 'Meeting scheduled successfully!' });
    setShowMeetingCoordinator(false);
  };

  // Format date for carpool display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status color for carpool groups
  const getStatusColor = (status: CarpoolGroup['status']) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter carpool groups
  const filteredCarpoolGroups = carpoolGroups.filter(group => 
    carpoolFilter === 'all' || group.status === carpoolFilter
  );

  const toolCategories = [
    {
      id: 'productivity',
      title: 'Productivity Tools',
      description: 'Focus and time management features',
      tools: [
        {
          id: 'time-blocking',
          title: 'Time Blocking',
          description: 'Schedule focused work sessions',
          icon: '⏰',
          action: handleTimeBlockingClick
        },
        {
          id: 'templates',
          title: 'Event Templates',
          description: 'Quick event creation templates',
          icon: '✨',
          action: handleTemplatesClick
        },
        {
          id: 'analytics',
          title: 'Calendar Analytics',
          description: 'View your productivity insights',
          icon: '📊',
          action: handleAnalyticsClick
        }
      ]
    },
    {
      id: 'social',
      title: 'Social & Coordination',
      description: 'Connect and coordinate with others',
      tools: [
        {
          id: 'meeting-coordinator',
          title: 'Meeting Coordinator',
          description: 'Smart scheduling with friends',
          icon: '👥',
          action: handleMeetingCoordinatorClick
        },
        {
          id: 'carpool-chat',
          title: 'Carpool Chat',
          description: 'Coordinate transportation',
          icon: '🚗',
          action: handleCarpoolChatClick
        },
        {
          id: 'carpool-management',
          title: 'Carpool Dashboard',
          description: 'Manage all your carpools',
          icon: '🚙',
          action: handleCarpoolManagementClick
        }
      ]
    },
    {
      id: 'settings',
      title: 'Settings & Preferences',
      description: 'Customize your calendar experience',
      tools: [
        {
          id: 'preferences',
          title: 'Calendar Settings',
          description: 'Themes, notifications, and more',
          icon: '⚙️',
          action: handleSettingsClick
        },
        {
          id: 'shortcuts',
          title: 'Keyboard Shortcuts',
          description: 'Learn time-saving shortcuts',
          icon: '⌨️',
          action: () => console.log('Shortcuts help')
        }
      ]
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900">
      
      {/* Header */}
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-200"
                aria-label="Go back"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Calendar Tools
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Advanced features and productivity tools
                </p>
              </div>
            </div>
            
            <button
              onClick={() => router.push('/calendar')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Back to Calendar
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl p-4 shadow-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{toolCategories.reduce((acc, cat) => acc + cat.tools.length, 0)}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Tools Available</div>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl p-4 shadow-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{events.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Calendar Events</div>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl p-4 shadow-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{friends.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Friends Connected</div>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl p-4 shadow-lg">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{carpoolStats.totalGroups}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Carpool Groups</div>
          </div>
        </div>

        {/* Carpool Summary Card */}
        {carpoolStats.totalGroups > 0 && (
          <div className="bg-gradient-to-r from-green-400/20 to-blue-400/20 dark:from-green-600/20 dark:to-blue-600/20 rounded-xl p-6 mb-8 border border-green-200/50 dark:border-green-700/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">🌱 Environmental Impact</h2>
              <button
                onClick={handleCarpoolManagementClick}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                View All Carpools
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">${carpoolStats.totalSavings.toFixed(2)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Money Saved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{carpoolStats.totalCO2Saved.toFixed(1)} kg</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">CO₂ Prevented</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{carpoolStats.totalTrips}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Trips Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{carpoolStats.averageGroupSize.toFixed(1)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Group Size</div>
              </div>
            </div>
          </div>
        )}

        {/* Tool Categories */}
        <div className="space-y-8">
          {toolCategories.map((category) => (
            <div key={category.id} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl p-6 shadow-lg">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {category.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {category.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.tools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={tool.action}
                    className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20 transition-all duration-200 text-left group hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl group-hover:scale-110 transition-transform duration-200">
                        {tool.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {tool.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={handleTemplatesClick}
              className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
            >
              Create Template
            </button>
            <button 
              onClick={handleAnalyticsClick}
              className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
            >
              View Analytics
            </button>
            <button 
              onClick={handleMeetingCoordinatorClick}
              className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            >
              Schedule Meeting
            </button>
            <button 
              onClick={handleCarpoolChatClick}
              className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
            >
              Quick Carpool
            </button>
          </div>
        </div>
      </div>

      {/* MODALS */}

      {/* Calendar Analytics */}
      {showAnalytics && user && (
        <CalendarAnalytics
          events={events}
          userId={user.id}
          onClose={() => setShowAnalytics(false)}
        />
      )}

      {/* Event Templates */}
      {showTemplates && user && (
        <SmartTemplates
          open={showTemplates}
          onClose={() => setShowTemplates(false)}
          onApply={handleApplyTemplate}
          userId={user.id}
          isMobile={isMobile}
        />
      )}

      {/* Meeting Coordinator */}
      {showMeetingCoordinator && user && (
        <SmartMeetingCoordinator
          open={showMeetingCoordinator}
          onClose={() => setShowMeetingCoordinator(false)}
          userId={user.id}
          friends={friends}
          userEvents={events}
          onSchedule={handleScheduleMeeting}
        />
      )}

      {/* NEW: Time Block Selector Modal */}
      {showTimeBlockSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowTimeBlockSelector(false)}>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div 
            className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl ${isMobile ? 'w-full' : 'max-w-2xl w-full'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}>⏰ Time Blocks</h2>
                  <p className="text-indigo-100 mt-1 text-sm sm:text-base">Choose a time block type</p>
                </div>
                <button onClick={() => setShowTimeBlockSelector(false)} className="p-2 rounded-full bg-white/20 hover:bg-white/30">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                {TIME_BLOCKS.map((block) => (
                  <button
                    key={block.id}
                    onClick={() => handleTimeBlockSelect(block)}
                    className="p-3 sm:p-4 rounded-lg text-white font-medium hover:scale-105 transition-transform"
                    style={{ backgroundColor: block.color }}
                  >
                    <div className="text-sm sm:text-base">{block.title}</div>
                    <div className="text-xs opacity-90 mt-1">{block.duration} min</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Event Creation Form Modal */}
      {showEventForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEventForm(false)} />
          <div 
            className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden ${isMobile ? 'w-full max-h-[90vh]' : 'max-w-2xl w-full max-h-[90vh]'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 sm:p-6 text-white">
              <div className="flex items-center justify-between">
                <h2 className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}>Create Event</h2>
                <button onClick={() => setShowEventForm(false)} className="p-2 rounded-full bg-white/20 hover:bg-white/30">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-100px)] space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input
                  type="text"
                  value={eventFormData.title}
                  onChange={(e) => setEventFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                  placeholder="Event title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={eventFormData.description}
                  onChange={(e) => setEventFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                  rows={3}
                  placeholder="Event description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                <input
                  type="date"
                  value={eventFormData.date}
                  onChange={(e) => setEventFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time *</label>
                  <input
                    type="time"
                    value={eventFormData.startTime}
                    onChange={(e) => setEventFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time *</label>
                  <input
                    type="time"
                    value={eventFormData.endTime}
                    onChange={(e) => setEventFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location (Optional)</label>
                <input
                  type="text"
                  value={eventFormData.location || ''}
                  onChange={(e) => setEventFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                  placeholder="Event location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Repeat</label>
                <div className={`grid gap-2 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {['none', 'daily', 'weekly', 'monthly', 'custom'].map((option) => (
                    <button
                      key={option}
                      onClick={() => setEventFormData(prev => ({ ...prev, repeatOption: option as any }))}
                      className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium capitalize transition-colors ${
                        eventFormData.repeatOption === option
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {eventFormData.repeatOption === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Days</label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => (
                      <button
                        key={day.id}
                        onClick={() => toggleCustomDay(day.id)}
                        className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                          eventFormData.customDays?.includes(day.id)
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reminder</label>
                <div className={`grid gap-2 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {[
                    { value: 'none', label: 'None' },
                    { value: '10min', label: '10 min' },
                    { value: '30min', label: '30 min' },
                    { value: '1hour', label: '1 hour' },
                    { value: '1day', label: '1 day' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setEventFormData(prev => ({ ...prev, reminderOption: option.value as any }))}
                      className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                        eventFormData.reminderOption === option.value
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleEventFormSubmit}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all text-sm sm:text-base"
              >
                Add to Calendar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Carpool Management Modal */}
      {showCarpoolManagement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">🚗 Carpool Management</h2>
                <button
                  onClick={() => setShowCarpoolManagement(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex gap-2 mt-4">
                {(['all', 'upcoming', 'active', 'completed'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setCarpoolFilter(filter)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium capitalize transition-colors ${
                      carpoolFilter === filter
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {filteredCarpoolGroups.length > 0 ? (
                <div className="space-y-4">
                  {filteredCarpoolGroups.map((group) => (
                    <div
                      key={group.id}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                      onClick={() => setSelectedCarpoolGroup(group)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{group.event_title}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(group.status)}`}>
                          {group.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div>
                          <span className="font-medium">Date:</span> {formatDate(group.event_date)}
                        </div>
                        <div>
                          <span className="font-medium">Location:</span> {group.event_location}
                        </div>
                        <div>
                          <span className="font-medium">Participants:</span> {group.participants.length + 1}
                        </div>
                        <div>
                          <span className="font-medium">Saved:</span> ${group.total_savings.toFixed(2)}
                        </div>
                      </div>

                      {group.meetup_location && (
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Meetup:</span> {group.meetup_location}
                          {group.departure_time && <span> • {group.departure_time}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🚗</div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No carpools found</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {carpoolFilter === 'all' 
                      ? 'Start organizing carpools to reduce costs and help the environment!'
                      : `No ${carpoolFilter} carpools at the moment.`
                    }
                  </p>
                  <button
                    onClick={handleCarpoolChatClick}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Create Your First Carpool
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Carpool Chat */}
      {showCarpoolChat && (
        <EventCarpoolModal
          isOpen={showCarpoolChat}
          onClose={() => setShowCarpoolChat(false)}
          event={selectedCarpoolEvent}
          userId={user?.id || null}
          carpoolData={{
            carpoolMatches: [],
            friends: friends,
            sendCarpoolInvite: async (matchId: string, message?: string) => {
              showToast({ type: 'success', message: 'Carpool invite sent!' });
              return { success: true, message: 'Invite sent successfully' };
            },
            createCarpoolGroup: async (eventId: string, friendIds: string[], message?: string) => {
              showToast({ type: 'success', message: 'Carpool group created!' });
              if (user) {
                await loadCarpoolData(user.id);
              }
              return { success: true, groupId: Date.now().toString(), message: 'Group created successfully' };
            }
          }}
          showToast={showToast}
          isMobile={isMobile}
        />
      )}

      {/* Settings Placeholder */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 m-4 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Calendar Settings</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Advanced settings panel coming soon! This will include theme customization, notification preferences, and more.
            </p>
            <button
              onClick={() => setShowSettings(false)}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
