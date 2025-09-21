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
      const { data, error } = await supabase
        .from('business_profiles')
        .select('enabled_tabs, view_count, rating_average, rating_count, verified, visibility')
        .eq('id', businessId)
        .single();

      if (error) {
        console.error('Error loading settings:', error);
        // Don't show error to user if fields don't exist
      }

      if (data) {
        if (data.enabled_tabs) {
          setTabConfig(data.enabled_tabs);
        }
        
        setStats({
          view_count: data.view_count || 0,
          rating_average: data.rating_average || null,
          rating_count: data.rating_count || 0,
          verified: data.verified || false
        });
        
        // If visibility field exists and is 'private', update it to 'public'
        if (data.visibility === 'private') {
          await supabase
            .from('business_profiles')
            .update({ visibility: 'public' })
            .eq('id', businessId);
        }
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
      // Only save fields we know exist
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

      const { error } = await supabase
        .from('business_profiles')
        .update(updateData)
        .eq('id', businessId);

      if (error) {
        console.error('Save error:', error);
        setMessage('Error saving settings');
      } else {
        setMessage('Settings saved successfully! ✨');
        
        if (onUpdateTabs) {
          onUpdateTabs(tabConfig);
        }
        
        setTimeout(() => setMessage(''), 3000);
      }
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

      {/* Tab Management Section */}
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

      {/* Analytics Section - Read Only */}
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

      {/* Save Button - Mobile Optimized */}
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
