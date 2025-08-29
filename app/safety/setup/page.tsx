"use client";

import { useEffect, useState } from "react";
import { getEmergencySettings, saveEmergencySettings } from "@/lib/sos";

export default function SafetySetupPage() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [name, setName] = useState("");
  const [method, setMethod] = useState<"" | "sms" | "email">("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const s = await getEmergencySettings();
      setEnabled(!!s.sos_enabled);
      setName(s.emergency_contact_name ?? "");
      setMethod((s.emergency_contact_method as any) ?? "");
      setValue(s.emergency_contact_value ?? "");
      setLoading(false);
    })();
  }, []);

  async function save() {
    setBusy(true);
    setMsg(null);
    const { ok, error } = await saveEmergencySettings({
      sos_enabled: enabled,
      emergency_contact_name: name || null,
      emergency_contact_method: (method || null) as any,
      emergency_contact_value: value || null,
    });
    setBusy(false);
    setMsg(ok ? "Saved!" : (error || "Could not save."));
  }

  return (
    <main className="min-h-screen p-6" style={{ background: "#F4ECFF" }}>
      <div className="mx-auto max-w-2xl rounded-2xl border border-purple-100 bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold mb-2">Emergency Contact</h1>
        <p className="text-sm text-neutral-600 mb-4">
          Configure who we notify when you press SOS.
        </p>

        {loading ? <div>Loading…</div> : (
          <div className="grid gap-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={enabled} onChange={(e)=>setEnabled(e.target.checked)} />
              <span>Enable SOS</span>
            </label>

            <input className="input" placeholder="Contact name" value={name} onChange={(e)=>setName(e.target.value)} />

            <div className="grid gap-3 sm:grid-cols-2">
              <select className="input" value={method} onChange={(e)=>setMethod(e.target.value as any)}>
                <option value="">Method…</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
              </select>
              <input
                className="input"
                placeholder={method === "sms" ? "+15551234567" : "name@example.com"}
                value={value}
                onChange={(e)=>setValue(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button className="btn btn-brand" onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Save settings"}
              </button>
            </div>
            {msg && <div className="text-sm">{msg}</div>}
          </div>
        )}
      </div>
    </main>
  );
}
