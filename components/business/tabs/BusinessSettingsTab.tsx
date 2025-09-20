// components/business/tabs/BusinessSettingsTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Settings {
  visibility: 'public' | 'private' | 'unlisted';
  discoverable: boolean;
  allow_messages: boolean;
  allow_reviews: boolean;
  allow_collaboration: boolean;
  verified: boolean;
  rating_average?: number;
  rating_count?: number;
  view_count?: number;
}

interface Props {
  businessId: string;
  enabledTabs?: Record<string, boolean>;
  onUpdateEnabledTabs?: (tabs: Record<string, boolean>) => void;
}

const TAB_INFO = [
  { 
    id: 'contact', 
    label: 'Contact Information', 
    icon: '📞',
    description: 'Phone, email, website, and location details'
  },
  { 
    id: 'hours', 
    label: 'Business Hours', 
    icon: '🕐',
    description: 'Operating hours and special schedules'
  },
  { 
    id: 'services', 
    label: 'Services', 
    icon: '💼',
    description: 'List of services you offer'
  },
  { 
    id: 'store', 
    label: 'Product Showcase', 
    icon: '🛍️',
    description: 'External product links (Etsy, Amazon, etc.)'
  },
  { 
    id: 'gallery', 
    label: 'Photo Gallery', 
    icon: '📸',
    description: 'Showcase your work with images'
  },
  { 
    id: 'social', 
    label: 'Social Media', 
    icon: '🔗',
    description: 'Links to your social media profiles'
  },
];

export default function BusinessSettingsTab({ 
  businessId, 
  enabledTabs = {
    contact: true,
    hours: false,
    services: false,
    store: false,
    gallery: true,
    social: true,
  },
  onUpdateEnabledTabs 
}: Props) {
  const [settings, setSettings] = useState<Settings>({
    visibility: 'public',
    discoverable: true,
    allow_messages: true,
    allow_reviews: true,
    allow_collaboration: false,
    verified: false,
  });
  const [localEnabledTabs, setLocalEnabledTabs] = useState(enabledTabs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      const { data: biz } = await supabase
        .from('business_profiles')
        .select('visibility, discoverable, allow_messages, allow_reviews, allow_collaboration, verified, rating_average, rating_count, view_count, enabled_tabs')
        .eq('id', businessId)
        .single();
      
      if (biz) {
        setSettings({
          visibility: biz.visibility || 'public',
          discoverable: biz.discoverable !== false,
          allow_messages: biz.allow_messages !== false,
          allow_reviews: biz.allow_reviews !== false,
          allow_collaboration: biz.allow_collaboration || false,
          verified: biz.verified || false,
          rating_average: biz.rating_average,
          rating_count: biz.rating_count,
          view_count: biz.view_count,
        });
        
        if (biz.enabled_tabs) {
          setLocalEnabledTabs(biz.enabled_tabs);
        }
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
        visibility: settings.visibility,
        discoverable: settings.discoverable,
        allow_messages: settings.allow_messages,
        allow_reviews: settings.allow_reviews,
        allow_collaboration: settings.allow_collaboration,
        enabled_tabs: localEnabledTabs,
      })
      .eq('id', businessId);
    
    if (error) {
      setMessage('❌ Error: ' + error.message);
    } else {
      setMessage('✅ Settings saved!');
      if (onUpdateEnabledTabs) {
        onUpdateEnabledTabs(localEnabledTabs);
      }
      setTimeout(() => setMessage(''), 3000);
    }
    setSaving(false);
  }

  function toggleTab(tabId: string) {
    const newTabs = { ...localEnabledTabs, [tabId]: !localEnabledTabs[tabId] };
    setLocalEnabledTabs(newTabs);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mx-auto"></div>
          <p className="mt-3 text-purple-600 font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto -mt-6 -mx-6">
      {/* Colorful Header */}
      <div className="bg-gradient-to-r from-gray-600 to-gray-800 p-8 text-white">
        <h2 className="text-3xl font-bold">⚙️ Settings & Privacy</h2>
        <p className="mt-2 text-gray-300">Configure your profile visibility and features</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Message */}
        {message && (
          <div className={`
            p-4 rounded-xl flex items-center gap-2 animate-fade-in shadow-lg
            ${message.includes('Error') 
              ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white' 
              : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
            }
          `}>
            {message}
          </div>
        )}

        {/* Tab Management - NEW */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-200 shadow-md">
          <h3 className="text-lg font-bold text-indigo-900 mb-2">
            📑 Manage Profile Tabs
          </h3>
          <p className="text-sm text-indigo-600 mb-4">
            Choose which tabs appear on your business profile
          </p>
          
          <div className="space-y-3">
            {TAB_INFO.map(tab => (
              <label 
                key={tab.id}
                className="flex items-center justify-between p-4 bg-white rounded-xl cursor-pointer hover:bg-indigo-50 transition-colors border border-indigo-100"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{tab.icon}</span>
                  <div>
                    <div className="font-semibold text-gray-800">{tab.label}</div>
                    <div className="text-sm text-gray-600">{tab.description}</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localEnabledTabs[tab.id] || false}
                    onChange={() => toggleTab(tab.id)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-purple-500"></div>
                </label>
              </label>
            ))}
          </div>
          <p className="text-xs text-indigo-600 mt-4">
            💡 Tip: Disable tabs you don't need to keep your profile simple
          </p>
        </div>

        {/* Profile Visibility */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200 shadow-md">
          <h3 className="text-lg font-bold text-blue-900 mb-4">
            👁️ Profile Visibility
          </h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-white rounded-xl cursor-pointer hover:bg-blue-50 transition-colors">
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={settings.visibility === 'public'}
                onChange={(e) => setSettings({ ...settings, visibility: 'public' })}
                className="text-purple-600"
              />
              <div>
                <div className="font-semibold">Public</div>
                <div className="text-sm text-gray-600">Anyone can find and view your profile</div>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 bg-white rounded-xl cursor-pointer hover:bg-blue-50 transition-colors">
              <input
                type="radio"
                name="visibility"
                value="unlisted"
                checked={settings.visibility === 'unlisted'}
                onChange={(e) => setSettings({ ...settings, visibility: 'unlisted' })}
                className="text-purple-600"
              />
              <div>
                <div className="font-semibold">Unlisted</div>
                <div className="text-sm text-gray-600">Only people with the link can view</div>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 bg-white rounded-xl cursor-pointer hover:bg-blue-50 transition-colors">
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={settings.visibility === 'private'}
                onChange={(e) => setSettings({ ...settings, visibility: 'private' })}
                className="text-purple-600"
              />
              <div>
                <div className="font-semibold">Private</div>
                <div className="text-sm text-gray-600">Hidden from everyone</div>
              </div>
            </label>
          </div>
        </div>

        {/* Interaction Settings */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200 shadow-md">
          <h3 className="text-lg font-bold text-green-900 mb-4">
            💬 Interactions
          </h3>
          
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-white rounded-xl cursor-pointer hover:bg-green-50 transition-colors">
              <div>
                <div className="font-semibold">Appear in search</div>
                <div className="text-sm text-gray-600">Let people find you through search</div>
              </div>
              <input
                type="checkbox"
                checked={settings.discoverable}
                onChange={(e) => setSettings({ ...settings, discoverable: e.target.checked })}
                className="w-5 h-5 text-purple-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-white rounded-xl cursor-pointer hover:bg-green-50 transition-colors">
              <div>
                <div className="font-semibold">Allow messages</div>
                <div className="text-sm text-gray-600">Customers can contact you</div>
              </div>
              <input
                type="checkbox"
                checked={settings.allow_messages}
                onChange={(e) => setSettings({ ...settings, allow_messages: e.target.checked })}
                className="w-5 h-5 text-purple-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-white rounded-xl cursor-pointer hover:bg-green-50 transition-colors">
              <div>
                <div className="font-semibold">Allow reviews</div>
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

        {/* Analytics */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200 shadow-md">
          <h3 className="text-lg font-bold text-purple-900 mb-4">
            📊 Profile Analytics
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">
                {settings.view_count || 0}
              </div>
              <div className="text-sm text-gray-600">Views</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">
                {settings.rating_average ? `${settings.rating_average}⭐` : 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Rating</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">
                {settings.rating_count || 0}
              </div>
              <div className="text-sm text-gray-600">Reviews</div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button
            onClick={save}
            disabled={saving}
            className={`
              px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg
              ${saving
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transform hover:scale-105'
              }
            `}
          >
            {saving ? '✨ Saving...' : '💫 Save All Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
