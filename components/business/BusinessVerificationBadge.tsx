'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { VerificationLevel, FeedbackStats } from '@/lib/types';

interface Props {
  level?: VerificationLevel;
  businessId?: string;
  followerCount?: number;
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
  className?: string;
}

const VERIFICATION_CONFIG = {
  none: {
    icon: '⚠️',
    label: 'Non-verified',
    description: 'New to the platform - no feedback yet, attendees should use caution',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200'
  },
  some: {
    icon: '⭐',
    label: 'Some Social Credibility',
    description: 'At least 3 people have given positive feedback about their services or events',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  verified: {
    icon: '✅',
    label: 'Verified',
    description: '10+ people have given positive feedback with great experiences',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  }
};

export default function BusinessVerificationBadge({ 
  level,
  businessId,
  followerCount = 0,
  size = 'medium',
  showTooltip = true,
  className = ''
}: Props) {
  const [showTooltipState, setShowTooltipState] = useState(false);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats>({
    total: 0,
    positive: 0,
    negative: 0,
    hasUserFeedback: false
  });
  const [computedLevel, setComputedLevel] = useState<VerificationLevel>(level || 'none');

  // Load feedback data and compute verification level
  useEffect(() => {
    if (businessId) {
      loadFeedbackStats();
    } else if (level) {
      setComputedLevel(level);
    } else {
      // Fallback to follower-based verification if no businessId or level provided
      setComputedLevel(getVerificationLevelFromFollowers(followerCount));
    }
  }, [businessId, level, followerCount]);

  // Real-time updates for feedback changes
  useEffect(() => {
    if (!businessId) return;

    const channel = supabase
      .channel(`business-verification-${businessId}`)
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  async function loadFeedbackStats() {
    if (!businessId) return;

    try {
      const { data: feedback, error } = await supabase
        .from('business_feedback')
        .select('rating')
        .eq('business_id', businessId);

      if (error) {
        console.error('Error loading feedback stats:', error);
        return;
      }

      const stats: FeedbackStats = {
        total: feedback?.length || 0,
        positive: feedback?.filter(f => f.rating === 'positive').length || 0,
        negative: feedback?.filter(f => f.rating === 'negative').length || 0,
        hasUserFeedback: false
      };

      setFeedbackStats(stats);
      
      // Compute verification level based on feedback
      const newLevel = getVerificationLevelFromFeedback(stats.positive, stats.negative);
      setComputedLevel(newLevel);
    } catch (err) {
      console.error('Error loading feedback stats:', err);
    }
  }
  
  const config = VERIFICATION_CONFIG[computedLevel];
  
  // Size configurations
  const sizeConfig = {
    small: {
      badge: 'px-2 py-1 text-xs',
      icon: 'text-sm',
      tooltip: 'text-xs max-w-xs'
    },
    medium: {
      badge: 'px-3 py-1.5 text-sm',
      icon: 'text-base',
      tooltip: 'text-sm max-w-sm'
    },
    large: {
      badge: 'px-4 py-2 text-base',
      icon: 'text-lg',
      tooltip: 'text-base max-w-md'
    }
  };

  const styleConfig = sizeConfig[size];

  return (
    <div className="relative inline-flex">
      <div
        className={`
          inline-flex items-center gap-1.5 rounded-full border font-medium
          ${styleConfig.badge}
          ${config.color}
          ${config.bgColor}
          ${config.borderColor}
          ${showTooltip ? 'cursor-help' : ''}
          ${className}
        `}
        onMouseEnter={() => showTooltip && setShowTooltipState(true)}
        onMouseLeave={() => showTooltip && setShowTooltipState(false)}
        aria-label={`${config.label}: ${config.description}`}
      >
        <span className={styleConfig.icon}>{config.icon}</span>
        <span>{config.label}</span>
        
        {/* Show feedback count if we have businessId and feedback data */}
        {businessId && feedbackStats.total > 0 && (
          <span className="opacity-75">
            ({feedbackStats.positive} 👍)
          </span>
        )}
        
        {/* Fallback to follower count if no feedback data */}
        {!businessId && followerCount > 0 && (
          <span className="opacity-75">
            ({followerCount.toLocaleString()})
          </span>
        )}
      </div>

      {/* Enhanced Tooltip with feedback details */}
      {showTooltip && showTooltipState && (
        <div className={`
          absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2
          bg-gray-900 text-white rounded-lg shadow-lg z-10
          ${styleConfig.tooltip}
          pointer-events-none
        `}>
          <div className="font-semibold mb-1">{config.label}</div>
          <div className="opacity-90">{config.description}</div>
          
          {/* Show feedback stats if available */}
          {businessId && feedbackStats.total > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <div className="text-xs space-y-1">
                <div>
                  <span className="text-green-400">{feedbackStats.positive} positive</span>
                  {feedbackStats.negative > 0 && (
                    <>
                      <span className="mx-1">•</span>
                      <span className="text-red-400">{feedbackStats.negative} negative</span>
                    </>
                  )}
                </div>
                <div className="opacity-75">
                  Based on real user experiences
                </div>
              </div>
            </div>
          )}
          
          {/* Fallback to follower info */}
          {!businessId && followerCount > 0 && (
            <div className="mt-1 text-xs opacity-75">
              {followerCount.toLocaleString()} follower{followerCount !== 1 ? 's' : ''}
            </div>
          )}
          
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

// NEW: Utility function to determine verification level based on feedback
export function getVerificationLevelFromFeedback(
  positiveCount: number = 0, 
  negativeCount: number = 0
): VerificationLevel {
  // If there's significant negative feedback, reduce the threshold
  const negativePenalty = negativeCount * 2; // Each negative feedback counts as 2 against
  const effectivePositive = Math.max(0, positiveCount - negativePenalty);
  
  if (effectivePositive >= 10) return 'verified';
  if (effectivePositive >= 3) return 'some';
  return 'none';
}

// UPDATED: Legacy utility function for follower-based verification (fallback)
export function getVerificationLevelFromFollowers(followerCount: number = 0): VerificationLevel {
  if (followerCount >= 50) return 'verified';
  if (followerCount >= 5) return 'some';
  return 'none';
}

// LEGACY: Keep this for backward compatibility
export function getVerificationLevel(followerCount: number = 0): VerificationLevel {
  return getVerificationLevelFromFollowers(followerCount);
}

// Utility function to get verification config
export function getVerificationConfig(level: VerificationLevel) {
  return VERIFICATION_CONFIG[level];
}
