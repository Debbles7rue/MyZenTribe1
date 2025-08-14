"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function GratitudePanel({ userId }: { userId: string | null }) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<{id:string; body:string; created_at:string}[]>([]);
  const [saving, setSaving] = useState(false);

  async function list() {
    if (!userId) return setItems([]);
    const { data } = await supabase
      .from("gratitude_entries")
      .select("id, body, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    setItems(data ?? []);
  }

  async function add() {
    if (!userId || !text.trim()) return;
    setSaving(true);
    await supabase.from("gratitude_entries").insert({ user_id: userId, body: text.trim() });
    setText("");
    setSaving(false);
    await list();
  }

  useEffect(() => { list(); }, [userId]);

  return (
    <aside className="card p-3">
      <h2 className="section-title">Gratitude Journal</h2>
      <textarea
        className="input"
        rows={4}
        placeholder="Today I'm grateful for…"
        value={text}
        onChange={(e)=>setText(e.target.value)}
      />
      <div className="right" style={{ marginTop: 8 }}>
        <button className="btn btn-brand" onClick={add} disabled={saving || !text.trim()}>
          {saving ? "Saving…" : "Add entry"}
        </button>
      </div>

      <div className="stack" style={{ marginTop: 12 }}>
        {items.map(i => (
          <div key={i.id} className="card p-3">
            <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
              {new Date(i.created_at).toLocaleString()}
            </div>
            <div>{i.body}</div>
          </div>
        ))}
        {!items.length && <p className="muted">No entries yet.</p>}
      </div>
    </aside>
  );
}
