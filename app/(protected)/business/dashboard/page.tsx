// app/(protected)/business/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import BusinessTabs from '@/components/business/BusinessTabs';
import BusinessHeader from '@/components/business/BusinessHeader';
import BusinessSidebar from '@/components/business/BusinessSidebar';
import BusinessWelcome from '@/components/business/BusinessWelcome';

export default function BusinessDashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('basic');
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setUserId(user.id);
      
      // Check if business profile exists
      const { data, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('owner_id', user.id)
        .single();
      
      if (error && error.code === 'PGRST116') {
        // No profile exists - create one
        const { data: newBiz, error: createError } = await supabase
          .from('business_profiles')
          .insert({ 
            owner_id: user.id,
            display_name: 'My Business',
            handle: `business-${user.id.slice(0, 8)}`,
            visibility: 'private',
            allow_messages: false,
            allow_reviews: false,
            discoverable: false,
            services: [],
            hours: {},
            social_links: {},
            gallery: [],
            featured_items: [],
            special_hours: {}
          })
          .select()
          .single();

        if (newBiz) {
          setShowWelcome(true);
        }
      } else if (data) {
        // Check if this is a new business (no name or handle set)
        if (!data.display_name || data.display_name === 'My Business' || !data.handle) {
          setShowWelcome(true);
        }
      }
      
      setLoading(false);
    }
    
    init();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your business dashboard...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to load business profile</h2>
          <p className="text-gray-600 mb-4">There was an issue accessing your business dashboard.</p>
          <div className="space-y-2">
            <button 
              onClick={() => window.location.reload()} 
              className="block w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Try Again
            </button>
            <button 
              onClick={() => router.push('/dashboard')} 
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Welcome Modal for First-Time Users */}
      {showWelcome && (
        <BusinessWelcome onComplete={() => setShowWelcome(false)} />
      )}
      
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="max-w-7xl mx-auto p-4">
          {/* Header - Pass userId as businessId since owner_id is the identifier */}
          <BusinessHeader businessId={userId} />
          
          {/* Main Layout - Responsive Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
            {/* Main Content Area */}
            <div className="lg:col-span-3 order-2 lg:order-1">
              <BusinessTabs 
                businessId={userId} 
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            </div>
            
            {/* Sidebar - Shows on top for mobile */}
            <div className="lg:col-span-1 order-1 lg:order-2">
              <BusinessSidebar businessId={userId} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
