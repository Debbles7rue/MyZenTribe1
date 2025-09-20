// app/messages/MessagesClient.tsx
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

  // 1) Hydrate Supabase client + session (client-only)
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

  async function fetchFriendIds(uid: string): Promise<string[]> {
    const supabase = supabaseRef.current;
    
    // FIXED: friends_view is already filtered to current user server-side
    // Just select friend_id, no need for user_id filter
    const { data: fv, error: fvErr } = await supabase
      .from("friends_view")
      .select("friend_id");

    if (!fvErr && fv && fv.length > 0) {
      console.log("Friends from friends_view:", fv.length);
      return fv.map((r: any) => r.friend_id);
    }

    // Fallback to friendships table if friends_view doesn't work
    console.log("Falling back to friendships table");
    const { data: pairs, error: pairsErr } = await supabase
      .from("friendships")
      .select("user_id, friend_id")
      .or(`user_id.eq.${uid},friend_id.eq.${uid}`);
    
    if (pairsErr) {
      console.error("Error fetching friendships:", pairsErr);
      return [];
    }
    
    // Extract friend IDs (get the other person's ID from each friendship)
    const friendIds = new Set<string>();
    (pairs ?? []).forEach((p: any) => {
      if (p.user_id === uid) {
        friendIds.add(p.friend_id);
      } else {
        friendIds.add(p.user_id);
      }
    });
    
    console.log("Friends from friendships table:", friendIds.size);
    return Array.from(friendIds);
  }

  // 2) Load friends after auth
  useEffect(() => {
    if (!ready || !userId || !supabaseRef.current) return;
    (async () => {
      try {
        const supabase = supabaseRef.current;

        const ids = await fetchFriendIds(userId);
        if (!ids.length) {
          console.log("No friends found");
          setFriends([]);
          return;
        }
        
        // Get profiles for all friend IDs
        const { data: profiles, error: profilesErr } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", ids);
        
        if (profilesErr) {
          console.error("Error fetching profiles:", profilesErr);
          return;
        }
          
        const fr = (profiles ?? []).map((p: any) => ({
          id: p.id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
        }));
        
        console.log("Friend profiles loaded:", fr.length);
        setFriends(fr);

        // Handle URL param or auto-select first friend
        const qto = search.get("to");
        if (qto && fr.find((f: any) => f.id === qto)) {
          setTo(qto);
        } else if (!to && fr.length) {
          setTo(fr[0].id);
        }
      } catch (err) {
        console.error("Error loading friends:", err);
        setFriends([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId]);

  async function loadThread(uid: string, friendId: string) {
    if (!supabaseRef.current) return;
    const supabase = supabaseRef.current;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${uid},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${uid})`
      )
      .order("created_at", { ascending: true });
    setMsgs((data ?? []) as Msg[]);
    setTimeout(() => listRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }), 50);
  }

  // 3) Load thread on selection
  useEffect(() => {
    if (userId && to) loadThread(userId, to);
  }, [userId, to]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send() {
    if (!userId || !to || !body.trim() || !supabaseRef.current) return;
    const supabase = supabaseRef.current;
    const text = body.trim();
    setBody("");
    const { error } = await supabase
      .from("messages")
      .insert({ sender_id: userId, recipient_id: to, body: text });
    if (error) {
      alert(error.message);
      setBody(text);
      return;
    }
    await loadThread(userId, to);
  }

  const active = useMemo(
    () => friends.find((f) => f.id === to) || null,
    [friends, to]
  );

  // Helpers: group messages by day & format times
  function sameDate(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  
  function dayLabel(d: Date) {
    const today = new Date();
    const yest = new Date(); 
    yest.setDate(today.getDate() - 1);
    if (sameDate(d, today)) return "Today";
    if (sameDate(d, yest)) return "Yesterday";
    return d.toLocaleDateString(undefined, { 
      month: "short", 
      day: "numeric", 
      year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined 
    });
  }
  
  function timeLabel(d: Date) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  if (!ready) {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          Loading...
        </div>
      </div>
    );
  }
  
  if (!userId) {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="card p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
          <p className="text-gray-600 mb-4">Please sign in to access your messages</p>
          <a className="btn btn-brand inline-block" href="/login">
            Sign in to use Messages
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
        Messages
      </h1>

      <div className="mt-4 grid gap-3 sm:grid-cols-[280px_1fr]">
        {/* Friends list - Enhanced styling */}
        <div className="card p-4 h-fit">
          <div className="font-semibold mb-3 text-gray-700">Friends</div>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {friends.length > 0 ? (
              friends.map((f) => (
                <button
                  key={f.id}
                  className={`
                    w-full text-left px-3 py-2.5 rounded-lg transition-all
                    flex items-center gap-2
                    ${to === f.id 
                      ? "bg-purple-100 text-purple-700 shadow-sm" 
                      : "hover:bg-gray-50"
                    }
                  `}
                  onClick={() => setTo(f.id)}
                >
                  {/* Avatar */}
                  {f.avatar_url ? (
                    <img 
                      src={f.avatar_url} 
                      alt="" 
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                      {(f.full_name || "M")[0].toUpperCase()}
                    </div>
                  )}
                  <span className="truncate flex-1">
                    {f.full_name || "Member"}
                  </span>
                </button>
              ))
            ) : (
              <div className="text-gray-500 p-3 text-center">
                <div className="mb-2">👥</div>
                <div className="text-sm">You have no friends yet.</div>
                <a href="/friends" className="text-purple-600 hover:underline text-sm mt-1 inline-block">
                  Find friends →
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Chat Thread - Enhanced styling */}
        <div className="card p-4 flex flex-col h-[600px]">
          {active ? (
            <>
              {/* Chat header */}
              <div className="pb-3 mb-3 border-b flex items-center gap-2">
                {active.avatar_url ? (
                  <img 
                    src={active.avatar_url} 
                    alt="" 
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {(active.full_name || "M")[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-semibold text-gray-800">
                    {active.full_name || "Friend"}
                  </div>
                  <div className="text-xs text-gray-500">Active conversation</div>
                </div>
              </div>

              {/* Messages area */}
              <div
                ref={listRef}
                className="flex-1 overflow-auto p-3 rounded-lg"
                style={{ 
                  background: "linear-gradient(180deg, #faf9ff 0%, #fff9f5 100%)",
                  minHeight: "300px"
                }}
              >
                {(() => {
                  let lastDay: string | null = null;
                  return msgs.map((m) => {
                    const dt = new Date(m.created_at);
                    const dLabel = dayLabel(dt);
                    const isMine = m.sender_id === userId;
                    
                    const bubble = (
                      <div
                        key={m.id}
                        className={`
                          max-w-[70%] inline-block px-4 py-2.5 rounded-2xl shadow-sm
                          ${isMine ? "text-white" : "text-gray-800"}
                        `}
                        style={{
                          background: isMine 
                            ? "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" 
                            : "#f3f4f6",
                          border: isMine ? "none" : "1px solid rgba(0,0,0,.06)",
                        }}
                      >
                        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {m.body}
                        </div>
                        <div className={`text-[11px] mt-1 ${isMine ? "opacity-80" : "text-gray-500"}`}>
                          {timeLabel(dt)}
                        </div>
                      </div>
                    );

                    const row = (
                      <div key={`${m.id}-row`} className={`my-2 flex ${isMine ? "justify-end" : "justify-start"}`}>
                        {bubble}
                      </div>
                    );

                    if (lastDay !== dLabel) {
                      lastDay = dLabel;
                      return (
                        <div key={`${m.id}-group`}>
                          <div className="text-center my-3">
                            <span className="text-xs px-3 py-1 rounded-full bg-white/80 text-gray-600 shadow-sm">
                              {dLabel}
                            </span>
                          </div>
                          {row}
                        </div>
                      );
                    }
                    return row;
                  });
                })()}
                
                {msgs.length === 0 && (
                  <div className="text-gray-500 text-center mt-8">
                    <div className="mb-2 text-3xl">💬</div>
                    <div>No messages yet.</div>
                    <div className="text-sm mt-1">Send a message to start the conversation!</div>
                  </div>
                )}
              </div>

              {/* Message input */}
              <div className="mt-3 flex gap-2">
                <input
                  className="input flex-1 px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Type a message..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  aria-label="Type a message"
                />
                <button 
                  className="btn bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white px-6 py-2.5 rounded-lg font-medium transition-all hover:shadow-lg"
                  onClick={send}
                  disabled={!body.trim()}
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="text-5xl mb-3">💬</div>
                <div className="text-lg font-medium">Select a friend to start chatting</div>
                {friends.length === 0 && (
                  <a href="/friends" className="text-purple-600 hover:underline text-sm mt-2 inline-block">
                    Find friends to message →
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
