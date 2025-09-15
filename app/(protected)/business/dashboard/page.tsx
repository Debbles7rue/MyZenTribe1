// app/(protected)/business/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import BusinessTabs from '@/components/business/BusinessTabs';
import BusinessHeader from '@/components/business/BusinessHeader';
import BusinessSidebar from '@/components/business/BusinessSidebar';
import BusinessWelcome from '@/components/business/BusinessWelcome';

export default function BusinessDashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('basic');
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        
        // Check if business profile exists
        const { data } = await supabase
          .from('business_profiles')
          .select('id, display_name')
          .eq('owner_id', user.id)
          .single();
        
        if (data) {
          setBusinessId(data.id);
          // Check if this is a new business (no name set)
          if (!data.display_name) {
            setShowWelcome(true);
          }
        } else {
          // Create business profile if doesn't exist
          const { data: newBiz } = await supabase
            .from('business_profiles')
            .insert({ owner_id: user.id })
            .select('id')
            .single();
          setBusinessId(newBiz?.id || null);
          // Show welcome for new profiles
          if (newBiz) {
            setShowWelcome(true);
          }
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your business dashboard...</p>
        </div>
      </div>
    );
  }

  if (!businessId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error loading business profile</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg"
          >
            Try Again
          </button>
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
          <BusinessHeader businessId={businessId} />
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
            <div className="lg:col-span-3">
              <BusinessTabs 
                businessId={businessId} 
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            </div>
            <div className="lg:col-span-1">
              <BusinessSidebar businessId={businessId} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
