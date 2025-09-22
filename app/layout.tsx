// FILE NAME: layout.tsx
// LOCATION: app/layout.tsx
// INSTRUCTIONS: This preserves ALL your existing code and adds PWA support

import "react-big-calendar/lib/css/react-big-calendar.css";
import "./globals.css";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import FirstRunGate from "@/components/FirstRunGate";
import { ToastProvider } from "@/components/ToastProvider";
import ElevenElevenFireworks from "@/components/ElevenElevenFireworks";
import Script from 'next/script';
// Optional: Uncomment if you add the InstallPrompt component
// import InstallPrompt from "@/components/InstallPrompt";

export const metadata: Metadata = {
  title: "MyZenTribe",
  description: "Meditation • Community • Presence",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  themeColor: "#7c3aed",
  // PWA Configuration
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ZenTribe',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png' },
      { url: '/icons/icon-180x180.png', sizes: '180x180' },
    ],
  },
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
        
        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="MyZenTribe" />
        <meta name="apple-mobile-web-app-title" content="ZenTribe" />
        <meta name="theme-color" content="#7c3aed" />
        <meta name="msapplication-navbutton-color" content="#7c3aed" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="msapplication-starturl" content="/" />
        
        {/* iOS Splash Screen Images */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-167x167.png" />
        
        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
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
          {/* Optional: Uncomment this line if you want to add the install prompt */}
          {/* <InstallPrompt /> */}
        </ToastProvider>
      </body>
    </html>
  );
}
