// components/SOSButton.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { getEmergencySettings } from "@/lib/sos";
import type { EmergencySettings } from "@/lib/sos";

type Props = {
  message?: string;
  className?: string;
  fixed?: boolean;
};

export default function SOSButton({
  message = "Emergency — please check on me.",
  className = "",
  fixed = true,
}: Props) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasSetup, setHasSetup] = useState(false);
  const [contact, setContact] = useState<EmergencySettings | null>(null);
  const [user, setUser] = useState<any>(null);

  // Check if user has SOS setup
  useEffect(() => {
    checkSOSSetup();
  }, []);

  const checkSOSSetup = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    setUser(user);

    // Get emergency settings
    const settings = await getEmergencySettings();
    
    if (settings?.emergency_contact_value && settings?.sos_enabled) {
      setHasSetup(true);
      setContact(settings);
    } else {
      setHasSetup(false);
    }
  };

  async function getCoords(): Promise<{ lat: number | null; lon: number | null }> {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      return { lat: null, lon: null };
    }
    return new Promise((resolve) => {
      const done = (lat: number | null, lon: number | null) => resolve({ lat, lon });
      navigator.geolocation.getCurrentPosition(
        (pos) => done(pos.coords.latitude, pos.coords.longitude),
        () => done(null, null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  }

  async function sendSOS() {
    if (!user || !contact) return;
    
    setSending(true);
    
    try {
      // Get location
      const { lat, lon } = await getCoords();
      let locationText = "Location unavailable";
      
      if (lat && lon) {
        locationText = `📍 Location: https://maps.google.com/?q=${lat},${lon}\n`;
        locationText += `Coordinates: ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
      }

      // Build the message
      const emergencyMessage = `🆘 EMERGENCY SOS ALERT\n\n${contact.emergency_message || message}\n\n${locationText}\n\nSent at: ${new Date().toLocaleString()}`;
      
      // Add user's phone if available
      const finalMessage = contact.user_phone 
        ? `From: ${contact.user_phone}\n\n${emergencyMessage}\n\n- Sent from MyZenTribe`
        : `${emergencyMessage}\n\n- Sent from MyZenTribe`;

      // Log the incident to database
      const { error } = await supabase.from("sos_incidents").insert({
        user_id: user.id,
        kind: "sos",
        message: contact.emergency_message || message,
        lat,
        lon,
        status: "open",
      });

      if (error) {
        alert(`Could not send SOS. ${error.message}`);
        return;
      }

      // Send based on method
      if (contact.emergency_contact_method === "sms") {
        // Open SMS app with pre-filled message
        const smsUrl = `sms:${contact.emergency_contact_value}?body=${encodeURIComponent(finalMessage)}`;
        window.open(smsUrl, '_blank');
      } else if (contact.emergency_contact_method === "email") {
        // Open email app with pre-filled message
        const subject = encodeURIComponent("🆘 EMERGENCY SOS ALERT");
        const body = encodeURIComponent(finalMessage);
        const mailtoUrl = `mailto:${contact.emergency_contact_value}?subject=${subject}&body=${body}`;
        window.open(mailtoUrl, '_blank');
      }

      setShowConfirm(false);
      alert("SOS alert sent successfully! Your emergency contact has been notified.");
    } catch (e: any) {
      alert(`Could not send SOS. ${e?.message ?? "Unknown error"}`);
    } finally {
      setSending(false);
    }
  }

  const handleButtonClick = () => {
    if (!user) {
      alert("Please log in first.");
      router.push('/login');
      return;
    }
    
    // Always show the confirmation dialog
    setShowConfirm(true);
  };

  const handleChangeSettings = () => {
    setShowConfirm(false);
    router.push('/safety');
  };

  // Determine button style based on fixed prop
  const buttonClass = fixed
    ? "fixed bottom-6 right-6 z-50 px-5 py-3 rounded-full text-white font-semibold shadow-lg sos-floating"
    : className || "px-5 py-3 rounded-full text-white font-semibold shadow-lg sos-inline";

  return (
    <>
      {/* SOS Button */}
      <button
        onClick={handleButtonClick}
        aria-label="Send SOS"
        disabled={sending}
        className={buttonClass}
        style={{
          background: sending ? "#ef4444cc" : "#ef4444",
          boxShadow: "0 10px 26px rgba(239,68,68,.35)",
        }}
      >
        {sending ? "Sending…" : "SOS"}
      </button>

      {/* Enhanced Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            {hasSetup ? (
              <>
                {/* Has Setup - Show Send Confirmation */}
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Send Emergency SOS?</h2>
                  <p className="text-gray-600">
                    This will immediately notify:
                  </p>
                  <p className="font-semibold text-gray-800 mt-2">
                    {contact?.emergency_contact_name || "Your emergency contact"}
                  </p>
                  {contact?.emergency_message && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 text-left">
                      <span className="font-medium">Your message:</span><br />
                      "{contact.emergency_message}"
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Yes - Send SOS (Green) */}
                  <button
                    onClick={sendSOS}
                    disabled={sending}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sending ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      "Yes - Send SOS"
                    )}
                  </button>

                  {/* No - Cancel (Red) */}
                  <button
                    onClick={() => setShowConfirm(false)}
                    disabled={sending}
                    className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    No - Cancel
                  </button>

                  {/* Change Settings (Blue) */}
                  <button
                    onClick={handleChangeSettings}
                    disabled={sending}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    Change Settings
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* No Setup - Prompt to Configure */}
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">SOS Not Set Up</h2>
                  <p className="text-gray-600">
                    You need to configure your emergency contact before you can send an SOS alert.
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Set Up Now (Green) */}
                  <button
                    onClick={handleChangeSettings}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    Set Up Now
                  </button>

                  {/* Cancel (Gray) */}
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="w-full px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .sos-floating {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 10px 26px rgba(239, 68, 68, 0.35);
          }
          50% {
            box-shadow: 0 10px 35px rgba(239, 68, 68, 0.5);
          }
          100% {
            box-shadow: 0 10px 26px rgba(239, 68, 68, 0.35);
          }
        }
      `}</style>
    </>
  );
}
