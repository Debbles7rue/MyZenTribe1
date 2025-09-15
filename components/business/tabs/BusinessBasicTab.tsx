// components/business/tabs/BusinessBasicTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function BusinessBasicTab({ businessId }: { businessId: string }) {
  const [data, setData] = useState({
    display_name: '',
    handle: '',
    tagline: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: biz } = await supabase
        .from('business_profiles')
        .select('display_name, handle, tagline')
        .eq('id', businessId)
        .single();
      
      if (biz) {
        setData({
          display_name: biz.display_name || '',
          handle: biz.handle || '',
          tagline: biz.tagline || '',
        });
      }
      setLoading(false);
    }
    load();
  }, [businessId]);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from('business_profiles')
      .update(data)
      .eq('id', businessId);
    
    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('Saved!');
    }
    setSaving(false);
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Basic Information</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Business Name
        </label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          value={data.display_name}
          onChange={(e) => setData({ ...data, display_name: e.target.value })}
          placeholder="Your Business Name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Handle (your unique @name)
        </label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          value={data.handle}
          onChange={(e) => setData({ ...data, handle: e.target.value })}
          placeholder="@your-business"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tagline
        </label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          value={data.tagline}
          onChange={(e) => setData({ ...data, tagline: e.target.value })}
          placeholder="Your inspiring message"
        />
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}
