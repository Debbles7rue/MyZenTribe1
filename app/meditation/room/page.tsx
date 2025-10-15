// app/meditation/room/page.tsx - Updated Version
"use client";

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// Vibrant color backgrounds
const MEDITATION_BACKGROUNDS = [
  { 
    id: 'ocean', 
    name: 'Ocean Waves', 
    gradient: 'from-cyan-500 via-blue-600 to-indigo-700',
    description: 'Deep and calming'
  },
  { 
    id: 'forest', 
    name: 'Forest', 
    gradient: 'from-green-500 via-emerald-600 to-teal-700',
    description: 'Natural tranquility'
  },
  { 
    id: 'lavender', 
    name: 'Lavender Dreams', 
    gradient: 'from-purple-500 via-violet-600 to-fuchsia-700',
    description: 'Peaceful dreams'
  },
  { 
    id: 'sunrise', 
    name: 'Morning Light', 
    gradient: 'from-amber-400 via-orange-500 to-rose-600',
    description: 'New beginnings'
  },
  { 
    id: 'night', 
    name: 'Night Sky', 
    gradient: 'from-indigo-900 via-purple-900 to-violet-950',
    description: 'Deep meditation'
  },
];

// Working meditation sounds (Drum/Flute removed)
const AMBIENT_SOUNDS = [
  { name: 'Silent', file: 'silent', description: 'Pure silence' },
  { name: 'Ocean Waves', file: 'ocean', description: 'Realistic wave sounds' },
  { name: 'Sacred Om', file: 'sacred', description: 'Om resonance 136Hz' },
  { name: 'Earth Resonance', file: 'earthhum', description: 'Deep grounding rumble' },
];

function MeditationRoomContent() {
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedBg, setSelectedBg] = useState('ocean');
  const [isActive, setIsActive] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [selectedSound, setSelectedSound] = useState('ocean');
  const [volume, setVolume] = useState(0.3);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState('');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodesRef = useRef<GainNode[]>([]);
  const audioNodesRef = useRef<AudioNode[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentBg = MEDITATION_BACKGROUNDS.find(bg => bg.id === selectedBg) || MEDITATION_BACKGROUNDS[0];

  useEffect(() => {
    checkUser();
    
    return () => {
      stopSound();
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (isActive && sessionStart) {
      intervalRef.current = setInterval(() => {
        const now = new Date();
        const duration = Math.floor((now.getTime() - sessionStart.getTime()) / 1000);
        setSessionDuration(duration);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, [isActive, sessionStart]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const createSoundscape = (type: string, context: AudioContext, masterGain: GainNode) => {
    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    const nodes: AudioNode[] = [];

    const createOsc = (freq: number, type: OscillatorType = 'sine', vol: number = 0.1) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = vol;
      osc.connect(gain);
      gain.connect(masterGain);
      oscillators.push(osc);
      gains.push(gain);
      return { osc, gain };
    };

    const createNoise = (filterFreq: number, vol: number = 0.3) => {
      const bufferSize = context.sampleRate * 2;
      const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = context.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      filter.Q.value = 1;
      
      const gain = context.createGain();
      gain.gain.value = vol;
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      
      nodes.push(noise);
      nodes.push(filter);
      gains.push(gain);
      
      return { noise, filter, gain };
    };
    
    if (type === 'ocean') {
      // Ocean waves with filtered noise
      const ocean1 = createNoise(200, 0.35);
      const ocean2 = createNoise(400, 0.25);
      
      const waveLFO = context.createOscillator();
      waveLFO.frequency.value = 0.3;
      const waveLFOGain = context.createGain();
      waveLFOGain.gain.value = 100;
      waveLFO.connect(waveLFOGain);
      waveLFOGain.connect(ocean1.filter.frequency);
      oscillators.push(waveLFO);
      
      createOsc(55, 'sine', 0.06);
    } else if (type === 'sacred') {
      // Om resonance with harmonics
      createOsc(136.1, 'sine', 0.06);
      createOsc(272.2, 'sine', 0.04);
      createOsc(408.3, 'sine', 0.02);
      createOsc(68, 'sine', 0.03);
    } else if (type === 'earthhum') {
      // Earth resonance with deep rumble
      createOsc(7.83, 'sine', 0.20);
      createOsc(40, 'sine', 0.16);
      createOsc(80, 'sine', 0.12);
      createNoise(60, 0.12);
    }

    return { oscillators, gains, nodes };
  };

  const startSound = async () => {
    if (!selectedSound || selectedSound === 'silent') return;
    
    try {
      setIsLoading(true);
      setAudioError('');
      
      stopSound();
      
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
      
      const masterGain = audioContextRef.current.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(audioContextRef.current.destination);
      
      const { oscillators, gains, nodes } = createSoundscape(
        selectedSound, 
        audioContextRef.current, 
        masterGain
      );
      
      oscillatorsRef.current = oscillators;
      gainNodesRef.current = gains;
      gainNodesRef.current.push(masterGain);
      audioNodesRef.current = nodes;
      
      const now = audioContextRef.current.currentTime;
      oscillators.forEach(osc => osc.start(now));
      nodes.forEach(node => {
        if (node instanceof AudioBufferSourceNode) {
          node.start(now);
        }
      });
      
      setIsPlaying(true);
      setIsLoading(false);
    } catch (error: any) {
      console.error('Error playing audio:', error);
      setAudioError(`Audio failed: ${error.message || 'Unknown error'}`);
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const stopSound = () => {
    try {
      oscillatorsRef.current.forEach(osc => {
        try { osc.stop(); } catch (e) {}
      });
      
      audioNodesRef.current.forEach(node => {
        if (node instanceof AudioBufferSourceNode) {
          try { node.stop(); } catch (e) {}
        }
      });
      
      oscillatorsRef.current = [];
      gainNodesRef.current = [];
      audioNodesRef.current = [];
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      setIsPlaying(false);
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  };

  const testSound = async () => {
    if (!selectedSound) {
      setAudioError('Please select a sound first');
      return;
    }
    await startSound();
  };

  const toggleSound = () => {
    const newEnabled = !soundEnabled;
    setSoundEnabled(newEnabled);
    
    if (!newEnabled) {
      stopSound();
    }
  };

  const changeSound = (file: string) => {
    stopSound();
    setSelectedSound(file);
    setAudioError('');
  };

  const changeVolume = (newVolume: number) => {
    setVolume(newVolume);
    if (gainNodesRef.current.length > 0) {
      const masterGain = gainNodesRef.current[gainNodesRef.current.length - 1];
      masterGain.gain.value = newVolume;
    }
  };

  const startMeditation = async () => {
    setSessionStart(new Date());
    setIsActive(true);
    
    if (soundEnabled && selectedSound) {
      await startSound();
    }
    
    if (currentUser) {
      try {
        await supabase
          .from('meditation_presence')
          .insert({
            user_id: currentUser.id,
            joined_at: new Date().toISOString()
          });
      } catch (error) {
        console.error('Error tracking session:', error);
      }
    }
  };

  const endMeditation = async () => {
    setIsActive(false);
    stopSound();
    
    if (sessionDuration > 0) {
      const minutes = Math.floor(sessionDuration / 60);
      const seconds = sessionDuration % 60;
      
      if (currentUser) {
        try {
          const { data } = await supabase
            .from('meditation_presence')
            .select('id')
            .eq('user_id', currentUser.id)
            .is('left_at', null)
            .order('joined_at', { ascending: false })
            .limit(1)
            .single();
            
          if (data) {
            await supabase
              .from('meditation_presence')
              .update({ left_at: new Date().toISOString() })
              .eq('id', data.id);
          }
        } catch (error) {
          console.error('Error updating session:', error);
        }
      }
      
      alert(`Beautiful session! You prayed/meditated for ${minutes}:${seconds.toString().padStart(2, '0')}`);
    }
    
    setSessionDuration(0);
    setSessionStart(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentBg.gradient} transition-all duration-1000`}>
      <div className="bg-black/20 backdrop-blur-sm text-white p-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Prayer/Meditation Room</h1>
            <p className="text-sm opacity-75">{currentBg.description}</p>
          </div>
          <a
            href="/meditation"
            className="mt-2 md:mt-0 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            ← Back to Lobby
          </a>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {isActive && (
            <div className="text-center text-white mb-8">
              <div className="text-5xl md:text-6xl font-light mb-2">{formatTime(sessionDuration)}</div>
              <div className="text-lg opacity-75">In prayer/meditation</div>
            </div>
          )}

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-white">
            {!isActive ? (
              <div className="text-center">
                <div className="w-32 h-32 mx-auto bg-white/20 rounded-full flex items-center justify-center text-5xl mb-6">
                  🙏
                </div>
                <h2 className="text-2xl font-bold mb-4">Ready to Begin?</h2>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Choose Your Sacred Space</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {MEDITATION_BACKGROUNDS.map(bg => (
                      <button
                        key={bg.id}
                        onClick={() => setSelectedBg(bg.id)}
                        className={`p-3 rounded-lg transition-all ${
                          selectedBg === bg.id 
                            ? 'bg-white/30 border-2 border-white' 
                            : 'bg-white/10 border-2 border-transparent hover:bg-white/20'
                        }`}
                      >
                        <div className="font-medium text-sm md:text-base">{bg.name}</div>
                        <div className="text-xs opacity-75">{bg.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6 text-left">
                  <label className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={soundEnabled}
                      onChange={toggleSound}
                      className="w-5 h-5 rounded"
                    />
                    <span>Enable Ambient Sound</span>
                  </label>
                  
                  {soundEnabled && (
                    <div className="space-y-3 ml-8">
                      <select
                        value={selectedSound}
                        onChange={(e) => changeSound(e.target.value)}
                        className="w-full p-2 bg-white/20 rounded-lg border border-white/30 text-white [&>option]:text-gray-800"
                      >
                        {AMBIENT_SOUNDS.map(sound => (
                          <option key={sound.file} value={sound.file}>
                            {sound.name} - {sound.description}
                          </option>
                        ))}
                      </select>
                      
                      <div>
                        <label className="block text-sm mb-1">Volume</label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={volume}
                          onChange={(e) => changeVolume(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      
                      {selectedSound && (
                        <button
                          onClick={testSound}
                          className="w-full py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-sm"
                        >
                          {isPlaying ? '🔊 Sound Playing' : '🔇 Test Sound'}
                        </button>
                      )}
                      
                      {isLoading && (
                        <div className="text-sm opacity-75">Loading audio...</div>
                      )}
                      
                      {isPlaying && (
                        <div className="text-sm text-green-300 flex items-center gap-2">
                          <span className="animate-pulse">●</span> Audio is playing
                        </div>
                      )}
                      
                      {audioError && (
                        <div className="text-sm text-red-300 bg-red-900/20 p-2 rounded">
                          {audioError}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={startMeditation}
                  className="w-full py-4 bg-white/30 rounded-xl hover:bg-white/40 transition-all text-lg font-medium"
                >
                  Begin Prayer/Meditation
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="relative w-32 h-32 mx-auto mb-6">
                  <div className="absolute inset-0 bg-white/30 rounded-full flex items-center justify-center text-5xl">
                    ✨
                  </div>
                  <div className="absolute inset-0 border-2 border-white/50 rounded-full animate-ping"></div>
                </div>
                
                <h2 className="text-2xl font-bold mb-2">In Sacred Space</h2>
                <p className="opacity-75 mb-6">Breathe deeply and connect with the divine</p>
                
                <button
                  onClick={endMeditation}
                  className="w-full py-4 bg-white/30 rounded-xl hover:bg-white/40 transition-all text-lg font-medium"
                >
                  End Session
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 bg-white/10 backdrop-blur-md rounded-2xl p-6 text-white">
            <h3 className="font-semibold mb-3">Prayer & Meditation Tips</h3>
            <ul className="space-y-2 text-sm opacity-90">
              <li>• Begin with deep breathing to center yourself</li>
              <li>• Set an intention for healing, peace, or gratitude</li>
              <li>• Allow thoughts to come and go without judgment</li>
              <li>• Send loving energy to those who need it</li>
              <li>• Remember: your presence here contributes to global healing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MeditationRoomPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading prayer/meditation room...</p>
        </div>
      </div>
    }>
      <MeditationRoomContent />
    </Suspense>
  );
}
