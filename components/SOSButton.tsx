"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

async function getGeo(): Promise<{ lat?: number; lon?: number }> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve({});
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => resolve({}), // user denied or failed
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });
}

export default function SOSButton({ compact = false }: { compact?: boolean }) {
  const [sending, setSending] = useState(false);
  const label = sending ? "Sending…" : compact ? "SOS" : "I don’t feel safe";

  async function sendSOS() {
    if (sending) return;
    const ok = compact
      ? confirm("Send SOS now?")
      : confirm("Send SOS to your emergency contact? (We’ll attach your location if allowed.)");
    if (!ok) return;

    setSending(true);
    try {
      const { lat, lon } = await getGeo();
      const { error } = await supabase.from("sos_incidents").insert({
        message: "I don’t feel safe",
        lat: lat ?? null,
        lon: lon ?? null,
      });
      if (error) throw error;
      alert("SOS sent. We’ll keep this in your SOS history.");
    } catch (e: any) {
      alert(e?.message || "Could not send SOS.");
    } finally {
      setSending(false);
    }
  }

  return (
    <button
      onClick={sendSOS}
      className={`inline-flex items-center justify-center rounded-full ${compact ? "px-3 py-1.5 text-sm" : "px-4 py-2"} border bg-white hover:bg-violet-50`}
      title="Send SOS"
      aria-label="Send SOS"
      disabled={sending}
    >
      <span style={{ marginRight: 6 }}>⚠️</span>{label}
    </button>
  );
}
