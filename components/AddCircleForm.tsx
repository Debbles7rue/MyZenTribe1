// components/AddCircleForm.tsx
"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  communityId: string;
  zip: string | null;
  onClose: () => void;
  onSaved: () => void;
};

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const PIN_CATEGORIES = [
  "Drum Circles",
  "Sound Baths",
  "Yoga",
  "Qi Gong",
  "Meditation",
  "Wellness",
  "Nature/Outdoors",
  "Arts & Crafts",
  "Parenting",
  "Recovery/Support",
  "Local Events",
  "Other",
];

export default function AddCircleForm({ communityId, zip, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);

  // questionnaire fields
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("");
  const [address, setAddress] = useState(zip || "");
  const [day, setDay] = useState<string>("");
  const [timeLocal, setTimeLocal] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [websiteUrl, setWebsiteUrl] = useState<string>("");

  const initialQuery = useMemo(() => (zip ? String(zip) : ""), [zip]);

  function isEmail(v: string) {
    if (!v) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  }
  function hasContact() {
    const phoneOk = contactPhone.trim().length > 0;
    const emailOk = isEmail(contactEmail);
    return phoneOk || emailOk;
  }

  async function geocode(q: string) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      q
    )}`;
    const r = await fetch(url, {
      headers: {
        "Accept-Language": "en",
        "User-Agent": "myzentribe/1.0 (contact: site admin)", // polite UA for Nominatim
      },
    });
    if (!r.ok) throw new Error("Geocoding failed");
    const arr = (await r.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    return arr[0]
      ? { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon), label: arr[0].display_name }
      : null;
  }

  async function handleSave() {
    if (!category) {
      alert("Please choose a category.");
      return;
    }
    if (!address.trim()) {
      alert("Please enter an address or ZIP.");
      return;
    }
    if (!hasContact()) {
      alert("Please add at least a phone number or a valid email so people can reach you.");
      return;
    }

    setSaving(true);
    try {
      // 1) Geocode address -> lat/lng
      const query = address.trim() || initialQuery || "";
      const picked = await geocode(query);
      if (!picked) {
        alert("Couldn't find that address—try a more specific address or city/ZIP.");
        setSaving(false);
        return;
      }

      // 2) Insert into Supabase
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id ?? null;

      const normalizedWebsite =
        websiteUrl.trim() && !/^https?:\/\//i.test(websiteUrl.trim())
          ? `https://${websiteUrl.trim()}`
          : websiteUrl.trim() || null;

      const { error } = await supabase.from("community_circles").insert({
        community_id: communityId,
        name: name.trim() || null,
        category,                     // <-- IMPORTANT: pin category for filtering
        lat: picked.lat,
        lng: picked.lng,
        address: picked.label || address.trim(),
        day_of_week: day || null,
        time_local: timeLocal || null,
        contact_phone: contactPhone.trim() || null,
        contact_email: contactEmail.trim() || null,
        website_url: normalizedWebsite,
        created_by: userId,
      });

      if (error) throw error;

      onSaved(); // parent refreshes the big map
      onClose();
    } catch (e: any) {
      alert(e.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 16 }}>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <div className="label">Category</div>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Select a category…</option>
              {PIN_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <div className="label">Circle / listing name (optional)</div>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Saturday Sunset Circle"
            />
          </div>
        </div>

        <div className="field">
          <div className="label">Address / city / ZIP</div>
          <input
            className="input"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street, city, or ZIP"
          />
          <div className="muted" style={{ fontSize: 12 }}>
            We’ll place the pin automatically based on this location.
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <div className="label">Day (optional)</div>
            <select className="input" value={day} onChange={(e) => setDay(e.target.value)}>
              <option value="">—</option>
              {DAYS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <div className="label">Time (optional)</div>
            <input
              className="input"
              type="time"
              value={timeLocal}
              onChange={(e) => setTimeLocal(e.target.value)}
            />
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <div className="label">Contact phone (required if no email)</div>
            <input
              className="input"
              type="tel"
              inputMode="tel"
              placeholder="e.g., 555-555-5555"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>

          <div className="field">
            <div className="label">Contact email (required if no phone)</div>
            <input
              className="input"
              type="email"
              placeholder="name@example.com"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
            <div className="muted" style={{ fontSize: 12 }}>
              Provide at least one: phone or email.
            </div>
          </div>
        </div>

        <div className="field">
          <div className="label">Website (optional)</div>
          <input
            className="input"
            type="url"
            placeholder="https://your-site.com"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
          />
        </div>

        <div className="right">
          <button className="btn" onClick={onClose} style={{ marginRight: 8 }}>
            Cancel
          </button>
          <button className="btn btn-brand" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save circle"}
          </button>
        </div>
      </div>
    </div>
  );
}
