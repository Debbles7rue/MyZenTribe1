// components/business/tabs/BusinessSettingsTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface TabConfig {
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

interface Settings {
  visibility: 'public' | 'private' | 'unlisted';
  discoverable: boolean;
  allow_messages: boolean;
  allow_reviews: boolean;
  notification_email?: string;
  notification_preferences?: {
    new_message?: boolean;
    new_review?: boolean;
    new_follower?: boolean;
  };
}

export default function BusinessSettingsTab({ businessId, enabledTabs, onUpdateTabs }: Props) {
  const [settings, setSettings] = useState<Settings>({
    visibility: 'public',
    discoverable: true,
    allow_messages: true,
    allow_reviews: true,
    notification_preferences: {
      new_message: true,
      new_review: true,
      new_follower: true,
    }
  });
  
  const [tabConfig, setTabConfig] = useState<TabConfig>(enabledTabs || {
    hours: true,
    services: true,
    store: false,
    gallery: true,
    social: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, [businessId]);

  useEffect(() => {
    if (enabledTabs) {
      setTabConfig(enabledTabs);
    }
  }, [enabledTabs]);

  async function loadSettings() {
    const { data, error } = await supabase
      .from('business_profiles')
      .select('visibility, discoverable, allow_messages, allow_reviews, notification_email, notification_preferences, enabled_tabs')
      .eq('id', businessId)
      .single();

    if (data) {
      setSettings({
        visibility: data.visibility || 'public',
        discoverable: data.discoverable ?? true,
        allow_messages: data.allow_messages ?? true,
        allow_reviews: data.allow_reviews ?? true,
        notification_email: data.notification_email,
        notification_preferences: data.notification_preferences || {
          new_message: true,
          new_review: true,
          new_follower: true,
        }
      });
      
      if (data.enabled_tabs) {
        setTabConfig(data.enabled_tabs);
      }
    }
    setLoading(false);
  }

  async function saveSettings() {
    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('business_profiles')
      .update({
        ...settings,
        enabled_tabs: tabConfig,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId);

    if (error) {
      setMessage('Error saving settings');
    } else {
      setMessage('Settings saved successfully!');
      if (onUpdateTabs) {
        onUpdateTabs(tabConfig);
      }
      setTimeout(() => setMessage(''), 3000);
    }
    setSaving(false);
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
    { id: 'hours' as keyof TabConfig, label: 'Business Hours', icon: '🕐', description: 'Show when you\'re open' },
    { id: 'services' as keyof TabConfig, label: 'Services', icon: '💼', description: 'List your services and offerings' },
    { id: 'gallery' as keyof TabConfig, label: 'Gallery', icon: '📸', description: 'Showcase photos of your work' },
    { id: 'social' as keyof TabConfig, label: 'Social Links', icon: '🔗', description: 'Connect your social media' },
    { id: 'store' as keyof TabConfig, label: 'Store', icon: '🛍️', description: 'Sell products online', comingSoon: true },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Tab Management Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">Customize Your Tabs</h3>
          <p className="text-sm text-gray-600">Choose which sections to show on your business profile</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Basic Info, Contact, and Settings tabs are always visible and cannot be disabled.
          </p>
        </div>

        <div className="space-y-2">
          {tabOptions.map(tab => (
            <div 
              key={tab.id}
              className={`
                border rounded-lg p-4 transition-all
                ${tab.comingSoon ? 'opacity-60 bg-gray-50' : 'bg-white hover:shadow-sm'}
              `}
            >
              <label className="flex items-start justify-between cursor-pointer">
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{tab.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tab.label}</span>
                      {tab.comingSoon && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{tab.description}</p>
                  </div>
                </div>
                
                {!tab.comingSoon ? (
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={tabConfig[tab.id] ?? false}
                      onChange={() => handleTabToggle(tab.id)}
                      className="sr-only"
                    />
                    <div className={`
                      w-12 h-6 rounded-full transition-colors duration-200 ease-in-out
                      ${tabConfig[tab.id] ? 'bg-purple-600' : 'bg-gray-300'}
                    `}>
                      <div className={`
                        w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out
                        transform ${tabConfig[tab.id] ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5
                      `} />
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </label>
            </div>
          ))}
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Profile Visibility Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Profile Visibility</h3>
        
        <div className="space-y-3">
          <div className="grid gap-3">
            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={settings.visibility === 'public'}
                onChange={(e) => setSettings({ ...settings, visibility: 'public' })}
                className="mt-1 text-purple-600"
              />
              <div>
                <div className="font-medium">Public</div>
                <div className="text-sm text-gray-600">Anyone can view your profile</div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="visibility"
                value="unlisted"
                checked={settings.visibility === 'unlisted'}
                onChange={(e) => setSettings({ ...settings, visibility: 'unlisted' })}
                className="mt-1 text-purple-600"
              />
              <div>
                <div className="font-medium">Unlisted</div>
                <div className="text-sm text-gray-600">Only people with the link can view</div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={settings.visibility === 'private'}
                onChange={(e) => setSettings({ ...settings, visibility: 'private' })}
                className="mt-1 text-purple-600"
              />
              <div>
                <div className="font-medium">Private</div>
                <div className="text-sm text-gray-600">Hidden from everyone</div>
              </div>
            </label>
          </div>
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Discovery & Interaction Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Discovery & Interactions</h3>
        
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
            <div>
              <div className="font-medium">Appear in search results</div>
              <div className="text-sm text-gray-600">Let people find you through search</div>
            </div>
            <input
              type="checkbox"
              checked={settings.discoverable}
              onChange={(e) => setSettings({ ...settings, discoverable: e.target.checked })}
              className="w-5 h-5 text-purple-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
            <div>
              <div className="font-medium">Allow messages</div>
              <div className="text-sm text-gray-600">Customers can contact you directly</div>
            </div>
            <input
              type="checkbox"
              checked={settings.allow_messages}
              onChange={(e) => setSettings({ ...settings, allow_messages: e.target.checked })}
              className="w-5 h-5 text-purple-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
            <div>
              <div className="font-medium">Allow reviews</div>
              <div className="text-sm text-gray-600">Customers can leave reviews</div>
            </div>
            <input
              type="checkbox"
              checked={settings.allow_reviews}
              onChange={(e) => setSettings({ ...settings, allow_reviews: e.target.checked })}
              className="w-5 h-5 text-purple-600 rounded"
            />
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-4 border-t flex items-center justify-between">
        {message && (
          <div className={`
            px-3 py-2 rounded-lg text-sm font-medium
            ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}
          `}>
            {message}
          </div>
        )}
        
        <button
          onClick={saveSettings}
          disabled={saving}
          className="ml-auto px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
