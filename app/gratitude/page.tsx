"use client";

import SiteHeader from "@/components/SiteHeader";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";

/** Types */
type Settings = {
  user_id: string;
  activated: boolean;
  recap_frequency: "weekly" | "monthly" | "yearly";
};

type Entry = {
  id: string;
  content: string;
  created_at: string; // ISO
  entry_date: string; // YYYY-MM-DD
};

export default function GratitudePage() {
  /** Auth */
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  /** UI + data */
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState<Settings | null>(null);
  const [hasCandle, setHasCandle] = useState(false);

  const [draft, setDraft] = useState("");
  const [todayList, setTodayList] = useState<Entry[]>([]);
  const [recent, setRecent] = useState<Entry[]>([]);

  const today = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  /** Load settings + entries */
  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // settings (maybeSingle)
        const { data: s, error: sErr } = await supabase
          .from("gratitude_settings")
          .select("user_id, activated, recap_frequency")
          .eq("user_id", userId)
          .maybeSingle();
        if (sErr && sErr.code !== "PGRST116") throw sErr; // table missing → we still continue
        if (s) {
          setSettings({
            user_id: s.user_id,
            activated: !!s.activated,
            recap_frequency: (s.recap_frequency || "weekly") as Settings["recap_frequency"],
          });
        } else {
          setSettings({ user_id: userId, activated: false, recap_frequency: "weekly" });
        }

        // entries
        const { data: e, error: eErr } = await supabase
          .from("gratitude_entries")
          .select("id, content, created_at, entry_date")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(100);
        if (eErr && eErr.code !== "PGRST116") throw eErr;
        const all = (e ?? []) as Entry[];
        setTodayList(all.filter((x) => x.entry_date === today));
        setRecent(all.filter((x) => x.entry_date !== today));

        // candle placeholder (quietly ignore if table missing)
        const { data: candles } = await supabase
          .from("meditation_candles")
          .select("id")
          .eq("user_id", userId)
          .limit(1);
        setHasCandle(!!candles && candles.length > 0);
      } catch (e: any) {
        setError(e?.message || "Could not load your journal.");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, today]);

  /** Activation */
  async function activateJournal() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      const payload = { user_id: userId, activated: true, recap_frequency: "weekly" };
      const { error: upErr } = await supabase
        .from("gratitude_settings")
        .upsert(payload, { onConflict: "user_id" });
      if (upErr) throw upErr;
      setSettings({ user_id: userId, activated: true, recap_frequency: "weekly" });
    } catch (e: any) {
      setError(e?.message || "Activation failed.");
    } finally {
      setSaving(false);
    }
  }

  /** Recap frequency */
  async function saveRecapFrequency(freq: Settings["recap_frequency"]) {
    if (!userId || !settings) return;
    setSaving(true);
    setError(null);
    try {
      const { error: upErr } = await supabase
        .from("gratitude_settings")
        .upsert({ user_id: userId, activated: true, recap_frequency: freq }, { onConflict: "user_id" });
      if (upErr) throw upErr;
      setSettings({ ...settings, recap_frequency: freq });
    } catch (e: any) {
      setError(e?.message || "Could not update recap preference.");
    } finally {
      setSaving(false);
    }
  }

  /** Create an entry (max 3 per day) */
  const todayCount = todayList.length;
  const canAdd = todayCount < 3 && !!userId && !saving;

  async function addEntry() {
    const content = draft.trim();
    if (!content || !userId || !settings?.activated) return;
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
      setTodayList(todayList.filter((e) => e.id !== id));
      setRecent(recent.filter((e) => e.id !== id));
    } catch (e: any) {
      setError(e?.message || "Delete failed.");
    } finally {
      setSaving(false);
    }
  }

  /** Recap generation (simple, readable summary) */
  function summarizeText(t: string): string {
    const clean = t.replace(/\s+/g, " ").trim();
    if (clean.length <= 40) return clean;              // single word/short → keep
    const sentences = clean.split(/(?<=[.!?])\s+/);    // very simple split
    const firstTwo = sentences.slice(0, 2).join(" ");
    return firstTwo.length > 180 ? firstTwo.slice(0, 180) + "…" : firstTwo;
  }

  function rangeStart(freq: Settings["recap_frequency"]): Date {
    const d = new Date();
    if (freq === "weekly")  d.setDate(d.getDate() - 7);
    if (freq === "monthly") d.setMonth(d.getMonth() - 1);
    if (freq === "yearly")  d.setFullYear(d.getFullYear() - 1);
    return d;
  }

  const recapItems = useMemo(() => {
    if (!settings?.activated) return [];
    const start = rangeStart(settings.recap_frequency).getTime();
    const all = [...todayList, ...recent];
    const filtered = all.filter((e) => new Date(e.created_at).getTime() >= start);
    return filtered.map((e) => ({ id: e.id, summary: summarizeText(e.content), when: new Date(e.created_at) }));
  }, [settings?.activated, settings?.recap_frequency, todayList, recent]);

  /** UI helpers */
  const cover = (
    <section
      className="card p-3"
      style={{
        border: "1px solid rgba(196,181,253,.7)",
        background: "linear-gradient(135deg, #ede9fe 0%, #f5f3ff 45%, #ffffff 100%)",
        borderRadius: 20,
        overflow: "hidden",
      }}
    >
      {/* faux book cover */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 3fr",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #e5e7eb",
            padding: 24,
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            boxShadow: "0 12px 30px rgba(0,0,0,.06)",
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1 }}>MyZenTribe</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>Gratitude Journal</div>
          <div className="muted" style={{ marginTop: 8 }}>Click to open your journal</div>
        </div>

        <div className="stack" style={{ padding: 8 }}>
          <h2 className="section-title" style={{ marginTop: 0 }}>What you’ll get</h2>
          <ul className="stack" style={{ gap: 8 }}>
            <li>✨ A gentle **daily practice** to add <strong>three glimmers</strong> (gratitudes).</li>
            <li>🧠 A left-page lesson on **feeling** gratitude (not just writing it) + what **glimmers** are.</li>
            <li>🗓️ **Recaps** you can set to weekly (recommended), monthly, or yearly.</li>
            <li>📖 Unlimited length—write a word, a sentence, or ten pages.</li>
          </ul>

          <div className="controls" style={{ marginTop: 8 }}>
            <button className="btn btn-brand" onClick={activateJournal} disabled={saving}>
              {saving ? "Activating…" : "Activate journal"}
            </button>
          </div>

          <p className="muted" style={{ fontSize: 12 }}>
            You can come back to your profile anytime. This journal is private to you.
          </p>
        </div>
      </div>
    </section>
  );

  const book = (
    <section
      className="card p-3"
      style={{
        border: "1px solid rgba(196,181,253,.7)",
        background: "#fff",
        borderRadius: 20,
        position: "relative",
      }}
    >
      {/* Candle placeholder (shows only if user has a candle) */}
      {hasCandle && (
        <div
          title="Meditation candle"
          style={{
            position: "absolute",
            top: 8,
            right: 10,
            fontSize: 22,
            opacity: 0.9,
          }}
        >
          🕯️
        </div>
      )}

      {/* two-page book layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* Left page: intro / philosophy */}
        <div
          style={{
            background: "linear-gradient(180deg,#faf5ff 0%, #ffffff 60%)",
            border: "1px solid #ede9fe",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <h2 className="section-title" style={{ marginTop: 0 }}>Welcome to your practice</h2>
          <div className="stack" style={{ gap: 10 }}>
            <p>
              Gratitude is most powerful when you <strong>feel</strong> it—let your body notice the
              warmth, relief, or joy as you write. We call the tiny, heart-warming moments
              <strong> glimmers</strong>—they’re the opposite of triggers. Glimmers are the “pause
              and smile” moments: a kind text, sunlight on your face, a pet’s yawn, a quiet breath.
            </p>
            <p>
              Each day, capture <strong>three glimmers</strong>. Write a word, a single sentence, or
              as many pages as you like. Over time, your brain starts scanning for the good.
            </p>
            <div className="rounded-xl border px-3 py-2" style={{ borderColor: "#e5e7eb", background: "#fafafa" }}>
              <div className="muted" style={{ fontSize: 12 }}>
                Tip: If you’re stuck, close your eyes and ask, “Where did I feel a tiny lift today?”
              </div>
            </div>

            {/* Recap prefs */}
            <div className="stack" style={{ marginTop: 12 }}>
              <h3 className="section-title" style={{ fontSize: 16 }}>Recap preference</h3>
              <div className="controls" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(["weekly", "monthly", "yearly"] as const).map((f) => (
                  <button
                    key={f}
                    className={`btn ${settings?.recap_frequency === f ? "btn-brand" : "btn-neutral"}`}
                    onClick={() => saveRecapFrequency(f)}
                    disabled={saving}
                  >
                    {f[0].toUpperCase() + f.slice(1)}
                  </button>
                ))}
                <a className="btn btn-neutral" href="#recap-now">View recap</a>
              </div>
              <p className="muted" style={{ fontSize: 12 }}>
                Weekly is recommended; monthly and yearly are available too.
              </p>
            </div>
          </div>
        </div>

        {/* Right page: today's entries + simple recap */}
        <div
          style={{
            background: "linear-gradient(180deg,#ffffff 0%, #fafafa 60%)",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div className="section-row" style={{ marginBottom: 8 }}>
            <h2 className="section-title" style={{ margin: 0 }}>Today</h2>
            <div className="muted">Glimmers: {todayCount}/3</div>
          </div>

          {/* Composer */}
          <textarea
            className="input"
            rows={4}
            placeholder="Add a glimmer… (a word, a sentence, or a page)"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="right" style={{ marginTop: 10 }}>
            <button className="btn btn-brand" onClick={addEntry} disabled={!draft.trim() || !canAdd}>
              {saving ? "Saving…" : "Add glimmer"}
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
                <div key={e.id} className="rounded-xl border px-3 py-2" style={{ borderColor: "#e5e7eb", background: "#fff" }}>
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

          {/* Recap now */}
          <div id="recap-now" className="stack" style={{ marginTop: 16 }}>
            <h3 className="section-title" style={{ fontSize: 16, margin: 0 }}>
              {settings?.recap_frequency === "weekly" ? "This week’s" :
               settings?.recap_frequency === "monthly" ? "This month’s" : "This year’s"} recap
            </h3>
            {recapItems.length === 0 ? (
              <p className="muted">Your recap will appear as you add entries.</p>
            ) : (
              <ul className="stack" style={{ gap: 6 }}>
                {recapItems.map((r) => (
                  <li key={r.id} className="rounded-xl border px-3 py-2" style={{ borderColor: "#e5e7eb", background: "#fff" }}>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {r.when.toLocaleDateString([], { month: "short", day: "numeric" })}
                    </div>
                    <div>{r.summary}</div>
                  </li>
                ))}
              </ul>
            )}
            <p className="muted" style={{ fontSize: 12 }}>
              Long entries are summarized to a couple of sentences; single-word notes appear as-is.
            </p>
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <div className="page-wrap">
      <SiteHeader />
      <div className="page">
        <div className="container-app mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* top header row */}
          <div className="header-bar">
            <h1 className="page-title" style={{ marginBottom: 0 }}>Gratitude Journal</h1>
            <div className="controls">
              <Link className="btn btn-neutral" href="/profile">Back to profile</Link>
            </div>
          </div>
          <div className="h-px bg-violet-200/60" style={{ margin: "12px 0 16px" }} />

          {loading && <p className="muted">Loading…</p>}

          {!loading && settings && !settings.activated && cover}
          {!loading && settings && settings.activated && book}
        </div>
      </div>
    </div>
  );
}
