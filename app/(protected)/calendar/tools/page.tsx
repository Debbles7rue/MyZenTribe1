// app/(protected)/calendar/tools/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// Import calendar components
import CalendarAnalytics from '@/components/CalendarAnalytics';
import SmartTemplates from '@/components/SmartTemplates';
import SmartMeetingCoordinator from '@/app/(protected)/calendar/components/SmartMeetingCoordinator';
import EventCarpoolModal from '../components/EventCarpoolModal';
import { useToast } from '@/components/ToastProvider';

// Import our new modular components
import EventCreationForm from '@/components/EventCreationForm';
import TimeBlockSelector, { TimeBlock } from '@/components/TimeBlockSelector';

// Event Form Data Interface
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
  invitedFriends?: string[];  // ADD THIS LINE
}

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
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // Modal states
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showMeetingCoordinator, setShowMeetingCoordinator] = useState(false);
  const [showCarpoolChat, setShowCarpoolChat] = useState(false);
  const [selectedCarpoolEvent, setSelectedCarpoolEvent] = useState<any>(null);

  // NEW: Modular component states
  const [showTimeBlockSelector, setShowTimeBlockSelector] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventFormInitialData, setEventFormInitialData] = useState<Partial<EventFormData>>({});

  // FIX #1: Add form key to force re-render when opening new form
  const [eventFormKey, setEventFormKey] = useState(0);

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

  // Load user and data
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const initializeData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        console.log('User loaded:', user?.id || 'No user found');
        setUser(user);
        
        if (user?.id) {
          // Load events
          const { data: eventsData } = await supabase
            .from('events')
            .select('*')
            .eq('created_by', user.id);
          if (eventsData) setEvents(eventsData);

          // Load friends
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

  // Load Carpool Data
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

  // Calculate end time from start time and duration
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  };

  // Handler: Time Block Selected
  const handleTimeBlockSelect = (block: TimeBlock) => {
    const now = new Date();
    const startTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const endTime = calculateEndTime(startTime, block.duration);

    // FIX #2: Clear previous data and increment key to force fresh form
    setEventFormInitialData({
      title: block.title,
      description: block.description || `Time blocked for ${block.title}`,
      date: now.toISOString().split('T')[0],
      startTime,
      endTime,
      repeatOption: 'none',
      customDays: [],
      reminderOption: 'none',
      event_type: 'personal'
    });
    
    setShowTimeBlockSelector(false);
    setEventFormKey(prev => prev + 1); // Force new form instance
    setShowEventForm(true);
  };

  // Handler: Event Form Submitted - FIXED VERSION WITH RECURRING EVENTS
  const handleEventFormSubmit = async (eventData: EventFormData) => {
    console.log('🎯 handleEventFormSubmit called with:', eventData);
    console.log('👤 Current user:', user);
    
    if (!user?.id) {
      console.error('❌ User check failed:', user);
      showToast({ type: 'error', message: 'Please log in first' });
      return;
    }

    try {
      console.log('📅 Creating date objects...');
      const startDateTime = new Date(`${eventData.date}T${eventData.startTime}`);
      const endDateTime = new Date(`${eventData.date}T${eventData.endTime}`);
      
      console.log('✅ Start:', startDateTime);
      console.log('✅ End:', endDateTime);

      const eventToCreate = {
        title: eventData.title,
        description: eventData.description,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        created_by: user.id,
        visibility: 'private',
        source: 'personal',
        event_type: eventData.event_type,
        location: eventData.location || null,
        recurrence_rule: eventData.repeatOption !== 'none' ? eventData.repeatOption : null,
        completed: false
      };

      console.log('📤 Sending to database:', eventToCreate);

      const { data, error } = await supabase.from('events').insert(eventToCreate).select();

      if (error) {
        console.error('❌ Database error FULL DETAILS:', JSON.stringify(error, null, 2));
        console.error('❌ Error message:', error.message);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error details:', error.details);
        console.error('❌ Error hint:', error.hint);
        showToast({ type: 'error', message: `Failed: ${error.message}` });
        return;
      }

      console.log('✅ Event created successfully:', data);

      // FIX #3: CREATE RECURRING EVENTS FOR CUSTOM DAYS
      if (eventData.repeatOption === 'custom' && eventData.customDays && eventData.customDays.length > 0) {
        console.log('🔄 Creating recurring events for custom days:', eventData.customDays);
        
        const dayMap: { [key: string]: number } = { 
          mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 
        };
        
        const baseDate = new Date(`${eventData.date}T${eventData.startTime}`);
        const baseDayOfWeek = baseDate.getDay();
        
        const eventsToCreate = [];
        
        // Create events for each selected day in the next 4 weeks
        for (let week = 0; week < 4; week++) {
          for (const day of eventData.customDays) {
            const targetDay = dayMap[day];
            
            // Calculate days to add from base date
            let daysToAdd = targetDay - baseDayOfWeek + (week * 7);
            if (week === 0 && daysToAdd <= 0) {
              daysToAdd += 7; // Skip current week if day already passed
            }
            
            if (daysToAdd === 0) continue; // Skip the original day
            
            const newStartDate = new Date(baseDate);
            newStartDate.setDate(newStartDate.getDate() + daysToAdd);
            
            const newEndDate = new Date(`${eventData.date}T${eventData.endTime}`);
            newEndDate.setDate(newEndDate.getDate() + daysToAdd);
            
            eventsToCreate.push({
              ...eventToCreate,
              start_time: newStartDate.toISOString(),
              end_time: newEndDate.toISOString()
            });
          }
        }
        
        if (eventsToCreate.length > 0) {
          console.log(`📅 Creating ${eventsToCreate.length} recurring events...`);
          const { error: recurError } = await supabase.from('events').insert(eventsToCreate);
          
          if (recurError) {
            console.error('❌ Error creating recurring events:', recurError);
            showToast({ 
              type: 'warning', 
              message: 'Main event created, but some recurring events failed' 
            });
          } else {
            console.log('✅ All recurring events created successfully');
            showToast({ 
              type: 'success', 
              message: `✨ Event and ${eventsToCreate.length} recurring events added!` 
            });
          }
        }
      } else {
        showToast({ type: 'success', message: '✨ Event added to calendar!' });
      }
      
      setShowEventForm(false);
      
      // FIX #3: Clear form data after successful submit
      setEventFormInitialData({});
      
      // Reload events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('created_by', user.id);
      if (eventsData) {
        console.log('📊 Reloaded events:', eventsData.length);
        setEvents(eventsData);
      }
      
    } catch (error: any) {
      console.error('💥 Unexpected error:', error);
      showToast({ type: 'error', message: `Error: ${error.message || 'Failed to create event'}` });
    }
  };

  // Other handlers
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
  
  const handleCarpoolManagementClick = () => {
    console.log('Carpool Management clicked');
    setShowCarpoolManagement(true);
  };

  const handleCarpoolChatClick = () => {
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

  const handleApplyTemplate = async (templateData: any) => {
    if (!user) {
      showToast({ type: 'error', message: 'Please log in first' });
      return;
    }

    // Extract the template's prepopulated data
    const template = templateData.template;
    const now = new Date();
    const endTime = new Date(now.getTime() + template.duration * 60000);

    // Set up the event form with template data
    setEventFormInitialData({
      title: template.prepopulatedData.title,
      description: template.prepopulatedData.description,
      date: now.toISOString().split('T')[0],
      startTime: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
      endTime: `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`,
      repeatOption: 'none',
      customDays: [],
      reminderOption: 'none',
      event_type: 'template'
    });

    // Close templates modal and open event form
    setShowTemplates(false);
    setEventFormKey(prev => prev + 1); // Force new form instance
    setShowEventForm(true);
  };

  const handleScheduleMeeting = async (meetingData: any) => {
    console.log('Scheduling meeting:', meetingData);
    
    try {
      const { error } = await supabase.from('events').insert(meetingData);
      
      if (error) {
        console.error('Error scheduling meeting:', error);
        showToast({ type: 'error', message: 'Failed to schedule meeting' });
        return;
      }
      
      showToast({ type: 'success', message: 'Meeting scheduled successfully!' });
      setShowMeetingCoordinator(false);
      
      // Reload events
      if (user?.id) {
        const { data: eventsData } = await supabase
          .from('events')
          .select('*')
          .eq('created_by', user.id);
        if (eventsData) setEvents(eventsData);
      }
    } catch (error) {
      console.error('Meeting scheduling error:', error);
      showToast({ type: 'error', message: 'Failed to schedule meeting' });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: CarpoolGroup['status']) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar Tools</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Advanced features and productivity tools</p>
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
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {toolCategories.reduce((acc, cat) => acc + cat.tools.length, 0)}
            </div>
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
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{category.title}</h2>
                <p className="text-gray-600 dark:text-gray-400">{category.description}</p>
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
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{tool.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODALS - All the existing modals */}

      {showAnalytics && user && (
        <CalendarAnalytics
          events={events}
          userId={user.id}
          onClose={() => setShowAnalytics(false)}
        />
      )}

      {showTemplates && user && (
        <SmartTemplates
          open={showTemplates}
          onClose={() => setShowTemplates(false)}
          onApply={handleApplyTemplate}
          userId={user.id}
          isMobile={isMobile}
        />
      )}

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

      {/* NEW: Modular Components - FIX: Added key prop to force fresh instance */}
      <TimeBlockSelector
        isOpen={showTimeBlockSelector}
        onClose={() => setShowTimeBlockSelector(false)}
        onSelect={handleTimeBlockSelect}
        isMobile={isMobile}
      />

      <EventCreationForm
        key={eventFormKey}
        isOpen={showEventForm}
        onClose={() => {
          setShowEventForm(false);
          setEventFormInitialData({});
        }}
        onSubmit={handleEventFormSubmit}
        initialData={eventFormInitialData}
        isMobile={isMobile}
      />

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
              if (user?.id) await loadCarpoolData(user.id);
              return { success: true, groupId: Date.now().toString(), message: 'Group created successfully' };
            }
          }}
          showToast={showToast}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}
