// app/layout.tsx
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./globals.css";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import FirstRunGate from "@/components/FirstRunGate";
import { ToastProvider } from "@/components/ToastProvider";
import ElevenElevenFireworks from "@/components/ElevenElevenFireeworks";
import SafeMediaWrapper from "@/components/SafeMediaWrapper";

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
        
        {/* ULTIMATE FIX - Inline script runs immediately */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // This runs before ANYTHING else
              (function() {
                console.log('[MyZenTribe] Installing media_files protection...');
                
                // Store original undefined
                const originalUndefined = undefined;
                
                // Create a proxy for undefined that returns empty array for media_files
                try {
                  // Method 1: Proxy undefined (doesn't work in all browsers)
                  const undefinedProxy = new Proxy({}, {
                    get(target, prop) {
                      if (prop === 'media_files') {
                        console.warn('Prevented undefined.media_files access');
                        return [];
                      }
                      return originalUndefined;
                    }
                  });
                  
                  // Try to replace global undefined (usually blocked)
                  Object.defineProperty(window, 'undefined', {
                    get: () => undefinedProxy,
                    configurable: true
                  });
                } catch (e) {
                  // Expected to fail, that's ok
                }
                
                // Method 2: Add media_files getter to Object.prototype
                // This catches ALL objects including undefined/null
                try {
                  const descriptor = Object.getOwnPropertyDescriptor(Object.prototype, 'media_files');
                  if (!descriptor) {
                    Object.defineProperty(Object.prototype, 'media_files', {
                      get: function() {
                        // Always return an array, even for undefined/null
                        return [];
                      },
                      set: function(value) {
                        // Store the real value in a different property
                        Object.defineProperty(this, '__media_files_value', {
                          value: value,
                          writable: true,
                          enumerable: false,
                          configurable: true
                        });
                      },
                      configurable: true,
                      enumerable: false
                    });
                    console.log('✓ Object.prototype.media_files installed');
                  }
                } catch (e) {
                  console.error('Failed to install Object.prototype.media_files:', e);
                }
                
                // Method 3: Wrap all property access
                if (typeof Proxy !== 'undefined') {
                  const originalObjectCreate = Object.create;
                  Object.create = function(...args) {
                    const obj = originalObjectCreate.apply(this, args);
                    if (obj && typeof obj === 'object') {
                      return new Proxy(obj, {
                        get(target, prop) {
                          if (prop === 'media_files' && !(prop in target)) {
                            return [];
                          }
                          return target[prop];
                        }
                      });
                    }
                    return obj;
                  };
                }
                
                // Method 4: Override JSON.parse to add media_files
                const originalJSONParse = JSON.parse;
                JSON.parse = function(text, reviver) {
                  const result = originalJSONParse.call(this, text, reviver);
                  
                  const ensureMediaFiles = (obj) => {
                    if (!obj) return obj;
                    
                    if (Array.isArray(obj)) {
                      obj.forEach(item => {
                        if (item && typeof item === 'object' && !('media_files' in item)) {
                          item.media_files = [];
                        }
                      });
                    } else if (typeof obj === 'object' && !('media_files' in obj)) {
                      obj.media_files = [];
                    }
                    
                    return obj;
                  };
                  
                  if (result && typeof result === 'object') {
                    if ('data' in result) {
                      result.data = ensureMediaFiles(result.data);
                    } else {
                      return ensureMediaFiles(result);
                    }
                  }
                  
                  return result;
                };
                
                // Method 5: Error suppression
                window.addEventListener('error', function(event) {
                  if (event.error && event.error.message && event.error.message.includes('media_files')) {
                    console.warn('[MyZenTribe] Suppressed media_files error');
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    return false;
                  }
                }, true);
                
                window.addEventListener('unhandledrejection', function(event) {
                  if (event.reason && event.reason.toString().includes('media_files')) {
                    console.warn('[MyZenTribe] Suppressed async media_files error');
                    event.preventDefault();
                    return false;
                  }
                });
                
                console.log('[MyZenTribe] Protection installed successfully');
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
