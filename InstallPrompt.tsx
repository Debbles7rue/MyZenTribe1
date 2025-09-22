// FILE NAME: InstallPrompt.tsx
// LOCATION: components/InstallPrompt.tsx
// OPTIONAL: Only add this if you want an install prompt for users
// components/InstallPrompt.tsx
'use client';

import { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');
    
    setIsStandalone(isInStandaloneMode);

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Don't show prompt if already installed or if user dismissed it recently
    if (isInStandaloneMode || localStorage.getItem('installPromptDismissed')) {
      return;
    }

    // Listen for the beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show the prompt after a delay if not installed
    if (isIOSDevice && !isInStandaloneMode) {
      setTimeout(() => {
        setShowInstallPrompt(true);
      }, 3000); // Show after 3 seconds
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!isIOS && deferredPrompt) {
      // Android/Chrome installation
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Remember that user dismissed it
    localStorage.setItem('installPromptDismissed', 'true');
    // Clear the dismissal after 7 days
    setTimeout(() => {
      localStorage.removeItem('installPromptDismissed');
    }, 7 * 24 * 60 * 60 * 1000);
  };

  if (!showInstallPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-50 animate-slide-up">
      <div className="max-w-screen-sm mx-auto">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center">
            <span className="text-white text-xl">🌟</span>
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">
              Install MyZenTribe
            </h3>
            
            {isIOS ? (
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Add to your home screen for quick access
                </p>
                <div className="bg-purple-50 rounded-lg p-3 text-xs">
                  <p className="text-purple-900 mb-2">
                    <strong>How to install:</strong>
                  </p>
                  <ol className="text-purple-700 space-y-1">
                    <li>1. Tap the <span className="inline-block px-1">⬆️</span> Share button below</li>
                    <li>2. Scroll and tap "Add to Home Screen"</li>
                    <li>3. Tap "Add" to install</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Install our app for a better experience with offline access and faster loading
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleInstallClick}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                  >
                    Install App
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-4 py-2 text-gray-600 text-sm hover:text-gray-800 transition-colors"
                  >
                    Not now
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Add this CSS to your global styles or create a CSS module
const styles = `
@keyframes slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
`;
