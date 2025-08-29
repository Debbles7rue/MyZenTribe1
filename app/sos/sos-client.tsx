"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type SOS = {
  id: string;
  created_at: string;
  status: string;
  message: string | null;
  lat: number | null;
  lon: number | null;
};

export default function SOSHistory() {
  const [rows, setRows] = useState<SOS[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("sos_incidents")
        .select("*")
        .order("created_at", { ascending: false });
      setRows((data as SOS[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <h1 className="text-xl font-semibold">SOS history</h1>
      {loading ? (
        <div className="muted mt-3">Loading…</div>
      ) : rows.length ? (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="card p-3">
              <div className="text-sm">
                <strong>{new Date(r.created_at).toLocaleString()}</strong> — {r.status}
              </div>
              {r.message && <div className="text-sm">{r.message}</div>}
              {r.lat != null && r.lon != null && (
                <div className="text-xs text-neutral-600">({r.lat.toFixed(4)}, {r.lon.toFixed(4)})</div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="muted mt-3">No SOS incidents yet.</div>
      )}
    </div>
  );
}
