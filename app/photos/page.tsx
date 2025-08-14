"use client";

import SiteHeader from "@/components/SiteHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Item = { path: string; url: string };

export default function PhotosPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [uploading, setUploading] = useState(false);

  async function list() {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return setItems([]);
    const prefix = `${user.id}/`;
    const { data, error } = await supabase.storage.from("event-photos").list(prefix, { limit: 100 });
    if (error) return;
    const rows = await Promise.all(
      (data ?? []).map(async (f) => {
        const { data: urlData } = await supabase.storage.from("event-photos").getPublicUrl(prefix + f.name);
        return { path: prefix + f.name, url: urlData.publicUrl };
      })
    );
    setItems(rows);
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) { alert("Sign in first."); setUploading(false); return; }
    const filename = `${Date.now()}-${file.name}`;
    const path = `${user.id}/${filename}`;
    const { error } = await supabase.storage.from("event-photos").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    setUploading(false);
    if (error) return alert(error.message);
    await list();
  }

  useEffect(() => { list(); }, []);

  return (
    <div className="page-wrap">
      <SiteHeader />
      <div className="page">
        <div className="container-app">
          <h1 className="page-title">Photos</h1>

          <div className="card p-3" style={{marginBottom:12}}>
            <label className="btn btn-brand">
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={onUpload} />
              {uploading ? "Uploading…" : "Upload photo"}
            </label>
          </div>

          <div className="columns">
            {(items.length ? items : []).map((it) => (
              <div key={it.path} className="card p-3">
                <img src={it.url} alt={it.path} style={{ width: "100%", borderRadius: 12 }} />
              </div>
            ))}
          </div>

          {!items.length && (
            <p className="muted">No photos yet. Upload your first memory!</p>
          )}
        </div>
      </div>
    </div>
  );
}
