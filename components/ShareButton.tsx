// components/ShareButton.tsx
'use client';

import { useState } from 'react';

interface Props {
  url?: string; // If not provided, uses current page URL
  title?: string;
  text?: string;
  size?: 'small' | 'medium';
  variant?: 'icon' | 'text' | 'both';
  className?: string;
}

export default function ShareButton({ 
  url,
  title,
  text,
  size = 'small',
  variant = 'both',
  className = ''
}: Props) {
  const [showToast, setShowToast] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareTitle = title || (typeof document !== 'undefined' ? document.title : '');

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: text,
          url: shareUrl
        });
        console.log('✅ Shared successfully');
        setShowMenu(false);
      } catch (err: any) {
        // User cancelled share or error occurred
        if (err.name !== 'AbortError') {
          console.error('❌ Error sharing:', err);
          // Fallback to copy
          handleCopyLink();
        }
      }
    } else {
      // Fallback to copy if Web Share API not available
      handleCopyLink();
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      console.log('✅ Link copied to clipboard');
      showCopiedToast();
      setShowMenu(false);
    } catch (err) {
      console.error('❌ Error copying to clipboard:', err);
      // Fallback for older browsers
      fallbackCopyToClipboard(shareUrl);
    }
  }

  function fallbackCopyToClipboard(text: string) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      showCopiedToast();
      setShowMenu(false);
    } catch (err) {
      console.error('❌ Fallback copy failed:', err);
    }
    
    document.body.removeChild(textArea);
  }

  function showCopiedToast() {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }

  function handleButtonClick() {
    // If native share is available, use it directly
    // Otherwise, show menu with options
    if (navigator.share) {
      handleNativeShare();
    } else {
      setShowMenu(!showMenu);
    }
  }

  const sizeClasses = {
    small: 'px-2 py-1 text-xs',
    medium: 'px-3 py-2 text-sm'
  };

  const iconSize = size === 'small' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div className="relative">
      <button
        onClick={handleButtonClick}
        className={`
          inline-flex items-center gap-1.5 
          border border-gray-300 text-gray-600 
          rounded-lg hover:bg-gray-50 hover:border-gray-400 
          transition-colors font-medium
          ${sizeClasses[size]}
          ${className}
        `}
        aria-label="Share"
        title="Share"
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
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" 
            />
          </svg>
        )}
        {(variant === 'text' || variant === 'both') && (
          <span>Share</span>
        )}
      </button>

      {/* Share Menu (only shows if no native share) */}
      {showMenu && !navigator.share && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowMenu(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px] overflow-hidden">
            <button
              onClick={handleCopyLink}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Link
            </button>
          </div>
        </>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-auto sm:min-w-[200px] bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-slide-in">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">Link copied to clipboard!</span>
        </div>
      )}

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
    </div>
  );
}
