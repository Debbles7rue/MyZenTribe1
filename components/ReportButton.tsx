// components/ReportButton.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import ReportModal from './ReportModal';
import type { ContentReport } from '@/lib/admin-types';

interface Props {
  contentType: ContentReport['content_type'];
  contentId: string;
  contentName?: string;
  size?: 'small' | 'medium';
  variant?: 'icon' | 'text' | 'both';
  className?: string;
}

export default function ReportButton({ 
  contentType, 
  contentId, 
  contentName,
  size = 'small',
  variant = 'both',
  className = ''
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    setIsLoggedIn(!!user);
    setCheckingAuth(false);
  }

  function handleClick() {
    if (!isLoggedIn) {
      // Redirect to sign in
      const currentPath = window.location.pathname;
      window.location.href = `/auth/signin?next=${encodeURIComponent(currentPath)}`;
      return;
    }
    setShowModal(true);
  }

  const sizeClasses = {
    small: 'px-2 py-1 text-xs',
    medium: 'px-3 py-2 text-sm'
  };

  const iconSize = size === 'small' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  if (checkingAuth) {
    return null; // or return a skeleton loader if you prefer
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`
          inline-flex items-center gap-1.5 
          border border-gray-300 text-gray-600 
          rounded-lg hover:bg-gray-50 hover:border-gray-400 
          transition-colors font-medium
          ${sizeClasses[size]}
          ${className}
        `}
        aria-label={`Report this ${contentType}`}
        title={`Report this ${contentType}`}
      >
        {(variant === 'icon' || variant === 'both') && (
          <svg 
            className={iconSize} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" 
            />
          </svg>
        )}
        {(variant === 'text' || variant === 'both') && (
          <span>Report</span>
        )}
      </button>

      <ReportModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        contentType={contentType}
        contentId={contentId}
        contentName={contentName}
      />
    </>
  );
}
