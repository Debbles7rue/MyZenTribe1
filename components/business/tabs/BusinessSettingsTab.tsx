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

export default function BusinessSettingsTab({ businessId }: { businessId: string }) {
  const [settings, setSettings] = useState<Settings>({
    visibility: 'public',
    discoverable: true,
    allow_messages: true,
    allow_reviews: true,
    allow_collaboration: false,
    verified: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      const { data: biz } = await supabase
        .from('business_profiles')
        .select('visibility, discoverable, allow_messages, allow_reviews, allow_collaboration, verified, rating_average, rating_count, view_count')
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
      })
      .eq('id', businessId);
    
    if (error) {
      setMessage('Error: ' + error.message);
    } else {
      setMessage('Settings saved!');
      setTimeout(() => setMessage(''), 3000);
    }
    setSaving(false);
  }

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Settings & Privacy</h2>
        {message && (
          <div className={`p-3 rounded-lg mb-4 ${
            message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Profile Visibility */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Profile Visibility</h3>
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
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
                <div className="text-sm text-gray-600">Anyone can find and view your profile</div>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
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
            <label className="flex items-start gap-3 cursor-pointer">
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

      {/* Discovery & Interaction Settings */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <h3 className="font-medium text-gray-900">Discovery & Interactions</h3>
        
        <label className="flex items-center justify-between cursor-pointer">
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

        <label className="flex items-center justify-between cursor-pointer">
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

        <label className="flex items-center justify-between cursor-pointer">
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

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="font-medium">Allow collaboration</div>
            <div className="text-sm text-gray-600">Other creators can collaborate with you</div>
          </div>
          <input
            type="checkbox"
            checked={settings.allow_collaboration}
            onChange={(e) => setSettings({ ...settings, allow_collaboration: e.target.checked })}
            className="w-5 h-5 text-purple-600 rounded"
          />
        </label>
      </div>

      {/* Analytics (Read-only) */}
      <div className="bg-purple-50 p-4 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-3">Profile Analytics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {settings.view_count || 0}
            </div>
            <div className="text-sm text-gray-600">Profile Views</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {settings.rating_average ? `${settings.rating_average}⭐` : 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Average Rating</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {settings.rating_count || 0}
            </div>
            <div className="text-sm text-gray-600">Total Reviews</div>
          </div>
        </div>
      </div>

      {/* Verification Status */}
      {settings.verified && (
        <div className="bg-green-50 p-4 rounded-lg flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <div className="font-medium text-green-900">Verified Business</div>
            <div className="text-sm text-green-700">Your business has been verified</div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-center sm:justify-end pt-4 border-t">
        <button
          onClick={save}
          disabled={saving}
          className="w-full sm:w-auto px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium text-base touch-manipulation min-h-[48px]"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
