// app/meditation/room/page.tsx - Mobile-First Meditation Room
"use client";

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// Simplified background options with fallbacks
const MEDITATION_BACKGROUNDS = [
  { 
    id: 'sunset', 
    name: 'Golden Sunset', 
    gradient: 'from-orange-400 via-pink-400 to-purple-500',
    description: 'Peaceful golden hour'
  },
  { 
    id: 'river', 
    name: 'Flowing River', 
    gradient: 'from-blue-400 via-teal-400 to-green-500',
    description: 'Gentle flowing water'
  },
  { 
    id: 'mandala', 
    name: 'Sacred Mandala', 
    gradient: 'from-purple-500 via-indigo-500 to-blue-600',
    description: 'Sacred geometry'
  },
  { 
    id: 'beach', 
    name: 'Ocean Waves', 
    gradient: 'from-cyan-400 via-blue-400 to-indigo-500',
    description: 'Peaceful shoreline'
  },
  { 
    id: 'forest', 
    name: 'Forest Creek', 
    gradient: 'from-green-400 via-emerald-400 to-teal-500',
    description: 'Tranquil forest'
  },
  { 
    id: 'candle', 
    name: 'Candlelight', 
    gradient: 'from-yellow-400 via-orange-400 to-red-500',
    description: 'Warm candlelight'
  },
];

// Healing frequencies
const HEALING_FREQUENCIES = [
  { name: 'Silent', freq: 0, description: 'Pure silence' },
  { name: '528 Hz', freq: 528, description: 'Love frequency' },
  { name: '396 Hz', freq: 396, description: 'Release fear' },
  { name: '741 Hz', freq: 741, description: 'Intuition' },
];

function MeditationRoomContent() {
  const searchParams = useSearchParams();
  const backgroundId = searchParams.get('bg') || 'sunset';
  const eventId = searchParams.get('eventId');
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [selectedFrequency, setSelectedFrequency] = useState(528);
  const [volume, setVolume] = useState(0.3);
  const [todaysProgress, setTodaysProgress] = useState(127); // Mock data for now
  const [activeParticipants, setActiveParticipants] = useState(3); // Mock data
  const [isLoading, setIsLoading] = useState(true);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentBg = MEDITATION_BACKGROUNDS.find(bg => bg.id === backgroundId) || MEDITATION_BACKGROUNDS[0];

  useEffect(() => {
    initializeSession();
    setupAudioContext();
    
    // Set loading to false after a short delay
    setTimeout(() => setIsLoading(false), 1000);
    
    return () => {
      cleanupSession();
      cleanupAudio();
    };
  }, []);

  // Session timer
  useEffect(() => {
    if (isActive && sessionStartTime) {
      intervalRef.current = setInterval(() => {
        const now = new Date();
        const duration = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);
        setSessionDuration(duration);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, sessionStartTime]);

  const initializeSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Session initialization error:', error);
    }
  };

  const setupAudioContext = () => {
    try {
      if (typeof window !== 'undefined') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
        gainNodeRef.current.gain.value = volume;
      }
    } catch (error) {
      console.log('Audio context not supported');
    }
  };

  const startFrequency = async () => {
    if (!audioContextRef.current || selectedFrequency === 0) return;
    
    try {
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      stopFrequency();
      
      oscillatorRef.current = audioContextRef.current.createOscillator();
      oscillatorRef.current.type = 'sine';
      oscillatorRef.current.frequency.setValueAtTime(selectedFrequency, audioContextRef.current.currentTime);
      oscillatorRef.current.connect(gainNodeRef.current!);
      oscillatorRef.current.start();
    } catch (error) {
      console.log('Error starting frequency:', error);
    }
  };

  const stopFrequency = () => {
    try {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
      }
    } catch (error) {
      console.log('Error stopping frequency:', error);
    }
  };

  const startMeditation = async () => {
    if (!currentUser) {
      alert('Please sign in to start meditating');
      return;
    }

    try {
      setSessionStartTime(new Date());
      setIsActive(true);
      setShowMenu(false);

      if (audioEnabled && selectedFrequency > 0) {
        await startFrequency();
      }
    } catch (error) {
      console.error('Start meditation error:', error);
    }
  };

  const endMeditation = async () => {
    try {
      setIsActive(false);
      stopFrequency();
      
      if (sessionDuration > 0) {
        alert(`Great session! You meditated for ${formatTime(sessionDuration)}`);
      }
    } catch (error) {
      console.error('End meditation error:', error);
    }
  };

  const toggleAudio = async () => {
    setAudioEnabled(!audioEnabled);
    
    if (!audioEnabled && selectedFrequency > 0) {
      await startFrequency();
    } else {
      stopFrequency();
    }
  };

  const changeFrequency = async (freq: number) => {
    setSelectedFrequency(freq);
    if (audioEnabled && freq > 0) {
      stopFrequency();
      setTimeout(startFrequency, 100);
    } else if (freq === 0) {
      stopFrequency();
    }
  };

  const changeVolume = (newVolume: number) => {
    setVolume(newVolume);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newVolume;
    }
  };

  const cleanupSession = async () => {
    if (isActive) {
      await endMeditation();
    }
  };

  const cleanupAudio = () => {
    stopFrequency();
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const dailyGoal = 24 * 60; // 24 hours in minutes
  const progressPercentage = Math.min((todaysProgress / dailyGoal) * 100, 100);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg">Entering sacred space...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentBg.gradient} relative overflow-hidden`}>
      
      {/* Mobile-friendly header */}
      <div className="relative z-20 p-4 bg-black/20 backdrop-blur-sm text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg md:text-xl font-bold">{currentBg.name}</h1>
            <p className="text-sm opacity-75">{currentBg.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              ☰
            </button>
            <a
              href="/meditation"
              className="px-3 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-sm"
            >
              Exit
            </a>
          </div>
        </div>
      </div>

      {/* Stats bar - mobile responsive */}
      <div className="bg-black/10 text-white p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs opacity-75">Session</div>
            <div className="text-lg font-bold">{formatTime(sessionDuration)}</div>
          </div>
          <div>
            <div className="text-xs opacity-75">Active Souls</div>
            <div className="text-lg font-bold">{activeParticipants}</div>
          </div>
          <div>
            <div className="text-xs opacity-75">Today's Total</div>
            <div className="text-lg font-bold">{todaysProgress}m</div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs opacity-75 mb-1">
            <span>24hr Collective Goal</span>
            <span>{progressPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white/80 transition-all duration-1000 rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main meditation area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-white text-center">
        {!isActive ? (
          <div className="space-y-6 max-w-sm">
            <div className="w-32 h-32 mx-auto bg-white/20 rounded-full flex items-center justify-center text-4xl backdrop-blur-sm border border-white/30">
              🧘
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Ready to Begin?</h2>
              <p className="opacity-90 mb-6">Enter the sacred space of collective meditation</p>
            </div>
            <button
              onClick={startMeditation}
              disabled={!currentUser}
              className="w-full py-4 bg-white/30 backdrop-blur-sm text-white rounded-xl hover:bg-white/40 transition-all font-medium text-lg border border-white/30 disabled:opacity-50"
            >
              {currentUser ? 'Begin Sacred Practice' : 'Sign in to Meditate'}
            </button>
          </div>
        ) : (
          <div className="space-y-6 max-w-sm">
            <div className="relative">
              <div className="w-32 h-32 mx-auto bg-white/30 rounded-full flex items-center justify-center text-4xl backdrop-blur-sm border border-white/30">
                ✨
              </div>
              <div className="absolute inset-0 w-32 h-32 mx-auto border-2 border-white/50 rounded-full animate-ping"></div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">In Meditation</h2>
              <p className="opacity-90 mb-6">Breathe deeply. Feel the collective energy flowing through you.</p>
            </div>
            <button
              onClick={endMeditation}
              className="w-full py-4 bg-white/30 backdrop-blur-sm text-white rounded-xl hover:bg-white/40 transition-all font-medium border border-white/30"
            >
              Complete Practice
            </button>
          </div>
        )}
      </div>

      {/* Menu overlay */}
      {showMenu && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm">
          <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm rounded-t-2xl p-6 text-gray-800 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Meditation Settings</h3>
              <button
                onClick={() => setShowMenu(false)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Audio Controls */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  🎵 Healing Audio
                </h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={audioEnabled}
                      onChange={toggleAudio}
                      className="w-5 h-5 accent-purple-600"
                    />
                    <span>Enable healing frequencies</span>
                  </label>
                  
                  {audioEnabled && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">Frequency</label>
                        <select
                          value={selectedFrequency}
                          onChange={(e) => changeFrequency(Number(e.target.value))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        >
                          {HEALING_FREQUENCIES.map(freq => (
                            <option key={freq.freq} value={freq.freq}>
                              {freq.name} - {freq.description}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Volume</label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={volume}
                          onChange={(e) => changeVolume(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Environment Info */}
              <div>
                <h4 className="font-semibold mb-3">Current Environment</h4>
                <div className="p-4 bg-gray-100 rounded-lg">
                  <div className="font-medium">{currentBg.name}</div>
                  <div className="text-sm text-gray-600">{currentBg.description}</div>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={() => setShowMenu(false)}
                className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MeditationRoomPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg">Loading meditation room...</p>
        </div>
      </div>
    }>
      <MeditationRoomContent />
    </Suspense>
  );
}
