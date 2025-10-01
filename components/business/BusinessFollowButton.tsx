'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import BusinessFeedbackModal from './BusinessFeedbackModal';
import type { FollowStatus, BusinessFeedback, FeedbackStats } from '@/lib/types';

interface Props {
  businessId: string;
  businessName?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'outline';
  showCount?: boolean;
  className?: string;
}

export default function BusinessFollowButton({ 
  businessId, 
  businessName,
  size = 'medium',
  variant = 'primary',
  showCount = true,
  className = ''
}: Props) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followStatus, setFollowStatus] = useState<FollowStatus>({
    isFollowing: false,
    followerCount: 0
  });
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats>({
    total: 0,
    positive: 0,
    negative: 0,
    hasUserFeedback: false
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Get current user
  useEffect(() => {
    async function getCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    }
    getCurrentUser();
  }, []);

  // Load follow status and feedback data
  useEffect(() => {
    if (businessId) {
      loadFollowStatus();
      loadFeedbackStats();
    }
  }, [currentUserId, businessId]);

  // Real-time updates for follower count and feedback
  useEffect(() => {
    if (!businessId) return;

    const channel = supabase
      .channel(`business-follow-${businessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'followers',
          filter: `following_id=eq.${businessId}`
        },
        () => {
          loadFollowStatus();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_feedback',
          filter: `business_id=eq.${businessId}`
        },
        () => {
          loadFeedbackStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'business_profiles',
          filter: `id=eq.${businessId}`
        },
        () => {
          loadFollowStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  async function loadFollowStatus() {
    if (!businessId) return;

    try {
      setLoading(true);
      setError(null);

      // Get follower count from business profile
      const { data: business, error: businessError } = await supabase
        .from('business_profiles')
        .select('follower_count')
        .eq('id', businessId)
        .single();

      if (businessError) {
        throw businessError;
      }

      // Check if current user is following (if logged in)
      let isFollowing = false;
      if (currentUserId) {
        const { data: followData, error: followError } = await supabase
          .from('followers')
          .select('id')
          .eq('follower_id', currentUserId)
          .eq('following_id', businessId)
          .eq('following_type', 'business')
          .single();

        if (followError && followError.code !== 'PGRST116') {
          throw followError;
        }

        isFollowing = !!followData;
      }

      setFollowStatus({
        isFollowing,
        followerCount: business?.follower_count || 0
      });
    } catch (err: any) {
      console.error('Error loading follow status:', err);
      setError(err.message || 'Failed to load follow status');
    } finally {
      setLoading(false);
    }
  }

  async function loadFeedbackStats() {
    if (!businessId) return;

    try {
      // Get all feedback for this business
      const { data: feedback, error: feedbackError } = await supabase
        .from('business_feedback')
        .select('*')
        .eq('business_id', businessId);

      if (feedbackError) {
        throw feedbackError;
      }

      const stats: FeedbackStats = {
        total: feedback?.length || 0,
        positive: feedback?.filter(f => f.rating === 'positive').length || 0,
        negative: feedback?.filter(f => f.rating === 'negative').length || 0,
        hasUserFeedback: false
      };

      // Check if current user has given feedback
      if (currentUserId && feedback) {
        const userFeedback = feedback.find(f => f.user_id === currentUserId);
        if (userFeedback) {
          stats.hasUserFeedback = true;
          stats.userFeedback = userFeedback;
        }
      }

      setFeedbackStats(stats);
    } catch (err: any) {
      console.error('Error loading feedback stats:', err);
    }
  }

  async function toggleFollow() {
    if (!currentUserId) {
      // Redirect to login or show auth modal
      window.location.href = '/auth/signin';
      return;
    }

    if (actionLoading) return;

    try {
      setActionLoading(true);
      setError(null);

      if (followStatus.isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', businessId)
          .eq('following_type', 'business');

        if (error) throw error;

        setFollowStatus(prev => ({
          isFollowing: false,
          followerCount: Math.max(0, prev.followerCount - 1)
        }));

        // Optional: Show success message
        showToast(`Unfollowed ${businessName || 'business'}`, 'success');
      } else {
        // Follow
        const { error } = await supabase
          .from('followers')
          .insert({
            follower_id: currentUserId,
            following_id: businessId,
            following_type: 'business'
          });

        if (error) throw error;

        setFollowStatus(prev => ({
          isFollowing: true,
          followerCount: prev.followerCount + 1
        }));

        // Optional: Show success message
        showToast(`Now following ${businessName || 'business'}!`, 'success');
      }
    } catch (err: any) {
      console.error('Error toggling follow:', err);
      setError(err.message || 'Failed to update follow status');
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  function handleGiveFeedback() {
    if (!currentUserId) {
      window.location.href = '/auth/signin';
      return;
    }
    setShowFeedbackModal(true);
  }

  function handleFeedbackSubmitted() {
    loadFeedbackStats();
    showToast('Feedback submitted successfully!', 'success');
  }

  // Simple toast notification (you can replace with your toast system)
  function showToast(message: string, type: 'success' | 'error') {
    // If you have a toast system, use it here
    // For now, we'll use a simple alert (replace with your toast implementation)
    console.log(`Toast: ${type.toUpperCase()} - ${message}`);
  }

  // Size configurations
  const sizeConfig = {
    small: {
      button: 'px-3 py-1.5 text-sm',
      icon: 'w-4 h-4',
      text: 'text-sm'
    },
    medium: {
      button: 'px-4 py-2 text-base',
      icon: 'w-5 h-5',
      text: 'text-base'
    },
    large: {
      button: 'px-6 py-3 text-lg',
      icon: 'w-6 h-6',
      text: 'text-lg'
    }
  };

  // Variant configurations
  const variantConfig = {
    primary: {
      following: 'bg-green-600 hover:bg-green-700 text-white border-green-600',
      notFollowing: 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600',
      feedback: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
    },
    secondary: {
      following: 'bg-gray-600 hover:bg-gray-700 text-white border-gray-600',
      notFollowing: 'bg-gray-200 hover:bg-gray-300 text-gray-900 border-gray-200',
      feedback: 'bg-gray-200 hover:bg-gray-300 text-gray-900 border-gray-200'
    },
    outline: {
      following: 'border-green-600 text-green-600 hover:bg-green-50',
      notFollowing: 'border-purple-600 text-purple-600 hover:bg-purple-50',
      feedback: 'border-blue-600 text-blue-600 hover:bg-blue-50'
    }
  };

  const config = sizeConfig[size];
  const colors = variantConfig[variant];

  if (loading) {
    return (
      <div className={`inline-flex items-center gap-2 ${config.button} rounded-lg border bg-gray-100 text-gray-400 ${className}`}>
        <div className={`${config.icon} animate-spin rounded-full border-2 border-gray-300 border-t-gray-600`} />
        <span className={config.text}>Loading...</span>
      </div>
    );
  }

  return (
    <>
      <div className="inline-flex items-center gap-2 flex-wrap">
        {/* Follow Button */}
        <button
          onClick={toggleFollow}
          disabled={actionLoading || !currentUserId}
          className={`
            inline-flex items-center gap-2 rounded-lg border font-medium transition-all duration-200
            ${config.button}
            ${followStatus.isFollowing ? colors.following : colors.notFollowing}
            ${actionLoading ? 'opacity-50 cursor-wait' : 'hover:shadow-md active:scale-95'}
            ${!currentUserId ? 'opacity-75' : ''}
            ${className}
          `}
          aria-label={followStatus.isFollowing ? `Unfollow ${businessName}` : `Follow ${businessName}`}
        >
          {actionLoading ? (
            <div className={`${config.icon} animate-spin rounded-full border-2 border-current border-t-transparent`} />
          ) : (
            <span className={config.icon}>
              {followStatus.isFollowing ? '✓' : '+'}
            </span>
          )}
          <span className={config.text}>
            {followStatus.isFollowing ? 'Following' : 'Follow'}
          </span>
        </button>

        {/* Give Feedback Button - Only shown if user is following */}
        {followStatus.isFollowing && currentUserId && (
          <button
            onClick={handleGiveFeedback}
            className={`
              inline-flex items-center gap-2 rounded-lg border font-medium transition-all duration-200
              ${config.button}
              ${colors.feedback}
              hover:shadow-md active:scale-95
            `}
            aria-label={`Give feedback for ${businessName}`}
          >
            <span className={config.icon}>
              {feedbackStats.hasUserFeedback ? '✏️' : '💬'}
            </span>
            <span className={config.text}>
              {feedbackStats.hasUserFeedback ? 'Update Feedback' : 'Give Feedback'}
            </span>
          </button>
        )}

        {/* Follower Count */}
        {showCount && (
          <span className={`text-gray-600 ${config.text} font-medium`}>
            {followStatus.followerCount.toLocaleString()} 
            {followStatus.followerCount === 1 ? ' follower' : ' followers'}
          </span>
        )}

        {/* Feedback Stats - Mobile Friendly */}
        {feedbackStats.total > 0 && (
          <span className={`text-gray-500 ${config.text} text-xs sm:text-sm`}>
            {feedbackStats.positive > 0 && (
              <span className="text-green-600">
                {feedbackStats.positive} 👍
              </span>
            )}
            {feedbackStats.positive > 0 && feedbackStats.negative > 0 && (
              <span className="mx-1">•</span>
            )}
            {feedbackStats.negative > 0 && (
              <span className="text-red-600">
                {feedbackStats.negative} 👎
              </span>
            )}
          </span>
        )}

        {error && (
          <div className="absolute top-full left-0 mt-1 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm whitespace-nowrap z-10">
            {error}
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      <BusinessFeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        businessId={businessId}
        businessName={businessName || 'this business'}
        existingFeedback={feedbackStats.userFeedback}
        onFeedbackSubmitted={handleFeedbackSubmitted}
      />
    </>
  );
}
