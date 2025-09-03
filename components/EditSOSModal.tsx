// components/EditSOSModal.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getEmergencySettings, saveEmergencySettings } from "@/lib/sos";
import type { EmergencySettings } from "@/lib/sos";

type Props = {
  onClose: () => void;
  onSaved?: () => void;
};

// Preset message templates
const MESSAGE_PRESETS = {
  uncomfortable: "I'm feeling uncomfortable at this event/location. Please check on me. My location is:",
  unsafe: "I don't feel safe right now. Please call me immediately and stay on alert. My location is:",
  emergency: "EMERGENCY - I need immediate help. Please contact authorities and come to my location:",
  date: "I'm on a date that's making me uncomfortable. Please call me with an 'emergency' in 5 minutes. Location:",
  lost: "I'm lost and my phone is dying. Please save this location and come get me if you don't hear from me soon:",
  medical: "I'm having a medical issue. Please come to my location or send help:",
  custom: ""
};

// Alert interval options
const ALERT_INTERVALS = [
  { value: 0, label: "Once only", description: "Send one alert when triggered" },
  { value: 60000, label: "Every minute", description: "Repeat alert every 60 seconds" },
  { value: 300000, label: "Every 5 minutes", description: "Repeat alert every 5 minutes" },
  { value: 600000, label: "Every 10 minutes", description: "Repeat alert every 10 minutes" },
];

export default function EditSOSModal({ onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'checkin'>('basic');
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof MESSAGE_PRESETS>('uncomfortable');
  const [settings, setSettings] = useState<EmergencySettings & {
    alert_interval?: number;
    check_in_timer?: number;
    stealth_mode?: boolean;
    severity_level?: 'low' | 'medium' | 'high';
    secondary_contact_name?: string | null;
    secondary_contact_value?: string | null;
  }>({
    emergency_contact_name: null,
    emergency_contact_method: null,
    emergency_contact_value: null,
    emergency_message: MESSAGE_PRESETS.uncomfortable,
    user_phone: null,
    sos_enabled: false,
    alert_interval: 0,
    check_in_timer: 0,
    stealth_mode: false,
    severity_level: 'medium',
    secondary_contact_name: null,
    secondary_contact_value: null,
  });
  const [error, setError] = useState<string | null>(null);

  // Load current settings
  useEffect(() => {
    (async () => {
      const data = await getEmergencySettings();
      setSettings({
        ...data,
        emergency_message: data.emergency_message || MESSAGE_PRESETS.uncomfortable,
        alert_interval: (data as any).alert_interval || 0,
        check_in_timer: (data as any).check_in_timer || 0,
        stealth_mode: (data as any).stealth_mode || false,
        severity_level: (data as any).severity_level || 'medium',
        secondary_contact_name: (data as any).secondary_contact_name || null,
        secondary_contact_value: (data as any).secondary_contact_value || null,
      });
      setLoading(false);
    })();
  }, []);

  // Lock body scroll
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const handlePresetChange = (preset: keyof typeof MESSAGE_PRESETS) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      setSettings({ ...settings, emergency_message: MESSAGE_PRESETS[preset] });
    }
  };

  const handleSave = async () => {
    setError(null);
    
    // Validation
    if (settings.sos_enabled) {
      if (!settings.emergency_contact_name?.trim()) {
        setError("Please enter contact name");
        return;
      }
      if (!settings.emergency_contact_method) {
        setError("Please select contact method (SMS or Email)");
        return;
      }
      if (!settings.emergency_contact_value?.trim()) {
        setError(`Please enter contact ${settings.emergency_contact_method === "sms" ? "phone number" : "email"}`);
        return;
      }
      if (!settings.emergency_message?.trim()) {
        setError("Please enter an emergency message");
        return;
      }
    }

    setSaving(true);
    const result = await saveEmergencySettings(settings);
    setSaving(false);

    if (result.ok) {
      onSaved?.();
      onClose();
    } else {
      setError(result.error || "Failed to save settings");
    }
  };

  if (!loading && typeof document !== 'undefined') {
    return createPortal(
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b bg-gradient-to-r from-red-500 to-red-600 text-white rounded-t-lg">
            <h2 className="text-2xl font-bold">Emergency SOS Settings</h2>
            <p className="mt-2 opacity-90">
              Configure your emergency alerts and safety features
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('basic')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'basic' 
                  ? 'border-b-2 border-red-500 text-red-600 bg-red-50' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Basic Setup
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'advanced' 
                  ? 'border-b-2 border-red-500 text-red-600 bg-red-50' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Advanced Options
            </button>
            <button
              onClick={() => setActiveTab('checkin')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'checkin' 
                  ? 'border-b-2 border-red-500 text-red-600 bg-red-50' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Check-in Timer
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="font-medium">Enable SOS Feature</label>
                <p className="text-sm text-gray-600">Quick access to emergency help</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.sos_enabled}
                  onChange={(e) => setSettings({ ...settings, sos_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>

            {settings.sos_enabled && (
              <>
                {/* Basic Tab */}
                {activeTab === 'basic' && (
                  <div className="space-y-6">
                    {/* Primary Contact */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-lg">Primary Emergency Contact</h3>
                      
                      <div>
                        <label htmlFor="contact-name" className="block text-sm font-medium mb-2">
                          Contact Name *
                        </label>
                        <input
                          id="contact-name"
                          type="text"
                          value={settings.emergency_contact_name || ""}
                          onChange={(e) => setSettings({ ...settings, emergency_contact_name: e.target.value })}
                          placeholder="e.g., Jane Doe"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Contact Method *
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="method"
                              value="sms"
                              checked={settings.emergency_contact_method === "sms"}
                              onChange={() => setSettings({ 
                                ...settings, 
                                emergency_contact_method: "sms",
                                emergency_contact_value: null
                              })}
                              className="mr-2"
                            />
                            <span>SMS/Text</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="method"
                              value="email"
                              checked={settings.emergency_contact_method === "email"}
                              onChange={() => setSettings({ 
                                ...settings, 
                                emergency_contact_method: "email",
                                emergency_contact_value: null
                              })}
                              className="mr-2"
                            />
                            <span>Email</span>
                          </label>
                        </div>
                      </div>

                      {settings.emergency_contact_method && (
                        <div>
                          <label htmlFor="contact-value" className="block text-sm font-medium mb-2">
                            {settings.emergency_contact_method === "sms" ? "Phone Number" : "Email Address"} *
                          </label>
                          <input
                            id="contact-value"
                            type={settings.emergency_contact_method === "email" ? "email" : "tel"}
                            value={settings.emergency_contact_value || ""}
                            onChange={(e) => setSettings({ ...settings, emergency_contact_value: e.target.value })}
                            placeholder={settings.emergency_contact_method === "sms" ? "+1 (555) 123-4567" : "contact@example.com"}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                      )}
                    </div>

                    {/* Message Presets */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Quick Message Templates
                      </label>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {Object.entries(MESSAGE_PRESETS).map(([key, _]) => {
                          if (key === 'custom') return null;
                          return (
                            <button
                              key={key}
                              onClick={() => handlePresetChange(key as keyof typeof MESSAGE_PRESETS)}
                              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                                selectedPreset === key 
                                  ? 'border-red-500 bg-red-50 text-red-700' 
                                  : 'border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {key.charAt(0).toUpperCase() + key.slice(1)}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => handlePresetChange('custom')}
                          className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                            selectedPreset === 'custom' 
                              ? 'border-red-500 bg-red-50 text-red-700' 
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          Custom Message
                        </button>
                      </div>
                      
                      <textarea
                        value={settings.emergency_message || ""}
                        onChange={(e) => {
                          setSettings({ ...settings, emergency_message: e.target.value });
                          setSelectedPreset('custom');
                        }}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Type your emergency message here..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Your location will be automatically added to this message
                      </p>
                    </div>

                    {/* Alert Frequency */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Alert Frequency
                      </label>
                      <div className="space-y-2">
                        {ALERT_INTERVALS.map((interval) => (
                          <label key={interval.value} className="flex items-start p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                              type="radio"
                              name="interval"
                              value={interval.value}
                              checked={settings.alert_interval === interval.value}
                              onChange={() => setSettings({ ...settings, alert_interval: interval.value })}
                              className="mt-1 mr-3"
                            />
                            <div>
                              <div className="font-medium">{interval.label}</div>
                              <div className="text-sm text-gray-600">{interval.description}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                      {settings.alert_interval > 0 && (
                        <p className="text-sm text-amber-600 mt-2 p-2 bg-amber-50 rounded">
                          ⚠️ Repeated alerts will continue until you press "Cancel SOS" or your battery dies
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Advanced Tab */}
                {activeTab === 'advanced' && (
                  <div className="space-y-6">
                    {/* Severity Level */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Default Severity Level
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSettings({ ...settings, severity_level: 'low' })}
                          className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                            settings.severity_level === 'low'
                              ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="font-medium">Low</div>
                          <div className="text-xs">Uncomfortable</div>
                        </button>
                        <button
                          onClick={() => setSettings({ ...settings, severity_level: 'medium' })}
                          className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                            settings.severity_level === 'medium'
                              ? 'border-orange-500 bg-orange-50 text-orange-700'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="font-medium">Medium</div>
                          <div className="text-xs">Unsafe</div>
                        </button>
                        <button
                          onClick={() => setSettings({ ...settings, severity_level: 'high' })}
                          className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                            settings.severity_level === 'high'
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="font-medium">High</div>
                          <div className="text-xs">Emergency</div>
                        </button>
                      </div>
                    </div>

                    {/* Secondary Contact */}
                    <div>
                      <h3 className="font-medium text-lg mb-4">Secondary Contact (Optional)</h3>
                      <div className="space-y-4">
                        <input
                          type="text"
                          value={settings.secondary_contact_name || ""}
                          onChange={(e) => setSettings({ ...settings, secondary_contact_name: e.target.value })}
                          placeholder="Secondary contact name"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          value={settings.secondary_contact_value || ""}
                          onChange={(e) => setSettings({ ...settings, secondary_contact_value: e.target.value })}
                          placeholder="Phone or email"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Stealth Mode */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Stealth Mode</label>
                          <p className="text-sm text-gray-600">
                            Activate SOS silently with 3 quick volume button presses
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.stealth_mode || false}
                            onChange={(e) => setSettings({ ...settings, stealth_mode: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    </div>

                    {/* Your Phone */}
                    <div>
                      <label htmlFor="user-phone" className="block text-sm font-medium mb-2">
                        Your Phone Number (for identification)
                      </label>
                      <input
                        id="user-phone"
                        type="tel"
                        value={settings.user_phone || ""}
                        onChange={(e) => setSettings({ ...settings, user_phone: e.target.value })}
                        placeholder="+1 (555) 987-6543"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Helps your contact identify the SOS is from you
                      </p>
                    </div>
                  </div>
                )}

                {/* Check-in Timer Tab */}
                {activeTab === 'checkin' && (
                  <div className="space-y-6">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h3 className="font-medium text-blue-900 mb-2">How Check-in Timer Works</h3>
                      <p className="text-sm text-blue-800">
                        Set a timer before going somewhere. If you don't check in before it expires, 
                        an SOS alert is automatically sent to your emergency contact.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Default Check-in Time
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setSettings({ ...settings, check_in_timer: 0 })}
                          className={`px-4 py-3 rounded-lg border ${
                            settings.check_in_timer === 0
                              ? 'border-gray-500 bg-gray-100'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          Disabled
                        </button>
                        <button
                          onClick={() => setSettings({ ...settings, check_in_timer: 30 })}
                          className={`px-4 py-3 rounded-lg border ${
                            settings.check_in_timer === 30
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          30 minutes
                        </button>
                        <button
                          onClick={() => setSettings({ ...settings, check_in_timer: 60 })}
                          className={`px-4 py-3 rounded-lg border ${
                            settings.check_in_timer === 60
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          1 hour
                        </button>
                        <button
                          onClick={() => setSettings({ ...settings, check_in_timer: 120 })}
                          className={`px-4 py-3 rounded-lg border ${
                            settings.check_in_timer === 120
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          2 hours
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-lg">
                      <p className="text-sm text-amber-800">
                        💡 <strong>Pro tip:</strong> Use this when going on first dates, meeting someone new, 
                        or walking alone at night. You can always extend the timer from your phone.
                      </p>
                    </div>
                  </div>
                )}

                {/* Info Box */}
                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-purple-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-purple-900">
                      <p className="font-medium mb-1">Quick SOS Activation:</p>
                      <ul className="list-disc list-inside space-y-1 text-purple-800">
                        <li>Main button: Red SOS button on safety page</li>
                        <li>Quick access: Floating button on all pages</li>
                        {settings.stealth_mode && <li>Stealth: Triple-press volume buttons</li>}
                        <li>Voice: Say "Hey Siri/Google, open MyZenTribe SOS"</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer flex justify-between p-6 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return null;
}
