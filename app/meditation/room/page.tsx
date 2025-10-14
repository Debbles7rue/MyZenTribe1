// app/meditation/room/page.tsx - Updated Prayer/Meditation Room with Working Audio
"use client";

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// Updated vibrant color backgrounds (removed sunset)
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

// Web Audio API ambient sounds - Working sounds + drumming/flute
const AMBIENT_SOUNDS = [
  { name: 'Silent', file: 'silent', description: 'Pure silence' },
  { name: 'Ocean Waves', file: 'ocean', description: 'Realistic wave sounds' },
  { name: 'Sacred Om', file: 'sacred', description: 'Om resonance 136Hz' },
  { name: 'Earth Resonance', file: 'earthhum', description: 'Deep grounding rumble' },
  { name: 'Spirit Drum Journey', file: 'drumflute', description: 'Hypnotic drums & flute' },
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
    console.log('🎨 createSoundscape called with type:', type);
    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    const nodes: AudioNode[] = [];

    const createOsc = (freq: number, type: OscillatorType = 'sine', vol: number = 0.1) => {
      console.log('  📢 Creating oscillator:', freq, 'Hz, volume:', vol);
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = vol;
      osc.connect(gain);
      gain.connect(masterGain);
      oscillators.push(osc);
      gains.push(gain);
      console.log('  ✅ Oscillator created, total oscillators now:', oscillators.length);
      return { osc, gain };
    };

    // Create noise buffer for nature sounds
    const createNoise = (filterFreq: number, vol: number = 0.3) => {
      const bufferSize = context.sampleRate * 2;
      const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Generate white noise
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

    console.log('🔍 BEFORE SWITCH STATEMENT, type is:', type, 'typeof:', typeof type);
    
    if (type === 'drumflute') {
      console.log('✅ DIRECT IF CHECK: drumflute matched!');
      const testDrum = context.createOscillator();
      const testGain = context.createGain();
      testDrum.frequency.value = 80;
      testDrum.type = 'sine';
      testGain.gain.value = 0.8; // MUCH LOUDER!
      testDrum.connect(testGain);
      testGain.connect(masterGain);
      oscillators.push(testDrum);
      gains.push(testGain);
      console.log('✅ DRUMFLUTE oscillator created via IF!');
    }

    switch (type) {
      case 'ocean':
        // Ocean waves using filtered noise with slow modulation
        const ocean1 = createNoise(200, 0.35);
        const ocean2 = createNoise(400, 0.25);
        
        // Add wave-like modulation
        const waveLFO = context.createOscillator();
        waveLFO.frequency.value = 0.3;
        const waveLFOGain = context.createGain();
        waveLFOGain.gain.value = 100;
        waveLFO.connect(waveLFOGain);
        waveLFOGain.connect(ocean1.filter.frequency);
        oscillators.push(waveLFO);
        
        // Deep ocean rumble
        createOsc(55, 'sine', 0.06);
        break;

      case 'forest':
        // Forest ambience with filtered noise for wind/rustling
        createNoise(1000, 0.20); // Wind through trees
        createNoise(3000, 0.15); // Rustling leaves
        
        // Bird-like chirps with modulated high frequencies
        const bird1 = createOsc(2000, 'sine', 0.04);
        const bird2 = createOsc(2400, 'sine', 0.03);
        
        // Gentle forest hum
        createOsc(150, 'sine', 0.04);
        break;

      case 'sacred':
        // Om-like resonance with harmonics (no noise)
        createOsc(136.1, 'sine', 0.06);
        createOsc(272.2, 'sine', 0.04);
        createOsc(408.3, 'sine', 0.02);
        createOsc(68, 'sine', 0.03);
        break;

      case 'deeppeace':
        // Very low, grounding frequencies with subtle noise
        createOsc(60, 'sine', 0.06);
        createOsc(90, 'sine', 0.05);
        createOsc(120, 'triangle', 0.03);
        createNoise(100, 0.02); // Very low rumble
        break;

      case '432hz':
        // 432 Hz healing frequency with harmonics
        createOsc(432, 'sine', 0.05);
        createOsc(216, 'sine', 0.04);
        createOsc(864, 'sine', 0.02);
        createOsc(108, 'sine', 0.03);
        createNoise(800, 0.01); // Subtle texture
        break;

      case '528hz':
        // 528 Hz love frequency with harmonics
        createOsc(528, 'sine', 0.05);
        createOsc(264, 'sine', 0.04);
        createOsc(1056, 'sine', 0.02);
        createOsc(132, 'sine', 0.03);
        createNoise(1000, 0.01); // Subtle texture
        break;

      case 'celestial':
        // High, ethereal frequencies with shimmer
        createOsc(528, 'sine', 0.03);
        createOsc(639, 'sine', 0.03);
        createOsc(741, 'sine', 0.02);
        createOsc(852, 'sine', 0.02);
        createNoise(5000, 0.02); // High shimmer
        break;

      case 'earthhum':
        // Very low earth resonance with rumble
        createOsc(7.83, 'sine', 0.08);
        createOsc(40, 'sine', 0.06);
        createOsc(80, 'sine', 0.04);
        createNoise(60, 0.03); // Deep rumble
        break;

      case 'starlight':
        // Gentle, shimmering ambient (NOT emergency alert!)
        createOsc(432, 'sine', 0.02); // Base healing freq
        createOsc(528, 'sine', 0.015); // Love freq
        createOsc(639, 'sine', 0.01); // Connection
        createNoise(6000, 0.03); // Soft high shimmer
        
        // Very gentle high sparkle
        const sparkle = createOsc(1200, 'sine', 0.008);
        const sparkleLFO = context.createOscillator();
        sparkleLFO.frequency.value = 0.5;
        const sparkleLFOGain = context.createGain();
        sparkleLFOGain.gain.value = 0.005;
        sparkleLFO.connect(sparkleLFOGain);
        sparkleLFOGain.connect(sparkle.gain.gain);
        oscillators.push(sparkleLFO);
        break;

      default:
        break;
    }

    return { oscillators, gains, nodes };
  };

  const startSound = async () => {
    if (!selectedSound || selectedSound === 'silent') return;
    
    try {
      console.log('🔊 Starting sound:', selectedSound);
      setIsLoading(true);
      setAudioError('');
      
      // Stop any existing sound
      stopSound();
      
      // Create audio context
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
      console.log('🔊 Audio context created, state:', audioContextRef.current.state);
      
      // Create master gain for volume control
      const masterGain = audioContextRef.current.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(audioContextRef.current.destination);
      console.log('🔊 Master gain created, volume:', volume);
      
      // Create the soundscape
      const { oscillators, gains, nodes } = createSoundscape(
        selectedSound, 
        audioContextRef.current, 
        masterGain
      );
      
      console.log('🔊 Soundscape created. Oscillators:', oscillators.length, 'Nodes:', nodes.length);
      
      // Store references
      oscillatorsRef.current = oscillators;
      gainNodesRef.current = gains;
      gainNodesRef.current.push(masterGain);
      audioNodesRef.current = nodes;
      
      // Start all oscillators and buffer sources
      const now = audioContextRef.current.currentTime;
      console.log('🔊 Starting oscillators at time:', now);
      oscillators.forEach((osc, i) => {
        console.log(`🔊 Starting oscillator ${i}:`, osc.frequency.value, 'Hz');
        osc.start(now);
      });
      nodes.forEach(node => {
        if (node instanceof AudioBufferSourceNode) {
          node.start(now);
        }
      });
      
      console.log('🔊 All oscillators started, audio should be playing!');
      setIsPlaying(true);
      setIsLoading(false);
    } catch (error: any) {
      console.error('❌ Error playing audio:', error);
      setAudioError(`Audio failed: ${error.message || 'Unknown error'}`);
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const stopSound = () => {
    try {
      // Stop all oscillators
      oscillatorsRef.current.forEach(osc => {
        try {
          osc.stop();
        } catch (e) {
          // Already stopped
        }
      });
      
      // Stop all buffer sources (noise generators)
      audioNodesRef.current.forEach(node => {
        if (node instanceof AudioBufferSourceNode) {
          try {
            node.stop();
          } catch (e) {
            // Already stopped
          }
        }
      });
      
      // Clear references
      oscillatorsRef.current = [];
      gainNodesRef.current = [];
      audioNodesRef.current = [];
      
      // Close audio context
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
    // Update master gain if audio is playing
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
    
    // Track session start in database
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
      
      // Update session end in database
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
      {/* Header */}
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

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Timer Display */}
          {isActive && (
            <div className="text-center text-white mb-8">
              <div className="text-5xl md:text-6xl font-light mb-2">{formatTime(sessionDuration)}</div>
              <div className="text-lg opacity-75">In prayer/meditation</div>
            </div>
          )}

          {/* Control Panel */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-white">
            {!isActive ? (
              <div className="text-center">
                <div className="w-32 h-32 mx-auto bg-white/20 rounded-full flex items-center justify-center text-5xl mb-6">
                  🙏
                </div>
                <h2 className="text-2xl font-bold mb-4">Ready to Begin?</h2>
                
                {/* Background Selection */}
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

                {/* Sound Controls */}
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

          {/* Prayer/Meditation Tips */}
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
