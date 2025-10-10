// components/MoonPhaseDisplay.tsx
"use client";

import React from "react";
import { Tooltip } from "@/components/ui/tooltip";

export type MoonPhaseType = 'moon-new' | 'moon-first' | 'moon-full' | 'moon-last';

interface MoonPhaseDisplayProps {
  phase: MoonPhaseType;
  date?: Date;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}

const MoonPhaseDisplay: React.FC<MoonPhaseDisplayProps> = ({
  phase,
  date,
  size = 'small',
  showLabel = false,
  clickable = false,
  onClick
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'small': return 'w-5 h-5 md:w-6 md:h-6';
      case 'medium': return 'w-7 h-7 md:w-8 md:h-8';
      case 'large': return 'w-10 h-10 md:w-12 md:h-12';
      default: return 'w-5 h-5 md:w-6 md:h-6';
    }
  };

  const getPhaseLabel = (phase: MoonPhaseType): string => {
    switch (phase) {
      case 'moon-new': return 'New Moon';
      case 'moon-first': return 'First Quarter';
      case 'moon-full': return 'Full Moon';
      case 'moon-last': return 'Last Quarter';
      default: return 'Moon Phase';
    }
  };

  const getPhaseDescription = (phase: MoonPhaseType): string => {
    switch (phase) {
      case 'moon-new': 
        return 'Time for new beginnings and setting intentions';
      case 'moon-first': 
        return 'Time for taking action and making decisions';
      case 'moon-full': 
        return 'Time for gratitude, release, and celebration';
      case 'moon-last': 
        return 'Time for reflection, rest, and letting go';
      default: 
        return '';
    }
  };

  // Enhanced SVG designs for each moon phase
  const getMoonSVG = (phase: MoonPhaseType) => {
    switch (phase) {
      case 'moon-new':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <defs>
              <radialGradient id="new-moon-gradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#2d3748" />
                <stop offset="100%" stopColor="#1a202c" />
              </radialGradient>
            </defs>
            {/* Outer glow */}
            <circle cx="12" cy="12" r="10.5" fill="none" stroke="#4a5568" strokeWidth="0.3" opacity="0.3"/>
            {/* Main moon body */}
            <circle cx="12" cy="12" r="10" fill="url(#new-moon-gradient)" stroke="#4a5568" strokeWidth="0.4"/>
            {/* Subtle surface texture */}
            <circle cx="12" cy="12" r="9.5" fill="none" stroke="#374151" strokeWidth="0.2" strokeDasharray="2 3" opacity="0.4"/>
          </svg>
        );
      
      case 'moon-first':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            {/* Outer subtle glow */}
            <circle cx="12" cy="12" r="10.5" fill="none" stroke="#fbbf24" strokeWidth="0.3" opacity="0.2"/>
            {/* Dark half (left side) - solid dark gray */}
            <path 
              d="M 12 2 A 10 10 0 0 0 12 22 Z" 
              fill="#374151"
              stroke="#4a5568" 
              strokeWidth="0.3"
            />
            {/* Light half (right side) - solid bright color */}
            <path 
              d="M 12 2 A 10 10 0 0 1 12 22 Z" 
              fill="#fef3c7"
              stroke="#f59e0b" 
              strokeWidth="0.3"
            />
            {/* Craters on light side */}
            <circle cx="15" cy="10" r="1" fill="#fde68a" opacity="0.5"/>
            <circle cx="16" cy="15" r="0.7" fill="#fde68a" opacity="0.4"/>
            {/* Center line for definition */}
            <line x1="12" y1="2" x2="12" y2="22" stroke="#6b7280" strokeWidth="0.4" opacity="0.4"/>
          </svg>
        );
      
      case 'moon-full':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <defs>
              <radialGradient id="full-moon-gradient" cx="40%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#fffef7" />
                <stop offset="40%" stopColor="#fef9e7" />
                <stop offset="80%" stopColor="#fde68a" />
                <stop offset="100%" stopColor="#fbbf24" />
              </radialGradient>
            </defs>
            {/* Outer glow effect */}
            <circle cx="12" cy="12" r="11" fill="#fef3c7" opacity="0.3"/>
            <circle cx="12" cy="12" r="10.5" fill="#fef3c7" opacity="0.2"/>
            {/* Main moon body */}
            <circle cx="12" cy="12" r="10" fill="url(#full-moon-gradient)" stroke="#f59e0b" strokeWidth="0.3"/>
            {/* Craters for realism */}
            <circle cx="9" cy="9" r="1.5" fill="#fde68a" opacity="0.4"/>
            <circle cx="15" cy="11" r="1.8" fill="#fde68a" opacity="0.35"/>
            <circle cx="11" cy="15" r="1" fill="#fde68a" opacity="0.45"/>
            <circle cx="16" cy="16" r="1.2" fill="#fde68a" opacity="0.4"/>
            {/* Surface details */}
            <ellipse cx="13" cy="13" rx="2.5" ry="1.5" fill="#fde68a" opacity="0.25" transform="rotate(-20 13 13)"/>
          </svg>
        );
      
      case 'moon-last':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            {/* Outer subtle glow */}
            <circle cx="12" cy="12" r="10.5" fill="none" stroke="#fbbf24" strokeWidth="0.3" opacity="0.2"/>
            {/* Light half (left side) - solid bright color */}
            <path 
              d="M 12 2 A 10 10 0 0 0 12 22 Z" 
              fill="#fef3c7"
              stroke="#f59e0b" 
              strokeWidth="0.3"
            />
            {/* Dark half (right side) - solid dark gray */}
            <path 
              d="M 12 2 A 10 10 0 0 1 12 22 Z" 
              fill="#374151"
              stroke="#4a5568" 
              strokeWidth="0.3"
            />
            {/* Craters on light side */}
            <circle cx="9" cy="10" r="1" fill="#fde68a" opacity="0.5"/>
            <circle cx="8" cy="15" r="0.7" fill="#fde68a" opacity="0.4"/>
            {/* Center line for definition */}
            <line x1="12" y1="2" x2="12" y2="22" stroke="#6b7280" strokeWidth="0.4" opacity="0.4"/>
          </svg>
        );
      
      default:
        return null;
    }
  };

  const handleClick = () => {
    if (clickable && onClick) {
      onClick();
    }
  };

  const label = getPhaseLabel(phase);
  const description = getPhaseDescription(phase);
  
  const moonIcon = (
    <div 
      className={`
        ${getSizeClasses()} 
        ${clickable ? 'cursor-pointer hover:scale-110 transition-transform duration-200' : ''}
        inline-flex items-center justify-center
        drop-shadow-sm
      `}
      onClick={handleClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={label}
    >
      {getMoonSVG(phase)}
    </div>
  );

  const content = (
    <div className="flex items-center gap-1 md:gap-2">
      {moonIcon}
      {showLabel && (
        <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
      )}
    </div>
  );

  // If we have a description, wrap in tooltip
  if (description && !showLabel) {
    return (
      <Tooltip>
        <Tooltip.Trigger asChild>
          {content}
        </Tooltip.Trigger>
        <Tooltip.Content>
          <div className="max-w-xs">
            <p className="font-semibold text-sm">{label}</p>
            {date && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}
            <p className="text-xs mt-1">{description}</p>
          </div>
        </Tooltip.Content>
      </Tooltip>
    );
  }

  return content;
};

// Export a simplified version for calendar grid cells
export const MoonPhaseIcon: React.FC<{ phase: MoonPhaseType }> = ({ phase }) => {
  return <MoonPhaseDisplay phase={phase} size="small" clickable={false} />;
};

// Export helper function to get moon phase from resource
export const getMoonPhaseFromResource = (resource: any): MoonPhaseType | null => {
  if (resource?.moonPhase) {
    return resource.moonPhase as MoonPhaseType;
  }
  return null;
};

export default MoonPhaseDisplay;
