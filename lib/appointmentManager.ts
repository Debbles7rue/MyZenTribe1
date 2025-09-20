// lib/appointmentManager.ts
// Centralized Appointment Management System for MyZenTribe
// Handles all appointment booking, scheduling, and availability logic

import { supabase } from '@/lib/supabaseClient';
import type { Visibility } from '@/lib/types';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface BusinessHours {
  [day: string]: {
    open: string;
    close: string;
    available: boolean;
    breaks?: Array<{ start: string; end: string }>;
  };
}

export interface BusinessSettings {
  id: string;
  business_id: string;
  service_type: 'events' | 'appointments' | 'both';
  appointments_enabled: boolean;
  appointment_buffer_time: number;
  appointment_advance_days: number;
  auto_confirm_appointments: boolean;
  cancellation_hours_notice: number;
  business_hours: BusinessHours;
}

export interface AppointmentService {
  id: string;
  business_id: string;
  service_name: string;
  description?: string;
  duration_minutes: number;
  price?: number;
  color: string;
  active: boolean;
  max_advance_days?: number;
}

export interface Appointment {
  id: string;
  business_id: string;
  customer_id: string;
  service_id?: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  customer_notes?: string;
  business_notes?: string;
  cancellation_reason?: string;
  confirmed_at?: string;
  confirmed_by?: string;
  confirmation_message?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  service?: AppointmentService;
  customer?: {
    full_name: string;
    avatar_url?: string;
    email?: string;
  };
  business?: {
    display_name: string;
    logo_url?: string;
  };
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
  service?: AppointmentService;
}

export interface AppointmentForm {
  business_id: string;
  service_id: string;
  start_time: string;
  customer_notes?: string;
}

// ============================================
// BUSINESS SETTINGS MANAGEMENT
// ============================================

/**
 * Get or create business settings
 */
export async function getBusinessSettings(
  businessId: string
): Promise<{ settings?: BusinessSettings; error?: Error }> {
  try {
    // First try to get existing settings
    let { data: settings, error } = await supabase
      .from('business_settings')
      .select('*')
      .eq('business_id', businessId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No settings exist, create default
      const { data: newSettings, error: createError } = await supabase
        .from('business_settings')
        .insert({
          business_id: businessId,
          service_type: 'events',
          appointments_enabled: false
        })
        .select()
        .single();

      if (createError) throw createError;
      return { settings: newSettings };
    }

    if (error) throw error;
    return { settings };
  } catch (error) {
    console.error('Get business settings error:', error);
    return { error: error as Error };
  }
}

/**
 * Update business settings
 */
export async function updateBusinessSettings(
  businessId: string,
  updates: Partial<BusinessSettings>
): Promise<{ settings?: BusinessSettings; error?: Error }> {
  try {
    const { data: settings, error } = await supabase
      .from('business_settings')
      .update(updates)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error) throw error;
    return { settings };
  } catch (error) {
    console.error('Update business settings error:', error);
    return { error: error as Error };
  }
}

// ============================================
// APPOINTMENT SERVICES MANAGEMENT
// ============================================

/**
 * Create appointment service
 */
export async function createAppointmentService(
  service: Omit<AppointmentService, 'id'>
): Promise<{ service?: AppointmentService; error?: Error }> {
  try {
    const { data, error } = await supabase
      .from('appointment_services')
      .insert(service)
      .select()
      .single();

    if (error) throw error;
    return { service: data };
  } catch (error) {
    console.error('Create appointment service error:', error);
    return { error: error as Error };
  }
}

/**
 * Get business appointment services
 */
export async function getBusinessServices(
  businessId: string,
  activeOnly: boolean = true
): Promise<{ services: AppointmentService[]; error?: Error }> {
  try {
    let query = supabase
      .from('appointment_services')
      .select('*')
      .eq('business_id', businessId)
      .order('service_name');

    if (activeOnly) {
      query = query.eq('active', true);
    }

    const { data: services, error } = await query;

    if (error) throw error;
    return { services: services || [] };
  } catch (error) {
    console.error('Get business services error:', error);
    return { services: [], error: error as Error };
  }
}

/**
 * Update appointment service
 */
export async function updateAppointmentService(
  serviceId: string,
  updates: Partial<AppointmentService>
): Promise<{ service?: AppointmentService; error?: Error }> {
  try {
    const { data, error } = await supabase
      .from('appointment_services')
      .update(updates)
      .eq('id', serviceId)
      .select()
      .single();

    if (error) throw error;
    return { service: data };
  } catch (error) {
    console.error('Update appointment service error:', error);
    return { error: error as Error };
  }
}

// ============================================
// APPOINTMENT BOOKING & MANAGEMENT
// ============================================

/**
 * Book an appointment
 */
export async function bookAppointment(
  appointment: AppointmentForm,
  customerId: string
): Promise<{ appointment?: Appointment; error?: Error }> {
  try {
    // Get service details to calculate end time
    const { data: service, error: serviceError } = await supabase
      .from('appointment_services')
      .select('*')
      .eq('id', appointment.service_id)
      .single();

    if (serviceError) throw serviceError;

    // Calculate end time based on service duration
    const startTime = new Date(appointment.start_time);
    const endTime = new Date(startTime.getTime() + service.duration_minutes * 60 * 1000);

    // Check if auto-confirm is enabled
    const { data: settings } = await supabase
      .from('business_settings')
      .select('auto_confirm_appointments')
      .eq('business_id', appointment.business_id)
      .single();

    const status = settings?.auto_confirm_appointments ? 'confirmed' : 'pending';

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        business_id: appointment.business_id,
        customer_id: customerId,
        service_id: appointment.service_id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        customer_notes: appointment.customer_notes,
        status: status,
        confirmed_at: status === 'confirmed' ? new Date().toISOString() : null
      })
      .select(`
        *,
        service:appointment_services(*),
        customer:profiles!appointments_customer_id_fkey(
          full_name,
          avatar_url,
          email
        ),
        business:profiles!appointments_business_id_fkey(
          display_name,
          logo_url
        )
      `)
      .single();

    if (error) {
      // Check if it's a double booking error
      if (error.message?.includes('appointments_business_id_tstzrange_excl')) {
        throw new Error('This time slot is no longer available. Please choose another time.');
      }
      throw error;
    }

    // Send notification to business
    if (status === 'pending') {
      await createAppointmentNotification(data.id, appointment.business_id, 'confirmation');
    }

    return { appointment: data };
  } catch (error: any) {
    console.error('Book appointment error:', error);
    return { error: error as Error };
  }
}

/**
 * Confirm an appointment (business action)
 */
export async function confirmAppointment(
  appointmentId: string,
  businessId: string,
  message?: string
): Promise<{ success: boolean; error?: Error }> {
  try {
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirmed_by: businessId,
        confirmation_message: message
      })
      .eq('id', appointmentId)
      .eq('business_id', businessId);

    if (error) throw error;

    // Send notification to customer
    const { data: appointment } = await supabase
      .from('appointments')
      .select('customer_id')
      .eq('id', appointmentId)
      .single();

    if (appointment) {
      await createAppointmentNotification(appointmentId, appointment.customer_id, 'confirmation');
    }

    return { success: true };
  } catch (error) {
    console.error('Confirm appointment error:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Cancel an appointment
 */
export async function cancelAppointment(
  appointmentId: string,
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: Error }> {
  try {
    // First get the appointment to check ownership
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('business_id, customer_id, start_time')
      .eq('id', appointmentId)
      .single();

    if (fetchError) throw fetchError;

    // Check if user can cancel
    const isCustomer = appointment.customer_id === userId;
    const isBusiness = appointment.business_id === userId;
    
    if (!isCustomer && !isBusiness) {
      throw new Error('You do not have permission to cancel this appointment');
    }

    // Check cancellation notice period for customers
    if (isCustomer) {
      const { data: settings } = await supabase
        .from('business_settings')
        .select('cancellation_hours_notice')
        .eq('business_id', appointment.business_id)
        .single();

      const hoursUntilAppointment = 
        (new Date(appointment.start_time).getTime() - Date.now()) / (1000 * 60 * 60);

      if (settings && hoursUntilAppointment < settings.cancellation_hours_notice) {
        throw new Error(
          `Appointments must be cancelled at least ${settings.cancellation_hours_notice} hours in advance`
        );
      }
    }

    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason
      })
      .eq('id', appointmentId);

    if (error) throw error;

    // Send notification to the other party
    const recipientId = isCustomer ? appointment.business_id : appointment.customer_id;
    await createAppointmentNotification(appointmentId, recipientId, 'cancellation');

    return { success: true };
  } catch (error: any) {
    console.error('Cancel appointment error:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Get appointments for a user (as customer or business)
 */
export async function getUserAppointments(
  userId: string,
  role: 'customer' | 'business' | 'both' = 'both',
  dateRange?: { from: Date; to: Date }
): Promise<{ appointments: Appointment[]; error?: Error }> {
  try {
    const from = dateRange?.from || new Date();
    const to = dateRange?.to || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days

    let query = supabase
      .from('appointments')
      .select(`
        *,
        service:appointment_services(*),
        customer:profiles!appointments_customer_id_fkey(
          full_name,
          avatar_url,
          email
        ),
        business:profiles!appointments_business_id_fkey(
          display_name,
          logo_url
        )
      `)
      .gte('start_time', from.toISOString())
      .lte('start_time', to.toISOString())
      .in('status', ['pending', 'confirmed'])
      .order('start_time', { ascending: true });

    if (role === 'customer') {
      query = query.eq('customer_id', userId);
    } else if (role === 'business') {
      query = query.eq('business_id', userId);
    } else {
      query = query.or(`customer_id.eq.${userId},business_id.eq.${userId}`);
    }

    const { data: appointments, error } = await query;

    if (error) throw error;
    return { appointments: appointments || [] };
  } catch (error) {
    console.error('Get user appointments error:', error);
    return { appointments: [], error: error as Error };
  }
}

// ============================================
// AVAILABILITY MANAGEMENT
// ============================================

/**
 * Get available time slots for a business on a specific date
 */
export async function getAvailableSlots(
  businessId: string,
  date: Date,
  serviceId?: string
): Promise<{ slots: TimeSlot[]; error?: Error }> {
  try {
    // Get business settings and service details
    const [settingsResult, appointmentsResult] = await Promise.all([
      getBusinessSettings(businessId),
      supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('business_id', businessId)
        .gte('start_time', new Date(date.setHours(0, 0, 0, 0)).toISOString())
        .lte('start_time', new Date(date.setHours(23, 59, 59, 999)).toISOString())
        .in('status', ['pending', 'confirmed'])
    ]);

    if (settingsResult.error) throw settingsResult.error;
    if (!settingsResult.settings) throw new Error('Business settings not found');

    const settings = settingsResult.settings;
    const existingAppointments = appointmentsResult.data || [];

    // Get service duration if specified
    let serviceDuration = 60; // default 1 hour
    if (serviceId) {
      const { data: service } = await supabase
        .from('appointment_services')
        .select('duration_minutes')
        .eq('id', serviceId)
        .single();
      
      if (service) {
        serviceDuration = service.duration_minutes;
      }
    }

    // Get day of week
    const dayName = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const dayHours = settings.business_hours[dayName];

    if (!dayHours?.available) {
      return { slots: [] };
    }

    // Check for availability overrides
    const { data: override } = await supabase
      .from('appointment_availability')
      .select('*')
      .eq('business_id', businessId)
      .eq('date', date.toISOString().split('T')[0])
      .single();

    if (override && !override.is_available) {
      return { slots: [] };
    }

    // Generate time slots
    const slots: TimeSlot[] = [];
    const openTime = parseTime(dayHours.open, date);
    const closeTime = parseTime(dayHours.close, date);
    const bufferTime = settings.appointment_buffer_time || 0;
    const slotDuration = serviceDuration + bufferTime;

    let currentSlot = new Date(openTime);

    while (currentSlot < closeTime) {
      const slotEnd = new Date(currentSlot.getTime() + serviceDuration * 60 * 1000);
      
      // Check if this slot conflicts with existing appointments
      const isAvailable = !existingAppointments.some(apt => {
        const aptStart = new Date(apt.start_time);
        const aptEnd = new Date(apt.end_time);
        return (currentSlot < aptEnd && slotEnd > aptStart);
      });

      // Only add future slots
      if (currentSlot > new Date() && slotEnd <= closeTime) {
        slots.push({
          start: new Date(currentSlot),
          end: slotEnd,
          available: isAvailable
        });
      }

      currentSlot = new Date(currentSlot.getTime() + slotDuration * 60 * 1000);
    }

    return { slots };
  } catch (error) {
    console.error('Get available slots error:', error);
    return { slots: [], error: error as Error };
  }
}

/**
 * Set availability override for a specific date
 */
export async function setAvailabilityOverride(
  businessId: string,
  date: Date,
  available: boolean,
  reason?: string,
  customHours?: { open: string; close: string }
): Promise<{ success: boolean; error?: Error }> {
  try {
    const { error } = await supabase
      .from('appointment_availability')
      .upsert({
        business_id: businessId,
        date: date.toISOString().split('T')[0],
        is_available: available,
        custom_hours: customHours,
        reason: reason
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Set availability override error:', error);
    return { success: false, error: error as Error };
  }
}

// ============================================
// NOTIFICATIONS
// ============================================

/**
 * Create appointment notification
 */
async function createAppointmentNotification(
  appointmentId: string,
  recipientId: string,
  type: 'confirmation' | 'reminder' | 'cancellation' | 'rescheduled'
): Promise<void> {
  try {
    await supabase
      .from('appointment_notifications')
      .insert({
        appointment_id: appointmentId,
        recipient_id: recipientId,
        type: type
      });
  } catch (error) {
    console.error('Create notification error:', error);
  }
}

/**
 * Get unread appointment notifications
 */
export async function getUnreadNotifications(
  userId: string
): Promise<{ notifications: any[]; error?: Error }> {
  try {
    const { data: notifications, error } = await supabase
      .from('appointment_notifications')
      .select(`
        *,
        appointment:appointments(
          start_time,
          status,
          service:appointment_services(service_name),
          customer:profiles!appointments_customer_id_fkey(full_name),
          business:profiles!appointments_business_id_fkey(display_name)
        )
      `)
      .eq('recipient_id', userId)
      .is('read_at', null)
      .order('sent_at', { ascending: false });

    if (error) throw error;
    return { notifications: notifications || [] };
  } catch (error) {
    console.error('Get unread notifications error:', error);
    return { notifications: [], error: error as Error };
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Parse time string to Date object
 */
function parseTime(timeStr: string, date: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Format appointment time for display
 */
export function formatAppointmentTime(appointment: Appointment): string {
  const start = new Date(appointment.start_time);
  const end = new Date(appointment.end_time);
  
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  };
  
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit'
  };
  
  const dateStr = start.toLocaleDateString('en-US', dateOptions);
  const startTime = start.toLocaleTimeString('en-US', timeOptions);
  const endTime = end.toLocaleTimeString('en-US', timeOptions);
  
  return `${dateStr} • ${startTime} - ${endTime}`;
}

/**
 * Get appointment status color
 */
export function getAppointmentStatusColor(status: Appointment['status']): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case 'confirmed':
      return {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-800 dark:text-green-200',
        border: 'border-green-500'
      };
    case 'pending':
      return {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-800 dark:text-yellow-200',
        border: 'border-yellow-500'
      };
    case 'cancelled':
      return {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-800 dark:text-red-200',
        border: 'border-red-500'
      };
    case 'completed':
      return {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-800 dark:text-gray-200',
        border: 'border-gray-400'
      };
    default:
      return {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-800 dark:text-gray-200',
        border: 'border-gray-400'
      };
  }
}

// Export everything for use in components
export default {
  getBusinessSettings,
  updateBusinessSettings,
  createAppointmentService,
  getBusinessServices,
  updateAppointmentService,
  bookAppointment,
  confirmAppointment,
  cancelAppointment,
  getUserAppointments,
  getAvailableSlots,
  setAvailabilityOverride,
  getUnreadNotifications,
  formatAppointmentTime,
  getAppointmentStatusColor
};
