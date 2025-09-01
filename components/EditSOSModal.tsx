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
    sos_enabled: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Load current settings
  useEffect(() => {
    (async () => {
      const data = await getEmergencySettings();
      setSettings(data);
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
      
      // Basic validation for email/phone
      if (settings.emergency_contact_method === "email") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(settings.emergency_contact_value)) {
          setError("Please enter a valid email address");
          return;
        }
      } else if (settings.emergency_contact_method === "sms") {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(settings.emergency_contact_value) || settings.emergency_contact_value.length < 10) {
          setError("Please enter a valid phone number");
          return;
        }
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

  const modal = (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="sos-modal-title">
      <div className="modal-sheet" style={{ maxWidth: "500px" }}>
        {/* Header */}
        <div className="modal-header">
          <h2 id="sos-modal-title" className="text-xl font-semibold">
            Emergency Contact Settings
          </h2>
          <button
            onClick={onClose}
            className="modal-close"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {loading ? (
            <div className="text-center py-8">Loading settings...</div>
          ) : (
            <div className="space-y-4">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <div>
                  <label htmlFor="sos-enabled" className="font-medium">
                    Enable SOS Feature
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    When enabled, the SOS button will alert your emergency contact
                  </p>
                </div>
                <input
                  id="sos-enabled"
                  type="checkbox"
                  checked={settings.sos_enabled}
                  onChange={(e) => setSettings({ ...settings, sos_enabled: e.target.checked })}
                  className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500"
                />
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                            emergency_contact_value: null // Clear value when switching
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
                            emergency_contact_value: null // Clear value when switching
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  {/* Info Box */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="text-sm text-blue-900">
                        <p className="font-medium mb-1">How SOS Works:</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-800">
                          <li>Press the SOS button in an emergency</li>
                          <li>Your location will be shared (if allowed)</li>
                          <li>Your emergency contact will be notified immediately</li>
                          <li>Keep your phone nearby for follow-up</li>
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
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
          animation: fadeIn 0.2s ease-out;
        }

        .modal-sheet {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease-out;
        }

        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-close {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          background: transparent;
          font-size: 24px;
          color: #6b7280;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .modal-close:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .modal-body {
          padding: 24px;
        }

        .modal-footer {
          padding: 16px 24px;
          border-top: 1px solid #e5e7eb;
        }

        .space-y-4 > * + * {
          margin-top: 1rem;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @media (max-width: 640px) {
          .modal-sheet {
            max-height: 100vh;
            height: 100vh;
            max-width: 100%;
            border-radius: 0;
          }
        }
      `}</style>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modal, document.body) : null;
}
