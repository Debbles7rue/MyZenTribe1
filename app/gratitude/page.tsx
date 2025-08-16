/* app/gratitude/page.tsx */
"use client";

import SiteHeader from "@/components/SiteHeader";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";

/** MVP flags (keep simple) */
const SHOW_PHOTOS_ADDON = false; // turn on later when ready

/** Per-day limit (change to 999 for "unlimited") */
const MAX_PER_DAY = 3;

/** ─── Types ───────────────────────────────────────────── */
type ThemeKey = "lavender" | "sunset" | "forest" | "ocean" | "rose";
type Plan = "free" | "photos";

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
  url: string;
  favorite: boolean;
  caption: string | null;
  taken_at: string;
};

/** Themes */
const THEMES: Record<
  ThemeKey,
  { leftBg: string; rightBg: string; border: string; accent: string }
> = {
  lavender: {
    leftBg: "linear-gradient(180deg,#faf5ff 0%, #ffffff 60%)",
    rightBg: "linear-gradient(180deg,#ffffff 0%, #fafafa 60%)",
    border: "#ede9fe",
    accent: "#7c3aed",
  },
  sunset: {
    leftBg: "linear-gradient(180deg,#ffe4d6 0%, #fff7ed 60%)",
    rightBg: "linear-gradient(180deg,#fff7ed 0%, #fff 60%)",
    border: "#fed7aa",
    accent: "#ea580c",
  },
  forest: {
    leftBg: "linear-gradient(180deg,#ecfdf5 0%, #ffffff 60%)",
    rightBg: "linear-gradient(180deg,#ffffff 0%, #f0fdf4 60%)",
    border: "#bbf7d0",
    accent: "#047857",
  },
  ocean: {
    leftBg: "linear-gradient(180deg,#eff6ff 0%, #ffffff 60%)",
    rightBg: "linear-gradient(180deg,#ffffff 0%, #eef2ff 60%)",
    border: "#bfdbfe",
    accent: "#2563eb",
  },
  rose: {
    leftBg: "linear-gradient(180deg,#fff1f2 0%, #ffffff 60%)",
    rightBg: "linear-gradient(180deg,#ffffff 0%, #fff1f2 60%)",
    border: "#fecdd3",
    accent: "#e11d48",
  },
};

/** Curated daily gratitude quotes (local, no API) */
const QUOTES: { text: string; author: string }[] = [
  { text: "Gratitude turns what we have into enough.", author: "Anonymous" },
  { text: "Wear gratitude like a cloak and it will feed every corner of your life.", author: "Rumi" },
  { text: "Acknowledging the good that you already have in your life is the foundation for all abundance.", author: "Eckhart Tolle" },
  { text: "It is not joy that makes us grateful; it is gratitude that makes us joyful.", author: "David Steindl-Rast" },
  { text: "The more grateful I am, the more beauty I see.", author: "Mary Davis" },
  { text: "Enjoy the little things, for one day you may look back and realize they were the big things.", author: "Robert Brault" },
  { text: "Gratitude is the fairest blossom which springs from the soul.", author: "Henry Ward Beecher" },
  { text: "Appreciation can change a day, even change a life.", author: "Margaret Cousins" },
  { text: "When we focus on our gratitude, the tide of disappointment goes out.", author: "Kristin Armstrong" },
  { text: "Silent gratitude isn’t much use to anyone.", author: "Gertrude Stein" },
  { text: "Act with kindness, but do not expect gratitude.", author: "Confucius" },
  { text: "Gratitude unlocks the fullness of life.", author: "Melody Beattie" },
  { text: "This is a wonderful day; I have never seen this one before.", author: "Maya Angelou" },
  { text: "The roots of all goodness lie in the soil of appreciation.", author: "Dalai Lama" },
  { text: "He is a wise man who does not grieve for the things which he has not, but rejoices for those which he has.", author: "Epictetus" },
  { text: "What we focus on expands. Choose gratitude.", author: "Unknown" },
  { text: "An attitude of gratitude brings great things.", author: "Yogi Bhajan" },
  { text: "Gratitude bestows reverence.", author: "John Milton" },
  { text: "Let us be grateful to people who make us happy.", author: "Marcel Proust" },
  { text: "The way to develop the best that is in a person is by appreciation and encouragement.", author: "Charles Schwab" },
];

/** Get a quote index based on the calendar day; allows cycling with an offset */
function quoteIndexFor(date: Date, offset = 0) {
  const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  const idx = (dayNumber + offset) % QUOTES.length;
  return idx < 0 ? idx + QUOTES.length : idx;
}

/** ─── Page ────────────────────────────────────────────── */
export default function GratitudePage() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  type Stage = "loading" | "cover" | "book_intro" | "theme" | "journal";
  const [stage, setStage] = useState<Stage>("loading");

  const [settings, setSettings] = useState<Settings | null>(null);
  const [pickedTheme, setPickedTheme] = useState<ThemeKey>("lavender");
  const [selectedPlan, setSelectedPlan] = useState<Plan>("free");

  const [hasCandle, setHasCandle] = useState(false);
  const [photosEnabled, setPhotosEnabled] = useState(false);

  const [draft, setDraft] = useState("");
  const [todayList, setTodayList] = useState<Entry[]>([]);
  const [recent, setRecent] = useState<Entry[]>([]);

  // Daily quote cycling
  const [quoteOffset, setQuoteOffset] = useState(0);

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Today string */
  const today = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  /** Load settings + entries (+ optional flags) */
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
          const themeName = (s.theme || "lavender") as ThemeKey;
          const rec = (s.recap_frequency || "weekly") as Settings["recap_frequency"];
          setSettings({ user_id: s.user_id, activated: !!s.activated, recap_frequency: rec, theme: themeName });
          setPickedTheme(themeName);
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

        // optional flags
        if (SHOW_PHOTOS_ADDON) {
          const { data: addons } = await supabase
            .from("user_addons")
            .select("photos_enabled")
            .eq("user_id", userId)
            .maybeSingle();
          setPhotosEnabled(!!addons?.photos_enabled);
        }

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

  /** Activate with theme and plan */
  async function activateWithTheme(themeKey: ThemeKey) {
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      const payload = { user_id: userId, activated: true, recap_frequency: "weekly", theme: themeKey };
      const { error: upErr } = await supabase
        .from("gratitude_settings")
        .upsert(payload, { onConflict: "user_id" });
      if (upErr) throw upErr;

      if (SHOW_PHOTOS_ADDON && selectedPlan === "photos") {
        await supabase
          .from("user_addons")
          .upsert(
            { user_id: userId, photos_enabled: true, purchased_at: new Date().toISOString() },
            { onConflict: "user_id" }
          );
        setPhotosEnabled(true);
      }

      setSettings({ user_id: userId, activated: true, recap_frequency: "weekly", theme: themeKey });
      setStage("journal");
    } catch (e: any) {
      setError(e?.message || "Activation failed.");
    } finally {
      setSaving(false);
    }
  }

  /** Recap prefs */
  async function saveRecapFrequency(freq: Settings["recap_frequency"]) {
    if (!userId || !settings) return;
    setSaving(true);
    try {
      const { error: upErr } = await supabase
        .from("gratitude_settings")
        .upsert(
          { user_id: userId, activated: true, recap_frequency: freq, theme: settings.theme },
          { onConflict: "user_id" }
        );
      if (upErr) throw upErr;
      setSettings({ ...settings, recap_frequency: freq });
    } finally {
      setSaving(false);
    }
  }

  /** Entries (MAX_PER_DAY/day) */
  const todayCount = todayList.length;
  const canAdd = todayCount < MAX_PER_DAY && !!userId && !saving;

  async function addEntry() {
    const content = draft.trim();
    if (!content || !userId || !settings?.activated) return;
    if (todayList.length >= MAX_PER_DAY) {
      setError(`You’ve reached ${MAX_PER_DAY} entries for today. Beautiful work!`);
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
    try {
      await supabase.from("gratitude_entries").delete().eq("id", id).eq("user_id", userId);
      setTodayList(todayList.filter((e) => e.id !== id));
      setRecent(recent.filter((e) => e.id !== id));
    } finally {
      setSaving(false);
    }
  }

  /** Local recap summary */
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

  /** Photos add-on (disabled in MVP unless SHOW_PHOTOS_ADDON) */
  const thisYear = new Date().getFullYear();
  async function loadMedia() {
    if (!userId || !photosEnabled || !SHOW_PHOTOS_ADDON) return;
    setMediaLoading(true);
    try {
      const start = new Date(`${thisYear}-01-01T00:00:00Z`).toISOString();
      const end = new Date(`${thisYear + 1}-01-01T00:00:00Z`).toISOString();
      const { data } = await supabase
        .from("gratitude_media")
        .select("id,file_path,favorite,caption,taken_at")
        .eq("user_id", userId)
        .gte("taken_at", start)
        .lt("taken_at", end)
        .order("favorite", { ascending: false })
        .order("taken_at", { ascending: false });

      const paths = (data ?? []).map((d) => d.file_path);
      if (!paths.length) {
        setMedia([]);
      } else {
        const { data: signed } = await supabase.storage.from("gratitude-media").createSignedUrls(paths, 3600);
        const map = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
        setMedia(
          (data ?? []).map((d) => ({
            id: d.id,
            url: map.get(d.file_path) || "",
            favorite: !!d.favorite,
            caption: d.caption,
            taken_at: d.taken_at,
            file_path: d.file_path,
          }))
        );
      }
    } finally {
      setMediaLoading(false);
    }
  }
  useEffect(() => {
    loadMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, photosEnabled]);

  async function onMediaFiles(_e: React.ChangeEvent<HTMLInputElement>) {/* disabled in MVP */ }
  async function toggleFavorite(_id: string, _v: boolean) {/* disabled in MVP */ }
  async function deleteMedia(_id: string, _p: string) {/* disabled in MVP */ }

  /** Theme palette (avoid name collision) */
  const palette = settings ? THEMES[settings.theme] : THEMES[pickedTheme];

  /** Quote of the day (with cycle button) */
  const quote = useMemo(() => {
    const baseIdx = quoteIndexFor(new Date(), quoteOffset);
    return QUOTES[baseIdx];
  }, [quoteOffset]);

  /** ─── UI blocks ─────────────────────────────────────── */

  const [coverError, setCoverError] = useState(false);
  const cover = (
    <div className="rounded-2xl p-6" style={{ background: "#f6efe6", border: "1px solid #eadfd1" }}>
      <div className="max-w-4xl mx-auto">
        <div
          className="relative mx-auto overflow-hidden"
          style={{
            borderRadius: 18,
            boxShadow: "0 18px 40px rgba(0,0,0,.18)",
            border: "1px solid #e5e7eb",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {!coverError ? (
            <img
              src="/images/gratitude-cover.png"
              alt="Gratitude Journal cover"
              className="w-full h-auto block"
              onError={() => setCoverError(true)}
            />
          ) : (
            <div
              className="w-full"
              style={{
                aspectRatio: "16/6",
                background: "linear-gradient(120deg,#5B2A86,#FF6A3D)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ color: "#fff", fontSize: 36, fontWeight: 700, letterSpacing: 1 }}>
                Gratitude Journal
              </div>
            </div>
          )}
          <button
            onClick={() => setStage("book_intro")}
            className="absolute bottom-4 left-4 btn btn-brand"
            aria-label="Open the journal"
          >
            Open
          </button>
        </div>
      </div>
    </div>
  );

  const bookIntro = (
    <div className="rounded-2xl p-4 md:p-6" style={{ background: "#f6efe6", border: "1px solid #eadfd1" }}>
      <div className="max-w-5xl mx-auto relative">
        {/* book shell */}
        <div
          className="relative grid md:grid-cols-2 gap-0 rounded-[20px] overflow-hidden"
          style={{
            boxShadow: "0 18px 40px rgba(0,0,0,.18)",
            border: "1px solid #e5e7eb",
          }}
        >
          {/* spine */}
          <div
            className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[6px]"
            style={{
              background: "linear-gradient(180deg,#d3c4af,#e8dccb)",
              boxShadow: "inset 0 0 6px rgba(0,0,0,.12)",
              zIndex: 2,
            }}
          />
          {/* left page */}
          <div className="p-5 sm:p-7" style={{ background: "#fffdf8", borderRight: "1px solid #eadfd1" }}>
            <h2 className="section-title" style={{ marginTop: 0 }}>Gratitude Journal</h2>
            <p style={{ whiteSpace: "pre-wrap" }}>
{`Your brain is naturally wired to notice the negative—it’s part of how it keeps you safe. But with just a little practice, you can retrain your mind to see the positives all around you. This gratitude journal is designed to help you do exactly that.

Each day, you’ll be guided to write down three things you’re thankful for. They can be as simple as a smile from a stranger, a moment of peace, or as detailed as a story that brought you joy. Over time, these small daily shifts rewire your brain, helping you create a more positive outlook and a deeper sense of well-being.

To keep you on track, you’ll receive daily reminders, plus weekly, monthly, and yearly recaps—so you can look back and see how much beauty and goodness has filled your life. At no cost, you’ll have a growing collection of meaningful memories you can return to whenever you need encouragement.`}
            </p>

            {/* NEW: clear, feel-first instructions */}
            <div
              className="rounded-xl border p-3 mt-3"
              style={{ background: "#ffffff", borderColor: "#eadfd1" }}
            >
              <h4 style={{ margin: 0, fontWeight: 700 }}>How to practice (2 min)</h4>
              <ol className="mt-2" style={{ paddingLeft: 18, lineHeight: 1.6 }}>
                <li>Close your eyes. Take a slow breath in for 4, out for 6.</li>
                <li><strong>Feel</strong> for a tiny lift in your body—a softening, warmth, ease. That’s a <em>glimmer</em>.</li>
                <li>Open your eyes and write from that sensation. A word, a sentence, or a page—anything is enough.</li>
                <li>Repeat up to <strong>{MAX_PER_DAY}</strong> times today. Small is powerful.</li>
              </ol>
              <p className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                Tip: If you only have a word—write the word and breathe with it for one more slow breath.
              </p>
            </div>
          </div>

          {/* right page */}
          <div className="p-5 sm:p-7" style={{ background: "#fffdf8" }}>
            <h3 className="section-title" style={{ marginTop: 0 }}>Choose how you’d like to start</h3>

            <div className="grid gap-3">
              <label className="rounded-2xl border p-3 cursor-pointer">
                <div className="flex items-start gap-3">
                  <input type="radio" name="plan" checked={true} readOnly style={{ marginTop: 4 }} />
                  <div>
                    <div className="font-medium">Free journal</div>
                    <div className="muted text-sm">
                      Daily entries, reminders, and weekly/monthly/yearly recaps.
                    </div>
                  </div>
                </div>
              </label>

              {SHOW_PHOTOS_ADDON && (
                <label className="rounded-2xl border p-3 cursor-pointer">
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="plan"
                      checked={selectedPlan === "photos"}
                      onChange={() => setSelectedPlan("photos")}
                      style={{ marginTop: 4 }}
                    />
                    <div>
                      <div className="font-medium">
                        Photos + Slideshow <span className="opacity-70">($2.99 one-time)</span>
                      </div>
                      <div className="muted text-sm">
                        Attach photos to entries, star favorites, and enjoy a year-end slideshow.
                      </div>
                    </div>
                  </div>
                </label>
              )}
            </div>

            <div className="mt-4">
              <div className="muted text-sm mb-1">Pick a page theme</div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(THEMES) as ThemeKey[]).map((t) => {
                  const th = THEMES[t]; const active = pickedTheme === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setPickedTheme(t)}
                      className="rounded-xl border px-3 py-2 capitalize"
                      style={{
                        borderColor: active ? th.accent : "#e5e7eb",
                        boxShadow: active ? `0 0 0 3px ${th.accent}33` : "none",
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="controls mt-4">
              <button className="btn btn-brand" onClick={() => setStage("theme")}>Continue</button>
              <button className="btn btn-neutral" onClick={() => setStage("cover")}>Back</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const themeConfirm = (
    <section className="card p-3" style={{ borderRadius: 20 }}>
      <h2 className="section-title" style={{ marginTop: 0 }}>Confirm your theme</h2>
      <p className="muted">You can change this later in the journal.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {(Object.keys(THEMES) as ThemeKey[]).map((t) => {
          const th = THEMES[t]; const active = pickedTheme === t;
          return (
            <button
              key={t}
              onClick={() => setPickedTheme(t)}
              className="rounded-2xl border p-3 text-left"
              style={{
                borderColor: active ? th.accent : "#e5e7eb",
                boxShadow: active ? `0 0 0 3px ${th.accent}33` : "none",
              }}
            >
              <div className="rounded-xl overflow-hidden border" style={{ borderColor: "#e5e7eb" }}>
                <div style={{ height: 46, background: th.leftBg }} />
                <div style={{ height: 46, background: th.rightBg }} />
              </div>
              <div className="mt-1 font-medium capitalize">{t}</div>
            </button>
          );
        })}
      </div>
      <div className="controls" style={{ marginTop: 10 }}>
        <button className="btn btn-brand" onClick={() => activateWithTheme(pickedTheme)} disabled={saving}>
          {saving ? "Activating…" : "Activate journal"}
        </button>
        <button className="btn btn-neutral" onClick={() => setStage("book_intro")}>Back</button>
      </div>
    </section>
  );

  const book = (
    <section
      className="card p-3"
      style={{
        border: `1px solid ${palette.border}`,
        background: "#fff",
        borderRadius: 20,
        position: "relative",
      }}
    >
      {hasCandle && (
        <div title="Meditation candle" style={{ position: "absolute", top: 8, right: 10, fontSize: 22, opacity: 0.9 }}>
          🕯️
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* Left: recap + prefs */}
        <div className="rounded-xl border p-4" style={{ background: palette.leftBg, borderColor: palette.border }}>
          <h2 className="section-title" style={{ marginTop: 0 }}>Feel your glimmers</h2>
          <p>Pause, notice a small lift in your body or mood—then write from that feeling.</p>

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
            <p className="muted" style={{ fontSize: 12 }}>Weekly is recommended; monthly/yearly are available too.</p>
          </div>

          <div className="stack" style={{ marginTop: 14 }}>
            <h3 className="section-title" style={{ fontSize: 16, margin: 0 }}>
              {settings?.recap_frequency === "weekly" ? "This week’s"
                : settings?.recap_frequency === "monthly" ? "This month’s" : "This year’s"} recap
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
          </div>
        </div>

        {/* Right: Quote + today */}
        <div className="rounded-xl border p-4" style={{ background: palette.rightBg, borderColor: "#e5e7eb" }}>
          <div className="section-row" style={{ marginBottom: 8 }}>
            <h2 className="section-title" style={{ margin: 0 }}>Today</h2>
            <div className="muted">Glimmers: {todayList.length}/{MAX_PER_DAY}</div>
          </div>

          {/* Daily quote */}
          <figure className="rounded-xl border px-3 py-2 mb-3" style={{ borderColor: "#e5e7eb", background: "#fff" }}>
            <blockquote style={{ fontStyle: "italic", lineHeight: 1.5 }}>
              “{quote.text}”
            </blockquote>
            <figcaption className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              — {quote.author}
            </figcaption>
            <div className="right">
              <button
                className="btn btn-neutral"
                onClick={() => setQuoteOffset((n) => n + 1)}
                aria-label="Show another quote"
              >
                Show another
              </button>
            </div>
          </figure>

          {/* Entry input */}
          <label className="text-sm muted" style={{ display: "block", marginBottom: 6 }}>
            Write one glimmer and click “Add glimmer”; repeat up to {MAX_PER_DAY} times today.
          </label>
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

          {/* Today's entries */}
          {todayList.length > 0 && (
            <div className="stack" style={{ marginTop: 12 }}>
              {todayList.map((e) => (
                <div key={e.id} className="rounded-xl border px-3 py-2" style={{ borderColor: "#e5e7eb", background: "#fff" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div style={{ whiteSpace: "pre-wrap" }}>{e.content}</div>
                    <button className="btn btn-neutral" onClick={() => removeEntry(e.id)} disabled={saving}>Delete</button>
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

      {/* Photos area — hidden in MVP */}
      {SHOW_PHOTOS_ADDON && (
        <div className="stack" style={{ marginTop: 16 }}>
          {!photosEnabled ? (
            <section className="card p-3">
              <div className="section-row">
                <h2 className="section-title">Photos & Slideshow</h2>
                <button className="btn btn-brand" onClick={() => alert("Coming soon!")}>
                  Enable for $2.99
                </button>
              </div>
              <p className="muted">Attach photos, star favorites, and watch your year-end slideshow.</p>
            </section>
          ) : (
            <section className="card p-3">
              <h2 className="section-title">Photos</h2>
              <p className="muted">Uploads enabled (feature flagged off in MVP).</p>
            </section>
          )}
        </div>
      )}
    </section>
  );

  return (
    <div className="page-wrap">
      <SiteHeader />
      <div className="page">
        <div className="container-app mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="header-bar">
            <h1 className="page-title" style={{ marginBottom: 0 }}>Gratitude Journal</h1>
            <div className="controls">
              <Link className="btn btn-neutral" href="/profile">Back to profile</Link>
            </div>
          </div>
          <div className="h-px" style={{ background: "rgba(196,181,253,.6)", margin: "12px 0 16px" }} />

          {loading && <p className="muted">Loading…</p>}
          {!loading && stage === "cover" && cover}
          {!loading && stage === "book_intro" && bookIntro}
          {!loading && stage === "theme" && themeConfirm}
          {!loading && stage === "journal" && book}
        </div>
      </div>
    </div>
  );
}
