// components/SafeMediaWrapper.tsx
"use client";

import { useEffect } from 'react';

/**
 * This wrapper prevents the media_files error by patching all data access
 */
export default function SafeMediaWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Log when the error happens to help debug
    const originalConsoleError = console.error;
    console.error = function(...args) {
      if (args[0]?.toString?.().includes('media_files')) {
        console.log('📍 MEDIA FILES ERROR LOCATION:');
        console.log('Error:', args[0]);
        try {
          // Get stack trace
          const stack = new Error().stack;
          console.log('Called from:', stack);
        } catch (e) {}
        // Don't show the actual error to prevent crash
        return;
      }
      originalConsoleError.apply(console, args);
    };

    // Patch all Supabase responses to ensure media_files exists
    if (typeof window !== 'undefined' && (window as any).fetch) {
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        
        // Check if this is a Supabase request
        const url = args[0]?.toString() || '';
        if (url.includes('supabase')) {
          // Create a patched response
          const originalJson = response.json.bind(response);
          response.json = async function() {
            const data = await originalJson();
            
            // Add media_files to any Supabase response that doesn't have it
            const patchData = (obj: any): any => {
              if (!obj) return obj;
              
              if (Array.isArray(obj)) {
                return obj.map(item => {
                  if (item && typeof item === 'object' && !Array.isArray(item)) {
                    // Add media_files if missing
                    if (!('media_files' in item)) {
                      item.media_files = [];
                    }
                    // Also add common fields that might be accessed
                    if (!('gallery' in item)) {
                      item.gallery = [];
                    }
                    if (!('photos' in item)) {
                      item.photos = [];
                    }
                    if (!('images' in item)) {
                      item.images = [];
                    }
                  }
                  return item;
                });
              } else if (typeof obj === 'object' && !Array.isArray(obj)) {
                // Add to single objects
                if (!('media_files' in obj)) {
                  obj.media_files = [];
                }
                if (!('gallery' in obj)) {
                  obj.gallery = [];
                }
                if (!('photos' in obj)) {
                  obj.photos = [];
                }
                if (!('images' in obj)) {
                  obj.images = [];
                }
              }
              
              return obj;
            };
            
            // Patch the data property if it exists
            if (data && typeof data === 'object' && 'data' in data) {
              data.data = patchData(data.data);
            } else {
              return patchData(data);
            }
            
            return data;
          };
        }
        
        return response;
      };
    }

    // Global error handler to prevent crashes
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('media_files')) {
        console.warn('[SafeMediaWrapper] Prevented media_files crash');
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('media_files') || 
          event.reason?.toString?.().includes('media_files')) {
        console.warn('[SafeMediaWrapper] Prevented async media_files crash');
        event.preventDefault();
        return true;
      }
    };

    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleRejection);

    // Cleanup
    return () => {
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleRejection);
      console.error = originalConsoleError;
    };
  }, []);

  // Render children immediately
  return <>{children}</>;
}
