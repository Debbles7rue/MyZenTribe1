// app/meditation/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import './meditation.css';

type Environment = 'room' | 'beach' | 'lake' | 'creek' | 'abstract' | 'candles';
type SoundOpt = 'nature' | 'frequencies' | 'none';

type Candle = {
  id?: string;
  name: string;
  color: string;
  lit_at: string;
  expires_at: string;
};

const ENV_LABEL: Record<Environment, string> = {
  room: 'Sacred Room',
  beach: 'Stunning Beach',
  lake: 'Peaceful Lake',
  creek: 'Forest Creek',
  abstract: 'Meditative Patterns',
  candles: 'Light a candle for loved ones', // ⬅️ updated label
};

const SOUND_LABEL: Record<SoundOpt, string> = {
  nature: 'Nature sounds',
  frequencies: 'Frequencies',
  none: 'No sound',
};

function getAudioSrc(env: Environment, sound: SoundOpt): string | null {
  if (sound === 'none') return null;
  if (sound === 'frequencies') return '/sounds/528hz.mp3';
  switch (env) {
    case 'room':     return '/sounds/fountain.mp3';
    case 'beach':    return '/sounds/waves.mp3';
    case 'lake':     return '/sounds/lake.mp3';
    case 'creek':    return '/sounds/creek.mp3';
    case 'candles':  return '/sounds/wind.mp3';
    case 'abstract': return '/sounds/wind.mp3';
    default:         return null;
  }
}

export default function MeditationPage() {
  const [env, setEnv] = useState<Environment>('room');
  const [sound, setSound] = useState<SoundOpt>('nature');

  const [doorOpen, setDoorOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const [hideDoor, setHideDoor] = useState(false);

  const [soundOn, setSoundOn] = useState(true);
  const [volume, setVolume] = useState(0.4);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioSrc = useMemo(() => getAudioSrc(env, sound), [env, sound]);

  const [nowCount, setNowCount] = useState(0);
  const [dayCount, setDayCount] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [showMore, setShowMore] = useState(false);

  const [candles, setCandles] = useState<Candle[]>([]);
  const [showCandleForm, setShowCandleForm] = useState(false);
  const [candleName, setCandleName] = useState('');
  const [candleColor, setCandleColor] =
    useState<'gold'|'white'|'rose'|'blue'|'green'>('gold');

  useEffect(() => {
    if (!localStorage.getItem('mz_anon_id')) {
      localStorage.setItem('mz_anon_id', crypto.randomUUID());
    }
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
    if (soundOn && entered && audioSrc) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [soundOn, entered, volume, audioSrc]);

  useEffect(() => {
    let t: NodeJS.Timeout | null = null;
    const fetchStats = async () => {
      const now = new Date();
      const activeSince = new Date(now.getTime() - 90 * 1000);
      const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const { count: activeCount } = await supabase
        .from('meditation_sessions')
        .select('*', { count: 'exact', head: true })
        .is('ended_at', null)
        .gte('last_ping', activeSince.toISOString());

      const { count: lastDay } = await supabase
        .from('meditation_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('started_at', since24h.toISOString());

      setNowCount(activeCount ?? 0);
      setDayCount(lastDay ?? 0);
    };

    fetchStats();
    t = setInterval(fetchStats, 15000);
    return () => { if (t) clearInterval(t); };
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const beat = async () => {
      await supabase.from('meditation_sessions')
        .update({ last_ping: new Date().toISOString() })
        .eq('id', sessionId);
    };
    const h = setInterval(beat, 30000);
    return () => clearInterval(h);
  }, [sessionId]);

  useEffect(() => {
    if (env !== 'candles') return;
    (async () => {
      try {
        const nowIso = new Date().toISOString();
        const { data, error } = await supabase
          .from('candles')
          .select('id,name,color,lit_at,expires_at')
          .gt('expires_at', nowIso)
          .order('lit_at', { ascending: false })
          .limit(120);
        if (!error && data) {
          setCandles(
            data.map((d: any) => ({
              id: d.id,
              name: d.name ?? 'Beloved',
              color: d.color ?? 'gold',
              lit_at: d.lit_at ?? nowIso,
              expires_at: d.expires_at ?? nowIso,
            }))
          );
        }
      } catch {
        // table might not exist yet — ignore
      }
    })();
  }, [env]);

  async function startSession() {
    setDoorOpen(true);

    const anon_id = localStorage.getItem('mz_anon_id') || null;
    const { data: userData } = await supabase.auth.getUser().catch(() => ({ data: null as any }));
    const uid = userData?.user?.id ?? null;

    const { data, error } = await supabase
      .from('meditation_sessions')
      .insert({ user_id: uid, anon_id, environment: env, sound })
      .select('id')
      .single();

    if (error) {
      alert(`Could not start session: ${error.message}`);
      setDoorOpen(false);
      return;
    }
    setSessionId(data?.id ?? null);

    setTimeout(() => setEntered(true), 900);
    setTimeout(() => setHideDoor(true), 1200);
  }

  async function endSession() {
    if (sessionId) {
      await supabase
        .from('meditation_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', sessionId);
    }
    setSessionId(null);
    setEntered(false);
    setHideDoor(false);
    setDoorOpen(false);
  }

  async function addCandle() {
    if (!candleName.trim()) {
      alert('Please enter a name for the candle.');
      return;
    }

    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const optimistic: Candle = {
      name: candleName.trim(),
      color: candleColor,
      lit_at: now.toISOString(),
      expires_at: in7.toISOString(),
    };
    setCandles((cs) => [optimistic, ...cs]);
    setShowCandleForm(false);
    setCandleName('');

    try {
      const anon_id = localStorage.getItem('mz_anon_id') || null;
      const { data: u } = await supabase.auth.getUser().catch(() => ({ data: null as any }));
      const user_id = u?.user?.id ?? null;

      await supabase.from('candles').insert({
        name: optimistic.name,
        color: optimistic.color,
        lit_at: optimistic.lit_at,
        expires_at: optimistic.expires_at,
        user_id,
        anon_id,
      });
    } catch {
      // keep optimistic candle if save fails
    }
  }

  return (
    <div className="mz-page">
      <h1 className="mz-title">Enter the Sacred Space</h1>

      {/* Top sandy banner */}
      <section className="mz-info top">
        <p className="lead">
          When many people meditate together, our nervous systems entrain,
          stress drops, and compassion rises. Our aim is to keep a gentle wave
          of presence moving around the globe—<strong>24/7</strong>.
        </p>
        <button className="mz-link" onClick={() => setShowMore(s => !s)}>
          {showMore ? 'Hide background & studies' : 'Learn more about collective meditation'}
        </button>
        {showMore && (
          <ul className="mz-links">
            <li>On group meditation and heart-rate variability coherence (overview)</li>
            <li>Studies exploring decreased stress/crime during large meditation events</li>
            <li>Simple nervous-system science of why sitting together feels different</li>
          </ul>
        )}
      </section>

      {/* Options + tracker */}
      <section className="mz-top">
        <div className="mz-top-grid">
          <div className="mz-option-block">
            <div className="mz-label">Environment</div>
            <div className="mz-cards">
              {(['room','beach','lake','creek','abstract','candles'] as Environment[]).map(k => (
                <button
                  key={k}
                  onClick={() => { if (!entered) setEnv(k); }}
                  className={`mz-card ${env === k ? 'active' : ''} ${k}`}
                  aria-pressed={env === k}
                  disabled={entered}
                >
                  <span>{ENV_LABEL[k]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mz-option-block">
            <div className="mz-label">Sound</div>
            <div className="mz-chips">
              {(Object.keys(SOUND_LABEL) as SoundOpt[]).map(k => (
                <button
                  key={k}
                  onClick={() => { if (!entered) setSound(k); }}
                  className={`mz-chip ${sound === k ? 'on' : ''}`}
                  aria-pressed={sound === k}
                  disabled={entered}
                >
                  {SOUND_LABEL[k]}
                </button>
              ))}
            </div>

            <div className="mz-inline-controls">
              <button
                className={`mz-chip ${soundOn ? 'on' : ''}`}
                onClick={() => setSoundOn(s => !s)}
                aria-pressed={soundOn}
              >
                {soundOn ? 'Sound: On' : 'Sound: Off'}
              </button>
              <label className="mz-chip mz-volume">
                Volume
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  aria-label="Volume"
                />
              </label>
            </div>

            <div className="mz-actions">
              {!entered ? (
                <button className="mz-enter-btn big" onClick={startSession}>Enter</button>
              ) : (
                <button className="mz-enter-btn" onClick={endSession}>End session</button>
              )}
            </div>
          </div>

          <div className="mz-stats">
            <div className="stat">
              <div className="n">{nowCount}</div>
              <div className="t">meditating now</div>
            </div>
            <div className="stat">
              <div className="n">{dayCount}</div>
              <div className="t">in the last 24 hours</div>
            </div>
          </div>
        </div>
      </section>

      {/* Scene */}
      <section className="mz-scene-shell">
        <div className={`mz-scene ${entered ? 'entered' : ''}`}>
          <div className="mz-aura" />

          {/* DOOR with candles */}
          {!hideDoor && (
            <div className={`mz-door ${doorOpen ? 'is-open' : ''}`}>
              <div className="mz-ancient">ENTER THE SACRED SPACE</div>
              <div className="mz-door-panel left" />
              <div className="mz-door-panel right" />
              {/* NEW: candle sconces on the door */}
              <div className="mz-door-candles">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="dc"><Candle height="mid" /></div>
                ))}
              </div>
            </div>
          )}

          {env === 'room' && <SacredRoom />}
          {env === 'beach' && <BeachScene />}
          {env === 'lake' && <LakeScene />}
          {env === 'creek' && <CreekScene />}
          {env === 'abstract' && <AbstractScene />}
          {env === 'candles' && (
            <CandleTributeScene
              candles={candles}
              onAddRequest={() => setShowCandleForm(true)}
            />
          )}

          <div className="mz-session-hud">
            {entered && (
              <>
                <div className="mz-chip muted">{ENV_LABEL[env]}</div>
                <div className="mz-chip muted">{SOUND_LABEL[sound]}</div>
              </>
            )}
          </div>

          <audio ref={audioRef} src={audioSrc ?? undefined} preload="none" loop />
        </div>

        {env === 'candles' && showCandleForm && (
          <div className="mz-candle-form">
            <div className="card">
              <h3>Light a Candle</h3>
              <label className="lbl">Name on candle</label>
              <input
                className="input"
                value={candleName}
                onChange={(e) => setCandleName(e.target.value)}
                placeholder="e.g., Grandma Rose"
                maxLength={60}
              />

              <label className="lbl">Candle color</label>
              <div className="color-row">
                {(['gold','white','rose','blue','green'] as const).map(c => (
                  <button
                    key={c}
                    className={`chip ${c === candleColor ? 'on' : ''} ${c}`}
                    onClick={() => setCandleColor(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <div className="row">
                <button className="btn" onClick={() => setShowCandleForm(false)}>Cancel</button>
                <button className="btn brand" onClick={addCandle}>Place candle</button>
              </div>
              <p className="hint">Candles glow for 7 days.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ===== Scenes ===== */
function SacredRoom() {
  return (
    <>
      <div className="mz-shelf top" />
      <div className="mz-shelf mid" />
      <div className="mz-candle-row shelf-top">
        {Array.from({ length: 7 }).map((_, i) => <Candle key={`st-${i}`} height="short" />)}
      </div>
      <div className="mz-candle-row shelf-mid">
        {Array.from({ length: 5 }).map((_, i) => <Candle key={`sm-${i}`} height="tall" />)}
      </div>
      <div className="mz-candle-floor">
        {Array.from({ length: 9 }).map((_, i) => <Candle key={`f-${i}`} height={i % 3 === 0 ? 'tall' : 'mid'} />)}
      </div>
      <div className="mz-fountain">
        <div className="pillar" />
        <div className="stream s1" />
        <div className="stream s2" />
        <div className="stream s3" />
        <div className="ripple r1" />
        <div className="ripple r2" />
        <div className="ripple r3" />
      </div>
    </>
  );
}

function BeachScene() {
  return (
    <div className="mz-beach">
      <div className="sky" />
      <div className="sun" />
      <div className="sea">
        <div className="wave w1" />
        <div className="wave w2" />
        <div className="wave w3" />
      </div>
      <div className="sand" />
    </div>
  );
}

function LakeScene() {
  return (
    <div className="mz-lake">
      <div className="mist" />
      <div className="water">
        <div className="ripple r1" />
        <div className="ripple r2" />
        <div className="ripple r3" />
      </div>
      <div className="mounts" />
    </div>
  );
}

function CreekScene() {
  return (
    <div className="mz-creek">
      <div className="trees" />
      <div className="stream">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className={`flow f${i}`} />)}
      </div>
    </div>
  );
}

function AbstractScene() {
  return (
    <div className="mz-abstract">
      <div className="swirl s1" />
      <div className="swirl s2" />
      <div className="swirl s3" />
      <div className="swirl s4" />
    </div>
  );
}

function Candle({ height = 'mid' as 'short' | 'mid' | 'tall' }) {
  return (
    <div className={`mz-candle ${height}`}>
      <div className="wax" />
      <div className="flame">
        <span className="core" />
        <span className="glow" />
      </div>
      <div className="halo" />
    </div>
  );
}

function CandleTributeScene({
  candles,
  onAddRequest,
}: {
  candles: Candle[];
  onAddRequest: () => void;
}) {
  return (
    <div className="mz-candlewall">
      <div className="stars" />
      <div className="sconces">
        <div className="sconce"><Candle height="mid" /></div>
        <div className="sconce"><Candle height="mid" /></div>
      </div>

      <div className="wall-grid">
        {candles.map((c, i) => (
          <div key={(c.id ?? 'local') + i} className={`tribute ${c.color}`}>
            <div className="name">{c.name}</div>
            <div className="holder"><Candle height="short" /></div>
          </div>
        ))}
      </div>

      <button className="mz-enter-btn add-candle" onClick={onAddRequest}>
        Light a candle
      </button>
    </div>
  );
}
