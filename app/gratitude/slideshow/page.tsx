"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Media = { file_path: string; url: string; taken_at: string };

export default function SlideshowPage() {
  const params = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);

  const year = useMemo(() => {
    const y = parseInt(params.get("year") || "");
    return Number.isFinite(y) ? y : new Date().getFullYear();
  }, [params]);

  const [items, setItems] = useState<Media[]>([]);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timer = useRef<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      // favorites for the chosen year
      const start = new Date(`${year}-01-01T00:00:00Z`).toISOString();
      const end   = new Date(`${year+1}-01-01T00:00:00Z`).toISOString();
      const { data, error } = await supabase
        .from("gratitude_media")
        .select("file_path,taken_at")
        .eq("user_id", userId)
        .eq("favorite", true)
        .gte("taken_at", start).lt("taken_at", end)
        .order("taken_at", { ascending: true });
      if (error) { return; }

      const paths = (data ?? []).map(d => d.file_path);
      const { data: signed } = await supabase.storage.from("gratitude-media").createSignedUrls(paths, 3600);
      const urlByPath = new Map((signed ?? []).map(s => [s.path, s.signedUrl]));
      setItems((data ?? []).map(d => ({ file_path: d.file_path, taken_at: d.taken_at, url: urlByPath.get(d.file_path) || "" })));
      setI(0);
    })();
  }, [userId, year]);

  useEffect(() => {
    if (!playing || items.length === 0) return;
    timer.current = setInterval(() => setI(prev => (prev + 1) % items.length), 3000);
    return () => clearInterval(timer.current);
  }, [playing, items]);

  if (!userId) return <div className="p-6">Sign in to view your slideshow.</div>;
  if (items.length === 0) return <div className="p-6">No favorite photos for {year} yet.</div>;

  return (
    <div className="w-screen h-screen bg-black text-white relative overflow-hidden">
      {/* image with simple “Ken Burns” effect */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={items[i].file_path}
          src={items[i].url}
          alt=""
          className="w-full h-full object-cover"
          style={{
            transform: "scale(1.08)",
            animation: "kenburns 3s ease-in-out forwards",
          }}
        />
      </div>

      {/* controls */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-3">
        <button className="px-3 py-1 rounded bg-white/10 hover:bg-white/20" onClick={() => setPlaying(!playing)}>
          {playing ? "Pause" : "Play"}
        </button>
        <button className="px-3 py-1 rounded bg-white/10 hover:bg-white/20" onClick={() => setI((i-1+items.length)%items.length)}>Prev</button>
        <button className="px-3 py-1 rounded bg-white/10 hover:bg-white/20" onClick={() => setI((i+1)%items.length)}>Next</button>
      </div>

      <style jsx global>{`
        @keyframes kenburns {
          0%   { transform: scale(1.02); }
          100% { transform: scale(1.12); }
        }
      `}</style>
    </div>
  );
}
