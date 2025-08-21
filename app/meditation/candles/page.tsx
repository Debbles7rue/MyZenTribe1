"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

/** DB shape (for reference)
create table if not exists public.candle_offerings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default 'white',
  message text,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
-- Recommended index for sorting/filters:
-- create index if not exists candle_offerings_created_at_idx on public.candle_offerings(created_at desc);
-- create index if not exists candle_offerings_expires_at_idx on public.candle_offerings(expires_at);
**/

type Candle = {
  id: string;
  name: string;
  color: string;        // 'white' | 'gold' | 'rose' | 'azure' | 'violet' | 'emerald'
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

    // Filter out expired on the server:
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

  // Initial load
  useEffect(() => {
    loadCandles({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: listen for inserts and prepend if within current filters
  useEffect(() => {
    const channel = supabase
      .channel("candle_offerings_rt")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "candle_offerings" },
        (payload) => {
          const row = payload.new as Candle;
          // If new candle is not expired, show it on top
          if (!row.expires_at || new Date(row.expires_at) > new Date()) {
            setCandles((cur) => {
              // Avoid duplicates if the poster’s UI already added it
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
    <div className="candle-page-wrap">
      <div className="candle-page">
        <header className="candle-header">
          <div className="title">
            <h1 className="h1">Light a Candle for Loved Ones</h1>
            <p className="muted">
              Offer a name and intention. Candles gently flicker on this wall.
            </p>
          </div>
          <div className="actions">
            <Link href="/meditation" className="btn">← Back to Meditation</Link>
            <button className="btn" onClick={() => loadCandles({ reset: true })}>
              Refresh
            </button>
            <button className="btn btn-brand" onClick={() => setShowAdd(true)}>
              + Add a candle
            </button>
          </div>
        </header>

        <section className="candle-wall card" aria-live="polite">
          {loading && candles.length === 0 ? (
            <div className="center muted">Loading candles…</div>
          ) : candles.length === 0 ? (
            <div className="center muted">Be the first to light a candle.</div>
          ) : (
            <>
              <ul className="wall-grid">
                {candles.map((c) => (
                  <li key={c.id} className="wall-item">
                    <CandleVisual name={c.name} colorKey={c.color} message={c.message} />
                  </li>
                ))}
              </ul>

              <div className="load-more">
                {hasMore ? (
                  <button
                    className="btn"
                    onClick={handleLoadMore}
                    disabled={loading}
                    aria-label="Load more candles"
                  >
                    {loading ? "Loading…" : "Load More"}
                  </button>
                ) : (
                  <div className="muted center" style={{ paddingTop: 8 }}>
                    You’ve reached the end.
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
            // Prepend immediately; realtime will de-dupe if necessary
            setCandles((cur) => [newCandle, ...cur]);
          }}
        />
      )}

      <style jsx global>{`
        .candle-page-wrap { padding: 24px; }
        .candle-page { max-width: 1100px; margin: 0 auto; }
        .h1 { font-size: 28px; letter-spacing: 0.02em; }
        .muted { opacity: 0.72; }
        .card {
          background: #faf7f1;
          border: 1px solid #e7e0d2;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 10px 30px rgba(60, 40, 10, 0.06) inset;
        }
        .candle-header {
          display: flex; gap: 16px; align-items: center; justify-content: space-between;
          margin-bottom: 16px;
        }
        .candle-header .title { display: grid; gap: 4px; }
        .actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .btn {
          appearance: none;
          border: 1px solid #dfd6c4;
          background: linear-gradient(#fff, #f5efe6);
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 14px;
          cursor: pointer;
        }
        .btn:hover { filter: brightness(0.98); }
        .btn-brand {
          border-color: #d8c49b;
          background: linear-gradient(#ffe9be, #f7dca6);
          box-shadow: 0 2px 6px rgba(150, 110, 20, 0.15);
        }
        .center { text-align: center; padding: 28px 0; }
        .candle-wall { min-height: 280px; }
        .wall-grid {
          list-style: none; padding: 0; margin: 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 20px;
        }
        .wall-item { display: grid; place-items: center; padding: 8px 4px 16px; }

        /* Candle rendering */
        .candle {
          position: relative; width: 70px; height: 150px; border-radius: 14px;
          box-shadow: inset 0 4px 18px rgba(0,0,0,.15), 0 6px 18px rgba(60,40,10,.08);
          display: grid; place-items: center;
        }
        .wick {
          position: absolute; top: 14px; width: 3px; height: 10px; border-radius: 2px; background: #43342a;
        }
        .flame {
          position: absolute; top: -6px; width: 18px; height: 28px;
          border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
          background: radial-gradient(ellipse at 50% 40%,
            #fff7ad 0%, #ffd166 42%, #ff8c3b 75%, rgba(255,140,59,0) 80%);
          filter: blur(0.3px) drop-shadow(0 0 6px #ffcc66);
          animation: flicker 1.8s infinite ease-in-out;
          transform-origin: 50% 100%;
        }
        @keyframes flicker {
          0%   { transform: translateY(0) scale(1);   opacity: 0.96; }
          25%  { transform: translateY(-1px) scale(1.03) rotate(-1.5deg); opacity: 0.92; }
          50%  { transform: translateY(0) scale(0.98) rotate(1deg); opacity: 1; }
          75%  { transform: translateY(-1px) scale(1.04) rotate(-0.5deg); opacity: 0.94; }
          100% { transform: translateY(0) scale(1);   opacity: 0.97; }
        }
        .candle-label { margin-top: 10px; text-align: center; max-width: 160px; }
        .candle-name { font-weight: 600; font-size: 13px; }
        .candle-message { font-size: 12px; opacity: 0.7; margin-top: 2px; white-space: pre-wrap; }

        .load-more { display: grid; place-items: center; padding-top: 10px; }

        /* Modal */
        .overlay { position: fixed; inset: 0; background: rgba(20,12,4,0.4);
          display: grid; place-items: center; z-index: 40; }
        .panel {
          width: min(720px, 92vw); background: #fffdf8; border: 1px solid #eadfca;
          border-radius: 16px; box-shadow: 0 20px 60px rgba(20,10,0,.25); overflow: hidden;
        }
        .panel-head {
          padding: 14px 16px; border-bottom: 1px solid #eadfca;
          display: flex; align-items: center; justify-content: space-between;
        }
        .panel-body { padding: 16px; }
        .panel-foot {
          display: flex; gap: 8px; justify-content: flex-end;
          padding: 12px 16px; border-top: 1px solid #eadfca; background: #fbf6ec;
        }
        .form-grid { display: grid; gap: 12px; grid-template-columns: 1fr; }
        @media (min-width: 720px) {
          .form-grid { grid-template-columns: 1fr 1fr; }
          .span-2 { grid-column: span 2; }
        }
        .label { font-size: 12px; opacity: .7; margin-bottom: 4px; }
        .input, .textarea, .select {
          width: 100%; padding: 10px 12px; background: #fff;
          border: 1px solid #e6dcc6; border-radius: 10px; font-size: 14px;
        }
        .color-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
        .color-chip { border: 2px solid transparent; height: 34px; border-radius: 10px; cursor: pointer; }
        .color-chip.sel { border-color: #b89b62; }
        .help { font-size: 12px; opacity: .7; }
      `}</style>
    </div>
  );
}

/** Candle visual — uses preset colors and a gentle flame animation */
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
    <div className="candle-wrap" aria-label={`${name} candle`}>
      <div className="candle" style={{ background: wax }}>
        <div className="wick" />
        <div className="flame" />
      </div>
      <div className="candle-label">
        <div className="candle-name">{name}</div>
        {message ? <div className="candle-message">{message}</div> : null}
      </div>
    </div>
  );
}

/** Add Candle Modal */
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

  // Close on Esc
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
      alert("Please enter a name.");
      return;
    }

    // simple per-tab spam guard: minimum 8s between posts
    const last = Number(localStorage.getItem("mz_last_candle_ts") || "0");
    const now = Date.now();
    if (now - last < 8000) {
      alert("Thanks! Please wait a few seconds before adding another candle.");
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

    localStorage.setItem("mz_last_candle_ts", String(now));
    onCreated(data as Candle);
  }

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <div style={{ fontWeight: 600 }}>Add a Candle</div>
          <button className="btn" onClick={onClose} aria-label="Close">Close</button>
        </div>

        <div className="panel-body">
          <div className="form-grid">
            <div className="span-2">
              <div className="label">Name to appear under the candle</div>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., In loving memory of…"
                maxLength={60}
              />
              <div className="help">{name.length}/60</div>
            </div>

            <div className="span-2">
              <div className="label">Message (optional)</div>
              <textarea
                className="textarea"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="A short blessing or intention"
                maxLength={240}
              />
              <div className="help">{message.length}/240</div>
            </div>

            <div>
              <div className="label">Candle color</div>
              <div className="color-grid">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    aria-label={c.label}
                    title={c.label}
                    className={`color-chip ${color === c.key ? "sel" : ""}`}
                    style={{ background: c.wax }}
                    onClick={() => setColor(c.key)}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="label">Expiration</div>
              <select
                className="select"
                value={expires}
                onChange={(e) => setExpires(e.target.value as "forever" | "7d" | "30d")}
              >
                <option value="forever">Forever</option>
                <option value="7d">7 days</option>
                <option value="30d">30 days</option>
              </select>
              <div className="help">You can change the strategy later in RLS/admin.</div>
            </div>

            <div className="span-2" />
          </div>
        </div>

        <div className="panel-foot">
          <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-brand" onClick={submit} disabled={saving}>
            {saving ? "Lighting…" : "Light Candle"}
          </button>
        </div>
      </div>
    </div>
  );
}
