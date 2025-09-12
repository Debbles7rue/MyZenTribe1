// app/meditation/room/page.tsx - Simplified Meditation Room
"use client";

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// Simple color backgrounds
const MEDITATION_BACKGROUNDS = [
  { 
    id: 'sunset', 
    name: 'Golden Sunset', 
    gradient: 'from-orange-400 via-pink-400 to-purple-500',
    description: 'Warm and peaceful'
  },
  { 
    id: 'ocean', 
    name: 'Ocean Waves', 
    gradient: 'from-cyan-400 via-blue-500 to-indigo-600',
    description: 'Deep and calming'
  },
  { 
    id: 'forest', 
    name: 'Forest', 
    gradient: 'from-green-400 via-emerald-500 to-teal-600',
    description: 'Natural tranquility'
  },
  { 
    id: 'lavender', 
    name: 'Lavender Dreams', 
    gradient: 'from-purple-400 via-violet-500 to-indigo-600',
    description: 'Peaceful dreams'
  },
  { 
    id: 'sunrise', 
    name: 'Morning Light', 
    gradient: 'from-yellow-300 via-orange-400 to-red-500',
    description: 'New beginnings'
  },
  { 
    id: 'night', 
    name: 'Night Sky', 
    gradient: 'from-gray-900 via-purple-900 to-violet-900',
    description: 'Deep meditation'
  },
];

// Ambient sounds (using simple oscillator tones)
const AMBIENT_SOUNDS = [
  { name: 'Silent', freq: 0, description: 'Pure silence' },
  { name: 'Deep Om', freq: 136.1, description: 'Earth frequency' },
  { name: 'Heart', freq: 528, description: 'Love frequency' },
  { name: 'Third Eye', freq: 852, description: 'Intuition' },
  { name: 'Crown', freq: 963, description: 'Higher consciousness' },
];

function MeditationRoomContent() {
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedBg, setSelectedBg] = useState('sunset');
  const [isActive, setIsActive] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [selectedSound, setSelectedSound] = useState(0);
  const [volume, setVolume] = useState(0.3);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentBg = MEDITATION_BACKGROUNDS.find(bg => bg.id === selectedBg) || MEDITATION_BACKGROUNDS[0];

  useEffect(() => {
    checkUser();
    return () => {
      stopSound();
      if (intervalRef.current) clearInterval(intervalRef.current);
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

  const initAudio = () => {
    if (!audioContextRef.current && typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
      gainNodeRef.current.gain.value = volume;
    }
  };

  const startSound = async () => {
    if (!selectedSound || !audioContextRef.current) return;
    
    stopSound();
    
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    
    oscillatorRef.current = audioContextRef.current.createOscillator();
    oscillatorRef.current.type = 'sine';
    oscillatorRef.current.frequency.setValueAtTime(selectedSound, audioContextRef.current.currentTime);
    
    // Add a subtle wobble for more organic sound
    const lfo = audioContextRef.current.createOscillator();
    lfo.frequency.setValueAtTime(0.2, audioContextRef.current.currentTime);
    const lfoGain = audioContextRef.current.createGain();
    lfoGain.gain.setValueAtTime(2, audioContextRef.current.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(oscillatorRef.current.frequency);
    
    oscillatorRef.current.connect(gainNodeRef.current!);
    oscillatorRef.current.start();
    lfo.start();
  };

  const stopSound = () => {
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
      } catch (e) {
        // Already stopped
      }
    }
  };

  const toggleSound = () => {
    const newEnabled = !soundEnabled;
    setSoundEnabled(newEnabled);
    
    if (newEnabled && selectedSound > 0) {
      initAudio();
      startSound();
    } else {
      stopSound();
    }
  };

  const changeSound = (freq: number) => {
    setSelectedSound(freq);
    if (soundEnabled && freq > 0) {
      initAudio();
      startSound();
    } else if (freq === 0) {
      stopSound();
    }
  };

  const changeVolume = (newVolume: number) => {
    setVolume(newVolume);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newVolume;
    }
  };

  const startMeditation = () => {
    setSessionStart(new Date());
    setIsActive(true);
    
    if (soundEnabled && selectedSound > 0) {
      initAudio();
      startSound();
    }
  };

  const endMeditation = () => {
    setIsActive(false);
    stopSound();
    
    if (sessionDuration > 0) {
      const minutes = Math.floor(sessionDuration / 60);
      const seconds = sessionDuration % 60;
      alert(`Beautiful session! You meditated for ${minutes}:${seconds.toString().padStart(2, '0')}`);
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
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Meditation Room</h1>
            <p className="text-sm opacity-75">{currentBg.description}</p>
          </div>
          <a
            href="/meditation"
            className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            ← Back
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Timer Display */}
          {isActive && (
            <div className="text-center text-white mb-8">
              <div className="text-6xl font-light mb-2">{formatTime(sessionDuration)}</div>
              <div className="text-lg opacity-75">In meditation</div>
            </div>
          )}

          {/* Control Panel */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-white">
            {!isActive ? (
              <div className="text-center">
                <div className="w-32 h-32 mx-auto bg-white/20 rounded-full flex items-center justify-center text-5xl mb-6">
                  🧘
                </div>
                <h2 className="text-2xl font-bold mb-4">Ready to Begin?</h2>
                
                {/* Background Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Choose Your Space</label>
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
                        <div className="font-medium">{bg.name}</div>
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
                      className="w-5 h-5"
                    />
                    <span>Enable Ambient Sound</span>
                  </label>
                  
                  {soundEnabled && (
                    <div className="space-y-3 ml-8">
                      <select
                        value={selectedSound}
                        onChange={(e) => changeSound(Number(e.target.value))}
                        className="w-full p-2 bg-white/20 rounded-lg border border-white/30 text-white"
                      >
                        {AMBIENT_SOUNDS.map(sound => (
                          <option key={sound.freq} value={sound.freq} className="text-gray-800">
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
                    </div>
                  )}
                </div>

                <button
                  onClick={startMeditation}
                  className="w-full py-4 bg-white/30 rounded-xl hover:bg-white/40 transition-all text-lg font-medium"
                >
                  Begin Meditation
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
                
                <h2 className="text-2xl font-bold mb-2">In Meditation</h2>
                <p className="opacity-75 mb-6">Breathe deeply and find your center</p>
                
                <button
                  onClick={endMeditation}
                  className="w-full py-4 bg-white/30 rounded-xl hover:bg-white/40 transition-all text-lg font-medium"
                >
                  End Session
                </button>
              </div>
            )}
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
          <p>Loading meditation room...</p>
        </div>
      </div>
    }>
      <MeditationRoomContent />
    </Suspense>
  );
}
