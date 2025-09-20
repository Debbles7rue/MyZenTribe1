// components/business/tabs/BusinessDetailsTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface BusinessDetails {
  // Contact
  phone?: string;
  phone_public?: boolean;
  email?: string;
  email_public?: boolean;
  website_url?: string;
  booking_url?: string;
  location_text?: string;
  location_city?: string;
  location_state?: string;
  location_is_public?: boolean;
  
  // Services
  services?: any[];
  
  // Hours
  hours?: any;
  special_hours?: string;
  
  // Social
  social_links?: Record<string, string>;
}

const defaultHours = {
  monday: { open: '09:00', close: '17:00', closed: false },
  tuesday: { open: '09:00', close: '17:00', closed: false },
  wednesday: { open: '09:00', close: '17:00', closed: false },
  thursday: { open: '09:00', close: '17:00', closed: false },
  friday: { open: '09:00', close: '17:00', closed: false },
  saturday: { open: '10:00', close: '14:00', closed: false },
  sunday: { open: '', close: '', closed: true },
};

const socialPlatforms = [
  { id: 'facebook', label: 'Facebook', icon: '👤', placeholder: 'facebook.com/yourbusiness' },
  { id: 'instagram', label: 'Instagram', icon: '📷', placeholder: 'instagram.com/yourbusiness' },
  { id: 'twitter', label: 'Twitter/X', icon: '🐦', placeholder: 'twitter.com/yourbusiness' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼', placeholder: 'linkedin.com/company/yourbusiness' },
  { id: 'youtube', label: 'YouTube', icon: '📺', placeholder: 'youtube.com/@yourbusiness' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵', placeholder: 'tiktok.com/@yourbusiness' },
];

export default function BusinessDetailsTab({ businessId }: { businessId: string }) {
  const [data, setData] = useState<BusinessDetails>({
    services: [],
    hours: defaultHours,
    social_links: {}
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [newService, setNewService] = useState({ name: '', description: '', price: '', duration: '' });

  useEffect(() => {
    loadData();
  }, [businessId]);

  async function loadData() {
    const { data: biz } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('id', businessId)
      .single();
    
    if (biz) {
      setData({
        phone: biz.phone || '',
        phone_public: biz.phone_public || false,
        email: biz.email || '',
        email_public: biz.email_public || false,
        website_url: biz.website_url || '',
        booking_url: biz.booking_url || '',
        location_text: biz.location_text || '',
        location_city: biz.location_city || '',
        location_state: biz.location_state || '',
        location_is_public: biz.location_is_public || false,
        services: biz.services || [],
        hours: biz.hours || defaultHours,
        special_hours: biz.special_hours || '',
        social_links: biz.social_links || {}
      });
    }
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    setMessage('');
    
    const { error } = await supabase
      .from('business_profiles')
      .update({
        phone: data.phone,
        phone_public: data.phone_public,
        email: data.email,
        email_public: data.email_public,
        website_url: data.website_url,
        booking_url: data.booking_url,
        location_text: data.location_text,
        location_city: data.location_city,
        location_state: data.location_state,
        location_is_public: data.location_is_public,
        services: data.services,
        hours: data.hours,
        special_hours: data.special_hours,
        social_links: data.social_links,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId);
    
    if (error) {
      setMessage('Error: ' + error.message);
    } else {
      setMessage('Details saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    }
    setSaving(false);
  }

  function addService() {
    if (newService.name) {
      setData({
        ...data,
        services: [...(data.services || []), { ...newService, id: Date.now().toString() }]
      });
      setNewService({ name: '', description: '', price: '', duration: '' });
    }
  }

  function removeService(id: string) {
    setData({
      ...data,
      services: data.services?.filter(s => s.id !== id) || []
    });
  }

  function updateHours(day: string, field: string, value: any) {
    setData({
      ...data,
      hours: {
        ...data.hours,
        [day]: { ...data.hours[day], [field]: value }
      }
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600"></div>
      </div>
    );
  }

  const dayNames = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {/* Message */}
      {message && (
        <div className={`
          p-4 rounded-xl flex items-center gap-2 shadow-lg
          ${message.includes('Error') 
            ? 'bg-red-100 text-red-700 border border-red-300' 
            : 'bg-green-100 text-green-700 border border-green-300'}
        `}>
          {message}
        </div>
      )}

      {/* Contact Information Box */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 shadow-md">
        <h3 className="text-xl font-bold text-blue-900 mb-6 flex items-center gap-2">
          <span className="text-2xl">📞</span> Contact Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-blue-800 mb-2">Phone Number</label>
            <input
              type="tel"
              value={data.phone || ''}
              onChange={(e) => setData({ ...data, phone: e.target.value })}
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 bg-white"
              placeholder="(555) 123-4567"
              style={{ fontSize: '16px' }}
            />
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={data.phone_public}
                onChange={(e) => setData({ ...data, phone_public: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-blue-700">Display publicly</span>
            </label>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-blue-800 mb-2">Email Address</label>
            <input
              type="email"
              value={data.email || ''}
              onChange={(e) => setData({ ...data, email: e.target.value })}
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 bg-white"
              placeholder="hello@yourbusiness.com"
              style={{ fontSize: '16px' }}
            />
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={data.email_public}
                onChange={(e) => setData({ ...data, email_public: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-blue-700">Display publicly</span>
            </label>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-semibold text-blue-800 mb-2">Website</label>
            <input
              type="url"
              value={data.website_url || ''}
              onChange={(e) => setData({ ...data, website_url: e.target.value })}
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 bg-white"
              placeholder="https://yourbusiness.com"
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Booking URL */}
          <div>
            <label className="block text-sm font-semibold text-blue-800 mb-2">Booking/Calendar Link</label>
            <input
              type="url"
              value={data.booking_url || ''}
              onChange={(e) => setData({ ...data, booking_url: e.target.value })}
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 bg-white"
              placeholder="https://calendly.com/yourbusiness"
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Location */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-blue-800 mb-2">Location</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={data.location_text || ''}
                onChange={(e) => setData({ ...data, location_text: e.target.value })}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 bg-white"
                placeholder="123 Main St"
                style={{ fontSize: '16px' }}
              />
              <input
                type="text"
                value={data.location_city || ''}
                onChange={(e) => setData({ ...data, location_city: e.target.value })}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 bg-white"
                placeholder="City"
                style={{ fontSize: '16px' }}
              />
              <input
                type="text"
                value={data.location_state || ''}
                onChange={(e) => setData({ ...data, location_state: e.target.value })}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 bg-white"
                placeholder="State"
                style={{ fontSize: '16px' }}
              />
            </div>
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={data.location_is_public}
                onChange={(e) => setData({ ...data, location_is_public: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-blue-700">Display location publicly</span>
            </label>
          </div>
        </div>
      </div>

      {/* Services Box */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200 shadow-md">
        <h3 className="text-xl font-bold text-amber-900 mb-6 flex items-center gap-2">
          <span className="text-2xl">💼</span> Services & Offerings
        </h3>

        {/* Add Service Form */}
        <div className="bg-white/70 p-4 rounded-xl mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input
              type="text"
              value={newService.name}
              onChange={(e) => setNewService({ ...newService, name: e.target.value })}
              className="px-4 py-3 border-2 border-amber-300 rounded-xl focus:ring-4 focus:ring-amber-200 focus:border-amber-500 bg-white"
              placeholder="Service name *"
              style={{ fontSize: '16px' }}
            />
            <input
              type="text"
              value={newService.price}
              onChange={(e) => setNewService({ ...newService, price: e.target.value })}
              className="px-4 py-3 border-2 border-amber-300 rounded-xl focus:ring-4 focus:ring-amber-200 focus:border-amber-500 bg-white"
              placeholder="Price (e.g., $50 or $40-80)"
              style={{ fontSize: '16px' }}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input
              type="text"
              value={newService.duration}
              onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
              className="px-4 py-3 border-2 border-amber-300 rounded-xl focus:ring-4 focus:ring-amber-200 focus:border-amber-500 bg-white"
              placeholder="Duration (e.g., 60 min)"
              style={{ fontSize: '16px' }}
            />
            <input
              type="text"
              value={newService.description}
              onChange={(e) => setNewService({ ...newService, description: e.target.value })}
              className="px-4 py-3 border-2 border-amber-300 rounded-xl focus:ring-4 focus:ring-amber-200 focus:border-amber-500 bg-white"
              placeholder="Brief description"
              style={{ fontSize: '16px' }}
            />
          </div>
          <button
            onClick={addService}
            disabled={!newService.name}
            className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 font-semibold disabled:opacity-50"
          >
            Add Service
          </button>
        </div>

        {/* Services List */}
        {data.services && data.services.length > 0 && (
          <div className="space-y-2">
            {data.services.map((service: any) => (
              <div key={service.id} className="bg-white p-4 rounded-xl border border-amber-200 flex justify-between items-start">
                <div>
                  <div className="font-semibold text-amber-900">{service.name}</div>
                  {service.description && <div className="text-sm text-amber-700 mt-1">{service.description}</div>}
                  <div className="flex gap-4 mt-2 text-sm text-amber-600">
                    {service.price && <span>💵 {service.price}</span>}
                    {service.duration && <span>⏱️ {service.duration}</span>}
                  </div>
                </div>
                <button
                  onClick={() => removeService(service.id)}
                  className="text-red-500 hover:text-red-700 text-xl"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Business Hours Box */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200 shadow-md">
        <h3 className="text-xl font-bold text-green-900 mb-6 flex items-center gap-2">
          <span className="text-2xl">🕐</span> Business Hours
        </h3>

        <div className="space-y-3">
          {Object.entries(dayNames).map(([key, label]) => (
            <div key={key} className="bg-white/70 p-4 rounded-xl flex flex-col md:flex-row md:items-center gap-3">
              <div className="font-semibold text-green-800 w-28">{label}</div>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={data.hours?.[key]?.closed || false}
                  onChange={(e) => updateHours(key, 'closed', e.target.checked)}
                  className="w-4 h-4 text-green-600 rounded"
                />
                <span className="text-sm text-green-700">Closed</span>
              </label>

              {!data.hours?.[key]?.closed && (
                <div className="flex gap-2 items-center flex-1">
                  <input
                    type="time"
                    value={data.hours?.[key]?.open || ''}
                    onChange={(e) => updateHours(key, 'open', e.target.value)}
                    className="px-3 py-2 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-500 bg-white"
                    style={{ fontSize: '16px' }}
                  />
                  <span className="text-green-700">to</span>
                  <input
                    type="time"
                    value={data.hours?.[key]?.close || ''}
                    onChange={(e) => updateHours(key, 'close', e.target.value)}
                    className="px-3 py-2 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-500 bg-white"
                    style={{ fontSize: '16px' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label className="block text-sm font-semibold text-green-800 mb-2">Special Hours/Holidays</label>
          <textarea
            value={data.special_hours || ''}
            onChange={(e) => setData({ ...data, special_hours: e.target.value })}
            className="w-full px-4 py-3 border-2 border-green-300 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 bg-white"
            placeholder="e.g., Closed on holidays, Summer hours: Mon-Fri 8am-3pm"
            rows={2}
            style={{ fontSize: '16px' }}
          />
        </div>
      </div>

      {/* Social Media Box */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200 shadow-md">
        <h3 className="text-xl font-bold text-purple-900 mb-6 flex items-center gap-2">
          <span className="text-2xl">🔗</span> Social Media
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {socialPlatforms.map(platform => (
            <div key={platform.id}>
              <label className="block text-sm font-semibold text-purple-800 mb-2">
                <span className="mr-2">{platform.icon}</span>
                {platform.label}
              </label>
              <input
                type="url"
                value={data.social_links?.[platform.id] || ''}
                onChange={(e) => setData({
                  ...data,
                  social_links: { ...data.social_links, [platform.id]: e.target.value }
                })}
                className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 bg-white"
                placeholder={platform.placeholder}
                style={{ fontSize: '16px' }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Save Button - Fixed at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-4 z-50 shadow-2xl">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div>
            {message && (
              <p className={`text-sm font-medium ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {message}
              </p>
            )}
          </div>
          <button
            onClick={save}
            disabled={saving}
            className={`
              px-8 py-3 rounded-xl font-bold transition-all shadow-lg
              ${saving 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'}
            `}
          >
            {saving ? 'Saving...' : 'Save All Details'}
          </button>
        </div>
      </div>
    </div>
  );
}
