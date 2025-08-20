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

// Map chosen env+sound -> audio file path (optional assets)
function getAudioSrc(env: Environment, sound: SoundOpt): string | null {
  if (sound === 'none') return null;
  if (sound === 'frequencies') return '/sounds/528hz.mp3';
  // nature sounds per environment
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
  // selections before entering
  const [env, setEnv] = useState<Environment>('room');
  const [sound, setSound] = useState<SoundOpt>('nature');

  // door/entry
  const [entered, setEntered] = useState(false);

  // audio
  const [soundOn, setSoundOn] = useState(true);
  const [volume, setVolume] = useState(0.4);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // tracker stats
  const [nowCount, setNowCount] = useState<number>(0);
  const [dayCount, setDayCount] = useState<number>(0);

  // current session id for heartbeat/end
  const [sessionId, setSessionId] = useState<string | null>(null);

  // stable device key for anonymous tracking
  useEffect(() => {
    if (!localStorage.getItem('mz_anon_id')) {
      localStorage.setItem('mz_anon_id', crypto.randomUUID());
    }
  }, []);

  const audioSrc = useMemo(() => getAudioSrc(env, sound), [env, sound]);

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

  // stats poller (every 15s)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    const fetchStats = async () => {
      const now = new Date();
      const activeSince = new Date(now.getTime() - 90 * 1000); // 90s heartbeat
      const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // current active
      const { count: activeCount } = await supabase
        .from('meditation_sessions')
        .select('*', { count: 'exact', head: true })
        .is('ended_at', null)
        .gte('last_ping', activeSince.toISOString());
      setNowCount(activeCount ?? 0);

      // last 24h started
      const { count: lastDay } = await supabase
        .from('meditation_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('started_at', since24h.toISOString());
      setDayCount(lastDay ?? 0);
    };

    fetchStats();
    timer = setInterval(fetchStats, 15000);
    return () => { if (timer) clearInterval(timer); };
  }, []);

  // heartbeat while in session (every 30s)
  useEffect(() => {
    if (!sessionId) return;
    let hb: NodeJS.Timeout | null = null;
    const beat = async () => {
      await supabase
        .from('meditation_sessions')
        .update({ last_ping: new Date().toISOString() })
        .eq('id', sessionId);
    };
    hb = setInterval(beat, 30000);
    return () => { if (hb) clearInterval(hb); };
  }, [sessionId]);

  async function startSession() {
    // prepare row
    const anon_id = localStorage.getItem('mz_anon_id') || null;
    const { data: userData } = await supabase.auth.getUser().catch(() => ({ data: null as any }));
    const uid = userData?.user?.id ?? null;

    const { data, error } = await supabase
      .from('meditation_sessions')
      .insert({
        user_id: uid,
        anon_id,
        environment: env,
        sound,
      })
      .select('id')
      .single();

    if (error) {
      alert(`Could not start session: ${error.message}`);
      return;
    }
    setSessionId(data?.id ?? null);
    setEntered(true);
    // kick audio on first user gesture
    setTimeout(() => {
      if (soundOn && audioRef.current && audioSrc) {
        audioRef.current.play().catch(() => {});
      }
    }, 50);
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
  }

  return (
    <div className="mz-room">
      {/* DOOR & OPTIONS */}
      {!entered && (
        <div className="mz-door-screen">
          <div className="mz-landing-grid">
            {/* Left: Awe-inspiring door */}
            <div className="mz-door">
              <div className="mz-ancient">enter the sacred space</div>
              <div className="mz-door-panel left" />
              <div className="mz-door-panel right" />
            </div>

            {/* Right: Options + tracker */}
            <div className="mz-panel">
              <div className="mz-panel-title">Choose your setting</div>

              <div className="mz-option-group">
                <div className="mz-label">Environment</div>
                <div className="mz-cards">
                  {(Object.keys(ENV_LABEL) as Environment[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => setEnv(k)}
                      className={`mz-card ${env === k ? 'active' : ''} ${k}`}
                      aria-pressed={env === k}
                    >
                      <span>{ENV_LABEL[k]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mz-option-group">
                <div className="mz-label">Sound</div>
                <div className="mz-chips">
                  {(Object.keys(SOUND_LABEL) as SoundOpt[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => setSound(k)}
                      className={`mz-chip ${sound === k ? 'on' : ''}`}
                      aria-pressed={sound === k}
                    >
                      {SOUND_LABEL[k]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mz-controls">
                <button className="mz-enter-btn big" onClick={startSession}>
                  Enter
                </button>

                <div className="mz-inline-controls">
                  <button
                    className={`mz-chip ${soundOn ? 'on' : ''}`}
                    onClick={() => setSoundOn((s) => !s)}
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
                      aria-label="Fountain volume"
                    />
                  </label>
                </div>
              </div>

              {/* Tracker */}
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

              <div className="mz-door-blessing">
                Step through with love. You are safe, you are held, you are home.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCENES */}
      <div className="mz-scene">
        {/* Ambient aura */}
        <div className="mz-aura" />

        {env === 'room' && <SacredRoom />}
        {env === 'beach' && <BeachScene />}
        {env === 'lake' && <LakeScene />}
        {env === 'creek' && <CreekScene />}
        {env === 'abstract' && <AbstractScene />}

        {/* In-session HUD */}
        {entered && (
          <div className="mz-session-hud">
            <button className="mz-chip" onClick={endSession}>End session</button>
            <div className="mz-chip muted">{ENV_LABEL[env]}</div>
            <div className="mz-chip muted">{SOUND_LABEL[sound]}</div>
          </div>
        )}

        {/* Audio element (optional files) */}
        <audio ref={audioRef} src={audioSrc ?? undefined} preload="none" loop />
      </div>
    </div>
  );
}

/* ===== Scenes ===== */

function SacredRoom() {
  return (
    <>
      {/* Shelves */}
      <div className="mz-shelf top" />
      <div className="mz-shelf mid" />

      {/* Candles on shelves */}
      <div className="mz-candle-row shelf-top">
        {Array.from({ length: 7 }).map((_, i) => <Candle key={`st-${i}`} height="short" />)}
      </div>
      <div className="mz-candle-row shelf-mid">
        {Array.from({ length: 5 }).map((_, i) => <Candle key={`sm-${i}`} height="tall" />)}
      </div>

      {/* Floor candles */}
      <div className="mz-candle-floor">
        {Array.from({ length: 9 }).map((_, i) => <Candle key={`f-${i}`} height={i % 3 === 0 ? 'tall' : 'mid'} />)}
      </div>

      {/* Fountain */}
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
