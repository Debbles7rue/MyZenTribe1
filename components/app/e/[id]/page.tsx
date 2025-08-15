"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function PublicEvent() {
  const { id } = useParams<{ id: string }>();
  const [ev, setEv] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
      setEv(data);
    })();
  }, [id]);

  if (!ev) return <div className="container-app page"><p className="muted">Loading…</p></div>;

  return (
    <div className="container-app page">
      <div className="card p-3">
        {ev.image_path && (
          <img src={ev.image_path} alt="" style={{ width: "100%", borderRadius: 12, marginBottom: 12 }} />
        )}
        <h1 className="page-title">{ev.title}</h1>
        <div className="muted">
          {new Date(ev.start_time).toLocaleString()} — {new Date(ev.end_time).toLocaleString()}
        </div>
        {ev.location && <div style={{ marginTop: 8 }}>{ev.location}</div>}
        {ev.description && <p style={{ marginTop: 12 }}>{ev.description}</p>}
      </div>
    </div>
  );
}
