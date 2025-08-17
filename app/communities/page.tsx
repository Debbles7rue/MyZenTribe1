// app/communities/page.tsx
"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { MapCommunity, MapPin } from "@/components/community/MapExplorerClient";

const MapExplorerClient = dynamic(
  () => import("@/components/community/MapExplorerClient"),
  { ssr: false } // map is client-only
);
const AddPinModal = dynamic(
  () => import("@/components/community/AddPinModal"),
  { ssr: false }
);

type Community = {
  id: string;
  title: string;
  category: string | null;
  zip: string | null;
};

type Circle = MapPin;

const CATEGORIES = [
  "Wellness","Meditation","Yoga","Breathwork","Sound Baths","Drum Circles",
  "Arts & Crafts","Nature/Outdoors","Parenting","Recovery/Support","Local Events","Other",
];

export default function CommunitiesMapExplorer() {
  const [loading, setLoading] = useState(true);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);

  // filters
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState(0); // 0=exact, 25=zip prefix

  // add-pin modal
  const [showAdd, setShowAdd] = useState(false);

  const center: [number, number] = [39.5, -98.35]; // USA-ish

  async function load() {
    setLoading(true);

    // Communities
    let cq = supabase
      .from("communities")
      .select("id,title,category,zip")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (cat) cq = cq.eq("category", cat);
    if (q.trim()) cq = cq.ilike("title", `%${q.trim()}%`);
    if (zip.trim()) {
      const z = zip.trim().slice(0, 5);
      cq = radius >= 25 ? cq.like("zip", `${z.slice(0, 3)}%`) : cq.eq("zip", z);
    }

    const { data: comms, error: cErr } = await cq;
    if (cErr) {
      console.error(cErr);
      setCommunities([]);
      setCircles([]);
      setLoading(false);
      return;
    }
    const commList = (comms ?? []) as Community[];
    setCommunities(commList);

    const commIds = commList.map((c) => c.id);
    if (commIds.length === 0) {
      setCircles([]);
      setLoading(false);
      return;
    }

    // Circles for those communities
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
    const m: Record<string, MapCommunity> = {};
    communities.forEach((c) => (m[c.id] = { id: c.id, title: c.title, category: c.category }));
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
              <button className="btn btn-brand" onClick={() => setShowAdd(true)}>Add pin</button>
              <Link href="/communities/new" className="btn btn-brand">Start a community</Link>
            </div>
          </div>

          {/* Filters */}
          <section className="card p-3">
            <div className="grid" style={{ gridTemplateColumns: "1.2fr 1fr 120px 140px 120px", gap: 12 }}>
              <input className="input" placeholder="Search (name, address)…" value={q} onChange={(e) => setQ(e.target.value)} />
              <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
                <option value="">All categories</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input className="input" placeholder="ZIP" value={zip} onChange={(e) => setZip(e.target.value)} maxLength={5} />
              <select className="input" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
                <option value={0}>ZIP only</option>
                <option value={25}>~Nearby (zip prefix)</option>
              </select>
              <button className="btn btn-brand" onClick={load}>Search</button>
            </div>
          </section>

          {/* Map (client only) */}
          <section className="mt-3">
            <MapExplorerClient center={center} pins={circles} communitiesById={communityById} />
            {loading && <p className="muted mt-2">Loading pins…</p>}
            {!loading && circles.length === 0 && (
              <div className="card p-3 mt-2">
                <p className="muted">No pins match your filters yet.</p>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Add pin modal */}
      {showAdd && (
        <AddPinModal
          communities={communities}
          onClose={() => setShowAdd(false)}
          onSaved={async () => {
            setShowAdd(false);
            await load(); // refresh pins after save
          }}
        />
      )}
    </div>
  );
}
