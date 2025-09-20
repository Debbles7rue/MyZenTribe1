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

interface SectionConfig {
  branding?: boolean;
  identity?: boolean;
  story?: boolean;
  categories?: boolean;
  values?: boolean;
}

export default function BusinessBasicTab({ businessId }: { businessId: string }) {
  const [data, setData] = useState({
    display_name: '',
    handle: '',
    tagline: '',
    logo_url: '',
    cover_url: '',
    bio: '',
    categories: [] as string[],
    community_guidelines: '',
  });
  
  const [sectionConfig, setSectionConfig] = useState<SectionConfig>({
    branding: true,
    identity: true,
    story: true,
    categories: true,
    values: true,
  });

  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [sectionMessages, setSectionMessages] = useState<Record<string, string>>({});

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
          community_guidelines: biz.community_guidelines || '',
        });
        
        // Load section config if stored
        if (biz.section_config) {
          setSectionConfig(biz.section_config);
        }
      }
      setLoading(false);
    }
    load();
  }, [businessId]);

  async function saveSection(sectionName: string, fields: string[]) {
    setSavingSection(sectionName);
    setSectionMessages({});
    
    // Build update object with only specified fields
    const updateObj: any = { updated_at: new Date().toISOString() };
    fields.forEach(field => {
      updateObj[field] = data[field as keyof typeof data];
    });
    
    const { error } = await supabase
      .from('business_profiles')
      .update(updateObj)
      .eq('id', businessId);
    
    if (error) {
      setSectionMessages({ [sectionName]: '❌ Error saving' });
    } else {
      setSectionMessages({ [sectionName]: '✅ Saved!' });
      setTimeout(() => setSectionMessages({}), 3000);
    }
    setSavingSection(null);
  }

  async function toggleSection(section: keyof SectionConfig) {
    const newConfig = { ...sectionConfig, [section]: !sectionConfig[section] };
    setSectionConfig(newConfig);
    
    // Save config to database
    await supabase
      .from('business_profiles')
      .update({ section_config: newConfig })
      .eq('id', businessId);
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Branding Card */}
      <div className={`bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-200 shadow-md transition-all ${!sectionConfig.branding ? 'opacity-60' : ''}`}>
        <div className="p-4 border-b border-purple-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
            <span className="text-2xl">🎨</span> Branding & Visuals
          </h3>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-purple-700">Enable</span>
              <input
                type="checkbox"
                checked={sectionConfig.branding}
                onChange={() => toggleSection('branding')}
                className="w-5 h-5 text-purple-600 rounded"
              />
            </label>
            {sectionMessages.branding && (
              <span className="text-sm font-medium">{sectionMessages.branding}</span>
            )}
          </div>
        </div>
        
        {sectionConfig.branding && (
          <div className="p-6">
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
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => saveSection('branding', ['logo_url', 'cover_url'])}
                disabled={savingSection === 'branding'}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
              >
                {savingSection === 'branding' ? 'Saving...' : 'Save Branding'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Identity Card */}
      <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 shadow-md transition-all ${!sectionConfig.identity ? 'opacity-60' : ''}`}>
        <div className="p-4 border-b border-blue-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
            <span className="text-2xl">🏢</span> Business Identity
          </h3>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-blue-700">Enable</span>
              <input
                type="checkbox"
                checked={sectionConfig.identity}
                onChange={() => toggleSection('identity')}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </label>
            {sectionMessages.identity && (
              <span className="text-sm font-medium">{sectionMessages.identity}</span>
            )}
          </div>
        </div>
        
        {sectionConfig.identity && (
          <div className="p-6">
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
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => saveSection('identity', ['display_name', 'handle', 'tagline'])}
                disabled={savingSection === 'identity' || !data.display_name || !data.handle}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {savingSection === 'identity' ? 'Saving...' : 'Save Identity'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Story Card */}
      <div className={`bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 shadow-md transition-all ${!sectionConfig.story ? 'opacity-60' : ''}`}>
        <div className="p-4 border-b border-green-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-green-900 flex items-center gap-2">
            <span className="text-2xl">📖</span> Your Story
          </h3>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-green-700">Enable</span>
              <input
                type="checkbox"
                checked={sectionConfig.story}
                onChange={() => toggleSection('story')}
                className="w-5 h-5 text-green-600 rounded"
              />
            </label>
            {sectionMessages.story && (
              <span className="text-sm font-medium">{sectionMessages.story}</span>
            )}
          </div>
        </div>
        
        {sectionConfig.story && (
          <div className="p-6">
            <textarea
              className="w-full px-4 py-3 border-2 border-green-300 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all bg-white text-base"
              style={{ fontSize: '16px' }}
              rows={6}
              value={data.bio}
              onChange={(e) => setData({ ...data, bio: e.target.value.slice(0, 2000) })}
              placeholder="Share your journey, what makes you special, your mission..."
              maxLength={2000}
            />
            <div className="mt-2 flex justify-between items-center">
              <p className="text-xs text-green-600">
                {data.bio.length}/2000 • Tell your authentic story
              </p>
              <button
                onClick={() => saveSection('story', ['bio'])}
                disabled={savingSection === 'story'}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
              >
                {savingSection === 'story' ? 'Saving...' : 'Save Story'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Categories Card */}
      <div className={`bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl border border-amber-200 shadow-md transition-all ${!sectionConfig.categories ? 'opacity-60' : ''}`}>
        <div className="p-4 border-b border-amber-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-amber-900 flex items-center gap-2">
            <span className="text-2xl">🏷️</span> Business Categories
            <span className="text-xs font-normal text-amber-600">(Add up to 5)</span>
          </h3>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-amber-700">Enable</span>
              <input
                type="checkbox"
                checked={sectionConfig.categories}
                onChange={() => toggleSection('categories')}
                className="w-5 h-5 text-amber-600 rounded"
              />
            </label>
            {sectionMessages.categories && (
              <span className="text-sm font-medium">{sectionMessages.categories}</span>
            )}
          </div>
        </div>
        
        {sectionConfig.categories && (
          <div className="p-6">
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
            <details className="cursor-pointer mb-4">
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
            
            <div className="flex justify-end">
              <button
                onClick={() => saveSection('categories', ['categories'])}
                disabled={savingSection === 'categories'}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm font-medium"
              >
                {savingSection === 'categories' ? 'Saving...' : 'Save Categories'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Community Values Card */}
      <div className={`bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-200 shadow-md transition-all ${!sectionConfig.values ? 'opacity-60' : ''}`}>
        <div className="p-4 border-b border-violet-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-violet-900 flex items-center gap-2">
            <span className="text-2xl">💜</span> Community Values & Offerings
          </h3>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-violet-700">Enable</span>
              <input
                type="checkbox"
                checked={sectionConfig.values}
                onChange={() => toggleSection('values')}
                className="w-5 h-5 text-violet-600 rounded"
              />
            </label>
            {sectionMessages.values && (
              <span className="text-sm font-medium">{sectionMessages.values}</span>
            )}
          </div>
        </div>
        
        {sectionConfig.values && (
          <div className="p-6">
            <textarea
              className="w-full px-4 py-3 border-2 border-violet-300 rounded-xl focus:ring-4 focus:ring-violet-200 focus:border-violet-500 transition-all bg-white text-base"
              style={{ fontSize: '16px' }}
              rows={4}
              value={data.community_guidelines}
              onChange={(e) => setData({ ...data, community_guidelines: e.target.value })}
              placeholder="Share your values, special offerings, what makes your space unique..."
              maxLength={1000}
            />
            <div className="mt-2 flex justify-between items-center">
              <p className="text-xs text-violet-600">
                {data.community_guidelines.length}/1000 • Create a welcoming atmosphere
              </p>
              <button
                onClick={() => saveSection('values', ['community_guidelines'])}
                disabled={savingSection === 'values'}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 text-sm font-medium"
              >
                {savingSection === 'values' ? 'Saving...' : 'Save Values'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fun Stats - Always Visible */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
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
  );
}
