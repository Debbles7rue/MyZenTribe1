"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type DBEvent = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  created_by: string;
  invite_code: string | null;
  event_type: string | null;
};

type ChatMsg = {
  id: number;
  body: string;
  created_at: string;
  user_id: string;
};

export default function CircleRoomPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [evt, setEvt] = useState<DBEvent | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [here, setHere] = useState(0);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      const name =
        (u.user_metadata?.name as string) ||
        (u.user_metadata?.full_name as string) ||
        (u.email as string) ||
        "Friend";
      setMe({ id: u.id, name });
    });
  }, []);

  useEffect(() => {
    if (!code || !me?.id) return;
    (async () => {
      const { data: ev, error } = await supabase
        .from("events")
        .select("*")
        .eq("invite_code", code)
        .maybeSingle();

      if (error || !ev) {
        alert("This circle link is invalid or expired.");
        router.replace("/calendar");
        return;
      }

      setEvt(ev as DBEvent);

      if (ev.created_by === me.id) { setAllowed(true); return; }

      const att = await supabase
        .from("event_attendees")
        .select("user_id")
        .eq("event_id", ev.id)
        .eq("user_id", me.id)
        .maybeSingle();

      setAllowed(!att.error && !!att.data);
    })();
  }, [code, me?.id, router]);

  useEffect(() => {
    if (!evt || !allowed || !me) return;

    let mounted = true;

    (async () => {
      const { data } = await supabase
        .from("circle_messages")
        .select("id, body, created_at, user_id")
        .eq("event_id", evt.id)
        .order("created_at", { ascending: true })
        .limit(200);
      if (mounted) {
        setMsgs(data || []);
        setTimeout(() => scroller.current?.scrollTo({ top: 999999 }), 0);
      }
    })();

    const ch = supabase.channel(`circle:${evt.invite_code}`, {
      config: { presence: { key: me.id } },
    });

    ch.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "circle_messages", filter: `event_id=eq.${evt.id}` },
      (payload) => {
        setMsgs((cur) => [...cur, payload.new as any]);
        const el = scroller.current;
        if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 160) {
          setTimeout(() => el.scrollTo({ top: 999999, behavior: "smooth" }), 0);
        }
      }
    );

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, any[]>;
      let n = 0;
      Object.values(state).forEach((arr) => (n += arr.length));
      setHere(n);
    });

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ id: me.id, name: me.name || "Guest" });
      }
    });

    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [evt?.id, evt?.invite_code, allowed, me]);

  const send = async () => {
    if (!evt || !me) return;
    const body = text.trim();
    if (!body) return;
    setText("");
    const { error } = await supabase
      .from("circle_messages")
      .insert([{ event_id: evt.id, user_id: me.id, body }]);
    if (error) alert(error.message);
  };

  if (evt && !allowed) {
    return (
      <div className="page">
        <div className="container-app">
          <h1 className="page-title">Private Circle</h1>
          <p className="muted">This private circle is only for the host and invitees.</p>
          <Link className="btn btn-brand" href={`/meditation/schedule/group?code=${code}`}>RSVP to join</Link>
        </div>
      </div>
    );
  }

  if (!evt) return null;

  return (
    <div className="page">
      <div className="container-app">
        <div className="flex items-center justify-between gap-2">
          <h1 className="page-title">{evt.title || "Group Meditation"}</h1>
          <div className="text-sm opacity-70">● {here} here now</div>
        </div>

        <div className="card p-3">
          <div ref={scroller} style={{ height: "50vh", overflow: "auto", background: "#fffdf8", padding: 12, borderRadius: 12 }}>
            {msgs.length === 0 ? (
              <div className="text-sm opacity-60 text-center py-10">No messages yet.</div>
            ) : (
              msgs.map((m) => (
                <div key={m.id} className="mb-3">
                  <div className="text-sm">{m.body}</div>
                  <div className="text-xs opacity-60">{new Date(m.created_at).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
            <input
              className="input"
              placeholder="Say hello…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              maxLength={500}
            />
            <button className="btn btn-brand" onClick={send}>Send</button>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Link className="btn" href={`/meditation`}>Enter Meditation Room</Link>
          <Link className="btn btn-neutral" href={`/meditation/schedule/group?code=${evt.invite_code}`}>Open Invite Page</Link>
        </div>
      </div>
    </div>
  );
}
