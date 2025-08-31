// components/SOSButton.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getEmergencySettings } from "@/lib/sos";

type Props = {
  variant?: "hero" | "inline";
  label?: string;
  /** How long to keep refreshing GPS into the DB after pressing SOS (ms). Use 0 for one-shot only. */
  trackForMs?: number; // default 0 (no ongoing watch)
};

export default function SOSButton({ variant = "hero", label = "SOS", trackForMs = 0 }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const stopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<{ t: number; lat: number; lon: number } | null>(null);

  // Ensure we never leave a watcher running
  useEffect(() => {
    function cleanup() {
      if (watchIdRef.current != null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
    }
    // Stop if tab becomes hidden
    const onVis = () => { if (document.hidden) cleanup(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); cleanup(); };
  }, []);

  async function onClick() {
    setErr(null);
    setBusy(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in to use SOS.");

      const s = await getEmergencySettings();
      const method = (s.emergency_contact_method as "sms" | "email" | null) || null;
      const value = (s.emergency_contact_value as string | null) || null;
      const contactName = s.emergency_contact_name || "Emergency Contact";
      if (!method || !value) throw new Error("Set up an emergency contact in Profile → Safety first.");

      // One-shot position
      const pos = await getPositionOnce({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }).catch(() => null);
      const lat = pos?.coords.latitude ?? null;
      const lon = pos?.coords.longitude ?? null;

      // Create incident
      const baseMsg = "I need help. Please contact me ASAP.";
      const { data: ins, error: insErr } = await supabase
        .from("sos_incidents")
        .insert({ user_id: user.id, kind: "sos", message: baseMsg, lat, lon, status: "open" })
        .select("id")
        .single();
      if (insErr) throw insErr;
      const incidentId = ins?.id;

      // Optional: short, capped tracking (DB only)
      if (trackForMs > 0 && "geolocation" in navigator) {
        lastUpdateRef.current = lat && lon ? { t: Date.now(), lat, lon } : null;

        watchIdRef.current = navigator.geolocation.watchPosition(
          async (p) => {
            const now = Date.now();
            const prev = lastUpdateRef.current;
            const cur = { t: now, lat: p.coords.latitude, lon: p.coords.longitude };

            // Throttle to ≥10s and ≥20m movement
            const enoughTime = !prev || now - prev.t >= 10_000;
            const movedEnough = !prev || haversine(prev.lat, prev.lon, cur.lat, cur.lon) >= 0.02; // ~20 meters
            if (enoughTime && movedEnough) {
              await supabase.from("sos_incidents").update({ lat: cur.lat, lon: cur.lon }).eq("id", incidentId);
              lastUpdateRef.current = cur;
            }
          },
          () => {}, // ignore transient errors
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );

        // Auto-stop after trackForMs
        stopTimerRef.current = setTimeout(() => {
          if (watchIdRef.current != null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
        }, trackForMs);
      }

      // Compose & open native SMS/Email
      const maps = lat && lon ? `https://maps.google.com/?q=${lat},${lon}` : "";
      const text =
        `${baseMsg}\n\n` +
        (lat && lon ? `My location:\n${lat.toFixed(6)}, ${lon.toFixed(6)}\n${maps}\n\n` : "") +
        `— Sent from MyZenTribe`;

      if (method === "sms") {
        const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent || "");
        const href = isiOS
          ? `sms:${encodeURIComponent(value)}&body=${encodeURIComponent(text)}`
          : `sms:${encodeURIComponent(value)}?body=${encodeURIComponent(text)}`;
        window.location.href = href;
      } else {
        const subject = encodeURIComponent("URGENT: SOS");
        const body = encodeURIComponent(text);
        window.location.href = `mailto:${encodeURIComponent(value)}?subject=${subject}&body=${body}`;
      }
    } catch (e: any) {
      setErr(e?.message || "Could not start SOS.");
    } finally {
      setBusy(false);
    }
  }

  const classes =
    variant === "hero"
      ? "inline-flex items-center justify-center w-full sm:w-auto px-5 py-3 rounded-xl text-white font-semibold"
      : "btn btn-brand";

  const style = variant === "hero"
    ? { background: "#dc2626", boxShadow: "0 6px 18px rgba(220,38,38,.35)" }
    : undefined;

  return (
    <div>
      <button className={classes} style={style} onClick={onClick} disabled={busy}>
        {busy ? "Sending…" : label}
      </button>
      {err && <div className="text-sm mt-2" style={{ color: "#b91c1c" }}>{err}</div>}
    </div>
  );
}

/* helpers */

function getPositionOnce(opts: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("Geolocation not available"));
    navigator.geolocation.getCurrentPosition(resolve, reject, opts);
  });
}

/** Returns distance in km between two lat/lon pairs (Haversine). */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
