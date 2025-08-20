"use client";

/**
 * MyZenTribe · Meditation Room
 *
 * Visual vibe: lavender, soft glow, peaceful. Protective watermark is global.
 *
 * Blessing (embedded as requested):
 * "My intention for this site is to bring people together for community, love, support, and fun.
 *  I draw in light from above to dedicate this work for the collective spread of healing, love,
 *  and new opportunities that will enrich the lives of many. I send light, love, and protection
 *  to every user who joins. May this bring hope and inspiration to thousands, if not millions,
 *  around the world. And so it is done, and so it is done."
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { BackgroundSelector } from "@/components/meditation/BackgroundSelector";
import { SoundPlayer } from "@/components/meditation/SoundPlayer";
import { TribePulse } from "@/components/meditation/TribePulse";
import { format } from "date-fns";

type Prefs = {
  bg: "sunset" | "river" | "mandala";
  sound: "none" | "528hz" | "ocean" | "rain";
  volume: number;
  is_anonymous: boolean;
};

type SessionRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
};

function cls(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export default function MeditationRoomPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<Prefs>({
    bg: "sunset",
    sound: "none",
    volume: 0.5,
    is_anonymous: true,
  });

  const [activeSession, setActiveSession] = useState<SessionRow | null>(null);
  const [timerMins, setTimerMins] = useState<number>(15);
  const [timerEndsAt, setTimerEndsAt] = useState<Date | null>(null);

  // Auth bootstrap
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      setLoading(false);

      if (user?.id) {
        // load prefs or upsert defaults
        const { data: existing } = await supabase
          .from("meditation_prefs")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existing) {
          setPrefs({
            bg: existing.bg,
            sound: existing.sound,
            volume: Number(existing.volume),
            is_anonymous: !!existing.is_anonymous,
          });
        } else {
          await supabase.from("meditation_prefs").insert({
            user_id: user.id,
            bg: "sunset",
            sound: "none",
            volume: 0.5,
            is_anonymous: true,
          });
        }

        // If they have a currently running session, find it
        const { data: sessionRows } = await supabase
          .from("meditation_sessions")
          .select("*")
          .eq("user_id", user.id)
          .is("ended_at", null)
          .order("started_at", { ascending: false })
          .limit(1);

        if (sessionRows && sessionRows.length > 0) {
          setActiveSession(sessionRows[0]);
        }
      }
    })();
  }, []);

  // Start a session (and optional timer)
  async function startSession() {
    if (!userId) return;
    const { data, error } = await supabase
      .from("meditation_sessions")
      .insert({
        user_id: userId,
        is_anonymous: prefs.is_anonymous,
      })
      .select("*")
      .single();

    if (!error && data) {
      setActiveSession(data);
      if (timerMins > 0) {
        setTimerEndsAt(new Date(Date.now() + timerMins * 60_000));
      }
    }
  }

  // Stop session
  async function stopSession() {
    if (!activeSession) return;
    await supabase
      .from("meditation_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", activeSession.id);
    setActiveSession(null);
    setTimerEndsAt(null);
  }

  // Save prefs
  async function updatePrefs(next: Partial<Prefs>) {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    if (!userId) return;
    await supabase
      .from("meditation_prefs")
      .upsert({
        user_id: userId,
        bg: merged.bg,
        sound: merged.sound,
        volume: merged.volume,
        is_anonymous: merged.is_anonymous,
      });
  }

  // Timer tick
  useEffect(() => {
    if (!timerEndsAt || !activeSession) return;
    const t = setInterval(() => {
      if (Date.now() >= timerEndsAt.getTime()) {
        stopSession(); // Auto-stop on timer end
      }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerEndsAt, activeSession]);

  const bgClass = useMemo(() => {
    switch (prefs.bg) {
      case "river":
        return "bg-gradient-to-b from-blue-100 via-indigo-100 to-purple-100";
      case "mandala":
        return "bg-gradient-to-b from-fuchsia-100 via-purple-100 to-violet-100";
      case "sunset":
      default:
        return "bg-gradient-to-b from-purple-100 via-violet-100 to-rose-100";
    }
  }, [prefs.bg]);

  if (loading) {
    return (
      <div className="min-h-[70vh] grid place-items-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className={cls("min-h-[80vh] grid place-items-center", bgClass)}>
        <div className="max-w-lg w-full rounded-xl bg-white/80 shadow p-6 text-center">
          <h1 className="text-2xl font-semibold mb-2">Meditation Room</h1>
          <p className="text-zinc-600 mb-4">
            Sign in to join the 24/7 flow of healing energy.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-lg px-4 py-2 bg-brand-500 text-white"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const endsLabel =
    activeSession && timerEndsAt
      ? `Ends ${format(timerEndsAt, "h:mm a")}`
      : activeSession
      ? "Live"
      : "Ready";

  return (
    <div className={cls("min-h-[100vh] pb-20", bgClass)}>
      <div className="mx-auto max-w-4xl px-4 pt-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Meditation Room</h1>
            <p className="text-sm text-zinc-600">
              Our collective intention: keep a gentle, continuous flow of
              healing energy around the world — 24/7.
            </p>
          </div>
          <div className="hidden sm:block text-right">
            <TribePulse />
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white/90 p-4 shadow">
            <h2 className="font-medium mb-2">Background</h2>
            <BackgroundSelector
              value={prefs.bg}
              onChange={(bg) => updatePrefs({ bg })}
            />
          </div>

          <div className="rounded-xl bg-white/90 p-4 shadow">
            <h2 className="font-medium mb-2">Sound</h2>
            <SoundPlayer
              sound={prefs.sound}
              volume={prefs.volume}
              onChangeSound={(sound) => updatePrefs({ sound })}
              onChangeVolume={(volume) => updatePrefs({ volume })}
            />
            <p className="mt-2 text-xs text-zinc-500">
              Upload audio files later (e.g., <code>/public/audio/528hz.mp3</code>,
              <code>/public/audio/ocean.mp3</code>). Player is ready.
            </p>
          </div>

          <div className="rounded-xl bg-white/90 p-4 shadow">
            <h2 className="font-medium mb-2">Privacy</h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={prefs.is_anonymous}
                onChange={(e) => updatePrefs({ is_anonymous: e.target.checked })}
              />
              Meditate anonymously
            </label>

            <div className="mt-4">
              <h3 className="text-sm font-medium mb-1">Timer</h3>
              <div className="flex flex-wrap gap-2">
                {[10, 15, 20, 30, 45, 60].map((m) => (
                  <button
                    key={m}
                    onClick={() => setTimerMins(m)}
                    className={cls(
                      "px-3 py-1 rounded-lg border",
                      timerMins === m ? "bg-brand-500 text-white border-brand-500" : "bg-white"
                    )}
                  >
                    {m}m
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3">
                {!activeSession ? (
                  <button
                    onClick={startSession}
                    className="rounded-lg px-4 py-2 bg-emerald-600 text-white"
                  >
                    Start
                  </button>
                ) : (
                  <button
                    onClick={stopSession}
                    className="rounded-lg px-4 py-2 bg-rose-600 text-white"
                  >
                    Stop
                  </button>
                )}
                <span className="text-xs text-zinc-600">{endsLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Pulse (mobile) */}
        <div className="mt-6 sm:hidden">
          <TribePulse />
        </div>

        {/* Actions */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-white/90 p-4 shadow">
            <h2 className="font-medium mb-2">Schedule a Meditation</h2>
            <ScheduleBlock />
          </div>

            <div className="rounded-xl bg-white/90 p-4 shadow">
              <h2 className="font-medium mb-2">Light a Candle (coming soon)</h2>
              <p className="text-sm text-zinc-600">
                Honor someone special with a $0.99 digital candle and dedication.
                This will appear on your profile or meditation journal.
              </p>
              <button
                disabled
                className="mt-3 rounded-lg px-3 py-2 border text-zinc-400 cursor-not-allowed"
              >
                Coming after Stripe setup
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}

/** Simple scheduler that creates a personal signup row now; later we can sync with your calendar/events */
function ScheduleBlock() {
  const [startISO, setStartISO] = useState<string>("");
  const [minutes, setMinutes] = useState<number>(15);
  const [ok, setOk] = useState<string | null>(null);

  async function schedule() {
    setOk(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (!startISO) {
      setOk("Please pick a start time.");
      return;
    }

    const { error } = await supabase.from("meditation_signups").insert({
      user_id: user.id,
      start_at: startISO,
      duration_minutes: minutes,
    });

    setOk(error ? "Something went wrong." : "Scheduled! You’ll see this in your signups.");
  }

  return (
    <div>
      <div className="flex flex-col gap-2">
        <label className="text-sm">
          Start time
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2"
            type="datetime-local"
            value={startISO}
            onChange={(e) => setStartISO(e.target.value)}
          />
        </label>

        <label className="text-sm">
          Duration (minutes)
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2"
            type="number"
            min={5}
            max={240}
            value={minutes}
            onChange={(e) => setMinutes(parseInt(e.target.value || "15", 10))}
          />
        </label>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button onClick={schedule} className="rounded-lg px-3 py-2 bg-brand-500 text-white">
          Save
        </button>
        {ok && <span className="text-sm text-zinc-600">{ok}</span>}
      </div>

      <p className="mt-2 text-xs text-zinc-500">
        Later we can auto-create a personal calendar event + notification.
      </p>
    </div>
  );
}
