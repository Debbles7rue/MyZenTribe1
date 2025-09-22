// components/business/tabs/BusinessBasicTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AvatarUploader from '@/components/AvatarUploader';
import BusinessInviteQR from '@/components/business/BusinessInviteQR';

interface BusinessBasic {
  display_name: string;
  handle: string;
  tagline?: string;
  bio?: string;
  logo_url?: string;
  cover_url?: string;
  amenities?: string[];
  categories?: string[];  // Added back if it was missing
  
  // Contact fields
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
  
  // Social links
  social_links?: Record<string, string>;
}

const amenityOptions = [
  'Wheelchair Accessible', 'Parking', 'WiFi', 'Pet Friendly',
  'Gender Neutral Restroom', 'Air Conditioning', 'Outdoor Seating',
  'Private Rooms', 'Group Sessions', 'Online Services'
];

const socialPlatforms = [
  { id: 'facebook', label: 'Facebook', icon: '👤', placeholder: 'facebook.com/yourbusiness' },
  { id: 'instagram', label: 'Instagram', icon: '📷', placeholder: 'instagram.com/yourbusiness' },
  { id: 'twitter', label: 'Twitter/X', icon: '🐦', placeholder: 'twitter.com/yourbusiness' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼', placeholder: 'linkedin.com/company/yourbusiness' },
  { id: 'youtube', label: 'YouTube', icon: '📺', placeholder: 'youtube.com/@yourbusiness' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵', placeholder: 'tiktok.com/@yourbusiness' },
];

export default function BusinessBasicTab({ businessId }: { businessId: string }) {
  const [data, setData] = useState<BusinessBasic>({
    display_name: '',
    handle: '',
    social_links: {}
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      const { data: biz } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('id', businessId)
        .single();
      
      if (biz) {
        setData({
          display_name: biz.display_name || '',
          handle: biz.handle || '',
          tagline: biz.tagline || '',
          bio: biz.bio || '',
          logo_url: biz.logo_url || '',
          cover_url: biz.cover_url || '',
          amenities: biz.amenities || [],
          categories: biz.categories || [],
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
          social_links: biz.social_links || {}
        });
      }
      setLoading(false);
    }
    load();
  }, [businessId]);

  async function save() {
    if (!data.display_name || !data.handle) {
      setMessage('Name and handle are required');
      return;
    }

    setSaving(true);
    setMessage('');
    
    const { error } = await supabase
      .from('business_profiles')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId);
    
    if (error) {
      setMessage('Error: ' + error.message);
    } else {
      setMessage('Saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    }
    setSaving(false);
  }

  function toggleCategory(cat: string) {
    if (data.categories?.includes(cat)) {
      setData({ ...data, categories: data.categories.filter(c => c !== cat) });
    } else {
      setData({ ...data, categories: [...(data.categories || []), cat] });
    }
  }

  function updateSocialLink(platform: string, value: string) {
    setData({
      ...data,
      social_links: {
        ...data.social_links,
        [platform]: value
      }
    });
  }

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {message && (
        <div className={`p-3 rounded-lg mb-4 ${
          message.includes('Error') 
            ? 'bg-red-100 text-red-700' 
            : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}

      {/* Basic Information Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        
        {/* FIXED: Logo Upload with AvatarUploader that works with userId */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Business Logo</label>
          <AvatarUploader
            userId={businessId}
            value={data.logo_url || ''}
            onChange={(url) => setData({ ...data, logo_url: url })}
            label="Upload Logo"
            size={100}
          />
        </div>

        {/* FIXED: Cover Image Upload with AvatarUploader */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image</label>
          <AvatarUploader
            userId={businessId}
            value={data.cover_url || ''}
            onChange={(url) => setData({ ...data, cover_url: url })}
            label="Upload Cover"
            size={150}
          />
          <p className="text-xs text-gray-500 mt-1">Recommended: 1600x400px for best display</p>
        </div>

        {/* Name and Handle - PRESERVED AS IS */}
        <div className="grid gap-4 md:grid-cols-2 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Name *
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={data.display_name}
              onChange={(e) => setData({ ...data, display_name: e.target.value })}
              placeholder="Your Business Name"
              style={{ fontSize: '16px', minHeight: '44px' }}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Handle *
            </label>
            <div className="flex items-center">
              <span className="text-gray-500 mr-1">@</span>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={data.handle}
                onChange={(e) => setData({ ...data, handle: e.target.value.replace(/[^a-z0-9_]/gi, '') })}
                placeholder="yourbusiness"
                style={{ fontSize: '16px', minHeight: '44px' }}
              />
            </div>
          </div>
        </div>

        {/* Tagline - PRESERVED AS IS */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Tagline</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            value={data.tagline}
            onChange={(e) => setData({ ...data, tagline: e.target.value })}
            placeholder="Your inspiring tagline"
            maxLength={100}
            style={{ fontSize: '16px', minHeight: '44px' }}
          />
        </div>

        {/* Bio - PRESERVED AS IS */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            rows={4}
            value={data.bio}
            onChange={(e) => setData({ ...data, bio: e.target.value })}
            placeholder="Tell customers about your business..."
            style={{ fontSize: '16px' }}
          />
        </div>
      </div>

      {/* Amenities & Accessibility Box - PRESERVED EXACTLY */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200 shadow-md">
        <h3 className="text-xl font-bold text-green-900 mb-6 flex items-center gap-2">
          <span className="text-2xl">✨</span> Amenities & Accessibility
        </h3>
        
        <div className="flex flex-wrap gap-3">
          {amenityOptions.map(amenity => (
            <button
              key={amenity}
              type="button"
              onClick={() => {
                const amens = data.amenities || [];
                if (amens.includes(amenity)) {
                  setData({ ...data, amenities: amens.filter(a => a !== amenity) });
                } else {
                  setData({ ...data, amenities: [...amens, amenity] });
                }
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                data.amenities?.includes(amenity)
                  ? 'bg-green-600 text-white shadow-md transform scale-105'
                  : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-green-300'
              }`}
              style={{ minHeight: '36px' }}
            >
              {amenity}
            </button>
          ))}
        </div>
        <p className="text-xs text-green-700 mt-4">Select all that apply to help customers know what to expect</p>
      </div>

      {/* Contact Information Box - PRESERVED EXACTLY WITH MOBILE OPTIMIZATION */}
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
              style={{ fontSize: '16px', minHeight: '44px' }}
            />
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
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
              style={{ fontSize: '16px', minHeight: '44px' }}
            />
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
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
              style={{ fontSize: '16px', minHeight: '44px' }}
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
              style={{ fontSize: '16px', minHeight: '44px' }}
            />
          </div>

          {/* Location - PRESERVED EXACTLY */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-blue-800 mb-2">Location</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={data.location_text || ''}
                onChange={(e) => setData({ ...data, location_text: e.target.value })}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 bg-white"
                placeholder="123 Main St"
                style={{ fontSize: '16px', minHeight: '44px' }}
              />
              <input
                type="text"
                value={data.location_city || ''}
                onChange={(e) => setData({ ...data, location_city: e.target.value })}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 bg-white"
                placeholder="City"
                style={{ fontSize: '16px', minHeight: '44px' }}
              />
              <input
                type="text"
                value={data.location_state || ''}
                onChange={(e) => setData({ ...data, location_state: e.target.value })}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 bg-white"
                placeholder="State"
                style={{ fontSize: '16px', minHeight: '44px' }}
              />
            </div>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
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

      {/* Social Media Box - PRESERVED EXACTLY */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200 shadow-md">
        <h3 className="text-xl font-bold text-purple-900 mb-6 flex items-center gap-2">
          <span className="text-2xl">🔗</span> Social Media Links
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {socialPlatforms.map(platform => (
            <div key={platform.id} className="flex items-center gap-3">
              <span className="text-2xl">{platform.icon}</span>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-purple-800 mb-1">
                  {platform.label}
                </label>
                <input
                  type="url"
                  value={data.social_links?.[platform.id] || ''}
                  onChange={(e) => updateSocialLink(platform.id, e.target.value)}
                  className="w-full px-3 py-2 border-2 border-purple-300 rounded-lg focus:ring-4 focus:ring-purple-200 focus:border-purple-500 bg-white"
                  placeholder={platform.placeholder}
                  style={{ fontSize: '16px', minHeight: '44px' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Business QR Code - PRESERVED EXACTLY */}
      <BusinessInviteQR 
        businessId={businessId}
        businessHandle={data.handle}
        businessName={data.display_name}
        mode="full"
        size={200}
      />

      {/* Save Button - PRESERVED WITH MOBILE OPTIMIZATION */}
      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving || !data.display_name || !data.handle}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
          style={{ minHeight: '48px' }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
