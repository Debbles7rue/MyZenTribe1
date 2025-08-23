"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type DBEvent = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  created_by: string;
  invite_code: string | null;
};

type Msg = {
  id: number;
  event_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export default function CirclePage({ params }: { params: { code: string } }) {
  const code = decodeURIComponent(params.code);
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [evt, setEvt] = useState<DBEvent | null>(null);
  const [allowed, setAllowed] = useState<boolean>(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // load session
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data?.user ?? null;
      if (!u) {
        window.location.href = "/signin";
        return;
      }
      const name =
        (u.user_metadata?.name as string) ||
        (u.user_metadata?.full_name as string) ||
        (u.email as string) ||
        "Friend";
      setMe({ id: u.id, name });
    })();
  }, []);

  // load event by invite code + membership
  useEffect(() => {
    if (!me) return;
    let alive = true;

    (async () => {
      setLoading(true);

      const ev = await supabase
        .from("events")
        .select("id,title,description,start_time,end_time,created_by,invite_code")
        .eq("invite_code", code)
        .single();

      if (!alive) return;

      if (ev.error || !ev.data) {
        setEvt(null);
        setAllowed(false);
        setLoading(false);
        return;
      }

      setEvt(ev.data as DBEvent);

      // am I the creator or an RSVP'd attendee?
      if (ev.data.created_by === me.id) {
        setAllowed(true);
      } else {
        const a = await supabase
          .from("event_attendees")
          .select("id")
          .eq("event_id", ev.data.id)
          .eq("user_id", me.id)
          .limit(1)
          .single();
        setAllowed(!a.error && !!a.data);
      }
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [me?.id, code]);

  // load messages + realtime
  useEffect(() => {
    if (!evt || !allowed) return;
    let mounted = true;

    (async () => {
      const { data } = await supabase
        .from("circle_messages")
        .select("*")
        .eq("event_id", evt.id)
        .order("created_at", { ascending: true })
        .limit(300);
      if (!mounted) return;
      setMsgs(data || []);
      setTimeout(() => scrollerRef.current?.scrollTo({ top: 9e6 }), 50);
    })();

    const ch = supabase
      .channel(`circle:${evt.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "circle_messages",
          filter: `event_id=eq.${evt.id}`,
        },
        (payload) => {
          setMsgs((cur) => [...cur, payload.new as Msg]);
          const el = scrollerRef.current;
          if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 180) {
            setTimeout(() => el.scrollTo({ top: 9e6, behavior: "smooth" }), 0);
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [evt?.id, allowed]);

  async function send() {
    if (!me || !evt || !allowed) return;
    const body = text.trim();
    if (!body) return;
    setText("");
    const { error } = await supabase
      .from("circle_messages")
      .insert([{ event_id: evt.id, user_id: me.id, body }]);
    if (error) alert(error.message);
  }

  const when = useMemo(() => {
    if (!evt) return "";
    const s = new Date(evt.start_time);
    const e = new Date(evt.end_time);
    return `${s.toLocaleString()} – ${e.toLocaleTimeString()}`;
    // (You already format nicely in EventDetails; keeping this simple here.)
  }, [evt?.start_time, evt?.end_time]);

  if (loading) return <div className="container-app py-8">Loading…</div>;

  if (!evt)
    return (
      <div className="container-app py-8">
        <h1 className="page-title">Invite not found</h1>
        <p className="muted">This invite code doesn’t match any event.</p>
        <p className="mt-3">
          <Link className="link" href="/calendar">
            ← Back to calendar
          </Link>
        </p>
      </div>
    );

  if (!allowed)
    return (
      <div className="container-app py-8">
        <h1 className="page-title">Join this circle</h1>
        <p className="muted mb-4">
          You aren’t on the attendee list for <b>{evt.title || "Meditation"}</b>.
        </p>
        <Link
          className="btn btn-brand"
          href={`/meditation/schedule/group?code=${encodeURIComponent(code)}`}
        >
          RSVP to join
        </Link>
        <p className="mt-3">
          <Link className="link" href="/calendar">
            ← Back to calendar
          </Link>
        </p>
      </div>
    );

  return (
    <div className="page">
      <div className="container-app">
        <div className="flex items-center justify-between gap-3 mt-3 mb-2">
          <h1 className="page-title">{evt.title || "Group Meditation"}</h1>
          <Link className="btn btn-neutral" href="/calendar">
            ← Back to calendar
          </Link>
        </div>

        <div className="muted mb-3">{when}</div>

        <div className="card overflow-hidden">
          <div
            ref={scrollerRef}
            style={{ height: "60vh", overflow: "auto", background: "#fffdf8", padding: 12 }}
          >
            {msgs.length === 0 ? (
              <div className="muted text-center py-8">No messages yet. Say hello 👋</div>
            ) : (
              msgs.map((m) => (
                <div key={m.id} className="mb-3">
                  <div className="text-sm">{m.body}</div>
                  <div className="text-xs muted">
                    {new Date(m.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t p-2 bg-[#fbf6ec] flex gap-2">
            <input
              className="input flex-1"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Write a message…"
              maxLength={1000}
            />
            <button className="btn btn-brand" onClick={send}>
              Send
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs muted">
          Only the organizer and attendees of this event can read/post here.
        </p>
      </div>
    </div>
  );
}
