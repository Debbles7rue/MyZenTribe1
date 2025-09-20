// components/business/BusinessCalendar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, Users, ChevronLeft, ChevronRight, Plus, Settings, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { loadBusinessEvents, formatEventTime, getEventColor } from '@/lib/eventManager';
import { getBusinessSettings, getAvailableSlots, getBusinessServices, formatAppointmentTime } from '@/lib/appointmentManager';
import BusinessCalendarSettings from './BusinessCalendarSettings'; // ADD THIS IMPORT
import type { DBEvent } from '@/lib/types';
import type { BusinessSettings, TimeSlot, AppointmentService, Appointment } from '@/lib/appointmentManager';

interface Props {
  businessId: string;
  userId?: string; // Current logged-in user
  isOwner?: boolean; // Is this the business owner viewing?
  onBookAppointment?: (slot: TimeSlot, service: AppointmentService) => void;
  onRSVPEvent?: (event: DBEvent) => void;
}

type ViewMode = 'month' | 'week' | 'day' | 'list';
type ServiceDisplay = 'events' | 'appointments' | 'both';

export default function BusinessCalendar({
  businessId,
  userId,
  isOwner = false,
  onBookAppointment,
  onRSVPEvent
}: Props) {
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [serviceDisplay, setServiceDisplay] = useState<ServiceDisplay>('both');
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
  const [showSettings, setShowSettings] = useState(false); // ADD THIS STATE

  // Load initial data
  useEffect(() => {
    loadBusinessData();
  }, [businessId]);

  // Load events and appointments when date changes
  useEffect(() => {
    if (businessSettings) {
      loadCalendarData();
    }
  }, [currentDate, businessSettings]);

  // Load available slots when a date is selected
  useEffect(() => {
    if (selectedDate && selectedService && businessSettings?.appointments_enabled) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedService]);

  const loadBusinessData = async () => {
    setLoading(true);
    try {
      // Get business settings
      const { settings } = await getBusinessSettings(businessId);
      if (settings) {
        setBusinessSettings(settings);
        setServiceDisplay(settings.service_type);

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
      // Calculate date range based on view mode
      const startDate = getStartDate(currentDate, viewMode);
      const endDate = getEndDate(currentDate, viewMode);

      // Load events if enabled
      if (businessSettings?.service_type !== 'appointments') {
        const { events: eventList } = await loadBusinessEvents(businessId);
        setEvents(eventList);
      }

      // Load appointments if enabled and owner
      if (businessSettings?.appointments_enabled && isOwner) {
        const { appointments: aptList } = await getUserAppointments(businessId, 'business', {
          from: startDate,
          to: endDate
        });
        setAppointments(aptList);
      }
    } catch (error) {
      console.error('Error loading calendar data:', error);
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedDate || !selectedService) return;
    
    try {
      const { slots } = await getAvailableSlots(
        businessId,
        selectedDate,
        selectedService.id
      );
      setTimeSlots(slots);
      setShowSlotPicker(true);
    } catch (error) {
      console.error('Error loading slots:', error);
    }
  };

  // Import the getUserAppointments function
  const getUserAppointments = async (
    businessId: string,
    role: string,
    dateRange: { from: Date; to: Date }
  ) => {
    const { getUserAppointments: getAppts } = await import('@/lib/appointmentManager');
    return getAppts(businessId, role as any, dateRange);
  };

  // Navigation functions
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Helper functions
  const handleDateClick = (date: Date) => {
    if (businessSettings?.appointments_enabled) {
      setSelectedDate(date);
      if (services.length > 1) {
        setShowServicePicker(true);
      } else if (services.length === 1) {
        setSelectedService(services[0]);
        loadAvailableSlots();
      }
    }
  };

  const getStartDate = (date: Date, mode: ViewMode): Date => {
    const result = new Date(date);
    switch (mode) {
      case 'month':
        result.setDate(1);
        result.setDate(result.getDate() - result.getDay());
        break;
      case 'week':
        result.setDate(result.getDate() - result.getDay());
        break;
      case 'day':
        // Already correct
        break;
    }
    result.setHours(0, 0, 0, 0);
    return result;
  };

  const getEndDate = (date: Date, mode: ViewMode): Date => {
    const result = new Date(date);
    switch (mode) {
      case 'month':
        result.setMonth(result.getMonth() + 1);
        result.setDate(0);
        result.setDate(result.getDate() + (6 - result.getDay()));
        break;
      case 'week':
        result.setDate(result.getDate() + (6 - result.getDay()));
        break;
      case 'day':
        // Same day
        break;
    }
    result.setHours(23, 59, 59, 999);
    return result;
  };

  const getDaysInView = (date: Date, mode: ViewMode): Date[] => {
    const days: Date[] = [];
    const start = getStartDate(date, mode);
    const end = getEndDate(date, mode);
    
    const current = new Date(start);
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const getEventsForDate = (date: Date, eventList: DBEvent[]): DBEvent[] => {
    return eventList.filter(event => {
      const eventDate = new Date(event.start_time);
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      );
    });
  };

  const hasAvailableAppointments = (date: Date): boolean => {
    // Check if this day has available appointment slots
    const dayName = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const dayHours = businessSettings?.business_hours?.[dayName];
    return dayHours?.available || false;
  };

  const isDateToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  // Render calendar grid
  const renderCalendarGrid = () => {
    if (viewMode === 'list') {
      return renderListView();
    }

    const days = getDaysInView(currentDate, viewMode);
    const showAppointmentSlots = 
      businessSettings?.appointments_enabled && 
      (serviceDisplay === 'appointments' || serviceDisplay === 'both');
    const showEvents = 
      serviceDisplay === 'events' || serviceDisplay === 'both';

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-gray-50 dark:bg-gray-800 p-2 text-center text-sm font-medium">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {days.map((date, idx) => {
          const dayEvents = showEvents ? getEventsForDate(date, events) : [];
          const hasAppointments = showAppointmentSlots && hasAvailableAppointments(date);
          const isToday = isDateToday(date);
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();

          return (
            <div
              key={idx}
              className={`
                min-h-[100px] bg-white dark:bg-gray-900 p-2
                ${!isCurrentMonth ? 'opacity-50' : ''}
                ${isToday ? 'bg-purple-50 dark:bg-purple-900/20' : ''}
                hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer
              `}
              onClick={() => handleDateClick(date)}
            >
              <div className="font-medium text-sm mb-1">
                {date.getDate()}
              </div>

              {/* Show events */}
              {dayEvents.slice(0, 2).map((event, i) => (
                <div
                  key={event.id}
                  className={`
                    text-xs p-1 mb-1 rounded truncate
                    ${getEventColor(event).bg} ${getEventColor(event).text}
                  `}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onRSVPEvent) onRSVPEvent(event);
                  }}
                >
                  {event.title}
                </div>
              ))}

              {dayEvents.length > 2 && (
                <div className="text-xs text-gray-500">
                  +{dayEvents.length - 2} more
                </div>
              )}

              {/* Show appointment indicator */}
              {hasAppointments && (
                <div className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1 py-0.5 rounded mt-1">
                  📅 Slots available
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderListView = () => {
    const combinedItems = [
      ...events.map(e => ({ ...e, type: 'event' as const })),
      ...(isOwner ? appointments.map(a => ({ ...a, type: 'appointment' as const })) : [])
    ].sort((a, b) => {
      const aTime = a.type === 'event' ? a.start_time : a.start_time;
      const bTime = b.type === 'event' ? b.start_time : b.start_time;
      return new Date(aTime).getTime() - new Date(bTime).getTime();
    });

    return (
      <div className="space-y-3">
        {combinedItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No upcoming events or appointments
          </div>
        ) : (
          combinedItems.map((item) => {
            if (item.type === 'event') {
              const event = item as DBEvent;
              return (
                <div
                  key={event.id}
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => onRSVPEvent && onRSVPEvent(event)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">{event.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <Clock className="inline w-4 h-4 mr-1" />
                        {formatEventTime(event.start_time, event.end_time)}
                      </p>
                      {event.location && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <MapPin className="inline w-4 h-4 mr-1" />
                          {event.location}
                        </p>
                      )}
                    </div>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">
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
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold">
                        {appointment.service?.service_name || 'Appointment'}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <Clock className="inline w-4 h-4 mr-1" />
                        {formatAppointmentTime(appointment)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <Users className="inline w-4 h-4 mr-1" />
                        {appointment.customer?.full_name || 'Customer'}
                      </p>
                    </div>
                    <span className={`
                      px-3 py-1 rounded-full text-xs
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

  // Service & Time Slot Selection Modal
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
                        loadAvailableSlots();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <CalendarIcon className="w-6 h-6" />
              Business Calendar
            </h2>
            <p className="text-purple-100 mt-1">
              {businessSettings?.service_type === 'both' 
                ? 'Events & Appointments'
                : businessSettings?.service_type === 'appointments'
                ? 'Book Appointments'
                : 'Upcoming Events'
              }
            </p>
          </div>

          {isOwner && (
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Event
              </button>
              <button 
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-b dark:border-gray-700">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50"
            >
              Today
            </button>
            
            <button
              onClick={() => navigateDate('next')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            
            <span className="ml-4 font-medium text-lg">
              {currentDate.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </span>
          </div>

          {/* View Controls */}
          <div className="flex gap-2">
            {/* Service Type Toggle (if both enabled) */}
            {businessSettings?.service_type === 'both' && (
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setServiceDisplay('both')}
                  className={`px-3 py-1 rounded ${
                    serviceDisplay === 'both'
                      ? 'bg-white dark:bg-gray-700 shadow'
                      : ''
                  }`}
                >
                  Both
                </button>
                <button
                  onClick={() => setServiceDisplay('events')}
                  className={`px-3 py-1 rounded ${
                    serviceDisplay === 'events'
                      ? 'bg-white dark:bg-gray-700 shadow'
                      : ''
                  }`}
                >
                  Events
                </button>
                <button
                  onClick={() => setServiceDisplay('appointments')}
                  className={`px-3 py-1 rounded ${
                    serviceDisplay === 'appointments'
                      ? 'bg-white dark:bg-gray-700 shadow'
                      : ''
                  }`}
                >
                  Appointments
                </button>
              </div>
            )}

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {(['month', 'week', 'day', 'list'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 rounded capitalize ${
                    viewMode === mode
                      ? 'bg-white dark:bg-gray-700 shadow'
                      : ''
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="p-4">
        {renderCalendarGrid()}
      </div>

      {/* Booking Modal */}
      {renderBookingModal()}

      {/* Settings Modal - THIS IS THE NEW ADDITION */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <BusinessCalendarSettings 
              businessId={businessId}
              onClose={() => setShowSettings(false)}
              onSettingsUpdate={(settings) => {
                setBusinessSettings(settings);
                setShowSettings(false);
                loadBusinessData(); // Refresh the calendar
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
