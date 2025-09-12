// app/meditation/page.tsx - Just the Meditation Lobby
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// Brand Blessing - Hidden blessing embedded in code
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
  { 
    id: 'sunset', 
    name: 'Golden Sunset', 
    image: '/mz/sunset.jpg', 
    description: 'Peaceful golden hour',
    overlay: 'linear-gradient(rgba(245,158,11,0.1), rgba(217,119,6,0.2))'
  },
  { 
    id: 'river', 
    name: 'Flowing River', 
    image: '/mz/forest-creek.gif', 
    description: 'Gentle flowing water',
    overlay: 'linear-gradient(rgba(34,197,94,0.1), rgba(21,128,61,0.2))'
  },
  { 
    id: 'mandala', 
    name: 'Sacred Mandala', 
    image: '/mz/patterns.jpg', 
    description: 'Swirling sacred geometry',
    overlay: 'linear-gradient(rgba(147,51,234,0.1), rgba(126,34,206,0.2))'
  },
  { 
    id: 'beach', 
    name: 'Ocean Waves', 
    image: '/mz/beach.jpg', 
    description: 'Peaceful shoreline',
    overlay: 'linear-gradient(rgba(14,165,233,0.1), rgba(3,105,161,0.2))'
  },
  { 
    id: 'forest', 
    name: 'Forest Creek', 
    image: '/mz/forest-creek.gif', 
    description: 'Tranquil forest stream',
    overlay: 'linear-gradient(rgba(34,197,94,0.1), rgba(21,128,61,0.2))'
  },
  { 
    id: 'candle', 
    name: 'Candlelight', 
    image: '/mz/candle-room.jpg', 
    description: 'Warm candlelit space',
    overlay: 'linear-gradient(rgba(245,158,11,0.1), rgba(217,119,6,0.2))'
  },
];

function MeditationLobbyContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId');
  
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedBackground, setSelectedBackground] = useState('sunset');
  const [showAnonymous, setShowAnonymous] = useState(false);
  const [tribePulse, setTribePulse] = useState(0);
  const [activeParticipants, setActiveParticipants] = useState(0);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  useEffect(() => {
    initializeLobby();
  }, []);

  const initializeLobby = async () => {
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

      // Load recent lobby chat messages
      await loadChatMessages();

    } catch (error) {
      console.error('Lobby initialization error:', error);
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
        // Calculate coverage percentage
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

  const loadChatMessages = async () => {
    try {
      const { data: messages } = await supabase
        .from('lobby_chat')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      setChatMessages(messages || []);
    } catch (error) {
      console.error('Chat messages error:', error);
    }
  };

  const sendChatMessage = async () => {
    if (!chatMessage.trim() || !currentUser) return;

    try {
      const { error } = await supabase
        .from('lobby_chat')
        .insert({
          user_id: showAnonymous ? null : currentUser.id,
          message: chatMessage.trim(),
          is_anonymous: showAnonymous
        });

      if (!error) {
        setChatMessage('');
        await loadChatMessages();
      }
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const beginMeditation = async () => {
    if (!currentUser || !selectedBackground) {
      alert('Please select a sacred environment first');
      return;
    }

    // Save user's background preference
    try {
      await supabase
        .from('meditation_settings')
        .upsert({
          user_id: currentUser.id,
          bg_key: selectedBackground
        });

      // Redirect to meditation room with selected background
      window.location.href = `/meditation/room?bg=${selectedBackground}&eventId=${eventId || ''}`;
    } catch (error) {
      console.error('Error starting meditation:', error);
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
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-amber-800 text-center">
          <div className="relative mb-6">
            <div className="animate-pulse w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full mx-auto"></div>
            <div className="absolute inset-0 w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full mx-auto animate-ping opacity-20"></div>
          </div>
          <p className="text-lg">Opening the sacred lobby...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      
      {/* Hidden protective shield background */}
      <div 
        className="absolute inset-0 opacity-5 bg-center bg-no-repeat bg-contain pointer-events-none"
        style={{
          backgroundImage: 'url(/mz/shield.png)',
          backgroundSize: '800px',
          filter: 'sepia(100%) saturate(200%) hue-rotate(25deg)'
        }}
      />
      
      {/* Header with Tribe Pulse */}
      <div className="relative z-10 p-4 md:p-6">
        <div className="max-w-6xl mx-auto flex justify-between items-start">
          <div className="text-amber-900">
            <h1 className="text-2xl md:text-4xl font-bold mb-2 flex items-center gap-3">
              <div className="relative">
                <span className="text-3xl md:text-4xl">🧘</span>
                <div className="absolute inset-0 animate-pulse bg-amber-300/30 rounded-full scale-150"></div>
              </div>
              Meditation Lobby
            </h1>
            <p className="text-amber-700 text-sm md:text-base">
              Creating a continuous flow of healing energy into the world
            </p>
          </div>

          {/* Tribe Pulse Display */}
          <div className="text-center text-amber-900">
            <div className="relative">
              <svg className="w-16 h-16 md:w-20 md:h-20 transform -rotate-90">
                <circle
                  cx="50%"
                  cy="50%"
                  r="30"
                  stroke="rgba(180,83,9,0.2)"
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
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#EA580C" />
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
      <div className="flex flex-col lg:flex-row max-w-6xl mx-auto w-full p-4 gap-6">
        
        {/* Left Panel - Sacred Environment Selection */}
        <div className="lg:w-80 space-y-6">
          
          {/* Background Selector */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-amber-200 shadow-lg">
            <h3 className="text-amber-900 font-semibold mb-4 flex items-center gap-2">
              🌅 Choose Your Sacred Environment
            </h3>
            <p className="text-amber-700 text-sm mb-4">
              Select your meditation backdrop before entering
            </p>
            <div className="grid grid-cols-2 gap-3">
              {MEDITATION_BACKGROUNDS.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => updateBackground(bg.id)}
                  className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                    selectedBackground === bg.id 
                      ? 'border-amber-500 ring-2 ring-amber-400/50 shadow-lg' 
                      : 'border-amber-200 hover:border-amber-300'
                  }`}
                >
                  <img
                    src={bg.image}
                    alt={bg.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback for missing images
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling!.textContent = bg.name;
                    }}
                  />
                  <div 
                    className="absolute inset-0 flex items-end p-2"
                    style={{ background: bg.overlay }}
                  >
                    <span className="text-white text-xs font-medium drop-shadow-sm">{bg.name}</span>
                  </div>
                  {selectedBackground === bg.id && (
                    <div className="absolute top-1 right-1">
                      <div className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Join Controls */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-amber-200 shadow-lg">
            <h3 className="text-amber-900 font-semibold mb-4">Enter Sacred Space</h3>
            
            <div className="space-y-4">
              <label className="flex items-center text-amber-800 text-sm">
                <input
                  type="checkbox"
                  checked={showAnonymous}
                  onChange={(e) => setShowAnonymous(e.target.checked)}
                  className="mr-2 rounded accent-amber-500"
                />
                Join anonymously
              </label>
              
              <button
                onClick={beginMeditation}
                disabled={!currentUser || !selectedBackground}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-3 px-6 rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!currentUser 
                  ? 'Sign in to Join' 
                  : !selectedBackground 
                  ? 'Choose Environment First'
                  : 'Begin Meditation'
                }
              </button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-amber-200">
              <p className="text-amber-700 text-sm">
                {activeParticipants} {activeParticipants === 1 ? 'soul' : 'souls'} currently meditating
              </p>
            </div>
          </div>

          {/* Light a Candle Link - UPDATED WITH CORRECT PATH */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-amber-200 shadow-lg">
            <h3 className="text-amber-900 font-semibold mb-4 flex items-center gap-2">
              🕯️ Candle Room
            </h3>
            <p className="text-amber-700 text-sm mb-4">
              Light a candle in loving memory of a lost loved one, or send healing light to someone who needs support
            </p>
            <a
              href="/meditation/candles"
              className="block w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-3 px-6 rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all font-medium text-center"
            >
              🕯️ Visit Candle Room
            </a>
          </div>
        </div>

        {/* Center - Preview */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-amber-900 max-w-md">
            {eventId && (
              <div className="mb-8 p-4 bg-white/60 rounded-lg backdrop-blur-sm border border-amber-200">
                <p className="text-lg font-semibold">Group Meditation Session</p>
                <p className="text-sm opacity-75">Event ID: {eventId}</p>
              </div>
            )}

            <div className="space-y-6">
              {/* Preview of selected background */}
              <div className="relative">
                <div 
                  className="w-48 h-32 mx-auto rounded-2xl overflow-hidden border-4 border-amber-300 shadow-xl"
                  style={{
                    backgroundImage: `${currentBg.overlay}, url(${currentBg.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-white text-2xl drop-shadow-lg">🧘</div>
                  </div>
                </div>
                <div className="absolute -inset-2 border-2 border-amber-400 rounded-2xl animate-pulse opacity-30"></div>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  {selectedBackground ? `${currentBg.name} Selected` : 'Choose Your Environment'}
                </h2>
                <p className="text-amber-700">
                  {selectedBackground 
                    ? 'Ready to begin your meditation journey'
                    : 'Select a sacred environment to start'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Lobby Chat */}
        <div className="lg:w-80">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-amber-200 shadow-lg h-96 flex flex-col">
            <div className="p-4 border-b border-amber-200">
              <h3 className="text-amber-900 font-semibold flex items-center gap-2">
                💝 Share What's On Your Heart
              </h3>
              <p className="text-xs text-amber-600 mt-1">
                Please only be kind and respectful of others
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="text-amber-600 text-sm text-center py-8">
                  Be the first to share what's on your heart...
                </div>
              ) : (
                chatMessages.slice().reverse().map((msg, index) => (
                  <div key={index} className="text-sm">
                    <div className="font-medium text-amber-800">
                      {msg.is_anonymous ? 'Anonymous Soul' : (msg.user_name || 'Friend')}
                    </div>
                    <div className="text-amber-700">{msg.message}</div>
                    <div className="text-xs text-amber-600 opacity-75">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {currentUser && (
              <div className="p-4 border-t border-amber-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                    placeholder="Share your heart..."
                    className="flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    maxLength={200}
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={!chatMessage.trim()}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                  >
                    💝
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 p-4 text-center">
        <a 
          href="/calendar"
          className="inline-flex items-center gap-2 text-amber-700 hover:text-amber-900 transition-colors"
        >
          ← Back to Calendar
        </a>
      </div>
    </div>
  );
}

export default function MeditationLobbyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-amber-800 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p>Opening sacred lobby...</p>
        </div>
      </div>
    }>
      <MeditationLobbyContent />
    </Suspense>
  );
}
