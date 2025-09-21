import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, ChevronLeft, ChevronRight, Plus, X, Users, 
  MapPin, DollarSign, CalendarDays, Check, AlertCircle, Settings,
  BookOpen, CalendarCheck, Sparkles, User, Edit2, Trash2, Save,
  MoreVertical, Copy, Eye, EyeOff, Moon, Sun, Coffee, Sunset
} from 'lucide-react';

// Type definitions
interface BusinessSettings {
  service_type: 'events' | 'appointments' | 'both';
  appointments_enabled: boolean;
  business_hours: Record<string, DayHours>;
  appointment_buffer_time: number;
  appointment_advance_days: number;
  auto_confirm_appointments: boolean;
  blocked_dates: string[];
  time_slot_duration: number;
}

interface DayHours {
  open: string;
  close: string;
  available: boolean;
  breaks?: { start: string; end: string }[];
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
  customerEmail?: string;
  customerPhone?: string;
  serviceId?: string;
  status?: 'confirmed' | 'pending' | 'cancelled';
  notes?: string;
  price?: number;
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
  price: number;
  color: string;
  description?: string;
  active: boolean;
}

interface EventFormData {
  title: string;
  time: string;
  endTime: string;
  location: string;
  description: string;
  maxAttendees: string;
}

interface BookingFormData {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

export default function BusinessCalendar() {
  // State Management
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [events, setEvents] = useState<Event[]>([]);
  const [services, setServices] = useState<Service[]>([
    { id: '1', name: 'Consultation', duration: 30, price: 50, color: '#9333ea', description: 'Initial consultation', active: true },
    { id: '2', name: 'Full Service', duration: 60, price: 100, color: '#3b82f6', description: 'Complete service package', active: true },
    { id: '3', name: 'Quick Session', duration: 15, price: 25, color: '#10b981', description: 'Brief check-in', active: true }
  ]);
  
  // UI State
  const [showDayView, setShowDayView] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showServicesPanel, setShowServicesPanel] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isBusinessView, setIsBusinessView] = useState(true);
  
  // Form State
  const [eventFormData, setEventFormData] = useState<EventFormData>({
    title: '',
    time: '',
    endTime: '',
    location: '',
    description: '',
    maxAttendees: ''
  });
  
  const [bookingFormData, setBookingFormData] = useState<BookingFormData>({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });
  
  // Business settings
  const [settings, setSettings] = useState<BusinessSettings>({
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
    auto_confirm_appointments: true,
    blocked_dates: [],
    time_slot_duration: 30
  });

  // Initialize form when editing
  useEffect(() => {
    if (editingEvent) {
      setEventFormData({
        title: editingEvent.title || '',
        time: editingEvent.time || '',
        endTime: editingEvent.endTime || '',
        location: editingEvent.location || '',
        description: editingEvent.description || '',
        maxAttendees: editingEvent.maxAttendees?.toString() || ''
      });
    } else {
      setEventFormData({
        title: '',
        time: '',
        endTime: '',
        location: '',
        description: '',
        maxAttendees: ''
      });
    }
  }, [editingEvent]);

  // Calendar Navigation
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
      
      const isBooked = events.some(event => 
        event.date.toDateString() === date.toDateString() && 
        event.time === timeString &&
        event.type === 'appointment' &&
        event.status !== 'cancelled'
      );
      
      slots.push({
        time: timeString,
        available: !isBooked
      });
      
      currentTime += settings.time_slot_duration;
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

  // Save event
  const handleSaveEvent = () => {
    const eventData: Partial<Event> = {
      title: eventFormData.title,
      time: eventFormData.time,
      endTime: eventFormData.endTime,
      location: eventFormData.location,
      description: eventFormData.description,
      maxAttendees: eventFormData.maxAttendees ? parseInt(eventFormData.maxAttendees) : undefined,
      date: selectedDate || new Date(),
      type: 'event'
    };
    
    if (editingEvent) {
      setEvents(events.map(e => e.id === editingEvent.id ? { ...e, ...eventData } : e));
      setEditingEvent(null);
    } else {
      const newEvent: Event = {
        id: Date.now().toString(),
        ...eventData as Event
      };
      setEvents([...events, newEvent]);
    }
    
    setShowEventForm(false);
    setEventFormData({
      title: '',
      time: '',
      endTime: '',
      location: '',
      description: '',
      maxAttendees: ''
    });
  };

  // Delete event
  const deleteEvent = (eventId: string) => {
    setEvents(events.filter(e => e.id !== eventId));
  };

  // Create appointment
  const handleBookAppointment = () => {
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
      price: selectedService.price,
      customerName: bookingFormData.name,
      customerEmail: bookingFormData.email,
      customerPhone: bookingFormData.phone,
      notes: bookingFormData.notes
    };
    
    setEvents([...events, newAppointment]);
    setShowBookingForm(false);
    setSelectedTimeSlot('');
    setSelectedService(null);
    setBookingFormData({
      name: '',
      email: '',
      phone: '',
      notes: ''
    });
  };

  // Save service
  const saveService = (serviceData: Partial<Service>) => {
    if (editingService) {
      setServices(services.map(s => s.id === editingService.id ? { ...s, ...serviceData } : s));
      setEditingService(null);
    } else {
      const newService: Service = {
        id: Date.now().toString(),
        name: serviceData.name || '',
        duration: serviceData.duration || 30,
        price: serviceData.price || 0,
        color: serviceData.color || '#9333ea',
        description: serviceData.description || '',
        active: true
      };
      setServices([...services, newService]);
    }
  };

  // Delete service
  const deleteService = (serviceId: string) => {
    setServices(services.filter(s => s.id !== serviceId));
  };

  const calendarDays = getCalendarDays();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Top Control Bar */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm mb-4 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* View Toggle */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setIsBusinessView(true)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isBusinessView 
                    ? 'bg-white dark:bg-gray-700 text-purple-600 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <Settings className="w-4 h-4 inline mr-1" />
                Business View
              </button>
              <button
                onClick={() => setIsBusinessView(false)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  !isBusinessView 
                    ? 'bg-white dark:bg-gray-700 text-purple-600 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <Eye className="w-4 h-4 inline mr-1" />
                Customer View
              </button>
            </div>
            
            {/* Service Type Selector (Business View Only) */}
            {isBusinessView && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Calendar Type:</span>
                <select
                  value={settings.service_type}
                  onChange={(e) => setSettings({...settings, service_type: e.target.value as any})}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-sm"
                >
                  <option value="events">Events Only</option>
                  <option value="appointments">Appointments Only</option>
                  <option value="both">Events & Appointments</option>
                </select>
              </div>
            )}
          </div>

          {/* Business Management Buttons */}
          {isBusinessView && (
            <div className="flex items-center gap-2">
              {settings.service_type !== 'events' && (
                <button
                  onClick={() => setShowServicesPanel(true)}
                  className="px-3 py-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 text-sm font-medium"
                >
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Manage Services
                </button>
              )}
              <button
                onClick={() => setShowSettingsPanel(true)}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium"
              >
                <Clock className="w-4 h-4 inline mr-1" />
                Business Hours
              </button>
            </div>
          )}
        </div>
      </div>

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
            
            {/* Calendar Type Indicator */}
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
            const publicEvents = dayEvents.filter(e => !e.isPrivate && e.type === 'event');
            const appointments = dayEvents.filter(e => e.type === 'appointment');
            const confirmedAppointments = appointments.filter(e => e.status === 'confirmed');
            const pendingAppointments = appointments.filter(e => e.status === 'pending');
            
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
                  {isBusinessView && appointments.length > 0 && settings.service_type !== 'events' && (
                    <div className="flex gap-1">
                      {confirmedAppointments.length > 0 && (
                        <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-1 rounded">
                          {confirmedAppointments.length}
                        </span>
                      )}
                      {pendingAppointments.length > 0 && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 px-1 rounded">
                          {pendingAppointments.length}?
                        </span>
                      )}
                    </div>
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
                
                {publicEvents.length > 2 && settings.service_type !== 'appointments' && (
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
                    {isBusinessView && (
                      <button
                        onClick={() => {
                          setEditingEvent(null);
                          setShowEventForm(true);
                        }}
                        className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Add Event
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {getEventsForDate(selectedDate).filter(e => e.type === 'event').length > 0 ? (
                      getEventsForDate(selectedDate).filter(e => e.type === 'event').map(event => (
                        <div key={event.id} className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg group">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
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
                            {isBusinessView && (
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    setEditingEvent(event);
                                    setShowEventForm(true);
                                  }}
                                  className="p-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteEvent(event.id)}
                                  className="p-1 hover:bg-red-200 dark:hover:bg-red-800 rounded text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">No events scheduled</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Business View: Appointments List */}
              {isBusinessView && settings.service_type !== 'events' && (
                <div className="mb-6">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Appointments
                  </h4>
                  <div className="space-y-2">
                    {getEventsForDate(selectedDate).filter(e => e.type === 'appointment').length > 0 ? (
                      getEventsForDate(selectedDate).filter(e => e.type === 'appointment').map(apt => {
                        const service = services.find(s => s.id === apt.serviceId);
                        return (
                          <div key={apt.id} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className="font-medium">{apt.customerName}</h5>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    apt.status === 'confirmed' 
                                      ? 'bg-green-100 text-green-700' 
                                      : apt.status === 'pending'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {apt.status}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  <Clock className="w-3 h-3 inline mr-1" />
                                  {apt.time} - {service?.name}
                                </p>
                                {apt.customerEmail && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {apt.customerEmail}
                                  </p>
                                )}
                                {apt.customerPhone && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {apt.customerPhone}
                                  </p>
                                )}
                                {apt.notes && (
                                  <p className="text-sm text-gray-500 mt-1">
                                    Note: {apt.notes}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-1">
                                {apt.status === 'pending' && (
                                  <button
                                    onClick={() => {
                                      setEvents(events.map(e => 
                                        e.id === apt.id ? {...e, status: 'confirmed'} : e
                                      ));
                                    }}
                                    className="p-1 hover:bg-green-200 dark:hover:bg-green-800 rounded text-green-600"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteEvent(apt.id)}
                                  className="p-1 hover:bg-red-200 dark:hover:bg-red-800 rounded text-red-600"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-gray-500 text-center py-4">No appointments booked</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Customer View: Appointment Booking */}
              {!isBusinessView && settings.appointments_enabled && settings.service_type !== 'events' && (
                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <CalendarCheck className="w-5 h-5 text-blue-600" />
                    Available Appointment Times
                  </h4>
                  
                  {/* Service Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Select a Service:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {services.filter(s => s.active).map(service => (
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
                                {service.duration} min • ${service.price}
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

      {/* Event Creation/Edit Modal */}
      {showEventForm && selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">
              {editingEvent ? 'Edit Event' : 'Create Event'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Event Title *</label>
                <input
                  type="text"
                  value={eventFormData.title}
                  onChange={(e) => setEventFormData({...eventFormData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time *</label>
                  <input
                    type="time"
                    value={eventFormData.time}
                    onChange={(e) => setEventFormData({...eventFormData, time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input
                    type="time"
                    value={eventFormData.endTime}
                    onChange={(e) => setEventFormData({...eventFormData, endTime: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <input
                  type="text"
                  value={eventFormData.location}
                  onChange={(e) => setEventFormData({...eventFormData, location: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Max Attendees</label>
                <input
                  type="number"
                  value={eventFormData.maxAttendees}
                  onChange={(e) => setEventFormData({...eventFormData, maxAttendees: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  rows={3}
                  value={eventFormData.description}
                  onChange={(e) => setEventFormData({...eventFormData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEventForm(false);
                  setEditingEvent(null);
                  setEventFormData({
                    title: '',
                    time: '',
                    endTime: '',
                    location: '',
                    description: '',
                    maxAttendees: ''
                  });
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEvent}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                {editingEvent ? 'Save Changes' : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Services Management Panel */}
      {showServicesPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Manage Services</h3>
                <button
                  onClick={() => setShowServicesPanel(false)}
                  className="p-2 hover:bg-white/20 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Configure your services and pricing
                </p>
                <button
                  onClick={() => {
                    const newService: Service = {
                      id: Date.now().toString(),
                      name: '',
                      duration: 30,
                      price: 0,
                      color: '#' + Math.floor(Math.random()*16777215).toString(16),
                      description: '',
                      active: true
                    };
                    setEditingService(newService);
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Service
                </button>
              </div>
              
              <div className="space-y-3">
                {services.map(service => (
                  <div key={service.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    {editingService?.id === service.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium mb-1">Service Name</label>
                            <input
                              type="text"
                              value={editingService.name}
                              onChange={(e) => setEditingService({...editingService, name: e.target.value})}
                              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 text-sm"
                              placeholder="Service name"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Duration (min)</label>
                            <input
                              type="number"
                              value={editingService.duration}
                              onChange={(e) => setEditingService({...editingService, duration: parseInt(e.target.value)})}
                              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 text-sm"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium mb-1">Price ($)</label>
                            <input
                              type="number"
                              value={editingService.price}
                              onChange={(e) => setEditingService({...editingService, price: parseFloat(e.target.value)})}
                              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Color</label>
                            <input
                              type="color"
                              value={editingService.color}
                              onChange={(e) => setEditingService({...editingService, color: e.target.value})}
                              className="w-full h-[30px] border border-gray-300 dark:border-gray-600 rounded"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Description</label>
                          <input
                            type="text"
                            value={editingService.description}
                            onChange={(e) => setEditingService({...editingService, description: e.target.value})}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 text-sm"
                            placeholder="Brief description"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setEditingService(null)}
                            className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              saveService(editingService);
                              setEditingService(null);
                            }}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: service.color }}
                          />
                          <div>
                            <h4 className="font-medium">{service.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {service.duration} min • ${service.price}
                              {service.description && ` • ${service.description}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setServices(services.map(s => 
                              s.id === service.id ? {...s, active: !s.active} : s
                            ))}
                            className={`px-2 py-1 text-xs rounded ${
                              service.active 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            }`}
                          >
                            {service.active ? 'Active' : 'Inactive'}
                          </button>
                          <button
                            onClick={() => setEditingService(service)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteService(service.id)}
                            className="p-1 hover:bg-red-200 dark:hover:bg-red-700 rounded text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Business Hours Settings Panel */}
      {showSettingsPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Business Hours</h3>
                <button
                  onClick={() => setShowSettingsPanel(false)}
                  className="p-2 hover:bg-white/20 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">Weekly Schedule</h4>
                  <div className="space-y-2">
                    {Object.entries(settings.business_hours).map(([day, hours]) => (
                      <div key={day} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <input
                          type="checkbox"
                          checked={hours.available}
                          onChange={(e) => {
                            setSettings({
                              ...settings,
                              business_hours: {
                                ...settings.business_hours,
                                [day]: { ...hours, available: e.target.checked }
                              }
                            });
                          }}
                          className="w-4 h-4"
                        />
                        <span className="w-24 font-medium capitalize">{day}</span>
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="time"
                            value={hours.open}
                            onChange={(e) => {
                              setSettings({
                                ...settings,
                                business_hours: {
                                  ...settings.business_hours,
                                  [day]: { ...hours, open: e.target.value }
                                }
                              });
                            }}
                            disabled={!hours.available}
                            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 text-sm disabled:opacity-50"
                          />
                          <span>to</span>
                          <input
                            type="time"
                            value={hours.close}
                            onChange={(e) => {
                              setSettings({
                                ...settings,
                                business_hours: {
                                  ...settings.business_hours,
                                  [day]: { ...hours, close: e.target.value }
                                }
                              });
                            }}
                            disabled={!hours.available}
                            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 text-sm disabled:opacity-50"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {settings.service_type !== 'events' && (
                  <div>
                    <h4 className="font-medium mb-3">Appointment Settings</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Time Slot Duration</label>
                        <select
                          value={settings.time_slot_duration}
                          onChange={(e) => setSettings({...settings, time_slot_duration: parseInt(e.target.value)})}
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 text-sm"
                        >
                          <option value="15">15 minutes</option>
                          <option value="30">30 minutes</option>
                          <option value="45">45 minutes</option>
                          <option value="60">60 minutes</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Buffer Time Between Appointments</label>
                        <select
                          value={settings.appointment_buffer_time}
                          onChange={(e) => setSettings({...settings, appointment_buffer_time: parseInt(e.target.value)})}
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 text-sm"
                        >
                          <option value="0">No buffer</option>
                          <option value="15">15 minutes</option>
                          <option value="30">30 minutes</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Advance Booking Limit</label>
                        <select
                          value={settings.appointment_advance_days}
                          onChange={(e) => setSettings({...settings, appointment_advance_days: parseInt(e.target.value)})}
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 text-sm"
                        >
                          <option value="7">1 week</option>
                          <option value="14">2 weeks</option>
                          <option value="30">30 days</option>
                          <option value="60">60 days</option>
                          <option value="90">90 days</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Auto-confirm Appointments</label>
                        <button
                          onClick={() => setSettings({...settings, auto_confirm_appointments: !settings.auto_confirm_appointments})}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.auto_confirm_appointments ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.auto_confirm_appointments ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowSettingsPanel(false)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Booking Form */}
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
                  <p><strong>Price:</strong> ${selectedService.price}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Your Name *</label>
                <input
                  type="text"
                  value={bookingFormData.name}
                  onChange={(e) => setBookingFormData({...bookingFormData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                  placeholder="Enter your name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  value={bookingFormData.email}
                  onChange={(e) => setBookingFormData({...bookingFormData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                  placeholder="your@email.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  value={bookingFormData.phone}
                  onChange={(e) => setBookingFormData({...bookingFormData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                  placeholder="(555) 123-4567"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={bookingFormData.notes}
                  onChange={(e) => setBookingFormData({...bookingFormData, notes: e.target.value})}
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
                  setBookingFormData({
                    name: '',
                    email: '',
                    phone: '',
                    notes: ''
                  });
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleBookAppointment}
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
