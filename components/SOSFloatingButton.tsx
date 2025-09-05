// components/SOSFloatingButton.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Phone, AlertTriangle, Settings, X } from "lucide-react";

interface SOSContact {
  sos_enabled: boolean;
  emergency_contact_name: string | null;
  emergency_contact_method: 'sms' | 'email' | null;
  emergency_contact_value: string | null;
  emergency_message: string | null;
  user_phone: string | null;
}

export default function SOSFloatingButton() {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [sending, setSending] = useState(false);
  const [contact, setContact] = useState<SOSContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    loadSOSContact();
  }, []);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      sendSOS();
    }
  }, [countdown]);

  const loadSOSContact = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      
      setUser(user);

      const { data, error } = await supabase
        .from("sos_contacts")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setContact(data);
      }
    } catch (error) {
      console.error("Error loading SOS contact:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSOSClick = () => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!contact?.sos_enabled || !contact?.emergency_contact_value) {
      setShowSetup(true);
    } else {
      setShowConfirm(true);
      setCountdown(5); // 5 second countdown
    }
  };

  const cancelSOS = () => {
    setShowConfirm(false);
    setCountdown(null);
  };

  const sendSOS = async () => {
    if (!contact || !user) return;
    
    setSending(true);
    setCountdown(null);

    try {
      // Get user's location if available
      let lat: number | null = null;
      let lng: number | null = null;
      
      if ("geolocation" in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              enableHighAccuracy: true
            });
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;
        } catch (err) {
          console.log("Location not available");
        }
      }

      // Build the message
      const locationText = lat && lng 
        ? `My location: ${lat.toFixed(6)}, ${lng.toFixed(6)}\nhttps://maps.google.com/?q=${lat},${lng}`
        : "Location unavailable";

      const message = `🆘 EMERGENCY SOS ALERT 🆘\n\n${contact.emergency_message || "I need help. Please contact me immediately."}\n\n${locationText}\n\n- Sent from MyZenTribe`;
      
      // Add user's phone if available
      const finalMessage = contact.user_phone 
        ? `From: ${contact.user_phone}\n\n${message}`
        : message;

      // Log the incident
      await supabase.from("sos_incidents").insert({
        user_id: user.id,
        kind: "sos",
        message: contact.emergency_message,
        lat,
        lon: lng,
        status: "open"
      });

      // Send based on method
      if (contact.emergency_contact_method === "sms") {
        // Open SMS app with pre-filled message
        const smsUrl = `sms:${contact.emergency_contact_value}?body=${encodeURIComponent(finalMessage)}`;
        window.location.href = smsUrl;
      } else if (contact.emergency_contact_method === "email") {
        // Open email app with pre-filled message
        const subject = encodeURIComponent("EMERGENCY SOS ALERT");
        const body = encodeURIComponent(finalMessage);
        const mailtoUrl = `mailto:${contact.emergency_contact_value}?subject=${subject}&body=${body}`;
        window.location.href = mailtoUrl;
      }

      setShowConfirm(false);
      
      // Show success message
      alert("Emergency message prepared. Please complete sending in your email/SMS app.");
      
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  if (loading) return null;

  return (
    <>
      {/* SOS Floating Button - Always Visible */}
      <button
        onClick={handleSOSClick}
        className="fixed bottom-6 right-6 w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 flex items-center justify-center z-50 pulse-animation"
        aria-label="Emergency SOS"
      >
        <span className="text-2xl font-bold">SOS</span>
      </button>

      {/* Confirmation Dialog with Countdown */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6" />
                Emergency SOS
              </h2>
              <button
                onClick={cancelSOS}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-gray-700 mb-4">
              Sending emergency message to <strong>{contact?.emergency_contact_name}</strong> 
              {contact?.emergency_contact_method === 'sms' ? ' via SMS' : ' via Email'}
            </p>

            {countdown !== null && (
              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-red-600 mb-2">{countdown}</div>
                <p className="text-sm text-gray-600">Sending in {countdown} seconds...</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={cancelSOS}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                disabled={sending}
              >
                Cancel
              </button>
              <button
                onClick={sendSOS}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-semibold"
                disabled={sending}
              >
                {sending ? "Preparing..." : "Send Now"}
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              Your location will be included if available
            </p>
          </div>
        </div>
      )}

      {/* Setup Dialog */}
      {showSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Setup Emergency Contact</h2>
              <button
                onClick={() => setShowSetup(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Emergency Contact Set</h3>
              <p className="text-gray-600 mb-6">
                You need to set up an emergency contact before using SOS.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSetup(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Later
                </button>
                <button
                  onClick={() => router.push('/safety')}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Settings className="w-4 h-4 inline mr-2" />
                  Setup Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(220, 38, 38, 0);
          }
        }
        .pulse-animation {
          animation: pulse 2s infinite;
        }
      `}</style>
    </>
  );
}
