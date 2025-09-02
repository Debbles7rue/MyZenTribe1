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

export default function EditSOSModal({ onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<EmergencySettings>({
    emergency_contact_name: null,
    emergency_contact_method: null,
    emergency_contact_value: null,
    emergency_message: 'I am not feeling safe at this location. Please be on alert until you hear I am safe. My exact location is:',
    user_phone: null,
    sos_enabled: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Load current settings
  useEffect(() => {
    (async () => {
      const data = await getEmergencySettings();
      setSettings({
        ...data,
        emergency_message: data.emergency_message || 'I am not feeling safe at this location. Please be on alert until you hear I am safe. My exact location is:'
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
        <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold">Emergency SOS Settings</h2>
            <p className="text-gray-600 mt-2">
              Configure your emergency contact for one-tap SOS alerts
            </p>
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
                {/* Contact Name */}
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-medium mb-2">
                    Emergency Contact Name *
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

                {/* Contact Method */}
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

                {/* Contact Value */}
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

                {/* Your Phone (Optional for SMS identification) */}
                <div>
                  <label htmlFor="user-phone" className="block text-sm font-medium mb-2">
                    Your Phone Number (Optional)
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
                    Include your number so your contact knows who's sending the SOS
                  </p>
                </div>

                {/* Emergency Message */}
                <div>
                  <label htmlFor="emergency-message" className="block text-sm font-medium mb-2">
                    Emergency Message *
                  </label>
                  <textarea
                    id="emergency-message"
                    value={settings.emergency_message || ""}
                    onChange={(e) => setSettings({ ...settings, emergency_message: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="I am not feeling safe at this location. Please be on alert until you hear I am safe. My exact location is:"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This message will be sent with your location when you trigger SOS
                  </p>
                </div>

                {/* Info Box */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-1">How SOS Works:</p>
                      <ul className="list-disc list-inside space-y-1 text-blue-800">
                        <li>Click SOS button → Confirmation dialog</li>
                        <li>Confirm → Your message + location sent immediately</li>
                        <li>For SMS: Opens your messaging app with pre-filled text</li>
                        <li>For Email: Opens email app with emergency message</li>
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
          <div className="modal-footer flex justify-between p-6 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
