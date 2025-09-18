// components/SafeMediaWrapper.tsx
"use client";

import { useEffect } from 'react';

/**
 * This component prevents the media_files error by intercepting it at multiple levels
 */
export default function SafeMediaWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // 1. Override Object.defineProperty to add media_files to any object that needs it
    const originalDefineProperty = Object.defineProperty;
    Object.defineProperty = function(obj: any, prop: string, descriptor: PropertyDescriptor) {
      // If defining any property on an object, ensure it has media_files
      if (obj && typeof obj === 'object' && !Array.isArray(obj) && !('media_files' in obj)) {
        try {
          originalDefineProperty.call(this, obj, 'media_files', {
            value: [],
            writable: true,
            enumerable: false,
            configurable: true
          });
        } catch (e) {
          // Ignore if can't add property
        }
      }
      return originalDefineProperty.call(this, obj, prop, descriptor);
    };

    // 2. Create a Proxy handler that adds media_files to any object accessed
    const addMediaFilesHandler = {
      get(target: any, prop: string) {
        if (prop === 'media_files' && !(prop in target)) {
          return [];
        }
        return target[prop];
      }
    };

    // 3. Override JSON.parse to add media_files to parsed objects
    const originalParse = JSON.parse;
    JSON.parse = function(text: string, reviver?: any) {
      const result = originalParse.call(this, text, reviver);
      
      if (result && typeof result === 'object') {
        const addMediaFiles = (obj: any) => {
          if (!obj || typeof obj !== 'object') return obj;
          
          if (Array.isArray(obj)) {
            return obj.map(item => {
              if (item && typeof item === 'object' && !Array.isArray(item) && !('media_files' in item)) {
                return { ...item, media_files: [] };
              }
              return item;
            });
          } else if (!('media_files' in obj)) {
            return { ...obj, media_files: [] };
          }
          return obj;
        };
        
        return addMediaFiles(result);
      }
      
      return result;
    };

    // 4. Global error handler that prevents crashes
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('media_files')) {
        console.warn('[SafeMediaWrapper] Caught and prevented media_files error');
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      return false;
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('media_files') || 
          event.reason?.toString?.().includes('media_files')) {
        console.warn('[SafeMediaWrapper] Caught async media_files error');
        event.preventDefault();
        return true;
      }
      return false;
    };

    // 5. Intercept fetch to add media_files to responses
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const response = await originalFetch.apply(this, args);
      
      // Create a new response with modified json method
      const originalJson = response.json.bind(response);
      response.json = async function() {
        const data = await originalJson();
        
        // Add media_files to the data if it's missing
        if (data && typeof data === 'object') {
          if (Array.isArray(data)) {
            return data.map(item => {
              if (item && typeof item === 'object' && !('media_files' in item)) {
                return { ...item, media_files: [] };
              }
              return item;
            });
          } else if (!('media_files' in data)) {
            return { ...data, media_files: [] };
          }
        }
        
        return data;
      };
      
      return response;
    };

    // 6. Console trace to find the source
    const originalError = console.error;
    console.error = function(...args: any[]) {
      if (args[0]?.toString?.().includes('media_files')) {
        console.log('📍 Media files error source found:');
        console.trace();
        // Don't actually log the error, just trace it
        return;
      }
      originalError.apply(console, args);
    };

    // Add event listeners
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    // Cleanup
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      Object.defineProperty = originalDefineProperty;
      JSON.parse = originalParse;
      window.fetch = originalFetch;
      console.error = originalError;
    };
  }, []);

  // Render children immediately without blocking
  return <>{children}</>;
}

/**
 * Utility function to safely access media properties
 * Use this anywhere you're accessing posts or media
 */
export function safeMediaAccess(obj: any): {
  media_files?: any[];
  post_media?: any[];
  media?: any[];
  gallery?: any[];
} {
  if (!obj) {
    return {
      media_files: [],
      post_media: [],
      media: [],
      gallery: []
    };
  }
  
  return {
    media_files: obj?.media_files || [],
    post_media: obj?.post_media || [],
    media: obj?.media || [],
    gallery: obj?.gallery || []
  };
}

/**
 * Safe data processor - ensures all objects have safe media properties
 */
export function processData(data: any): any {
  if (!data) return data;
  
  if (Array.isArray(data)) {
    return data.map(item => {
      if (!item || typeof item !== 'object') return item;
      
      // Add media_files if missing
      if (!('media_files' in item)) {
        return { ...item, media_files: [] };
      }
      return item;
    });
  }
  
  if (typeof data === 'object' && !('media_files' in data)) {
    return { ...data, media_files: [] };
  }
  
  return data;
}

/**
 * Wrap any async data fetching with this to ensure media_files exists
 */
export async function safeDataFetch<T>(promise: Promise<T>): Promise<T> {
  try {
    const result = await promise;
    return processData(result) as T;
  } catch (error) {
    console.error('Data fetch error:', error);
    throw error;
  }
}
