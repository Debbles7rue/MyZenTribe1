"use client";

export const dynamic = "force-dynamic";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const ENVS = [
  { id: "sacred", label: "Sacred Room" },
  { id: "beach", label: "Stunning Beach" },
  { id: "creek", label: "Forest Creek" },
  { id: "fire", label: "Crackling Fire" },
  { id: "patterns", label: "Meditative Patterns" },
];

export default function SoloSchedulePage() {
  const router = useRouter();

  const nowLocal = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 5 - (d.getMinutes() % 5));
    d.setSeconds(0);
    return d.toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm (local)
  }, []);

  const [title, setTitle] = useState("Meditation Session");
  const [start, setStart] = useState(nowLocal);
  const [duration, setDuration] = useState(20);
  const [env, setEnv] = useState("beach");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login?redirect=/meditation/schedule";
      return;
    }

    const starts = new Date(start);
    const ends = new Date(starts.getTime() + duration * 60000);

    // Store env in event_type so you can recover it later: "meditation:beach"
    const event_type = `meditation:${env}`;

    const payload = {
      title,
      description: null,
      location: null,
      start_time: starts.toISOString(),
      end_time: ends.toISOString(),
      visibility: "public",      // or "private" if you prefer
      created_by: user.id,
      event_type,
      rsvp_public: true,
      community_id: null,
      image_path: null,
      source: "personal" as const,
    };

    const { error } = await supabase.from("events").insert(payload);
    setSaving(false);

    if (error) {
      setError(error.message || "Could not save event");
      return;
    }
    router.replace("/calendar");
  }

  return (
    <main className="page container-app">
      <header className="mz-header" style={{ marginBottom: 12 }}>
        <h1 className="page-title">Schedule: Solo Session</h1>
        <Link href="/meditation" className="btn">← Back</Link>
      </header>

      <div className="grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <label className="field">
          <span className="lab">Title</span>
          <input className="input" value={title} onChange={(e)=>setTitle(e.target.value)} />
        </label>

        <label className="field">
          <span className="lab">Start</span>
          <input className="input" type="datetime-local" value={start} onChange={(e)=>setStart(e.target.value)} />
        </label>

        <label className="field">
          <span className="lab">Duration</span>
          <select className="input" value={duration} onChange={(e)=>setDuration(Number(e.target.value))}>
            {[10,15,20,25,30,45,60].map(m => <option key={m} value={m}>{m} minutes</option>)}
          </select>
        </label>

        <label className="field">
          <span className="lab">Environment</span>
          <select className="input" value={env} onChange={(e)=>setEnv(e.target.value)}>
            {ENVS.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </label>
      </div>

      {error && <p className="text-rose-600" style={{ marginTop: 8 }}>{error}</p>}

      <div style={{ marginTop: 16 }}>
        <button className="btn btn-brand" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save to my calendar"}
        </button>
      </div>
    </main>
  );
}
