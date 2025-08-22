"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type LoungeMsg = {
  id: number;
  user_id: string | null;
  display_name: string;
  body: string;
  created_at: string;
};

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
  const [userLoaded, setUserLoaded] = useState(false);
  const [hereCount, setHereCount] = useState(0);
  const [msgs, setMsgs] = useState<LoungeMsg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [postAnon, setPostAnon] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Load user once on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data?.user ?? null;
      if (u) {
        const name =
          (u.user_metadata?.name as string) ||
          (u.user_metadata?.full_name as string) ||
          (u.email as string) ||
          "Friend";
        setMe({ id: u.id, name });
      } else {
        setMe(null);
      }
      setUserLoaded(true);
    })();
  }, []);

  // Load last 200 messages (only if logged in)
  useEffect(() => {
    if (!me) return;
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("mz_lounge_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!alive) return;
      if (!error) {
        setMsgs((data ?? []).reverse());
        setTimeout(() => scrollerRef.current?.scrollTo({ top: 9e6 }), 50);
      } else {
        console.error(error);
      }
    })();
    return () => { alive = false; };
  }, [me]);

  // Realtime: subscribe only if logged in
  useEffect(() => {
    if (!me) return;
    const ch = supabase.channel("mz:lounge", {
      config: { presence: { key: me.id } },
    });

    ch.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "mz_lounge_messages" },
      (payload) => {
        setMsgs((cur) => [...cur, payload.new as LoungeMsg]);
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

    return () => { supabase.removeChannel(ch); };
  }, [me]);

  async function send() {
    const body = text.trim();
    if (!me || !body) return;

    const display_name = postAnon ? "Anonymous" : me.name;
    const user_id = postAnon ? null : me.id;

    setSending(true);
    const { error } = await supabase
      .from("mz_lounge_messages")
      .insert([{ user_id, display_name, body }]);
    setSending(false);

    if (error) {
      alert(error.message);
      return;
    }
    setText("");
  }

  async function signIn(provider: "google" | "github") {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/meditation/lounge` },
    });
  }
  async function signOut() {
    await supabase.auth.signOut();
    location.reload();
  }

  // Gate: show sign-in card when user is not logged in
  if (userLoaded && !me) {
    return (
      <main className="wrap">
        <header className="head">
          <h1 className="title">The Lounge</h1>
          <Link href="/meditation" className="btn">← Back to Meditation</Link>
        </header>

        <section className="card">
          <h2>Sign in to enter</h2>
          <p className="muted">For safety and warmth, the Lounge is for signed-in members only.</p>
          <div className="row">
            <button className="btn" onClick={() => signIn("google")}>Continue with Google</button>
            <button className="btn" onClick={() => signIn("github")}>Continue with GitHub</button>
          </div>
        </section>

        <style jsx>{signinCss}</style>
      </main>
    );
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
              <button className="lz-btn" onClick={signOut}>Sign out</button>
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
                placeholder={postAnon ? "Posting anonymously…" : "Write a short note…"}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                disabled={sending}
                maxLength={500}
              />
              <label className="lz-anon">
                <input
                  type="checkbox"
                  checked={postAnon}
                  onChange={(e) => setPostAnon(e.target.checked)}
                />
                <span>Post anonymously</span>
              </label>
              <button className="lz-send" onClick={send} disabled={sending}>
                Send
              </button>
            </div>

            <p className="lz-note">
              Please keep messages brief and respectful. Longer sharing is perfect for communities or DMs.
            </p>
          </section>
        </div>
      </div>

      <style jsx global>{globalCss}</style>
    </div>
  );
}

const signinCss = `
  .wrap { max-width: 900px; margin:0 auto; padding:24px; }
  .head { display:flex; align-items:center; justify-content:space-between; }
  .title { font-size:28px; }
  .btn {
    border:1px solid #dfd6c4; background:linear-gradient(#fff,#f5efe6);
    border-radius:10px; padding:8px 12px; text-decoration:none; color:#2a241c;
  }
  .card { background:#faf7f1; border:1px solid #e7e0d2; border-radius:16px; padding:16px; margin-top:16px; }
  .row { display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
  .muted { opacity:.72; }
`;

const globalCss = `
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
  .lz-header { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .lz-sub { opacity:.75; margin-top:4px; }
  .lz-actions { display:flex; gap:10px; align-items:center; }
  .lz-presence { font-size:13px; opacity:.8; }
  .lz-btn {
    border:1px solid #dfd6c4; background:linear-gradient(#fff,#f5efe6);
    border-radius:10px; padding:8px 12px; font-size:14px; color:var(--ink); text-decoration:none;
  }
  .lz-card {
    margin-top:12px; background:#fff; border:1px solid var(--sand-3);
    border-radius:16px; overflow:hidden; box-shadow:0 14px 40px rgba(0,0,0,.08);
  }
  .lz-stream { height:min(60vh,560px); overflow:auto; padding:16px; background:#fffdf8; }
  .lz-msg { padding:10px 12px; border-radius:12px; border:1px solid #efe5cf; background:#fff; margin-bottom:10px; }
  .lz-row { display:flex; justify-content:space-between; gap:10px; margin-bottom:6px; }
  .lz-name { font-weight:700; }
  .lz-time { font-size:12px; opacity:.6; }
  .lz-body { white-space:pre-wrap; line-height:1.35; }
  .lz-empty { text-align:center; opacity:.6; padding:30px 0; }
  .lz-compose {
    display:grid; grid-template-columns: 1fr auto auto;
    gap:8px; padding:12px; border-top:1px solid var(--sand-3); background:#fbf6ec;
  }
  .lz-input { border:1px solid #e6dcc6; border-radius:12px; padding:10px 12px; font-size:14px; background:#fff; }
  .lz-anon { display:inline-flex; align-items:center; gap:6px; font-size:13px; opacity:.85; user-select:none; }
  .lz-send {
    border:1px solid #d8c49b; background:linear-gradient(#ffe9be,#f7dca6);
    border-radius:12px; padding:10px 16px; font-weight:700; color:#221b0f; cursor:pointer;
  }
  .lz-note { font-size:12px; opacity:.6; padding:8px 12px; }
  @media (max-width: 640px) { .lz-compose { grid-template-columns:1fr 1fr auto; } }
`;
