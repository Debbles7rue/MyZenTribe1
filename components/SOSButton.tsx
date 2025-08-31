"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  message?: string;
  className?: string;
  fixed?: boolean; // set true if you want the floating FAB
};

export default function SOSButton({
  message = "Emergency — please check on me.",
  className = "",
  fixed = true,
}: Props) {
  const [sending, setSending] = useState(false);

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
    if (sending) return;
    setSending(true);
    try {
      // MUST include the signer’s id or RLS will block
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        alert("Please log in first.");
        return;
      }

      const { lat, lon } = await getCoords();

      const { error } = await supabase.from("sos_incidents").insert({
        user_id: user.id,         // ✅ REQUIRED so RLS passes
        kind: "sos",
        message,
        lat,
        lon,
        status: "open",
      });

      if (error) {
        alert(`Could not send SOS. ${error.message}`);
      } else {
        alert("SOS sent. Your emergency contact(s) will be notified.");
      }
    } catch (e: any) {
      alert(`Could not send SOS. ${e?.message ?? "Unknown error"}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <button
      onClick={sendSOS}
      aria-label="Send SOS"
      disabled={sending}
      className={
        className ||
        (fixed
          ? "fixed bottom-6 right-6 z-50 px-5 py-3 rounded-full text-white font-semibold shadow-lg"
          : "px-5 py-3 rounded-full text-white font-semibold shadow-lg")
      }
      style={{
        background: sending ? "#ef4444cc" : "#ef4444",
        boxShadow: "0 10px 26px rgba(239,68,68,.35)",
      }}
    >
      {sending ? "Sending…" : "SOS"}
    </button>
  );
}
