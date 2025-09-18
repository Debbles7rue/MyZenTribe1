// components/MediaFilesDiagnostic.tsx
"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

/**
 * Temporary diagnostic component to find the media_files error source
 * Add this to your main page temporarily to see what's happening
 */
export default function MediaFilesDiagnostic() {
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [errorFound, setErrorFound] = useState(false);

  useEffect(() => {
    const logs: string[] = [];
    
    // Test all your Supabase tables
    const testTables = async () => {
      const tables = [
        'profiles',
        'posts', 
        'photo_posts',
        'business_profiles',
        'events',
        'communities',
        'gratitude_media',
        'post_media'
      ];

      for (const table of tables) {
        try {
          logs.push(`Testing table: ${table}`);
          
          // Try to fetch from the table
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);
          
          if (error) {
            logs.push(`  ❌ Error: ${error.message}`);
            if (error.message.includes('media_files')) {
              logs.push(`  🎯 FOUND IT! Error is in ${table} table`);
              setErrorFound(true);
            }
          } else if (data) {
            // Check if data has media_files
            if (data.length > 0) {
              const hasMediaFiles = 'media_files' in data[0];
              logs.push(`  ✓ Data received, media_files: ${hasMediaFiles ? 'EXISTS' : 'MISSING'}`);
              
              // Log all keys to see what's there
              if (data[0]) {
                logs.push(`  Keys: ${Object.keys(data[0]).join(', ')}`);
              }
            } else {
              logs.push(`  ✓ Table empty`);
            }
          }
        } catch (e: any) {
          logs.push(`  ❌ Exception: ${e.message}`);
          if (e.message?.includes('media_files')) {
            logs.push(`  🎯 FOUND IT! Error in ${table}`);
            setErrorFound(true);
          }
        }
      }
      
      setDiagnostics(logs);
    };

    // Set up error interceptor
    const originalError = window.onerror;
    window.onerror = function(msg, source, lineno, colno, error) {
      if (msg?.toString().includes('media_files') || error?.message?.includes('media_files')) {
        logs.push(`🎯 ERROR CAUGHT: ${msg}`);
        logs.push(`   Source: ${source}`);
        logs.push(`   Line: ${lineno}, Column: ${colno}`);
        setErrorFound(true);
        setDiagnostics([...logs]);
      }
      return false;
    };

    // Run tests
    testTables();

    // Cleanup
    return () => {
      window.onerror = originalError;
    };
  }, []);

  // Don't show in production unless there's an error
  if (process.env.NODE_ENV === 'production' && !errorFound) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      maxWidth: '400px',
      maxHeight: '300px',
      overflow: 'auto',
      background: errorFound ? '#fee' : '#efe',
      border: '2px solid ' + (errorFound ? '#f00' : '#0f0'),
      borderRadius: '8px',
      padding: '10px',
      fontSize: '11px',
      fontFamily: 'monospace',
      zIndex: 9999,
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
        {errorFound ? '❌ Media Files Error Found!' : '✓ Diagnostics Running...'}
      </div>
      {diagnostics.map((log, i) => (
        <div key={i} style={{ 
          color: log.includes('FOUND IT') ? '#f00' : 
                 log.includes('❌') ? '#c00' : 
                 log.includes('✓') ? '#080' : '#333',
          fontWeight: log.includes('FOUND IT') ? 'bold' : 'normal'
        }}>
          {log}
        </div>
      ))}
      <button 
        onClick={() => setDiagnostics([])}
        style={{
          marginTop: '10px',
          padding: '5px 10px',
          background: '#7c3aed',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Clear
      </button>
    </div>
  );
}
