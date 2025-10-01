'use client';

import { useState } from 'react';
import type { VerificationLevel } from '@/lib/types';

interface Props {
  level: VerificationLevel;
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
    description: 'One or two people have attended their events or used their services',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  verified: {
    icon: '✅',
    label: 'Verified',
    description: 'Multiple people have attended their events with positive experiences',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  }
};

export default function BusinessVerificationBadge({ 
  level, 
  followerCount = 0,
  size = 'medium',
  showTooltip = true,
  className = ''
}: Props) {
  const [showTooltipState, setShowTooltipState] = useState(false);
  
  const config = VERIFICATION_CONFIG[level];
  
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
        {followerCount > 0 && (
          <span className="opacity-75">
            ({followerCount.toLocaleString()})
          </span>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && showTooltipState && (
        <div className={`
          absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2
          bg-gray-900 text-white rounded-lg shadow-lg z-10
          ${styleConfig.tooltip}
          pointer-events-none
        `}>
          <div className="font-semibold mb-1">{config.label}</div>
          <div className="opacity-90">{config.description}</div>
          {followerCount > 0 && (
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

// Utility function to determine verification level based on follower count
export function getVerificationLevel(followerCount: number = 0): VerificationLevel {
  if (followerCount >= 50) return 'verified';
  if (followerCount >= 5) return 'some';
  return 'none';
}

// Utility function to get verification config
export function getVerificationConfig(level: VerificationLevel) {
  return VERIFICATION_CONFIG[level];
}
