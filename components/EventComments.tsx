"use client";

import { useEffect, useState } from "react";
import Link from "next/link"; // Added for profile links
import { supabase } from "@/lib/supabaseClient";

type Comment = {
  id: string;
  event_id: string;
  user_id: string;
  user_name?: string; // Added to store username
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
    
    // Enhanced query to include user profile data
    const { data, error } = await supabase
      .from("event_comments")
      .select(`
        id,
        event_id,
        user_id,
        body,
        created_at,
        profiles!inner(full_name)
      `)
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      // Map the data to include user names
      const commentsWithNames = data.map((comment: any) => ({
        id: comment.id,
        event_id: comment.event_id,
        user_id: comment.user_id,
        user_name: comment.profiles?.full_name || "Anonymous",
        body: comment.body,
        created_at: comment.created_at
      }));
      setItems(commentsWithNames);
    }
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
      {loading ? (
        <div className="muted">Loading…</div>
      ) : (
        <div className="stack" style={{ maxHeight: 240, overflow: "auto" }}>
          {items.map((c) => (
            <div key={c.id} className="p-2 rounded-lg border bg-white">
              <div className="flex items-start justify-between mb-1">
                {/* Clickable username with profile link */}
                <Link 
                  href={`/profile/${c.user_id}`}
                  className="text-sm font-medium text-purple-600 hover:text-purple-700 hover:underline"
                >
                  {c.user_name || "Anonymous"}
                </Link>
                <div className="text-xs text-gray-500">
                  {new Date(c.created_at).toLocaleString()}
                </div>
              </div>
              <div className="text-sm text-gray-700">{c.body}</div>
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
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              post();
            }
          }}
        />
        <button className="btn btn-brand" onClick={post}>
          Post
        </button>
      </div>
    </div>
  );
}
