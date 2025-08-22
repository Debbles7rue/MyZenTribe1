"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// Types
type LoungeMsg = {
  id: number;
  user_id: string | null;
  display_name: string;
  body: string;
  created_at: string;
};

// Small helper to format times nicely
function timeAgo(d: string) {
  const t = new Date(d).getTime();
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d2 = Math.floor(h / 24);
  return `${d2}d`;
}

export default function LoungePage() {
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [hereCount, setHereCount] = useState(0);
  const [msgs, setMsgs] = useState<LoungeMsg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Load user
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data?.user ?? null;
      if (!u) { setMe(null); return; }
      const name =
        (u.user_metadata?.name as string) ||
        (u.user_metadata?.full_name as string) ||
        (u.email as string) ||
        "Friend";
      setMe({ id: u.id, name });
    })();
  }, []);

  // Load last 200 messages
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("mz_lounge_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!alive) return;
      if (error) {
        console.error(error);
      } else {
        setMsgs((data ?? []).reverse());
        // scroll to bottom after first paint
        setTimeout(() => scrollerRef.current?.scrollTo({ top: 9e6 }), 50);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Realtime: new messages + presence count
  useEffect(() => {
    const ch = supabase.channel("mz:lounge", {
      config: { presence: { key: me?.id || "anon" } },
    });

    ch.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "mz_lounge_messages" },
      (payload) => {
        setMsgs((cur) => [...cur, payload.new as LoungeMsg]);
        // auto scroll if near bottom
        const el = scrollerRef.current;
        if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
          setTimeout(() => el.scrollTo({ top: 9e6, behavior: "smooth" }), 0);
        }
      }
    );

    // presence
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      // Count unique presences
      let n = 0;
      Object.values(state).forEach((arr) => (n += (arr as any[]).length));
      setHereCount(n);
    });

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        // announce presence
        await ch.track({ id: me?.id || "anon", name: me?.name || "Guest" });
      }
    });

    return () => { supabase.removeChannel(ch); };
  }, [me?.id, me?.name]);

  async function send() {
    if (!me) {
      alert("Please log in to post.");
      return;
    }
    const body = text.trim();
    if (!body) return;
    setSending(true);
    const { error } = await supabase
      .from("mz_lounge_messages")
      .insert([{ user_id: me.id, display_name: me.name, body }]);
    setSending(false);
    if (error) {
      alert(error.message);
      return;
    }
    setText("");
  }

  return (
    <div className="page-wrap lounge-root">
      <div className="page">
        <div className="container-app">
          <header className="lz-header">
            <div>
              <h1 className="page-title">The Lounge</h1>
              <p className="lz-sub">A quiet public space to connect before or after meditating.</p>
            </div>
            <div className="lz-actions">
              <div className="lz-presence">● {hereCount} here now</div>
              <Link href="/meditation" className="lz-btn">← Back to Meditation</Link>
            </div>
          </header>

          <section className="lz-card">
            <div className="lz-stream" ref={scrollerRef}>
              {msgs.map((m) => (
                <div className="lz-msg" key={m.id}>
                  <div className="lz-row">
                    <span className="lz-name">{m.display_name}</span>
                    <span className="lz-time">{timeAgo(m.created_at)}</span>
                  </div>
                  <div className="lz-body">{m.body}</div>
                </div>
              ))}
              {msgs.length === 0 && (
                <div className="lz-empty">No messages yet. Say hello 👋</div>
              )}
            </div>

            <div className="lz-compose">
              <input
                className="lz-input"
                placeholder={me ? "Write a short note…" : "Sign in to post…"}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                disabled={!me || sending}
                maxLength={500}
              />
              <button className="lz-send" onClick={send} disabled={!me || sending}>
                Send
              </button>
            </div>

            <p className="lz-note">
              Please keep messages brief and respectful. Longer sharing is perfect for communities or DMs.
            </p>
          </section>
        </div>
      </div>

      <style jsx global>{`
        :root {
          --sand-2: #f3ebdd;
          --sand-3: #e7dbc3;
          --ink: #2a241c;
          --gold: #c9b27f;
        }
        .lounge-root { position: relative; z-index: 999; }
        body {
          background: radial-gradient(1200px 500px at 50% -200px, #efe7da, #e5dccb 60%, #ddd1bd 100%);
        }
        .lz-header {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
        }
        .lz-sub { opacity: .75; margin-top: 4px; }
        .lz-actions { display: flex; gap: 10px; align-items: center; }
        .lz-presence { font-size: 13px; opacity: .8; }
        .lz-btn {
          border: 1px solid #dfd6c4;
          background: linear-gradient(#fff, #f5efe6);
          border-radius: 10px; padding: 8px 12px; font-size: 14px; color: var(--ink); text-decoration: none;
        }
        .lz-card {
          margin-top: 12px; background: #fff; border: 1px solid var(--sand-3);
          border-radius: 16px; overflow: hidden; box-shadow: 0 14px 40px rgba(0,0,0,.08);
        }
        .lz-stream {
          height: min(60vh, 560px); overflow: auto; padding: 16px; background: #fffdf8;
        }
        .lz-msg { padding: 10px 12px; border-radius: 12px; border: 1px solid #efe5cf; background: #fff; margin-bottom: 10px; }
        .lz-row { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
        .lz-name { font-weight: 700; }
        .lz-time { font-size: 12px; opacity: .6; }
        .lz-body { white-space: pre-wrap; line-height: 1.35; }
        .lz-empty { text-align: center; opacity: .6; padding: 30px 0; }
        .lz-compose {
          display: grid; grid-template-columns: 1fr auto; gap: 8px; padding: 12px; border-top: 1px solid var(--sand-3); background: #fbf6ec;
        }
        .lz-input {
          border: 1px solid #e6dcc6; border-radius: 12px; padding: 10px 12px; font-size: 14px; background: #fff;
        }
        .lz-send {
          border: 1px solid #d8c49b; background: linear-gradient(#ffe9be, #f7dca6);
          border-radius: 12px; padding: 10px 16px; font-weight: 700; color: #221b0f; cursor: pointer;
        }
        .lz-note { font-size: 12px; opacity: .6; padding: 8px 12px; }
      `}</style>
    </div>
  );
}
