// components/business/BusinessCalendarSettings.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, Calendar, Clock, DollarSign, Plus, Edit2, Trash2, 
  Save, X, ChevronDown, ChevronUp, Info, Toggle, Shield,
  AlertCircle, Check, Coffee, Moon, Sun, Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import {
  getBusinessSettings,
  updateBusinessSettings,
  createAppointmentService,
  getBusinessServices,
  updateAppointmentService,
  BusinessSettings,
  AppointmentService
} from '@/lib/appointmentManager';

interface Props {
  businessId: string;
  onClose?: () => void;
  onSettingsUpdate?: (settings: BusinessSettings) => void;
}

type TabType = 'general' | 'hours' | 'services' | 'booking';

const DEFAULT_BUSINESS_HOURS = {
  monday: { open: '09:00', close: '17:00', available: true },
  tuesday: { open: '09:00', close: '17:00', available: true },
  wednesday: { open: '09:00', close: '17:00', available: true },
  thursday: { open: '09:00', close: '17:00', available: true },
  friday: { open: '09:00', close: '17:00', available: true },
  saturday: { open: '10:00', close: '14:00', available: false },
  sunday: { open: '10:00', close: '14:00', available: false }
};

const SERVICE_COLORS = [
  { name: 'Purple', value: '#9333ea', bg: 'bg-purple-100', border: 'border-purple-500' },
  { name: 'Blue', value: '#3b82f6', bg: 'bg-blue-100', border: 'border-blue-500' },
  { name: 'Green', value: '#10b981', bg: 'bg-green-100', border: 'border-green-500' },
  { name: 'Pink', value: '#ec4899', bg: 'bg-pink-100', border: 'border-pink-500' },
  { name: 'Orange', value: '#f97316', bg: 'bg-orange-100', border: 'border-orange-500' },
  { name: 'Teal', value: '#14b8a6', bg: 'bg-teal-100', border: 'border-teal-500' },
  { name: 'Red', value: '#ef4444', bg: 'bg-red-100', border: 'border-red-500' },
  { name: 'Indigo', value: '#6366f1', bg: 'bg-indigo-100', border: 'border-indigo-500' }
];

export default function BusinessCalendarSettings({ 
  businessId, 
  onClose,
  onSettingsUpdate
}: Props) {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [services, setServices] = useState<AppointmentService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  // Form states
  const [serviceType, setServiceType] = useState<'events' | 'appointments' | 'both'>('events');
  const [appointmentsEnabled, setAppointmentsEnabled] = useState(false);
  const [businessHours, setBusinessHours] = useState(DEFAULT_BUSINESS_HOURS);
  const [bufferTime, setBufferTime] = useState(15);
  const [advanceDays, setAdvanceDays] = useState(30);
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [cancellationHours, setCancellationHours] = useState(24);
  
  // Service form
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState<AppointmentService | null>(null);
  const [serviceForm, setServiceForm] = useState({
    service_name: '',
    description: '',
    duration_minutes: 60,
    price: 0,
    color: '#9333ea',
    max_advance_days: 30
  });

  // Load settings and services
  useEffect(() => {
    loadData();
  }, [businessId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsResult, servicesResult] = await Promise.all([
        getBusinessSettings(businessId),
        getBusinessServices(businessId, false)
      ]);

      if (settingsResult.settings) {
        const s = settingsResult.settings;
        setSettings(s);
        setServiceType(s.service_type);
        setAppointmentsEnabled(s.appointments_enabled);
        setBusinessHours(s.business_hours || DEFAULT_BUSINESS_HOURS);
        setBufferTime(s.appointment_buffer_time || 15);
        setAdvanceDays(s.appointment_advance_days || 30);
        setAutoConfirm(s.auto_confirm_appointments || false);
        setCancellationHours(s.cancellation_hours_notice || 24);
      }

      setServices(servicesResult.services);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save all settings
  const saveAllSettings = async () => {
    setSaving(true);
    setSaveMessage('');
    
    try {
      const updates: Partial<BusinessSettings> = {
        service_type: serviceType,
        appointments_enabled: appointmentsEnabled,
        business_hours: businessHours,
        appointment_buffer_time: bufferTime,
        appointment_advance_days: advanceDays,
        auto_confirm_appointments: autoConfirm,
        cancellation_hours_notice: cancellationHours
      };

      const result = await updateBusinessSettings(businessId, updates);
      
      if (result.settings) {
        setSettings(result.settings);
        setSaveMessage('Settings saved successfully! ✨');
        if (onSettingsUpdate) onSettingsUpdate(result.settings);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('Failed to save settings');
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveMessage('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  // Handle service creation/update
  const handleSaveService = async () => {
    try {
      if (editingService) {
        // Update existing service
        await updateAppointmentService(editingService.id, {
          ...serviceForm,
          price: serviceForm.price || undefined
        });
      } else {
        // Create new service
        await createAppointmentService({
          ...serviceForm,
          business_id: businessId,
          active: true,
          price: serviceForm.price || undefined
        });
      }
      
      // Refresh services list
      const { services: updatedServices } = await getBusinessServices(businessId, false);
      setServices(updatedServices);
      
      // Reset form
      setShowServiceForm(false);
      setEditingService(null);
      setServiceForm({
        service_name: '',
        description: '',
        duration_minutes: 60,
        price: 0,
        color: '#9333ea',
        max_advance_days: 30
      });
    } catch (error) {
      console.error('Error saving service:', error);
    }
  };

  // Delete service
  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    
    try {
      await updateAppointmentService(serviceId, { active: false });
      const { services: updatedServices } = await getBusinessServices(businessId, false);
      setServices(updatedServices);
    } catch (error) {
      console.error('Error deleting service:', error);
    }
  };

  // Edit service
  const handleEditService = (service: AppointmentService) => {
    setEditingService(service);
    setServiceForm({
      service_name: service.service_name,
      description: service.description || '',
      duration_minutes: service.duration_minutes,
      price: service.price || 0,
      color: service.color,
      max_advance_days: service.max_advance_days || 30
    });
    setShowServiceForm(true);
  };

  // Toggle day availability
  const toggleDayAvailability = (day: string) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        available: !prev[day].available
      }
    }));
  };

  // Update day hours
  const updateDayHours = (day: string, field: 'open' | 'close', value: string) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-t-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Calendar Settings</h2>
              <p className="text-purple-100 text-sm mt-1">
                Configure events and appointment booking
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-700">
        <div className="flex overflow-x-auto scrollbar-hide">
          {[
            { id: 'general', label: 'General', icon: Settings },
            { id: 'hours', label: 'Business Hours', icon: Clock },
            { id: 'services', label: 'Services', icon: Sparkles },
            { id: 'booking', label: 'Booking Rules', icon: Shield }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-900 p-6 min-h-[400px]">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Service Type
              </h3>
              
              <div className="space-y-3">
                {/* Service Type Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: 'events', label: 'Events Only', icon: '🎉', desc: 'Traditional events with RSVPs' },
                    { value: 'appointments', label: 'Appointments Only', icon: '📅', desc: 'Time-slot based bookings' },
                    { value: 'both', label: 'Both', icon: '✨', desc: 'Events and appointments' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setServiceType(option.value as any);
                        if (option.value === 'appointments' || option.value === 'both') {
                          setAppointmentsEnabled(true);
                        } else {
                          setAppointmentsEnabled(false);
                        }
                      }}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        serviceType === option.value
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">{option.icon}</div>
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {option.desc}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Appointments Toggle */}
                {(serviceType === 'appointments' || serviceType === 'both') && (
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <div className="font-medium">Enable Appointment Booking</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Allow customers to book appointment slots
                        </div>
                      </div>
                      <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        appointmentsEnabled ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                        onClick={() => setAppointmentsEnabled(!appointmentsEnabled)}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          appointmentsEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Events</strong> are one-time or recurring activities people RSVP to.
                <br />
                <strong>Appointments</strong> are scheduled time slots customers book for services.
              </div>
            </div>
          </div>
        )}

        {/* Business Hours Tab */}
        {activeTab === 'hours' && appointmentsEnabled && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              Business Hours
            </h3>

            <div className="space-y-3">
              {Object.entries(businessHours).map(([day, hours]) => (
                <div
                  key={day}
                  className={`p-4 rounded-lg border transition-all ${
                    hours.available
                      ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={hours.available}
                        onChange={() => toggleDayAvailability(day)}
                        className="w-5 h-5 text-purple-600 rounded cursor-pointer"
                      />
                      <span className="font-medium capitalize min-w-[100px]">
                        {day}
                      </span>
                    </div>
                    
                    {hours.available && (
                      <div className="flex items-center gap-2 flex-1 ml-8 sm:ml-0">
                        <input
                          type="time"
                          value={hours.open}
                          onChange={(e) => updateDayHours(day, 'open', e.target.value)}
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={hours.close}
                          onChange={(e) => updateDayHours(day, 'close', e.target.value)}
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  const newHours = { ...businessHours };
                  Object.keys(newHours).forEach(day => {
                    if (day !== 'saturday' && day !== 'sunday') {
                      newHours[day].available = true;
                    }
                  });
                  setBusinessHours(newHours);
                }}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Weekdays Only
              </button>
              <button
                onClick={() => {
                  const newHours = { ...businessHours };
                  Object.keys(newHours).forEach(day => {
                    newHours[day].available = true;
                  });
                  setBusinessHours(newHours);
                }}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                All Days
              </button>
            </div>
          </div>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && appointmentsEnabled && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Appointment Services
              </h3>
              <button
                onClick={() => {
                  setEditingService(null);
                  setServiceForm({
                    service_name: '',
                    description: '',
                    duration_minutes: 60,
                    price: 0,
                    color: '#9333ea',
                    max_advance_days: 30
                  });
                  setShowServiceForm(true);
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Service
              </button>
            </div>

            {/* Services List */}
            <div className="grid gap-3">
              {services.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">No services created yet</p>
                  <p className="text-sm text-gray-500 mt-1">Add your first service to start accepting bookings</p>
                </div>
              ) : (
                services.map((service) => (
                  <div
                    key={service.id}
                    className={`p-4 rounded-lg border-2 ${
                      service.active
                        ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3 flex-1">
                        <div
                          className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                          style={{ backgroundColor: service.color }}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{service.service_name}</div>
                          {service.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {service.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-4 mt-2 text-sm">
                            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                              <Clock className="w-3.5 h-3.5" />
                              {service.duration_minutes} min
                            </span>
                            {service.price && (
                              <span className="flex items-center gap-1 text-green-600">
                                <DollarSign className="w-3.5 h-3.5" />
                                {service.price}
                              </span>
                            )}
                            <span className="text-gray-500">
                              {service.active ? '✓ Active' : '✗ Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEditService(service)}
                          className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Service Form Modal */}
            {showServiceForm && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <h3 className="text-lg font-bold mb-4">
                      {editingService ? 'Edit Service' : 'Add New Service'}
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Service Name *</label>
                        <input
                          type="text"
                          value={serviceForm.service_name}
                          onChange={(e) => setServiceForm(prev => ({ ...prev, service_name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                          placeholder="e.g., Consultation, Massage, Haircut"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                          value={serviceForm.description}
                          onChange={(e) => setServiceForm(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                          rows={3}
                          placeholder="Brief description of the service..."
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Duration (minutes) *</label>
                          <input
                            type="number"
                            value={serviceForm.duration_minutes}
                            onChange={(e) => setServiceForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                            min="15"
                            step="15"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Price ($)</label>
                          <input
                            type="number"
                            value={serviceForm.price}
                            onChange={(e) => setServiceForm(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Color</label>
                        <div className="grid grid-cols-4 gap-2">
                          {SERVICE_COLORS.map((color) => (
                            <button
                              key={color.value}
                              onClick={() => setServiceForm(prev => ({ ...prev, color: color.value }))}
                              className={`p-3 rounded-lg border-2 transition-all ${
                                serviceForm.color === color.value
                                  ? `${color.border} ${color.bg}`
                                  : 'border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              <div
                                className="w-full h-4 rounded"
                                style={{ backgroundColor: color.value }}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Max Advance Booking (days)
                        </label>
                        <input
                          type="number"
                          value={serviceForm.max_advance_days}
                          onChange={(e) => setServiceForm(prev => ({ ...prev, max_advance_days: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                          min="1"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => {
                          setShowServiceForm(false);
                          setEditingService(null);
                        }}
                        className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveService}
                        disabled={!serviceForm.service_name || !serviceForm.duration_minutes}
                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {editingService ? 'Update' : 'Create'} Service
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Booking Rules Tab */}
        {activeTab === 'booking' && appointmentsEnabled && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              Booking Rules
            </h3>

            <div className="space-y-6">
              {/* Buffer Time */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <label className="block text-sm font-medium mb-2">
                  Buffer Time Between Appointments
                </label>
                <select
                  value={bufferTime}
                  onChange={(e) => setBufferTime(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                >
                  <option value="0">No buffer</option>
                  <option value="5">5 minutes</option>
                  <option value="10">10 minutes</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                </select>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  Time between appointments for preparation or breaks
                </p>
              </div>

              {/* Advance Booking */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <label className="block text-sm font-medium mb-2">
                  How far in advance can customers book?
                </label>
                <select
                  value={advanceDays}
                  onChange={(e) => setAdvanceDays(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                >
                  <option value="7">1 week</option>
                  <option value="14">2 weeks</option>
                  <option value="30">1 month</option>
                  <option value="60">2 months</option>
                  <option value="90">3 months</option>
                  <option value="180">6 months</option>
                </select>
              </div>

              {/* Auto-Confirm */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="font-medium">Auto-Confirm Appointments</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Automatically confirm bookings without manual approval
                    </div>
                  </div>
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoConfirm ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                    onClick={() => setAutoConfirm(!autoConfirm)}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoConfirm ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </div>
                </label>
              </div>

              {/* Cancellation Policy */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <label className="block text-sm font-medium mb-2">
                  Cancellation Notice Required
                </label>
                <select
                  value={cancellationHours}
                  onChange={(e) => setCancellationHours(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                >
                  <option value="0">No notice required</option>
                  <option value="1">1 hour</option>
                  <option value="2">2 hours</option>
                  <option value="4">4 hours</option>
                  <option value="8">8 hours</option>
                  <option value="24">24 hours</option>
                  <option value="48">48 hours</option>
                  <option value="72">72 hours</option>
                </select>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  Minimum notice customers must give to cancel
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Not Enabled Message */}
        {!appointmentsEnabled && activeTab !== 'general' && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              Appointments are not enabled
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Enable appointments in the General tab to configure these settings
            </p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-b-xl border-t dark:border-gray-700">
        <div className="flex items-center justify-between">
          {/* Save Message */}
          <div className="text-sm">
            {saveMessage && (
              <div className={`flex items-center gap-2 ${
                saveMessage.includes('success') 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {saveMessage.includes('success') && <Check className="w-4 h-4" />}
                {saveMessage}
              </div>
            )}
          </div>
          
          {/* Save Button */}
          <button
            onClick={saveAllSettings}
            disabled={saving}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
