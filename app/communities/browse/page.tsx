"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Community = {
  id: string;
  title: string;
  category: string | null;
  zip: string | null;
  about: string | null;
  photo_url: string | null;
  created_at: string;
};

const CATEGORIES = [
  "Wellness","Meditation","Yoga","Breathwork","Sound Baths","Drum Circles",
  "Arts & Crafts","Nature/Outdoors","Parenting","Recovery/Support","Local Events","Other",
];

export default function BrowseCommunities() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Community[]>([]);

  // simple search inputs (same as before)
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState(0); // 0 = exact zip, 25 = zip prefix

  const load = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("communities")
      .select("id,title,category,zip,about,photo_url,created_at")
      .order("created_at", { ascending: false })
      .limit(60);

    if (cat) query = query.eq("category", cat);
    if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);

    if (zip.trim()) {
      const z = zip.trim().slice(0, 5);
      query = radius >= 25 ? query.like("zip", `${z.slice(0, 3)}%`) : query.eq("zip", z);
    }

    const { data, error } = await query;
    if (error) {
      console.error(error);
      setRows([]);
      setLoading(false);
      return;
    }
    setRows((data ?? []) as Community[]);
    setLoading(false);
  }, [q, cat, zip, radius]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh when the tab regains focus or visibility
  useEffect(() => {
    const onFocus = () => load();
    const onVis = () => { if (!document.hidden) load(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  return (
    <div className="page-wrap" style={{ background: "linear-gradient(#FFF7DB, #ffffff)" }}>
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
            <div className="stack" style={{ gap: 12 }}>
              <div className="grid" style={{ gridTemplateColumns: "1.2fr 1fr 120px 140px", gap: 12 }}>
                <input
                  className="input"
                  placeholder="Search by title (e.g., drum circles)"
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
              </div>

              <div className="right">
                <button className="btn btn-brand" onClick={load}>
                  Search
                </button>
              </div>
            </div>
          </section>

          {/* results */}
          <section className="stack mt-3">
            {loading && <p className="muted">Loading…</p>}

            {!loading && rows.length === 0 && (
              <div className="card p-3">
                <p className="muted">No communities yet. Be the first!</p>
              </div>
            )}

            {!loading && rows.map((c) => (
              <div
                key={c.id}
                className="card p-3"
                style={{ display: "grid", gridTemplateColumns: "88px 1fr auto", gap: 12 }}
              >
                <div style={{ width: 88, height: 88, borderRadius: 12, overflow: "hidden", background: "#f3f4f6" }}>
                  {c.photo_url ? (
                    // lazy-loaded img avoids some css background caching quirks
                    // and tends to refresh more reliably after an edit
                    <img
                      src={c.photo_url}
                      alt=""
                      loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <div style={{
                      width: "100%", height: "100%",
                      background: "linear-gradient(135deg,#c4a6ff,#ff8a65)"
                    }} />
                  )}
                </div>

                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                    <Link href={`/communities/${c.id}`} className="link">
                      <strong>{c.title || "Untitled"}</strong>
                    </Link>
                    {c.category && <span className="tag">{c.category}</span>}
                    {c.zip && <span className="muted">· {c.zip}</span>}
                  </div>
                  {c.about && (
                    <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}>
                      {c.about.slice(0, 180)}
                      {c.about.length > 180 ? "…" : ""}
                    </p>
                  )}
                </div>

                <div className="stack" style={{ alignItems: "end" }}>
                  <Link href={`/communities/${c.id}`} className="btn btn-neutral">Open</Link>
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
