// components/business/BusinessHeader.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface BusinessHeader {
  id: string;
  display_name?: string;
  tagline?: string;
  logo_url?: string;
  cover_url?: string;
  handle?: string;
  visibility?: 'public' | 'private' | 'unlisted';
  verified?: boolean;
}

interface Props {
  businessId: string;
}

export default function BusinessHeader({ businessId }: Props) {
  const [business, setBusiness] = useState<BusinessHeader | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadBusiness();
  }, [businessId]);

  async function loadBusiness() {
    const { data } = await supabase
      .from('business_profiles')
      .select('id, display_name, tagline, logo_url, cover_url, handle, visibility, verified')
      .eq('id', businessId)
      .single();
    
    if (data) {
      setBusiness(data);
    }
    setLoading(false);
  }

  function handleShare() {
    if (business?.handle) {
      const url = `${window.location.origin}/business/${business.handle}`;
      if (navigator.share) {
        navigator.share({
          title: business.display_name || 'Check out this business',
          url: url
        });
      } else {
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
      }
    }
  }

  function handlePreview() {
    if (business?.handle) {
      window.open(`/business/${business.handle}`, '_blank');
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm mb-6">
      {/* Cover Section */}
      <div className="relative h-48 sm:h-64 rounded-t-lg overflow-hidden">
        {business?.cover_url ? (
          <img 
            src={business.cover_url} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400" />
        )}
        
        {/* Overlay with business info */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex items-end gap-4">
              {business?.logo_url && (
                <img
                  src={business.logo_url}
                  alt={business.display_name || 'Logo'}
                  className="w-20 h-20 rounded-lg border-4 border-white shadow-lg object-cover"
                />
              )}
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                  {business?.display_name || 'My Business'}
                  {business?.verified && <span className="text-blue-400">✓</span>}
                </h1>
                {business?.tagline && (
                  <p className="text-sm sm:text-base opacity-90">{business.tagline}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={handleShare}
            className="px-3 py-1.5 bg-white/90 backdrop-blur text-gray-700 rounded-lg text-sm font-medium hover:bg-white transition-colors"
          >
            🔗 Share
          </button>
          <button
            onClick={handlePreview}
            className="px-3 py-1.5 bg-white/90 backdrop-blur text-gray-700 rounded-lg text-sm font-medium hover:bg-white transition-colors"
          >
            👁️ Preview
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-6 py-3 bg-gray-50 rounded-b-lg border-b flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            business?.visibility === 'public' 
              ? 'bg-green-100 text-green-700' 
              : business?.visibility === 'unlisted'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-gray-100 text-gray-700'
          }`}>
            {business?.visibility === 'public' ? '🌍 Public' : 
             business?.visibility === 'unlisted' ? '🔗 Unlisted' : '🔒 Private'}
          </span>
          {business?.handle && (
            <span className="text-gray-600">@{business.handle}</span>
          )}
        </div>
      </div>
    </div>
  );
}
