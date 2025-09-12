// app/meditation/lounge/page.tsx - Meditation Lounge
"use client";

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

function MeditationLoungeContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId');
  
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAnonymous, setShowAnonymous] = useState(false);
  const [tribePulse, setTribePulse] = useState(0);
  const [activeParticipants, setActiveParticipants] = useState(0);
  
  // Timer states
  const [timerMinutes, setTimerMinutes] = useState(15);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Chat states
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  
  // Scheduler states
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  useEffect(() => {
    initializeLounge();
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isTimerRunning && (timerMinutes > 0 || timerSeconds > 0)) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev === 0) {
            setTimerMinutes(prevMin => {
              if (prevMin === 0) {
                setIsTimerRunning(false);
                playBell();
                return 0;
              }
              return prevMin - 1;
            });
            return 59;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerRunning, timerMinutes, timerSeconds]);

  const initializeLounge = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      await calculateTribePulse();
      await getActiveParticipants();
      await loadChatMessages();
      
      // Set up real-time chat subscription
      const chatSubscription = supabase
        .channel('lobby_chat_channel')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'lobby_chat' },
          () => loadChatMessages()
        )
        .subscribe();
      
      return () => {
        chatSubscription.unsubscribe();
      };
    } catch (error) {
      console.error('Lounge initialization error:', error);
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
        const totalMinutes = 24 * 60;
        const coveredMinutes = sessions.length * 15;
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
        .limit(30);

      setChatMessages(messages || []);
    } catch (error) {
      console.error('Chat messages error:', error);
    }
  };

  const sendChatMessage = async () => {
    if (!chatMessage.trim() || !currentUser) return;

    try {
      await supabase
        .from('lobby_chat')
        .insert({
          user_id: showAnonymous ? null : currentUser.id,
          message: chatMessage.trim(),
          is_anonymous: showAnonymous
        });

      setChatMessage('');
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const playBell = () => {
    const audio = new Audio('/sounds/meditation-bell.mp3');
    audio.play().catch(() => {
      // Fallback if audio doesn't exist
      alert('Meditation session complete! 🔔');
    });
  };

  const startTimer = () => {
    setIsTimerRunning(true);
    playBell();
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerMinutes(15);
    setTimerSeconds(0);
  };

  const adjustTimer = (minutes: number) => {
    setTimerMinutes(Math.max(0, Math.min(99, timerMinutes + minutes)));
  };

  const enterMeditationRoom = () => {
    if (!currentUser) {
      alert('Please sign in to enter the meditation room');
      return;
    }
    window.location.href = `/meditation/room?eventId=${eventId || ''}`;
  };

  const scheduleSession = async () => {
    if (!currentUser || !scheduledDate || !scheduledTime) {
      alert('Please select a date and time');
      return;
    }

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
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950 flex items-center justify-center">
        <div className="text-white/80 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto mb-4"></div>
          <p>Entering the lounge...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950 relative">
      
      {/* Subtle animated background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[url('/images/sacred-geometry.png')] bg-center bg-no-repeat bg-cover mix-blend-overlay"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <a href="/meditation" className="text-amber-400 hover:text-amber-300 transition-colors">
                ← Back
              </a>
              <h1 className="text-2xl font-light text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-100">
                Meditation Lounge
              </h1>
            </div>
            
            {/* Tribe Pulse */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">{tribePulse}%</div>
                <div className="text-xs text-amber-200/70">24h Coverage</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{activeParticipants}</div>
                <div className="text-xs text-purple-200/70">Active Now</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="relative z-10 max-w-7xl mx-auto p-4 grid lg:grid-cols-3 gap-6">
        
        {/* Left Column - Timer & Controls */}
        <div className="space-y-6">
          
          {/* Meditation Timer */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
            <h2 className="text-lg font-light text-amber-200 mb-4 text-center">Meditation Timer</h2>
            
            {/* Timer Display */}
            <div className="text-center mb-6">
              <div className="text-6xl font-light text-white tabular-nums">
                {String(timerMinutes).padStart(2, '0')}:{String(timerSeconds).padStart(2, '0')}
              </div>
            </div>

            {/* Timer Controls */}
            <div className="flex justify-center gap-2 mb-4">
              <button
                onClick={() => adjustTimer(-5)}
                className="px-3 py-1 text-white/70 hover:text-white hover:bg-white/10 rounded transition-all"
              >
                -5
              </button>
              <button
                onClick={() => adjustTimer(-1)}
                className="px-3 py-1 text-white/70 hover:text-white hover:bg-white/10 rounded transition-all"
              >
                -1
              </button>
              <button
                onClick={() => adjustTimer(1)}
                className="px-3 py-1 text-white/70 hover:text-white hover:bg-white/10 rounded transition-all"
              >
                +1
              </button>
              <button
                onClick={() => adjustTimer(5)}
                className="px-3 py-1 text-white/70 hover:text-white hover:bg-white/10 rounded transition-all"
              >
                +5
              </button>
            </div>

            {/* Play/Pause/Reset */}
            <div className="flex gap-2">
              {!isTimerRunning ? (
                <button
                  onClick={startTimer}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all"
                >
                  Start
                </button>
              ) : (
                <button
                  onClick={pauseTimer}
                  className="flex-1 bg-gradient-to-r from-yellow-600 to-orange-600 text-white py-2 rounded-lg hover:from-yellow-700 hover:to-orange-700 transition-all"
                >
                  Pause
                </button>
              )}
              <button
                onClick={resetTimer}
                className="px-4 py-2 border border-white/20 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                Reset
              </button>
            </div>

            {/* Preset Times */}
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {[5, 10, 15, 20, 30, 45].map(minutes => (
                <button
                  key={minutes}
                  onClick={() => {
                    setTimerMinutes(minutes);
                    setTimerSeconds(0);
                    setIsTimerRunning(false);
                  }}
                  className="px-3 py-1 text-xs border border-white/20 text-white/70 hover:text-white hover:bg-white/10 rounded transition-all"
                >
                  {minutes}m
                </button>
              ))}
            </div>
          </div>

          {/* Enter Meditation Room */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-light text-purple-200 mb-4">Join Group Meditation</h3>
            <p className="text-white/60 text-sm mb-4">
              Enter the sacred meditation room to join others in collective consciousness
            </p>
            
            <label className="flex items-center text-white/70 text-sm mb-4">
              <input
                type="checkbox"
                checked={showAnonymous}
                onChange={(e) => setShowAnonymous(e.target.checked)}
                className="mr-2 rounded accent-purple-500"
              />
              Join anonymously
            </label>
            
            <button
              onClick={enterMeditationRoom}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-medium"
            >
              Enter Meditation Room
            </button>
          </div>

          {/* Schedule Session */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-light text-indigo-200 mb-4">Schedule Session</h3>
            
            {!showScheduler ? (
              <button
                onClick={() => setShowScheduler(true)}
                className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all"
              >
                📅 Schedule a Session
              </button>
            ) : (
              <div className="space-y-3">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={scheduleSession}
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setShowScheduler(false)}
                    className="px-4 py-2 border border-white/20 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Column - Candle Room & Resources */}
        <div className="space-y-6">
          
          {/* Candle Room */}
          <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 backdrop-blur-md rounded-2xl p-6 border border-amber-500/20">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🕯️</div>
              <h2 className="text-2xl font-light text-amber-200 mb-2">Sacred Candle Room</h2>
              <p className="text-amber-100/70 text-sm">
                Light a candle for loved ones who have passed, or send healing light to those in need
              </p>
            </div>
            
            <div className="space-y-3 text-amber-100/60 text-sm mb-6">
              <p>✨ Honor the memory of those who've transitioned</p>
              <p>💝 Send healing energy to someone in need</p>
              <p>🙏 Create a sacred intention for transformation</p>
            </div>
            
            <a
              href="/meditation/candles"
              className="block w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-3 rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all text-center font-medium"
            >
              Enter Candle Room
            </a>
          </div>

          {/* Meditation Resources */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-light text-cyan-200 mb-4">Meditation Resources</h3>
            <div className="space-y-3">
              <a href="/meditation/guides" className="block p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all text-white/80 hover:text-white">
                📖 Guided Meditations
              </a>
              <a href="/meditation/music" className="block p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all text-white/80 hover:text-white">
                🎵 Sacred Music
              </a>
              <a href="/meditation/teachings" className="block p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all text-white/80 hover:text-white">
                🌟 Spiritual Teachings
              </a>
            </div>
          </div>

          {/* Prayer Requests */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-light text-rose-200 mb-4">Prayer Circle</h3>
            <p className="text-white/60 text-sm mb-4">
              Submit prayer requests for yourself or others. Our community holds these intentions during meditation.
            </p>
            <button className="w-full bg-gradient-to-r from-rose-600 to-pink-600 text-white py-2 rounded-lg hover:from-rose-700 hover:to-pink-700 transition-all">
              Submit Prayer Request
            </button>
          </div>
        </div>

        {/* Right Column - Community Chat */}
        <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 h-[600px] flex flex-col">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-lg font-light text-emerald-200 flex items-center gap-2">
              💝 Community Heart Space
            </h3>
            <p className="text-xs text-white/50 mt-1">
              Share with kindness and compassion
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 ? (
              <div className="text-white/40 text-sm text-center py-8">
                Be the first to share your light...
              </div>
            ) : (
              chatMessages.slice().reverse().map((msg, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-3">
                  <div className="font-medium text-emerald-300 text-sm">
                    {msg.is_anonymous ? '✨ Anonymous Soul' : (msg.user_name || 'Light Worker')}
                  </div>
                  <div className="text-white/80 text-sm mt-1">{msg.message}</div>
                  <div className="text-xs text-white/40 mt-2">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {currentUser ? (
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Share your heart..."
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  maxLength={200}
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatMessage.trim()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 border-t border-white/10 text-center">
              <p className="text-white/50 text-sm">Sign in to join the conversation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MeditationLoungePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950 flex items-center justify-center">
        <div className="text-white/80 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto mb-4"></div>
          <p>Loading lounge...</p>
        </div>
      </div>
    }>
      <MeditationLoungeContent />
    </Suspense>
  );
}
