"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const ENVS = [
  { id: "sacred", label: "Sacred Room" },
  { id: "beach", label: "Stunning Beach" },
  { id: "creek", label: "Forest Creek" },
  { id: "fire", label: "Crackling Fire" },
  { id: "patterns", label: "Meditative Patterns" },
];

function CreateGroup() {
  const router = useRouter();

  const nowLocal = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 5 - (d.getMinutes() % 5));
    d.setSeconds(0);
    return d.toISOString().slice(0, 16);
  }, []);

  const [title, setTitle] = useState("Group Meditation");
  const [start, setStart] = useState(nowLocal);
  const [duration, setDuration] = useState(20);
  const [env, setEnv] = useState("sacred");
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setSaving(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login?redirect=/meditation/schedule/group";
      return;
    }

    const starts = new Date(start);
    const ends = new Date(starts.getTime() + duration * 60000);
    const event_type = `meditation:${env}`;
    const invite_code = crypto.randomUUID().slice(0, 8);

    const { data, error } = await supabase
      .from("events")
      .insert([{
        title,
        description: null,
        location: null,
        start_time: starts.toISOString(),
        end_time: ends.toISOString(),
        visibility: "public",      // or "group" if you use that label in your UI
        created_by: user.id,
        event_type,
        rsvp_public: true,
        community_id: null,
        image_path: null,
        source: "personal",
        invite_code
      }])
      .select("invite_code")
      .single();

    setSaving(false);
    if (error || !data) {
      setError(error?.message || "Could not create event");
      return;
    }

    const url = `${window.location.origin}/meditation/schedule/group?code=${encodeURIComponent(data.invite_code!)}`;
    setShareUrl(url);
  }

  return (
    <main className="page container-app">
      <header className="mz-header" style={{ marginBottom: 12 }}>
        <h1 className="page-title">Schedule: Group Session</h1>
        <Link href="/meditation/schedule" className="btn">← Back</Link>
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
        <button className="btn btn-brand" onClick={create} disabled={saving}>
          {saving ? "Creating…" : "Create session & get invite link"}
        </button>
      </div>

      {shareUrl && (
        <div className="card" style={{ marginTop: 16, padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Invite link</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input className="input" readOnly value={shareUrl} onFocus={(e)=>e.currentTarget.select()} />
            <button className="btn" onClick={()=>navigator.clipboard.writeText(shareUrl!)}>Copy</button>
          </div>
          <p className="muted" style={{ marginTop: 8 }}>
            Share this with your community/friends. When they RSVP, it will appear on their calendar.
          </p>
          <Link href={shareUrl} className="btn" style={{ marginTop: 8, display: "inline-block" }}>
            Open invite page
          </Link>
        </div>
      )}
    </main>
  );
}

function InviteLanding({ code }: { code: string }) {
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [busy, setBusy] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        window.location.href = `/login?redirect=${encodeURIComponent(`/meditation/schedule/group?code=${code}`)}`;
        return;
      }
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("invite_code", code)
        .maybeSingle();
      if (error || !data) setError(error?.message || "Invite not found");
      else setEvent(data);
      setBusy(false);
    })();
  }, [code]);

  async function rsvp() {
    setJoining(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent(`/meditation/schedule/group?code=${code}`)}`;
      return;
    }
    const { error } = await supabase
      .from("event_attendees")
      .upsert([{ event_id: event.id, user_id: user.id, status: "going" }]);

    setJoining(false);
    if (error) {
      setError(error.message || "Could not RSVP");
      return;
    }
    router.replace("/calendar");
  }

  if (busy) return <main className="page container-app">Loading…</main>;
  if (!event) return <main className="page container-app">{error || "Invite not found"}</main>;

  return (
    <main className="page container-app">
      <header className="mz-header" style={{ marginBottom: 12 }}>
        <h1 className="page-title">You’re invited ✨</h1>
        <Link href="/meditation/schedule" className="btn">← Back</Link>
      </header>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{event.title}</div>
        <div style={{ opacity: 0.75 }}>
          {new Date(event.start_time).toLocaleString()} — {new Date(event.end_time).toLocaleTimeString()}
        </div>
        <div style={{ opacity: 0.75, marginTop: 4 }}>
          Environment: {(event.event_type || "").replace("meditation:", "") || "sacred"}
        </div>

        {error && <p className="text-rose-600" style={{ marginTop: 8 }}>{error}</p>}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn btn-brand" onClick={rsvp} disabled={joining}>
            {joining ? "Adding…" : "RSVP · Save to my calendar"}
          </button>
          <Link className="btn" href={`/meditation?env=${encodeURIComponent((event.event_type||"").replace("meditation:",""))}&autostart=1`}>
            Go meditate
          </Link>
        </div>
      </div>
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
    <Suspense fallback={<main className="page container-app">Loading…</main>}>
      <GroupRouter />
    </Suspense>
  );
}
