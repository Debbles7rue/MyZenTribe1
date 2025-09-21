// components/business/BusinessHeader.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function BusinessHeader({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    async function load() {
      // businessId is actually the owner_id (user.id)
      const { data, error } = await supabase
        .from('business_profiles')
        .select('display_name, handle, verified, logo_url, rating_average, rating_count')
        .eq('owner_id', businessId)
        .single();
      
      if (error) {
        console.error('Error loading business header:', error);
      }
      
      if (data) {
        // Force visibility to always be public
        setBusiness({
          ...data,
          visibility: 'public'
        });
      }
      setLoading(false);
    }
    load();
  }, [businessId]);

  // Build the public profile URL (no @ symbol in URL)
  const profileUrl = business?.handle 
    ? `/business/${business.handle}`
    : null;

  const handleShare = () => {
    if (profileUrl) {
      const fullUrl = window.location.origin + profileUrl;
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Desktop Header */}
      <div className="hidden sm:block p-6">
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-start gap-4">
            {/* Logo */}
            {business?.logo_url && (
              <img
                src={business.logo_url}
                alt={business.display_name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {loading ? (
                    <span className="animate-pulse bg-gray-200 rounded h-8 w-48 inline-block"></span>
                  ) : (
                    business?.display_name || 'My Business'
                  )}
                </h1>
                {business?.verified && (
                  <span className="text-blue-500 text-xl" title="Verified Business">✓</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm font-medium text-green-600">
                  🟢 Public
                </span>
                {business?.handle && (
                  <span className="text-sm text-gray-600">@{business.handle}</span>
                )}
                {business?.rating_average && (
                  <span className="text-sm text-gray-600">
                    {business.rating_average}⭐ ({business.rating_count || 0})
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            {profileUrl && (
              <Link 
                href={profileUrl}
                target="_blank"
                className="px-4 py-2 border border-gray-300 rounded-lg text-center hover:bg-gray-50 font-medium transition-colors"
              >
                👁️ Preview
              </Link>
            )}
            <button 
              onClick={handleShare}
              disabled={!profileUrl}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors relative"
            >
              {copied ? '✓ Copied!' : '📋 Share'}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="sm:hidden">
        <div className="p-4">
          {/* Top Row - Name & Status */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-3">
              {business?.logo_url && (
                <img
                  src={business.logo_url}
                  alt={business.display_name}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-gray-900 truncate flex items-center gap-1">
                  {loading ? (
                    <span className="animate-pulse bg-gray-200 rounded h-6 w-32 inline-block"></span>
                  ) : (
                    <>
                      {business?.display_name || 'My Business'}
                      {business?.verified && (
                        <span className="text-blue-500 text-sm" title="Verified">✓</span>
                      )}
                    </>
                  )}
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-medium text-green-600">
                    🟢 Public
                  </span>
                  {business?.rating_average && (
                    <span className="text-xs text-gray-600">
                      {business.rating_average}⭐
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Handle */}
          {business?.handle && (
            <div className="text-sm text-gray-600 mb-3">
              @{business.handle}
            </div>
          )}

          {/* Action Buttons - Full Width on Mobile */}
          <div className="grid grid-cols-2 gap-2">
            {profileUrl && (
              <Link 
                href={profileUrl}
                target="_blank"
                className="px-3 py-2 border border-gray-300 rounded-lg text-center hover:bg-gray-50 font-medium text-sm transition-colors"
              >
                👁️ Preview
              </Link>
            )}
            <button 
              onClick={handleShare}
              disabled={!profileUrl}
              className={`px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                !profileUrl ? 'col-span-2' : ''
              }`}
            >
              {copied ? '✓ Copied!' : '📋 Share'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
