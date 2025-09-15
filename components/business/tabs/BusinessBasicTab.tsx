// components/business/tabs/BusinessBasicTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AvatarUploader from '@/components/AvatarUploader';

export default function BusinessBasicTab({ businessId }: { businessId: string }) {
  const [data, setData] = useState({
    display_name: '',
    handle: '',
    tagline: '',
    logo_url: '',
    cover_url: '',
    bio: '',
    categories: [] as string[],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      const { data: biz } = await supabase
        .from('business_profiles')
        .select('display_name, handle, tagline, logo_url, cover_url, bio, categories')
        .eq('id', businessId)
        .single();
      
      if (biz) {
        setData({
          display_name: biz.display_name || '',
          handle: biz.handle || '',
          tagline: biz.tagline || '',
          logo_url: biz.logo_url || '',
          cover_url: biz.cover_url || '',
          bio: biz.bio || '',
          categories: biz.categories || [],
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
        <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
        {message && (
          <div className={`p-3 rounded-lg mb-4 ${
            message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Logo Upload - Mobile Centered */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
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
        </div>

        <div className="flex-1 w-full space-y-4">
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
              style={{ fontSize: '16px' }} // Prevents zoom on iOS
            />
          </div>

          {/* Handle - Mobile Friendly */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Handle (your unique @name)
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                @
              </span>
              <input
                type="text"
                className="flex-1 px-3 py-2.5 text-base sm:text-sm border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={data.handle}
                onChange={(e) => setData({ ...data, handle: e.target.value.replace('@', '') })}
                placeholder="your-business"
                style={{ fontSize: '16px' }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              URL: mysite.com/business/@{data.handle || 'your-business'}
            </p>
          </div>
        </div>
      </div>

      {/* Tagline */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tagline (1-80 characters)
        </label>
        <input
          type="text"
          className="w-full px-3 py-2.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          value={data.tagline}
          onChange={(e) => setData({ ...data, tagline: e.target.value.slice(0, 80) })}
          placeholder="Your inspiring message"
          maxLength={80}
          style={{ fontSize: '16px' }}
        />
        <p className="text-xs text-gray-500 mt-1">{data.tagline.length}/80</p>
      </div>

      {/* Description - Mobile Optimized Textarea */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          About Your Business
        </label>
        <textarea
          className="w-full px-3 py-2.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          rows={5}
          value={data.bio}
          onChange={(e) => setData({ ...data, bio: e.target.value })}
          placeholder="Tell people what you offer, your specialties, your story..."
          style={{ fontSize: '16px' }}
        />
      </div>

      {/* Categories - Touch Friendly */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Categories
        </label>
        <div className="flex flex-wrap gap-2">
          {['Wellness', 'Healing', 'Events', 'Education', 'Arts', 'Community'].map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                if (data.categories.includes(cat)) {
                  setData({ ...data, categories: data.categories.filter(c => c !== cat) });
                } else {
                  setData({ ...data, categories: [...data.categories, cat] });
                }
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all
                ${data.categories.includes(cat)
                  ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                  : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                }
                min-h-[44px] min-w-[80px] touch-manipulation
              `}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Save Button - Mobile Sticky */}
      <div className="flex justify-center sm:justify-end pt-4 border-t">
        <button
          onClick={save}
          disabled={saving || !data.display_name}
          className="w-full sm:w-auto px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium text-base touch-manipulation min-h-[48px]"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
