// components/AddCircleForm.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PlacePicker from "@/components/PlacePicker";

const CATEGORIES = [
  "Wellness","Meditation","Yoga","Breathwork","Sound Baths","Drum Circles",
  "Arts & Crafts","Nature/Outdoors","Parenting","Recovery/Support","Local Events","Other",
];

type ServiceRow = { id: string; category: string; schedule: string };

export default function AddCircleForm({
  communityId,
  zip,
  onClose,
  onSaved,
}: {
  communityId?: string | null;   // optional per your flow
  zip?: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [place, setPlace] = useState<{lat:number; lng:number; label?:string} | null>(null);

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");

  // multiple services for this pin
  const [services, setServices] = useState<ServiceRow[]>([
    { id: crypto.randomUUID(), category: "", schedule: "" },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoriesForPin = useMemo(() => {
    const arr = services
      .map(s => s.category.trim())
      .filter(Boolean);
    return Array.from(new Set(arr));
  }, [services]);

  function addServiceRow() {
    setServices(s => [...s, { id: crypto.randomUUID(), category: "", schedule: "" }]);
  }
  function removeServiceRow(id: string) {
    setServices(s => s.length <= 1 ? s : s.filter(r => r.id !== id));
  }
  function updateService(id: string, patch: Partial<ServiceRow>) {
    setServices(s => s.map(r => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function handleSave() {
    setError(null);

    // basic validations
    if (!place) {
      setError("Please pick a spot on the map.");
      return;
    }
    if (!phone.trim() && !email.trim()) {
      setError("Please provide a phone OR an email so people can contact you.");
      return;
    }
    const filled = services.filter(s => s.category.trim() || s.schedule.trim());
    if (filled.length === 0) {
      setError("Add at least one service (category + schedule).");
      return;
    }

    setSaving(true);
    try {
      // 1) create the pin
      const insertCircle = {
        community_id: communityId ?? null,
        name: name || null,
        lat: place.lat,
        lng: place.lng,
        address: address || place.label || null,
        contact_phone: phone || null,
        contact_email: email || null,
        website_url: website || null,
        categories: categoriesForPin.length ? categoriesForPin : null, // text[] on the circle
        // legacy fields (safe to leave null)
        day_of_week: null,
        time_local: null,
      };

      const { data: circle, error: cErr } = await supabase
        .from("community_circles")
        .insert(insertCircle)
        .select("*")
        .single();

      if (cErr) throw cErr;

      // 2) add services
      const serviceRows = filled.map(s => ({
        circle_id: circle.id,
        category: (s.category || "Other").trim(),
        schedule_text: (s.schedule || "No set time — contact").trim(),
      }));

      const { error: sErr } = await supabase
        .from("circle_services")
        .insert(serviceRows);

      if (sErr) throw sErr;

      onSaved();
    } catch (e: any) {
      setError(e.message || "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-3">
      <div className="field">
        <div className="label">Circle name (optional)</div>
        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Saturday Sunset Circle" />
      </div>

      <div className="field">
        <div className="label">Address / place</div>
        <input className="input" value={address} onChange={e => setAddress(e.target.value)} placeholder="(optional) Street, City, ZIP"/>
      </div>

      <div className="field">
        <PlacePicker
          value={place}
          onChange={(p) => {
            setPlace(p);
            if (!address && p?.label) setAddress(p.label);
          }}
          initialQuery={zip || ""}
          height={360}
        />
      </div>

      <div className="field">
        <div className="label">Services (category + schedule)</div>

        {services.map((row, i) => (
          <div key={row.id} className="card p-3" style={{ marginBottom: 8 }}>
            <div className="form-grid">
              <div>
                <div className="label">Category</div>
                <select
                  className="input"
                  value={row.category}
                  onChange={(e) => updateService(row.id, { category: e.target.value })}
                >
                  <option value="">Select…</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <div className="label">Schedule</div>
                <input
                  className="input"
                  placeholder='e.g., "1st Monday 7–8pm", "No set time — contact"'
                  value={row.schedule}
                  onChange={(e) => updateService(row.id, { schedule: e.target.value })}
                />
              </div>

              <div className="span-2" style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn" onClick={() => removeServiceRow(row.id)} disabled={services.length <= 1}>
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}

        <div className="right">
          <button className="btn" onClick={addServiceRow}>Add another service</button>
        </div>

        <div className="muted" style={{ marginTop: 6 }}>
          You can list multiple offerings here (e.g., Drum Circles, Sound Baths, Qi Gong) with different schedules.
        </div>
      </div>

      <div className="form-grid">
        <div>
          <div className="label">Contact phone</div>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(xxx) xxx-xxxx" />
        </div>
        <div>
          <div className="label">Contact email</div>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        </div>
      </div>

      <div className="field">
        <div className="label">Website (optional)</div>
        <input className="input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
      </div>

      {error && <div className="note" style={{ color: "#b91c1c", borderColor: "#fecaca", background: "#fef2f2" }}>{error}</div>}

      <div className="modal-footer">
        <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-brand" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save circle"}
        </button>
      </div>
    </div>
  );
}
