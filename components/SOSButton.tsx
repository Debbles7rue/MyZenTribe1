"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  className?: string;
};

export default function SOSButton({ className }: Props) {
  const router = useRouter();
  const [sending, setSending] = useState(false);

  async function handleSOS() {
    try {
      setSending(true);

      // Must be signed in and we must include user_id in the insert (RLS requirement)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Please log in to use SOS.");
        router.push("/login");
        return;
      }

      // Try to get location (optional)
      const loc = await getLocation().catch(() => null);

      // You can customize the message
      const message = "SOS triggered from MyZenTribe app";

      const { error } = await supabase.from("sos_incidents").insert({
        user_id: user.id,            // ✅ REQUIRED for RLS
        kind: "sos",
        message,
        lat: loc?.lat ?? null,
        lon: loc?.lon ?? null,
        status: "open",
      });

      if (error) throw error;

      alert("SOS sent. Your emergency contacts will be notified.");
      // Optional: route to an SOS status page
      // router.push("/safety");
    } catch (e: any) {
      alert(`Could not send SOS. ${e?.message ?? "Unknown error"}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <button
      aria-label="Send SOS"
      onClick={handleSOS}
      disabled={sending}
      className={className ?? "fixed bottom-6 right-6 rounded-full px-5 py-3 text-white bg-rose-500 shadow-lg"}
      style={{ opacity: sending ? 0.7 : 1 }}
    >
      {sending ? "Sending…" : "SOS"}
    </button>
  );
}

function getLocation(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      return reject(new Error("Geolocation unavailable"));
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}
