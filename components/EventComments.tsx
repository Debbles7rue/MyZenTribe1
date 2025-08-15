"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Comment = {
  id: string;
  event_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export default function EventComments({ eventId }: { eventId: string }) {
  const [me, setMe] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [items, setItems] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("event_comments")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (!error && data) setItems(data as any);
    setLoading(false);
  };

  useEffect(() => {
    if (!eventId) return;
    load();

    const ch = supabase
      .channel("event-comments-" + eventId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_comments", filter: `event_id=eq.${eventId}` },
        () => load()
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [eventId]);

  const post = async () => {
    if (!me) return alert("Please sign in.");
    if (!text.trim()) return;
    const { error } = await supabase.from("event_comments").insert({
      event_id: eventId,
      user_id: me,
      body: text.trim(),
    });
    if (error) return alert(error.message);
    setText("");
  };

  return (
    <div className="card p-3">
      <h3 className="section-title">Comments</h3>
      {loading ? <div className="muted">Loading…</div> : (
        <div className="stack" style={{ maxHeight: 240, overflow: "auto" }}>
          {items.map((c) => (
            <div key={c.id} className="p-2 rounded-lg border bg-white">
              <div className="text-sm">{c.body}</div>
              <div className="text-xs muted">{new Date(c.created_at).toLocaleString()}</div>
            </div>
          ))}
          {!items.length && <div className="muted">No comments yet.</div>}
        </div>
      )}

      <div className="section-row" style={{ marginTop: 8 }}>
        <input
          className="input"
          placeholder="Write a comment…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn btn-brand" onClick={post}>Post</button>
      </div>
    </div>
  );
}
