// app/safety/page.tsx
"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import SOSButton from "@/components/SOSButton";
import { getEmergencySettings, saveEmergencySettings } from "@/lib/sos";

type Method = "sms" | "email" | "";

export default function SafetySetupPage() {
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Form state
  const [enabled, setEnabled] = useState(false);
  const [name, setName] = useState("");
  const [method, setMethod] = useState<Method>("");
  const [value, setValue] = useState("");
  const [trackMs, setTrackMs] = useState<number>(0); // 0 = one-shot only

  useEffect(() => {
    (async () => {
      try {
        const s = await getEmergencySettings();
        setEnabled(!!s.sos_enabled);
        setName(s.emergency_contact_name ?? "");
        setMethod((s.emergency_contact_method as Method) ?? "");
        setValue(s.emergency_contact_value ?? "");
        setTrackMs(Number.isFinite(s.sos_track_ms) ? Number(s.sos_track_ms) : 0);
      } catch (e: any) {
        setErr(e?.message || "Could not load settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function validate() {
    if (!enabled) return;
    if (!method) throw new Error("Choose SMS or Email.");
    if (!value.trim()) throw new Error(method === "sms" ? "Enter a phone number." : "Enter an email.");
    if (method === "sms" && !/^\+?[1-9]\d{7,14}$/.test(value.trim())) {
      throw new Error("Phone must be E.164 (e.g., +15551234567).");
    }
    if (method === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim())) {
      throw new Error("Enter a valid email address.");
    }
  }

  async function onSave() {
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      validate();
      const { ok, error } = await saveEmergencySettings({
        sos_enabled: !!enabled,
        emergency_contact_name: name?.trim() || null,
        emergency_contact_method: (enabled ? method : null) as any,
        emergency_contact_value: enabled ? value?.trim() : null,
        sos_track_ms: enabled ? trackMs : 0,
      });
      if (!ok) throw new Error(error || "Failed to save.");
      setMsg("Saved!");
    } catch (e: any) {
      setErr(e?.message || "Save failed.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 2500);
    }
  }

  function onSendTest() {
    setErr(null);
    setMsg(null);
    try {
      validate();
      if (!enabled || !method || !value) throw new Error("Enable and complete the contact first.");
      const test =
        "This is a test from MyZenTribe SOS.\n\nIf you received this, I'm confirming my emergency contact is set up.\n— Sent from MyZenTribe";
      if (method === "sms") {
        const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent || "");
        const href = isiOS
          ? `sms:${encodeURIComponent(value)}&body=${encodeURIComponent(test)}`
          : `sms:${encodeURIComponent(value)}?body=${encodeURIComponent(test)}`;
        window.location.href = href;
      } else {
        const subject = encodeURIComponent("Test: MyZenTribe SOS");
        const body = encodeURIComponent(test);
        window.location.href = `mailto:${encodeURIComponent(value)}?subject=${subject}&body=${body}`;
      }
    } catch (e: any) {
      setErr(e?.message || "Could not open the composer.");
    }
  }

  return (
    <main
      className="min-h-screen p-6"
      style={{ background: "linear-gradient(180deg,#f5f3ff 0%, #fff7ed 100%)" }}
    >
      <div className="max-w-3xl mx-auto bg-white border border-purple-100 rounded-2xl shadow p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-semibold">Safety & SOS</h1>
          <Link href="/" className="btn">← Back to Home</Link>
        </div>

        {/* Disclaimers */}
        <div className="mt-3 text-neutral-800">
          <ul className="list-disc pl-5 text-sm space-y-1">
            <li><strong>We don’t monitor or vet all events.</strong> Use caution when attending any event—especially new or unverified ones.</li>
            <li><strong>Protect your information.</strong> Be careful sharing personal details. We’re not responsible for what others do with information you share.</li>
            <li><strong>Never send money to strangers.</strong> Scammers exist worldwide. We don’t support or endorse sending money to people you don’t know.</li>
          </ul>
        </div>

        {/* Setup form */}
        <div className="mt-6 card p-4" style={{ borderColor: "rgba(220,38,38,.2)" }}>
          <h2 className="text-lg font-semibold">Emergency Contact Setup</h2>
          <p className="muted text-sm mt-1">
            Configure who to notify when you press the big red SOS button on the Home page.
            We’ll open your phone’s SMS or email composer with a pre-filled message and your location.
          </p>

          {loading ? (
            <div className="muted mt-4">Loading…</div>
          ) : (
            <div className="stack mt-4" style={{ gap: 12 }}>
              <label className="checkbox" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                <span>Enable SOS contact</span>
              </label>

              <div className="grid" style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr" }}>
                <label className="field">
                  <span className="label">Contact name (optional)</span>
                  <input
                    className="input"
                    placeholder="e.g., Mom, Alex, Partner"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>

                <div className="grid" style={{ display: "grid", gap: 12, gridTemplateColumns: "160px 1fr" }}>
                  <label className="field">
                    <span className="label">Method</span>
                    <select
                      className="input"
                      value={method}
                      onChange={(e) => setMethod(e.target.value as Method)}
                      disabled={!enabled}
                    >
                      <option value="">Select…</option>
                      <option value="sms">SMS</option>
                      <option value="email">Email</option>
                    </select>
                  </label>

                  <label className="field">
                    <span className="label">
                      {method === "sms" ? "Phone (E.164, +15551234567)" : "Email address"}
                    </span>
                    <input
                      className="input"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={method === "sms" ? "+15551234567" : "name@example.com"}
                      disabled={!enabled}
                    />
                  </label>
                </div>

                <label className="field">
                  <span className="label">Location tracking after SOS</span>
                  <select
                    className="input"
                    value={String(trackMs)}
                    onChange={(e) => setTrackMs(parseInt(e.target.value, 10))}
                    disabled={!enabled}
                  >
                    <option value="0">No tracking (one-shot)</option>
                    <option value="60000">1 minute</option>
                    <option value="120000">2 minutes</option>
                    <option value="300000">5 minutes</option>
                  </select>
                  <div className="muted text-xs mt-1">
                    If enabled, the app updates your incident with fresh GPS for the selected time (rate-limited).
                  </div>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button className="btn btn-brand" onClick={onSave} disabled={saving}>
                  {saving ? "Saving…" : "Save settings"}
                </button>
                <button className="btn" onClick={onSendTest} disabled={!enabled || saving}>
                  Send test
                </button>
              </div>

              {msg && <div className="text-sm" style={{ color: "#065f46" }}>{msg}</div>}
              {err && <div className="text-sm" style={{ color: "#b91c1c" }}>{err}</div>}
            </div>
          )}
        </div>

        {/* Optional: show SOS here too for quick access */}
        <div className="mt-8">
          <div className="text-sm uppercase tracking-wide text-red-600 font-semibold text-center">
            Emergency
          </div>
          <div className="flex justify-center mt-2">
            <SOSButton variant="hero" label="Send SOS" />
          </div>
          <p className="muted text-xs text-center mt-2">
            The SOS button also appears on Home with a small “Setup/Change” link under it.
          </p>
        </div>

        <div className="flex justify-center gap-3 mt-8">
          <Link href="/" className="btn">Back to Home</Link>
        </div>
      </div>
    </main>
  );
}
