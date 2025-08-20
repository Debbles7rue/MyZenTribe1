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
  candles: 'Candles for Loved Ones',
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

  // anonymous id used for sessions/candles if not logged in
  useEffect(() => {
    if (!localStorage.getItem('mz_anon_id')) {
      localStorage.setItem('mz_anon_id', crypto.randomUUID());
    }
  }, []);

  // audio engine
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

  // stats
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

  // load tribute candles if that room is selected
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
        // table may not exist yet — fail silently
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
      {/* Title */}
      <h1 className="mz-title">Enter the Sacred Space</h1>

      {/* NEW: Gentle sandy info banner at the very top */}
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
                  classN
