"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link"; // Added for profile links
import { supabase } from "@/lib/supabaseClient";

type EnvId = "sacred" | "beach" | "creek" | "fire" | "patterns";
const ENV_CHOICES: { id: EnvId; label: string }[] = [
  { id: "sacred", label: "Sacred Room" },
  { id: "beach", label: "Stunning Beach" },
  { id: "creek", label: "Forest Creek" },
  { id: "fire", label: "Crackling Fire" },
  { id: "patterns", label: "Meditative Patterns" },
];

type Friend = { id: string; name: string | null; email: string | null };
type Community = { id: string; title: string | null };

export default function ScheduleMeditation() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"solo" | "group" | null>(null);

  // event fields
  const [environment, setEnvironment] = useState<EnvId>("sacred");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10)); // yyyy-mm-dd
  const [time, setTime] = useState<string>("19:00"); // hh:mm 24h
  const [durationMin, setDurationMin] = useState<number>(20);
  const [title, setTitle] = useState<string>("Meditation");
  const [notes, setNotes] = useState<string>("");

  // group options
  const [friends, setFriends] = useState<Friend[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [inviteAllFriends, setInviteAllFriends] = useState(false);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [communityIds, setCommunityIds] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);

  // Load friends & communities when modal opens
  useEffect(() => {
    if (!open) return;
    (async () => {
      // FRIENDS: assumes a "profiles" view and friendships table
      // You can adapt to your actual schema
      const { data: me } = await supabase.auth.getUser();
      const myId = me.user?.id;

      if (myId) {
        // pull accepted friendships both directions
        const { data: f1 } = await supabase
          .from("friendships")
          .select("friend_id")
          .eq("user_id", myId)
          .eq("status", "accepted");
        const { data: f2 } = await supabase
          .from("friendships")
          .select("user_id")
          .eq("friend_id", myId)
          .eq("status", "accepted");

        const ids = new Set<string>();
        (f1 || []).forEach((r: any) => ids.add(r.friend_id));
        (f2 || []).forEach((r: any) => ids.add(r.user_id));

        // get friend profiles (assumes "profiles" table with id, full_name, email)
        if (ids.size) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", Array.from(ids));
          const mapped: Friend[] =
            (profs || []).map((p: any) => ({ id: p.id, name: p.full_name, email: p.email })) ?? [];
          setFriends(mapped);
        }

        // COMMUNITIES: user is member of
        const { data: cmem } = await supabase
          .from("community_members")
          .select("community_id")
          .eq("user_id", myId)
          .eq("status", "approved");
        const cids = (cmem || []).map((r: any) => r.community_id);
        if (cids.length) {
          const { data: comms } = await supabase
            .from("communities")
            .select("id, title")
            .in("id", cids);
          setCommunities((comms || []).map((c: any) => ({ id: c.id, title: c.title })));
        }
      }
    })();
  }, [open]);

  const reset = () => {
    setMode(null);
    setEnvironment("sacred");
    setDate(new Date().toISOString().slice(0, 10));
    setTime("19:00");
    setDurationMin(20);
    setTitle("Meditation");
    setNotes("");
    setInviteAllFriends(false);
    setFriendIds([]);
    setCommunityIds([]);
  };

  function downloadICS({ title, notes, starts, ends }: any) {
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MyZenTribe//EN
BEGIN:VEVENT
UID:${crypto.randomUUID ? crypto.randomUUID() : Date.now() + "@myzentribe"}
DTSTAMP:${formatICAL(new Date())}
DTSTART:${formatICAL(starts)}
DTEND:${formatICAL(ends)}
SUMMARY:${title}
DESCRIPTION:${notes || ""}
END:VEVENT
END:VCALENDAR`;
    const blob = new Blob([ics], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `meditation-${Date.now()}.ics`;
    a.click();
  }

  function formatICAL(d: Date) {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    const s = String(d.getSeconds()).padStart(2, "0");
    return `${y}${mo}${da}T${h}${mi}${s}`;
  }

  async function handleCreate() {
    setSaving(true);
    const { data: me } = await supabase.auth.getUser();
    if (!me.user?.id) {
      alert("You must be signed in to schedule.");
      setSaving(false);
      return;
    }

    const starts = new Date(`${date}T${time}:00`);
    const ends = new Date(starts.getTime() + durationMin * 60000);

    // 1) create meditation event
    const { data: evt, error: evtErr } = await supabase
      .from("meditation_events")
      .insert([
        {
          creator_id: me.user.id,
          type: mode === "group" ? "group" : "solo",
          environment,
          title,
          notes: notes || null,
          starts_at: starts.toISOString(),
          ends_at: ends.toISOString(),
        },
      ])
      .select("id")
      .single();

    if (evtErr || !evt) {
      setSaving(false);
      alert(evtErr?.message ?? "Could not create event.");
      return;
    }

    // 2) if group → create invitations
    if (mode === "group") {
      let inviteeIds = new Set<string>();

      if (inviteAllFriends) {
        friends.forEach((f) => inviteeIds.add(f.id));
      } else {
        friendIds.forEach((id) => inviteeIds.add(id));
      }

      if (communityIds.length) {
        const { data: members, error: memErr } = await supabase
          .from("community_members")
          .select("user_id")
          .in("community_id", communityIds);
        if (!memErr && members) {
          members.forEach((m: any) => inviteeIds.add(m.user_id));
        }
      }

      inviteeIds.delete(me.user.id); // don't invite myself
      const toInsert = Array.from(inviteeIds).map((id) => ({
        event_id: evt.id,
        invitee_id: id,
      }));

      if (toInsert.length) {
        const { error: invErr } = await supabase
          .from("meditation_invitations")
          .insert(toInsert);
        if (invErr) {
          // not fatal to the event—just report it
          console.error(invErr);
          alert("Event was created, but sending some invites failed.");
        }
      }
    }

    setSaving(false);
    setOpen(false);
    reset();

    // Optional: download ICS so they can add to personal calendar
    downloadICS({
      title,
      notes,
      starts,
      ends,
    });
  }

  const disableSubmit = useMemo(() => {
    if (!mode) return true;
    if (!date || !time || durationMin <= 0) return true;
    if (mode === "group") {
      if (!inviteAllFriends && friendIds.length === 0 && communityIds.length === 0) {
        // still okay to schedule a group with nobody pre-selected, but nudge:
        return false;
      }
    }
    return false;
  }, [mode, date, time, durationMin, inviteAllFriends, friendIds, communityIds]);

  return (
    <>
      {/* The small CTA button */}
      <button className="mz-scheduleBtn" onClick={() => setOpen(true)}>
        Schedule a meditation
      </button>

      {!open ? null : (
        <div className="sched-overlay" onClick={() => { setOpen(false); reset(); }}>
          <div className="sched-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sched-head">
              <div className="sched-title">Schedule a Meditation</div>
              <button className="btn" onClick={() => { setOpen(false); reset(); }}>Close</button>
            </div>

            <div className="sched-body">
              {/* Step 1: mode */}
              {!mode ? (
                <div className="step-mode">
                  <div className="block-title">Choose your meditation type:</div>
                  <button className="btn-mode" onClick={() => setMode("solo")}>
                    <div>🧘 Solo Meditation</div>
                    <div className="muted">A peaceful session just for you</div>
                  </button>
                  <button className="btn-mode" onClick={() => setMode("group")}>
                    <div>🤝 Group Meditation</div>
                    <div className="muted">Invite friends or communities to join</div>
                  </button>
                </div>
              ) : (
                <div>
                  <button className="btn" onClick={() => setMode(null)}>← Back</button>
                  <div className="mt-3">
                    <div className="lab">Meditation Background</div>
                    <select className="select" value={environment} onChange={(e) => setEnvironment(e.target.value as EnvId)}>
                      {ENV_CHOICES.map((e) => (
                        <option key={e.id} value={e.id}>{e.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-3">
                    <label className="lab">Title</label>
                    <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Meditation title" />
                  </div>

                  <div className="mt-3">
                    <label className="lab">Notes (optional)</label>
                    <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes or intention..." />
                  </div>

                  <div className="grid grid-3">
                    <div>
                      <label className="lab">Date</label>
                      <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="lab">Start time</label>
                      <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
                    </div>
                    <div>
                      <label className="lab">Duration (min)</label>
                      <input type="number" className="input" value={durationMin} onChange={(e) => setDurationMin(+e.target.value)} />
                    </div>
                  </div>

                  {/* Group options */}
                  {mode === "group" && (
                    <div className="group-block">
                      <div className="block-title">Invite people</div>

                      <label className="check">
                        <input
                          type="checkbox"
                          checked={inviteAllFriends}
                          onChange={(e) => setInviteAllFriends(e.target.checked)}
                        />
                        Invite all my friends
                      </label>

                      <div className="grid grid-2">
                        <div>
                          <div className="lab">Specific friends</div>
                          <div className="chips">
                            {friends.map((f) => {
                              const on = friendIds.includes(f.id);
                              return (
                                <div
                                  key={f.id}
                                  className="friend-chip-container"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <button
                                    type="button"
                                    className={`chip ${on ? "on" : ""}`}
                                    onClick={() =>
                                      setFriendIds((cur) =>
                                        on ? cur.filter((x) => x !== f.id) : [...cur, f.id]
                                      )
                                    }
                                    title={f.email ?? ""}
                                  >
                                    {on ? "✓ " : ""}{f.name ?? f.email ?? "Friend"}
                                  </button>
                                  {/* Added profile link */}
                                  <Link
                                    href={`/profile/${f.id}`}
                                    className="text-xs text-purple-600 hover:text-purple-700 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    👤
                                  </Link>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <div className="lab">Communities I'm in</div>
                          <div className="chips">
                            {communities.map((c) => {
                              const on = communityIds.includes(c.id);
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  className={`chip ${on ? "on" : ""}`}
                                  onClick={() =>
                                    setCommunityIds((cur) =>
                                      on ? cur.filter((x) => x !== c.id) : [...cur, c.id]
                                    )
                                  }
                                >
                                  {on ? "✓ " : ""}{c.title ?? "Community"}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {mode && (
              <div className="sched-foot">
                <button
                  className="btn btn-brand"
                  onClick={handleCreate}
                  disabled={disableSubmit || saving}
                >
                  {saving ? "Scheduling..." : "Create & Send Invites"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>;
}
