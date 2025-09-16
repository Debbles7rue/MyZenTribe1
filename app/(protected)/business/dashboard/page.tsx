// app/(protected)/business/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import BusinessHeader from '@/components/business/BusinessHeader';
import BusinessSidebar from '@/components/business/BusinessSidebar';
import BusinessTabs from '@/components/business/BusinessTabs';
import BusinessWelcome from '@/components/business/BusinessWelcome';

export default function BusinessDashboardPage() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('basic');
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    async function checkBusinessProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // Check if user has a business profile
      const { data: profile, error } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (error || !profile) {
        // Create a new business profile
        const { data: newProfile, error: createError } = await supabase
          .from('business_profiles')
          .insert({
            user_id: user.id,
            display_name: 'My Business',
            handle: `business-${user.id.slice(0, 8)}`,
            visibility: 'private',
            allow_messages: false,
            allow_reviews: false,
            discoverable: false,
          })
          .select()
          .single();

        if (!createError && newProfile) {
          setBusinessId(newProfile.id);
          setShowWelcome(true);
        }
      } else {
        setBusinessId(profile.id);
      }

      setLoading(false);
    }

    checkBusinessProfile();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading business dashboard...</div>
      </div>
    );
  }

  if (!businessId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Error loading business profile</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showWelcome && (
        <BusinessWelcome onComplete={() => setShowWelcome(false)} />
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <BusinessHeader businessId={businessId} />
        
        {/* Main Layout */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Desktop Only */}
          <div className="hidden lg:block">
            <BusinessSidebar businessId={businessId} />
          </div>
          
          {/* Main Content */}
          <div className="lg:col-span-3">
            <BusinessTabs 
              businessId={businessId} 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
            />
          </div>
        </div>

        {/* Mobile Sidebar - Bottom */}
        <div className="lg:hidden mt-6">
          <BusinessSidebar businessId={businessId} />
        </div>
      </div>
    </div>
  );
}
