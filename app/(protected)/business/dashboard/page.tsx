// app/(protected)/business/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import BusinessTabs from '@/components/business/BusinessTabs';
import BusinessHeader from '@/components/business/BusinessHeader';
import BusinessSidebar from '@/components/business/BusinessSidebar';

export default function BusinessDashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Check if business profile exists
        const { data } = await supabase
          .from('business_profiles')
          .select('id')
          .eq('owner_id', user.id)
          .single();
        
        if (data) {
          setBusinessId(data.id);
        } else {
          // Create business profile if doesn't exist
          const { data: newBiz } = await supabase
            .from('business_profiles')
            .insert({ owner_id: user.id })
            .select('id')
            .single();
          setBusinessId(newBiz?.id || null);
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!businessId) return <div>Error loading business profile</div>;

  return (
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
  );
}
