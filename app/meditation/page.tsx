// app/meditation/page.tsx - Prayer/Meditation Lobby (Main Entry)
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

  const beginMeditation = async () => {
    if (!currentUser) {
      alert('Please sign in to join the prayer/meditation room');
      return;
    }

    // Redirect to meditation room
    window.location.href = `/meditation/room?eventId=${eventId || ''}`;
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
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-4">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-amber-900">
              🙏 Prayer & Meditation Lobby
            </h1>
            <p className="text-amber-700">
              Creating a continuous flow of healing energy into the world
            </p>
          </div>
          
          {/* Tribe Pulse Display */}
          <div className="text-center mb-6">
            <div className="inline-block bg-white/60 backdrop-blur-sm rounded-2xl p-4 px-8 border border-amber-200">
              <div className="text-3xl font-bold text-amber-800">{tribePulse}%</div>
              <div className="text-sm text-amber-700">24h Tribe Pulse</div>
              <p className="text-xs mt-1 opacity-75">Help us reach 100% coverage!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        
        {/* Mission Statement */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-amber-200 shadow-lg mb-6">
          <h3 className="text-amber-900 font-semibold mb-4 flex items-center gap-2">
            ✨ The Power of Collective Prayer
          </h3>
          <p className="text-amber-700 text-sm mb-3">
            When we meditate and pray together, even from different locations, we create a powerful field of healing energy that radiates across the world.
          </p>
          <p className="text-amber-700 text-sm">
            <strong>Our Mission:</strong> To maintain continuous 24/7 prayer and meditation coverage, ensuring someone is always holding space for healing, peace, and love on our planet.
          </p>
          <div className="mt-4 bg-amber-100/50 rounded-lg p-3 text-amber-800 text-sm">
            <p className="font-semibold">📊 Current Coverage: {tribePulse}%</p>
            <p className="text-xs mt-1">Help us reach 100% coverage by joining or scheduling a session!</p>
          </div>
        </div>

        {/* Quick Schedule */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-amber-200 shadow-lg mb-6">
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

        {/* Enter Sacred Space */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-amber-200 shadow-lg mb-6">
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

        {/* Candle Room Link - FIXED PATH */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-amber-200 shadow-lg mb-6">
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

        {/* Community Lounge Link */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-amber-200 shadow-lg mb-6">
          <h3 className="text-amber-900 font-semibold mb-4 flex items-center gap-2">
            💬 Community Lounge
          </h3>
          <p className="text-amber-700 text-sm mb-4">
            Connect with other souls before or after your meditation practice
          </p>
          <a
            href="/meditation/lounge"
            className="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-medium text-center"
          >
            Enter Community Lounge
          </a>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <a 
            href="/calendar"
            className="inline-flex items-center gap-2 text-amber-700 hover:text-amber-900 transition-colors"
          >
            ← Back to Calendar
          </a>
        </div>
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
