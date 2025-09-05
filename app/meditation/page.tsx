// app/meditation/page.tsx
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// Brand Blessing - Hidden blessing embedded in code
/**
 * MyZenTribe — Brand Blessing (v1)
 * Embedded in code and optionally displayed in the UI.
 * Safe to import anywhere in the app.
 */
export const BLESSING_ID = "mzt-blessing-v1";
export const BLESSING_TEXT = `
My intention for this site is to bring people together for community, love, support, and fun.
I draw in light from above to dedicate this work for the collective spread of healing, love,
and new opportunities that will enrich the lives of many. I send light, love, and protection
to every user who joins. May this bring hope and inspiration to thousands, if not millions,
around the world. And so it is done, and so it is done.
`.trim();

// Background options
const MEDITATION_BACKGROUNDS = [
  { id: 'sunset', name: 'Golden Sunset', image: '/mz/sunset.jpg', description: 'Peaceful golden hour' },
  { id: 'river', name: 'Flowing River', image: '/mz/river.gif', description: 'Gentle flowing water' },
  { id: 'mandala', name: 'Sacred Mandala', image: '/mz/mandala.gif', description: 'Swirling sacred geometry' },
  { id: 'forest', name: 'Forest Creek', image: '/mz/forest-creek.gif', description: 'Tranquil forest stream' },
  { id: 'beach', name: 'Ocean Waves', image: '/mz/beach.jpg', description: 'Peaceful shoreline' },
  { id: 'candle', name: 'Candlelight', image: '/mz/candle-room.jpg', description: 'Warm candlelit space' },
];

function MeditationContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId');
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedBackground, setSelectedBackground] = useState('sunset');
  const [isJoined, setIsJoined] = useState(false);
  const [showAnonymous, setShowAnonymous] = useState(false);
  const [tribePulse, setTribePulse] = useState(0);
  const [activeParticipants, setActiveParticipants] = useState(0);
  const [showCandleModal, setShowCandleModal] = useState(false);

  useEffect(() => {
    initializeMeditation();
  }, []);

  const initializeMeditation = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Load user's preferred background
      if (user) {
        const { data: settings } = await supabase
          .from('meditation_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (settings?.bg_key) {
          setSelectedBackground(settings.bg_key);
        }
      }

      // Calculate tribe pulse (24h meditation coverage)
      await calculateTribePulse();
      
      // Get current active participants
      await getActiveParticipants();

    } catch (error) {
      console.error('Meditation initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTribePulse = async () => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: sessions } = await supabase
        .from('meditation_presence')
        .select('joined_at, left_at')
        .gte('joined_at', twentyFourHoursAgo);

      if (sessions) {
        // Calculate coverage percentage (simplified)
        const totalMinutes = 24 * 60;
        const coveredMinutes = sessions.length * 15; // Assume average 15 min sessions
        const coverage = Math.min((coveredMinutes / totalMinutes) * 100, 100);
        setTribePulse(Math.round(coverage));
      }
    } catch (error) {
      console.error('Pulse calculation error:', error);
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

  const joinSession = async () => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('meditation_presence')
        .insert({
          user_id: showAnonymous ? null : currentUser.id,
          is_anonymous: showAnonymous,
          joined_at: new Date().toISOString(),
          session_id: eventId || 'general'
        });

      if (!error) {
        setIsJoined(true);
        await getActiveParticipants();
      }
    } catch (error) {
      console.error('Join session error:', error);
    }
  };

  const leaveSession = async () => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('meditation_presence')
        .update({ left_at: new Date().toISOString() })
        .eq('user_id', showAnonymous ? null : currentUser.id)
        .is('left_at', null);

      if (!error) {
        setIsJoined(false);
        await getActiveParticipants();
      }
    } catch (error) {
      console.error('Leave session error:', error);
    }
  };

  const updateBackground = async (backgroundId: string) => {
    setSelectedBackground(backgroundId);
    
    if (currentUser) {
      // Save preference
      await supabase
        .from('meditation_settings')
        .upsert({
          user_id: currentUser.id,
          bg_key: backgroundId
        });
    }
  };

  const currentBg = MEDITATION_BACKGROUNDS.find(bg => bg.id === selectedBackground) || MEDITATION_BACKGROUNDS[0];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="relative mb-6">
            <div className="animate-pulse w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mx-auto"></div>
            <div className="absolute inset-0 w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mx-auto animate-ping opacity-20"></div>
          </div>
          <p className="text-lg">Preparing your sacred space...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative overflow-hidden flex flex-col"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.4)), url(${currentBg.image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Header with Tribe Pulse */}
      <div className="relative z-10 p-4 md:p-6">
        <div className="max-w-6xl mx-auto flex justify-between items-start">
          <div className="text-white">
            <h1 className="text-2xl md:text-4xl font-bold mb-2 flex items-center gap-3">
              <div className="relative">
                <span className="text-3xl md:text-4xl">🧘</span>
                <div className="absolute inset-0 animate-pulse bg-white/20 rounded-full scale-150"></div>
              </div>
              Meditation Room
            </h1>
            <p className="text-white/90 text-sm md:text-base">
              Creating a continuous flow of healing energy into the world
            </p>
          </div>

          {/* Tribe Pulse Display */}
          <div className="text-center text-white">
            <div className="relative">
              <svg className="w-16 h-16 md:w-20 md:h-20 transform -rotate-90">
                <circle
                  cx="50%"
                  cy="50%"
                  r="30"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="4"
                  fill="none"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="30"
                  stroke="url(#pulseGradient)"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${tribePulse * 1.88} 188`}
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="pulseGradient">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#EC4899" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold">{tribePulse}%</span>
              </div>
            </div>
            <p className="text-xs mt-1 opacity-75">24h Tribe Pulse</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row max-w-6xl mx-auto w-full p-4 gap-6">
        
        {/* Left Panel - Controls */}
        <div className="md:w-80 space-y-4">
          
          {/* Join/Leave Controls */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4">Enter the Sacred Space</h3>
            
            {!isJoined ? (
              <div className="space-y-4">
                <label className="flex items-center text-white text-sm">
                  <input
                    type="checkbox"
                    checked={showAnonymous}
                    onChange={(e) => setShowAnonymous(e.target.checked)}
                    className="mr-2 rounded"
                  />
                  Join anonymously
                </label>
                
                <button
                  onClick={joinSession}
                  disabled={!currentUser}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium disabled:opacity-50"
                >
                  {currentUser ? 'Join Meditation' : 'Sign in to Join'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-white/90 text-sm bg-green-500/20 p-3 rounded-lg">
                  You are currently meditating ✨
                </div>
                <button
                  onClick={leaveSession}
                  className="w-full bg-white/20 text-white py-3 px-6 rounded-lg hover:bg-white/30 transition-all font-medium"
                >
                  Complete Session
                </button>
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-white/75 text-sm">
                {activeParticipants} {activeParticipants === 1 ? 'soul' : 'souls'} currently meditating
              </p>
            </div>
          </div>

          {/* Background Selector */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4">Sacred Environment</h3>
            <div className="grid grid-cols-2 gap-2">
              {MEDITATION_BACKGROUNDS.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => updateBackground(bg.id)}
                  className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                    selectedBackground === bg.id 
                      ? 'border-purple-400 ring-2 ring-purple-400/50' 
                      : 'border-white/20 hover:border-white/40'
                  }`}
                >
                  <img
                    src={bg.image}
                    alt={bg.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-end p-2">
                    <span className="text-white text-xs font-medium">{bg.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Light a Candle */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              🕯️ Light a Candle
            </h3>
            <p className="text-white/80 text-sm mb-4">
              Send healing light for a loved one
            </p>
            <button
              onClick={() => setShowCandleModal(true)}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-3 px-6 rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all font-medium"
            >
              Light Candle ($0.99)
            </button>
          </div>
        </div>

        {/* Center - Meditation Space */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-white max-w-md">
            {eventId && (
              <div className="mb-8 p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
                <p className="text-lg">Group Meditation Session</p>
                <p className="text-sm opacity-75">Event ID: {eventId}</p>
              </div>
            )}

            <div className="space-y-6">
              <div className="relative">
                <div className="w-32 h-32 mx-auto bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-4xl">
                  {isJoined ? '✨' : '🧘'}
                </div>
                {isJoined && (
                  <div className="absolute inset-0 w-32 h-32 mx-auto border-4 border-purple-400 rounded-full animate-ping opacity-30"></div>
                )}
              </div>
              
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  {isJoined ? 'You are in meditation' : 'Find your center'}
                </h2>
                <p className="text-white/80">
                  {isJoined 
                    ? 'Breathe deeply. Feel the collective energy of healing flowing through you.'
                    : 'Breathe deeply. Let peace flow through you and into the world.'
                  }
                </p>
              </div>

              {isJoined && (
                <div className="text-sm text-white/70 bg-white/5 rounded-lg p-4">
                  "In the stillness of the present moment, we find infinite peace."
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Group Chat (if event) */}
        {eventId && (
          <div className="md:w-80">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 h-80">
              <h3 className="text-white font-semibold mb-4">Group Circle</h3>
              <div className="text-white/75 text-sm">
                Group chat feature coming soon...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="relative z-10 p-4 text-center">
        <a 
          href="/calendar"
          className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          ← Back to Calendar
        </a>
      </div>

      {/* Candle Modal Placeholder */}
      {showCandleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Light a Candle</h3>
            <p className="text-gray-600 mb-4">
              Feature coming soon - Light a virtual candle for a loved one
            </p>
            <button
              onClick={() => setShowCandleModal(false)}
              className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MeditationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Opening sacred space...</p>
        </div>
      </div>
    }>
      <MeditationContent />
    </Suspense>
  );
}
