// components/business/BusinessCalendar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Clock, MapPin, Users, ChevronLeft, ChevronRight, 
  Plus, Settings, Calendar, UserPlus, Bell, Heart, Share2, Filter,
  Grid3x3, List, CalendarDays, Eye, EyeOff
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { loadBusinessEvents, formatEventTime, getEventColor } from '@/lib/eventManager';
import { getBusinessSettings, getAvailableSlots, getBusinessServices, formatAppointmentTime } from '@/lib/appointmentManager';
import BusinessCalendarSettings from './BusinessCalendarSettings';
import UnifiedEventCreator from '@/components/events/UnifiedEventCreator';
import CalendarGrid from '@/components/CalendarGrid';
import type { DBEvent } from '@/lib/types';
import type { BusinessSettings, TimeSlot, AppointmentService, Appointment } from '@/lib/appointmentManager';
import type { View } from 'react-big-calendar';

interface Props {
  businessId: string;
  userId?: string; // Current logged-in user
  isOwner?: boolean; // Is this the business owner viewing?
  onBookAppointment?: (slot: TimeSlot, service: AppointmentService) => void;
  onRSVPEvent?: (event: DBEvent) => void;
}

type ViewMode = 'calendar' | 'list';
type CalendarDisplay = 'events' | 'appointments' | 'both';

export default function BusinessCalendar({
  businessId,
  userId,
  isOwner = false,
  onBookAppointment,
  onRSVPEvent
}: Props) {
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<View>('month');
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [calendarDisplay, setCalendarDisplay] = useState<CalendarDisplay>('both');
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [events, setEvents] = useState<DBEvent[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<AppointmentService[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedService, setSelectedService] = useState<AppointmentService | null>(null);
  const [loading, setLoading] = useState(true);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEventCreator, setShowEventCreator] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [businessInfo, setBusinessInfo] = useState<any>(null);
  const [showAvailabilityOnly, setShowAvailabilityOnly] = useState(false);

  // Load initial data
  useEffect(() => {
    loadBusinessData();
    if (userId) {
      checkFollowStatus();
    }
  }, [businessId, userId]);

  // Load events when date or display changes
  useEffect(() => {
    if (businessSettings) {
      loadCalendarData();
    }
  }, [currentDate, calendarDisplay, businessSettings]);

  // Check if user is following this business
  const checkFollowStatus = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('business_followers')
        .select('id')
        .eq('business_id', businessId)
        .eq('user_id', userId)
        .single();
      
      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  // Get follower count and business info
  const loadBusinessData = async () => {
    setLoading(true);
    try {
      // Get business info from business_profiles
      const { data: bizData } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('id', businessId)
        .single();
      
      setBusinessInfo(bizData);

      // Get follower count
      const { count } = await supabase
        .from('business_followers')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId);
      
      setFollowerCount(count || 0);

      // Get business settings
      const { settings } = await getBusinessSettings(businessId);
      if (settings) {
        setBusinessSettings(settings);
        
        // Set initial display based on service type
        if (settings.service_type === 'events') {
          setCalendarDisplay('events');
        } else if (settings.service_type === 'appointments') {
          setCalendarDisplay('appointments');
        } else {
          setCalendarDisplay('both');
        }

        // Load appointment services if enabled
        if (settings.appointments_enabled) {
          const { services: serviceList } = await getBusinessServices(businessId);
          setServices(serviceList);
          if (serviceList.length > 0) {
            setSelectedService(serviceList[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error loading business data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCalendarData = async () => {
    try {
      // Load events if showing events - check multiple possible fields for business association
      if (calendarDisplay === 'events' || calendarDisplay === 'both') {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .or(`created_by.eq.${businessId},source.eq.business`)
          .order('start_time', { ascending: true });

        if (data) {
          // Filter to only show events actually created by this business
          const businessEvents = data.filter(event => 
            event.created_by === businessId || 
            (event.source === 'business' && event.created_by === businessId)
          );
          setEvents(businessEvents);
        }
      }

      // Load appointments if enabled and owner
      if (businessSettings?.appointments_enabled && isOwner && 
          (calendarDisplay === 'appointments' || calendarDisplay === 'both')) {
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            service:appointment_services(*),
            customer:users(*)
          `)
          .eq('business_id', businessId)
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true });

        if (data) {
          setAppointments(data);
        }
      }
    } catch (error) {
      console.error('Error loading calendar data:', error);
    }
  };

  // Handle follow/unfollow
  const handleFollowToggle = async () => {
    if (!userId) {
      alert('Please sign in to follow businesses');
      return;
    }

    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from('business_followers')
          .delete()
          .eq('business_id', businessId)
          .eq('user_id', userId);
        
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
      } else {
        // Follow
        await supabase
          .from('business_followers')
          .insert({
            business_id: businessId,
            user_id: userId
          });
        
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  // Handle calendar slot selection
  const handleSelectSlot = (slotInfo: any) => {
    if (isOwner) {
      // Owner can create events
      setCurrentDate(slotInfo.start);
      setShowEventCreator(true);
    } else if (businessSettings?.appointments_enabled && 
               (calendarDisplay === 'appointments' || calendarDisplay === 'both')) {
      // Customer can book appointments
      handleDateClick(slotInfo.start);
    }
  };

  // Handle event selection
  const handleSelectEvent = (event: any) => {
    const dbEvent = event.resource as DBEvent;
    if (dbEvent && onRSVPEvent) {
      onRSVPEvent(dbEvent);
    }
  };

  // Handle date click for appointments
  const handleDateClick = async (date: Date) => {
    if (!businessSettings?.appointments_enabled) return;
    
    setSelectedDate(date);
    
    if (services.length > 1) {
      setShowServicePicker(true);
    } else if (services.length === 1) {
      setSelectedService(services[0]);
      loadAvailableSlotsForDate(date, services[0]);
    }
  };

  // Load available slots for a specific date
  const loadAvailableSlotsForDate = async (date: Date, service: AppointmentService) => {
    if (!date || !service) return;
    
    try {
      const { slots } = await getAvailableSlots(
        businessId,
        date,
        service.id
      );
      setTimeSlots(slots);
      setShowSlotPicker(true);
    } catch (error) {
      console.error('Error loading slots:', error);
    }
  };

  // Convert appointments to calendar events for display
  const getAppointmentSlots = (): any[] => {
    if (!businessSettings?.appointments_enabled || 
        !showAvailabilityOnly ||
        calendarDisplay === 'events') {
      return [];
    }

    const slots = [];
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (businessSettings.appointment_advance_days || 30));

    // Generate available slots for each day
    for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayName = d.toLocaleDateString('en-US', { weekday: 'lowercase' });
      const dayHours = businessSettings.business_hours?.[dayName];
      
      if (dayHours?.available) {
        // Add a visual indicator for available appointment days
        slots.push({
          id: `avail-${d.toISOString()}`,
          title: '📅 Appointments Available',
          start: new Date(d.setHours(9, 0, 0, 0)),
          end: new Date(d.setHours(9, 30, 0, 0)),
          allDay: false,
          resource: {
            type: 'availability',
            event_type: 'availability',
            date: d
          }
        });
      }
    }

    return slots;
  };

  // Render booking modal
  const renderBookingModal = () => {
    if (!showServicePicker && !showSlotPicker) return null;

    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
          {showServicePicker && (
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Select Service</h3>
              <div className="space-y-3">
                {services.map(service => (
                  <button
                    key={service.id}
                    onClick={() => {
                      setSelectedService(service);
                      setShowServicePicker(false);
                      if (selectedDate) {
                        loadAvailableSlotsForDate(selectedDate, service);
                      }
                    }}
                    className="w-full p-4 text-left bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                  >
                    <div className="font-medium">{service.service_name}</div>
                    {service.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {service.description}
                      </div>
                    )}
                    <div className="flex justify-between mt-2 text-sm">
                      <span className="text-gray-500">
                        {service.duration_minutes} minutes
                      </span>
                      {service.price && (
                        <span className="font-medium text-green-600 dark:text-green-400">
                          ${service.price}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowServicePicker(false)}
                className="mt-4 w-full py-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
            </div>
          )}

          {showSlotPicker && selectedDate && (
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">
                Available Times - {selectedDate.toLocaleDateString()}
              </h3>
              {selectedService && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {selectedService.service_name} ({selectedService.duration_minutes} min)
                </p>
              )}
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {timeSlots.filter(s => s.available).length === 0 ? (
                  <p className="text-center py-8 text-gray-500">
                    No available times on this date
                  </p>
                ) : (
                  timeSlots
                    .filter(slot => slot.available)
                    .map((slot, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (onBookAppointment && selectedService) {
                            onBookAppointment(slot, selectedService);
                            setShowSlotPicker(false);
                          }
                        }}
                        className="w-full p-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                      >
                        <span className="font-medium">
                          {slot.start.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                          {' - '}
                          {slot.end.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                      </button>
                    ))
                )}
              </div>
              
              <button
                onClick={() => {
                  setShowSlotPicker(false);
                  setSelectedDate(null);
                }}
                className="mt-4 w-full py-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render list view - Mobile Optimized
  const renderListView = () => {
    const items = [];
    
    // Add events
    if (calendarDisplay === 'events' || calendarDisplay === 'both') {
      items.push(...events.map(e => ({ ...e, type: 'event' as const })));
    }
    
    // Add appointments (owner only)
    if (isOwner && businessSettings?.appointments_enabled &&
        (calendarDisplay === 'appointments' || calendarDisplay === 'both')) {
      items.push(...appointments.map(a => ({ ...a, type: 'appointment' as const })));
    }
    
    // Sort by date
    items.sort((a, b) => {
      const aTime = new Date(a.start_time).getTime();
      const bTime = new Date(b.start_time).getTime();
      return aTime - bTime;
    });

    return (
      <div className="space-y-3 p-3 sm:p-4">
        {items.length === 0 ? (
          <div className="text-center py-8 sm:py-12 text-gray-500">
            <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm sm:text-base">
              {calendarDisplay === 'appointments' 
                ? 'No upcoming appointments'
                : calendarDisplay === 'events'
                ? 'No upcoming events'
                : 'No upcoming events or appointments'
              }
            </p>
          </div>
        ) : (
          items.map((item) => {
            if (item.type === 'event') {
              const event = item as DBEvent;
              return (
                <div
                  key={event.id}
                  className="p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => onRSVPEvent && onRSVPEvent(event)}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-base sm:text-lg line-clamp-2">{event.title}</h4>
                      {event.description && (
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                      <div className="mt-2 space-y-1">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 sm:w-4 h-3 sm:h-4 flex-shrink-0" />
                          <span className="truncate">
                            {formatEventTime(event.start_time, event.end_time)}
                          </span>
                        </p>
                        {event.location && (
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            <MapPin className="w-3 sm:w-4 h-3 sm:h-4 flex-shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="self-start px-2 sm:px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs whitespace-nowrap">
                      Event
                    </span>
                  </div>
                </div>
              );
            } else {
              const appointment = item as Appointment;
              return (
                <div
                  key={appointment.id}
                  className="p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-base sm:text-lg">
                        {appointment.service?.service_name || 'Appointment'}
                      </h4>
                      <div className="mt-2 space-y-1">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 sm:w-4 h-3 sm:h-4 flex-shrink-0" />
                          <span>{formatAppointmentTime(appointment)}</span>
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <Users className="w-3 sm:w-4 h-3 sm:h-4 flex-shrink-0" />
                          <span>{appointment.customer?.full_name || 'Customer'}</span>
                        </p>
                      </div>
                    </div>
                    <span className={`
                      self-start px-2 sm:px-3 py-1 rounded-full text-xs whitespace-nowrap
                      ${appointment.status === 'confirmed' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                      }
                    `}>
                      {appointment.status}
                    </span>
                  </div>
                </div>
              );
            }
          })
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden">
      {/* Header - Mobile Optimized */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 sm:p-6 text-white">
        <div className="flex flex-col gap-3">
          {/* Title Section */}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <CalendarIcon className="w-5 sm:w-6 h-5 sm:h-6" />
              <span className="truncate">{businessInfo?.display_name || 'Business'} Calendar</span>
            </h2>
            <p className="text-purple-100 mt-1 text-sm sm:text-base">
              {businessSettings?.service_type === 'both' 
                ? 'Events & Appointments'
                : businessSettings?.service_type === 'appointments'
                ? 'Book Appointments'
                : 'Upcoming Events'
              }
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs sm:text-sm text-purple-100">
              <span>{followerCount} followers</span>
            </div>
          </div>

          {/* Action Buttons - Mobile Optimized Grid */}
          <div className="flex flex-wrap gap-2">
            {/* Follow Button */}
            {!isOwner && userId && (
              <button
                onClick={handleFollowToggle}
                className={`px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm sm:text-base ${
                  isFollowing
                    ? 'bg-white text-purple-600 hover:bg-purple-50'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {isFollowing ? (
                  <>
                    <Heart className="w-4 h-4 fill-current" />
                    <span className="hidden sm:inline">Following</span>
                    <span className="sm:hidden">Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Follow</span>
                  </>
                )}
              </button>
            )}

            {/* Owner Actions - Condensed on Mobile */}
            {isOwner && (
              <>
                <button
                  onClick={() => setShowEventCreator(true)}
                  className="px-3 sm:px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2 text-sm sm:text-base"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Event</span>
                  <span className="sm:hidden">Add</span>
                </button>
                <button 
                  onClick={() => setShowSettings(true)}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  aria-label="Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Share Button */}
            <button 
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              aria-label="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Controls - Mobile Optimized */}
      <div className="p-3 sm:p-4 border-b dark:border-gray-700">
        <div className="flex flex-col gap-3">
          {/* Calendar Display Toggle - Full Width on Mobile */}
          {businessSettings?.service_type === 'both' && (
            <div className="flex items-center gap-2 w-full">
              <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 flex-1 sm:flex-initial">
                <button
                  onClick={() => setCalendarDisplay('both')}
                  className={`flex-1 sm:flex-initial px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors ${
                    calendarDisplay === 'both'
                      ? 'bg-white dark:bg-gray-700 shadow'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setCalendarDisplay('events')}
                  className={`flex-1 sm:flex-initial px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors ${
                    calendarDisplay === 'events'
                      ? 'bg-white dark:bg-gray-700 shadow'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Events
                </button>
                <button
                  onClick={() => setCalendarDisplay('appointments')}
                  className={`flex-1 sm:flex-initial px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors ${
                    calendarDisplay === 'appointments'
                      ? 'bg-white dark:bg-gray-700 shadow'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span className="hidden sm:inline">Appointments</span>
                  <span className="sm:hidden">Appts</span>
                </button>
              </div>
            </div>
          )}

          {/* View Options Row - Mobile Responsive */}
          <div className="flex items-center justify-between gap-2">
            {/* Show availability toggle */}
            {businessSettings?.appointments_enabled && 
             (calendarDisplay === 'appointments' || calendarDisplay === 'both') && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAvailabilityOnly}
                  onChange={(e) => setShowAvailabilityOnly(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600"
                />
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <span className="hidden sm:inline">Show availability</span>
                  <span className="sm:hidden">Availability</span>
                </span>
              </label>
            )}

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 ${
                  viewMode === 'calendar'
                    ? 'bg-white dark:bg-gray-700 shadow'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <Grid3x3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Calendar</span>
                <span className="sm:hidden">Grid</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-gray-700 shadow'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      {viewMode === 'calendar' ? (
        <CalendarGrid
          dbEvents={[...events, ...getAppointmentSlots()]}
          moonEvents={[]}
          showMoon={false}
          theme="default"
          date={currentDate}
          setDate={setCurrentDate}
          view={calendarView}
          setView={setCalendarView}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          onDrop={() => {}}
          onResize={() => {}}
          context="business"
          businessId={businessId}
        />
      ) : (
        renderListView()
      )}

      {/* Modals */}
      {renderBookingModal()}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <BusinessCalendarSettings 
              businessId={businessId}
              onClose={() => setShowSettings(false)}
              onSettingsUpdate={(settings) => {
                setBusinessSettings(settings);
                setShowSettings(false);
                loadBusinessData();
              }}
            />
          </div>
        </div>
      )}

      {/* Event Creator Modal */}
      {showEventCreator && (
        <UnifiedEventCreator
          open={showEventCreator}
          onClose={() => setShowEventCreator(false)}
          userId={businessId}
          context="business"
          businessId={businessId}
          defaultDate={currentDate}
          onSuccess={(event) => {
            setShowEventCreator(false);
            loadCalendarData();
          }}
        />
      )}
    </div>
  );
}
