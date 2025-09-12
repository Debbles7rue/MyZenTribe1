// app/meditation/page.tsx - Updated Prayer/Meditation Lobby
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

function MeditationLobbyContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId');
  
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAnonymous, setShowAnonymous] = useState(false);
  const [tribePulse, setTribePulse] = useState(0);
  const [activeParticipants, setActiveParticipants] = useState(0);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  useEffect(() => {
    initializeLobby();
  }, []);

  const initializeLobby = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

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
    if (!currentUser) {
      alert('Please sign in to join the prayer/meditation room');
      return;
    }

    // Redirect to meditation room
    window.location.href = `/meditation/room?eventId=${eventId || ''}`;
  };

  const scheduleSession = async () => {
    if (!currentUser || !scheduledDate || !scheduledTime) {
      alert('Please select a date and time');
      return;
    }

    // Create calendar event
    const eventDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    
    try {
      await supabase
        .from('calendar_events')
        .insert({
          user_id: currentUser.id,
          title: 'Prayer/Meditation Session',
          start_time: eventDateTime.toISOString(),
          duration_minutes: 30,
          event_type: 'meditation',
          is_public: !showAnonymous
        });

      alert('Session scheduled! You can view it in your calendar.');
      setShowScheduler(false);
      setScheduledDate('');
      setScheduledTime('');
    } catch (error) {
      console.error('Error scheduling session:', error);
      alert('Failed to schedule session. Please try again.');
    }
  };

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
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start">
          <div className="text-amber-900">
            <h1 className="text-2xl md:text-4xl font-bold mb-2 flex items-center gap-3">
              <div className="relative">
                <span className="text-3xl md:text-4xl">🙏</span>
                <div className="absolute inset-0 animate-pulse bg-amber-300/30 rounded-full scale-150"></div>
              </div>
              Prayer/Meditation Lobby
            </h1>
            <p className="text-amber-700 text-sm md:text-base">
              Creating a continuous flow of healing energy into the world
            </p>
          </div>

          {/* Tribe Pulse Display */}
          <div className="text-center text-amber-900 mt-4 md:mt-0">
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
        
        {/* Left Panel - Mission & Controls */}
        <div className="lg:w-80 space-y-6">
          
          {/* Mission Statement */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-amber-200 shadow-lg">
            <h3 className="text-amber-900 font-semibold mb-4 flex items-center gap-2">
              ✨ The Power of Collective Prayer
            </h3>
            <p className="text-amber-700 text-sm mb-4">
              When we meditate and pray together, even from different locations, we create a powerful field of healing energy that radiates across the world.
            </p>
            <p className="text-amber-700 text-sm mb-4">
              <strong>Our Mission:</strong> To maintain continuous 24/7 prayer and meditation coverage, ensuring someone is always holding space for healing, peace, and love on our planet.
            </p>
            <div className="bg-amber-100/50 rounded-lg p-3 text-amber-800 text-sm">
              <p className="font-semibold mb-1">📊 Current Coverage: {tribePulse}%</p>
              <p className="text-xs">Help us reach 100% coverage by joining or scheduling a session!</p>
            </div>
          </div>

          {/* Quick Schedule */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-amber-200 shadow-lg">
            <h3 className="text-amber-900 font-semibold mb-4">📅 Schedule Your Session</h3>
            
            {!showScheduler ? (
              <button
                onClick={() => setShowScheduler(true)}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-6 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-medium"
              >
                Schedule a Session
              </button>
            ) : (
              <div className="space-y-3">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={scheduleSession}
                    className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  >
                    Add to Calendar
                  </button>
                  <button
                    onClick={() => setShowScheduler(false)}
                    className="px-4 py-2 border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            <a
              href="/meditation/schedule"
              className="block mt-3 text-center text-amber-600 hover:text-amber-700 text-sm"
            >
              Advanced scheduling options →
            </a>
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
                disabled={!currentUser}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-3 px-6 rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!currentUser 
                  ? 'Sign in to Join' 
                  : 'Enter Prayer/Meditation Room'
                }
              </button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-amber-200">
              <p className="text-amber-700 text-sm">
                {activeParticipants} {activeParticipants === 1 ? 'soul' : 'souls'} currently in prayer/meditation
              </p>
            </div>
          </div>

          {/* Candle Room Link */}
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

        {/* Center - Welcome Message */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-amber-900 max-w-md">
            {eventId && (
              <div className="mb-8 p-4 bg-white/60 rounded-lg backdrop-blur-sm border border-amber-200">
                <p className="text-lg font-semibold">Group Prayer/Meditation Session</p>
                <p className="text-sm opacity-75">Event ID: {eventId}</p>
              </div>
            )}

            <div className="space-y-6">
              {/* Sacred space visual */}
              <div className="relative">
                <div className="w-48 h-48 mx-auto rounded-full bg-gradient-to-br from-amber-200 via-orange-200 to-yellow-200 flex items-center justify-center shadow-xl">
                  <div className="text-6xl">🕉️</div>
                </div>
                <div className="absolute -inset-2 border-2 border-amber-400 rounded-full animate-pulse opacity-30"></div>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  Welcome to the Sacred Space
                </h2>
                <p className="text-amber-700 mb-4">
                  Join our global community in prayer and meditation
                </p>
                <p className="text-amber-600 text-sm">
                  "Where two or three gather in my name, there am I with them" - Matthew 18:20
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
