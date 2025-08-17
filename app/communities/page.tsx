// app/communities/page.tsx
"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { MapCommunity, MapPin } from "@/components/community/MapExplorerClient";

const MapExplorerClient = dynamic(
  () => import("@/components/community/MapExplorerClient"),
  { ssr: false }
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

type Circle = MapPin & {
  // we may carry categories to filter by service type
  categories?: string[] | null;
};

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

  async function load() {
    setLoading(true);

    // 1) Load communities according to the header filters
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

    // 2) Fetch pins
    // If communities are selected (or listed by filter), use the mapping table
    // community_circle_communities to fetch pins tied to those communities.
    // If there are no communities in the filter, show ALL pins (global map).
    let pins: Circle[] = [];

    if (commIds.length > 0) {
      const { data: mapped, error: mErr } = await supabase
        .from("community_circle_communities")
        .select(
          // join: for each mapping, pull the circle fields
          "community_id, circle:community_circles!inner(id,name,lat,lng,address,contact_phone,contact_email,website_url,categories)"
        )
        .in("community_id", commIds)
        .limit(5000);

      if (mErr) {
        console.error(mErr);
        setCircles([]);
        setLoading(false);
        return;
      }

      pins =
        (mapped ?? []).map((r: any) => ({
          // keep a community_id for MapPin compatibility
          community_id: r.community_id,
          id: r.circle.id,
          name: r.circle.name,
          lat: r.circle.lat,
          lng: r.circle.lng,
          address: r.circle.address,
          contact_phone: r.circle.contact_phone,
          contact_email: r.circle.contact_email,
          website_url: r.circle.website_url,
          categories: r.circle.categories ?? null,
        })) as Circle[];
    } else {
      // Global view: show all pins (including those with no community mapping)
      const { data: allCircles, error: aErr } = await supabase
        .from("community_circles")
        .select("id,name,lat,lng,address,contact_phone,contact_email,website_url,categories")
        .limit(5000);

      if (aErr) {
        console.error(aErr);
        setCircles([]);
        setLoading(false);
        return;
      }

      pins =
        (allCircles ?? []).map((r: any) => ({
          community_id: null as any, // MapPin might not require it visually
          ...r,
        })) as Circle[];
    }

    // 3) Apply free-text filter (name/address) and category filter (service categories)
    let filtered = pins;

    if (q.trim()) {
      const qv = q.trim().toLowerCase();
      filtered = filtered.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(qv) ||
          (c.address || "").toLowerCase().includes(qv)
      );
    }

    if (cat) {
      filtered = filtered.filter((c) => (c.categories || []).includes(cat));
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
              <button
                className="btn btn-brand"
                onClick={() => setShowAdd(true)}
                disabled={loading}
                title={loading ? "Loading communities…" : "Add a new pin"}
              >
                Add pin
              </button>
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
            <MapExplorerClient center={[39.5, -98.35]} pins={circles} communitiesById={communityById} />
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
