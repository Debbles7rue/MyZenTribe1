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
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('business_profiles')
        .select('view_count, rating_average, rating_count, services, gallery')
        .eq('id', businessId)
        .single();
      
      if (data) {
        setStats({
          view_count: data.view_count || 0,
          rating_average: data.rating_average,
          rating_count: data.rating_count || 0,
          services_count: data.services?.length || 0,
          gallery_count: data.gallery?.length || 0,
        });
      }
      setLoading(false);
    }
    load();
  }, [businessId]);

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
        <div className="space-y-2">
          <ProfileStrengthMeter businessId={businessId} />
        </div>
      </div>

      {/* Quick Tips */}
      <div className="bg-purple-50 rounded-lg p-4">
        <h3 className="font-semibold mb-2 text-purple-900">💡 Tips</h3>
        <ul className="text-sm text-purple-700 space-y-1">
          <li>• Add photos to attract more views</li>
          <li>• Complete all sections for better visibility</li>
          <li>• Respond to messages quickly</li>
          <li>• Keep your hours updated</li>
        </ul>
      </div>
    </div>
  );
}

// Profile Strength Component
function ProfileStrengthMeter({ businessId }: { businessId: string }) {
  const [strength, setStrength] = useState(0);
  const [missing, setMissing] = useState<string[]>([]);

  useEffect(() => {
    async function calculate() {
      const { data } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('id', businessId)
        .single();
      
      if (!data) return;

      let score = 0;
      const missingItems = [];

      // Check required fields
      if (data.display_name) score += 10;
      else missingItems.push('Business name');
      
      if (data.handle) score += 10;
      else missingItems.push('Handle');
      
      if (data.bio) score += 10;
      else missingItems.push('Description');
      
      if (data.logo_url) score += 10;
      else missingItems.push('Logo');
      
      if (data.categories?.length > 0) score += 10;
      else missingItems.push('Categories');
      
      if (data.hours) score += 10;
      else missingItems.push('Hours');
      
      if (data.services?.length > 0) score += 10;
      else missingItems.push('Services');
      
      if (data.gallery?.length > 0) score += 10;
      else missingItems.push('Gallery photos');
      
      if (data.social_links && Object.keys(data.social_links).length > 0) score += 10;
      else missingItems.push('Social links');
      
      if (data.phone || data.email) score += 10;
      else missingItems.push('Contact info');

      setStrength(score);
      setMissing(missingItems);
    }
    calculate();
  }, [businessId]);

  const getColor = () => {
    if (strength >= 80) return 'bg-green-500';
    if (strength >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>Completeness</span>
        <span className="font-semibold">{strength}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all ${getColor()}`}
          style={{ width: `${strength}%` }}
        />
      </div>
      {missing.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-gray-600 mb-1">To improve:</p>
          <ul className="text-xs text-gray-500">
            {missing.slice(0, 3).map(item => (
              <li key={item}>• Add {item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
