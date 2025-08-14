"use client";

import SiteHeader from "@/components/SiteHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Vibe = {
  id: string;
  user_id: string;
  category: "karma" | "goodnews";
  title: string | null;
  body: string;
  created_at: string;
};

export default function GoodVibesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [filter, setFilter] = useState<"all"|"karma"|"goodnews">("all");
  const [vibes, setVibes] = useState<Vibe[]>([]);

  // form
  const [category, setCategory] = useState<"karma"|"goodnews">("karma");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const load = async () => {
    setLoading(true);
    setTableMissing(false);
    try {
      let q = supabase
        .from("uplift_posts")
        .select("id,user_id,category,title,body,created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (filter !== "all") q = q.eq("category", filter);
      const { data, error } = await q;
      if (error) throw error;
      setVibes((data ?? []) as Vibe[]);
    } catch {
      setTableMissing(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter, userId]);

  async function share() {
    if (!userId) return alert("Please sign in.");
    if (!body.trim()) return alert("Please write something uplifting!");

    const { error } = await supabase.from("uplift_posts").insert({
      user_id: userId,
      category,
      title: title.trim() || null,
      body: body.trim(),
    });
    if (error) return alert(error.message);
    setTitle(""); setBody("");
    load();
  }

  return (
    <div className="page-wrap">
      <SiteHeader />

      <div className="page">
        <div className="container-app">
          <div className="header-bar">
            <h1 className="page-title" style={{ marginBottom: 0 }}>Good Vibes</h1>
            <div className="controls">
              <div className="segmented" role="tablist" aria-label="Filter posts">
                <button className={`seg-btn ${filter==="all"?"active":""}`} onClick={()=>setFilter("all")} role="tab" aria-selected={filter==="all"}>All</button>
                <button className={`seg-btn ${filter==="karma"?"active":""}`} onClick={()=>setFilter("karma")} role="tab" aria-selected={filter==="karma"}>Karma Corner</button>
                <button className={`seg-btn ${filter==="goodnews"?"active":""}`} onClick={()=>setFilter("goodnews")} role="tab" aria-selected={filter==="goodnews"}>Good News</button>
              </div>
            </div>
          </div>

          {tableMissing && (
            <div className="note">
              <div className="note-title">Good Vibes storage isn’t set up yet.</div>
              <div className="note-body">
                Run the SQL below in Supabase → SQL Editor, then reload this page.
                <details className="mt-1">
                  <summary className="linkish">Show SQL</summary>
                  <pre className="codeblock">{`create table if not exists public.uplift_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  category text not null check (category in ('karma','goodnews')),
  title text,
  body text not null,
  created_at timestamptz default now()
);
alter table public.uplift_posts enable row level security;
create policy "uplift: read all" on public.uplift_posts for select using (true);
create policy "uplift: owner can insert" on public.uplift_posts for insert with check (auth.uid() = user_id);
create policy "uplift: owner can update" on public.uplift_posts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "uplift: owner can delete" on public.uplift_posts for delete using (auth.uid() = user_id);`}</pre>
                </details>
              </div>
            </div>
          )}

          {/* Share form */}
          <section className="card p-3 mb-3">
            <h2 className="section-title">Share something uplifting</h2>
            <div className="stack">
              <label className="field">
                <span className="label">Category</span>
                <select className="select" value={category} onChange={(e)=>setCategory(e.target.value as any)}>
                  <option value="karma">Karma Corner (acts of kindness)</option>
                  <option value="goodnews">Good News (wins, positive updates)</option>
                </select>
              </label>
              <label className="field">
                <span className="label">Title (optional)</span>
                <input className="input" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="A little kindness goes a long way…" />
              </label>
              <label className="field">
                <span className="label">Your story</span>
                <textarea className="input" rows={4} value={body} onChange={(e)=>setBody(e.target.value)} placeholder="Tell us what happened…" />
              </label>
              <div className="right">
                <button className="btn btn-brand" onClick={share}>Post</button>
              </div>
            </div>
          </section>

          {/* Feed */}
          <section className="card p-3">
            <h2 className="section-title">Latest</h2>
            {loading ? (
              <p className="muted">Loading…</p>
            ) : !vibes.length ? (
              <p className="muted">No posts yet. Be the first to share!</p>
            ) : (
              <div className="stack">
                {vibes.map(v => (
                  <article key={v.id} className="card p-3">
                    <div className="section-row">
                      <strong>{v.title || (v.category === "karma" ? "Karma Corner" : "Good News")}</strong>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {new Date(v.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{v.body}</div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
