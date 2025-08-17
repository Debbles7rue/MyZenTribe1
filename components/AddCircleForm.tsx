// components/AddCircleForm.tsx
"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  communityIds: string[]; // may be []
  zip: string | null;
  onClose: () => void;
  onSaved: () => void;
};

const CATEGORY_CHOICES = [
  "Drum Circles","Sound Baths","Yoga","Qi Gong","Meditation","Wellness",
  "Nature/Outdoors","Arts & Crafts","Parenting","Recovery/Support","Local Events","Other",
];

export default function AddCircleForm({ communityIds, zip, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);

  // questionnaire fields
  const [name, setName] = useState("");
  const [address, setAddress] = useState(zip || "");
  const [dayText, setDayText] = useState<string>("");   // free-text
  const [timeText, setTimeText] = useState<string>(""); // free-text

  const [contactPhone, setContactPhone] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [websiteUrl, setWebsiteUrl] = useState<string>("");

  // MULTI-CATEGORY
  const [categories, setCategories] = useState<string[]>([]);
  const [nextCat, setNextCat] = useState<string>("");

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

  function addCategory() {
    const c = nextCat.trim();
    if (!c) return;
    if (!categories.includes(c)) setCategories([...categories, c]);
    setNextCat("");
  }
  function removeCategory(c: string) {
    setCategories(categories.filter((x) => x !== c));
  }

  async function geocode(q: string) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, {
      headers: {
        "Accept-Language": "en",
        "User-Agent": "myzentribe/1.0 (contact: site admin)",
      },
    });
    if (!r.ok) throw new Error("Geocoding failed");
    const arr = (await r.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    return arr[0] ? { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon), label: arr[0].display_name } : null;
  }

  async function handleSave() {
    if (categories.length === 0) {
      alert("Please add at least one category.");
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
      const picked = await geocode(address.trim() || initialQuery || "");
      if (!picked) {
        alert("Couldn't find that address—try a more specific address or city/ZIP.");
        setSaving(false);
        return;
      }

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id ?? null;

      const normalizedWebsite =
        websiteUrl.trim() && !/^https?:\/\//i.test(websiteUrl.trim())
          ? `https://${websiteUrl.trim()}`
          : websiteUrl.trim() || null;

      const firstCommunity = communityIds[0] ?? null;     // legacy/compat column
      const firstCategory  = categories[0] ?? null;        // legacy/compat column

      // Insert pin and fetch its id
      const { data: inserted, error: insErr } = await supabase
        .from("community_circles")
        .insert({
          community_id: firstCommunity,   // legacy single
          name: name.trim() || null,
          category: firstCategory,        // legacy single
          categories,                     // multi
          lat: picked.lat,
          lng: picked.lng,
          address: picked.label || address.trim(),
          day_of_week: dayText || null,   // free text
          time_local: timeText || null,   // free text
          contact_phone: contactPhone.trim() || null,
          contact_email: contactEmail.trim() || null,
          website_url: normalizedWebsite,
          created_by: userId,
        })
        .select("id")
        .single();

      if (insErr) throw insErr;
      const circleId = inserted!.id as string;

      // Insert join rows for every selected community (if any)
      if (communityIds.length > 0) {
        const rows = communityIds.map((cid) => ({ circle_id: circleId, community_id: cid }));
        const { error: mapErr } = await supabase
          .from("community_circle_communities")
          .insert(rows, { upsert: true });
        if (mapErr) throw mapErr;
      }

      onSaved();
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
        {/* Categories (multi) */}
        <div className="field">
          <div className="label">Categories</div>
          <div className="grid" style={{ gridTemplateColumns: "1fr auto", gap: 8 }}>
            <select className="input" value={nextCat} onChange={(e) => setNextCat(e.target.value)}>
              <option value="">Add another…</option>
              {CATEGORY_CHOICES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button className="btn" onClick={addCategory} disabled={!nextCat}>Add</button>
          </div>
          {categories.length > 0 ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {categories.map((c) => (
                <span key={c} className="tag" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {c}
                  <button className="btn btn-xs" onClick={() => removeCategory(c)} title="Remove">×</button>
                </span>
              ))}
            </div>
          ) : (
            <div className="muted" style={{ marginTop: 6 }}>Add at least one category.</div>
          )}
        </div>

        <div className="field">
          <div className="label">Circle / listing name (optional)</div>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Saturday Sunset Circle" />
        </div>

        <div className="field">
          <div className="label">Address / city / ZIP</div>
          <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city, or ZIP" />
          <div className="muted" style={{ fontSize: 12 }}>We’ll place the pin automatically based on this location.</div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <div className="label">Day (free text)</div>
            <input className="input" value={dayText} onChange={(e) => setDayText(e.target.value)} placeholder='e.g., "First Monday monthly", "No set day"…' />
          </div>
          <div className="field">
            <div className="label">Time (free text)</div>
            <input className="input" value={timeText} onChange={(e) => setTimeText(e.target.value)} placeholder='e.g., "6–8 pm", "Varies — contact for details"' />
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <div className="label">Contact phone (required if no email)</div>
            <input className="input" type="tel" inputMode="tel" placeholder="e.g., 555-555-5555" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </div>
          <div className="field">
            <div className="label">Contact email (required if no phone)</div>
            <input className="input" type="email" placeholder="name@example.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            <div className="muted" style={{ fontSize: 12 }}>Provide at least one: phone or email.</div>
          </div>
        </div>

        <div className="field">
          <div className="label">Website (optional)</div>
          <input className="input" type="url" placeholder="https://your-site.com" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
        </div>

        <div className="right">
          <button className="btn" onClick={onClose} style={{ marginRight: 8 }}>Cancel</button>
          <button className="btn btn-brand" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save pin"}</button>
        </div>
      </div>
    </div>
  );
}
