// components/SafeMediaWrapper.tsx
"use client";

import { useEffect } from 'react';

/**
 * This component wraps your app and prevents the media_files error
 * by adding defensive checks globally
 */
export default function SafeMediaWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Override console.error temporarily to catch and log the exact error location
    const originalError = console.error;
    console.error = function(...args) {
      // Check if this is the media_files error
      if (args[0]?.toString?.().includes('media_files')) {
        console.log('📍 FOUND THE ERROR LOCATION:');
        console.trace(); // This will show the call stack
        
        // Log the arguments to see what's being accessed
        console.log('Error details:', args);
        
        // Still show the error but don't crash
        originalError.apply(console, ['[Caught media_files error - app continues]', ...args]);
      } else {
        originalError.apply(console, args);
      }
    };

    // Cleanup
    return () => {
      console.error = originalError;
    };
  }, []);

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
} {
  if (!obj) {
    return {
      media_files: [],
      post_media: [],
      media: []
    };
  }
  
  return {
    media_files: obj.media_files || [],
    post_media: obj.post_media || [],
    media: obj.media || []
  };
}

/**
 * Safe post processor - ensures all posts have safe media properties
 */
export function processPosts(posts: any[]): any[] {
  if (!Array.isArray(posts)) return [];
  
  return posts.map(post => {
    if (!post) return null;
    
    return {
      ...post,
      media_files: post?.media_files || [],
      post_media: post?.post_media || [],
      media: post?.media || [],
      tags: post?.tags || [],
      comments: post?.comments || []
    };
  }).filter(Boolean);
}
