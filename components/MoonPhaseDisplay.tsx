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

  // SVG paths for each moon phase
  const getMoonSVG = (phase: MoonPhaseType) => {
    switch (phase) {
      case 'moon-new':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="12" cy="12" r="10" fill="#1f2937" stroke="#4b5563" strokeWidth="0.5"/>
            <circle cx="12" cy="12" r="9" fill="none" stroke="#374151" strokeWidth="0.3" strokeDasharray="1 2" opacity="0.5"/>
          </svg>
        );
      
      case 'moon-first':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="12" cy="12" r="10" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="0.5"/>
            <path d="M12 2 Q17 7 12 12 Q17 17 12 22 Q7 17 12 12 Q7 7 12 2" fill="#1f2937"/>
            <circle cx="12" cy="12" r="9.5" fill="none" stroke="#9ca3af" strokeWidth="0.3" opacity="0.4"/>
          </svg>
        );
      
      case 'moon-full':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="12" cy="12" r="10" fill="#fef3c7" stroke="#fbbf24" strokeWidth="0.5"/>
            <circle cx="9" cy="10" r="1.5" fill="#fde68a" opacity="0.4"/>
            <circle cx="15" cy="14" r="2" fill="#fde68a" opacity="0.3"/>
            <circle cx="11" cy="15" r="1" fill="#fde68a" opacity="0.5"/>
            <circle cx="12" cy="12" r="9.5" fill="none" stroke="#f59e0b" strokeWidth="0.3" opacity="0.6"/>
          </svg>
        );
      
      case 'moon-last':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="12" cy="12" r="10" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="0.5"/>
            <path d="M12 2 Q7 7 12 12 Q7 17 12 22 Q17 17 12 12 Q17 7 12 2" fill="#1f2937"/>
            <circle cx="12" cy="12" r="9.5" fill="none" stroke="#9ca3af" strokeWidth="0.3" opacity="0.4"/>
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
