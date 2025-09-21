// components/business/BusinessInviteQR.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Props {
  businessId: string;
  businessHandle?: string;
  businessName?: string;
  mode?: 'full' | 'compact';
  size?: number;
}

export default function BusinessInviteQR({ 
  businessId, 
  businessHandle,
  businessName,
  mode = 'full',
  size = 200 
}: Props) {
  const [copied, setCopied] = useState(false);
  const [qrOk, setQrOk] = useState(true);
  
  // Build the business URL
  const businessUrl = useMemo(() => {
    if (!businessHandle || typeof window === 'undefined') return '';
    return `${window.location.origin}/business/${businessHandle}`;
  }, [businessHandle]);

  // QR code URL using free QR service
  const qrUrl = useMemo(() => {
    if (!businessUrl) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
      businessUrl
    )}`;
  }, [businessUrl, size]);

  const copyLink = useCallback(async () => {
    if (!businessUrl) return;
    try {
      await navigator.clipboard.writeText(businessUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy link. You can select and copy it manually.');
    }
  }, [businessUrl]);

  const shareLink = useCallback(() => {
    if (!businessUrl) return;
    if (navigator.share) {
      navigator.share({
        title: businessName || 'Check out this business',
        text: `Visit ${businessName || 'our business'} on MyZenTribe`,
        url: businessUrl
      }).catch(() => {
        // User cancelled, that's ok
      });
    } else {
      copyLink();
    }
  }, [businessUrl, businessName, copyLink]);

  const downloadQR = useCallback(() => {
    if (!qrUrl || !businessHandle) return;
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `${businessHandle}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [qrUrl, businessHandle]);

  if (!businessHandle) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-500 text-sm">Business handle required for QR code</p>
      </div>
    );
  }

  if (mode === 'compact') {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-4">
          {qrOk ? (
            <img
              src={qrUrl}
              alt="Business QR Code"
              width={100}
              height={100}
              className="rounded-lg border"
              onError={() => setQrOk(false)}
              onLoad={() => setQrOk(true)}
            />
          ) : (
            <div className="w-[100px] h-[100px] bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📱</span>
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm font-medium mb-2">Share Your Business</p>
            <div className="flex gap-2">
              <button
                onClick={copyLink}
                className="btn btn-sm btn-neutral"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={shareLink}
                className="btn btn-sm btn-brand"
              >
                Share
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200 shadow-md">
      <h3 className="text-xl font-bold text-purple-900 mb-6 flex items-center gap-2">
        <span className="text-2xl">📱</span> Business QR Code
      </h3>
      
      <div className="space-y-4">
        {/* QR Code Display */}
        <div className="bg-white rounded-xl p-4 text-center">
          {qrOk ? (
            <img
              src={qrUrl}
              alt="Business QR Code"
              width={size}
              height={size}
              className="mx-auto rounded-lg border-2 border-purple-200"
              onError={() => setQrOk(false)}
              onLoad={() => setQrOk(true)}
            />
          ) : (
            <div 
              className="bg-gray-100 rounded-lg flex items-center justify-center mx-auto"
              style={{ width: size, height: size }}
            >
              <div className="text-center p-4">
                <div className="text-4xl mb-2">📱</div>
                <div className="text-sm text-gray-600">QR Code Loading...</div>
              </div>
            </div>
          )}
          
          <p className="text-xs text-gray-500 mt-3">
            Scan to visit your business page
          </p>
        </div>

        {/* URL Display */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Business URL</label>
          <input
            type="text"
            value={businessUrl}
            readOnly
            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg"
            onFocus={(e) => e.target.select()}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={copyLink}
            className="flex-1 sm:flex-none px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            {copied ? '✓ Copied!' : '📋 Copy Link'}
          </button>
          <button
            onClick={shareLink}
            className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            🔗 Share
          </button>
          <button
            onClick={downloadQR}
            className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            💾 Download QR
          </button>
        </div>

        <p className="text-xs text-gray-600 text-center">
          💡 Tip: Print this QR code for business cards, flyers, or display at your location
        </p>
      </div>
    </div>
  );
}
