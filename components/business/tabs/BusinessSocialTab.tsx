// components/business/tabs/BusinessSocialTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface SocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  tiktok?: string;
  linkedin?: string;
  whatsapp?: string;
}

const socialPlatforms = [
  { key: 'facebook', label: 'Facebook', icon: '📘', placeholder: 'facebook.com/yourbusiness' },
  { key: 'instagram', label: 'Instagram', icon: '📷', placeholder: 'instagram.com/yourbusiness' },
  { key: 'twitter', label: 'X (Twitter)', icon: '🐦', placeholder: 'x.com/yourbusiness' },
  { key: 'youtube', label: 'YouTube', icon: '📺', placeholder: 'youtube.com/@yourchannel' },
  { key: 'tiktok', label: 'TikTok', icon: '🎵', placeholder: 'tiktok.com/@yourbusiness' },
  { key: 'linkedin', label: 'LinkedIn', icon: '💼', placeholder: 'linkedin.com/company/yourbusiness' },
  { key: 'whatsapp', label: 'WhatsApp', icon: '💬', placeholder: 'Phone number with country code' },
];

export default function BusinessSocialTab({ businessId }: { businessId: string }) {
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      const { data: biz } = await supabase
        .from('business_profiles')
        .select('social_links')
        .eq('id', businessId)
        .single();
      
      if (biz?.social_links) {
        setSocialLinks(biz.social_links as SocialLinks);
      }
      setLoading(false);
    }
    load();
  }, [businessId]);

  async function save() {
    setSaving(true);
    setMessage('');
    
    // Clean up URLs - remove empty strings
    const cleanedLinks = Object.entries(socialLinks).reduce((acc, [key, value]) => {
      if (value && value.trim()) {
        acc[key as keyof SocialLinks] = value.trim();
      }
      return acc;
    }, {} as SocialLinks);
    
    const { error } = await supabase
      .from('business_profiles')
      .update({ social_links: cleanedLinks })
      .eq('id', businessId);
    
    if (error) {
      setMessage('Error: ' + error.message);
    } else {
      setMessage('Social links saved!');
      setTimeout(() => setMessage(''), 3000);
    }
    setSaving(false);
  }

  function updateLink(platform: keyof SocialLinks, value: string) {
    setSocialLinks(prev => ({
      ...prev,
      [platform]: value
    }));
  }

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Social Media Links</h2>
        <p className="text-sm text-gray-600 mb-4">
          Add your social media profiles to help customers find and follow you
        </p>
        {message && (
          <div className={`p-3 rounded-lg mb-4 ${
            message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Social Links Grid */}
      <div className="space-y-4">
        {socialPlatforms.map(platform => (
          <div key={platform.key} className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 sm:w-36">
              <span className="text-2xl">{platform.icon}</span>
              <span className="font-medium text-gray-700">{platform.label}</span>
            </div>
            <input
              type="text"
              className="flex-1 px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={socialLinks[platform.key as keyof SocialLinks] || ''}
              onChange={(e) => updateLink(platform.key as keyof SocialLinks, e.target.value)}
              placeholder={platform.placeholder}
              style={{ fontSize: '16px' }}
            />
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-800 font-medium mb-2">💡 Tips:</p>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Just paste the full URL or your username</li>
          <li>• Adding social links helps verify your business</li>
          <li>• Customers can easily find you across platforms</li>
        </ul>
      </div>

      {/* Save Button */}
      <div className="flex justify-center sm:justify-end pt-4 border-t">
        <button
          onClick={save}
          disabled={saving}
          className="w-full sm:w-auto px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium text-base touch-manipulation min-h-[48px]"
        >
          {saving ? 'Saving...' : 'Save Social Links'}
        </button>
      </div>
    </div>
  );
}
