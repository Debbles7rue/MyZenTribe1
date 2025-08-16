"use client";

import SiteHeader from "@/components/SiteHeader";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";

type Entry = {
  id: string;
  content: string;
  created_at: string; // ISO
  entry_date: string; // YYYY-MM-DD
};

export default function GratitudePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [todayList, setTodayList] = useState<Entry[]>([]);
  const [recent, setRecent] = useState<Entry[]>([]);
  const [draft, setDraft] = useState("");

  const today = useMemo(() => {
    const d = new Date();
    // Use local date so the “3 per day” concept matches the user’s day
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Load recent entries (last 30)
        const { data, error } = await supabase
          .from("gratitude_entries")
          .select("id, content, created_at, entry_date")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(30);
        if (error) throw error;

        const all = (data ?? []) as Entry[];
        setRecent(all.filter(e => e.entry_date !== today));
        setTodayList(all.filter(e => e.entry_date === today));
      } catch (e: any) {
        setError(e?.message || "Could not load your entries.");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, today]);

  const todayCount = todayList.length;
  const canAdd = todayCount < 3 && !!userId && !saving;

  async function addEntry() {
    const content = draft.trim();
    if (!content || !userId) return;
    if (todayList.length >= 3) {
      setError("You’ve reached 3 entries for today. Great job!");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("gratitude_entries")
        .insert([{ user_id: userId, content, entry_date: today }])
        .select("id, content, created_at, entry_date")
        .single();
      if (error) throw error;
      setTodayList([data as Entry, ...todayList]);
      setDraft("");
    } catch (e: any) {
      setError(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function removeEntry(id: string) {
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase
        .from("gratitude_entries")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
      setTodayList(todayList.filter(e => e.id !== id));
      setRecent(recent.filter(e => e.id !== id));
    } catch (e: any) {
      setError(e?.message || "Delete failed.");
    } finally {
      setSaving(false);
    }
  }

  // Group recent by day
  const grouped = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of recent) {
      if (!map.has(e.entry_date)) map.set(e.entry_date, []);
      map.get(e.entry_date)!.push(e);
    }
    return Array.from(map.entries()); // [ [date, entries], ... ]
  }, [recent]);

  return (
    <div className="page-wrap">
      <SiteHeader />
      <div className="page">
        <div className="container-app mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <h1 className="page-title">Gratitude Journal</h1>
          <p className="muted" style={{ marginTop: 4, marginBottom: 12 }}>
            Aim for three gratitudes a day. Your newest entries appear first.
          </p>

          {/* Today composer */}
          <section className="card p-3">
            <div className="section-row" style={{ marginBottom: 8 }}>
              <h2 className="section-title" style={{ margin: 0 }}>Today</h2>
              <div className="muted">Entries today: {todayCount}/3</div>
            </div>

            <textarea
              className="input"
              rows={4}
              placeholder="Today I'm grateful for…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="right" style={{ marginTop: 10 }}>
              <button className="btn btn-brand" onClick={addEntry} disabled={!canAdd || !draft.trim()}>
                {saving ? "Saving…" : "Add entry"}
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" style={{ marginTop: 10 }}>
                {error}
              </div>
            )}

            {/* Today list */}
            {todayList.length > 0 && (
              <div className="stack" style={{ marginTop: 12 }}>
                {todayList.map((e) => (
                  <div key={e.id} className="rounded-xl border px-3 py-2" style={{ borderColor: "#e5e7eb" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div style={{ whiteSpace: "pre-wrap" }}>{e.content}</div>
                      <button className="btn btn-neutral" onClick={() => removeEntry(e.id)} disabled={saving}>
                        Delete
                      </button>
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      {new Date(e.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent days */}
          {grouped.length > 0 && (
            <section className="card p-3" style={{ marginTop: 12 }}>
              <h2 className="section-title">Recent</h2>
              <div className="stack" style={{ marginTop: 8 }}>
                {grouped.map(([date, items]) => (
                  <div key={date} className="stack">
                    <div className="muted" style={{ fontWeight: 600 }}>{new Date(date + "T00:00:00").toLocaleDateString()}</div>
                    {items.map((e) => (
                      <div key={e.id} className="rounded-xl border px-3 py-2" style={{ borderColor: "#e5e7eb" }}>
                        <div className="flex items-start justify-between gap-3">
                          <div style={{ whiteSpace: "pre-wrap" }}>{e.content}</div>
                          <button className="btn btn-neutral" onClick={() => removeEntry(e.id)} disabled={saving}>
                            Delete
                          </button>
                        </div>
                        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                          {new Date(e.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          )}

          {loading && <p className="muted mt-3">Loading…</p>}
        </div>
      </div>
    </div>
  );
}
