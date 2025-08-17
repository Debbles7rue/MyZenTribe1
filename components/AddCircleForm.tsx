"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import PlacePicker from "@/components/PlacePicker";

const SUGGESTED = [
  "Drum Circles","Sound Baths","Yoga","Qi Gong","Meditation","Breathwork",
  "Wellness","Nature/Outdoors","Arts & Crafts","Parenting","Recovery/Support","Local Events"
];

type CommunityLite = { id: string; title: string; category: string | null; zip: string | null };

type ServiceRow = {
  id: string;
  category: string;        // required free text (with suggestions available)
  schedule: string;        // free text, e.g. "1st Monday", "Thursdays", "No set time — contact"
  time: string;            // "HH:MM" optional
  communityIds: string[];  // 0..many; empty = shows only on global map
};

export default function AddCircleForm({
  communities,
  preselectCommunityIds = [],
  zip,
  onClose,
  onSaved,
}: {
  communities: CommunityLite[];
  preselectCommunityIds?: string[];
  zip?: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [place, setPlace] = useState<{ lat: number; lng: number; label?: string } | null>(null);

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");

  const [services, setServices] = useState<ServiceRow[]>([
    { id: crypto.randomUUID(), category: "", schedule: "", time: "", communityIds: [...preselectCommunityIds] },
  ]);

  const [showMap, setShowMap] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const geocodingRef = useRef(false);

  // If parent changes preselect ids, apply to first row
  useEffect(() => {
    setServices((rows) => {
      if (rows.length === 0) return rows;
      const first = { ...rows[0], communityIds: [...preselectCommunityIds] };
      return [first, ...rows.slice(1)];
    });
  }, [preselectCommunityIds]);

  const categoriesForPin = useMemo(() => {
    const arr = services.map((s) => s.category.trim()).filter(Boolean);
    return Array.from(new Set(arr));
  }, [services]);

  function addRow() {
    setServices((s) => [
      ...s,
      { id: crypto.randomUUID(), category: "", schedule: "", time: "", communityIds: [] },
    ]);
  }
  function removeRow(id: string) {
    setServices((s) => (s.length <= 1 ? s : s.filter((r) => r.id !== id)));
  }
  function patchRow(id: string, patch: Partial<ServiceRow>) {
    setServices((s) => s.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addCommunityToRow(id: string, communityId: string) {
    if (!communityId) return;
    setServices((s) =>
      s.map((r) =>
        r.id === id && !r.communityIds.includes(communityId)
          ? { ...r, communityIds: [...r.communityIds, communityId] }
          : r
      )
    );
  }
  function removeCommunityFromRow(id: string, communityId: string) {
    setServices((s) =>
      s.map((r) =>
        r.id === id ? { ...r, communityIds: r.communityIds.filter((c) => c !== communityId) } : r
      )
    );
  }

  function normalizeUrl(u: string) {
    const t = u.trim();
    if (!t) return null;
    return /^https?:\/\//i.test(t) ? t : `https://${t}`;
  }

  function combineSchedule(schedule: string, time: string) {
    const s = schedule.trim();
    const t = time.trim();
    if (s && t) return `${s} — ${t}`;
    if (s) return s;
    if (t) return t;
    return "No set time — contact";
  }

  async function geocodeAddress(q: string) {
    const query = q.trim();
    if (!query) return null;
    try {
      geocodingRef.current = true;
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
        { headers: { "Accept-Language": "en" } }
      );
      const arr = (await r.json()) as any[];
      if (arr && arr[0]) {
        const lat = parseFloat(arr[0].lat);
        const lng = parseFloat(arr[0].lon);
        return { lat, lng, label: arr[0].display_name as string };
      }
      return null;
    } catch {
      return null;
    } finally {
      geocodingRef.current = false;
    }
  }

  // Auto-geocode after typing the address
  async function handleAddressBlur() {
    if (place || !address.trim()) return;
    const p = await geocodeAddress(address);
    if (p) setPlace(p);
  }

  async function handleSave() {
    setError(null);

    // Resolve a location RIGHT HERE (don’t rely on setState timing)
    const resolvedPlace =
      place || (address.trim() ? await geocodeAddress(address) : null);

    if (!resolvedPlace) {
      setError("Please pick a spot on the map (or type an address so we can find it).");
      return;
    }
    if (!phone.trim() && !email.trim()) {
      setError("Please provide a phone OR an email so people can contact you.");
      return;
    }

    const cleanServices = services
      .map((s) => ({
        ...s,
        category: s.category.trim(),
        schedule: s.schedule.trim(),
        time: s.time.trim(),
      }))
      .filter((s) => s.category.length > 0);

    if (cleanServices.length === 0) {
      setError("Add at least one service and provide a category.");
      return;
    }

    setSaving(true);
    try {
      // 1) Create the circle/pin (note: no day_of_week/time_local)
      const { data: circle, error: cErr } = await supabase
        .from("community_circles")
        .insert({
          community_id: null, // communities are attached per-service below
          name: name.trim() || null,
          lat: resolvedPlace.lat,
          lng: resolvedPlace.lng,
          address: address.trim() || resolvedPlace.label || null,
          contact_phone: phone.trim() || null,
          contact_email: email.trim() || null,
          website_url: normalizeUrl(website),
          categories: categoriesForPin.length ? categoriesForPin : null,
        })
        .select("*")
        .single();

      if (cErr) throw cErr;

      // 2) Insert services (category + combined schedule text)
      const toInsert = cleanServices.map((s) => ({
        circle_id: circle.id,
        category: s.category,
        schedule_text: combineSchedule(s.schedule, s.time),
      }));
      const { data: svcRows, error: sErr } = await supabase
        .from("circle_services")
        .insert(toInsert)
        .select("id, category");
      if (sErr) throw sErr;

      // 3) Map services to selected communities (can be none)
      const svcMaps: { service_id: string; community_id: string }[] = [];
      const circleCommunityUnion = new Set<string>();
      (svcRows || []).forEach((row, i) => {
        const chosen = cleanServices[i]?.communityIds || [];
        chosen.forEach((cid) => {
          svcMaps.push({ service_id: row.id, community_id: cid });
          circleCommunityUnion.add(cid);
        });
      });
      if (svcMaps.length) {
        const { error: mapErr } = await supabase
          .from("circle_service_communities")
          .insert(svcMaps);
        if (mapErr) throw mapErr;
      }

      // 4) Optional: keep a union for fast community map queries
      if (circleCommunityUnion.size > 0) {
        const circleMaps = Array.from(circleCommunityUnion).map((cid) => ({
          circle_id: circle.id,
          community_id: cid,
        }));
        const { error: ccmErr } = await supabase
          .from("community_circle_communities")
          .upsert(circleMaps, { onConflict: "circle_id,community_id" });
        if (ccmErr) throw ccmErr;
      }

      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message || "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-3">
      <datalist id="category-suggestions">
        {SUGGESTED.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <div className="field">
        <div className="label">Listing / pin name (optional)</div>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Sunset Wellness Hub"
        />
      </div>

      <div className="field">
        <div className="label">Address / place</div>
        <input
          className="input"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onBlur={handleAddressBlur}
          placeholder="Street, City, ZIP"
        />
      </div>

      {/* Map collapsed by default */}
      <div className="field">
        <button
          type="button"
          className="btn"
          onClick={() => setShowMap((v) => !v)}
          aria-expanded={showMap}
        >
          {showMap ? "Hide map" : "Adjust location (optional)"}
        </button>
        {showMap && (
          <div style={{ marginTop: 8 }}>
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
        )}
      </div>

      <div className="field">
        <div className="label">Services</div>
        {services.map((row, i) => (
          <div key={row.id} className="card p-3" style={{ marginBottom: 8 }}>
            <div className="form-grid">
              <div>
                <div className="label">Category (required)</div>
                <input
                  className="input"
                  list="category-suggestions"
                  placeholder='e.g., "Sound Baths", "Qi Gong", "Kids Yoga"'
                  value={row.category}
                  onChange={(e) => patchRow(row.id, { category: e.target.value })}
                  required
                />
              </div>

              <div>
                <div className="label">Schedule (free text)</div>
                <input
                  className="input"
                  placeholder='e.g., "1st Monday", "Thursdays", "No set time — contact"'
                  value={row.schedule}
                  onChange={(e) => patchRow(row.id, { schedule: e.target.value })}
                />
              </div>

              <div>
                <div className="label">Time (optional)</div>
                <input
                  className="input"
                  type="time"
                  value={row.time}
                  onChange={(e) => patchRow(row.id, { time: e.target.value })}
                />
              </div>

              <div className="span-2">
                <div className="label">Communities (optional — this service can appear in multiple)</div>
                <select
                  className="input"
                  value=""
                  onChange={(e) => addCommunityToRow(row.id, e.target.value)}
                >
                  <option value="">Add a community…</option>
                  {communities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} {c.category ? `· ${c.category}` : ""} {c.zip ? `· ${c.zip}` : ""}
                    </option>
                  ))}
                </select>

                {row.communityIds.length === 0 ? (
                  <div className="muted" style={{ marginTop: 6 }}>
                    No community selected → this service will still show on the global map.
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {row.communityIds.map((cid) => {
                      const c = communities.find((x) => x.id === cid);
                      return (
                        <span
                          key={cid}
                          className="tag"
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: 9999 }}
                        >
                          {c ? c.title : cid}
                          <button className="btn btn-xs" onClick={() => removeCommunityFromRow(row.id, cid)} title="Remove">
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="span-2" style={{ display: "flex", justifyContent: "space-between" }}>
                <button className="btn" onClick={() => removeRow(row.id)} disabled={services.length <= 1}>
                  Remove service
                </button>
                {i === services.length - 1 && (
                  <button className="btn" onClick={addRow}>Add another service</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="form-grid">
        <div>
          <div className="label">Contact phone (required if no email)</div>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(xxx) xxx-xxxx" />
        </div>
        <div>
          <div className="label">Contact email (required if no phone)</div>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        </div>
      </div>

      <div className="field">
        <div className="label">Website (optional)</div>
        <input className="input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
      </div>

      {error && (
        <div className="note" style={{ color: "#b91c1c", borderColor: "#fecaca", background: "#fef2f2" }}>
          {error}
        </div>
      )}

      <div className="modal-footer">
        <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-brand" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save pin"}
        </button>
      </div>
    </div>
  );
}
