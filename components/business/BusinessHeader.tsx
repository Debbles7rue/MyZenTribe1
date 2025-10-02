'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import BusinessFollowButton from '@/components/business/BusinessFollowButton';
import BusinessVerificationBadge from '@/components/business/BusinessVerificationBadge';

interface BusinessHeader {
  id: string;
  display_name?: string;
  tagline?: string;
  logo_url?: string;
  cover_url?: string;
  handle?: string;
  visibility?: 'public' | 'private' | 'unlisted';
  verified?: boolean;
  follower_count?: number;
  verification_level?: 'none' | 'some' | 'verified';
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
      .select('id, display_name, tagline, logo_url, cover_url, handle, visibility, verified, follower_count, verification_level')
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
                <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 flex-wrap">
                  {business?.display_name || 'My Business'}
                  {business?.verified && <span className="text-blue-400">✓</span>}
                </h1>
                {business?.tagline && (
                  <p className="text-sm sm:text-base opacity-90">{business.tagline}</p>
                )}
                
                {/* Verification Badge - Now uses feedback-based verification */}
                <div className="mt-2">
                  <BusinessVerificationBadge 
                    businessId={businessId}
                    level={business?.verification_level}
                    followerCount={business?.follower_count}
                    size="small"
                    className="bg-white/10 backdrop-blur border-white/20"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons - Updated for mobile */}
        <div className="absolute top-4 right-4 flex flex-col sm:flex-row gap-2">
          {/* Follow Button with Feedback Integration - Positioned prominently */}
          {business?.visibility === 'public' && (
            <BusinessFollowButton
              businessId={businessId}
              businessName={business?.display_name}
              size="small"
              variant="outline"
              showCount={false}
              className="bg-white/90 backdrop-blur border-white/50 hover:bg-white"
            />
          )}
          
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

      {/* Status Bar - Enhanced with follower count */}
      <div className="px-6 py-3 bg-gray-50 rounded-b-lg border-b flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm flex-wrap">
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
          
          {/* Follower count display */}
          {business?.follower_count !== undefined && business.follower_count > 0 && (
            <span className="text-gray-500 text-xs">
              {business.follower_count.toLocaleString()} follower{business.follower_count !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Desktop Follow Button with Feedback - Full size with count */}
        {business?.visibility === 'public' && (
          <div className="hidden sm:block">
            <BusinessFollowButton
              businessId={businessId}
              businessName={business?.display_name}
              size="small"
              variant="primary"
              showCount={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}
