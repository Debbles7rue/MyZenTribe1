// app/communities/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/lib/supabaseClient";

type Community = {
  id: string;
  title: string;
  category: string | null;
  zip: string | null;
};

type Circle = {
  id: string;
  community_id: string;
  name: string | null;
  lat: number;
  lng: number;
  address: string | null;
  day_of_week: string | null;
  time_local: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  website_url: string | null;
};

const CATEGORIES = [
  "Wellness",
  "Meditation",
  "Yoga",
  "Breathwork",
  "Sound Baths",
  "Drum Circles",
  "Arts & Crafts",
  "Nature/Outdoors",
  "Parenting",
  "Recovery/Support",
  "Local Events",
  "Other",
];

// Fix Leaflet default marker icons in Next.js
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function CommunitiesMapExplorer() {
  const [loading, setLoading] = useState(true);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);

  // filters
  const [q, setQ] = useState("");        // text search in community title or circle name
  const [cat, setCat] = useState("");    // community category
  const [zip, setZip] = useState("");    // exact zip or prefix
  const [radius, setRadius] = useState(0); // 0=exact, 25=zip prefix ~nearby

  // initial map center (continental US)
  const [center] = useState<[number, number]>([39.5, -98.35]);

  async function load() {
    setLoading(true);

    // 1) Pull communities that match filters
    let cq = supabase
      .from("communities")
      .select("id,title,category,zip")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (cat) cq = cq.eq("category", cat);
    if (q.trim()) cq = cq.ilike("title", `%${q.trim()}%`);
    if (zip.trim()) {
      const z = zip.trim().slice(0, 5);
      if (radius >= 25) cq = cq.like("zip", `${z.slice(0, 3)}%`);
      else cq = cq.eq("zip", z);
    }

    const { data: comms, error: cErr } = await cq;
    if (cErr) {
      console.error(cErr);
      setCommunities([]);
      setCircles([]);
      setLoading(false);
      return;
    }
    setCommunities((comms ?? []) as Community[]);
    const commIds = (comms ?? []).map((c) => c.id);
    if (commIds.length === 0) {
      setCircles([]);
      setLoading(false);
      return;
    }

    // 2) Pull circles for those communities
    const { data: circs, error: sErr } = await supabase
      .from("community_circles")
      .select(
        "id,community_id,name,lat,lng,address,day_of_week,time_local,contact_phone,contact_email,website_url"
      )
      .in("community_id", commIds)
      .limit(2000);
    if (sErr) {
      console.error(sErr);
      setCircles([]);
      setLoading(false);
      return;
    }

    let filtered = (circs ?? []) as Circle[];
    if (q.trim()) {
      const qv = q.trim().toLowerCase();
      filtered = filtered.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(qv) ||
          (c.address || "").toLowerCase().includes(qv)
      );
    }

    setCircles(filtered);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const communityById = useMemo(() => {
    const m: Record<string, Community> = {};
    communities.forEach((c) => (m[c.id] = c));
    return m;
  }, [communities]);

  return (
    <div className="page-wrap" style={{ background: "linear-gradient(#FFF7DB, #ffffff)" }}>
      <div className="page">
        <div className="container-app">
          {/* Header */}
          <div className="header-bar">
            <h1 className="page-title" style={{ marginBottom: 0 }}>Communities</h1>
            <div className="controls">
              <Link href="/communities/browse" className="btn btn-neutral">Browse communities</Link>
              <Link href="/communities/new" className="btn btn-brand">Start a community</Link>
            </div>
          </div>

          {/* Filters */}
          <section className="card p-3">
            <div className="grid" style={{ gridTemplateColumns: "1.2fr 1fr 120px 140px 120px", gap: 12 }}>
              <input
                className="input"
                placeholder="Search (name, address)…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                className="input"
                placeholder="ZIP"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                maxLength={5}
              />
              <select className="input" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
                <option value={0}>ZIP only</option>
                <option value={25}>~Nearby (zip prefix)</option>
              </select>
              <button className="btn btn-brand" onClick={load}>Search</button>
            </div>
          </section>

          {/* Map */}
          <section className="mt-3">
            <div style={{ height: 560, borderRadius: 12, overflow: "hidden", border: "1px solid #eee" }}>
              <MapContainer center={center} zoom={4} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
                <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {circles.map((pin) => {
                  const comm = communityById[pin.community_id];
                  return (
                    <Marker key={pin.id} position={[pin.lat, pin.lng]}>
                      <Popup>
                        <div style={{ maxWidth: 260 }}>
                          <div style={{ fontWeight: 600 }}>{pin.name || "Untitled pin"}</div>
                          {comm?.title && (
                            <div style={{ fontSize: 12, marginTop: 2 }}>
                              in <Link className="link" href={`/communities/${comm.id}`}>{comm.title}</Link>
                              {comm?.category ? ` · ${comm.category}` : ""}
                            </div>
                          )}
                          {pin.address && <div style={{ marginTop: 6 }}>{pin.address}</div>}
                          {(pin.day_of_week || pin.time_local) && (
                            <div className="muted" style={{ marginTop: 4 }}>
                              {pin.day_of_week || ""}{pin.day_of_week && pin.time_local ? " · " : ""}{pin.time_local || ""}
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                            {pin.contact_phone && (
                              <a className="btn btn-neutral" href={`tel:${pin.contact_phone}`}>Call</a>
                            )}
                            {pin.contact_email && (
                              <a className="btn btn-neutral" href={`mailto:${pin.contact_email}`}>Email</a>
                            )}
                            {pin.website_url && (
                              <a className="btn btn-neutral" href={pin.website_url} target="_blank" rel="noopener noreferrer">Website</a>
                            )}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
            {loading && <p className="muted mt-2">Loading pins…</p>}
            {!loading && circles.length === 0 && (
              <div className="card p-3 mt-2">
                <p className="muted">No pins match your filters yet.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
