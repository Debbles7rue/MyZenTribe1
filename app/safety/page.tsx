// app/safety/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getSafetyPrefs, upsertSafetyPrefs } from "@/lib/safety";

type Prefs = {
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  sos_message: string;
};

const DEFAULT_MESSAGE =
  "I don't feel safe. Please reach me and/or contact help.\n(This was sent from MyZenTribe SOS.)";

export default function SafetyPage() {
  const router = useRouter();
  const search = useSearchParams();

  // first=1 means we arrived from first-run flow; next tells where to go after.
  const firstRun = (search?.get("first") || "") === "1";
  const next = search?.get("next") || "/";

  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    sos_message: DEFAULT_MESSAGE,
  });

  // pull session
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  // load prefs
  useEffect(() => {
    (async () => {
      if (!uid) return;
      setLoading(true);
      const { row, error } = await getSafetyPrefs();
      if (!error && row) {
        setPrefs({
          contact_name: row.contact_name || "",
          contact_email: row.contact_email || "",
          contact_phone: row.contact_phone || "",
          sos_message: row.sos_message || DEFAULT_MESSAGE,
        });
      }
      setLoading(false);
    })();
  }, [uid]);

  async function save() {
    if (!uid) return;
    setSaving(true);
    const { ok, error } = await upsertSafetyPrefs({
      contact_name: prefs.contact_name || null,
      contact_email: prefs.contact_email || null,
      contact_phone: prefs.contact_phone || null,
      sos_message: prefs.sos_message || DEFAULT_MESSAGE,
    });
    setSaving(false);
    if (!ok) {
      alert(error || "Could not save preferences.");
      return;
    }
    if (firstRun) {
      router.replace(next);
    } else {
      alert("Saved!");
    }
  }

  // Build a mailto test link (includes best-effort location if user allows it)
  const [geoUrl, setGeoUrl] = useState<string>("");
  useEffect(() => {
    let cancelled = false;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          const { latitude, longitude } = pos.coords;
          setGeoUrl(`https://maps.google.com/?q=${latitude},${longitude}`);
        },
        () => setGeoUrl("")
      );
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const mailtoHref = useMemo(() => {
    const to = prefs.contact_email?.trim() ? prefs.contact_email.trim() : "";
    const subject = encodeURIComponent("SOS — I need help");
    const bodyLines = [
      prefs.sos_message || DEFAULT_MESSAGE,
      "",
      geoUrl ? `My location: ${geoUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const body = encodeURIComponent(bodyLines);
    return `mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`;
  }, [prefs.contact_email, prefs.sos_message, geoUrl]);

  return (
    <main className="min-h-screen p-6" style={{ background: "#F4ECFF" }}>
      <div className="mx-auto w-full max-w-3xl">
        {firstRun && (
          <div className="mb-4 rounded-xl border border-purple-200 bg-white p-3 text-sm">
            <div className="font-medium">Welcome!</div>
            <div>
              This is your Safety hub. Add an emergency contact now so the red SOS button can notify
              them quickly if you feel unsafe. You can change these anytime.
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow">
          <h1 className="text-2xl font-semibold">Safety</h1>
          <p className="text-neutral-700 mt-1">
            Use good judgment when attending events. We don’t monitor or verify events. Be careful
            sharing personal information. Never send money to strangers.
          </p>

          <div className="h-px my-4 bg-purple-100" />

          <h2 className="text-lg font-semibold">Emergency Contact (SOS)</h2>
          <p className="text-sm text-neutral-600">
            When you press SOS, we’ll notify this contact with your message and (if allowed) a link
            to your location.
          </p>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="flex flex-col">
              <span className="text-sm font-medium">Contact name</span>
              <input
                className="input"
                value={prefs.contact_name}
                onChange={(e) => setPrefs({ ...prefs, contact_name: e.target.value })}
                placeholder="e.g., Taylor Jordan"
              />
            </label>
            <label className="flex flex-col">
              <span className="text-sm font-medium">Contact email</span>
              <input
                className="input"
                type="email"
                value={prefs.contact_email}
                onChange={(e) => setPrefs({ ...prefs, contact_email: e.target.value })}
                placeholder="name@example.com"
              />
            </label>
            <label className="flex flex-col md:col-span-2">
              <span className="text-sm font-medium">Contact phone (optional)</span>
              <input
                className="input"
                value={prefs.contact_phone}
                onChange={(e) => setPrefs({ ...prefs, contact_phone: e.target.value })}
                placeholder="+1 555 123 4567"
              />
            </label>
            <label className="flex flex-col md:col-span-2">
              <span className="text-sm font-medium">SOS message</span>
              <textarea
                className="input"
                rows={4}
                value={prefs.sos_message}
                onChange={(e) => setPrefs({ ...prefs, sos_message: e.target.value })}
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn btn-brand" onClick={save} disabled={!uid || saving || loading}>
              {saving ? "Saving…" : firstRun ? "Save & Continue" : "Save"}
            </button>
            {/* Test SOS via email link */}
            <a
              className="btn"
              href={mailtoHref}
              onClick={(e) => {
                if (!prefs.contact_email?.trim()) {
                  e.preventDefault();
                  alert("Add a contact email first.");
                }
              }}
            >
              Test SOS Email
            </a>
          </div>
        </div>

        <div className="text-center mt-6">
          {!firstRun ? (
            <a className="text-sm text-neutral-600 hover:underline" href="/">
              ← Back to Home
            </a>
          ) : null}
        </div>
      </div>
    </main>
  );
}
