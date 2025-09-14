// app/profile/candles/settings/page.tsx - CANDLE PRIVACY SETTINGS PAGE
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

// SVG Icons
const LockIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const UsersIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const GlobeIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

type CandlePrivacySettings = {
  candles_visibility: 'private' | 'friends' | 'public';
  gratitude_visibility: 'private'; // Always private
  allow_candle_messages: boolean;
  notify_new_candles: boolean;
};

export default function CandlePrivacySettingsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<CandlePrivacySettings>({
    candles_visibility: 'private', // Default to private
    gratitude_visibility: 'private',
    allow_candle_messages: true,
    notify_new_candles: true,
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Get user and load settings
  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserId(user.id);
      
      // Load current settings
      const { data } = await supabase
        .from('profiles')
        .select('candles_visibility, gratitude_visibility, allow_candle_messages, notify_new_candles')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setSettings({
          candles_visibility: data.candles_visibility || 'private',
          gratitude_visibility: 'private', // Always private
          allow_candle_messages: data.allow_candle_messages ?? true,
          notify_new_candles: data.notify_new_candles ?? true,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setStatus({ type: 'error', message: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    if (!userId) return;
    
    setSaving(true);
    setStatus({ type: 'info', message: 'Saving...' });
    
    try {
      // Update profile with candle settings
      const { error } = await supabase
        .from('profiles')
        .update({
          candles_visibility: settings.candles_visibility,
          gratitude_visibility: 'private', // Always private
          allow_candle_messages: settings.allow_candle_messages,
          notify_new_candles: settings.notify_new_candles,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
      
      if (error) throw error;
      
      // Update all existing candles to match new default visibility
      const { error: candleError } = await supabase
        .from('candle_offerings')
        .update({ visibility: settings.candles_visibility })
        .eq('created_by', userId);
      
      if (candleError) console.warn('Could not update existing candles:', candleError);
      
      setStatus({ type: 'success', message: 'Settings saved successfully!' });
      setTimeout(() => setStatus(null), 3000);
      
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setStatus({ type: 'error', message: error.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="settings-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="page-background"></div>
      
      {/* Header */}
      <header className="page-header">
        <Link href="/profile/candles" className="back-button">
          ← Back to Candles
        </Link>
        <h1 className="page-title">
          <span className="title-icon">🕯️</span>
          Candle Privacy Settings
        </h1>
      </header>

      {/* Status Messages */}
      {status && (
        <div className={`status-message ${status.type}`}>
          {status.message}
        </div>
      )}

      {/* Main Settings Card */}
      <div className="settings-card">
        <div className="settings-section">
          <h2 className="section-title">
            <LockIcon size={18} />
            Who can see your candles?
          </h2>
          <p className="section-description">
            Control who can view your sacred candles and memorial offerings
          </p>
          
          <div className="privacy-options">
            <label className={`privacy-option ${settings.candles_visibility === 'private' ? 'active' : ''}`}>
              <input
                type="radio"
                name="candles_visibility"
                value="private"
                checked={settings.candles_visibility === 'private'}
                onChange={(e) => setSettings({ ...settings, candles_visibility: 'private' })}
              />
              <div className="option-content">
                <div className="option-header">
                  <LockIcon size={16} />
                  <span className="option-title">Private</span>
                  <span className="recommended-badge">Recommended</span>
                </div>
                <p className="option-description">
                  Only you can see your candles. Perfect for personal memorials and private prayers.
                </p>
              </div>
            </label>

            <label className={`privacy-option ${settings.candles_visibility === 'friends' ? 'active' : ''}`}>
              <input
                type="radio"
                name="candles_visibility"
                value="friends"
                checked={settings.candles_visibility === 'friends'}
                onChange={(e) => setSettings({ ...settings, candles_visibility: 'friends' })}
              />
              <div className="option-content">
                <div className="option-header">
                  <UsersIcon size={16} />
                  <span className="option-title">Friends Only</span>
                </div>
                <p className="option-description">
                  Share your candles with trusted friends. They can view and light candles with you.
                </p>
              </div>
            </label>

            <label className={`privacy-option ${settings.candles_visibility === 'public' ? 'active' : ''}`}>
              <input
                type="radio"
                name="candles_visibility"
                value="public"
                checked={settings.candles_visibility === 'public'}
                onChange={(e) => setSettings({ ...settings, candles_visibility: 'public' })}
              />
              <div className="option-content">
                <div className="option-header">
                  <GlobeIcon size={16} />
                  <span className="option-title">Public</span>
                </div>
                <p className="option-description">
                  Anyone can see your candles. Share your light with the world.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Additional Settings */}
        <div className="settings-section">
          <h2 className="section-title">Additional Settings</h2>
          
          <label className="toggle-setting">
            <div className="toggle-content">
              <span className="toggle-label">Allow messages on candles</span>
              <span className="toggle-description">
                Friends can leave supportive messages on your candles
              </span>
            </div>
            <input
              type="checkbox"
              className="toggle-switch"
              checked={settings.allow_candle_messages}
              onChange={(e) => setSettings({ ...settings, allow_candle_messages: e.target.checked })}
            />
          </label>

          <label className="toggle-setting">
            <div className="toggle-content">
              <span className="toggle-label">Notify me of new candles</span>
              <span className="toggle-description">
                Get notified when someone lights a candle for you
              </span>
            </div>
            <input
              type="checkbox"
              className="toggle-switch"
              checked={settings.notify_new_candles}
              onChange={(e) => setSettings({ ...settings, notify_new_candles: e.target.checked })}
            />
          </label>
        </div>

        {/* Important Note */}
        <div className="privacy-note">
          <span className="note-icon">ℹ️</span>
          <div className="note-content">
            <strong>Note about Gratitude Journal:</strong>
            <p>Your gratitude journal entries are always private and only visible to you. 
            This sacred space is yours alone for personal reflection and growth.</p>
          </div>
        </div>

        {/* Save Button */}
        <div className="settings-actions">
          <button
            className="btn btn-primary"
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .settings-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%);
          position: relative;
          padding: 2rem 1rem;
        }

        .page-background {
          position: fixed;
          inset: 0;
          background: 
            radial-gradient(circle at 20% 30%, rgba(251,191,36,0.1) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(139,92,246,0.08) 0%, transparent 40%);
          pointer-events: none;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
          position: relative;
          z-index: 1;
          max-width: 800px;
          margin: 0 auto 2rem;
        }

        .back-button {
          padding: 0.5rem 1rem;
          background: rgba(255,255,255,0.1);
          color: #fbbf24;
          border-radius: 0.5rem;
          text-decoration: none;
          transition: all 0.2s;
          font-size: 0.875rem;
        }

        .back-button:hover {
          background: rgba(255,255,255,0.15);
          transform: translateY(-1px);
        }

        .page-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.875rem;
          font-weight: 700;
          color: #fbbf24;
          margin: 0;
        }

        .title-icon {
          font-size: 2rem;
        }

        .status-message {
          max-width: 800px;
          margin: 0 auto 1.5rem;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          font-weight: 500;
          text-align: center;
          position: relative;
          z-index: 1;
        }

        .status-message.success {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .status-message.error {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .status-message.info {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }

        .settings-card {
          max-width: 800px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1rem;
          padding: 2rem;
          position: relative;
          z-index: 1;
        }

        @media (max-width: 640px) {
          .settings-card {
            padding: 1.5rem 1rem;
          }
        }

        .settings-section {
          margin-bottom: 2rem;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.25rem;
          font-weight: 600;
          color: #fbbf24;
          margin: 0 0 0.5rem 0;
        }

        .section-description {
          color: #fde68a;
          font-size: 0.875rem;
          margin: 0 0 1.5rem 0;
          opacity: 0.8;
        }

        .privacy-options {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .privacy-option {
          display: flex;
          align-items: flex-start;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .privacy-option:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .privacy-option.active {
          background: rgba(139, 92, 246, 0.1);
          border-color: rgba(139, 92, 246, 0.5);
        }

        .privacy-option input[type="radio"] {
          margin-right: 1rem;
          margin-top: 0.25rem;
        }

        .option-content {
          flex: 1;
        }

        .option-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .option-title {
          font-weight: 600;
          color: #fbbf24;
        }

        .recommended-badge {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
          padding: 0.125rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .option-description {
          color: #fde68a;
          font-size: 0.875rem;
          margin: 0;
          opacity: 0.9;
        }

        .toggle-setting {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          cursor: pointer;
        }

        .toggle-setting:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .toggle-content {
          flex: 1;
        }

        .toggle-label {
          display: block;
          font-weight: 500;
          color: #fbbf24;
          margin-bottom: 0.25rem;
        }

        .toggle-description {
          display: block;
          font-size: 0.875rem;
          color: #fde68a;
          opacity: 0.8;
        }

        .toggle-switch {
          width: 3rem;
          height: 1.5rem;
          appearance: none;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 1rem;
          position: relative;
          cursor: pointer;
          transition: all 0.2s;
        }

        .toggle-switch:checked {
          background: #8b5cf6;
        }

        .toggle-switch::after {
          content: '';
          position: absolute;
          width: 1.25rem;
          height: 1.25rem;
          background: white;
          border-radius: 50%;
          top: 0.125rem;
          left: 0.125rem;
          transition: all 0.2s;
        }

        .toggle-switch:checked::after {
          left: 1.625rem;
        }

        .privacy-note {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 0.5rem;
          margin-bottom: 2rem;
        }

        .note-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .note-content {
          flex: 1;
        }

        .note-content strong {
          display: block;
          color: #fbbf24;
          margin-bottom: 0.5rem;
        }

        .note-content p {
          color: #fde68a;
          font-size: 0.875rem;
          margin: 0;
          opacity: 0.9;
        }

        .settings-actions {
          display: flex;
          justify-content: flex-end;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 0.875rem;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          min-height: 44px;
        }

        .btn-primary {
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(251, 191, 36, 0.3);
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
          color: #fde68a;
        }

        .loading-spinner {
          width: 3rem;
          height: 3rem;
          border: 3px solid rgba(251, 191, 36, 0.2);
          border-top: 3px solid #fbbf24;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .settings-page {
            padding: 1rem 0.5rem;
          }
          
          .page-title {
            font-size: 1.5rem;
          }
          
          .privacy-option {
            padding: 0.875rem;
          }
          
          .privacy-option input[type="radio"] {
            margin-right: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
