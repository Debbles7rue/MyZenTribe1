// components/GratitudeSlideshow.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type MediaItem = {
  id: string;
  url: string;
  favorite: boolean;
  taken_at: string;
  caption: string | null;
};

export default function GratitudeSlideshow({ year }: { year: number }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const INTERVAL_MS = 3500;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const range = useMemo(() => {
    const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString();
    const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0)).toISOString();
    return { start, end };
  }, [year]);

  async function loadItems() {
    if (!userId) return;
    setLoading(true);
    try {
      // Prefer favorites; if none, show all photos for that year
      const base = supabase
        .from("gratitude_media")
        .select("id,file_path,favorite,caption,taken_at")
        .eq("user_id", userId)
        .gte("taken_at", range.start)
        .lt("taken_at", range.end)
        .order("favorite", { ascending: false }) // favorites first
        .order("taken_at", { ascending: false });

      const { data, error } = await base;
      if (error) throw error;

      const paths = (data ?? []).map((d) => d.file_path);
      if (!paths.length) {
        setItems([]);
        return;
      }

      const { data: signed } = await supabase.storage
        .from("gratitude-media")
        .createSignedUrls(paths, 3600);

      const map = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
      const items: MediaItem[] = (data ?? []).map((d) => ({
        id: d.id,
        favorite: !!d.favorite,
        caption: d.caption,
        taken_at: d.taken_at,
        url: map.get(d.file_path) || "",
      }));

      setItems(items);
      setIndex(0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, range.start, range.end]);

  // autoplay
  useEffect(() => {
    if (!playing || items.length <= 1) return;
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, INTERVAL_MS);
    return () => {
      timerRef.current && clearInterval(timerRef.current);
    };
  }, [playing, items]);

  function prev() {
    if (items.length === 0) return;
    setIndex((i) => (i - 1 + items.length) % items.length);
  }
  function next() {
    if (items.length === 0) return;
    setIndex((i) => (i + 1) % items.length);
  }

  // keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key.toLowerCase() === " ") setPlaying((p) => !p);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items]);

  if (!userId) {
    return <p className="muted">Please sign in to view your slideshow.</p>;
  }

  if (loading) return <p className="muted">Loading slideshow…</p>;

  if (!items.length) {
    return (
      <div className="card p-3">
        <h2 className="section-title" style={{ marginTop: 0 }}>
          No photos yet
        </h2>
        <p className="muted">
          Add photos to your Gratitude Journal and mark some as favorites to see them here.
        </p>
      </div>
    );
  }

  const current = items[index];

  return (
    <div
      className="rounded-2xl border"
      style={{
        borderColor: "#e5e7eb",
        background:
          "radial-gradient(1000px 400px at 50% 90%, rgba(124,58,237,.09), transparent 70%)",
        padding: 12,
      }}
    >
      <div
        className="relative"
        style={{
          width: "100%",
          height: "min(72vh, 70vw)",
          background: "#0b0b10",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {/* image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current.id}
          src={current.url}
          alt={current.caption ?? "slideshow"}
          className="absolute inset-0 w-full h-full object-contain"
          style={{ transition: "opacity 400ms" }}
        />

        {/* controls */}
        <div
          className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2"
          style={{ pointerEvents: "none" }}
        >
          <div
            className="rounded-full bg-white/80 shadow px-2 py-1 flex items-center gap-2"
            style={{ pointerEvents: "auto" }}
          >
            <button className="btn btn-neutral" onClick={prev} aria-label="Previous">
              ◀
            </button>
            <button
              className="btn btn-brand"
              onClick={() => setPlaying((p) => !p)}
              aria-label="Play/pause"
            >
              {playing ? "Pause" : "Play"}
            </button>
            <button className="btn btn-neutral" onClick={next} aria-label="Next">
              ▶
            </button>
          </div>
        </div>

        {/* caption & index */}
        <div
          className="absolute top-3 right-3 rounded-xl bg-black/50 text-white px-2 py-1 text-sm"
          aria-label="slide index"
        >
          {index + 1} / {items.length}
        </div>
        {current.caption && (
          <div className="absolute left-0 right-0 bottom-14 text-center text-white/90 text-sm px-3">
            {current.caption}
          </div>
        )}
      </div>
    </div>
  );
}
