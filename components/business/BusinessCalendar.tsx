import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, ChevronLeft, ChevronRight, Plus, X, Users, 
  MapPin, DollarSign, CalendarDays, Check, AlertCircle, Settings,
  BookOpen, CalendarCheck, Sparkles, User
} from 'lucide-react';

// Type definitions
interface BusinessSettings {
  service_type: 'events' | 'appointments' | 'both';
  appointments_enabled: boolean;
  business_hours: Record<string, { open: string; close: string; available: boolean }>;
  appointment_buffer_time: number;
  appointment_advance_days: number;
  auto_confirm_appointments: boolean;
}

interface Event {
  id: string;
  title: string;
  date: Date;
  time: string;
  endTime?: string;
  description?: string;
  location?: string;
  attendees?: number;
  maxAttendees?: number;
  type: 'event' | 'appointment';
  isPrivate?: boolean;
  customerName?: string;
  serviceId?: string;
  status?: 'confirmed' | 'pending' | 'cancelled';
}

interface TimeSlot {
  time: string;
  available: boolean;
  serviceId?: string;
  duration?: number;
}

interface Service {
  id: string;
  name: string;
  duration: number;
  price?: number;
  color: string;
  description?: string;
}

// Mock services data
const mockServices: Service[] = [
  { id: '1', name: 'Consultation', duration: 30, price: 50, color: '#9333ea', description: 'Initial consultation' },
  { id: '2', name: 'Full Service', duration: 60, price: 100, color: '#3b82f6', description: 'Complete service package' },
  { id: '3', name: 'Quick Session', duration: 15, price: 25, color: '#10b981', description: 'Brief check-in' }
];

export default function BusinessCalendar() {
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [events, setEvents] = useState<Event[]>([]);
  const [showDayView, setShowDayView] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  
  // Business settings (would come from your settings component)
  const [settings] = useState<BusinessSettings>({
    service_type: 'both',
    appointments_enabled: true,
    business_hours: {
      monday: { open: '09:00', close: '17:00', available: true },
      tuesday: { open: '09:00', close: '17:00', available: true },
      wednesday: { open: '09:00', close: '17:00', available: true },
      thursday: { open: '09:00', close: '17:00', available: true },
      friday: { open: '09:00', close: '17:00', available: true },
      saturday: { open: '10:00', close: '14:00', available: false },
      sunday: { open: '10:00', close: '14:00', available: false }
    },
    appointment_buffer_time: 15,
    appointment_advance_days: 30,
    auto_confirm_appointments: true
  });

  // Calendar navigation
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Get calendar days
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    while (current <= lastDay || current.getDay() !== 0) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  // Get available time slots for a date
  const getTimeSlots = (date: Date): TimeSlot[] => {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const dayHours = settings.business_hours[dayName];
    
    if (!dayHours?.available) return [];
    
    const slots: TimeSlot[] = [];
    const [startHour, startMin] = dayHours.open.split(':').map(Number);
    const [endHour, endMin] = dayHours.close.split(':').map(Number);
    
    let currentTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    while (currentTime < endTime) {
      const hour = Math.floor(currentTime / 60);
      const min = currentTime % 60;
      const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      
      // Check if slot is already booked
      const isBooked = events.some(event => 
        event.date.toDateString() === date.toDateString() && 
        event.time === timeString &&
        event.type === 'appointment'
      );
      
      slots.push({
        time: timeString,
        available: !isBooked
      });
      
      currentTime += 30; // 30-minute slots
    }
    
    return slots;
  };

  // Handle day click
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setShowDayView(true);
  };

  // Handle time slot selection for booking
  const handleTimeSlotClick = (slot: TimeSlot) => {
    if (slot.available && settings.appointments_enabled) {
      setSelectedTimeSlot(slot.time);
      setShowBookingForm(true);
    }
  };

  // Create event
  const createEvent = (eventData: Partial<Event>) => {
    const newEvent: Event = {
      id: Date.now().toString(),
      title: eventData.title || '',
      date: eventData.date || selectedDate || new Date(),
      time: eventData.time || '',
      type: 'event',
      ...eventData
    };
    setEvents([...events, newEvent]);
    setShowEventForm(false);
  };

  // Create appointment
  const createAppointment = () => {
    if (!selectedDate || !selectedTimeSlot || !selectedService) return;
    
    const newAppointment: Event = {
      id: Date.now().toString(),
      title: selectedService.name,
      date: selectedDate,
      time: selectedTimeSlot,
      type: 'appointment',
      isPrivate: true,
      serviceId: selectedService.id,
      status: settings.auto_confirm_appointments ? 'confirmed' : 'pending',
      customerName: 'Customer Name' // Would come from form
    };
    
    setEvents([...events, newAppointment]);
    setShowBookingForm(false);
    setSelectedTimeSlot('');
    setSelectedService(null);
  };

  const calendarDays = getCalendarDays();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Calendar Header */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm mb-4">
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold">{monthName}</h2>
              <div className="flex gap-2">
                <button
                  onClick={goToToday}
                  className="px-3 py-1 text-sm bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800"
                >
                  Today
                </button>
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* View Mode Tabs */}
            <div className="flex items-center gap-4">
              {/* Calendar Mode Indicator */}
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                {settings.service_type === 'events' && (
                  <>
                    <CalendarDays className="w-4 h-4 text-purple-600" />
                    <span className="text-sm">Events Only</span>
                  </>
                )}
                {settings.service_type === 'appointments' && (
                  <>
                    <CalendarCheck className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">Bookings Only</span>
                  </>
                )}
                {settings.service_type === 'both' && (
                  <>
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-sm">Events & Bookings</span>
                  </>
                )}
              </div>
              
              <div className="flex rounded-lg border dark:border-gray-700">
                {['Month', 'Week', 'Day'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode.toLowerCase() as any)}
                    className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                      viewMode === mode.toLowerCase()
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b dark:border-gray-700">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date, index) => {
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isToday = date.toDateString() === new Date().toDateString();
            const dayEvents = getEventsForDate(date);
            const publicEvents = dayEvents.filter(e => !e.isPrivate);
            const appointments = dayEvents.filter(e => e.type === 'appointment');
            
            return (
              <div
                key={index}
                onClick={() => handleDayClick(date)}
                className={`min-h-[100px] p-2 border-r border-b dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-400' : ''
                } ${isToday ? 'bg-purple-50 dark:bg-purple-900/20' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm font-medium ${isToday ? 'text-purple-600' : ''}`}>
                    {date.getDate()}
                  </span>
                  {appointments.length > 0 && settings.service_type !== 'events' && (
                    <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-1.5 py-0.5 rounded">
                      {appointments.length} booked
                    </span>
                  )}
                </div>
                
                {/* Display Events */}
                {settings.service_type !== 'appointments' && publicEvents.slice(0, 2).map((event, i) => (
                  <div
                    key={event.id}
                    className="text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 p-1 rounded mb-1 truncate"
                  >
                    {event.time} - {event.title}
                  </div>
                ))}
                
                {publicEvents.length > 2 && (
                  <div className="text-xs text-gray-500">
                    +{publicEvents.length - 2} more
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day View Modal */}
      {showDayView && selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Day View Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold">
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h3>
                  <p className="text-purple-100 text-sm mt-1">
                    {settings.service_type === 'both' ? 'Events & Available Appointments' :
                     settings.service_type === 'events' ? 'Events Schedule' : 'Available Time Slots'}
                  </p>
                </div>
                <button
                  onClick={() => setShowDayView(false)}
                  className="p-2 hover:bg-white/20 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Events Section */}
              {settings.service_type !== 'appointments' && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-purple-600" />
                      Events
                    </h4>
                    <button
                      onClick={() => setShowEventForm(true)}
                      className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Event
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {getEventsForDate(selectedDate).filter(e => !e.isPrivate).length > 0 ? (
                      getEventsForDate(selectedDate).filter(e => !e.isPrivate).map(event => (
                        <div key={event.id} className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-medium">{event.title}</h5>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                <Clock className="w-3 h-3 inline mr-1" />
                                {event.time} {event.endTime && `- ${event.endTime}`}
                              </p>
                              {event.location && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  <MapPin className="w-3 h-3 inline mr-1" />
                                  {event.location}
                                </p>
                              )}
                              {event.attendees !== undefined && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  <Users className="w-3 h-3 inline mr-1" />
                                  {event.attendees} attending
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">No events scheduled</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Appointment Slots Section */}
              {settings.appointments_enabled && settings.service_type !== 'events' && (
                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <CalendarCheck className="w-5 h-5 text-blue-600" />
                    Available Appointment Times
                  </h4>
                  
                  {/* Service Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Select a Service:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {mockServices.map(service => (
                        <button
                          key={service.id}
                          onClick={() => setSelectedService(service)}
                          className={`p-3 rounded-lg border-2 transition-all text-left ${
                            selectedService?.id === service.id
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                              style={{ backgroundColor: service.color }}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{service.name}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {service.duration} min
                                {service.price && ` • $${service.price}`}
                              </div>
                              {service.description && (
                                <div className="text-xs text-gray-500 mt-1">{service.description}</div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Time Slots Grid */}
                  {selectedService && (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {getTimeSlots(selectedDate).map(slot => (
                        <button
                          key={slot.time}
                          onClick={() => handleTimeSlotClick(slot)}
                          disabled={!slot.available}
                          className={`p-2 rounded-lg text-sm font-medium transition-all ${
                            slot.available
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                              : 'bg-gray-100 text-gray-400 dark:bg-gray-800 cursor-not-allowed'
                          } ${selectedTimeSlot === slot.time ? 'ring-2 ring-blue-500' : ''}`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {!selectedService && (
                    <p className="text-center text-gray-500 py-8">
                      Please select a service to view available times
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Event Creation Form */}
      {showEventForm && selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Create Event</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createEvent({
                title: formData.get('title') as string,
                time: formData.get('time') as string,
                endTime: formData.get('endTime') as string,
                location: formData.get('location') as string,
                description: formData.get('description') as string,
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Event Title *</label>
                  <input
                    name="title"
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Time *</label>
                    <input
                      name="time"
                      type="time"
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Time</label>
                    <input
                      name="endTime"
                      type="time"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <input
                    name="location"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEventForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Confirmation Modal */}
      {showBookingForm && selectedDate && selectedTimeSlot && selectedService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Confirm Booking</h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium mb-2">Booking Details</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Service:</strong> {selectedService.name}</p>
                  <p><strong>Date:</strong> {selectedDate.toLocaleDateString()}</p>
                  <p><strong>Time:</strong> {selectedTimeSlot}</p>
                  <p><strong>Duration:</strong> {selectedService.duration} minutes</p>
                  {selectedService.price && (
                    <p><strong>Price:</strong> ${selectedService.price}</p>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Your Name *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                  placeholder="Enter your name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                  placeholder="your@email.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                  placeholder="(555) 123-4567"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                  placeholder="Any special requests or notes..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowBookingForm(false);
                  setSelectedTimeSlot('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={createAppointment}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
