"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function binsFromSessions(sessions: { started_at: string; ended_at: string }[]) {
  const now = Date.now();
  const startWindow = now - 24 * 60 * 60 * 1000;
  const binMs = 15 * 60 * 1000;
  const binCount = Math.ceil((now - startWindow) / binMs);
  const counts = new Array(binCount).fill(0);

  for (const s of sessions) {
    const a = new Date(s.started_at).getTime();
    const b = new Date(s.ended_at).getTime();
    const start = Math.max(a, startWindow);
    const end = Math.min(b, now);
    if (end <= start) continue;
    const startIdx = Math.floor((start - startWindow) / binMs);
    const endIdx = Math.ceil((end - startWindow) / binMs);
    for (let i = startIdx; i < endIdx; i++) counts[i] += 1;
  }

  const coveredBins = counts.filter((c) => c > 0).length;
  const coveragePct = Math.round((coveredBins / counts.length) * 100);
  const concurrentNow = counts[counts.length - 1] || 0;
  return { counts, coveragePct, concurrentNow };
}

export function TribePulse() {
  const [rows, setRows] = useState<{ started_at: string; ended_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("meditation_sessions_public").select("*");
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const { counts, coveragePct, concurrentNow } = useMemo(() => binsFromSessions(rows), [rows]);
  const max = counts.length ? Math.max(...counts) : 0;
  const scale = (n: number) => (max <= 1 ? (n > 0 ? 2 : 0) : Math.min(3, Math.ceil((n / max) * 3)));

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-zinc-600">
          {loading ? "Loading pulse…" : `${coveragePct}% of last 24h had at least one meditator`}
        </div>
        <div className="text-xs font-medium">{concurrentNow} live now</div>
      </div>
      <div className="grid grid-cols-24 gap-0.5">
        {counts.map((c, i) => (
          <div
            key={i}
            className={
              scale(c) === 0
                ? "h-2 rounded bg-zinc-200"
                : scale(c) === 1
                ? "h-2 rounded bg-emerald-200"
                : scale(c) === 2
                ? "h-2 rounded bg-emerald-400"
                : "h-2 rounded bg-emerald-600"
            }
            title={`${c} meditator(s)`}
          />
        ))}
      </div>
    </div>
  );
}
