"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { supabase } from "@/lib/supabaseClient";

type DBEvent = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  visibility: "public" | "friends" | "private" | "community";
  created_by: string;
  location: string | null;
  image_path: string | null;
  event_type: string | null;        // "group" for group meditations
  invite_code: string | null;
};

type CircleMsg = {
  id: number;
  event_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export default function CirclePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [event, setEvent] = useState<DBEvent | null>(null);
  const [msgs, setMsgs] = useState<CircleMsg[]>([]);
  const [text, setText] = useState("");
  const [hereCount, setHereCount] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Load current user
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) {
        router.replace("/signin");
        return;
      }
      const name =
        (u.user_metadata?.name as string) ||
        (u.user_metadata?.full_name as string) ||
        (u.email as string) ||
        "Friend";
      setMe({ id: u.id, name });
    })();
  }, [router]);

  // Load event by invite_code, then messages
  useEffect(() => {
    if (!code) return;
    let alive = true;

    (async () => {
      const { data: ev, error } = await supabase
        .from("events")
        .select("*")
        .eq("invite_code", String(code))
        .maybeSingle();

      if (!alive) return;

      if (error || !ev) {
        alert("This invite link is invalid or the event was removed.");
        router.replace("/calendar");
        return;
      }

      setEvent(ev as DBEvent);

      const { data: rows } = await supabase
        .from("circle_messages")
        .select("*")
        .eq("event_id", (ev as any).id)
        .order("created_at", { ascending: true });

      setMsgs(rows || []);
      setTimeout(() => scrollerRef.current?.scrollTo({ top: 9e6 }), 50);
    })();

    return () => {
      alive = false;
    };
  }, [code, router]);

  // Realtime + presence
  useEffect(() => {
    if (!event || !me) return;

    const ch = supabase.channel(`circle:${event.id}`, {
      config: { presence: { key: me.id } },
    });

    ch.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "circle_messages", filter: `event_id=eq.${event.id}` },
      (payload) => {
        setMsgs((cur) => [...cur, payload.new as CircleMsg]);
        const el = scrollerRef.current;
        if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
          setTimeout(() => el.scrollTo({ top: 9e6, behavior: "smooth" }), 0);
        }
      }
    );

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      let n = 0;
      Object.values(state).forEach((arr) => (n += (arr as any[]).length));
      setHereCount(n);
    });

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ id: me.id, name: me.name });
      }
    });

    return () => {
      supabase.removeChannel(ch);
    };
  }, [event?.id, me?.id, me?.name]);

  const when = useMemo(() => {
    if (!event) return "";
    const s = new Date(event.start_time);
    const e = new Date(event.end_time);
    return `${format(s, "EEE, MMM d · p")} – ${format(e, "p")}`;
  }, [event?.start_time, event?.end_time]);

  async function send() {
    if (!me || !event) return;
    const body = text.trim();
    if (!body) return;
    setText("");

    const { error } = await supabase
      .from("circle_messages")
      .insert([{ event_id: event.id, user_id: me.id, body }]);

    if (error) {
      // RLS would block here if you are not the host or an attendee
      alert(error.message);
    }
  }

  if (!event) {
    return null; // loading
  }

  return (
    <div className="page">
      <div className="container-app">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h1 className="page-title">{event.title || "Group circle"}</h1>
            <div className="text-sm text-neutral-600">{when}</div>
          </div>
          <div className="text-sm">● {hereCount} here now</div>
        </div>

        <div className="card overflow-hidden">
          {/* stream */}
          <div
            ref={scrollerRef}
            style={{ height: "60vh", overflow: "auto", padding: 16, background: "#fffdf8" }}
          >
            {msgs.map((m) => (
              <div key={m.id} className="mb-2 rounded-lg border border-amber-100 bg-white p-2">
                <div className="text-sm whitespace-pre-wrap">{m.body}</div>
                <div className="text-xs text-neutral-500">
                  {new Date(m.created_at).toLocaleString()}
                </div>
              </div>
            ))}
            {msgs.length === 0 && (
              <div className="text-center text-sm text-neutral-500 py-10">
                No messages yet. Say hello 👋
              </div>
            )}
          </div>

          {/* composer */}
          <div className="flex gap-2 border-t border-amber-200 bg-[#fbf6ec] p-3">
            <input
              className="input flex-1"
              placeholder="Write a message…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              maxLength={1000}
            />
            <button className="btn btn-brand" onClick={send}>
              Send
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Link className="btn" href="/calendar">← Back to Calendar</Link>
          <Link className="btn btn-neutral" href={`/meditation`}>Open Meditation Room</Link>
          <button
            className="btn btn-neutral"
            onClick={() => navigator.clipboard.writeText(window.location.href)}
          >
            Copy circle link
          </button>
        </div>
      </div>
    </div>
  );
}
