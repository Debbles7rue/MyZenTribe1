// components/SOSFloatingButton.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Phone, AlertTriangle, Settings, X, Shield, Bell, AlertCircle } from "lucide-react";

interface SOSContact {
  sos_enabled: boolean;
  emergency_contact_name: string | null;
  emergency_contact_method: 'sms' | 'email' | null;
  emergency_contact_value: string | null;
  emergency_message: string | null;
  user_phone: string | null;
  // Second contact (optional)
  second_contact_name: string | null;
  second_contact_method: 'sms' | 'email' | null;
  second_contact_value: string | null;
  // Alert levels
  alert_level: 'low' | 'medium' | 'high' | 'critical' | null;
  custom_message: string | null;
}

const ALERT_LEVELS = {
  low: {
    label: "Check In",
    color: "bg-yellow-500 hover:bg-yellow-600",
    icon: Bell,
    message: "Just checking in - please call me when you can."
  },
  medium: {
    label: "Need Help",
    color: "bg-orange-500 hover:bg-orange-600",
    icon: AlertCircle,
    message: "I need some help. Please contact me soon."
  },
  high: {
    label: "Urgent",
    color: "bg-red-500 hover:bg-red-600",
    icon: AlertTriangle,
    message: "This is urgent. I need help. Please contact me immediately."
  },
  critical: {
    label: "Emergency",
    color: "bg-red-700 hover:bg-red-800",
    icon: Shield,
    message: "EMERGENCY! I need immediate help. Please call 911 and come to my location."
  }
};

export default function SOSFloatingButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<keyof typeof ALERT_LEVELS>('high');
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [contact, setContact] = useState<SOSContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [sendToSecond, setSendToSecond] = useState(false);

  // Only show on dashboard and safety pages
  const shouldShowButton = pathname === '/dashboard' || pathname === '/safety' || pathname === '/';

  useEffect(() => {
    if (shouldShowButton) {
      loadSOSContact();
    }
  }, [shouldShowButton]);

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
        if (data.alert_level) {
          setSelectedLevel(data.alert_level);
        }
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
      setShowLevelSelect(true);
    }
  };

  const proceedWithLevel = () => {
    setShowLevelSelect(false);
    setShowConfirm(true);
    // Different countdown based on level
    const countdownTime = selectedLevel === 'critical' ? 3 : 5;
    setCountdown(countdownTime);
  };

  const cancelSOS = () => {
    setShowConfirm(false);
    setShowLevelSelect(false);
    setCountdown(null);
    setSendToSecond(false);
    setCustomMessage("");
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
      const levelInfo = ALERT_LEVELS[selectedLevel];
      const alertEmoji = selectedLevel === 'critical' ? '🆘🚨' : selectedLevel === 'high' ? '⚠️' : '📍';
      
      const locationText = lat && lng 
        ? `📍 My location: ${lat.toFixed(6)}, ${lng.toFixed(6)}\n🗺️ https://maps.google.com/?q=${lat},${lng}`
        : "📍 Location unavailable";

      // Use custom message if provided, otherwise use level default or saved message
      const userMessage = customMessage.trim() || contact.custom_message || contact.emergency_message || levelInfo.message;

      const message = `${alertEmoji} ${levelInfo.label.toUpperCase()} ALERT ${alertEmoji}\n\n${userMessage}\n\n${locationText}\n\n- Sent from MyZenTribe`;
      
      // Add user's phone if available
      const finalMessage = contact.user_phone 
        ? `From: ${contact.user_phone}\n\n${message}`
        : message;

      // Log the incident
      await supabase.from("sos_incidents").insert({
        user_id: user.id,
        kind: selectedLevel,
        message: userMessage,
        lat,
        lon: lng,
        status: "open"
      });

      // Send to primary contact
      const contacts = [contact.emergency_contact_value];
      
      // Add second contact if requested and available
      if (sendToSecond && contact.second_contact_value) {
        contacts.push(contact.second_contact_value);
      }

      // Send based on method
      if (contact.emergency_contact_method === "sms") {
        const recipients = sendToSecond && contact.second_contact_value 
          ? `${contact.emergency_contact_value};${contact.second_contact_value}`
          : contact.emergency_contact_value;
        
        const smsUrl = `sms:${recipients}?body=${encodeURIComponent(finalMessage)}`;
        window.location.href = smsUrl;
      } else if (contact.emergency_contact_method === "email") {
        const recipients = sendToSecond && contact.second_contact_value 
          ? `${contact.emergency_contact_value},${contact.second_contact_value}`
          : contact.emergency_contact_value;
        
        const subject = encodeURIComponent(`${alertEmoji} ${levelInfo.label.toUpperCase()} ALERT`);
        const body = encodeURIComponent(finalMessage);
        const mailtoUrl = `mailto:${recipients}?subject=${subject}&body=${body}`;
        window.location.href = mailtoUrl;
      }

      setShowConfirm(false);
      
      // Show success message
      alert(`${levelInfo.label} alert prepared. Please complete sending in your ${contact.emergency_contact_method === 'sms' ? 'SMS' : 'email'} app.`);
      
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSending(false);
      setCustomMessage("");
    }
  };

  if (!shouldShowButton || loading || !user) return null;

  const currentLevel = ALERT_LEVELS[selectedLevel];
  const IconComponent = currentLevel.icon;

  return (
    <>
      {/* SOS Floating Button */}
      <button
        onClick={handleSOSClick}
        className={`fixed bottom-6 right-6 px-4 py-3 ${currentLevel.color} text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2 z-50`}
        aria-label="Emergency SOS"
      >
        <IconComponent className="w-5 h-5" />
        <span className="text-sm font-bold">SOS</span>
      </button>

      {/* Alert Level Selection */}
      {showLevelSelect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Select Alert Level</h2>
              <button
                onClick={cancelSOS}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 mb-4">
              {Object.entries(ALERT_LEVELS).map(([key, level]) => {
                const LevelIcon = level.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedLevel(key as keyof typeof ALERT_LEVELS)}
                    className={`w-full p-3 rounded-lg border-2 transition-all ${
                      selectedLevel === key 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <LevelIcon className="w-5 h-5 mr-3" />
                      <div className="text-left flex-1">
                        <div className="font-medium">{level.label}</div>
                        <div className="text-xs text-gray-600">{level.message}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Message Option */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Custom Message (Optional)
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add a custom message or use the default..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                rows={2}
              />
            </div>

            {/* Second Contact Option */}
            {contact?.second_contact_value && (
              <label className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={sendToSecond}
                  onChange={(e) => setSendToSecond(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">
                  Also send to {contact.second_contact_name || 'second contact'}
                </span>
              </label>
            )}

            <button
              onClick={proceedWithLevel}
              className={`w-full px-4 py-3 ${currentLevel.color} text-white rounded-lg font-semibold`}
            >
              Send {currentLevel.label} Alert
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog with Countdown */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
                <IconComponent className="w-6 h-6" />
                {currentLevel.label} Alert
              </h2>
              <button
                onClick={cancelSOS}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-gray-700 mb-4">
              Sending to: <strong>{contact?.emergency_contact_name}</strong>
              {sendToSecond && contact?.second_contact_name && (
                <span> and <strong>{contact.second_contact_name}</strong></span>
              )}
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
                className={`flex-1 px-4 py-3 ${currentLevel.color} text-white rounded-lg font-semibold`}
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
    </>
  );
}
