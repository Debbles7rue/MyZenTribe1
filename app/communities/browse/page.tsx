// app/communities/browse/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Community = {
  id: string;
  title: string;
  category: string | null;
  zip: string | null;
  photo_url: string | null;
  cover_image_url: string | null;
  about: string | null;
  created_at: string;
};

const CATEGORIES = [
  "Wellness","Meditation","Yoga","Breathwork","Sound Baths","Drum Circles",
  "Arts & Crafts","Nature/Outdoors","Parenting","Recovery/Support","Local Events","Other",
];

export default function BrowseCommunities() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Community[]>([]);
  const [memberships, setMemberships] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  async function load() {
    setLoading(true);

    let query = supabase
      .from("communities")
      .select("id,title,category,zip,photo_url,cover_image_url,about,created_at")
      .order("created_at", { ascending: false })
      .limit(60);

    if (cat) query = query.eq("category", cat);
    if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);

    if (zip.trim()) {
      const z = zip.trim().slice(0, 5);
      if (radius >= 25) query = query.like("zip", `${z.slice(0, 3)}%`);
      else query = query.eq("zip", z);
    }

    const { data, error } = await query;
    if (error) {
      console.error(error);
      setRows([]);
      setLoading(false);
      return;
    }

    const list = (data ?? []) as Community[];
    setRows(list);
    setLoading(false);

    // membership map
    if (userId && list.length) {
      const ids = list.map((r) => r.id);
      const { data: memberRows } = await supabase
        .from("community_members")
        .select("community_id")
        .eq("user_id", userId)
        .in("community_id", ids);
      const m: Record<string, boolean> = {};
      (memberRows ?? []).forEach((r: any) => (m[r.community_id] = true));
      setMemberships(m);
    } else {
      setMemberships({});
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <div className="page-wrap" style={{ background: "linear-gradient(#FFF7DB, #ffffff)", minHeight: "100vh" }}>
      <div className="page">
        <div className="container-app">
          <div className="header-bar">
            <h1 className="page-title" style={{ marginBottom: 0 }}>Browse communities</h1>
            <div className="controls">
              <Link href="/communities" className="btn btn-neutral">Map</Link>
              <Link href="/communities/new" className="btn btn-brand">Start a community</Link>
            </div>
          </div>

          {/* search card */}
          <section className="card p-3">
            <div className="grid" style={{ gridTemplateColumns: "1.2fr 1fr 120px 140px 120px", gap: 12 }}>
              <input className="input" placeholder="Search by title (e.g., drum circles)" value={q} onChange={(e) => setQ(e.target.value)} />
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

          {/* results */}
          <section className="stack mt-3">
            {loading && <p className="muted">Loading…</p>}
            {!loading && rows.length === 0 && (
              <div className="card p-3"><p className="muted">No communities yet. Be the first!</p></div>
            )}
            {!loading && rows.map((c) => {
              const cover = c.cover_image_url || c.photo_url;
              return (
                <div key={c.id} className="card p-3" style={{ display: "grid", gridTemplateColumns: "72px 1fr auto", gap: 12 }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: 12,
                    background: cover ? `center / cover no-repeat url(${cover})` : "linear-gradient(135deg,#c4a6ff,#ff8a65)"
                  }} />
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                      <Link href={`/communities/${c.id}`} className="link"><strong>{c.title || "Untitled"}</strong></Link>
                      {c.category && <span className="tag">{c.category}</span>}
                      {c.zip && <span className="muted">· {c.zip}</span>}
                    </div>
                    {c.about && (
                      <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}>
                        {c.about.slice(0, 120)}{c.about.length > 120 ? "…" : ""}
                      </p>
                    )}
                  </div>
                  <div className="stack" style={{ alignItems: "end" }}>
                    <Link href={`/communities/${c.id}`} className="btn btn-neutral">Open</Link>
                    {memberships[c.id] && <span className="muted" style={{ fontSize: 12 }}>Joined</span>}
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      </div>
    </div>
  );
}
