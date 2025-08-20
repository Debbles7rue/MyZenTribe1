// app/meditation/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import './meditation.css';

type Environment = 'room' | 'beach' | 'lake' | 'creek' | 'abstract';
type SoundOpt = 'nature' | 'frequencies' | 'none';

const ENV_LABEL: Record<Environment, string> = {
  room: 'Sacred Room',
  beach: 'Stunning Beach',
  lake: 'Peaceful Lake',
  creek: 'Forest Creek',
  abstract: 'Meditative Patterns',
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
    case 'room': return '/sounds/fountain.mp3';
    case 'beach': return '/sounds/waves.mp3';
    case 'lake': return '/sounds/lake.mp3';
    case 'creek': return '/sounds/creek.mp3';
    case 'abstract': return '/sounds/wind.mp3';
    default: return null;
  }
}

export default function MeditationPage() {
  // selections
  const [env, setEnv] = useState<Environment>('room');
  const [sound, setSound] = useState<SoundOpt>('nature');

  // door / scene
  const [doorOpen, setDoorOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const [hideDoor, setHideDoor] = useState(false);

  // audio
  const [soundOn, setSoundOn] = useState(true);
  const [volume, setVolume] = useState(0.4);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioSrc = useMemo(() => getAudioSrc(env, sound), [env, sound]);

  // tracker stats
  const [nowCount, setNowCount] = useState(0);
  const [dayCount, setDayCount] = useState(0);

  // session id
  const [sessionId, setSessionId] = useState<string | null>(null);

  // info toggle
  const [showMore, setShowMore] = useState(false);

  // anon id
  useEffect(() => {
    if (!localStorage.getItem('mz_anon_id')) {
      localStorage.setItem('mz_anon_id', crypto.randomUUID());
    }
  }, []);

  // audio control
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

  // stats poller
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

  // heartbeat
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

  return (
    <div className="mz-page">
      {/* TOP: options & tracker */}
      <section className="mz-top">
        <h1 className="mz-title">Enter the Sacred Space</h1>

        <div className="mz-top-grid">
          <div className="mz-option-block">
            <div className="mz-label">Environment</div>
            <div className="mz-cards">
              {(Object.keys(ENV_LABEL) as Environment[]).map(k => (
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

      {/* MIDDLE: big door/room */}
      <section className="mz-scene-shell">
        <div className={`mz-scene ${entered ? 'entered' : ''}`}>
          {/* Ambient aura */}
          <div className="mz-aura" />

          {/* Door sits above scene until opened/hidden */}
          {!hideDoor && (
            <div className={`mz-door ${doorOpen ? 'is-open' : ''}`}>
              <div className="mz-ancient">ENTER THE SACRED SPACE</div>
              <div className="mz-door-panel left" />
              <div className="mz-door-panel right" />
            </div>
          )}

          {/* Scene(s) */}
          {env === 'room' && <SacredRoom />}
          {env === 'beach' && <BeachScene />}
          {env === 'lake' && <LakeScene />}
          {env === 'creek' && <CreekScene />}
          {env === 'abstract' && <AbstractScene />}

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
      </section>

      {/* BOTTOM: gentle info */}
      <section className="mz-info">
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
            <li>
              On group meditation and heart-rate variability coherence (overview)
            </li>
            <li>
              Studies exploring decreased crime/stress during large meditation events
            </li>
            <li>
              Simple nervous-system science of why sitting together feels different
            </li>
          </ul>
        )}
      </section>
    </div>
  );
}

/* ===== Scenes ===== */

function SacredRoom() {
  // Candle + fountain room (your candle room lives here)
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
