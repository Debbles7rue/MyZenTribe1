"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Friend = { id: string; full_name: string | null; avatar_url: string | null };

export default function FriendsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Friend | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const { data: pairs, error } = await supabase
        .from("friendships")
        .select("a,b")
        .or(`a.eq.${userId},b.eq.${userId}`);
      if (error) { setLoading(false); return; }
      const ids = [...new Set((pairs ?? []).map(p => (p.a === userId ? p.b : p.a)))];
      if (!ids.length) { setFriends([]); setLoading(false); return; }
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
      setFriends((profiles ?? []).map(p => ({ id: p.id, full_name: p.full_name, avatar_url: p.avatar_url })));
      setLoading(false);
    })();
  }, [userId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? friends.filter(f => (f.full_name ?? "").toLowerCase().includes(q)) : friends;
  }, [friends, query]);

  // Load note when selecting a friend
  useEffect(() => {
    if (!userId || !selected) return;
    (async () => {
      const { data } = await supabase
        .from("friend_notes")
        .select("note")
        .eq("owner_id", userId)
        .eq("friend_id", selected.id)
        .maybeSingle();
      setNote((data as any)?.note ?? "");
    })();
  }, [userId, selected]);

  async function saveNote() {
    if (!userId || !selected) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("friend_notes")
        .upsert({ owner_id: userId, friend_id: selected.id, note }, { onConflict: "owner_id,friend_id" });
      if (error) throw error;
    } catch (e: any) {
      alert(e.message || "Could not save note");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Friends</h1>
        <Link href="/messages" className="btn">Messages</Link>
      </div>

      <div className="mt-4 flex gap-2">
        <input className="input" placeholder="Search friends…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {loading ? (
        <div className="muted mt-4">Loading…</div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {filtered.map(f => (
            <button key={f.id} className="card p-3 text-left hover:bg-zinc-50" onClick={() => setSelected(f)}>
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={(f.avatar_url || "/default-avatar.png") + "?t=1"} alt="" width={40} height={40} style={{ borderRadius: 9999, objectFit: "cover" }} />
                <div className="flex-1">
                  <div className="font-medium">{f.full_name || "Member"}</div>
                  <div className="muted text-xs">{f.id}</div>
                </div>
                <Link className="btn" href={`/messages?to=${f.id}`} onClick={(e) => e.stopPropagation()}>Message</Link>
              </div>
            </button>
          ))}
          {!filtered.length && <div className="muted">No friends found.</div>}
        </div>
      )}

      {selected && (
        <div className="mt-6 card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Private note about {selected.full_name || "this friend"}</h2>
            <button className="btn" onClick={() => setSelected(null)}>Close</button>
          </div>
          <p className="muted text-xs mt-1">Only you can see this.</p>
          <textarea className="input mt-3" rows={5} value={note} onChange={(e) => setNote(e.target.value)} placeholder="How you met, impressions, reminders…" />
          <div className="text-right mt-3">
            <button className="btn btn-brand" onClick={saveNote} disabled={saving}>{saving ? "Saving…" : "Save note"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
