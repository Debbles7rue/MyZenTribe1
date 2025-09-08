// app/(protected)/safety/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SOSButton from "@/components/SOSButton";
import { getEmergencySettings, saveEmergencySettings } from "@/lib/sos";
import type { EmergencySettings } from "@/lib/sos";

type Method = "sms" | "email" | "";

const PRESETS: { id: string; label: string; text: string }[] = [
  {
    id: "not-safe",
    label: "I'm not feeling safe (default)",
    text:
      "I am not feeling safe at this location. Please be on alert until you hear I am safe. My exact location is:",
  },
  {
    id: "pick-me-up",
    label: "Please come get me",
    text:
      "I need you to pick me up as soon as possible. I don't feel safe here. My exact location is:",
  },
  {
    id: "call-asap",
    label: "Call me ASAP",
    text:
      "Please call me ASAP and stay on the phone with me. My exact location is:",
  },
  {
    id: "911-now",
    label: "Call 911 for me",
    text:
      "Please call 911 for me and share my location. I may not be able to talk. My exact location is:",
  },
];

export default function SafetyPage() {
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Form state
  const [enabled, setEnabled] = useState(false);
  const [name, setName] = useState("");
  const [method, setMethod] = useState<Method>("");
  const [value, setValue] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [emergencyMessage, setEmergencyMessage] = useState(PRESETS[0].text);
  const [selectedPresetId, setSelectedPresetId] = useState(PRESETS[0].id);

  // Load settings
  useEffect(() => {
    (async () => {
      try {
        const s = await getEmergencySettings();
        setEnabled(!!s.sos_enabled);
        setName(s.emergency_contact_name ?? "");
        setMethod((s.emergency_contact_method as Method) ?? "sms");
        setValue(s.emergency_contact_value ?? "");
        setUserPhone((s as any).user_phone ?? "");
        setEmergencyMessage(
          (s as any).emergency_message ||
            "I am not feeling safe at this location. Please be on alert until you hear I am safe. My exact location is:"
        );
      } catch (e: any) {
        setErr(e?.message || "Could not load settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function validate() {
    if (!enabled) return;
    if (!method) throw new Error("Choose SMS or Email.");
    if (!value.trim())
      throw new Error(method === "sms" ? "Enter a phone number." : "Enter an email.");
    if (method === "sms" && !/^\+?[1-9]\d{7,14}$/.test(value.trim())) {
      throw new Error("Phone must be E.164 (e.g., +15551234567).");
    }
    if (method === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim())) {
      throw new Error("Enter a valid email address.");
    }
    if (!emergencyMessage.trim()) {
      throw new Error("Please enter your emergency message.");
    }
  }

  async function onSave() {
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      validate();
      const payload: Partial<EmergencySettings> & {
        emergency_message?: string;
        user_phone?: string | null;
      } = {
        sos_enabled: !!enabled,
        emergency_contact_name: name?.trim() || null,
        emergency_contact_method: (enabled ? method : null) as any,
        emergency_contact_value: enabled ? value?.trim() : null,
        emergency_message: enabled ? emergencyMessage.trim() : "",
        user_phone: userPhone?.trim() || null,
      };

      const { ok, error } = await saveEmergencySettings(payload as EmergencySettings);
      if (!ok) throw new Error(error || "Failed to save.");
      setMsg("Settings saved successfully!");
    } catch (e: any) {
      setErr(e?.message || "Save failed.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 3000);
    }
  }

  async function onSendTest() {
    setErr(null);
    setMsg(null);
    try {
      validate();
      if (!enabled || !method || !value) throw new Error("Enable and complete the contact first.");

      // Try to append a live location link
      let locationSuffix = "\n\nLocation: Unable to determine";
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        locationSuffix = `\n\nLocation: https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`;
      } catch {
        // ignore
      }

      const fromLine = userPhone?.trim() ? `\n\nFrom: ${userPhone.trim()}` : "";
      const test =
        `TEST MESSAGE - This is a test of the MyZenTribe SOS system.\n\n${emergencyMessage}${locationSuffix}${fromLine}\n\n— This was just a test`;

      setTesting(true);

      if (method === "sms") {
        // iOS vs others handle body separator differently
        const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent || "");
        const href = isiOS
          ? `sms:${encodeURIComponent(value)}&body=${encodeURIComponent(test)}`
          : `sms:${encodeURIComponent(value)}?body=${encodeURIComponent(test)}`;
        window.location.href = href;
      } else {
        const subject = encodeURIComponent("TEST - MyZenTribe SOS Alert");
        const body = encodeURIComponent(test);
        window.location.href = `mailto:${encodeURIComponent(value)}?subject=${subject}&body=${body}`;
      }

      setMsg("Test message prepared — check your messaging app.");
    } catch (e: any) {
      setErr(e?.message || "Could not open the composer.");
    } finally {
      setTesting(false);
    }
  }

  // Apply a preset into the editable textarea
  function applyPreset() {
    const preset = PRESETS.find((p) => p.id === selectedPresetId);
    if (preset) setEmergencyMessage(preset.text);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="container-app py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Safety Center
            </h1>
            <p className="text-gray-600 mt-2">Your safety is our priority</p>
          </div>

          {/* Emergency SOS Setup Card */}
          <div
            className="rounded-2xl p-6 sm:p-8 mb-6 shadow-lg"
            style={{
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              border: "none",
              color: "white",
            }}
          >
            <h2 className="text-2xl font-bold text-white mb-4">Emergency SOS Setup</h2>
            <p className="text-white/90 mb-6">
              Configure your emergency contact and customizable message. When you press the SOS
              button, we’ll help you quickly contact them with your location.
            </p>

            {loading ? (
              <div className="text-white/80">Loading settings...</div>
            ) : (
              <div className="space-y-5">
                {/* Enable Toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-white font-medium">Enable SOS Feature</span>
                </label>

                {/* Contact Name */}
                <div>
                  <label className="block text-white/90 text-sm mb-2">Contact Name (optional)</label>
                  <input
                    className="w-full px-4 py-2 rounded-lg text-gray-900"
                    placeholder="e.g., Mom, John, Emergency Contact"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!enabled}
                  />
                </div>

                {/* Method and Value */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-white/90 text-sm mb-2">Contact Method</label>
                    <select
                      className="w-full px-4 py-2 rounded-lg text-gray-900"
                      value={method}
                      onChange={(e) => setMethod(e.target.value as Method)}
                      disabled={!enabled}
                    >
                      <option value="">Select...</option>
                      <option value="sms">SMS/Text</option>
                      <option value="email">Email</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white/90 text-sm mb-2">
                      {method === "sms"
                        ? "Phone Number"
                        : method === "email"
                        ? "Email Address"
                        : "Contact Info"}
                    </label>
                    <input
                      className="w-full px-4 py-2 rounded-lg text-gray-900"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={
                        method === "sms"
                          ? "+15551234567"
                          : method === "email"
                          ? "contact@example.com"
                          : "Select method first"
                      }
                      disabled={!enabled || !method}
                    />
                  </div>
                </div>

                {/* Your Phone (optional) */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-white/90 text-sm mb-2">
                      Your Phone Number (optional – included in the message)
                    </label>
                    <input
                      className="w-full px-4 py-2 rounded-lg text-gray-900"
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      placeholder="+15551234567"
                      disabled={!enabled}
                    />
                  </div>
                </div>

                {/* Emergency Message + Presets */}
                <div className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div>
                      <label className="block text-white/90 text-sm mb-2">
                        Emergency Message (editable)
                      </label>
                      <textarea
                        value={emergencyMessage}
                        onChange={(e) => setEmergencyMessage(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2 rounded-lg text-gray-900"
                        placeholder="Enter your emergency message..."
                        disabled={!enabled}
                      />
                      <p className="text-white/80 text-xs mt-1">
                        We’ll append a live location link when possible.
                      </p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <label className="block text-white/90 text-sm mb-2">Presets</label>
                      <select
                        className="w-full px-3 py-2 rounded text-gray-900"
                        value={selectedPresetId}
                        onChange={(e) => setSelectedPresetId(e.target.value)}
                        disabled={!enabled}
                      >
                        {PRESETS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={applyPreset}
                        disabled={!enabled}
                        className="mt-2 w-full px-3 py-2 bg-white text-red-600 rounded-lg font-medium hover:bg-gray-100 disabled:opacity-50"
                      >
                        Apply Preset
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    className="px-6 py-2 bg-white text-red-600 rounded-lg font-medium hover:bg-gray-100 disabled:opacity-50"
                    onClick={onSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Settings"}
                  </button>
                  <button
                    className="px-6 py-2 bg-white/20 text-white rounded-lg font-medium hover:bg-white/30 disabled:opacity-50"
                    onClick={onSendTest}
                    disabled={!enabled || saving || !method || !value || testing}
                  >
                    {testing ? "Preparing Test…" : "Send Test"}
                  </button>
                </div>

                {/* Messages */}
                {msg && <div className="text-white bg-green-600/20 rounded-lg p-3">{msg}</div>}
                {err && <div className="text-white bg-red-800/20 rounded-lg p-3">{err}</div>}

                {/* Test SOS Button (demo) */}
                {enabled && method && value && (
                  <div className="pt-4 border-t border-white/20">
                    <p className="text-white/90 text-sm mb-3">Test your SOS button:</p>
                    <SOSButton variant="hero" label="Send SOS Alert" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Safety Guidelines Grid (kept from your original) */}
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            {/* Meeting Safety */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">👥</span>
                <h3 className="text-lg font-semibold">Meeting People Safely</h3>
              </div>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Always meet in public places for first meetings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Tell a friend or family member where you're going</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Have your own transportation arranged</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Trust your instincts - if something feels off, leave</span>
                </li>
              </ul>
            </div>

            {/* Online Safety */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">🔒</span>
                <h3 className="text-lg font-semibold">Online Safety</h3>
              </div>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Never share passwords or financial information</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Be cautious about sharing personal details</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Report and block suspicious users</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Verify event details independently when possible</span>
                </li>
              </ul>
            </div>

            {/* Event Safety */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">📅</span>
                <h3 className="text-lg font-semibold">Event Safety</h3>
              </div>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Research event hosts and venues beforehand</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Check for reviews or testimonials when available</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Have a buddy system for new events</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Know the exit routes at venues</span>
                </li>
              </ul>
            </div>

            {/* Emergency Tips */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">🚨</span>
                <h3 className="text-lg font-semibold">In Case of Emergency</h3>
              </div>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Call 911 for immediate emergencies</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Use the SOS button to alert your emergency contact</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Share your location with trusted contacts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Document any incidents with photos/screenshots</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Important Disclaimer */}
          <div className="card p-6 bg-amber-50 border-amber-200">
            <h3 className="font-semibold text-amber-900 mb-3">Important Disclaimer</h3>
            <div className="space-y-2 text-amber-800 text-sm">
              <p>
                MyZenTribe does not verify or vet all events, users, or content on our platform.
                You are responsible for your own safety and should exercise caution when interacting
                with others or attending events.
              </p>
              <p>
                We are not responsible for the actions of other users or what happens at events.
                Always use your best judgment and prioritize your safety.
              </p>
            </div>
          </div>

          {/* Links to Terms and Privacy */}
          <div className="text-center mt-6">
            <Link href="/terms-of-service" className="text-purple-600 underline mx-3">
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-purple-600 underline mx-3">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
