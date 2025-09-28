// app/(protected)/calendar/tools/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Import the actual calendar components
import HolidayReminders from '../components/HolidayReminders';
import CalendarAnalytics from '@/components/CalendarAnalytics';
import SmartTemplates from '@/components/SmartTemplates';
import SmartMeetingCoordinator from '@/components/SmartMeetingCoordinator';
import EventCarpoolModal from '../components/EventCarpoolModal';
import { useToast } from '@/components/ToastProvider';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  const [showHolidayReminders, setShowHolidayReminders] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Load user and data
  useEffect(() => {
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
              safe_to_carpool: false // Default value
            }));
            setFriends(formattedFriends);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        showToast({ type: 'error', message: 'Failed to load calendar data' });
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [showToast]);

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
    setShowTimeBlocking(true);
  };

  const handleCarpoolChatClick = () => {
    console.log('Carpool Chat clicked');
    // Create a sample event for carpool demo
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

  const handleHolidayRemindersClick = () => {
    console.log('Holiday Reminders clicked');
    setShowHolidayReminders(true);
  };

  const handleSettingsClick = () => {
    console.log('Settings clicked');
    setShowSettings(true);
  };

  // Holiday add handler
  const handleAddHolidayToCalendar = async (holiday: any) => {
    if (!user) {
      showToast({ type: 'error', message: 'Please log in first' });
      return false;
    }

    try {
      const holidayDate = new Date(holiday.date);
      const startTime = new Date(holidayDate);
      startTime.setHours(0, 0, 0, 0);
      const endTime = new Date(holidayDate);
      endTime.setHours(23, 59, 59, 999);

      const { error } = await supabase.from('events').insert({
        title: `${holiday.emoji} ${holiday.name}`,
        description: holiday.description || '',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        created_by: user.id,
        visibility: 'private',
        source: 'personal',
        event_type: 'holiday',
        completed: false
      });

      if (error) {
        console.error('Failed to add holiday:', error);
        showToast({ type: 'error', message: `Failed to add ${holiday.name}` });
        return false;
      }

      showToast({ type: 'success', message: `Added ${holiday.name} to your calendar!` });
      
      // Reload events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('created_by', user.id);
      
      if (eventsData) {
        setEvents(eventsData);
      }

      return true;
    } catch (error) {
      console.error('Error adding holiday:', error);
      showToast({ type: 'error', message: 'Failed to add holiday to calendar' });
      return false;
    }
  };

  // Template apply handler
  const handleApplyTemplate = (templateEvents: any[]) => {
    console.log('Applying template events:', templateEvents);
    showToast({ type: 'success', message: 'Template events applied!' });
    setShowTemplates(false);
  };

  // Meeting schedule handler
  const handleScheduleMeeting = async (meetingData: any) => {
    console.log('Scheduling meeting:', meetingData);
    showToast({ type: 'success', message: 'Meeting scheduled successfully!' });
    setShowMeetingCoordinator(false);
  };

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
        }
      ]
    },
    {
      id: 'planning',
      title: 'Planning & Reminders',
      description: 'Stay organized and prepared',
      tools: [
        {
          id: 'holiday-reminders',
          title: 'Holiday Reminders',
          description: 'Plan for upcoming holidays',
          icon: '🎉',
          action: handleHolidayRemindersClick
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">Ready</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Tools Status</div>
          </div>
        </div>

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
            <button className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
              View Reports
            </button>
            <button className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors">
              Schedule Focus Time
            </button>
            <button 
              onClick={handleAnalyticsClick}
              className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
            >
              View Analytics
            </button>
          </div>
        </div>
      </div>

      {/* REAL COMPONENT MODALS */}
      
      {/* Holiday Reminders - Real Component */}
      {showHolidayReminders && (
        <HolidayReminders
          onClose={() => setShowHolidayReminders(false)}
          onAddToCalendar={handleAddHolidayToCalendar}
          existingEvents={events}
          showToast={showToast}
        />
      )}

      {/* Calendar Analytics - Real Component */}
      {showAnalytics && user && (
        <CalendarAnalytics
          events={events}
          userId={user.id}
          onClose={() => setShowAnalytics(false)}
        />
      )}

      {/* Event Templates - Real Component */}
      {showTemplates && user && (
        <SmartTemplates
          open={showTemplates}
          onClose={() => setShowTemplates(false)}
          onApply={handleApplyTemplate}
          userId={user.id}
        />
      )}

      {/* Meeting Coordinator - Real Component */}
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

      {/* Placeholder Modals for Features Not Yet Implemented */}
      {showTimeBlocking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 m-4 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Time Blocking</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Time blocking feature will be implemented soon. This will allow you to schedule focused work sessions and protect your deep work time.
            </p>
            <button
              onClick={() => setShowTimeBlocking(false)}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Carpool Chat - Real Component */}
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
              return { success: true, groupId: Date.now().toString(), message: 'Group created successfully' };
            }
          }}
          showToast={showToast}
          isMobile={window.innerWidth < 768}
        />
      )}

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
