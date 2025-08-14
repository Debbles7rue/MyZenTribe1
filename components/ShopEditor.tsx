"use client";

import { useEffect, useState } from "react";
import AvatarUpload from "@/components/AvatarUpload";
import { supabase } from "@/lib/supabaseClient";

export type ShopItem = { id?: string; title: string; image_url?: string; external_link: string };

export default function ShopEditor({ userId }: { userId: string | null }) {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [saving, setSaving] = useState(false);
  const MAX = 5;

  async function load() {
    if (!userId) return setItems([]);
    const { data } = await supabase
      .from("business_shop_items")
      .select("id,title,image_url,external_link")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    setItems((data ?? []).map(r => ({ id: r.id, title: r.title, image_url: r.image_url ?? "", external_link: r.external_link })));
  }
  useEffect(() => { load(); }, [userId]);

  function update(i: number, patch: Partial<ShopItem>) {
    const next = [...items]; next[i] = { ...next[i], ...patch }; setItems(next);
  }
  function add() { if (items.length < MAX) setItems([...items, { title: "", external_link: "", image_url: "" }]); }
  function remove(i: number) { const next = [...items]; next.splice(i,1); setItems(next); }

  async function save() {
    if (!userId) return;
    setSaving(true);
    try {
      await supabase.from("business_shop_items").delete().eq("user_id", userId);
      const clean = items.filter(i => i.title.trim() && i.external_link.trim()).slice(0, MAX)
        .map(i => ({ user_id: userId, title: i.title.trim(), external_link: i.external_link.trim(), image_url: i.image_url?.trim() || null }));
      if (clean.length) await supabase.from("business_shop_items").insert(clean);
      alert("Shop saved!");
    } finally { setSaving(false); }
  }

  return (
    <section className="card p-3">
      <h2 className="section-title">Shop now (optional)</h2>
      <div className="muted" style={{ marginBottom: 8 }}>Add up to 5 items; links open off-site (we don’t process payments).</div>

      <div className="stack">
        {items.map((it,i) => (
          <div key={i} className="card p-3" style={{ borderStyle: "dashed" }}>
            <div style={{ marginBottom: 8 }}>
              <AvatarUpload userId={userId} value={it.image_url || ""} onChange={(url)=>update(i,{image_url: url})}
                            bucket="shop-photos" label="Upload item photo" />
            </div>

            <label className="field">
              <span className="label">Item title</span>
              <input className="input" value={it.title} onChange={(e)=>update(i,{title:e.target.value})}
                     placeholder="Tuning forks / Class pass / Gift card"/>
            </label>

            <label className="field">
              <span className="label">External link</span>
              <input className="input" value={it.external_link} onChange={(e)=>update(i,{external_link:e.target.value})}
                     placeholder="https://yourshop.com/item/123"/>
            </label>

            <div className="right">
              <button className="btn" type="button" onClick={()=>remove(i)}>Remove</button>
            </div>
          </div>
        ))}
      </div>

      <div className="controls" style={{ marginTop: 10 }}>
        <button className="btn btn-neutral" type="button" onClick={add} disabled={items.length >= MAX}>+ Add item</button>
        <div className="right" style={{ marginLeft: "auto" }}>
          <button className="btn btn-brand" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save shop"}</button>
        </div>
      </div>
    </section>
  );
}
