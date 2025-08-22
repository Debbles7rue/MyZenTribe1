"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/** Environment options shown in the dropdown */
const ENVS = [
  { id: "sacred", label: "Sacred Room" },
  { id: "beach", label: "Stunning Beach" },
  { id: "creek", label: "Forest Creek" },
  { id: "fire", label: "Crackling Fire" },
  { id: "patterns", label: "Meditative Patterns" },
];

/** ---------- CREATE VIEW (Step 1) ---------- */
function CreateGroup() {
  const router = useRouter();

  // round to next 5 minutes
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
  const [error, setError] = useState<string | null>(null);

  // Once created:
  const [eventId, setEventId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

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
        visibility: "public",      // or 'group' if you prefer a distinct label
        created_by: user.id,
        event_type,
        rsvp_public: true,
        community_id: null,
        image_path: null,
        source: "personal",
        invite_code,
      }])
      .select("id, invite_code")
      .single();

    setSaving(false);
    if (error || !data) {
      setError(error?.message || "Could not create event");
      return;
    }

    setEventId(data.id);
    setShareUrl(`${window.location.origin}/meditation/schedule/group?code=${encodeURIComponent(data.invite_code!)}`);
  }

  if (!eventId) {
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

  // Once the event exists, show invite tools
  return <InviteTools eventId={eventId} shareUrl={shareUrl!} />;
}

/** ---------- INVITE TOOLS (Step 2) ---------- */
function InviteTools({ eventId, shareUrl }: { eventId: string; shareUrl: string }) {
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) { window.location.href = "/login"; return; }
      const name = (u.user_metadata?.name as string) || (u.user_metadata?.full_name as string) || (u.email as string) || "Friend";
      setMe({ id: u.id, name });
    });
  }, []);

  /** Communities I belong to */
  type Community = { id: string; name: string };
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selCommunityIds, setSelCommunityIds] = useState<Set<string>>(new Set());
  const [loadingCommunities, setLoadingCommunities] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingCommunities(true);
      // expects: community_members(user_id, community_id), communities(id, name)
      // Join manually in two steps for widest compatibility
      const meRes = await supabase.auth.getUser();
      const uid = meRes.data.user?.id;
      if (!uid) return;

      const cm = await supabase
        .from("community_members")
        .select("community_id")
        .eq("user_id", uid);

      if (!cm.error && cm.data && cm.data.length) {
        const ids = cm.data.map((r: any) => r.community_id);
        const cs = await supabase.from("communities").select("id, name").in("id", ids);
        if (!cs.error && cs.data) setCommunities(cs.data as Community[]);
      }
      setLoadingCommunities(false);
    })();
  }, []);

  const toggleCommunity = (id: string) => {
    setSelCommunityIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const [invitingComms, setInvitingComms] = useState(false);
  const [commInviteMsg, setCommInviteMsg] = useState<string | null>(null);

  async function inviteSelectedCommunities() {
    if (!me) return;
    setInvitingComms(true);
    setCommInviteMsg(null);

    try {
      // Gather all members across selected communities
      const allMemberIds = new Set<string>();
      for (const cid of selCommunityIds) {
        const m = await supabase
          .from("community_members")
          .select("user_id")
          .eq("community_id", cid);
        if (!m.error && m.data) {
          m.data.forEach((r: any) => {
            if (r.user_id !== me.id) allMemberIds.add(r.user_id);
          });
        }
      }
      if (allMemberIds.size === 0) {
        setCommInviteMsg("No eligible members found.");
        setInvitingComms(false);
        return;
      }

      // Create invite rows (dedup via PK on (event_id, invitee_user_id))
      const rows = Array.from(allMemberIds).map(uid => ({
        event_id: eventId,
        invitee_user_id: uid,
        invited_by: me.id,
        source: "community" as const,
      }));
      const { error } = await supabase.from("event_invites").upsert(rows, { onConflict: "event_id,invitee_user_id" });
      if (error) throw error;

      setCommInviteMsg(`Invited ${rows.length} member(s) across selected communities.`);
    } catch (e: any) {
      setCommInviteMsg(e.message || "Could not send invites.");
    } finally {
      setInvitingComms(false);
    }
  }

  /** People search & selection (friends/individuals) */
  type Person = { id: string; display_name: string | null; email?: string | null };
  const [peopleQuery, setPeopleQuery] = useState("");
  const [peopleResults, setPeopleResults] = useState<Person[]>([]);
  const [selPeopleIds, setSelPeopleIds] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);

  async function searchPeople(q: string) {
    setPeopleQuery(q);
    if (!q.trim()) { setPeopleResults([]); return; }
    setSearching(true);
    // Simple global search in profiles (replace with your friends table if you like)
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name")
      .ilike("display_name", `%${q}%`)
      .limit(25);
    if (!error && data) setPeopleResults(data as Person[]);
    setSearching(false);
  }

  const togglePerson = (id: string) => {
    setSelPeopleIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const [invitingPeople, setInvitingPeople] = useState(false);
  const [peopleInviteMsg, setPeopleInviteMsg] = useState<string | null>(null);

  async function inviteSelectedPeople(inviteAllVisible: boolean) {
    if (!me) return;
    setInvitingPeople(true);
    setPeopleInviteMsg(null);

    try {
      const ids = new Set<string>();
      if (inviteAllVisible) {
        peopleResults.forEach(p => p.id !== me.id && ids.add(p.id));
      } else {
        selPeopleIds.forEach(id => { if (id !== me.id) ids.add(id); });
      }
      if (ids.size === 0) {
        setPeopleInviteMsg("No people selected.");
        setInvitingPeople(false);
        return;
      }

      const rows = Array.from(ids).map(uid => ({
        event_id: eventId,
        invitee_user_id: uid,
        invited_by: me.id,
        source: "direct" as const,
      }));
      const { error } = await supabase.from("event_invites").upsert(rows, { onConflict: "event_id,invitee_user_id" });
      if (error) throw error;

      setPeopleInviteMsg(`Invited ${rows.length} person(s).`);
    } catch (e: any) {
      setPeopleInviteMsg(e.message || "Could not send invites.");
    } finally {
      setInvitingPeople(false);
    }
  }

  return (
    <main className="page container-app">
      <header className="mz-header" style={{ marginBottom: 12 }}>
        <h1 className="page-title">Invite people to your session</h1>
        <Link href="/calendar" className="btn">← Back to Calendar</Link>
      </header>

      {/* Share link (still available) */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Invite link</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input className="input" readOnly value={shareUrl} onFocus={(e)=>e.currentTarget.select()} />
          <button className="btn" onClick={()=>navigator.clipboard.writeText(shareUrl)}>Copy</button>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          Anyone with this link can RSVP (must be signed in). On RSVP it appears on their calendar.
        </p>
      </div>

      {/* Communities picker */}
      <section className="card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Invite communities</h3>
        {loadingCommunities ? (
          <div>Loading your communities…</div>
        ) : communities.length === 0 ? (
          <div className="muted">No communities found.</div>
        ) : (
          <>
            <ul style={{ listStyle: "none", padding: 0, margin: "8px 0", display: "grid", gap: 8 }}>
              {communities.map(c => (
                <li key={c.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={selCommunityIds.has(c.id)}
                    onChange={() => toggleCommunity(c.id)}
                    id={`comm-${c.id}`}
                  />
                  <label htmlFor={`comm-${c.id}`}>{c.name}</label>
                </li>
              ))}
            </ul>
            <button className="btn btn-brand" onClick={inviteSelectedCommunities} disabled={invitingComms}>
              {invitingComms ? "Inviting…" : "Invite all members of selected"}
            </button>
            {commInviteMsg && <p className="muted" style={{ marginTop: 8 }}>{commInviteMsg}</p>}
          </>
        )}
      </section>

      {/* People search + multi-select */}
      <section className="card" style={{ padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Invite friends & acquaintances</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input"
            placeholder="Search names…"
            value={peopleQuery}
            onChange={(e)=>searchPeople(e.target.value)}
          />
          <button className="btn" onClick={()=>inviteSelectedPeople(true)} disabled={searching || peopleResults.length === 0 || invitingPeople}>
            Invite all results
          </button>
        </div>

        {searching ? (
          <div style={{ marginTop: 10 }}>Searching…</div>
        ) : peopleResults.length === 0 ? (
          <div className="muted" style={{ marginTop: 10 }}>No people yet. Try a different name.</div>
        ) : (
          <>
            <ul style={{ listStyle: "none", padding: 0, margin: "10px 0", display: "grid", gap: 8 }}>
              {peopleResults.map(p => (
                <li key={p.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={selPeopleIds.has(p.id)}
                    onChange={() => togglePerson(p.id)}
                    id={`p-${p.id}`}
                  />
                  <label htmlFor={`p-${p.id}`}>{p.display_name || p.id}</label>
                </li>
              ))}
            </ul>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-brand" onClick={()=>inviteSelectedPeople(false)} disabled={invitingPeople || selPeopleIds.size === 0}>
                {invitingPeople ? "Inviting…" : "Invite selected"}
              </button>
              <button className="btn" onClick={()=>{ setSelPeopleIds(new Set()); }}>
                Clear selection
              </button>
            </div>
            {peopleInviteMsg && <p className="muted" style={{ marginTop: 8 }}>{peopleInviteMsg}</p>}
          </>
        )}
      </section>
    </main>
  );
}

/** ---------- INVITE LANDING (when someone opens ?code=…) ---------- */
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
    if (error) { setError(error.message || "Could not RSVP"); return; }
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

/** ---------- Router: create vs invite landing ---------- */
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
