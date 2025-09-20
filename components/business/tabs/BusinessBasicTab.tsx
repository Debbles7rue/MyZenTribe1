// components/business/tabs/BusinessBasicTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AvatarUploader from '@/components/AvatarUploader';

const BUSINESS_CATEGORIES = [
  // Wellness & Healing
  'Reiki', 'Sound Bath', 'Meditation', 'Yoga', 'Breathwork',
  'Energy Work', 'Crystal Healing', 'Massage', 'Acupuncture',
  
  // Movement & Body
  'Qi Gong', 'Tai Chi', 'Dance', 'Fitness', 'Pilates',
  
  // Creative & Arts
  'Art Therapy', 'Music', 'Drum Circle', 'Creative Arts',
  
  // Coaching & Counseling
  'Life Coaching', 'Therapy', 'Counseling', 'Spiritual Guidance',
  
  // Education & Workshops
  'Workshops', 'Education', 'Training', 'Retreats',
  
  // Community & Events
  'Community', 'Events', 'Gatherings', 'Ceremonies',
  
  // Other Services
  'Nutrition', 'Holistic Health', 'Alternative Medicine', 'Other'
];

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 
  'Portuguese', 'Chinese', 'Japanese', 'Korean', 'Hindi',
  'Arabic', 'Russian', 'Dutch', 'Swedish', 'Polish'
];

export default function BusinessBasicTab({ businessId }: { businessId: string }) {
  const [data, setData] = useState({
    display_name: '',
    handle: '',
    tagline: '',
    logo_url: '',
    cover_url: '',
    bio: '',
    categories: [] as string[],
    languages: [] as string[],
    price_range: '$$',
    community_guidelines: '',
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
          logo_url: biz.logo_url || '',
          cover_url: biz.cover_url || '',
          bio: biz.bio || '',
          categories: biz.categories || [],
          languages: biz.languages || ['English'],
          price_range: biz.price_range || '$$',
          community_guidelines: biz.community_guidelines || '',
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
      .update({
        display_name: data.display_name,
        handle: data.handle,
        tagline: data.tagline,
        logo_url: data.logo_url,
        cover_url: data.cover_url,
        bio: data.bio,
        categories: data.categories,
        languages: data.languages,
        price_range: data.price_range,
        community_guidelines: data.community_guidelines,
      })
      .eq('id', businessId);
    
    if (error) {
      setMessage('❌ Error: ' + error.message);
    } else {
      setMessage('✨ Saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mx-auto"></div>
          <p className="mt-3 text-purple-600 font-medium">Loading your magic...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto -mt-6 -mx-6">
      {/* Beautiful Gradient Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 p-8 text-white">
        <h2 className="text-3xl font-bold">✨ Basic Information</h2>
        <p className="mt-2 text-purple-100">Make your business shine with a complete profile</p>
      </div>

      <div className="p-6">
        {/* Message Alert */}
        {message && (
          <div className={`
            p-4 rounded-xl mb-6 flex items-center gap-2 animate-fade-in shadow-lg
            ${message.includes('Error') 
              ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white' 
              : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
            }
          `}>
            {message}
          </div>
        )}

        {/* Main Form - Colorful Cards */}
        <div className="space-y-6">
          
          {/* Branding Card */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200 shadow-md">
            <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">🎨</span> Branding & Visuals
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="text-center">
                <p className="text-sm text-purple-700 font-medium mb-3">Business Logo</p>
                <div className="flex justify-center">
                  <div className="bg-white rounded-xl p-3 shadow-lg border-2 border-purple-200">
                    <AvatarUploader
                      userId={businessId}
                      value={data.logo_url}
                      onChange={(url) => setData({ ...data, logo_url: url })}
                      label="Upload Logo"
                      size={100}
                    />
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-purple-700 font-medium mb-3">Cover Photo</p>
                <div className="flex justify-center">
                  <div className="bg-white rounded-xl p-3 shadow-lg border-2 border-pink-200">
                    <AvatarUploader
                      userId={businessId}
                      value={data.cover_url}
                      onChange={(url) => setData({ ...data, cover_url: url })}
                      label="Upload Cover"
                      size={100}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Identity Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 shadow-md">
            <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">🏢</span> Business Identity
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-blue-800 mb-2">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all bg-white text-base"
                  style={{ fontSize: '16px' }}
                  value={data.display_name}
                  onChange={(e) => setData({ ...data, display_name: e.target.value })}
                  placeholder="Your Amazing Business"
                  maxLength={100}
                />
                <p className="text-xs text-blue-600 mt-1">
                  {data.display_name.length}/100 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-blue-800 mb-2">
                  Handle (URL) <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-4 rounded-l-xl border-2 border-r-0 border-blue-300 bg-blue-100 text-blue-700 font-medium">
                    @
                  </span>
                  <input
                    type="text"
                    className="flex-1 px-4 py-3 border-2 border-blue-300 rounded-r-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all bg-white text-base"
                    style={{ fontSize: '16px' }}
                    value={data.handle}
                    onChange={(e) => setData({ ...data, handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="your-business"
                  />
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  mysite.com/business/@{data.handle || 'your-business'}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-semibold text-blue-800 mb-2">
                Tagline
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all bg-white text-base"
                style={{ fontSize: '16px' }}
                value={data.tagline}
                onChange={(e) => setData({ ...data, tagline: e.target.value.slice(0, 150) })}
                placeholder="Your inspiring message or motto..."
                maxLength={150}
              />
              <p className="text-xs text-blue-600 mt-1">
                {data.tagline.length}/150 • Make it memorable!
              </p>
            </div>
          </div>

          {/* Story Card */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200 shadow-md">
            <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">📖</span> Your Story
            </h3>
            <textarea
              className="w-full px-4 py-3 border-2 border-green-300 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all bg-white text-base"
              style={{ fontSize: '16px' }}
              rows={6}
              value={data.bio}
              onChange={(e) => setData({ ...data, bio: e.target.value.slice(0, 2000) })}
              placeholder="Share your journey, what makes you special, your mission..."
              maxLength={2000}
            />
            <p className="text-xs text-green-600 mt-1">
              {data.bio.length}/2000 • Tell your authentic story
            </p>
          </div>

          {/* Categories Card - Custom Input */}
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-6 border border-amber-200 shadow-md">
            <h3 className="text-lg font-semibold text-amber-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">🏷️</span> Business Categories
              <span className="text-xs font-normal text-amber-600">
                (Add up to 5)
              </span>
            </h3>
            
            {/* Custom Category Input */}
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type your unique category and press Enter"
                  className="flex-1 px-4 py-3 border-2 border-amber-300 rounded-xl focus:ring-4 focus:ring-amber-200 focus:border-amber-500 transition-all bg-white text-base"
                  style={{ fontSize: '16px' }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.target as HTMLInputElement;
                      const value = input.value.trim();
                      if (value && data.categories.length < 5 && !data.categories.includes(value)) {
                        setData({ ...data, categories: [...data.categories, value] });
                        input.value = '';
                      }
                    }
                  }}
                  id="category-input"
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('category-input') as HTMLInputElement;
                    const value = input.value.trim();
                    if (value && data.categories.length < 5 && !data.categories.includes(value)) {
                      setData({ ...data, categories: [...data.categories, value] });
                      input.value = '';
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all font-semibold shadow-lg"
                  disabled={data.categories.length >= 5}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Selected Categories */}
            {data.categories.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {data.categories.map((cat, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-full shadow-md"
                    >
                      <span className="text-sm font-medium">{cat}</span>
                      <button
                        type="button"
                        onClick={() => setData({ ...data, categories: data.categories.filter(c => c !== cat) })}
                        className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-amber-600 mt-2 font-medium">
                  {data.categories.length}/5 categories selected
                </p>
              </div>
            )}

            {/* Suggestions */}
            <details className="cursor-pointer">
              <summary className="text-sm text-amber-700 hover:text-amber-900 transition-colors font-medium">
                💡 Need inspiration? See suggestions
              </summary>
              <div className="mt-3 p-4 bg-white/70 rounded-xl">
                <div className="flex flex-wrap gap-1">
                  {BUSINESS_CATEGORIES.filter(cat => !data.categories.includes(cat)).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        if (data.categories.length < 5) {
                          setData({ ...data, categories: [...data.categories, cat] });
                        }
                      }}
                      disabled={data.categories.length >= 5}
                      className="px-3 py-1.5 text-xs rounded-full bg-white hover:bg-amber-100 text-amber-700 border border-amber-300 transition-all"
                    >
                      + {cat}
                    </button>
                  ))}
                </div>
              </div>
            </details>
          </div>

          {/* Languages Card */}
          <div className="bg-gradient-to-br from-cyan-50 to-sky-50 rounded-2xl p-6 border border-cyan-200 shadow-md">
            <h3 className="text-lg font-semibold text-cyan-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">🌍</span> Languages Spoken
            </h3>
            
            <div className="mb-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add languages you speak..."
                  className="flex-1 px-4 py-3 border-2 border-cyan-300 rounded-xl focus:ring-4 focus:ring-cyan-200 focus:border-cyan-500 transition-all bg-white text-base"
                  style={{ fontSize: '16px' }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.target as HTMLInputElement;
                      const value = input.value.trim();
                      if (value && !data.languages.includes(value)) {
                        setData({ ...data, languages: [...data.languages, value] });
                        input.value = '';
                      }
                    }
                  }}
                  id="language-input"
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('language-input') as HTMLInputElement;
                    const value = input.value.trim();
                    if (value && !data.languages.includes(value)) {
                      setData({ ...data, languages: [...data.languages, value] });
                      input.value = '';
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all font-semibold shadow-lg"
                >
                  Add
                </button>
              </div>
            </div>

            {data.languages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.languages.map((lang, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-400 to-blue-400 text-white rounded-full shadow-md"
                  >
                    <span className="text-sm">{lang}</span>
                    <button
                      type="button"
                      onClick={() => setData({ ...data, languages: data.languages.filter(l => l !== lang) })}
                      className="hover:bg-white/20 rounded-full p-0.5 transition-colors text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Price Range Card */}
          <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-6 border border-rose-200 shadow-md">
            <h3 className="text-lg font-semibold text-rose-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">💰</span> Price Range
            </h3>
            <div className="flex gap-2">
              {['$', '$$', '$$$', '$$$$'].map(range => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setData({ ...data, price_range: range })}
                  className={`
                    px-6 py-4 rounded-xl font-bold text-lg transition-all flex-1 shadow-md
                    ${data.price_range === range
                      ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white transform scale-105'
                      : 'bg-white text-rose-600 hover:bg-rose-100 border-2 border-rose-200'
                    }
                  `}
                >
                  {range}
                </button>
              ))}
            </div>
            <div className="mt-3 text-xs text-rose-600 text-center">
              <span className="font-semibold">$ </span>Budget-friendly
              <span className="mx-2">•</span>
              <span className="font-semibold">$$ </span>Moderate
              <span className="mx-2">•</span>
              <span className="font-semibold">$$$ </span>Premium
              <span className="mx-2">•</span>
              <span className="font-semibold">$$$$ </span>Luxury
            </div>
          </div>

          {/* Community Guidelines Card */}
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-6 border border-violet-200 shadow-md">
            <h3 className="text-lg font-semibold text-violet-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">💜</span> Community Values & Offerings
            </h3>
            <textarea
              className="w-full px-4 py-3 border-2 border-violet-300 rounded-xl focus:ring-4 focus:ring-violet-200 focus:border-violet-500 transition-all bg-white text-base"
              style={{ fontSize: '16px' }}
              rows={4}
              value={data.community_guidelines}
              onChange={(e) => setData({ ...data, community_guidelines: e.target.value })}
              placeholder="Share your values, special offerings, what makes your space unique..."
              maxLength={1000}
            />
            <p className="text-xs text-violet-600 mt-1">
              {data.community_guidelines.length}/1000 • Create a welcoming atmosphere
            </p>
          </div>

        </div>

        {/* Save Button - Colorful */}
        <div className="mt-8 bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-6 border border-purple-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-purple-900">
                {data.display_name && data.handle 
                  ? '✅ Looking great! Ready to save' 
                  : '📝 Business name and handle required'}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Make sure everything looks perfect before saving
              </p>
            </div>
            <button
              onClick={save}
              disabled={saving || !data.display_name || !data.handle}
              className={`
                px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg
                ${saving || !data.display_name || !data.handle
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transform hover:scale-105'
                }
              `}
            >
              {saving ? '✨ Saving...' : '💫 Save Changes'}
            </button>
          </div>
        </div>

        {/* Fun Stats */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl p-4 text-white shadow-lg">
            <div className="text-3xl mb-2">👀</div>
            <div className="text-2xl font-bold">0</div>
            <div className="text-xs opacity-90">Profile Views</div>
          </div>
          <div className="bg-gradient-to-br from-pink-400 to-pink-600 rounded-xl p-4 text-white shadow-lg">
            <div className="text-3xl mb-2">❤️</div>
            <div className="text-2xl font-bold">0</div>
            <div className="text-xs opacity-90">Followers</div>
          </div>
          <div className="bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl p-4 text-white shadow-lg">
            <div className="text-3xl mb-2">⭐</div>
            <div className="text-2xl font-bold">N/A</div>
            <div className="text-xs opacity-90">Rating</div>
          </div>
          <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-xl p-4 text-white shadow-lg">
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-2xl font-bold">0%</div>
            <div className="text-xs opacity-90">Complete</div>
          </div>
        </div>
      </div>
    </div>
  );
}
