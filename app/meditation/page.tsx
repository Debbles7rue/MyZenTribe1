// app/meditation/room/page.tsx
"use client";

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// Background options
const MEDITATION_BACKGROUNDS = [
  { 
    id: 'sunset', 
    name: 'Golden Sunset', 
    image: '/mz/sunset.jpg', 
    audio: '/audio/sunset-meditation.mp3',
    description: 'Peaceful golden hour'
  },
  { 
    id: 'river', 
    name: 'Flowing River', 
    image: '/mz/forest-creek.gif', 
    audio: '/audio/water-flow.mp3',
    description: 'Gentle flowing water'
  },
  { 
    id: 'mandala', 
    name: 'Sacred Mandala', 
    image: '/mz/patterns.jpg', 
    audio: '/audio/sacred-tones.mp3',
    description: 'Swirling sacred geometry'
  },
  { 
    id: 'beach', 
    name: 'Ocean Waves', 
    image: '/mz/beach.jpg', 
    audio: '/audio/ocean-waves.mp3',
    description: 'Peaceful shoreline'
  },
  { 
    id: 'forest', 
    name: 'Forest Creek', 
    image: '/mz/forest-creek.gif', 
    audio: '/audio/forest-sounds.mp3',
    description: 'Tranquil forest stream'
  },
  { 
    id: 'candle', 
    name: 'Candlelight', 
    image: '/mz/candle-room.jpg', 
    audio: '/audio/meditation-bells.mp3',
    description: 'Warm candlelit space'
  },
];

// Healing frequencies in Hz
const HEALING_FREQUENCIES = [
  { name: 'Silent', freq: 0, description: 'Pure silence' },
  { name: '396 Hz', freq: 396, description: 'Liberation from fear' },
  { name: '417 Hz', freq: 417, description: 'Undoing situations' },
  { name: '528 Hz', freq: 528, description: 'DNA repair, love frequency' },
  { name: '639 Hz', freq: 639, description: 'Connecting relationships' },
  { name: '741 Hz', freq: 741, description: 'Awakening intuition' },
  { name: '852 Hz', freq: 852, description: 'Returning to spiritual order' },
  { name: '963 Hz', freq: 963, description: 'Crown chakra activation' },
];

function MeditationRoomContent() {
  const searchParams = useSearchParams();
  const backgroundId = searchParams.get('bg') || 'sunset';
  const eventId = searchParams.get('eventId');
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [selectedFrequency, setSelectedFrequency] = useState(528);
  const [volume, setVolume] = useState(0.3);
  const [collectiveTime, setCollectiveTime] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(24 * 60); // 24 hours in minutes
  const [todaysProgress, setTodaysProgress] = useState(0);
  const [activeParticipants, setActiveParticipants] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentBg = MEDITATION_BACKGROUNDS.find(bg => bg.id === backgroundId) || MEDITATION_BACKGROUNDS[0];

  useEffect(() => {
    initializeSession();
    setupAudioContext();
    
    return () => {
      cleanupSession();
      cleanupAudio();
    };
  }, []);

  // Update session timer
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

  // Auto-hide controls
  useEffect(() => {
    const resetHideTimer = () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
      setShowControls(true);
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    };

    const handleMouseMove = () => resetHideTimer();
    const handleKeyPress = () => resetHideTimer();

    if (isActive) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('keydown', handleKeyPress);
      resetHideTimer();
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyPress);
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, [isActive]);

  const initializeSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      
      await loadCollectiveStats();
      await getActiveParticipants();
    } catch (error) {
      console.error('Session initialization error:', error);
    }
  };

  const loadCollectiveStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todaySessions } = await supabase
        .from('meditation_presence')
        .select('joined_at, left_at')
        .gte('joined_at', today.toISOString());

      if (todaySessions) {
        const totalMinutes = todaySessions.reduce((total, session) => {
          if (session.left_at) {
            const duration = new Date(session.left_at).getTime() - new Date(session.joined_at).getTime();
            return total + (duration / (1000 * 60));
          }
          return total;
        }, 0);
        
        setTodaysProgress(Math.round(totalMinutes));
        setCollectiveTime(Math.round(totalMinutes));
      }
    } catch (error) {
      console.error('Collective stats error:', error);
    }
  };

  const getActiveParticipants = async () => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: active } = await supabase
        .from('meditation_presence')
        .select('user_id')
        .gte('joined_at', fiveMinutesAgo)
        .is('left_at', null);

      setActiveParticipants(active?.length || 0);
    } catch (error) {
      console.error('Active participants error:', error);
    }
  };

  const setupAudioContext = () => {
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
      gainNodeRef.current.gain.value = volume;
    }
  };

  const startFrequency = () => {
    if (!audioContextRef.current || selectedFrequency === 0) return;
    
    stopFrequency();
    
    oscillatorRef.current = audioContextRef.current.createOscillator();
    oscillatorRef.current.type = 'sine';
    oscillatorRef.current.frequency.setValueAtTime(selectedFrequency, audioContextRef.current.currentTime);
    oscillatorRef.current.connect(gainNodeRef.current!);
    oscillatorRef.current.start();
  };

  const stopFrequency = () => {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
      oscillatorRef.current.disconnect();
      oscillatorRef.current = null;
    }
  };

  const startMeditation = async () => {
    if (!currentUser) return;

    try {
      setSessionStartTime(new Date());
      setIsActive(true);

      // Record session start
      await supabase
        .from('meditation_presence')
        .insert({
          user_id: currentUser.id,
          session_id: eventId || 'general',
          background_choice: backgroundId,
          joined_at: new Date().toISOString()
        });

      if (audioEnabled && selectedFrequency > 0) {
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        startFrequency();
      }

      await getActiveParticipants();
    } catch (error) {
      console.error('Start meditation error:', error);
    }
  };

  const endMeditation = async () => {
    if (!currentUser || !sessionStartTime) return;

    try {
      setIsActive(false);
      stopFrequency();

      // Record session end
      await supabase
        .from('meditation_presence')
        .update({ left_at: new Date().toISOString() })
        .eq('user_id', currentUser.id)
        .is('left_at', null);

      await loadCollectiveStats();
      await getActiveParticipants();
    } catch (error) {
      console.error('End meditation error:', error);
    }
  };

  const toggleAudio = async () => {
    setAudioEnabled(!audioEnabled);
    
    if (!audioEnabled && selectedFrequency > 0) {
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      startFrequency();
    } else {
      stopFrequency();
    }
  };

  const changeFrequency = (freq: number) => {
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
    if (isActive && currentUser) {
      await endMeditation();
    }
  };

  const cleanupAudio = () => {
    stopFrequency();
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = Math.min((todaysProgress / dailyGoal) * 100, 100);

  return (
    <div 
      className="fixed inset-0 overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.3)), url(${currentBg.image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Hidden protective shield */}
      <div 
        className="absolute inset-0 opacity-3 bg-center bg-no-repeat bg-contain pointer-events-none"
        style={{
          backgroundImage: 'url(/mz/shield.png)',
          backgroundSize: '1200px',
          filter: 'sepia(100%) saturate(200%) hue-rotate(25deg)'
        }}
      />

      {/* Controls overlay */}
      <div className={`absolute inset-0 z-10 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        
        {/* Top Stats Bar */}
        <div className="absolute top-0 left-0 right-0 bg-black/20 backdrop-blur-sm text-white p-4">
          <div className="flex justify-between items-center max-w-6xl mx-auto">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-sm opacity-75">Session Time</div>
                <div className="text-xl font-bold">{formatTime(sessionDuration)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm opacity-75">Active Souls</div>
                <div className="text-xl font-bold">{activeParticipants}</div>
              </div>
              <div className="text-center">
                <div className="text-sm opacity-75">Today's Collective</div>
                <div className="text-xl font-bold">{Math.floor(collectiveTime)}m</div>
              </div>
            </div>
            
            {/* Daily Goal Progress */}
            <div className="text-center">
              <div className="text-sm opacity-75 mb-1">24hr Goal Progress</div>
              <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-1000"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="text-xs opacity-75 mt-1">{progressPercentage.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* Center Controls */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            {!isActive ? (
              <div className="space-y-6">
                <h1 className="text-4xl font-bold mb-2">{currentBg.name}</h1>
                <p className="text-xl opacity-90 mb-8">{currentBg.description}</p>
                <button
                  onClick={startMeditation}
                  disabled={!currentUser}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl hover:from-purple-700 hover:to-pink-700 transition-all font-medium text-lg transform hover:scale-105 disabled:opacity-50"
                >
                  {currentUser ? 'Begin Sacred Practice' : 'Sign in to Meditate'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-32 h-32 mx-auto bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-4xl animate-pulse">
                  ✨
                </div>
                <div className="text-2xl font-bold">In Meditation</div>
                <div className="text-lg opacity-90">Breathe deeply. Feel the collective energy.</div>
                <button
                  onClick={endMeditation}
                  className="px-6 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all font-medium"
                >
                  Complete Practice
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Audio Controls - Bottom Left */}
        <div className="absolute bottom-4 left-4 bg-black/20 backdrop-blur-sm rounded-2xl p-4 text-white">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm">🎵</span>
              <button
                onClick={toggleAudio}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  audioEnabled ? 'bg-purple-600' : 'bg-white/20'
                }`}
              >
                {audioEnabled ? 'Audio On' : 'Audio Off'}
              </button>
            </div>
            
            {audioEnabled && (
              <>
                <div>
                  <div className="text-xs opacity-75 mb-2">Healing Frequency</div>
                  <select
                    value={selectedFrequency}
                    onChange={(e) => changeFrequency(Number(e.target.value))}
                    className="bg-black/40 border border-white/20 rounded px-2 py-1 text-sm w-full"
                  >
                    {HEALING_FREQUENCIES.map(freq => (
                      <option key={freq.freq} value={freq.freq}>
                        {freq.name} - {freq.description}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <div className="text-xs opacity-75 mb-2">Volume</div>
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
              </>
            )}
          </div>
        </div>

        {/* Exit Button - Bottom Right */}
        <div className="absolute bottom-4 right-4">
          <a
            href="/meditation"
            className="px-4 py-2 bg-black/20 backdrop-blur-sm text-white rounded-lg hover:bg-black/30 transition-colors"
          >
            ← Exit to Lobby
          </a>
        </div>
      </div>

      {/* Invisible click area to show controls */}
      <div 
        className="absolute inset-0 z-0"
        onMouseMove={() => setShowControls(true)}
        onClick={() => setShowControls(true)}
      />
    </div>
  );
}

export default function MeditationRoomPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Entering sacred space...</p>
        </div>
      </div>
    }>
      <MeditationRoomContent />
    </Suspense>
  );
}
