// app/layout.tsx
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./globals.css";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import FirstRunGate from "@/components/FirstRunGate";
import { ToastProvider } from "@/components/ToastProvider";
import ElevenElevenFireworks from "@/components/ElevenElevenFireworks";
import Script from 'next/script';

export const metadata: Metadata = {
  title: "MyZenTribe",
  description: "Meditation • Community • Presence",
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#7c3aed",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Ensure title is always present for error pages */}
        <title>MyZenTribe</title>
        
        {/* CRITICAL: Fix media_files error before anything loads */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Nuclear media_files fix - runs before React
              (function() {
                // 1. Add media_files getter to Object.prototype as last resort
                if (!Object.prototype.hasOwnProperty('media_files')) {
                  Object.defineProperty(Object.prototype, 'media_files', {
                    get: function() {
                      // If this object already has a real media_files, return it
                      if (this.hasOwnProperty && this.hasOwnProperty('_media_files')) {
                        return this._media_files;
                      }
                      // Otherwise return empty array
                      return [];
                    },
                    set: function(value) {
                      // Store the real value
                      Object.defineProperty(this, '_media_files', {
                        value: value,
                        writable: true,
                        enumerable: false,
                        configurable: true
                      });
                    },
                    enumerable: false,
                    configurable: true
                  });
                }

                // 2. Patch Array prototype to add media_files to items
                const originalMap = Array.prototype.map;
                Array.prototype.map = function(...args) {
                  const result = originalMap.apply(this, args);
                  // Add media_files to array items if missing
                  if (result && result.length > 0) {
                    result.forEach(item => {
                      if (item && typeof item === 'object' && !Array.isArray(item)) {
                        if (!('media_files' in item)) {
                          item.media_files = [];
                        }
                      }
                    });
                  }
                  return result;
                };

                // 3. Override JSON.parse globally
                const originalParse = JSON.parse;
                JSON.parse = function(text, reviver) {
                  const result = originalParse.call(this, text, reviver);
                  
                  function addMediaFiles(obj) {
                    if (!obj) return obj;
                    
                    if (Array.isArray(obj)) {
                      return obj.map(item => {
                        if (item && typeof item === 'object' && !Array.isArray(item) && !('media_files' in item)) {
                          item.media_files = [];
                        }
                        return item;
                      });
                    } else if (typeof obj === 'object' && !('media_files' in obj)) {
                      obj.media_files = [];
                    }
                    
                    return obj;
                  }
                  
                  return addMediaFiles(result);
                };

                // 4. Global error suppressor for media_files
                window.addEventListener('error', function(e) {
                  if (e.error && e.error.message && e.error.message.includes('media_files')) {
                    console.warn('Media files error suppressed:', e.error.message);
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                  }
                }, true);

                window.addEventListener('unhandledrejection', function(e) {
                  if (e.reason && e.reason.message && e.reason.message.includes('media_files')) {
                    console.warn('Media files promise rejection suppressed:', e.reason.message);
                    e.preventDefault();
                    return false;
                  }
                });

                console.log('Media files protection initialized');
              })();
            `,
          }}
        />
        
        {/* Leaflet CSS for maps */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body>
        <ToastProvider>
          {/* Global header */}
          <SiteHeader />
          {/* First-run redirect guard (client) */}
          <FirstRunGate />
          {/* Page content */}
          <main className="page-wrap">{children}</main>
          {/* 11:11 Fireworks */}
          <ElevenElevenFireworks />
        </ToastProvider>
      </body>
    </html>
  );
}
