"use client";

/**
 * Meditation / Prayer Room
 *
 * Visual intention:
 * - Enter through a calm "doorway" animation
 * - Lavender hues, soft glow, protective watermark (global)
 * - Sacred, serene: candles + indoor fountain with gentle audio
 *
 * Embedded blessing:
 * "My intention for this site is to bring people together for community, love, support, and fun.
 *  I draw in light from above to dedicate this work for the collective spread of healing, love,
 *  and new opportunities that will enrich the lives of many. I send light, love, and protection
 *  to every user who joins. May this bring hope and inspiration to thousands, if not millions,
 *  around the world. And so it is done, and so it is done."
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { TribePulse } from "@/components/meditation/TribePulse";
import { CandleRoom } from "@/components/meditation/CandleRoom";
import { Fountain } from "@/components/meditation/Fountain";

type SessionRow = { id: string; started_at: string; ended_at: string | null };

function cls(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export default function MeditationPrayerRoom() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [doorOpen, setDoorOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<SessionRow | null>(null);
  const [isAnon, setIsAnon] = useState(true);
  const [mins, setMins] = useState(15);
  const [endAt, setEndAt] = useState<Date | null>(null);
  const [intention, setIntention] = useState("");
  const [intentionSaved, setIntentionSaved] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      setLoading(false);

      if (user?.id) {
        // find ongoing session
        const { data } = await supabase
          .from("meditation_sessions")
          .select("*")
          .eq("user_id", user.id)
          .is("ended_at", null)
          .order("started_at", { ascending: false })
          .limit(1);
        if (data?.length) setActiveSession(data[0]);
      }
    })();
  }, []);

  async function startSession() {
    if (!userId) return;
    const { data, error } = await supabase
      .from("meditation_sessions")
      .insert({ user_id: userId, is_anonymous: isAnon })
      .select("*")
      .single();
    if (!error && data) {
      setActiveSession(data);
      setEndAt(new Date(Date.now() + mins * 60_000));
    }
  }

  async function stopSession() {
    if (!activeSession) return;
    await supabase
      .from("meditation_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", activeSession.id);
    setActiveSession(null);
    setEndAt(null);
  }

  // timer auto-stop
  useEffect(() => {
    if (!endAt || !activeSession) return;
    const t = setInterval(() => {
      if (Date.now() >= endAt.getTime()) stopSession();
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endAt, activeSession]);

  async function saveIntention() {
    setIntentionSaved(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !intention.trim()) {
      setIntentionSaved("Please enter an intention.");
      return;
    }
    const { error } = await supabase
      .from("meditation_intentions")
      .insert({ user_id: user.id, text: intention.trim(), is_private: true });
    setIntentionSaved(error ? "Something went wrong." : "Saved privately.");
    if (!error) setIntention("");
  }

  const bgClass = useMemo(
    () => "bg-gradient-to-b from-purple-100 via-violet-100 to-rose-100",
    []
  );

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
          <h1 className="text-2xl font-semibold mb-2">Meditation / Prayer Room</h1>
          <p className="text-zinc-600 mb-4">Sign in to step into the quiet.</p>
          <Link href="/login" className="inline-block rounded-lg px-4 py-2 bg-brand-500 text-white">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={cls("min-h-[100vh] pb-24", bgClass)}>
      {/* Door overlay */}
      {!doorOpen && <Doorway onEnter={() => setDoorOpen(true)} />}

      <div className={cls("mx-auto max-w-6xl px-4 pt-10 transition-opacity", doorOpen ? "opacity-100" : "opacity-0")}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">Meditation / Prayer Room</h1>
            <p className="text-sm text-zinc-600">
              A sacred, quiet space. May peace meet you here.
            </p>
          </div>
          <div className="sm:min-w-[320px]"><TribePulse /></div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Meditate/Pray */}
          <section className="rounded-2xl bg-white/90 shadow p-5">
            <h2 className="font-medium mb-3">Meditate / Pray</h2>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isAnon} onChange={(e) => setIsAnon(e.target.checked)} />
              Meditate anonymously
            </label>

            <div className="mt-3">
              <div className="text-sm mb-1">Timer</div>
              <div className="flex flex-wrap gap-2">
                {[10,15,20,30,45,60].map(m => (
                  <button key={m} onClick={() => setMins(m)}
                    className={cls("px-3 py-1 rounded-lg border", mins===m ? "bg-brand-500 text-white border-brand-500" : "bg-white")}>
                    {m}m
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3">
                {!activeSession ? (
                  <button onClick={startSession} className="rounded-lg px-4 py-2 bg-emerald-600 text-white">Start</button>
                ) : (
                  <button onClick={stopSession} className="rounded-lg px-4 py-2 bg-rose-600 text-white">Stop</button>
                )}
                <span className="text-xs text-zinc-600">
                  {activeSession ? (endAt ? "Ends soon" : "Live") : "Ready"}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-medium mb-1">Intention (private)</h3>
              <textarea
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 min-h-28"
                placeholder="Write a quiet intention or prayer…"
              />
              <div className="mt-2 flex items-center gap-3">
                <button onClick={saveIntention} className="rounded-lg px-3 py-2 bg-brand-500 text-white">Save</button>
                {intentionSaved && <span className="text-sm text-zinc-600">{intentionSaved}</span>}
              </div>
            </div>
          </section>

          {/* Middle: Candle Room */}
          <section className="rounded-2xl bg-white/90 shadow p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-medium mb-3">Candle Room</h2>
              <span className="text-xs text-zinc-500">Purchases later via Stripe</span>
            </div>
            <CandleRoom />
            <button
              disabled
              className="mt-4 w-full rounded-lg border text-zinc-400 cursor-not-allowed px-3 py-2"
              title="Coming soon after Stripe setup"
            >
              Light a Candle ($0.99) — coming soon
            </button>
          </section>

          {/* Right: Fountain */}
          <section className="rounded-2xl bg-white/90 shadow p-5">
            <h2 className="font-medium mb-3">Fountain</h2>
            <Fountain />
            <p className="mt-2 text-xs text-zinc-500">
              Audio file path: <code>/public/audio/fountain.mp3</code> (add later to hear the water).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function Doorway({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-[min(680px,90vw)] h-[380px]">
        <div className="absolute inset-0 flex">
          <div className="flex-1 door-panel left" />
          <div className="flex-1 door-panel right" />
        </div>
        <button
          onClick={onEnter}
          className="absolute left-1/2 -translate-x-1/2 bottom-6 rounded-full px-5 py-2 bg-amber-200/90 hover:bg-amber-300 text-zinc-900 shadow"
        >
          Enter
        </button>
      </div>

      <style jsx>{`
        .door-panel {
          border-radius: 12px;
          box-shadow: inset 0 0 0 2px rgba(0,0,0,0.15), 0 20px 60px rgba(0,0,0,0.35);
          background-image:
            linear-gradient(90deg, rgba(255,255,255,0.06), rgba(0,0,0,0.06)),
            linear-gradient(180deg, #c4a2ff, #a98df5, #8e79ea);
        }
        .door-panel.left { margin-right: 4px; }
        .door-panel.right { margin-left: 4px; }
      `}</style>
    </div>
  );
}
