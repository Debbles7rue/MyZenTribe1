// app/meditation/room/page.tsx - Updated Prayer/Meditation Room with Working Audio
"use client";

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// Updated vibrant color backgrounds
const MEDITATION_BACKGROUNDS = [
  { 
    id: 'sunset', 
    name: 'Golden Sunset', 
    gradient: 'from-orange-500 via-rose-500 to-pink-600',
    description: 'Warm and peaceful'
  },
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

// Ambient sounds with working CDN links
const AMBIENT_SOUNDS = [
  { name: 'Silent', file: '', description: 'Pure silence' },
  { name: 'Ocean Waves', file: 'https://cdn.pixabay.com/audio/2022/03/10/audio_4e3f1d21e2.mp3', description: 'Calming ocean sounds' },
  { name: 'Forest Creek', file: 'https://cdn.pixabay.com/audio/2022/03/10/audio_0ac3188dca.mp3', description: 'Peaceful water flow' },
  { name: 'Forest Birds', file: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3', description: 'Nature sounds' },
  { name: 'Rain & Thunder', file: 'https://cdn.pixabay.com/audio/2022/03/12/audio_b8c0975d41.mp3', description: 'Gentle rain sounds' },
  { name: 'Tibetan Bowls', file: 'https://cdn.pixabay.com/audio/2023/10/03/audio_13a8566aa5.mp3', description: 'Singing bowl meditation' },
  { name: '432 Hz Healing', file: 'https://cdn.pixabay.com/audio/2023/02/28/audio_229530e679.mp3', description: 'Healing frequency' },
  { name: '528 Hz Love', file: 'https://cdn.pixabay.com/audio/2022/11/09/audio_d0c0dc1e7e.mp3', description: 'Love frequency' },
  { name: 'Deep Meditation', file: 'https://cdn.pixabay.com/audio/2022/03/15/audio_4dfb87b5f3.mp3', description: 'Ambient meditation' },
  { name: 'Zen Garden', file: 'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe5c49c.mp3', description: 'Peaceful ambient' },
];

function MeditationRoomContent() {
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedBg, setSelectedBg] = useState('sunset');
  const [isActive, setIsActive] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [selectedSound, setSelectedSound] = useState('');
  const [volume, setVolume] = useState(0.3);
  const [isLoading, setIsLoading] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentBg = MEDITATION_BACKGROUNDS.find(bg => bg.id === selectedBg) || MEDITATION_BACKGROUNDS[0];

  useEffect(() => {
    checkUser();
    // Initialize audio element
    audioRef.current = new Audio();
    audioRef.current.loop = true;
    audioRef.current.volume = volume;
    
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

  const startSound = async () => {
    if (!audioRef.current || !selectedSound) return;
    
    try {
      setIsLoading(true);
      audioRef.current.src = selectedSound;
      await audioRef.current.play();
      setIsLoading(false);
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsLoading(false);
    }
  };

  const stopSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const toggleSound = () => {
    const newEnabled = !soundEnabled;
    setSoundEnabled(newEnabled);
    
    if (newEnabled && selectedSound) {
      startSound();
    } else {
      stopSound();
    }
  };

  const changeSound = (file: string) => {
    setSelectedSound(file);
    if (soundEnabled && file) {
      stopSound();
      startSound();
    } else if (!file) {
      stopSound();
    }
  };

  const changeVolume = (newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
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
                      
                      {isLoading && (
                        <div className="text-sm opacity-75">Loading audio...</div>
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
