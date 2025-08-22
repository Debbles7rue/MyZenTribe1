// app/meditation/group/[eventId]/page.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function GroupLounge({ params }: { params: { eventId: string } }) {
  const { eventId } = params;
  const [msgs, setMsgs] = useState<{id:string; user:string; text:string; t:number}[]>([]);
  const [text, setText] = useState("");
  const [muted, setMuted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const ch = supabase.channel(`mz:event:${eventId}`, {
      config: { presence: { key: "me" } }
    });
    chRef.current = ch;

    ch.on("broadcast", { event: "msg" }, (payload) => {
      if (muted) return; // still receive, but ignore when muted
      const m = payload.payload as any;
      setMsgs((x) => [...x, { id: crypto.randomUUID(), user: m.user, text: m.text, t: m.t }]);
    });

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") ch.track({ at: Date.now() });
    });

    return () => { supabase.removeChannel(ch); };
  }, [eventId, muted]);

  async function send() {
    const v = text.trim();
    if (!v) return;
    const { data: me } = await supabase.auth.getUser();
    const user = me.user?.email ?? "Someone";
    chRef.current?.send({
      type: "broadcast",
      event: "msg",
      payload: { user, text: v, t: Date.now() },
    });
    setText("");
  }

  return (
    <div className="lounge">
      <header className="bar">
        <b>Group Lounge</b>
        <div className="grow" />
        <button className="btn" onClick={() => setMuted((m) => !m)}>{muted ? "Unmute" : "Mute"}</button>
        <button className="btn" onClick={() => setHidden((h) => !h)}>{hidden ? "Show chat" : "Hide chat"}</button>
        <Link className="btn" href="/meditation">Back to rooms</Link>
      </header>

      {!hidden && (
        <div className="chat">
          <div className="feed">
            {msgs.map(m => (
              <div key={m.id} className="row">
                <span className="who">{m.user}:</span> <span>{m.text}</span>
              </div>
            ))}
          </div>
          <div className="compose">
            <input value={text} onChange={(e)=>setText(e.target.value)} placeholder="Say hello…" />
            <button className="btn" onClick={send}>Send</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .lounge { max-width: 900px; margin: 24px auto; background:#fffdf8; border:1px solid #eadfca; border-radius:16px; overflow:hidden; }
        .bar { display:flex; align-items:center; gap:8px; padding:12px 14px; border-bottom:1px solid #eadfca; }
        .grow { flex:1; }
        .btn { border:1px solid #dfd6c4; background:linear-gradient(#fff,#f5efe6); border-radius:10px; padding:6px 10px; }
        .chat { display:grid; grid-template-rows: 1fr auto; height: 60vh; }
        .feed { padding:12px; overflow:auto; }
        .row { padding:4px 0; }
        .who { font-weight:600; margin-right:6px; }
        .compose { display:flex; gap:8px; padding:12px; border-top:1px solid #eadfca; }
        input { flex:1; padding:10px 12px; border:1px solid #e6dcc6; border-radius:10px; }
      `}</style>
    </div>
  );
}
