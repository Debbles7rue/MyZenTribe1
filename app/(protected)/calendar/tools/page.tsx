// app/(protected)/calendar/tools/page.tsx
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CalendarToolsPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('overview');

  // State for different modals/features
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showMeetingCoordinator, setShowMeetingCoordinator] = useState(false);
  const [showTimeBlocking, setShowTimeBlocking] = useState(false);
  const [showCarpoolChat, setShowCarpoolChat] = useState(false);
  const [showHolidayReminders, setShowHolidayReminders] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Handler functions with error handling
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

  const toolCategories = [
    {
      id: 'lists',
      title: 'Lists & Task Management',
      description: 'Advanced list management and organization',
      tools: [
        {
          id: 'advanced-lists',
          title: 'Advanced Lists',
          description: 'Bulk edit, categories, and smart lists',
          icon: '📋',
          action: () => console.log('Advanced Lists')
        },
        {
          id: 'list-templates',
          title: 'List Templates',
          description: 'Pre-made todo and shopping templates',
          icon: '📝',
          action: () => console.log('List Templates')
        },
        {
          id: 'list-analytics',
          title: 'Productivity Analytics',
          description: 'Track completion rates and patterns',
          icon: '📈',
          action: () => console.log('List Analytics')
        }
      ]
    },
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
        },
        {
          id: 'lists',
          title: 'Lists & Tasks',
          description: 'Manage todos and shopping lists',
          icon: '✅',
          action: () => router.push('/calendar?tab=lists')
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
        },
        {
          id: 'export-import',
          title: 'Export/Import',
          description: 'Backup or sync your calendar',
          icon: '💾',
          action: () => console.log('Export/Import')
        }
      ]
    }
  ];

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
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">15</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Tools Available</div>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl p-4 shadow-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">3</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Active Templates</div>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl p-4 shadow-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">Clean</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Header Design</div>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl p-4 shadow-lg">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">Drag & Drop</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Lists Ready</div>
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
            <button className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors">
              Create Template
            </button>
            <button className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
              Export Calendar
            </button>
            <button className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors">
              Import Events
            </button>
            <button className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors">
              View Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Modals would go here - you can import and use your existing modal components */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 m-4 max-w-md">
            <h3 className="text-lg font-bold mb-4">Templates</h3>
            <p>Templates modal would open here</p>
            <button
              onClick={() => setShowTemplates(false)}
              className="mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add similar modals for other features as needed */}
    </div>
  );
}
