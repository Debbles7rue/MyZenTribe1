// components/business/BusinessFollowButton.tsx
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
  onFollowChanged?: () => void;
}

export default function BusinessFollowButton({ 
  businessId, 
  businessName,
  size = 'medium',
  variant = 'primary',
  showCount = true,
  className = '',
  onFollowChanged
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
  const [showToastMessage, setShowToastMessage] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Get current user
  useEffect(() => {
    async function getCurrentUser() {
      console.log('🔍 BusinessFollowButton: Getting current user...');
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('❌ Error getting user:', error);
      }
      const userId = user?.id || null;
      console.log('👤 Current user ID:', userId || 'Not logged in');
      setCurrentUserId(userId);
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
          console.log('🔄 Real-time update: follower changed');
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
          console.log('🔄 Real-time update: feedback changed');
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
          console.log('🔄 Real-time update: business profile changed');
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
      console.log('📊 Loading follow status for business:', businessId);
      setLoading(true);
      setError(null);

      // Get follower count from business profile
      const { data: business, error: businessError } = await supabase
        .from('business_profiles')
        .select('follower_count')
        .eq('id', businessId)
        .single();

      if (businessError) {
        console.error('❌ Error loading business:', businessError);
        throw businessError;
      }

      console.log('✅ Business data loaded, follower_count:', business?.follower_count);

      // Check if current user is following (if logged in)
      let isFollowing = false;
      if (currentUserId) {
        console.log('🔍 Checking if user is following...');
        const { data: followData, error: followError } = await supabase
          .from('followers')
          .select('id')
          .eq('follower_id', currentUserId)
          .eq('following_id', businessId)
          .eq('following_type', 'business')
          .maybeSingle();

        if (followError) {
          console.error('❌ Error checking follow status:', followError);
          // Don't throw, just log
        }

        isFollowing = !!followData;
        console.log('✅ Is following:', isFollowing);
      }

      setFollowStatus({
        isFollowing,
        followerCount: business?.follower_count || 0
      });
    } catch (err: any) {
      console.error('❌ Error loading follow status:', err);
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
        console.error('Error loading feedback:', feedbackError);
        return; // Don't throw, feedback is optional
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
    console.log('🔘 Follow button clicked!');
    console.log('Current user ID:', currentUserId);
    console.log('Business ID:', businessId);
    console.log('Is currently following:', followStatus.isFollowing);

    if (!currentUserId) {
      console.log('❌ No user logged in, redirecting to signin...');
      window.location.href = '/auth/signin';
      return;
    }

    if (actionLoading) {
      console.log('⏳ Action already in progress, ignoring click');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      if (followStatus.isFollowing) {
        // Unfollow
        console.log('👎 Unfollowing business...');
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', businessId)
          .eq('following_type', 'business');

        if (error) {
          console.error('❌ Unfollow error:', error);
          throw error;
        }

        console.log('✅ Successfully unfollowed!');
        setFollowStatus(prev => ({
          isFollowing: false,
          followerCount: Math.max(0, prev.followerCount - 1)
        }));

        showToast(`Unfollowed ${businessName || 'business'}`, 'success');
        
        // Call parent callback if provided
        if (onFollowChanged) {
          console.log('🔄 Calling onFollowChanged callback');
          onFollowChanged();
        }
      } else {
        // Follow
        console.log('👍 Following business...');
        const { error } = await supabase
          .from('followers')
          .insert({
            follower_id: currentUserId,
            following_id: businessId,
            following_type: 'business'
          });

        if (error) {
          console.error('❌ Follow error:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          throw error;
        }

        console.log('✅ Successfully followed!');
        setFollowStatus(prev => ({
          isFollowing: true,
          followerCount: prev.followerCount + 1
        }));

        showToast(`Now following ${businessName || 'business'}!`, 'success');
        
        // Call parent callback if provided
        if (onFollowChanged) {
          console.log('🔄 Calling onFollowChanged callback');
          onFollowChanged();
        }
      }
    } catch (err: any) {
      console.error('❌ Error toggling follow:', err);
      const errorMessage = err.message || 'Failed to update follow status';
      setError(errorMessage);
      showToast(errorMessage, 'error');
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

  function showToast(message: string, type: 'success' | 'error') {
    console.log(`Toast: ${type.toUpperCase()} - ${message}`);
    setShowToastMessage({ message, type });
    setTimeout(() => setShowToastMessage(null), 3000);
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
      following: 'border-green-600 text-green-600 hover:bg-green-50 bg-white',
      notFollowing: 'border-purple-600 text-purple-600 hover:bg-purple-50 bg-white',
      feedback: 'border-blue-600 text-blue-600 hover:bg-blue-50 bg-white'
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
      <div className="relative inline-flex flex-col gap-2">
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
        </div>

        {/* Error Message - More visible */}
        {error && (
          <div className="w-full p-3 bg-red-100 border-2 border-red-400 rounded-lg text-red-800 text-sm font-medium shadow-lg">
            ⚠️ {error}
          </div>
        )}

        {/* Toast Notification */}
        {showToastMessage && (
          <div className={`
            fixed top-4 right-4 left-4 sm:left-auto sm:w-96 p-4 rounded-lg shadow-2xl z-50 
            ${showToastMessage.type === 'success' ? 'bg-green-600' : 'bg-red-600'} 
            text-white font-medium animate-slide-in
          `}>
            {showToastMessage.type === 'success' ? '✅' : '❌'} {showToastMessage.message}
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

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
