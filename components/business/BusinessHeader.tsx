// components/business/BusinessHeader.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function BusinessHeader({ businessId }: { businessId: string }) {
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('business_profiles')
        .select('display_name, handle, verified, visibility')
        .eq('id', businessId)
        .single();
      
      setBusiness(data);
      setLoading(false);
    }
    load();
  }, [businessId]);

  const profileUrl = business?.handle 
    ? `/business/@${business.handle}`
    : null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {loading ? '...' : (business?.display_name || 'My Business')}
            </h1>
            {business?.verified && (
              <span className="text-blue-500" title="Verified">✓</span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {business?.visibility === 'public' ? '🟢 Public' : 
             business?.visibility === 'unlisted' ? '🟡 Unlisted' : '🔴 Private'}
            {business?.handle && ` • @${business.handle}`}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {profileUrl && (
            <Link 
              href={profileUrl}
              target="_blank"
              className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-lg text-center hover:bg-gray-50 font-medium"
            >
              👁️ Preview
            </Link>
          )}
          <button 
            onClick={() => {
              if (profileUrl) {
                navigator.clipboard.writeText(window.location.origin + profileUrl);
                alert('Link copied!');
              }
            }}
            className="flex-1 sm:flex-none px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
          >
            📋 Share
          </button>
        </div>
      </div>
    </div>
  );
}
