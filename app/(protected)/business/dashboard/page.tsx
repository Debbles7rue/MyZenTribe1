// app/(protected)/business/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import BusinessHeader from '@/components/business/BusinessHeader';
import BusinessSidebar from '@/components/business/BusinessSidebar';
import BusinessTabs from '@/components/business/BusinessTabs';
import BusinessWelcome from '@/components/business/BusinessWelcome';
import PostComposer from '@/components/PostComposer';
import PostCard from '@/components/PostCard';
import { Post } from '@/lib/posts';

export default function BusinessDashboardPage() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('basic');
  const [showWelcome, setShowWelcome] = useState(false);
  const [businessPosts, setBusinessPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function checkBusinessProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setUserId(user.id);

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

  // Load business posts
  async function loadBusinessPosts() {
    if (!userId) return;
    
    setPostsLoading(true);
    try {
      // Load posts created by this business account
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', userId)
        .eq('is_business_post', true) // Assuming you have a flag for business posts
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setBusinessPosts(data);
      }
    } catch (err) {
      console.error('Error loading business posts:', err);
    } finally {
      setPostsLoading(false);
    }
  }

  // Load posts when userId is available
  useEffect(() => {
    if (userId && businessId) {
      loadBusinessPosts();
    }
  }, [userId, businessId]);

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

        {/* Business Posts Section */}
        {userId && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1"></div>
            <div className="lg:col-span-3">
              {/* Post Composer */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Share Business Update</h3>
                <PostComposer 
                  onPostCreated={loadBusinessPosts}
                  className="business-composer"
                />
              </div>

              {/* Business Posts Feed */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Your Business Posts</h3>
                {postsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-gray-500">Loading posts...</div>
                  </div>
                ) : businessPosts.length > 0 ? (
                  <div className="space-y-4">
                    {businessPosts.map((post) => (
                      <PostCard 
                        key={post.id} 
                        post={post} 
                        onChanged={loadBusinessPosts}
                        currentUserId={userId}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">📢</div>
                    <div className="text-lg font-medium text-gray-700">No business posts yet</div>
                    <div className="text-gray-500 mt-2">Share updates about your business, promotions, or news!</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
