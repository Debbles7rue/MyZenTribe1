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
  user_name?: string; // Added to store username
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
  const [userNames, setUserNames] = useState<{ [key: string]: string }>({});
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

  // Helper function to fetch usernames
  const fetchUserNames = async (userIds: string[]) => {
    const uniqueIds = [...new Set(userIds)].filter(id => !userNames[id]);
    if (uniqueIds.length === 0) return;

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", uniqueIds);

    if (profiles) {
      const newNames: { [key: string]: string } = {};
      profiles.forEach(p => {
        newNames[p.id] = p.full_name || "Anonymous";
      });
      setUserNames(prev => ({ ...prev, ...newNames }));
    }
  };

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
      
      if (data) {
        setMsgs(data || []);
        // Fetch usernames for all messages
        await fetchUserNames(data.map(m => m.user_id));
      }
      
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
        async (payload) => {
          const newMsg = payload.new as Msg;
          setMsgs((cur) => [...cur, newMsg]);
          // Fetch username for new message
          await fetchUserNames([newMsg.user_id]);
          
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
  }, [evt?.start_time, evt?.end_time]);

  if (loading) return <div className="container-app py-8">Loading…</div>;

  if (!evt)
    return (
      <div className="container-app py-8">
        <h1 className="page-title">Invite not found</h1>
        <p className="muted">This invite code doesn't match any event.</p>
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
          You aren't on the attendee list for <b>{evt.title || "Meditation"}</b>.
        </p>
        <p className="muted">Ask the host to add you, then refresh this page.</p>
        <p className="mt-3">
          <Link className="link" href="/calendar">
            ← Back to calendar
          </Link>
        </p>
      </div>
    );

  return (
    <div className="container-app py-8">
      <div className="max-w-3xl mx-auto">
        {/* Event header */}
        <div className="card p-4 mb-4 bg-gradient-to-br from-purple-50 to-pink-50">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {evt.title || "Circle Chat"}
          </h1>
          {evt.description && (
            <p className="text-gray-700 mb-3">{evt.description}</p>
          )}
          <div className="text-sm text-gray-600">
            <div>📅 {when}</div>
            <div className="mt-1">
              🔗 Invite code: <code className="bg-white px-2 py-0.5 rounded">{code}</code>
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-3">Messages</h2>
          
          <div
            ref={scrollerRef}
            className="border rounded-lg bg-gray-50 p-3 mb-4 overflow-y-auto"
            style={{ height: 400 }}
          >
            {msgs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              <div className="space-y-3">
                {msgs.map((msg) => {
                  const isMe = msg.user_id === me?.id;
                  const userName = userNames[msg.user_id] || (isMe ? me.name : "Loading...");
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                          isMe
                            ? "bg-purple-600 text-white"
                            : "bg-white border border-gray-200"
                        }`}
                      >
                        {/* Username with profile link */}
                        {!isMe && (
                          <Link
                            href={`/profile/${msg.user_id}`}
                            className="text-xs font-medium text-purple-600 hover:text-purple-700 hover:underline block mb-1"
                          >
                            {userName}
                          </Link>
                        )}
                        {isMe && (
                          <div className="text-xs opacity-80 mb-1">You</div>
                        )}
                        
                        <div className={isMe ? "text-white" : "text-gray-800"}>
                          {msg.body}
                        </div>
                        
                        <div
                          className={`text-xs mt-1 ${
                            isMe ? "text-purple-200" : "text-gray-500"
                          }`}
                        >
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Type a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button
              onClick={send}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              disabled={!text.trim()}
            >
              Send
            </button>
          </div>
        </div>

        {/* Back to calendar link */}
        <div className="mt-4">
          <Link 
            href="/calendar"
            className="text-purple-600 hover:text-purple-700 hover:underline"
          >
            ← Back to calendar
          </Link>
        </div>
      </div>
    </div>
  );
}
