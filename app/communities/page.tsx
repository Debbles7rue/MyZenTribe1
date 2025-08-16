"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { supabase } from "@/lib/supabaseClient";

type Community = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  category: string;
  subcategory: string | null;
  location_scope: string | null;
  cover_image_url: string | null;
  created_by: string;
  created_at: string;
};

type Membership = {
  community_id: string;
  user_id: string;
  status: "member" | "pending" | "banned";
};

const CATEGORIES = [
  "Wellness", "Music", "Arts", "Outdoors", "Parenting", "Healing",
  "Business", "Faith", "Local", "Other"
];

export default function CommunitiesPage() {
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Community[]>([]);
  const [mine, setMine] = useState<Membership[]>([]);

  // create form
  const [openCreate, setOpenCreate] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Wellness");
  const [subcategory, setSubcategory] = useState("");
  const [scope, setScope] = useState("");
  const [desc, setDesc] = useState("");

  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  async function load() {
    setLoading(true);
    const { data: c } = await supabase.from("communities").select("*").order("created_at", { ascending: false }).limit(200);
    setItems((c ?? []) as Community[]);
    if (userId) {
      const { data: m } = await supabase
        .from("community_members")
        .select("*")
        .eq("user_id", userId);
      setMine((m ?? []) as Membership[]);
    } else {
      setMine([]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [userId]);

  const membershipSet = useMemo(() => new Set(mine.map(m => m.community_id)), [mine]);

  async function createCommunity() {
    if (!userId) {
      alert("Please sign in to create a community.");
      return;
    }
    const payload = {
      name: name.trim(),
      slug: null,
      description: desc.trim() || null,
      category,
      subcategory: subcategory.trim() || null,
      location_scope: scope.trim() || null,
      cover_image_url: null,
      created_by: userId
    };
    if (!payload.name) { alert("Please enter a name."); return; }

    const { data, error } = await supabase
      .from("communities")
      .insert([payload])
      .select("*")
      .single();
    if (error) { alert(error.message); return; }

    // auto add creator as admin + member
    await supabase.from("community_admins").insert([{ community_id: data.id, user_id: userId }]);
    await supabase.from("community_members").insert([{ community_id: data.id, user_id: userId, status: "member" }]);

    setOpenCreate(false);
    setName(""); setCategory("Wellness"); setSubcategory(""); setScope(""); setDesc("");
    await load();
  }

  async function join(id: string) {
    if (!userId) { alert("Please sign in to join."); return; }
    const { error } = await supabase.from("community_members").insert([{ community_id: id, user_id: userId, status: "member" }]);
    if (error) { alert(error.message); return; }
    await load();
  }
  async function leave(id: string) {
    if (!userId) return;
    const { error } = await supabase.from("community_members").delete().eq("community_id", id).eq("user_id", userId);
    if (error) { alert(error.message); return; }
    await load();
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.description ?? "").toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      (c.subcategory ?? "").toLowerCase().includes(q) ||
      (c.location_scope ?? "").toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <div className="page-wrap">
      <SiteHeader />
      <div className="page">
        <div className="container-app">
          <div className="header-bar">
            <h1 className="page-title" style={{ marginBottom: 0 }}>Communities</h1>
            <div className="controls">
              <button className="btn btn-brand" onClick={() => setOpenCreate(!openCreate)}>
                {openCreate ? "Close" : "Create community"}
              </button>
            </div>
          </div>

          {/* House rules */}
          <div className="rounded-xl p-3 mb-3" style={{ background: "#F8FBFF", border: "1px solid #e5e7eb" }}>
            <strong>House rules:</strong> Be kind • No politics • Respect differences • No bullying •
            Use safety common sense with personal info. We remove anything harmful.
          </div>

          {/* Create */}
          {openCreate && (
            <section className="card p-3 mb-3">
              <h2 className="section-title">Start a new community</h2>
              <div className="grid gap-3">
                <input className="input" placeholder="Community name (e.g., Drum Circles — North East Texas)"
                  value={name} onChange={e => setName(e.target.value)} />
                <div className="grid sm:grid-cols-3 gap-3">
                  <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input className="input" placeholder="Subcategory (optional)" value={subcategory} onChange={e => setSubcategory(e.target.value)} />
                  <input className="input" placeholder="Location scope (e.g., North East Texas)"
                    value={scope} onChange={e => setScope(e.target.value)} />
                </div>
                <textarea className="input" rows={3} placeholder="Short description (what this space is for)"
                  value={desc} onChange={e => setDesc(e.target.value)} />
                <div className="right">
                  <button className="btn btn-brand" onClick={createCommunity}>Create</button>
                </div>
              </div>
            </section>
          )}

          {/* Search */}
          <div className="mb-2">
            <input
              className="input"
              placeholder="Search by name, category, or location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Grid */}
          <div className="commitment-grid">
            {loading && <p className="muted">Loading…</p>}
            {!loading && filtered.length === 0 && <p className="muted">No communities yet. Be the first to create one!</p>}

            {filtered.map(c => {
              const joined = membershipSet.has(c.id);
              return (
                <div key={c.id} className="commitment-card">
                  <div className="muted text-xs">{c.category}{c.subcategory ? ` • ${c.subcategory}` : ""}</div>
                  <h3 style={{ marginTop: 4, marginBottom: 6 }}>{c.name}</h3>
                  {c.location_scope && <div className="muted text-sm">Area: {c.location_scope}</div>}
                  {c.description && <p>{c.description}</p>}
                  <div className="controls">
                    {joined ? (
                      <>
                        <Link className="btn btn-brand" href={`/communities/${c.id}`}>Open</Link>
                        <button className="btn btn-neutral" onClick={() => leave(c.id)}>Leave</button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-brand" onClick={() => join(c.id)}>Join</button>
                        <Link className="btn btn-neutral" href={`/communities/${c.id}`}>View</Link>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
