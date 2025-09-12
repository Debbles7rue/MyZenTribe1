// components/ScheduleMeditation.tsx - Fixed syntax error
"use client";

import { useEffect, useMemo, useState } from "react";
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
      }

      // COMMUNITIES
      const { data: comms } = await supabase
        .from("communities")
        .select("id, title")
        .eq("status", "active");
      setCommunities(
        (comms || []).map((c: any) => ({ id: c.id, title: c.title }))
      );
    })();
  }, [open]);

  function reset() {
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
  }

  const { data: me } = { data: { user: null } }; // placeholder
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      // set me if needed
    });
  }, []);

  async function submit() {
    setSaving(true);

    const { data: me } = await supabase.auth.getUser();
    if (!me.user) {
      setSaving(false);
      alert("You must be signed in to schedule.");
      return;
    }

    const starts = new Date(`${date}T${time}`);
    const ends = new Date(starts.getTime() + durationMin * 60 * 1000);

    // 1) insert event
    const { data: evt, error: evtErr } = await supabase
      .from("meditation_events")
      .insert([
        {
          created_by: me.user.id,
          event_type: "meditation",
          visibility: mode === "group" ? "public" : "private",
          meditation_mode: mode === "solo" ? "solo" : "group",
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
                <div className="choice-row">
                  <button className="choice" onClick={() => setMode("solo")}>Just me</button>
                  <button className="choice" onClick={() => setMode("group")}>Host a group meditation</button>
                </div>
              ) : (
                <>
                  {/* Event basics */}
                  <div className="grid grid-2">
                    <label className="field">
                      <div className="lab">Environment</div>
                      <select
                        className="input"
                        value={environment}
                        onChange={(e) => setEnvironment(e.target.value as EnvId)}
                      >
                        {ENV_CHOICES.map((env) => (
                          <option key={env.id} value={env.id}>{env.label}</option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <div className="lab">Title</div>
                      <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </label>

                    <label className="field">
                      <div className="lab">Date</div>
                      <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
                    </label>

                    <label className="field">
                      <div className="lab">Start time</div>
                      <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
                    </label>

                    <label className="field">
                      <div className="lab">Duration (minutes)</div>
                      <input
                        type="number"
                        className="input"
                        value={durationMin}
                        min={1}
                        onChange={(e) => setDurationMin(parseInt(e.target.value || "0"))}
                      />
                    </label>

                    <label className="field grid-span-2">
                      <div className="lab">Notes (optional)</div>
                      <textarea className="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </label>
                  </div>

                  {/* Group options */}
                  {mode === "group" && (
                    <div className="group-block">
                      <div className="block-title">Invite participants (optional)</div>

                      <div className="check">
                        <input
                          type="checkbox"
                          checked={inviteAllFriends}
                          onChange={(e) => setInviteAllFriends(e.target.checked)}
                        />
                        <label>Invite all friends</label>
                      </div>

                      {!inviteAllFriends && (
                        <div>
                          {friends.length > 0 && (
                            <div className="chips">
                              {friends.map((f) => {
                                const on = friendIds.includes(f.id);
                                return (
                                  <button
                                    key={f.id}
                                    className={`chip ${on ? "on" : ""}`}
                                    onClick={() =>
                                      setFriendIds((cur) =>
                                        on ? cur.filter((x) => x !== f.id) : [...cur, f.id]
                                      )
                                    }
                                  >
                                    {f.name || f.email || "Friend"}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {communities.length > 0 && (
                            <div className="chips" style={{ marginTop: "8px" }}>
                              {communities.map((c) => {
                                const on = communityIds.includes(c.id);
                                return (
                                  <button
                                    key={c.id}
                                    className={`chip ${on ? "on" : ""}`}
                                    onClick={() =>
                                      setCommunityIds((cur) =>
                                        on ? cur.filter((x) => x !== c.id) : [...cur, c.id]
                                      )
                                    }
                                  >
                                    {c.title ?? "Community"}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="sched-foot">
              {mode && (
                <button className="btn btn-brand" disabled={disableSubmit || saving} onClick={submit}>
                  {saving ? "Saving…" : "Save"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .mz-scheduleBtn {
          border: 1px solid #dfd6c4;
          background: linear-gradient(#fff, #f5efe6);
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 14px;
          text-decoration: none;
          color: #2a241c;
          cursor: pointer;
        }

        .sched-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,.25);
          display: grid; place-items: center; z-index: 2000;
        }
        .sched-panel {
          width: min(900px, 94vw); background: #fffdf8; color: #2a241c;
          border: 1px solid #eadfca; border-radius: 16px;
          box-shadow: 0 20px 60px rgba(20,10,0,.25); overflow: hidden;
        }
        .sched-head, .sched-foot {
          padding: 12px 16px; border-bottom: 1px solid #eadfca; display: flex; align-items: center; justify-content: space-between;
        }
        .sched-foot { border-top: 1px solid #eadfca; border-bottom: none; }
        .sched-title { font-weight: 700; }

        .sched-body { padding: 14px 16px; display: grid; gap: 16px; }

        .choice-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .choice {
          padding: 14px 16px; border-radius: 12px; border: 1px solid #eadfca;
          background: linear-gradient(#fff, #fbf6ec); cursor: pointer; font-weight: 600;
        }

        .grid { display: grid; gap: 12px; }
        .grid-2 { grid-template-columns: 1fr 1fr; }
        .grid-span-2 { grid-column: span 2; }
        @media (max-width: 680px) { .grid-2 { grid-template-columns: 1fr; } .grid-span-2 { grid-column: auto; } }

        .field { display: grid; gap: 8px; }
        .lab { font-size: 12px; opacity: .75; }
        .input, .textarea, select {
          padding: 10px 12px; border-radius: 10px; border: 1px solid #e6dcc6; background: #fff;
        }

        .group-block { border-top: 1px dashed #eadfca; padding-top: 12px; }
        .block-title { font-weight: 700; margin-bottom: 6px; }

        .check { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }

        .chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .chip {
          padding: 6px 10px; border-radius: 999px; border: 1px solid #e6dcc6; background: #fff;
          cursor: pointer; font-size: 13px;
        }
        .chip.on { border-color: #b89b62; background: #fff6db; }
        .btn {
          border: 1px solid #dfd6c4; background: linear-gradient(#fff, #f5efe6);
          border-radius: 10px; padding: 8px 12px; font-size: 14px; cursor: pointer;
        }
        .btn-brand {
          border-color: #d8c49b; background: linear-gradient(#ffe9be, #f7dca6);
          box-shadow: 0 2px 6px rgba(150,110,20,0.15);
        }
      `}</style>
    </>
  );
}

/** Tiny ICS download so users can add to their personal calendar */
function downloadICS(opts: { title: string; notes?: string; starts: Date; ends: Date }) {
  const dt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const ics =
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//MyZenTribe//Meditation//EN",
      "BEGIN:VEVENT",
      `DTSTAMP:${dt(new Date())}`,
      `DTSTART:${dt(opts.starts)}`,
      `DTEND:${dt(opts.ends)}`,
      `SUMMARY:${escapeICS(opts.title)}`,
      opts.notes ? `DESCRIPTION:${escapeICS(opts.notes)}` : "",
      "END:VEVENT",
      "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "meditation.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeICS(s: string) {
  return s.replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
}
