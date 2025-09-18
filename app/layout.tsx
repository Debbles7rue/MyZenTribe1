// app/layout.tsx
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./globals.css";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import FirstRunGate from "@/components/FirstRunGate";
import { ToastProvider } from "@/components/ToastProvider";
import ElevenElevenFireworks from "@/components/ElevenElevenFireeworks";
import SafeMediaWrapper from "@/components/SafeMediaWrapper";
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
        
        {/* AGGRESSIVE FIX - Run before React even loads */}
        <Script id="media-files-fix" strategy="beforeInteractive">
          {`
            (function() {
              console.log('[MyZenTribe] Applying media_files protection...');
              
              // 1. Create a global proxy for undefined objects
              const handler = {
                get(target, prop) {
                  if (prop === 'media_files') {
                    console.warn('[MyZenTribe] Prevented undefined.media_files access');
                    return [];
                  }
                  return undefined;
                }
              };
              
              // 2. Override Object.prototype to handle media_files
              Object.defineProperty(Object.prototype, 'media_files', {
                get: function() {
                  // If this is a real object with real media_files, return it
                  if (this && this.hasOwnProperty && this.hasOwnProperty('_media_files_real')) {
                    return this._media_files_real;
                  }
                  // For anything else (including undefined), return empty array
                  if (this === undefined || this === null) {
                    console.warn('[MyZenTribe] media_files accessed on undefined/null, returning []');
                    return [];
                  }
                  // Return empty array as default
                  return [];
                },
                set: function(value) {
                  Object.defineProperty(this, '_media_files_real', {
                    value: value,
                    writable: true,
                    enumerable: false,
                    configurable: true
                  });
                },
                configurable: true,
                enumerable: false
              });
              
              // 3. Patch all JSON parsing
              const originalParse = JSON.parse;
              JSON.parse = function(text, reviver) {
                try {
                  const result = originalParse.call(this, text, reviver);
                  
                  // Add media_files to any object that doesn't have it
                  const addMediaFiles = (obj) => {
                    if (!obj) return obj;
                    
                    if (Array.isArray(obj)) {
                      obj.forEach(item => {
                        if (item && typeof item === 'object' && !item.hasOwnProperty('media_files')) {
                          item.media_files = [];
                        }
                      });
                    } else if (typeof obj === 'object' && !obj.hasOwnProperty('media_files')) {
                      obj.media_files = [];
                    }
                    
                    return obj;
                  };
                  
                  if (result && typeof result === 'object') {
                    if ('data' in result) {
                      result.data = addMediaFiles(result.data);
                    } else {
                      return addMediaFiles(result);
                    }
                  }
                  
                  return result;
                } catch (e) {
                  return originalParse.call(this, text, reviver);
                }
              };
              
              // 4. Global error suppressor
              window.addEventListener('error', function(event) {
                if (event.error && event.error.message && event.error.message.includes('media_files')) {
                  console.warn('[MyZenTribe] Caught media_files error, preventing crash');
                  console.log('Error details:', event.error.message);
                  event.preventDefault();
                  event.stopPropagation();
                  event.stopImmediatePropagation();
                  return false;
                }
              }, true);
              
              // 5. Promise rejection handler
              window.addEventListener('unhandledrejection', function(event) {
                if (event.reason && (
                  (event.reason.message && event.reason.message.includes('media_files')) ||
                  (event.reason.toString && event.reason.toString().includes('media_files'))
                )) {
                  console.warn('[MyZenTribe] Caught async media_files error');
                  event.preventDefault();
                  return false;
                }
              });
              
              console.log('[MyZenTribe] Protection active. Object.prototype.media_files installed.');
            })();
          `}
        </Script>
        
        {/* Leaflet CSS for maps */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body>
        <SafeMediaWrapper>
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
        </SafeMediaWrapper>
      </body>
    </html>
  );
}
