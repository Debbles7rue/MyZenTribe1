// app/meditation/schedule/group/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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

function CreateGroup() {
  const now = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 5 - (d.getMinutes() % 5));
    d.setSeconds(0);
    return d;
  }, []);

  const [title, setTitle] = useState("Group Meditation");
  const [start, setStart] = useState(now.toISOString().slice(0,16));
  const [duration, setDuration] = useState(20);
  const [env, setEnv] = useState("sacred");
  const [code, setCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleCreate() {
    setSaving(true);
    const c = crypto.randomUUID().slice(0,8);
    setCode(c);
    setSaving(false);
  }

  const shareUrl = code ? `${typeof window !== "undefined" ? window.location.origin : ""}/meditation/schedule/group?code=${code}` : "";

  return (
    <main className="wrap">
      <header className="head">
        <h1 className="title">Schedule: Group Session</h1>
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
          <select className="input" value={env} onChange={(e)=>setEnv(e.target.value)}>
            {["sacred","beach","creek","fire","patterns"].map(id => <option key={id} value={id}>{id}</option>)}
          </select>
        </label>
      </div>

      <div className="actions">
        <button className="btn brand" disabled={saving} onClick={handleCreate}>
          {saving ? "Creating…" : "Create session & get link"}
        </button>
      </div>

      {code && (
        <div className="card">
          <h3>Invite link</h3>
          <div className="row">
            <input className="input" readOnly value={shareUrl} onFocus={(e)=>e.currentTarget.select()} />
            <button className="btn" onClick={()=>navigator.clipboard.writeText(shareUrl)}>Copy</button>
          </div>
          <p className="muted">Share this link with your community or friends.</p>
          <Link className="btn" href={`/meditation/schedule/group?code=${code}`}>Open invite page</Link>
        </div>
      )}

      <style jsx>{styles}</style>
    </main>
  );
}

function InviteLanding({ code }: { code: string }) {
  const [name, setName] = useState("");
  const [duration] = useState(20);

  const start = useMemo(() => {
    // For a backend-less demo, set "now + 1 hour".
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setSeconds(0);
    return d;
  }, []);

  function addToCalendar() {
    const end = new Date(start.getTime() + duration * 60000);
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//MyZenTribe//Group//EN",
      "BEGIN:VEVENT",
      `UID:${code}@myzentribe`,
      `DTSTAMP:${toIcsDate(new Date())}`,
      `DTSTART:${toIcsDate(start)}`,
      `DTEND:${toIcsDate(end)}`,
      `SUMMARY:Group Meditation`,
      `DESCRIPTION:Join via MyZenTribe. Invite code ${code}.`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    download("group-meditation.ics", ics);
  }

  function rsvp() {
    if (!name.trim()) { alert("Please enter your name."); return; }
    alert(`Thanks, ${name.trim()} — you’re on the list!`);
    setName("");
  }

  return (
    <main className="wrap">
      <header className="head">
        <h1 className="title">You’re invited ✨</h1>
        <Link href="/meditation/schedule" className="btn">← Back</Link>
      </header>

      <p><b>When:</b> {start.toLocaleString()}</p>
      <p><b>Invite code:</b> {code}</p>

      <div className="actions">
        <button className="btn brand" onClick={addToCalendar}>Add to my calendar (.ics)</button>
      </div>

      <h3>RSVP</h3>
      <div className="row">
        <input className="input" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Your name" />
        <button className="btn" onClick={rsvp}>I’m joining</button>
      </div>

      <style jsx>{styles}</style>
    </main>
  );
}

function GroupRouter() {
  const sp = useSearchParams();
  const code = sp.get("code");
  return code ? <InviteLanding code={code} /> : <CreateGroup />;
}

export default function GroupPage() {
  return (
    <Suspense fallback={<main className="wrap">Loading…</main>}>
      <GroupRouter />
    </Suspense>
  );
}

const styles = `
  .wrap { max-width: 900px; margin:0 auto; padding:24px; }
  .head { display:flex; align-items:center; justify-content:space-between; }
  .title { font-size:26px; }
  .btn { border:1px solid #dfd6c4; background:linear-gradient(#fff,#f5efe6); border-radius:10px; padding:8px 12px; text-decoration:none; color:#2a241c; }
  .brand { border-color:#d8c49b; background:linear-gradient(#ffe9be,#f7dca6); box-shadow:0 2px 6px rgba(150,110,20,.15); }
  .grid { display:grid; gap:12px; grid-template-columns:1fr 1fr; margin-top:12px; }
  .field { display:grid; gap:6px; }
  .lab { font-size:12px; opacity:.7; }
  .input { padding:10px 12px; border:1px solid #e6dcc6; border-radius:10px; background:#fff; width:100%; }
  .actions { margin:12px 0; }
  .row { display:flex; gap:8px; align-items:center; }
  .muted { opacity:.72; }
  .card { background:#faf7f1; border:1px solid #e7e0d2; border-radius:16px; padding:16px; margin-top:16px; }
  @media (max-width:720px) { .grid { grid-template-columns:1fr; } .row { flex-direction:column; align-items:stretch; } }
`;
