// FILE NAME: AppTutorial.tsx
// LOCATION: components/AppTutorial.tsx
// INSTRUCTIONS: Add this component to your layout.tsx file

"use client";

import { Dialog } from "@headlessui/react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Tutorial content for different pages
const TUTORIALS = {
  '/': {
    key: 'homefeed_tutorial_v1',
    title: 'Welcome to MyZenTribe',
    subtitle: 'Your community connection hub',
    icon: '🏠',
    points: [
      {
        icon: '📱',
        title: 'Never Lose MyZenTribe Again!',
        description: 'Add this app to your home screen for instant access. Tap the share button (Safari) or menu (Chrome) and select "Add to Home Screen". It\'ll sit right next to your other apps!',
        highlight: true
      },
      {
        icon: '👥',
        title: 'Co-Create Posts with Friends',
        description: 'Going to an event together? Create ONE shared post where all friends can add their photos - no more duplicate posts flooding the feed!'
      },
      {
        icon: '📢',
        title: 'Stay in the Loop',
        description: 'See updates from friends and reminders from wellness businesses you follow. Never miss that yoga class or drum circle again.'
      },
      {
        icon: '🔒',
        title: 'Control Your Privacy',
        description: 'Share co-created posts publicly or keep them private among your group. You\'re always in control.'
      }
    ]
  },
  '/profile': {
    key: 'profile_tutorial_v1',
    title: 'Your Personal Space',
    subtitle: 'More than just a profile',
    icon: '👤',
    points: [
      {
        icon: '📓',
        title: 'Gratitude Journal',
        description: 'Keep a personal gratitude journal with monthly summaries to remind you of all the wonderful moments you\'ve experienced.'
      },
      {
        icon: '🕯️',
        title: 'Honor Loved Ones',
        description: 'Display memorial candles you\'ve lit in the candle room - a beautiful way to keep memories alive.'
      },
      {
        icon: '💌',
        title: 'Messages & Friends',
        description: 'Check your messages and search for new friends to connect with in the wellness community.'
      },
      {
        icon: '📝',
        title: 'Your Post Collection',
        description: 'See all your posts and co-created memories in one place.'
      }
    ]
  },
  '/calendar': {
    key: 'calendar_tutorial_v2',
    title: 'Your Smart Calendar Hub',
    subtitle: 'The heart of MyZenTribe',
    icon: '📅',
    points: [
      {
        icon: '🎭',
        title: '"What\'s Happening" Toggle',
        description: 'See ALL events from businesses you follow and friend invites. Swipe right to add to your personal calendar, left to dismiss.'
      },
      {
        icon: '🚗',
        title: 'Smart Carpool Coordination',
        description: 'When friends marked as "safe to carpool" are going to the same event, we\'ll help you coordinate rides automatically!'
      },
      {
        icon: '☕',
        title: 'Private Event Invites',
        description: 'Create "Coffee with Tiffany" and when she accepts, it syncs to both your calendars. Perfect for coordinating plans!'
      },
      {
        icon: '🎨',
        title: 'Powerful Tools',
        description: 'Use templates, time blocks, reminders, to-dos, shopping lists and more. This is your life organizer!'
      },
      {
        icon: '🌙',
        title: 'Moon Phases',
        description: 'See moon phases right in your calendar for planning spiritual practices.'
      }
    ]
  },
  '/communities': {
    key: 'communities_tutorial_v1',
    title: 'Local Communities Map',
    subtitle: 'Find your tribe nearby',
    icon: '🗺️',
    points: [
      {
        icon: '📍',
        title: 'Interactive Event Map',
        description: 'See all wellness events in your area on a map. Anyone offering events can add a pin!'
      },
      {
        icon: '🎯',
        title: 'Smart Filters',
        description: 'Looking for yoga? Drum circles? Sound baths? Filter the map to find exactly what resonates with you.'
      },
      {
        icon: '🏘️',
        title: 'Start a Community',
        description: 'Anyone can start a local community! Unite practitioners and seekers in your area.'
      },
      {
        icon: '📆',
        title: 'Community Calendar',
        description: 'Browse all community events in one calendar. Support local practitioners and find new experiences.'
      }
    ]
  },
  '/meditation': {
    key: 'meditation_tutorial_v1',
    title: 'Global Meditation Movement',
    subtitle: '24/7 prayer & meditation worldwide',
    icon: '🧘',
    points: [
      {
        icon: '🌍',
        title: 'Join a Global Mission',
        description: 'We\'re creating continuous meditation/prayer around the world, 24/7. See how many are meditating right now!'
      },
      {
        icon: '👥',
        title: 'Meditate Together',
        description: 'Schedule group meditations with friends or join others. Feel the collective energy even when apart.'
      },
      {
        icon: '🕯️',
        title: 'Memorial Candle Room',
        description: 'Light a virtual candle for loved ones. It appears in the public candle room and your profile - keeping their memory alive.'
      },
      {
        icon: '📊',
        title: 'Track Your Practice',
        description: 'See your meditation stats and contribute to the global counter. Every session matters!'
      }
    ]
  },
  '/karma': {
    key: 'karma_tutorial_v1',
    title: 'Good News & Karma',
    subtitle: 'Spreading positivity & kindness',
    icon: '✨',
    points: [
      {
        icon: '💝',
        title: 'Kindness Challenges',
        description: 'Join good deed challenges that inspire acts of kindness. Small actions create big ripples!'
      },
      {
        icon: '📰',
        title: 'Good News Feed',
        description: 'Tired of doom scrolling? Read ONLY good news here - real stories that restore faith in humanity.'
      },
      {
        icon: '🎯',
        title: 'Karma Points',
        description: 'Earn karma by participating in challenges and spreading kindness. What goes around comes around!'
      },
      {
        icon: '🌟',
        title: 'Share Your Good',
        description: 'Did something kind? See something beautiful? Share it here to inspire others!'
      }
    ]
  },
  '/safety': {
    key: 'safety_tutorial_v1',
    title: 'Your Safety Matters',
    subtitle: 'Tools to keep you protected',
    icon: '🛡️',
    points: [
      {
        icon: '🚨',
        title: 'SOS System',
        description: 'Pre-program emergency contacts. If you feel unsafe at any event, instantly alert someone of your location.'
      },
      {
        icon: '📋',
        title: 'Event Safety Tips',
        description: 'Read guidelines for attending unfamiliar events. Knowledge is your best protection.'
      },
      {
        icon: '🤝',
        title: 'Trusted Connections',
        description: 'Mark friends as "safe to carpool" and build your trusted network for events and gatherings.'
      },
      {
        icon: '📍',
        title: 'Location Sharing',
        description: 'Choose when and with whom to share your location during events. You\'re always in control.'
      }
    ]
  },
  '/business': {
    key: 'business_tutorial_v1',
    title: 'Grow Your Presence',
    subtitle: 'For businesses AND casual hosts!',
    icon: '💼',
    points: [
      {
        icon: '📱',
        title: 'Quick Access Tip',
        description: 'Add MyZenTribe to your home screen to manage your presence on-the-go! Never miss an opportunity to connect.',
        highlight: true
      },
      {
        icon: '🎪',
        title: 'Not Just for Businesses!',
        description: 'Host a casual drum circle? Weekend yoga in the park? You DON\'T need a formal business - just share what you love!'
      },
      {
        icon: '📊',
        title: 'Simple Management',
        description: 'Self-explanatory tabs make it easy to manage your events, followers, and community connections.'
      },
      {
        icon: '🔗',
        title: 'Share Your Page',
        description: 'Get a custom QR code and link to attract attendees. Perfect for flyers or social media!'
      }
    ]
  }
};

// Friend acceptance categories for reference
const FRIEND_CATEGORIES = {
  friend: 'Can see all your posts and events',
  acquaintance: 'Limited access to your content',
  restricted: 'Very limited visibility'
};

export default function AppTutorial() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [currentTutorial, setCurrentTutorial] = useState<typeof TUTORIALS['/'] | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Find matching tutorial for current path
    let tutorial = null;
    let matchedPath = '';
    
    // Check exact match first
    if (TUTORIALS[pathname as keyof typeof TUTORIALS]) {
      tutorial = TUTORIALS[pathname as keyof typeof TUTORIALS];
      matchedPath = pathname;
    } else {
      // Check for partial matches (e.g., /business/anything matches /business)
      for (const [path, content] of Object.entries(TUTORIALS)) {
        if (pathname?.startsWith(path) && path !== '/') {
          tutorial = content;
          matchedPath = path;
          break;
        }
      }
    }
    
    // If home page tutorial hasn't been seen, always show it first (for PWA install)
    const homeSeenKey = TUTORIALS['/'].key;
    const homeSeen = localStorage.getItem(homeSeenKey);
    
    if (!homeSeen && pathname === '/') {
      setCurrentTutorial(TUTORIALS['/']);
      setOpen(true);
      return;
    }
    
    // Show tutorial if found and not seen before
    if (tutorial) {
      const seen = localStorage.getItem(tutorial.key);
      if (!seen) {
        setCurrentTutorial(tutorial);
        setOpen(true);
      }
    }
  }, [pathname]);

  const close = (remember: boolean) => {
    if (typeof window !== "undefined" && remember && currentTutorial) {
      localStorage.setItem(currentTutorial.key, '1');
    }
    setOpen(false);
  };

  const clearAllTutorials = () => {
    // Developer helper - add ?reset-tutorials to URL to clear all
    if (typeof window !== "undefined") {
      Object.values(TUTORIALS).forEach(tutorial => {
        localStorage.removeItem(tutorial.key);
      });
      window.location.reload();
    }
  };

  // Check for reset parameter
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes('reset-tutorials')) {
      clearAllTutorials();
    }
  }, []);

  if (!open || !currentTutorial) return null;

  return (
    <Dialog open={open} onClose={() => close(true)} className="relative z-[1000]">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl transform transition-all">
          {/* Hero Section */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="text-4xl">{currentTutorial.icon}</div>
              <div>
                <h2 className="text-2xl font-bold">{currentTutorial.title}</h2>
                <p className="text-purple-100 text-sm mt-1">{currentTutorial.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            <div className="space-y-4">
              {currentTutorial.points.map((point, index) => (
                <div 
                  key={index} 
                  className={`flex gap-4 ${point.highlight ? 'bg-purple-50 p-4 rounded-xl border-2 border-purple-200' : ''}`}
                >
                  <div className="flex-shrink-0 text-2xl">{point.icon}</div>
                  <div className="flex-1">
                    <h3 className={`font-semibold ${point.highlight ? 'text-purple-900' : 'text-gray-900'}`}>
                      {point.title}
                    </h3>
                    <p className={`text-sm mt-1 ${point.highlight ? 'text-purple-700' : 'text-gray-600'}`}>
                      {point.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Special PWA install instructions for mobile */}
            {pathname === '/' && (
              <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                <div className="flex gap-3">
                  <span className="text-2xl">💡</span>
                  <div className="text-sm">
                    <p className="font-semibold text-amber-900 mb-1">Quick Install:</p>
                    <p className="text-amber-700">
                      <span className="font-medium">iPhone:</span> Tap Share → Add to Home Screen<br/>
                      <span className="font-medium">Android:</span> Tap Menu (⋮) → Install App
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Special calendar friend acceptance note */}
            {pathname?.startsWith('/calendar') && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700">
                  <span className="font-semibold">Pro tip:</span> When accepting friends, you'll choose their access level: Friend (full access), Acquaintance (limited), or Restricted (minimal).
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button 
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                onClick={() => close(false)}
              >
                Remind me later
              </button>
              <button 
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                onClick={() => close(true)}
              >
                Got it, let's explore!
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
