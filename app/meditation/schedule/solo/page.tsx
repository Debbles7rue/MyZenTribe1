"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const ENVS = [
  { id: "sacred",  label: "Sacred Room" },
  { id: "beach",   label: "Stunning Beach" },
  { id: "creek",   label: "Forest Creek" },
  { id: "fire",    label: "Crackling Fire" },
  { id: "patterns",label: "Meditative Patterns" },
] as const;

function toIcsDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) + "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) + "Z"
  );
}
function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function SoloSchedulePage() {
  const now = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 5 - (d.getMinutes() % 5));
    d.setSeconds(0);
    return d;
  }, []);

  const [start, setStart] = useState(now.toISOString().slice(0,16));
  const [duration, setDuration] = useState(20);
  const [env, setEnv] = useState<typeof ENVS[number]["id"]>("sacred");
  const [title, setTitle] = useState("Meditation Session");
  const [saving, setSaving] = useState(false);

  function handleCreate() {
    setSaving(true);
    const s = new Date(start);
    const e = new Date(s.getTime() + duration * 60000);
    const uid = crypto.randomUUID();
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//MyZenTribe//Solo//EN",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${toIcsDate(new Date())}`,
      `DTSTART:${toIcsDate(s)}`,
      `DTEND:${toIcsDate(e)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:Environment: ${env}. Scheduled via MyZenTribe.`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    setSaving(false);
    download("meditation.ics", ics);
  }

  return (
    <main className="wrap">
      <header className="head">
        <h1 className="title">Schedule: Solo Session</h1>
        <Link href="/meditation/schedule" className="btn">← Back</Link>
      </header>

      <div className="grid">
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
          <select className="input" value={env} onChange={(e)=>setEnv(e.target.value as any)}>
            {ENVS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </label>
      </div>

      <div className="actions">
        <button className="btn brand" disabled={saving} onClick={handleCreate}>
          {saving ? "Creating…" : "Add to my calendar (.ics)"}
        </button>
      </div>

      <style jsx>{`
        .wrap { max-width: 900px; margin:0 auto; padding:24px; }
        .head { display:flex; align-items:center; justify-content:space-between; }
        .title { font-size:26px; }
        .grid { display:grid; gap:12px; grid-template-columns:1fr 1fr; margin-top:12px; }
        .field { display:grid; gap:6px; }
        .lab { font-size:12px; opacity:.7; }
        .input { padding:10px 12px; border:1px solid #e6dcc6; border-radius:10px; background:#fff; }
        .actions { margin-top:16px; }
        .btn { border:1px solid #dfd6c4; background:linear-gradient(#fff,#f5efe6); border-radius:10px; padding:8px 12px; text-decoration:none; color:#2a241c; }
        .brand { border-color:#d8c49b; background:linear-gradient(#ffe9be,#f7dca6); box-shadow:0 2px 6px rgba(150,110,20,.15); }
        @media (max-width: 720px) { .grid { grid-template-columns:1fr; } }
      `}</style>
    </main>
  );
}
