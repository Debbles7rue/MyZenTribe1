// components/business/BusinessTabs.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import BusinessBasicTab from './tabs/BusinessBasicTab';
import BusinessDetailsTab from './tabs/BusinessDetailsTab';
import BusinessGalleryTab from './tabs/BusinessGalleryTab';
import BusinessStoreTab from './tabs/BusinessStoreTab';
import BusinessSettingsTab from './tabs/BusinessSettingsTab';
import BusinessCalendar from './BusinessCalendar';
import UnifiedEventCreator from '@/components/events/UnifiedEventCreator';

const allTabs = [
  { id: 'basic', label: 'Basic Info', icon: '📝', color: 'purple', required: true },
  { id: 'details', label: 'Details', icon: '📋', color: 'blue', required: true },
  { id: 'calendar', label: 'Calendar', icon: '📅', color: 'green' }, // NEW TAB
  { id: 'store', label: 'Store', icon: '🛍️', color: 'rose' },
  { id: 'gallery', label: 'Gallery', icon: '📸', color: 'pink' },
  { id: 'settings', label: 'Settings', icon: '⚙️', color: 'gray', required: true },
];

interface Props {
  businessId: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOwner?: boolean; // Add this to know if current user owns this business
  currentUserId?: string; // Current logged-in user ID
}

interface TabConfig {
  details?: boolean;
  calendar?: boolean; // Add calendar to config
  store?: boolean;
  gallery?: boolean;
}

export default function BusinessTabs({ 
  businessId, 
  activeTab, 
  setActiveTab,
  isOwner = false,
  currentUserId
}: Props) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [enabledTabs, setEnabledTabs] = useState<TabConfig>({
    details: true,
    calendar: true, // Enable calendar by default
    store: true,
    gallery: true,
  });
  const [loading, setLoading] = useState(true);
  
  // Calendar-specific state
  const [showEventCreator, setShowEventCreator] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<any>(null);
  const [selectedService, setSelectedService] = useState<any>(null);

  // Load tab configuration from database
  useEffect(() => {
    async function loadTabConfig() {
      try {
        const { data } = await supabase
          .from('business_profiles')
          .select('enabled_tabs')
          .eq('id', businessId)
          .single();

        if (data?.enabled_tabs) {
          setEnabledTabs(data.enabled_tabs);
        }
      } catch (error) {
        console.log('No tab config found, using defaults');
      }
      setLoading(false);
    }
    loadTabConfig();
  }, [businessId]);

  // Filter tabs based on enabled configuration
  const tabs = allTabs.filter(tab => {
    // Always show required tabs (Basic Info, Contact, Settings)
    if (tab.required) return true;
    
    // For optional tabs, check if they're enabled
    const isEnabled = enabledTabs[tab.id as keyof TabConfig];
    
    // Show tab if it's not explicitly disabled (default to showing)
    return isEnabled !== false;
  });

  // If the active tab is now hidden, switch to the first available tab
  useEffect(() => {
    if (!loading && !tabs.find(tab => tab.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [activeTab, tabs, setActiveTab, loading]);

  const activeTabData = tabs.find(t => t.id === activeTab);
  
  // Get color classes based on active tab
  const getColorClasses = (isActive: boolean, color: string) => {
    if (!isActive) return 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200';
    
    const colorMap: Record<string, string> = {
      purple: 'bg-purple-50 text-purple-700 border-purple-300',
      blue: 'bg-blue-50 text-blue-700 border-blue-300',
      green: 'bg-green-50 text-green-700 border-green-300',
      amber: 'bg-amber-50 text-amber-700 border-amber-300',
      rose: 'bg-rose-50 text-rose-700 border-rose-300',
      pink: 'bg-pink-50 text-pink-700 border-pink-300',
      indigo: 'bg-indigo-50 text-indigo-700 border-indigo-300',
      gray: 'bg-gray-100 text-gray-700 border-gray-300',
    };
    
    return colorMap[color] || colorMap.purple;
  };

  // Handle swipe gestures for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    
    if (Math.abs(diff) > 50) {
      const currentIndex = tabs.findIndex(t => t.id === activeTab);
      if (diff > 0 && currentIndex < tabs.length - 1) {
        // Swipe left - next tab
        setActiveTab(tabs[currentIndex + 1].id);
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe right - previous tab
        setActiveTab(tabs[currentIndex - 1].id);
      }
    }
    setTouchStart(null);
  };

  // Update tab configuration (called from Settings tab)
  const updateTabConfig = async (newConfig: TabConfig) => {
    setEnabledTabs(newConfig);
    
    // Save to database
    await supabase
      .from('business_profiles')
      .update({ enabled_tabs: newConfig })
      .eq('id', businessId);
  };

  // Handle appointment booking
  const handleBookAppointment = async (slot: any, service: any) => {
    if (!currentUserId) {
      alert('Please log in to book an appointment');
      return;
    }
    
    setSelectedTimeSlot(slot);
    setSelectedService(service);
    setShowBookingModal(true);
    
    // Here you would implement the actual booking logic
    try {
      const { bookAppointment } = await import('@/lib/appointmentManager');
      const result = await bookAppointment({
        business_id: businessId,
        service_id: service.id,
        start_time: slot.start.toISOString(),
        customer_notes: ''
      }, currentUserId);
      
      if (result.appointment) {
        alert('Appointment booked successfully!');
        setShowBookingModal(false);
      } else {
        alert('Failed to book appointment');
      }
    } catch (error) {
      console.error('Booking error:', error);
      alert('Error booking appointment');
    }
  };

  // Handle RSVP to event
  const handleRSVPEvent = async (event: any) => {
    if (!currentUserId) {
      alert('Please log in to RSVP');
      return;
    }
    
    try {
      const { rsvpToEvent } = await import('@/lib/eventManager');
      const result = await rsvpToEvent(event.id, currentUserId, 'going');
      
      if (result.success) {
        alert('RSVP successful!');
      } else {
        alert('Failed to RSVP');
      }
    } catch (error) {
      console.error('RSVP error:', error);
      alert('Error with RSVP');
    }
  };

  // Don't show loading state - render with defaults immediately
  if (loading) {
    return (
      <div className="bg-gray-50 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-white border-b border-gray-200">
          <div className="relative">
            <nav className="hidden sm:flex p-1 bg-gray-50">
              {allTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm
                    transition-all duration-200 flex-1 border
                    ${getColorClasses(activeTab === tab.id, tab.color)}
                  `}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
        <div className="bg-white p-6">
          <div className="text-center text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-xl shadow-sm overflow-hidden">
      {/* Tab Navigation - Mobile Scrollable */}
      <div className="bg-white border-b border-gray-200">
        <div className="relative">
          {/* Desktop Tab Navigation */}
          <nav className="hidden sm:flex p-1 bg-gray-50">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm
                  transition-all duration-200 flex-1 border
                  ${getColorClasses(activeTab === tab.id, tab.color)}
                `}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Mobile Tab Navigation - Horizontal Scroll */}
          <div 
            className="sm:hidden overflow-x-auto scrollbar-hide"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <nav className="flex p-2 gap-2 min-w-max">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex flex-col items-center gap-1 px-4 py-3 rounded-lg
                    font-medium text-xs min-w-[80px] transition-all border
                    ${getColorClasses(activeTab === tab.id, tab.color)}
                    ${activeTab === tab.id ? 'shadow-md scale-105' : ''}
                  `}
                >
                  <span className="text-xl">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Mobile Tab Indicator */}
          <div className="sm:hidden h-1 bg-gray-100">
            <div 
              className="h-full bg-purple-600 transition-all duration-300"
              style={{
                width: `${100 / tabs.length}%`,
                marginLeft: `${(tabs.findIndex(t => t.id === activeTab) * 100) / tabs.length}%`
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Tab Content Area */}
      <div className="bg-white">
        {/* Tab Header */}
        {activeTabData && (
          <div className="border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{activeTabData.icon}</span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {activeTabData.label}
                </h3>
                <p className="text-sm text-gray-500">
                  {activeTab === 'basic' && 'Manage your business profile information'}
                  {activeTab === 'details' && 'Contact, services, hours, and social links'}
                  {activeTab === 'calendar' && 'Events, appointments, and booking management'}
                  {activeTab === 'store' && 'Showcase products with external purchase links'}
                  {activeTab === 'gallery' && 'Showcase your work and space'}
                  {activeTab === 'settings' && 'Privacy and visibility settings'}
                </p>
              </div>
              
              {/* Add Event Button - Only show on calendar tab for owners */}
              {activeTab === 'calendar' && isOwner && (
                <button
                  onClick={() => setShowEventCreator(true)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium flex items-center gap-2 shadow-lg"
                >
                  <span>+</span>
                  <span className="hidden sm:inline">Create Event</span>
                  <span className="sm:hidden">Event</span>
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'basic' && <BusinessBasicTab businessId={businessId} />}
          {activeTab === 'details' && <BusinessDetailsTab businessId={businessId} />}
          {activeTab === 'calendar' && (
            <BusinessCalendar 
              businessId={businessId}
              userId={currentUserId}
              isOwner={isOwner}
              onBookAppointment={handleBookAppointment}
              onRSVPEvent={handleRSVPEvent}
            />
          )}
          {activeTab === 'store' && <BusinessStoreTab businessId={businessId} />}
          {activeTab === 'gallery' && <BusinessGalleryTab businessId={businessId} />}
          {activeTab === 'settings' && (
            <BusinessSettingsTab 
              businessId={businessId}
              enabledTabs={enabledTabs}
              onUpdateTabs={updateTabConfig}
            />
          )}
        </div>
      </div>

      {/* Event Creator Modal */}
      {showEventCreator && (
        <UnifiedEventCreator
          open={showEventCreator}
          onClose={() => setShowEventCreator(false)}
          userId={businessId}
          context="business"
          businessId={businessId}
          onSuccess={(event) => {
            console.log('Event created:', event);
            setShowEventCreator(false);
            // You might want to refresh the calendar here
          }}
        />
      )}

      {/* Booking Confirmation Modal (Simple version - you can enhance this) */}
      {showBookingModal && selectedTimeSlot && selectedService && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Confirm Booking</h3>
            <div className="space-y-3 mb-6">
              <div>
                <span className="text-sm text-gray-600">Service:</span>
                <p className="font-medium">{selectedService.service_name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Time:</span>
                <p className="font-medium">
                  {selectedTimeSlot.start.toLocaleString()} - {selectedTimeSlot.end.toLocaleTimeString()}
                </p>
              </div>
              {selectedService.price && (
                <div>
                  <span className="text-sm text-gray-600">Price:</span>
                  <p className="font-medium">${selectedService.price}</p>
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={3}
                placeholder="Any special requests or information..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBookingModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Booking logic is handled in handleBookAppointment
                  alert('Booking confirmed!');
                  setShowBookingModal(false);
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add this to your global CSS or Tailwind config if not already there
// .scrollbar-hide::-webkit-scrollbar { display: none; }
// .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
