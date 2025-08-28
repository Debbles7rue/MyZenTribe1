"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type Friend = { id: string; full_name: string | null; avatar_url: string | null };
type Msg = { id: number; sender_id: string; recipient_id: string; body: string; created_at: string };

export default function MessagesClient() {
  const [userId, setUserId] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [to, setTo] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [ready, setReady] = useState(false);

  const search = useSearchParams();
  const listRef = useRef<HTMLDivElement | null>(null);
  const supabaseRef = useRef<any>(null); // holds the imported supabase client

  useEffect(() => {
    let unsub: any;
    (async () => {
      const mod = await import("@/lib/supabaseClient");
      supabaseRef.current = mod.supabase;
      const { data } = await supabaseRef.current.auth.getSession();
      setUserId(data.session?.user?.id ?? null);
      setReady(true);
      unsub = supabaseRef.current.auth
        .onAuthStateChange((_e: any, s: any) => setUserId(s?.user?.id ?? null))
        .data.subscription;
    })();
    return () => unsub?.unsubscribe?.();
  }, []);

  // Helper: robustly fetch friend IDs using a view if available
  async function fetchFriendIds(uid: string): Promise<string[]> {
    const supabase = supabaseRef.current;

    // 1) Try friends_view (friend_id column)
    {
      const { data, error } = await supabase.from("friends_view").select("friend_id");
      if (!error && Array.isArray(data)) {
        return [...new Set((data as any[]).map(r => r.friend_id).filter(Boolean))];
      }
    }

    // 2) Fallback to friendships (a,b)
    {
      const { data, error } = await supabase.from("friendships").select("a,b").or(`a.eq.${uid},b.eq.${uid}`);
      if (!error && Array.isArray(data)) {
        return [...new Set((data as any[]).map(p => (p.a === uid ? p.b : p.a)).filter(Boolean))];
      }
    }

    // 3) Last resort: friendships (user_id, friend_id)
    {
      const { data, error } = await supabase.from("friendships").select("user_id,friend_id").or(`user_id.eq.${uid},friend_id.eq.${uid}`);
      if (!error && Array.isArray(data)) {
        return [...new Set((data as any[]).map(p => (p.user_id === uid ? p.friend_id : p.user_id)).filter(Boolean))];
      }
    }

    return [];
  }

  // Load friends after auth
  useEffect(() => {
    if (!ready || !userId || !supabaseRef.current) return;
    (async () => {
      const supabase = supabaseRef.current;

      const ids = await fetchFriendIds(userId);
      if (!ids.length) {
        setFriends([]);
        return;
      }

      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
      const fr = (profiles ?? []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
      }));
      setFriends(fr);

      const qto = search.get("to");
      if (qto && fr.find((f: any) => f.id === qto)) setTo(qto);
      else if (!to && fr.length) setTo(fr[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId]);

  async function loadThread(uid: string, friendId: string) {
    if (!supabaseRef.current) return;
    const supabase = supabaseRef.current;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${uid},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${uid})`)
      .order("created_at", { ascending: true });
    setMsgs((data ?? []) as Msg[]);
    setTimeout(() => listRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }), 50);
  }

  useEffect(() => {
    if (userId && to) loadThread(userId, to);
  }, [userId, to]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send() {
    if (!userId || !to || !body.trim() || !supabaseRef.current) return;
    const supabase = supabaseRef.current;
    const text = body.trim();
    setBody("");
    const { error } = await supabase.from("messages").insert({ sender_id: userId, recipient_id: to, body: text });
    if (error) {
      alert(error.message);
      setBody(text);
      return;
    }
    await loadThread(userId, to);
  }

  const active = useMemo(() => friends.find((f) => f.id === to) || null, [friends, to]);

  if (!ready) return <div className="max-w-5xl mx-auto p-4 sm:p-6">Loading…</div>;
  if (!userId)
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <a className="btn btn-brand" href="/login">
          Sign in to use Messages
        </a>
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <h1 className="text-xl font-semibold">Messages</h1>

      <div className="mt-4 grid gap-3 sm:grid-cols-[220px_1fr]">
        <div className="card p-3">
          <div className="font-medium mb-2">Friends</div>
          <div className="space-y-1">
            {friends.map((f) => (
              <button
                key={f.id}
                className={`w-full text-left px-2 py-1 rounded ${to === f.id ? "bg-zinc-100" : "hover:bg-zinc-50"}`}
                onClick={() => setTo(f.id)}
              >
                {f.full_name || "Member"}
              </button>
            ))}
            {!friends.length && <div className="muted">You have no friends yet.</div>}
          </div>
        </div>

        <div className="card p-3 flex flex-col">
          {active ? (
            <>
              <div className="font-medium">Chat with {active.full_name || "Friend"}</div>
              <div ref={listRef} className="mt-3 flex-1 overflow-auto border rounded p-2" style={{ minHeight: 240 }}>
                {msgs.map((m) => (
                  <div key={m.id} className={`my-1 ${m.sender_id === userId ? "text-right" : "text-left"}`}>
                    <span className={`inline-block px-2 py-1 rounded ${m.sender_id === userId ? "bg-violet-100" : "bg-zinc-100"}`}>
                      {m.body}
                    </span>
                    <div className="muted text-[11px]">{new Date(m.created_at).toLocaleString()}</div>
                  </div>
                ))}
                {msgs.length === 0 && <div className="muted">No messages yet.</div>}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Type a message…"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") send();
                  }}
                />
                <button className="btn btn-brand" onClick={send}>
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="muted">Select a friend to start chatting.</div>
          )}
        </div>
      </div>
    </div>
  );
}
