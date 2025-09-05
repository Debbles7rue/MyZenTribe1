// app/candles/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type Candle = {
  id: string;
  name: string;
  color: string;
  message: string | null;
  created_at: string;
  expires_at: string | null;
};

const COLOR_PRESETS = [
  { key: "white",   label: "White (Peace)",       wax: "#f7f4ef" },
  { key: "gold",    label: "Gold (Blessings)",    wax: "#f8e3b1" },
  { key: "rose",    label: "Rose (Love)",         wax: "#f7c4c9" },
  { key: "azure",   label: "Azure (Healing)",     wax: "#c5e3ff" },
  { key: "violet",  label: "Violet (Protection)", wax: "#d8c7ff" },
  { key: "emerald", label: "Emerald (Renewal)",   wax: "#cdebd3" },
] as const;

const PAGE_SIZE = 24;

export default function CandleRoomPage() {
  const [loading, setLoading] = useState(true);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);

  async function loadCandles({ reset = false } = {}) {
    setLoading(true);
    const page = reset ? 0 : pageRef.current;
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("candle_offerings")
      .select("*")
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const list = (data ?? []) as Candle[];
    if (reset) {
      setCandles(list);
    } else {
      setCandles((cur) => [...cur, ...list]);
    }
    setHasMore(list.length === PAGE_SIZE);
    if (reset) pageRef.current = 0;
    setLoading(false);
  }

  function handleLoadMore() {
    if (!hasMore || loading) return;
    pageRef.current += 1;
    loadCandles();
  }

  useEffect(() => {
    loadCandles({ reset: true });
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("candle_offerings_rt")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "candle_offerings" },
        (payload) => {
          const row = payload.new as Candle;
          if (!row.expires_at || new Date(row.expires_at) > new Date()) {
            setCandles((cur) => {
              if (cur.some((c) => c.id === row.id)) return cur;
              return [row, ...cur];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-900 mb-2">Memorial Candle Room</h1>
            <p className="text-amber-700 max-w-2xl">
              Light a candle in loving memory of a lost loved one, or send healing light to someone who needs support. 
              Each flame represents love, hope, and the eternal connection we share.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/meditation" className="px-4 py-2 bg-white/60 text-amber-800 rounded-lg hover:bg-white/80 transition-colors border border-amber-200">
              ← Back to Meditation
            </Link>
            <button 
              onClick={() => loadCandles({ reset: true })}
              className="px-4 py-2 bg-white/60 text-amber-800 rounded-lg hover:bg-white/80 transition-colors border border-amber-200"
            >
              Refresh
            </button>
            <button 
              onClick={() => setShowAdd(true)}
              className="px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all font-medium"
            >
              + Light a Candle
            </button>
          </div>
        </header>

        <section className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-amber-200 shadow-lg min-h-96">
          {loading && candles.length === 0 ? (
            <div className="text-center text-amber-700 py-16">
              <div className="animate-pulse text-4xl mb-4">🕯️</div>
              Loading candles...
            </div>
          ) : candles.length === 0 ? (
            <div className="text-center text-amber-700 py-16">
              <div className="text-4xl mb-4">🕯️</div>
              <p>Be the first to light a candle in memory or for healing.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-8">
                {candles.map((c) => (
                  <div key={c.id} className="text-center">
                    <CandleVisual name={c.name} colorKey={c.color} message={c.message} />
                  </div>
                ))}
              </div>

              <div className="text-center">
                {hasMore ? (
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Loading..." : "Load More Candles"}
                  </button>
                ) : (
                  <div className="text-amber-600 py-4">
                    All candles are shown
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {showAdd && (
        <AddCandleModal
          onClose={() => setShowAdd(false)}
          onCreated={(newCandle) => {
            setShowAdd(false);
            setCandles((cur) => [newCandle, ...cur]);
          }}
        />
      )}
    </div>
  );
}

function CandleVisual({
  name,
  colorKey,
  message,
}: {
  name: string;
  colorKey: string;
  message: string | null;
}) {
  const wax = useMemo(() => {
    const found = COLOR_PRESETS.find((c) => c.key === colorKey);
    return found?.wax ?? "#f7f4ef";
  }, [colorKey]);

  return (
    <div className="relative group">
      <div 
        className="w-16 h-32 mx-auto rounded-t-full relative shadow-lg"
        style={{ background: wax }}
      >
        {/* Wick */}
        <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-1 h-2 bg-amber-900 rounded-full" />
        
        {/* Flame */}
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-4 h-6 rounded-full opacity-95"
             style={{
               background: 'radial-gradient(ellipse at center, #ffd27a 0%, #ff9900 60%, transparent 70%)',
               filter: 'blur(0.6px)',
               animation: 'flicker 2.6s infinite ease-in-out',
               boxShadow: '0 0 18px 8px rgba(255, 170, 60, 0.35)'
             }} />
      </div>
      
      <div className="mt-3 max-w-32">
        <div className="font-medium text-sm text-amber-900 mb-1">{name}</div>
        {message && (
          <div className="text-xs text-amber-700 opacity-75 line-clamp-2">{message}</div>
        )}
      </div>

      <style jsx>{`
        @keyframes flicker {
          0%, 100% { transform: translateX(-50%) scale(1) translateY(0); opacity: 0.95; }
          30% { transform: translateX(-52%) scale(1.06) translateY(-1px); opacity: 1; }
          60% { transform: translateX(-49%) scale(0.96) translateY(1px); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}

function AddCandleModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (c: Candle) => void;
}) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [color, setColor] = useState<(typeof COLOR_PRESETS)[number]["key"]>("white");
  const [expires, setExpires] = useState<"forever" | "7d" | "30d">("forever");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function computeExpiresAt(): string | null {
    if (expires === "forever") return null;
    const base = new Date();
    if (expires === "7d") base.setDate(base.getDate() + 7);
    if (expires === "30d") base.setDate(base.getDate() + 30);
    return base.toISOString();
  }

  function sanitize(s: string, max: number) {
    return s.replace(/\s+/g, " ").trim().slice(0, max);
  }

  async function submit() {
    const nm = sanitize(name, 60);
    const msg = sanitize(message, 240);
    if (!nm) {
      alert("Please enter a name or dedication.");
      return;
    }

    setSaving(true);
    const expires_at = computeExpiresAt();

    const { data, error } = await supabase
      .from("candle_offerings")
      .insert([{ name: nm, color, message: msg || null, expires_at }])
      .select("*")
      .single();

    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }

    onCreated(data as Candle);
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-amber-900">Light a Memorial Candle</h3>
          <button onClick={onClose} className="text-amber-600 hover:text-amber-800 text-xl">×</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-amber-800 mb-2">
              In memory of / For healing
            </label>
            <input
              className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., In loving memory of Mom, For healing of..."
              maxLength={60}
            />
            <div className="text-xs text-amber-600 mt-1">{name.length}/60</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-800 mb-2">
              Message or prayer (optional)
            </label>
            <textarea
              className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="A loving message, prayer, or intention..."
              maxLength={240}
            />
            <div className="text-xs text-amber-600 mt-1">{message.length}/240</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-800 mb-2">
              Candle color
            </label>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  title={c.label}
                  className={`h-10 rounded-lg border-2 transition-all ${
                    color === c.key ? "border-amber-500 ring-2 ring-amber-400/50" : "border-amber-200 hover:border-amber-300"
                  }`}
                  style={{ background: c.wax }}
                  onClick={() => setColor(c.key)}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-800 mb-2">
              Duration
            </label>
            <select
              className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              value={expires}
              onChange={(e) => setExpires(e.target.value as "forever" | "7d" | "30d")}
            >
              <option value="forever">Eternal flame</option>
              <option value="30d">30 days</option>
              <option value="7d">7 days</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button 
            onClick={onClose} 
            disabled={saving}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={submit} 
            disabled={saving}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all font-medium"
          >
            {saving ? "Lighting..." : "Light Candle ($0.99)"}
          </button>
        </div>
      </div>
    </div>
  );
}
