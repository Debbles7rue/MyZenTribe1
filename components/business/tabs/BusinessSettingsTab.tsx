// components/business/tabs/BusinessSettingsTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface TabConfig {
  details?: boolean;
  calendar?: boolean;
  hours?: boolean;
  services?: boolean;
  store?: boolean;
  gallery?: boolean;
  social?: boolean;
}

interface Props {
  businessId: string;
  enabledTabs?: TabConfig;
  onUpdateTabs?: (config: TabConfig) => void;
}

export default function BusinessSettingsTab({ businessId, enabledTabs, onUpdateTabs }: Props) {
  const [tabConfig, setTabConfig] = useState<TabConfig>(enabledTabs || {
    details: true,
    calendar: true,
    hours: true,
    services: true,
    store: false,
    gallery: true,
    social: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  // Business stats (read-only)
  const [stats, setStats] = useState({
    view_count: 0,
    rating_average: null as number | null,
    rating_count: 0,
    verified: false
  });

  // NEW: Communication Settings
  const [communicationSettings, setCommunicationSettings] = useState({
    business_allow_messages: true,
    business_allow_reviews: true,
    business_allow_posts: true,
    business_message_auto_reply: '',
    business_response_time: 'within_24h'
  });

  useEffect(() => {
    loadSettings();
  }, [businessId]);

  useEffect(() => {
    if (enabledTabs) {
      setTabConfig(enabledTabs);
    }
  }, [enabledTabs]);

  async function loadSettings() {
    try {
      // Load from business_profiles table
      const { data: bizData, error: bizError } = await supabase
        .from('business_profiles')
        .select('enabled_tabs, view_count, rating_average, rating_count, verified, visibility')
        .eq('id', businessId)
        .single();

      if (bizError) {
        console.error('Error loading business settings:', bizError);
      }

      // Load from profiles table for communication settings
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          business_allow_messages,
          business_allow_reviews,
          business_allow_posts,
          business_message_auto_reply,
          business_response_time
        `)
        .eq('id', businessId)
        .single();

      if (profileError) {
        console.error('Error loading profile settings:', profileError);
      }

      if (bizData) {
        if (bizData.enabled_tabs) {
          setTabConfig(bizData.enabled_tabs);
        }
        
        setStats({
          view_count: bizData.view_count || 0,
          rating_average: bizData.rating_average || null,
          rating_count: bizData.rating_count || 0,
          verified: bizData.verified || false
        });
        
        // If visibility field exists and is 'private', update it to 'public'
        if (bizData.visibility === 'private') {
          await supabase
            .from('business_profiles')
            .update({ visibility: 'public' })
            .eq('id', businessId);
        }
      }

      if (profileData) {
        setCommunicationSettings({
          business_allow_messages: profileData.business_allow_messages !== false,
          business_allow_reviews: profileData.business_allow_reviews !== false,
          business_allow_posts: profileData.business_allow_posts !== false,
          business_message_auto_reply: profileData.business_message_auto_reply || '',
          business_response_time: profileData.business_response_time || 'within_24h'
        });
      }
    } catch (err) {
      console.error('Unexpected error loading settings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    setMessage('');

    try {
      // Save to business_profiles table
      const updateData: any = {
        enabled_tabs: tabConfig,
        updated_at: new Date().toISOString()
      };

      // Always ensure visibility is public if the field exists
      const { data: checkData } = await supabase
        .from('business_profiles')
        .select('visibility')
        .eq('id', businessId)
        .single();
      
      if (checkData && 'visibility' in checkData) {
        updateData.visibility = 'public';
      }

      const { error: bizError } = await supabase
        .from('business_profiles')
        .update(updateData)
        .eq('id', businessId);

      if (bizError) {
        console.error('Save error:', bizError);
        setMessage('Error saving settings');
        return;
      }

      // Save communication settings to profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          business_allow_messages: communicationSettings.business_allow_messages,
          business_allow_reviews: communicationSettings.business_allow_reviews,
          business_allow_posts: communicationSettings.business_allow_posts,
          business_message_auto_reply: communicationSettings.business_message_auto_reply,
          business_response_time: communicationSettings.business_response_time
        })
        .eq('id', businessId);

      if (profileError) {
        console.error('Profile save error:', profileError);
        setMessage('Error saving communication settings');
        return;
      }

      setMessage('Settings saved successfully! ✨');
      
      if (onUpdateTabs) {
        onUpdateTabs(tabConfig);
      }
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Unexpected save error:', err);
      setMessage('Unexpected error occurred');
    } finally {
      setSaving(false);
    }
  }

  const handleTabToggle = (tabId: keyof TabConfig) => {
    const newConfig = { ...tabConfig, [tabId]: !tabConfig[tabId] };
    setTabConfig(newConfig);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="space-y-3">
          <div className="h-12 bg-gray-100 rounded"></div>
          <div className="h-12 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  const tabOptions = [
    { id: 'details' as keyof TabConfig, label: 'Details', icon: '📋', description: 'Contact info, services, and hours' },
    { id: 'calendar' as keyof TabConfig, label: 'Calendar', icon: '📅', description: 'Events and appointment booking' },
    { id: 'gallery' as keyof TabConfig, label: 'Gallery', icon: '📸', description: 'Showcase photos of your work' },
    { id: 'store' as keyof TabConfig, label: 'Store', icon: '🛍️', description: 'Sell products online' },
    { id: 'social' as keyof TabConfig, label: 'Social Links', icon: '🔗', description: 'Connect your social media', hidden: true },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Status Banner - Always Public */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌍</span>
          <div>
            <h3 className="font-semibold text-green-900">Public Business Profile</h3>
            <p className="text-sm text-green-700 mt-0.5">
              Your business is visible to everyone and can be found in search
            </p>
          </div>
        </div>
      </div>

      {/* NEW: Communication Settings Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">Communication Settings</h3>
          <p className="text-sm text-gray-600">Control how customers can interact with your business</p>
        </div>

        <div className="space-y-3">
          {/* Allow Messages Toggle */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
            <label className="flex items-start justify-between cursor-pointer">
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">💬</span>
                <div className="flex-1">
                  <div className="font-semibold text-blue-900">Allow Direct Messages</div>
                  <p className="text-sm text-blue-700 mt-1">
                    Let customers message you directly from your profile
                  </p>
                </div>
              </div>
              
              <div className="relative">
                <input
                  type="checkbox"
                  checked={communicationSettings.business_allow_messages}
                  onChange={(e) => setCommunicationSettings({
                    ...communicationSettings,
                    business_allow_messages: e.target.checked
                  })}
                  className="sr-only"
                />
                <div className={`
                  w-12 h-6 rounded-full transition-colors duration-200
                  ${communicationSettings.business_allow_messages ? 'bg-blue-600' : 'bg-gray-300'}
                `}>
                  <div className={`
                    w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200
                    transform ${communicationSettings.business_allow_messages ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5
                  `} />
                </div>
              </div>
            </label>

            {/* Auto-Reply Message - Shows when messages are enabled */}
            {communicationSettings.business_allow_messages && (
              <div className="mt-4 space-y-2">
                <label className="block text-sm font-medium text-blue-800">
                  Auto-Reply Message (Optional)
                </label>
                <textarea
                  className="w-full px-3 py-2 text-base border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  value={communicationSettings.business_message_auto_reply}
                  onChange={(e) => setCommunicationSettings({
                    ...communicationSettings,
                    business_message_auto_reply: e.target.value
                  })}
                  placeholder="Thanks for reaching out! I typically respond within 24 hours..."
                  style={{ fontSize: '16px' }}
                />
                
                <div className="mt-2">
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Typical Response Time
                  </label>
                  <select
                    className="w-full px-3 py-2 text-base border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={communicationSettings.business_response_time}
                    onChange={(e) => setCommunicationSettings({
                      ...communicationSettings,
                      business_response_time: e.target.value
                    })}
                    style={{ fontSize: '16px', minHeight: '44px' }}
                  >
                    <option value="within_1h">Within 1 hour</option>
                    <option value="within_24h">Within 24 hours</option>
                    <option value="within_2d">Within 2 days</option>
                    <option value="within_week">Within a week</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Allow Reviews Toggle */}
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4">
            <label className="flex items-start justify-between cursor-pointer">
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">⭐</span>
                <div className="flex-1">
                  <div className="font-semibold text-amber-900">Allow Reviews</div>
                  <p className="text-sm text-amber-700 mt-1">
                    Let customers leave reviews and ratings
                  </p>
                </div>
              </div>
              
              <div className="relative">
                <input
                  type="checkbox"
                  checked={communicationSettings.business_allow_reviews}
                  onChange={(e) => setCommunicationSettings({
                    ...communicationSettings,
                    business_allow_reviews: e.target.checked
                  })}
                  className="sr-only"
                />
                <div className={`
                  w-12 h-6 rounded-full transition-colors duration-200
                  ${communicationSettings.business_allow_reviews ? 'bg-amber-600' : 'bg-gray-300'}
                `}>
                  <div className={`
                    w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200
                    transform ${communicationSettings.business_allow_reviews ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5
                  `} />
                </div>
              </div>
            </label>
          </div>

          {/* Allow Posts Toggle */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
            <label className="flex items-start justify-between cursor-pointer">
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">📝</span>
                <div className="flex-1">
                  <div className="font-semibold text-purple-900">Business Posts</div>
                  <p className="text-sm text-purple-700 mt-1">
                    Share updates and photos from your business profile
                  </p>
                </div>
              </div>
              
              <div className="relative">
                <input
                  type="checkbox"
                  checked={communicationSettings.business_allow_posts}
                  onChange={(e) => setCommunicationSettings({
                    ...communicationSettings,
                    business_allow_posts: e.target.checked
                  })}
                  className="sr-only"
                />
                <div className={`
                  w-12 h-6 rounded-full transition-colors duration-200
                  ${communicationSettings.business_allow_posts ? 'bg-purple-600' : 'bg-gray-300'}
                `}>
                  <div className={`
                    w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200
                    transform ${communicationSettings.business_allow_posts ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5
                  `} />
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Tab Management Section - KEPT ORIGINAL */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">Customize Your Profile Tabs</h3>
          <p className="text-sm text-gray-600">Choose which sections to show on your business profile</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Basic Info and Settings tabs are always visible and cannot be disabled.
          </p>
        </div>

        <div className="space-y-2">
          {tabOptions.filter(tab => !tab.hidden).map(tab => (
            <div 
              key={tab.id}
              className="border rounded-lg p-4 bg-white hover:shadow-sm transition-all"
            >
              <label className="flex items-start justify-between cursor-pointer">
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{tab.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium">{tab.label}</div>
                    <p className="text-sm text-gray-600 mt-0.5">{tab.description}</p>
                  </div>
                </div>
                
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={tabConfig[tab.id] ?? false}
                    onChange={() => handleTabToggle(tab.id)}
                    className="sr-only"
                  />
                  <div className={`
                    w-12 h-6 rounded-full transition-colors duration-200
                    ${tabConfig[tab.id] ? 'bg-purple-600' : 'bg-gray-300'}
                  `}>
                    <div className={`
                      w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200
                      transform ${tabConfig[tab.id] ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5
                    `} />
                  </div>
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Analytics Section - KEPT ORIGINAL */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Profile Analytics</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-700">
              {stats.view_count}
            </div>
            <div className="text-sm text-purple-600 mt-1">Profile Views</div>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-amber-700">
              {stats.rating_average ? `${stats.rating_average.toFixed(1)}⭐` : 'N/A'}
            </div>
            <div className="text-sm text-amber-600 mt-1">Average Rating</div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">
              {stats.rating_count}
            </div>
            <div className="text-sm text-blue-600 mt-1">Total Reviews</div>
          </div>
        </div>

        {stats.verified && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <div className="font-semibold text-green-900">Verified Business</div>
              <div className="text-sm text-green-700">Your business has been verified by MyZenTribe</div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button - KEPT ORIGINAL WITH MOBILE OPTIMIZATION */}
      <div className="pt-4 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {message && (
          <div className={`
            px-3 py-2 rounded-lg text-sm font-medium text-center sm:text-left
            ${message.includes('Error') || message.includes('error') 
              ? 'bg-red-100 text-red-700' 
              : 'bg-green-100 text-green-700'}
          `}>
            {message}
          </div>
        )}
        
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors min-h-[48px] touch-manipulation"
          style={{ fontSize: '16px' }}
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
              Saving...
            </span>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>
    </div>
  );
}
