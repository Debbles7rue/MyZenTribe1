"use client";

import SiteHeader from "@/components/SiteHeader";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useRef, useState } from "react";

/** ───────────────────────────────────────────────────────────────────────────
 * Types
 * ─────────────────────────────────────────────────────────────────────────── */
type ThemeKey = "lavender" | "sunset" | "forest" | "ocean" | "rose";

type Settings = {
  user_id: string;
  activated: boolean;
  recap_frequency: "weekly" | "monthly" | "yearly";
  theme: ThemeKey;
};

type Entry = {
  id: string;
  content: string;
  created_at: string; // ISO
  entry_date: string; // YYYY-MM-DD
};

type MediaItem = {
  id: string;
  file_path: string;
  url: string;            // signed
  favorite: boolean;
  caption: string | null;
  taken_at: string;
};

/** Theme palette (paper backgrounds + accents) */
const THEMES: Record<
  ThemeKey,
  { leftBg: string; rightBg: string; border: string; accent: string; chipA: string; chipB: string }
> = {
  lavender: {
    leftBg: "linear-gradient(180deg,#faf5ff 0%, #ffffff 60%)",
    rightBg: "linear-gradient(180deg,#ffffff 0%, #fafafa 60%)",
    border: "#ede9fe",
    accent: "#7c3aed",
    chipA: "#c4b5fd",
    chipB: "#f5f3ff",
  },
  sunset: {
    leftBg: "linear-gradient(180deg,#ffe4d6 0%, #fff7ed 60%)",
    rightBg: "linear-gradient(180deg,#fff7ed 0%, #fff 60%)",
    border: "#fed7aa",
    accent: "#ea580c",
    chipA: "#fdba74",
    chipB: "#fff7ed",
  },
  forest: {
    leftBg: "linear-gradient(180deg,#ecfdf5 0%, #ffffff 60%)",
    rightBg: "linear-gradient(180deg,#ffffff 0%, #f0fdf4 60%)",
    border: "#bbf7d0",
    accent: "#047857",
    chipA: "#86efac",
    chipB: "#ecfdf5",
  },
  ocean: {
    leftBg: "linear-gradient(180deg,#eff6ff 0%, #ffffff 60%)",
    rightBg: "linear-gradient(180deg,#ffffff 0%, #eef2ff 60%)",
    border: "#bfdbfe",
    accent: "#2563eb",
    chipA: "#93c5fd",
    chipB: "#eff6ff",
  },
  rose: {
    leftBg: "linear-gradient(180deg,#fff1f2 0%, #ffffff 60%)",
    rightBg: "linear-gradient(180deg,#ffffff 0%, #fff1f2 60%)",
    border: "#fecdd3",
    accent: "#e11d48",
    chipA: "#fda4af",
    chipB: "#fff1f2",
  },
};

/** ───────────────────────────────────────────────────────────────────────────
 * Page
 * ─────────────────────────────────────────────────────────────────────────── */
export default function GratitudePage() {
  /** Auth */
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  /** UI stage */
  const [stage, setStage] =
    useState<"loading" | "cover" | "about" | "theme" | "instructions" | "journal">("loading");

  /** Data & flags */
  const [settings, setSettings] = useState<Settings | null>(null);
  const [hasCandle, setHasCandle] = useState(false); // meditation candle placeholder
  const [photosEnabled, setPhotosEnabled] = useState(false); // add-on flag

  /** Entries */
  const [draft, setDraft] = useState("");
  const [todayList, setTodayList] = useState<Entry[]>([]);
  const [recent, setRecent] = useState<Entry[]>([]);

  /** Photos (inline module so you don't need another file) */
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  /** UI helpers */
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickedTheme, setPickedTheme] = useState<ThemeKey>("lavender");

  /** Today string */
  const today = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  /** Load settings, entries, add-on flag, candle */
  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // settings
        const { data: s } = await supabase
          .from("gratitude_settings")
          .select("user_id, activated, recap_frequency, theme")
          .eq("user_id", userId)
          .maybeSingle();

        if (s) {
          const theme = (s.theme || "lavender") as ThemeKey;
          const rec = (s.recap_frequency || "weekly") as Settings["recap_frequency"];
          setSettings({ user_id: s.user_id, activated: !!s.activated, recap_frequency: rec, theme });
          setPickedTheme(theme);
          setStage(s.activated ? "journal" : "cover");
        } else {
          setSettings({
            user_id: userId,
            activated: false,
            recap_frequency: "weekly",
            theme: "lavender",
          });
          setPickedTheme("lavender");
          setStage("cover");
        }

        // entries
        const { data: e } = await supabase
          .from("gratitude_entries")
          .select("id, content, created_at, entry_date")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(150);

        const all = (e ?? []) as Entry[];
        setTodayList(all.filter((x) => x.entry_date === today));
        setRecent(all.filter((x) => x.entry_date !== today));

        // add-on flag (photos)
        const { data: addons } = await supabase
          .from("user_addons")
          .select("photos_enabled")
          .eq("user_id", userId)
          .maybeSingle();
        setPhotosEnabled(!!addons?.photos_enabled);

        // candle placeholder (ignore errors if table doesn't exist)
        try {
          const { data: candles } = await supabase
            .from("meditation_candles")
            .select("id")
            .eq("user_id", userId)
            .limit(1);
          setHasCandle(!!candles?.length);
        } catch {
          setHasCandle(false);
        }
      } catch (e: any) {
        setError(e?.message || "Could not load your journal.");
        setStage("cover");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, today]);

  /** Activation */
  async function activateWithTheme(theme: ThemeKey) {
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      const payload = { user_id: userId, activated: true, recap_frequency: "weekly", theme };
      const { error: upErr } = await supabase
        .from("gratitude_settings")
        .upsert(payload, { onConflict: "user_id" });
      if (upErr) throw upErr;
      setSettings({ user_id: userId, activated: true, recap_frequency: "weekly", theme });
      setStage("instructions");
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
        .upsert(
          {
            user_id: userId,
            activated: true,
            recap_frequency: freq,
            theme: settings.theme,
          },
          { onConflict: "user_id" }
        );
      if (upErr) throw upErr;
      setSettings({ ...settings, recap_frequency: freq });
    } catch (e: any) {
      setError(e?.message || "Could not update recap preference.");
    } finally {
      setSaving(false);
    }
  }

  /** Entries (3 per day) */
  const todayCount = todayList.length;
  const canAdd = todayCount < 3 && !!userId && !saving;

  async function addEntry() {
    const content = draft.trim();
    if (!content || !userId || !settings?.activated) return;
    if (todayList.length >= 3) {
      setError("You’ve reached 3 entries for today. Beautiful work!");
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

  /** Recap generation */
  function summarizeText(t: string): string {
    const clean = t.replace(/\s+/g, " ").trim();
    if (clean.length <= 40) return clean;
    const sentences = clean.split(/(?<=[.!?])\s+/);
    const firstTwo = sentences.slice(0, 2).join(" ");
    return firstTwo.length > 180 ? firstTwo.slice(0, 180) + "…" : firstTwo;
  }
  function rangeStart(freq: Settings["recap_frequency"]): Date {
    const d = new Date();
    if (freq === "weekly") d.setDate(d.getDate() - 7);
    if (freq === "monthly") d.setMonth(d.getMonth() - 1);
    if (freq === "yearly") d.setFullYear(d.getFullYear() - 1);
    return d;
  }
  const recapItems = useMemo(() => {
    if (!settings?.activated) return [];
    const start = rangeStart(settings.recap_frequency).getTime();
    const all = [...todayList, ...recent];
    const filtered = all.filter((e) => new Date(e.created_at).getTime() >= start);
    return filtered.map((e) => ({ id: e.id, summary: summarizeText(e.content), when: new Date(e.created_at) }));
  }, [settings?.activated, settings?.recap_frequency, todayList, recent]);

  /** Theme */
  const theme = settings ? THEMES[settings.theme] : THEMES[pickedTheme];

  /** Photos add-on: list current year */
  const thisYear = new Date().getFullYear();
  const slideUrl = `/gratitude/slideshow?year=${thisYear}`; // optional route we can add next

  async function loadMedia() {
    if (!userId || !photosEnabled) return;
    setMediaLoading(true);
    try {
      const start = new Date(`${thisYear}-01-01T00:00:00Z`).toISOString();
      const end = new Date(`${thisYear + 1}-01-01T00:00:00Z`).toISOString();
      const { data, error } = await supabase
        .from("gratitude_media")
        .select("id,file_path,favorite,caption,taken_at")
        .eq("user_id", userId)
        .gte("taken_at", start)
        .lt("taken_at", end)
        .order("taken_at", { ascending: false });
      if (error) throw error;
      const paths = (data ?? []).map((d) => d.file_path);
      if (paths.length) {
        const { data: signed } = await supabase.storage.from("gratitude-media").createSignedUrls(paths, 3600);
        const map = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
        setMedia(
          (data ?? []).map((d) => ({
            id: d.id,
            file_path: d.file_path,
            url: map.get(d.file_path) || "",
            favorite: !!d.favorite,
            caption: d.caption,
            taken_at: d.taken_at,
          }))
        );
      } else {
        setMedia([]);
      }
    } catch {
      // Silent fail if bucket/table not ready
      setMedia([]);
    } finally {
      setMediaLoading(false);
    }
  }
  useEffect(() => {
    loadMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, photosEnabled]);

  async function onMediaFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!userId || !files.length) return;
    setUploading(true);
    try {
      for (const f of files) {
        const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${userId}/${thisYear}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase
          .storage
          .from("gratitude-media")
          .upload(path, f, { cacheControl: "3600", upsert: false, contentType: f.type });
        if (upErr) throw upErr;
        const { error: insErr } = await supabase
          .from("gratitude_media")
          .insert({ user_id: userId, file_path: path, caption: null, favorite: false });
        if (insErr) throw insErr;
      }
      (e.target as HTMLInputElement).value = "";
      await loadMedia();
    } catch (err: any) {
      alert(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }
  async function toggleFavorite(it: MediaItem) {
    const { error } = await supabase
      .from("gratitude_media")
      .update({ favorite: !it.favorite })
      .eq("id", it.id);
    if (!error) setMedia(media.map((m) => (m.id === it.id ? { ...m, favorite: !m.favorite } : m)));
  }
  async function deleteMedia(it: MediaItem) {
    const { error: sErr } = await supabase.storage.from("gratitude-media").remove([it.file_path]);
    if (sErr) return alert(sErr.message || "Delete failed");
    const { error: dErr } = await supabase.from("gratitude_media").delete().eq("id", it.id);
    if (dErr) return alert(dErr.message || "Delete failed");
    setMedia(media.filter((m) => m.id !== it.id));
  }

  /** UI sections */

  // Cover: click the book → About
  const cover = (
    <section className="card p-3" style={{ border: "1px solid rgba(196,181,253,.5)", borderRadius: 20 }}>
      <div className="grid md:grid-cols-2 gap-5 items-center">
        <button
          onClick={() => setStage("about")}
          className="w-full overflow-hidden rounded-2xl border"
          style={{ borderColor: "#e5e7eb", boxShadow: "0 12px 28px rgba(0,0,0,.08)" }}
          aria-label="Open Gratitude Journal"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/gratitude-cover.png" alt="Gratitude Journal cover" className="w-full h-auto" />
        </button>
        <div className="stack">
          <h2 className="section-title" style={{ marginTop: 0 }}>Gratitude Journal</h2>
          <p className="muted">
            A calming place to notice your <em>glimmers</em>—the tiny, feel-good moments. Click the
            book to learn more and activate your journal.
          </p>
          <div className="controls">
            <button className="btn btn-brand" onClick={() => setStage("about")}>Open</button>
          </div>
        </div>
      </div>
    </section>
  );

  // About: explanation → Activate
  const about = (
    <section className="card p-3" style={{ borderRadius: 20 }}>
      <div className="stack">
        <h2 className="section-title" style={{ marginTop: 0 }}>What this journal is about</h2>
        <p>
          Gratitude reshapes attention. When you <strong>feel</strong> gratitude—not just write the words—your
          nervous system learns to scan for the good. We use <strong>glimmers</strong>: the opposite of triggers.
          A glimmer is a small embodied lift—a warm mug, a kind glance, a pet’s stretch, a deep breath that lands.
        </p>
        <p>
          Each day you’ll add <strong>three glimmers</strong>. Write a word, a sentence, or let it spill for pages.
          Weekly (or monthly/yearly) you’ll see a gentle recap so you can look back and notice how much light arrived.
        </p>
        <div className="rounded-xl border px-3 py-2" style={{ borderColor: "#e5e7eb", background: "#fafafa" }}>
          <div className="muted" style={{ fontSize: 12 }}>
            Tip: Close your eyes and ask, “Where did I feel a tiny lift today?” Feel it in the body, then write.
          </div>
        </div>
        <div className="controls" style={{ marginTop: 6 }}>
          <button className="btn btn-brand" onClick={() => setStage("theme")}>Activate journal</button>
          <button className="btn btn-neutral" onClick={() => setStage("cover")}>Back</button>
        </div>
      </div>
    </section>
  );

  // Theme picker
  const themePick = (
    <section className="card p-3" style={{ borderRadius: 20 }}>
      <h2 className="section-title" style={{ marginTop: 0 }}>Choose your theme</h2>
      <p className="muted">Pick a vibe for your pages. You can change this later.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {(Object.keys(THEMES) as ThemeKey[]).map((t) => {
          const th = THEMES[t];
          const active = pickedTheme === t;
          return (
            <button
              key={t}
              onClick={() => setPickedTheme(t)}
              className="rounded-2xl border p-3 text-left"
              style={{
                borderColor: active ? th.accent : "#e5e7eb",
                boxShadow: active ? `0 0 0 3px ${th.accent}33` : "none",
              }}
              aria-pressed={active}
            >
              <div className="rounded-xl overflow-hidden border" style={{ borderColor: "#e5e7eb" }}>
                <div style={{ height: 46, background: th.leftBg }} />
                <div style={{ height: 46, background: th.rightBg }} />
              </div>
              <div className="flex gap-2 mt-2">
                <span className="inline-block w-4 h-4 rounded-full" style={{ background: th.chipA }} />
                <span className="inline-block w-4 h-4 rounded-full" style={{ background: th.chipB }} />
              </div>
              <div className="mt-1 font-medium capitalize">{t}</div>
            </button>
          );
        })}
      </div>
      <div className="controls" style={{ marginTop: 10 }}>
        <button className="btn btn-brand" onClick={() => activateWithTheme(pickedTheme)} disabled={saving}>
          {saving ? "Activating…" : "Save & continue"}
        </button>
        <button className="btn btn-neutral" onClick={() => setStage("about")}>Back</button>
      </div>
    </section>
  );

  // Instructions
  const instructions = (
    <section
      className="card p-3"
      style={{
        border: `1px solid ${THEMES[settings?.theme ?? pickedTheme].border}`,
        borderRadius: 20,
        background: "#fff",
      }}
    >
      <div className="stack">
        <h2 className="section-title" style={{ marginTop: 0 }}>How it works</h2>
        <ol className="stack" style={{ gap: 8 }}>
          <li><strong>Every day</strong>, jot down <strong>three glimmers</strong>.</li>
          <li>Let yourself <strong>feel</strong> the gratitude for a few seconds before/after writing.</li>
          <li>Write a word, a sentence, or as many pages as you want—whatever feels right.</li>
          <li>Use the recap (weekly/monthly/yearly) to reinforce how much goodness showed up.</li>
        </ol>
        <div className="controls">
          <button className="btn btn-brand" onClick={() => setStage("journal")}>Start journaling</button>
        </div>
      </div>
    </section>
  );

  // Book (journal)
  const book = (
    <section
      className="card p-3"
      style={{
        border: `1px solid ${theme.border}`,
        background: "#fff",
        borderRadius: 20,
        position: "relative",
      }}
    >
      {/* Candle placeholder (only if user actually has one) */}
      {hasCandle && (
        <div title="Meditation candle" style={{ position: "absolute", top: 8, right: 10, fontSize: 22, opacity: 0.9 }}>
          🕯️
        </div>
      )}

      {/* Two-page spread */}
      <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* Left page: philosophy + recap */}
        <div className="rounded-xl border p-4" style={{ background: theme.leftBg, borderColor: theme.border }}>
          <h2 className="section-title" style={{ marginTop: 0 }}>Feel your glimmers</h2>
          <p>
            Gratitude works best when you <strong>feel</strong> it—notice the body’s tiny shift: a breath loosening,
            shoulders dropping, a quiet smile. That’s the glimmer.
          </p>

          <div className="stack" style={{ marginTop: 10 }}>
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
            </div>
            <p className="muted" style={{ fontSize: 12 }}>
              Weekly is recommended; monthly/yearly are available too.
            </p>
          </div>

          <div className="stack" style={{ marginTop: 14 }}>
            <h3 className="section-title" style={{ fontSize: 16, margin: 0 }}>
              {settings?.recap_frequency === "weekly"
                ? "This week’s"
                : settings?.recap_frequency === "monthly"
                ? "This month’s"
                : "This year’s"}{" "}
              recap
            </h3>
            {recapItems.length === 0 ? (
              <p className="muted">Your recap will appear as you add entries.</p>
            ) : (
              <ul className="stack" style={{ gap: 6 }}>
                {recapItems.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border px-3 py-2"
                    style={{ borderColor: "#e5e7eb", background: "#fff" }}
                  >
                    <div className="muted" style={{ fontSize: 12 }}>
                      {r.when.toLocaleDateString([], { month: "short", day: "numeric" })}
                    </div>
                    <div>{r.summary}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right page: today's entries */}
        <div className="rounded-xl border p-4" style={{ background: theme.rightBg, borderColor: "#e5e7eb" }}>
          <div className="section-row" style={{ marginBottom: 8 }}>
            <h2 className="section-title" style={{ margin: 0 }}>Today</h2>
            <div className="muted">Glimmers: {todayCount}/3</div>
          </div>

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
            <div
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              style={{ marginTop: 10 }}
            >
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
        </div>
      </div>

      {/* Photos add-on card (below the spread) */}
      <div className="stack" style={{ marginTop: 16 }}>
        {!photosEnabled ? (
          <section className="card p-3">
            <div className="section-row">
              <h2 className="section-title">Photos & Slideshow</h2>
              <button
                className="btn btn-brand"
                onClick={async () => {
                  if (!userId) return;
                  // DEV shortcut: enable immediately (replace with Stripe checkout later)
                  await supabase
                    .from("user_addons")
                    .upsert(
                      { user_id: userId, photos_enabled: true, purchased_at: new Date().toISOString() },
                      { onConflict: "user_id" }
                    );
                  setPhotosEnabled(true);
                }}
              >
                Enable for $2.99
              </button>
            </div>
            <p className="muted">
              Add photos to your journal and star favorites. At year’s end, enjoy a fullscreen slideshow of your
              favorite memories.
            </p>
          </section>
        ) : (
          <section className="card p-3">
            <div className="section-row">
              <h2 className="section-title">Photos</h2>
              <a className="btn btn-neutral" href={slideUrl} target="_blank" rel="noreferrer">
                Open {thisYear} slideshow
              </a>
            </div>

            <input type="file" accept="image/*" multiple onChange={onMediaFiles} disabled={uploading} />
            {uploading && <p className="muted">Uploading…</p>}

            {mediaLoading ? (
              <p className="muted">Loading photos…</p>
            ) : media.length === 0 ? (
              <p className="muted">No photos yet. Upload a few from today.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" style={{ marginTop: 10 }}>
                {media.map((it) => (
                  <div key={it.id} className="rounded-xl overflow-hidden border" style={{ borderColor: "#e5e7eb" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.url} alt={it.caption ?? "photo"} className="w-full h-40 object-cover" />
                    <div className="flex items-center justify-between px-2 py-1 text-sm">
                      <button
                        className="underline"
                        onClick={() => toggleFavorite(it)}
                        title={it.favorite ? "Unfavorite" : "Favorite"}
                        style={{ color: it.favorite ? theme.accent : undefined }}
                      >
                        {it.favorite ? "★ Favorite" : "☆ Favorite"}
                      </button>
                      <button className="underline" onClick={() => deleteMedia(it)} style={{ color: "#ef4444" }}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </section>
  );

  return (
    <div className="page-wrap">
      <SiteHeader />
      <div className="page">
        <div className="container-app mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* top header row */}
          <div className="header-bar">
            <h1 className="page-title" style={{ marginBottom: 0 }}>Gratitude Journal</h1>
            <div className="controls">
              <Link className="btn btn-neutral" href="/profile">Back to profile</Link>
            </div>
          </div>
          <div className="h-px" style={{ background: "rgba(196,181,253,.6)", margin: "12px 0 16px" }} />

          {loading && <p className="muted">Loading…</p>}

          {!loading && stage === "cover" && cover}
          {!loading && stage === "about" && about}
          {!loading && stage === "theme" && themePick}
          {!loading && stage === "instructions" && instructions}
          {!loading && stage === "journal" && book}
        </div>
      </div>
    </div>
  );
}
