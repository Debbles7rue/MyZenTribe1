"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Item = {
  id: string;
  file_path: string;
  url: string;       // signed URL
  favorite: boolean;
  caption: string | null;
  taken_at: string;  // ISO
};

type Props = {
  userId: string | null;
  enabled: boolean;
  accent?: string;        // theme accent color (hex)
  year?: number;          // defaults to current year
  onUpsell?: () => void;  // called if user clicks "Enable add-on"
};

export default function GratitudePhotos({
  userId,
  enabled,
  accent = "#7c3aed",
  year,
  onUpsell,
}: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const y = year ?? new Date().getFullYear();
  const start = useMemo(() => new Date(`${y}-01-01T00:00:00Z`).toISOString(), [y]);
  const end   = useMemo(() => new Date(`${y+1}-01-01T00:00:00Z`).toISOString(), [y]);

  useEffect(() => {
    if (!userId || !enabled) { setItems([]); setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("gratitude_media")
        .select("id,file_path,favorite,caption,taken_at")
        .eq("user_id", userId)
        .gte("taken_at", start)
        .lt("taken_at", end)
        .order("taken_at", { ascending: false });
      if (error) { setLoading(false); return; }

      const paths = data.map(d => d.file_path);
      const { data: signed } = await supabase
        .storage.from("gratitude-media")
        .createSignedUrls(paths, 3600);
      const urlByPath = new Map((signed ?? []).map(s => [s.path, s.signedUrl]));

      setItems((data ?? []).map(d => ({
        id: d.id,
        file_path: d.file_path,
        url: urlByPath.get(d.file_path) || "",
        favorite: !!d.favorite,
        caption: d.caption,
        taken_at: d.taken_at,
      })));
      setLoading(false);
    })();
  }, [userId, enabled, start, end]);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!userId || files.length === 0) return;
    setUploading(true);

    try {
      for (const f of files) {
        const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${userId}/${y}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase
          .storage.from("gratitude-media")
          .upload(path, f, { cacheControl: "3600", upsert: false, contentType: f.type });
        if (upErr) throw upErr;

        const { error: insErr } = await supabase
          .from("gratitude_media")
          .insert({ user_id: userId, file_path: path, caption: null, favorite: false });
        if (insErr) throw insErr;
      }
      // reload
      (e.target as HTMLInputElement).value = "";
      const { data } = await supabase
        .from("gratitude_media")
        .select("id,file_path,favorite,caption,taken_at")
        .eq("user_id", userId)
        .gte("taken_at", start).lt("taken_at", end)
        .order("taken_at", { ascending: false });
      const paths = (data ?? []).map(d => d.file_path);
      const { data: signed } = await supabase.storage.from("gratitude-media").createSignedUrls(paths, 3600);
      const urlByPath = new Map((signed ?? []).map(s => [s.path, s.signedUrl]));
      setItems((data ?? []).map(d => ({
        id: d.id, file_path: d.file_path, url: urlByPath.get(d.file_path) || "",
        favorite: !!d.favorite, caption: d.caption, taken_at: d.taken_at,
      })));
    } catch (e: any) {
      alert(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function toggleFavorite(it: Item) {
    const { error } = await supabase
      .from("gratitude_media")
      .update({ favorite: !it.favorite })
      .eq("id", it.id);
    if (error) return;
    setItems(items.map(x => x.id === it.id ? { ...x, favorite: !x.favorite } : x));
  }

  async function remove(it: Item) {
    // delete from storage first, then db
    const { error: delObj } = await supabase.storage.from("gratitude-media").remove([it.file_path]);
    if (delObj) { alert(delObj.message || "Delete failed"); return; }
    const { error: delDb } = await supabase.from("gratitude_media").delete().eq("id", it.id);
    if (delDb) { alert(delDb.message || "Delete failed"); return; }
    setItems(items.filter(x => x.id !== it.id));
  }

  if (!enabled) {
    return (
      <section className="card p-3">
        <div className="section-row">
          <h2 className="section-title">Photos & Slideshow</h2>
          <a className="btn btn-brand" onClick={onUpsell} style={{ cursor: "pointer" }}>
            Enable for $2.99
          </a>
        </div>
        <p className="muted">
          Add photos to your journal and star your favorites. At year’s end, enjoy a fullscreen slideshow
          of your favorite memories.
        </p>
      </section>
    );
  }

  return (
    <section className="card p-3">
      <div className="section-row">
        <h2 className="section-title">Photos</h2>
        <a
          className="btn btn-neutral"
          href={`/gratitude/slideshow?year=${y}`}
          target="_blank" rel="noreferrer"
        >
          Open {y} slideshow
        </a>
      </div>

      <div className="stack">
        <input type="file" accept="image/*" multiple onChange={onFiles} disabled={uploading} />
        {uploading && <p className="muted">Uploading…</p>}

        {loading ? (
          <p className="muted">Loading photos…</p>
        ) : items.length === 0 ? (
          <p className="muted">No photos yet. Upload a few from today.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {items.map((it) => (
              <div key={it.id} className="rounded-xl overflow-hidden border" style={{ borderColor: "#e5e7eb" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.url} alt={it.caption ?? "photo"} className="w-full h-40 object-cover" />
                <div className="flex items-center justify-between px-2 py-1 text-sm">
                  <button
                    className="underline"
                    onClick={() => toggleFavorite(it)}
                    title={it.favorite ? "Unfavorite" : "Favorite"}
                    style={{ color: it.favorite ? accent : undefined }}
                  >
                    {it.favorite ? "★ Favorite" : "☆ Favorite"}
                  </button>
                  <button className="underline" onClick={() => remove(it)} style={{ color: "#ef4444" }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
