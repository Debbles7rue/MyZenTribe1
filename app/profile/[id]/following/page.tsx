// app/profile/[id]/following/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import BusinessVerificationBadge from '@/components/business/BusinessVerificationBadge';
import BusinessFollowButton from '@/components/business/BusinessFollowButton';

interface FollowedBusiness {
  id: string;
  display_name: string;
  handle: string;
  tagline?: string;
  logo_url?: string;
  verification_level?: 'none' | 'some' | 'verified';
  follower_count?: number;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export default function FollowingPage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params?.id as string;
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [followedBusinesses, setFollowedBusinesses] = useState<FollowedBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  // Get current user
  useEffect(() => {
    async function getCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;
      setCurrentUserId(userId);
      setIsOwnProfile(userId === profileId);
    }
    getCurrentUser();
  }, [profileId]);

  // Load profile and followed businesses
  useEffect(() => {
    if (profileId) {
      loadData();
    }
  }, [profileId]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Load profile info
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', profileId)
        .single();

      if (profileError) {
        throw new Error('Profile not found');
      }

      setProfile(profileData);

      // Load followed businesses - FIXED QUERY
      // First get the follower records for businesses
      const { data: followData, error: followError } = await supabase
        .from('followers')
        .select('following_id, created_at')
        .eq('follower_id', profileId)
        .eq('following_type', 'business')
        .order('created_at', { ascending: false });

      if (followError) {
        console.error('Error loading followers:', followError);
        throw new Error('Failed to load followed businesses');
      }

      // If no follows, return empty array
      if (!followData || followData.length === 0) {
        setFollowedBusinesses([]);
        setLoading(false);
        return;
      }

      // Get the business IDs
      const businessIds = followData.map(f => f.following_id);

      // Now fetch the actual business data
      const { data: businessData, error: businessError } = await supabase
        .from('business_profiles')
        .select('id, display_name, handle, tagline, logo_url, verification_level, follower_count, visibility')
        .in('id', businessIds)
        .eq('visibility', 'public');

      if (businessError) {
        console.error('Error loading business data:', businessError);
        throw new Error('Failed to load business details');
      }

      // Combine the data with created_at from followers
      const businesses: FollowedBusiness[] = (businessData || []).map(business => {
        const followRecord = followData.find(f => f.following_id === business.id);
        return {
          ...business,
          created_at: followRecord?.created_at || new Date().toISOString()
        };
      });

      // Sort by created_at (most recent first)
      businesses.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setFollowedBusinesses(businesses);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  function handleBusinessUpdated() {
    // Reload the data when a business is unfollowed
    loadData();
  }

  if (loading) {
    return (
      <div className="following-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <span>Loading followed businesses...</span>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="following-page">
        <div className="error-state">
          <h1>Something went wrong</h1>
          <p>{error || 'Profile not found'}</p>
          <button 
            onClick={() => router.back()} 
            className="btn btn-primary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="following-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <button 
            onClick={() => router.back()} 
            className="back-button"
            aria-label="Go back"
          >
            ← Back
          </button>
          <div className="header-info">
            <h1 className="page-title">
              {isOwnProfile ? 'Businesses You Follow' : `Businesses ${profile.full_name || 'User'} Follows`}
            </h1>
            <p className="page-subtitle">
              {followedBusinesses.length} business{followedBusinesses.length !== 1 ? 'es' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Businesses Grid */}
      <div className="businesses-container">
        {followedBusinesses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏢</div>
            <h2 className="empty-title">
              {isOwnProfile ? "You haven't followed any businesses yet" : "No businesses followed yet"}
            </h2>
            <p className="empty-description">
              {isOwnProfile 
                ? "Discover and follow businesses in your area to stay updated on their events and services."
                : "This user hasn't followed any businesses yet."
              }
            </p>
            {isOwnProfile && (
              <Link href="/explore" className="btn btn-primary">
                Discover Businesses
              </Link>
            )}
          </div>
        ) : (
          <div className="businesses-grid">
            {followedBusinesses.map((business) => (
              <div key={business.id} className="business-card">
                <Link 
                  href={`/business/${business.handle}`}
                  className="business-link"
                >
                  {/* Business Logo */}
                  <div className="business-logo">
                    {business.logo_url ? (
                      <img 
                        src={business.logo_url} 
                        alt={`${business.display_name} logo`}
                        className="logo-image"
                      />
                    ) : (
                      <div className="logo-placeholder">
                        <span className="placeholder-icon">🏢</span>
                      </div>
                    )}
                  </div>

                  {/* Business Info */}
                  <div className="business-info">
                    <div className="business-header">
                      <h3 className="business-name">{business.display_name}</h3>
                      <BusinessVerificationBadge 
                        level={business.verification_level || 'none'}
                        businessId={business.id}
                        followerCount={business.follower_count}
                        size="small"
                        showTooltip={false}
                      />
                    </div>
                    
                    {business.tagline && (
                      <p className="business-tagline">{business.tagline}</p>
                    )}
                    
                    <p className="business-handle">@{business.handle}</p>
                    
                    {business.follower_count !== undefined && business.follower_count > 0 && (
                      <p className="follower-count">
                        {business.follower_count.toLocaleString()} follower{business.follower_count !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </Link>

                {/* Follow Button - Only show for current user's profile or public profiles */}
                {currentUserId && (
                  <div className="business-actions">
                    <BusinessFollowButton
                      businessId={business.id}
                      businessName={business.display_name}
                      size="small"
                      variant="outline"
                      showCount={false}
                      onFollowChanged={handleBusinessUpdated}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .following-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 20%, #f1f5f9 40%, #e0e7ff 60%, #f3e8ff 80%, #fdf4ff 100%);
          padding: 1rem;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .back-button {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 0.75rem;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
          min-height: 44px;
          min-width: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .back-button:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .header-info {
          flex: 1;
        }

        .page-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.25rem 0;
        }

        .page-subtitle {
          color: #6b7280;
          margin: 0;
          font-size: 0.875rem;
        }

        .businesses-container {
          max-width: 6xl;
          margin: 0 auto;
        }

        .loading-state,
        .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
          min-height: 50vh;
        }

        .loading-spinner {
          width: 2rem;
          height: 2rem;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          background: white;
          border-radius: 1rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .empty-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .empty-description {
          color: #6b7280;
          margin: 0 0 2rem 0;
          max-width: 24rem;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.6;
        }

        .businesses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        @media (max-width: 640px) {
          .businesses-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }

        .business-card {
          background: white;
          border-radius: 0.75rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: all 0.2s;
          border: 1px solid #f3f4f6;
        }

        .business-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          border-color: #e5e7eb;
        }

        .business-link {
          text-decoration: none;
          color: inherit;
          display: block;
          margin-bottom: 1rem;
        }

        .business-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .logo-image {
          width: 4rem;
          height: 4rem;
          border-radius: 0.5rem;
          object-fit: cover;
          border: 2px solid #f3f4f6;
        }

        .logo-placeholder {
          width: 4rem;
          height: 4rem;
          border-radius: 0.5rem;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #e5e7eb;
        }

        .placeholder-icon {
          font-size: 1.5rem;
          color: #9ca3af;
        }

        .business-info {
          text-align: center;
        }

        .business-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          flex-wrap: wrap;
        }

        .business-name {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .business-tagline {
          color: #6b7280;
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
          line-height: 1.4;
        }

        .business-handle {
          color: #9ca3af;
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
        }

        .follower-count {
          color: #6b7280;
          margin: 0;
          font-size: 0.75rem;
        }

        .business-actions {
          display: flex;
          justify-content: center;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 500;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          min-height: 44px;
        }

        .btn-primary {
          background: linear-gradient(135deg, #8b5cf6, #a78bfa);
          color: white;
        }

        .btn-primary:hover {
          background: linear-gradient(135deg, #7c3aed, #9333ea);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139,92,246,0.4);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .following-page {
            padding: 0.5rem;
          }

          .page-title {
            font-size: 1.25rem;
          }

          .header-content {
            gap: 0.75rem;
          }

          .business-card {
            padding: 1rem;
          }

          .empty-state {
            padding: 2rem 1rem;
          }

          .empty-icon {
            font-size: 3rem;
          }
        }
      `}</style>
    </div>
  );
}
