// components/business/tabs/BusinessContactTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function BusinessContactTab({ businessId }: { businessId: string }) {
  const [data, setData] = useState({
    phone: '',
    phone_public: false,
    email: '',
    email_public: false,
    website_url: '',
    booking_url: '',
    location_text: '',
    location_city: '',
    location_state: '',
    location_is_public: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      const { data: biz } = await supabase
        .from('business_profiles')
        .select('phone, phone_public, email, email_public, website_url, booking_url, location_text, location_city, location_state, location_is_public')
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
          location_is_public: biz.location_is_public !== false,
        });
      }
      setLoading(false);
    }
    load();
  }, [businessId]);

  async function save() {
    setSaving(true);
    setMessage('');
    
    const { error } = await supabase
      .from('business_profiles')
      .update(data)
      .eq('id', businessId);
    
    if (error) {
      setMessage('Error: ' + error.message);
    } else {
      setMessage('Saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    }
    setSaving(false);
  }

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
        {message && (
          <div className={`p-3 rounded-lg mb-4 ${
            message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Phone - Mobile Optimized */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Phone Number
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="tel"
            className="flex-1 px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            value={data.phone}
            onChange={(e) => setData({ ...data, phone: e.target.value })}
            placeholder="(555) 123-4567"
            style={{ fontSize: '16px' }}
          />
          <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
            <input
              type="checkbox"
              checked={data.phone_public}
              onChange={(e) => setData({ ...data, phone_public: e.target.checked })}
              className="w-5 h-5 rounded text-purple-600"
            />
            <span className="text-sm">Show publicly</span>
          </label>
        </div>
      </div>

      {/* Email - Mobile Optimized */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            className="flex-1 px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            value={data.email}
            onChange={(e) => setData({ ...data, email: e.target.value })}
            placeholder="contact@business.com"
            style={{ fontSize: '16px' }}
          />
          <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
            <input
              type="checkbox"
              checked={data.email_public}
              onChange={(e) => setData({ ...data, email_public: e.target.checked })}
              className="w-5 h-5 rounded text-purple-600"
            />
            <span className="text-sm">Show publicly</span>
          </label>
        </div>
      </div>

      {/* Website */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Website URL
        </label>
        <input
          type="url"
          className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          value={data.website_url}
          onChange={(e) => setData({ ...data, website_url: e.target.value })}
          placeholder="https://yourwebsite.com"
          style={{ fontSize: '16px' }}
        />
      </div>

      {/* Booking URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Booking/Calendar URL
        </label>
        <input
          type="url"
          className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          value={data.booking_url}
          onChange={(e) => setData({ ...data, booking_url: e.target.value })}
          placeholder="https://calendly.com/yourbusiness"
          style={{ fontSize: '16px' }}
        />
        <p className="text-xs text-gray-500 mt-1">Link to Calendly, Acuity, or your booking system</p>
      </div>

      {/* Location - Mobile Stack */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Location
        </label>
        <div className="space-y-3">
          <input
            type="text"
            className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            value={data.location_text}
            onChange={(e) => setData({ ...data, location_text: e.target.value })}
            placeholder="Street Address (optional)"
            style={{ fontSize: '16px' }}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              className="px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={data.location_city}
              onChange={(e) => setData({ ...data, location_city: e.target.value })}
              placeholder="City"
              style={{ fontSize: '16px' }}
            />
            <input
              type="text"
              className="px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={data.location_state}
              onChange={(e) => setData({ ...data, location_state: e.target.value })}
              placeholder="State"
              style={{ fontSize: '16px' }}
            />
          </div>
          <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
            <input
              type="checkbox"
              checked={data.location_is_public}
              onChange={(e) => setData({ ...data, location_is_public: e.target.checked })}
              className="w-5 h-5 rounded text-purple-600"
            />
            <span className="text-sm">Show location publicly</span>
          </label>
        </div>
      </div>

      {/* Save Button - Mobile Full Width */}
      <div className="flex justify-center sm:justify-end pt-4 border-t">
        <button
          onClick={save}
          disabled={saving}
          className="w-full sm:w-auto px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium text-base touch-manipulation min-h-[48px]"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
