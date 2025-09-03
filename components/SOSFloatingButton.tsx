// components/SOSFloatingButton.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";

type EmergencyContact = {
  emergency_contact_name: string | null;
  emergency_contact_method: "sms" | "email" | null;
  emergency_contact_value: string | null;
  emergency_message: string | null;
  user_phone: string | null;
  alert_interval: number;
  severity_level: 'low' | 'medium' | 'high';
  secondary_contact_value: string | null;
  stealth_mode: boolean;
};

export default function SOSFloatingButton() {
  const [user, setUser] = useState<User | null>(null);
  const [hasSetup, setHasSetup] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [nextAlertTime, setNextAlertTime] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const contactRef = useRef<EmergencyContact | null>(null);
  const [showQuickSelect, setShowQuickSelect] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState<'low' | 'medium' | 'high'>('medium');

  // Load user and check setup
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("emergency_contact_name, emergency_contact_method, emergency_contact_value, emergency_message, user_phone, alert_interval, severity_level, secondary_contact_value, stealth_mode")
          .eq("id", user.id)
          .maybeSingle();
        
        if (data?.emergency_contact_value) {
          setHasSetup(true);
          contactRef.current = data as EmergencyContact;
          setSelectedSeverity(data.severity_level || 'medium');
        }
      }
    })();
  }, []);

  // Stealth mode activation (triple volume press)
  useEffect(() => {
    if (!contactRef.current?.stealth_mode) return;

    let pressCount = 0;
    let pressTimer: NodeJS.Timeout;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Simulate volume button with 'v' key for demo
      if (e.key === 'v' || e.key === 'V') {
        pressCount++;
        
        clearTimeout(pressTimer);
        pressTimer = setTimeout(() => {
          pressCount = 0;
        }, 1000);

        if (pressCount >= 3) {
          pressCount = 0;
          setShowQuickSelect(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      clearTimeout(pressTimer);
    };
  }, [contactRef.current?.stealth_mode]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const sendSOS = async (severity?: 'low' | 'medium' | 'high') => {
    if (!user || !contactRef.current) return;

    try {
      setSending(true);
      const contact = contactRef.current;
      const actualSeverity = severity || selectedSeverity;

      // Get location
      let locationText = "Location unavailable";
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });
        
        const { latitude: lat, longitude: lng } = position.coords;
        locationText = `📍 Location: https://maps.google.com/?q=${lat},${lng}\nCoordinates: ${lat}, ${lng}`;
      } catch (err) {
        console.error("Location error:", err);
      }

      // Construct message based on severity
      const severityPrefix = {
        low: "⚠️ UNCOMFORTABLE SITUATION",
        medium: "🚨 UNSAFE - NEED HELP",
        high: "🆘 EMERGENCY - URGENT"
      };

      const message = `${severityPrefix[actualSeverity]}\n\n${contact.emergency_message || "I need help. Please check on me."}\n\n${locationText}\n\nAlert #${alertCount + 1} sent at ${new Date().toLocaleTimeString()}`;
      
      const finalMessage = contact.user_phone 
        ? `From: ${contact.user_phone}\n\n${message}\n\n- Sent from MyZenTribe`
        : `${message}\n\n- Sent from MyZenTribe`;

      // Log the incident
      await supabase.from("sos_incidents").insert({
        user_id: user.id,
        kind: "sos",
        message: contact.emergency_message,
        severity: actualSeverity,
        lat: locationText.includes("maps.google") ? parseFloat(locationText.split("q=")[1].split(",")[0]) : null,
        lon: locationText.includes("maps.google") ? parseFloat(locationText.split("q=")[1].split(",")[1].split("&")[0]) : null,
        status: "open",
        alert_count: alertCount + 1
      });

      // Send to primary contact
      if (contact.emergency_contact_method === "sms") {
        const smsUrl = `sms:${contact.emergency_contact_value}?body=${encodeURIComponent(finalMessage)}`;
        window.open(smsUrl, '_blank');
      } else if (contact.emergency_contact_method === "email") {
        const subject = encodeURIComponent(`${severityPrefix[actualSeverity]} - SOS ALERT`);
        const body = encodeURIComponent(finalMessage);
        const mailtoUrl = `mailto:${contact.emergency_contact_value}?subject=${subject}&body=${body}`;
        window.open(mailtoUrl, '_blank');
      }

      // Send to secondary contact if exists
      if (contact.secondary_contact_value) {
        setTimeout(() => {
          const secondaryMessage = `SECONDARY ALERT\n\n${finalMessage}`;
          if (contact.secondary_contact_value.includes('@')) {
            // Email
            const subject = encodeURIComponent(`${severityPrefix[actualSeverity]} - SOS ALERT (Secondary)`);
            const body = encodeURIComponent(secondaryMessage);
            window.open(`mailto:${contact.secondary_contact_value}?subject=${subject}&body=${body}`, '_blank');
          } else {
            // SMS
            window.open(`sms:${contact.secondary_contact_value}?body=${encodeURIComponent(secondaryMessage)}`, '_blank');
          }
        }, 2000);
      }

      setAlertCount(prev => prev + 1);
      setIsActive(true);

      // Setup repeat alerts if configured
      if (contact.alert_interval > 0 && !intervalRef.current) {
        const interval = contact.alert_interval;
        setNextAlertTime(new Date(Date.now() + interval));
        
        intervalRef.current = setInterval(() => {
          sendSOS(actualSeverity);
          setNextAlertTime(new Date(Date.now() + interval));
        }, interval);
      }

      setShowConfirm(false);
      setShowQuickSelect(false);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const cancelSOS = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setIsActive(false);
    setAlertCount(0);
    setNextAlertTime(null);

    // Update incident status
    if (user) {
      await supabase
        .from("sos_incidents")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("status", "open");
    }

    // Notify contact that SOS is cancelled
    if (contactRef.current) {
      const contact = contactRef.current;
      const cancelMessage = `✅ SOS CANCELLED\n\nI'm safe now. The emergency alert has been cancelled.\n\nTime: ${new Date().toLocaleString()}\nTotal alerts sent: ${alertCount}`;
      
      if (contact.emergency_contact_method === "sms") {
        window.open(`sms:${contact.emergency_contact_value}?body=${encodeURIComponent(cancelMessage)}`, '_blank');
      } else {
        window.open(`mailto:${contact.emergency_contact_value}?subject=${encodeURIComponent("SOS Cancelled - I'm Safe")}&body=${encodeURIComponent(cancelMessage)}`, '_blank');
      }
    }
  };

  // Quick severity selection dialog
  const QuickSelectDialog = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10000]">
      <div className="bg-white rounded-lg max-w-sm w-full p-6">
        <h2 className="text-xl font-bold mb-4">Select Urgency Level</h2>
        <div className="space-y-2">
          <button
            onClick={() => sendSOS('low')}
            className="w-full px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
            disabled={sending}
          >
            <div className="font-bold">Uncomfortable</div>
            <div className="text-sm opacity-90">Need a check-in call</div>
          </button>
          <button
            onClick={() => sendSOS('medium')}
            className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            disabled={sending}
          >
            <div className="font-bold">Unsafe</div>
            <div className="text-sm opacity-90">Need help soon</div>
          </button>
          <button
            onClick={() => sendSOS('high')}
            className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            disabled={sending}
          >
            <div className="font-bold">Emergency</div>
            <div className="text-sm opacity-90">Need immediate help</div>
          </button>
        </div>
        <button
          onClick={() => setShowQuickSelect(false)}
          className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          disabled={sending}
        >
          Cancel
        </button>
      </div>
    </div>
  );

  // Active SOS status bar
  const ActiveSOSBar = () => (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-3 z-[9998] animate-pulse">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
          <span className="font-bold">SOS ACTIVE</span>
          <span className="text-sm opacity-90">
            {alertCount} alert{alertCount !== 1 ? 's' : ''} sent
          </span>
          {nextAlertTime && (
            <span className="text-sm opacity-90">
              | Next in {Math.round((nextAlertTime.getTime() - Date.now()) / 1000)}s
            </span>
          )}
        </div>
        <button
          onClick={cancelSOS}
          className="px-4 py-1 bg-white text-red-600 rounded-lg font-bold hover:bg-gray-100"
        >
          Cancel SOS
        </button>
      </div>
    </div>
  );

  if (!user) return null;

  return (
    <>
      {/* Active SOS Bar */}
      {isActive && <ActiveSOSBar />}

      {/* SOS Button */}
      {!isActive && (
        <button
          onClick={() => hasSetup ? setShowConfirm(true) : window.location.href = '/safety'}
          className="sos-btn"
          aria-label="Emergency SOS"
        >
          SOS
        </button>
      )}

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <h2 className="text-xl font-bold text-red-600 mb-4">Send Emergency SOS?</h2>
            <p className="text-gray-700 mb-4">
              This will immediately send your emergency message and location to your contact.
            </p>
            {contactRef.current?.alert_interval && contactRef.current.alert_interval > 0 && (
              <p className="text-sm text-amber-600 mb-4 p-2 bg-amber-50 rounded">
                ⚠️ Auto-repeat enabled: Will send every {contactRef.current.alert_interval / 60000} minute(s)
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={sending}
              >
                Cancel
              </button>
              <button
                onClick={() => sendSOS()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={sending}
              >
                {sending ? "Sending..." : "Send SOS"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Select Dialog */}
      {showQuickSelect && <QuickSelectDialog />}

      <style jsx>{`
        .sos-btn {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          border: none;
          border-radius: 50%;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
          transition: all 0.3s ease;
          z-index: 9997;
          animation: pulse 2s infinite;
        }

        .sos-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 30px rgba(239, 68, 68, 0.6);
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
          }
          50% {
            box-shadow: 0 4px 30px rgba(239, 68, 68, 0.8);
          }
          100% {
            box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
          }
        }
      `}</style>
    </>
  );
}
