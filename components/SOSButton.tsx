// components/SOSButton.tsx
"use client";

import React, { useCallback, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  className?: string;
  label?: string;
  // Optional: custom message (prepend); we'll append a timestamp + link.
  messagePrefix?: string;
};

export default function SOSButton({ className, label = "SOS — I feel unsafe", messagePrefix }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const onClick = useCallback(async () => {
    setBusy(true);
    setError(null);
    setOk(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        setError("Please sign in first.");
        setBusy(false);
        return;
      }

      let lat: number | null = null;
      let lon: number | null = null;

      // Try to get current position (best effort)
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!("geolocation" in navigator)) reject(new Error("Geolocation not available"));
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
        });
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      } catch {
        // If permission denied or unavailable, we continue — location will be null in DB
      }

      const nowIso = new Date().toISOString();
      const textParts = [
        messagePrefix?.trim() || "SOS — I don’t feel safe.",
        `Time: ${nowIso}`,
        lat != null && lon != null ? `Location: https://maps.google.com/?q=${lat},${lon}` : "(Location unavailable)"
      ].filter(Boolean);
      const message = textParts.join(" | ");

      // Create an sos_alerts row (server can pick this up to email/SMS)
      const { error: insErr } = await supabase.from("sos_alerts").insert({
        user_id: user.id,
        message,
        lat, lon,
        status: "new",
      });
      if (insErr) throw insErr;

      // Optional: Try an Edge Function if you later add one (no-build-fail guard)
      try {
        // @ts-ignore
        if (supabase.functions) {
          // This function name is just a placeholder; wrap in try/catch to avoid breaking if missing.
          await supabase.functions.invoke("send-sos", { body: { message, lat, lon } });
        }
      } catch {
        // ignore if not set up
      }

      setOk(true);
    } catch (e: any) {
      setError(e?.message || "Could not send SOS.");
    } finally {
      setBusy(false);
    }
  }, [messagePrefix]);

  return (
    <div className={className}>
      <button
        onClick={onClick}
        disabled={busy}
        className="w-full rounded-xl border border-red-200 bg-red-600 px-4 py-3 text-white font-semibold shadow hover:bg-red-700 active:translate-y-[1px]"
        title="Send SOS to your emergency contact"
      >
        {busy ? "Sending…" : label}
      </button>
      {ok && <p className="mt-2 text-sm text-green-700">SOS sent (queued). We’ll notify your emergency contact.</p>}
      {error && <p className="mt-2 text-sm text-rose-600">Error: {error}</p>}
    </div>
  );
}
