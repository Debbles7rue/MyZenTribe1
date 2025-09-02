// components/SOSFloatingButton.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SOSFloatingButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasSetup, setHasSetup] = useState(false);

  // Check if user has SOS setup
  useEffect(() => {
    checkSOSSetup();
  }, []);

  const checkSOSSetup = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("sos_contacts")
      .select("id, sos_enabled")
      .eq("user_id", user.id)
      .single();

    setHasSetup(data?.sos_enabled === true);
  };

  const sendSOS = async () => {
    setSending(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get emergency contact info
      const { data: contact } = await supabase
        .from("sos_contacts")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!contact) throw new Error("No emergency contact setup");

      // Get user location
      let locationText = "Location unavailable";
      let lat = null, lng = null;
      
      if ("geolocation" in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 10000,
              enableHighAccuracy: true
            });
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;
          locationText = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
          locationText += `\n${mapsUrl}`;
        } catch (e) {
          console.warn("Could not get location:", e);
        }
      }

      // Build the message
      const message = `${contact.emergency_message || "I need help. Please check on me."}\n\n${locationText}\n\n- Sent from MyZenTribe`;
      
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
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* SOS Button */}
      <button
        onClick={() => hasSetup ? setShowConfirm(true) : window.location.href = '/safety'}
        className="sos-btn"
        aria-label="Emergency SOS"
      >
        SOS
      </button>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <h2 className="text-xl font-bold text-red-600 mb-4">Send Emergency SOS?</h2>
            <p className="text-gray-700 mb-6">
              This will immediately send your emergency message and location to your contact.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={sending}
              >
                Cancel
              </button>
              <button
                onClick={sendSOS}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={sending}
              >
                {sending ? "Sending..." : "Yes, Send SOS"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .sos-btn {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 56px;
          height: 56px;
          background-color: #dc2626;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          border: none;
          box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);
          cursor: pointer;
          transition: all 0.2s;
          z-index: 50;
        }
        .sos-btn:hover {
          background-color: #b91c1c;
          transform: scale(1.1);
          box-shadow: 0 6px 12px rgba(220, 38, 38, 0.4);
        }
      `}</style>
    </>
  );
}
