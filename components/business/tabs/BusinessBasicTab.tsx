// components/business/tabs/BusinessBasicTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AvatarUploader from '@/components/AvatarUploader';

interface Props {
  businessId: string; // This is actually the owner_id
}

export default function BusinessBasicTab({ businessId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [handleAvailable, setHandleAvailable] = useState(true);
  const [checkingHandle, setCheckingHandle] = useState(false);
  const [data, setData] = useState({
    display_name: '',
    handle: '',
    tagline: '',
    bio: '',
    description: '',
    logo_url: '',
    cover_url: '',
    categories: [] as string[],
    tags: [] as string[],
    price_range: '',
    languages: [] as string[],
  });

  const CATEGORY_OPTIONS = [
    'Wellness', 'Healing', 'Spiritual', 'Meditation', 'Yoga', 
    'Coaching', 'Therapy', 'Art', 'Music', 'Education',
    'Fitness', 'Nutrition', 'Beauty', 'Massage', 'Energy Work',
    'Counseling', 'Holistic', 'Alternative Medicine', 'Other'
  ];

  const LANGUAGE_OPTIONS = [
    'English', 'Spanish', 'French', 'German', 'Italian', 
    'Portuguese', 'Chinese', 'Japanese', 'Korean', 'Arabic',
    'Hindi', 'Russian', 'Dutch', 'Swedish', 'Polish'
  ];

  const PRICE_RANGES = [
    { value: '', label: 'Select price range' },
    { value: '$', label: '$ - Budget friendly' },
    { value: '$$', label: '$$ - Moderate' },
    { value: '$$$', label: '$$$ - Premium' },
    { value: '$$$$', label: '$$$$ - Luxury' },
  ];

  useEffect(() => {
    async function load() {
      // businessId is the owner_id
      const { data: profile, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('owner_id', businessId)
        .single();

      if (error) {
        console.error('Error loading business profile:', error);
      }

      if (profile) {
        setData({
          display_name: profile.display_name || '',
          handle: profile.handle || '',
          tagline: profile.tagline || '',
          bio: profile.bio || '',
          description: profile.description || '',
          logo_url: profile.logo_url || '',
          cover_url: profile.cover_url || '',
          categories: profile.categories || [],
          tags: profile.tags || [],
          price_range: profile.price_range || '',
          languages: profile.languages || [],
        });
      }
      setLoading(false);
    }
    load();
  }, [businessId]);

  // Check handle availability
  useEffect(() => {
    const checkHandle = async () => {
      if (!data.handle || data.handle.length < 3) {
        setHandleAvailable(true);
        return;
      }

      setCheckingHandle(true);
      const { data: existing } = await supabase
        .from('business_profiles')
        .select('owner_id')
        .eq('handle', data.handle)
        .neq('owner_id', businessId)
        .single();

      setHandleAvailable(!existing);
      setCheckingHandle(false);
    };

    const timer = setTimeout(checkHandle, 500);
    return () => clearTimeout(timer);
  }, [data.handle, businessId]);

  async function save() {
    setSaving(true);
    setMessage('');
    
    if (!data.display_name || !data.handle) {
      setMessage('❌ Error: Business name and handle are required');
      setSaving(false);
      return;
    }

    if (!handleAvailable) {
      setMessage('❌ Error: This handle is already taken');
      setSaving(false);
      return;
    }
    
    const updates = {
      display_name: data.display_name.trim(),
      handle: data.handle.toLowerCase().replace(/[^a-z0-9-]/g, ''),
      tagline: data.tagline.trim(),
      bio: data.bio.trim(),
      description: data.description.trim(),
      logo_url: data.logo_url,
      cover_url: data.cover_url,
      categories: data.categories,
      tags: data.tags,
      price_range: data.price_range,
      languages: data.languages,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('business_profiles')
      .update(updates)
      .eq('owner_id', businessId);

    if (error) {
      setMessage('❌ Error: ' + error.message);
    } else {
      setMessage('✅ Saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold mb-1">Basic Information</h2>
        <p className="text-sm text-gray-600">Set up your business profile details</p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm font-medium ${
          message.includes('Error') || message.includes('❌')
            ? 'bg-red-100 text-red-700' 
            : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}

      {/* Logo and Cover Upload - Mobile Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Logo Upload */}
        <div className="text-center sm:text-left">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Logo
          </label>
          <AvatarUploader
            userId={businessId}
            value={data.logo_url}
            onChange={(url) => setData({ ...data, logo_url: url })}
            label="Upload Logo"
            size={120}
          />
          <p className="text-xs text-gray-500 mt-2">Recommended: 500x500px</p>
        </div>

        {/* Cover Upload */}
        <div className="text-center sm:text-left">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cover Photo
          </label>
          <AvatarUploader
            userId={businessId}
            value={data.cover_url}
            onChange={(url) => setData({ ...data, cover_url: url })}
            label="Upload Cover"
            size={120}
          />
          <p className="text-xs text-gray-500 mt-2">Recommended: 1920x480px</p>
        </div>
      </div>

      {/* Business Name and Handle - Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Business Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full px-3 py-2.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            value={data.display_name}
            onChange={(e) => setData({ ...data, display_name: e.target.value })}
            placeholder="Your Business Name"
            maxLength={100}
            style={{ fontSize: '16px' }} // Prevents zoom on iOS
          />
          <p className="text-xs text-gray-500 mt-1">
            {data.display_name.length}/100 characters
          </p>
        </div>

        {/* Handle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Handle <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                @
              </span>
              <input
                type="text"
                className={`flex-1 px-3 py-2.5 text-base sm:text-sm border rounded-r-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  !handleAvailable ? 'border-red-500' : 'border-gray-300'
                }`}
                value={data.handle}
                onChange={(e) => setData({ 
                  ...data, 
                  handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') 
                })}
                placeholder="your-business"
                maxLength={30}
                style={{ fontSize: '16px' }}
              />
            </div>
            {checkingHandle && (
              <p className="text-xs text-gray-500 mt-1">Checking availability...</p>
            )}
            {!checkingHandle && data.handle && (
              <p className={`text-xs mt-1 ${handleAvailable ? 'text-green-600' : 'text-red-600'}`}>
                {handleAvailable ? '✓ Available' : '✗ Already taken'}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              URL: mycentribe.com/business/{data.handle || 'your-handle'}
            </p>
          </div>
        </div>
      </div>

      {/* Tagline */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tagline
        </label>
        <input
          type="text"
          className="w-full px-3 py-2.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          value={data.tagline}
          onChange={(e) => setData({ ...data, tagline: e.target.value })}
          placeholder="Your inspiring tagline..."
          maxLength={150}
          style={{ fontSize: '16px' }}
        />
        <p className="text-xs text-gray-500 mt-1">
          {data.tagline.length}/150 characters - A short, memorable phrase about your business
        </p>
      </div>

      {/* Bio/Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          About Your Business
        </label>
        <textarea
          className="w-full px-3 py-2.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          rows={5}
          value={data.bio}
          onChange={(e) => setData({ ...data, bio: e.target.value })}
          placeholder="Tell people about your business, what makes you unique, your story..."
          maxLength={2000}
          style={{ fontSize: '16px' }}
        />
        <p className="text-xs text-gray-500 mt-1">
          {data.bio.length}/2000 characters
        </p>
      </div>

      {/* Categories - Mobile Optimized */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business Categories
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                const cats = data.categories || [];
                if (cats.includes(cat)) {
                  setData({ ...data, categories: cats.filter(c => c !== cat) });
                } else if (cats.length < 5) {
                  setData({ ...data, categories: [...cats, cat] });
                }
              }}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                (data.categories || []).includes(cat)
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Select up to 5 categories ({data.categories.length}/5 selected)
        </p>
      </div>

      {/* Languages - Mobile Optimized */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Languages Spoken
        </label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map(lang => (
            <button
              key={lang}
              type="button"
              onClick={() => {
                const langs = data.languages || [];
                if (langs.includes(lang)) {
                  setData({ ...data, languages: langs.filter(l => l !== lang) });
                } else {
                  setData({ ...data, languages: [...langs, lang] });
                }
              }}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                (data.languages || []).includes(lang)
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="max-w-xs">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Price Range
        </label>
        <select
          className="w-full px-3 py-2.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          value={data.price_range}
          onChange={(e) => setData({ ...data, price_range: e.target.value })}
          style={{ fontSize: '16px' }}
        >
          {PRICE_RANGES.map(range => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </select>
      </div>

      {/* Save Button - Sticky on Mobile */}
      <div className="flex justify-center sm:justify-end pt-4 border-t sticky bottom-0 bg-white pb-4 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 sm:static">
        <button
          onClick={save}
          disabled={saving || !data.display_name || !data.handle || !handleAvailable}
          className="w-full sm:w-auto px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-base transition-colors"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
              Saving...
            </span>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  );
}
