// components/business/BusinessSidebar.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function BusinessSidebar({ businessId }: { businessId: string }) {
  const [stats, setStats] = useState({
    view_count: 0,
    rating_average: null as number | null,
    rating_count: 0,
    services_count: 0,
    gallery_count: 0,
    follower_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [profileStrength, setProfileStrength] = useState(0);
  const [missingItems, setMissingItems] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    async function load() {
      // businessId is actually the owner_id
      const { data, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('owner_id', businessId)
        .single();
      
      if (error) {
        console.error('Error loading business sidebar:', error);
      }
      
      if (data) {
        // Calculate stats
        setStats({
          view_count: data.view_count || 0,
          rating_average: data.rating_average,
          rating_count: data.rating_count || 0,
          services_count: Array.isArray(data.services) ? data.services.length : 0,
          gallery_count: Array.isArray(data.gallery) ? data.gallery.length : 0,
          follower_count: data.follower_count || 0,
        });

        // Calculate profile strength
        let score = 0;
        const missing = [];

        if (data.display_name && data.display_name !== 'My Business') score += 10;
        else missing.push('Business name');
        
        if (data.handle) score += 10;
        else missing.push('Handle');
        
        if (data.bio || data.description) score += 10;
        else missing.push('Description');
        
        if (data.logo_url) score += 10;
        else missing.push('Logo');
        
        if (data.cover_url) score += 5;
        else missing.push('Cover photo');
        
        if (data.categories?.length > 0) score += 10;
        else missing.push('Categories');
        
        if (data.hours && Object.keys(data.hours).length > 0) score += 10;
        else missing.push('Business hours');
        
        if (data.services?.length > 0) score += 10;
        else missing.push('Services');
        
        if (data.gallery?.length > 0) score += 10;
        else missing.push('Gallery photos');
        
        if (data.social_links && Object.keys(data.social_links).length > 0) score += 5;
        else missing.push('Social links');
        
        if (data.phone) score += 5;
        else missing.push('Phone number');
        
        if (data.email) score += 5;
        else missing.push('Email');

        setProfileStrength(Math.min(100, score));
        setMissingItems(missing);
      }
      
      setLoading(false);
    }
    load();
  }, [businessId]);

  const getStrengthColor = () => {
    if (profileStrength >= 80) return 'bg-green-500';
    if (profileStrength >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Mobile layout
  if (isMobile) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {/* Quick Stats Cards */}
        <div className="bg-white rounded-lg shadow-sm p-3">
          <div className="text-2xl font-bold text-purple-600">
            {loading ? '...' : stats.view_count.toLocaleString()}
          </div>
          <div className="text-xs text-gray-600">Profile Views</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-3">
          <div className="text-2xl font-bold text-purple-600">
            {loading ? '...' : stats.follower_count}
          </div>
          <div className="text-xs text-gray-600">Followers</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-3">
          <div className="text-2xl font-bold text-purple-600">
            {loading ? '...' : stats.rating_average ? `${stats.rating_average}⭐` : 'N/A'}
          </div>
          <div className="text-xs text-gray-600">Rating</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-3">
          <div className="text-2xl font-bold text-purple-600">
            {loading ? '...' : profileStrength + '%'}
          </div>
          <div className="text-xs text-gray-600">Profile Complete</div>
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-semibold mb-3">Quick Stats</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Profile Views</span>
            <span className="font-semibold text-purple-600">
              {loading ? '...' : stats.view_count.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Followers</span>
            <span className="font-semibold">
              {loading ? '...' : stats.follower_count}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Rating</span>
            <span className="font-semibold">
              {loading ? '...' : stats.rating_average ? `${stats.rating_average}⭐` : 'No ratings'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Reviews</span>
            <span className="font-semibold">
              {loading ? '...' : stats.rating_count}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Services</span>
            <span className="font-semibold">
              {loading ? '...' : stats.services_count}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Gallery Items</span>
            <span className="font-semibold">
              {loading ? '...' : stats.gallery_count}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Completeness */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-semibold mb-3">Profile Strength</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Complete</span>
              <span className="font-medium">{profileStrength}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${getStrengthColor()}`}
                style={{ width: `${profileStrength}%` }}
              />
            </div>
          </div>
          
          {missingItems.length > 0 && profileStrength < 100 && (
            <div>
              <p className="text-xs text-gray-600 mb-2">Complete these to improve:</p>
              <ul className="text-xs space-y-1">
                {missingItems.slice(0, 3).map((item) => (
                  <li key={item} className="text-gray-500">• {item}</li>
                ))}
                {missingItems.length > 3 && (
                  <li className="text-gray-400">• And {missingItems.length - 3} more...</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Quick Tips */}
      <div className="bg-purple-50 rounded-lg p-4">
        <h3 className="font-semibold mb-2 text-purple-900">💡 Quick Tips</h3>
        <ul className="text-sm text-purple-700 space-y-1">
          <li>• Add photos to attract more views</li>
          <li>• Keep your hours updated</li>
          <li>• Respond to messages quickly</li>
          <li>• Ask happy customers for reviews</li>
          <li>• Post updates regularly</li>
        </ul>
      </div>

      {/* Performance Insights */}
      {stats.view_count > 0 && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold mb-2 text-blue-900">📊 Insights</h3>
          <div className="text-sm text-blue-700 space-y-1">
            {stats.view_count > 100 && (
              <p>🎉 Great job! You've reached {stats.view_count} views!</p>
            )}
            {stats.rating_average && stats.rating_average >= 4 && (
              <p>⭐ Excellent rating of {stats.rating_average}!</p>
            )}
            {stats.services_count === 0 && (
              <p>💼 Add services to show what you offer</p>
            )}
            {stats.gallery_count === 0 && (
              <p>📸 Add photos to showcase your work</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
