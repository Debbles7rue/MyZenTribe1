// components/business/BusinessHeader.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function BusinessHeader({ businessId }: { businessId: string }) {
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('business_profiles')
        .select('display_name')
        .eq('id', businessId)
        .single();
      
      setBusinessName(data?.display_name || 'My Business');
      setLoading(false);
    }
    load();
  }, [businessId]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {loading ? '...' : businessName}
          </h1>
          <p className="text-gray-600">Business Dashboard</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary">Preview</button>
          <button className="btn btn-primary">Share</button>
        </div>
      </div>
    </div>
  );
}
