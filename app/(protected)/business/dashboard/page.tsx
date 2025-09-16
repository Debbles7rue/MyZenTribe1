// app/(protected)/business/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import BusinessHeader from '@/components/business/BusinessHeader';
import BusinessSidebar from '@/components/business/BusinessSidebar';
import BusinessTabs from '@/components/business/BusinessTabs';
import BusinessWelcome from '@/components/business/BusinessWelcome';

export default function BusinessDashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('basic');
  const [showWelcome, setShowWelcome] = useState(false);
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
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setUserId(user.id);
      setBusinessId(user.id); // Since owner_id is the primary key
      
      // Check if business profile exists
      const { data, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('owner_id', user.id)
        .single();
      
      if (error && error.code === 'PGRST116') {
        // No rows returned - create new profile
        const { data: newBiz, error: createError } = await supabase
          .from('business_profiles')
          .insert({
            owner_id: user.id,
            display_name: 'My Business',
            handle: `business-${user.id.slice(0, 8)}`,
            visibility: 'private',
            allow_messages: false,
            allow_reviews: false,
            allow_collaboration: false,
            discoverable: false,
            services: [],
            hours: {},
            special_hours: {},
            social_links: {},
            gallery: [],
            featured_items: [],
            view_count: 0,
            follower_count: 0,
            rating_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (!createError && newBiz) {
          setShowWelcome(true);
        } else if (createError) {
          console.error('Error creating business profile:', createError);
        }
      } else if (data) {
        // Check if this is a new/incomplete profile
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

  if (!businessId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="text-center px-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to load business profile</h2>
          <p className="text-gray-600 mb-4">There was an issue accessing your business dashboard.</p>
          <div className="space-y-2 max-w-xs mx-auto">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Try Again
            </button>
            <button 
              onClick={() => router.push('/dashboard')} 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {/* Header - Mobile Optimized */}
          <div className="mb-6">
            <BusinessHeader businessId={businessId} />
          </div>
          
          {/* Mobile Tab Navigation */}
          {isMobile && (
            <div className="mb-4 -mx-4 px-4 overflow-x-auto">
              <div className="flex space-x-2 pb-2">
                {['basic', 'contact', 'hours', 'services', 'gallery', 'social', 'settings'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`
                      px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
                      ${activeTab === tab 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-gray-100 text-gray-600'}
                    `}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Main Layout - Responsive Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar - Desktop Left, Mobile Top */}
            <div className={`${isMobile ? 'order-2' : 'lg:col-span-1'}`}>
              <div className={`${isMobile ? 'mt-6' : 'sticky top-4'}`}>
                <BusinessSidebar businessId={businessId} />
              </div>
            </div>
            
            {/* Main Content - Full Width on Mobile */}
            <div className={`${isMobile ? 'order-1' : 'lg:col-span-3'}`}>
              <BusinessTabs 
                businessId={businessId} 
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
