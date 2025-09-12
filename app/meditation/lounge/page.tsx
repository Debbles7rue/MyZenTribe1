// app/meditation/lounge/page.tsx - Meditation Lounge
"use client";

import { useEffect, useState, Suspense } from 'react';
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
  
  // Chat states
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  
  // Scheduler states
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  useEffect(() => {
    initializeLounge();
  }, []);

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
      
      {/* Animated background with floating orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -left-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl top-1/2 -right-48 animate-pulse delay-1000"></div>
        <div className="absolute w-96 h-96 bg-amber-600/10 rounded-full blur-3xl bottom-0 left-1/3 animate-pulse delay-500"></div>
      </div>

      {/* Header with Glass Effect */}
      <div className="relative z-10 bg-white/5 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <a 
                href="/meditation" 
                className="group flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-all duration-300"
              >
                <span className="group-hover:-translate-x-1 transition-transform">←</span>
                <span>Back</span>
              </a>
              <div className="h-6 w-px bg-white/20"></div>
              <h1 className="text-3xl font-extralight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 tracking-wide">
                Meditation Lounge
              </h1>
            </div>
            
            {/* Live Stats with Pulsing Animation */}
            <div className="flex items-center gap-8">
              <div className="relative group">
                <div className="absolute inset-0 bg-amber-400/20 rounded-lg blur-xl group-hover:bg-amber-400/30 transition-all"></div>
                <div className="relative text-center px-4 py-2">
                  <div className="text-3xl font-bold text-amber-400 animate-pulse">{tribePulse}%</div>
                  <div className="text-xs text-amber-200/70 uppercase tracking-wider">24h Coverage</div>
                </div>
              </div>
              <div className="relative group">
                <div className="absolute inset-0 bg-purple-400/20 rounded-lg blur-xl group-hover:bg-purple-400/30 transition-all"></div>
                <div className="relative text-center px-4 py-2">
                  <div className="text-3xl font-bold text-purple-400">
                    <span className="inline-block animate-pulse">{activeParticipants}</span>
                  </div>
                  <div className="text-xs text-purple-200/70 uppercase tracking-wider">Active Now</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto p-6">
        
        {/* Top Section - Meditation & Candle Rooms Side by Side */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          
          {/* Join Group Meditation Card */}
          <div className="group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-indigo-600/20 rounded-3xl transform transition-transform group-hover:scale-105"></div>
            <div className="relative bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10 hover:border-purple-400/30 transition-all duration-500">
              
              {/* Floating Meditation Icon */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-500/30 rounded-full blur-2xl animate-pulse"></div>
                  <div className="relative w-24 h-24 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl transform transition-transform group-hover:scale-110">
                    <span className="text-4xl">🧘</span>
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-light text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-indigo-200 mb-4">
                Group Meditation
              </h2>
              
              <p className="text-white/70 text-center mb-6 leading-relaxed">
                Join others in the sacred meditation room for collective consciousness and shared peace
              </p>

              <div className="space-y-4">
                <label className="flex items-center justify-center text-white/70 hover:text-white/90 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAnonymous}
                    onChange={(e) => setShowAnonymous(e.target.checked)}
                    className="mr-3 w-4 h-4 rounded accent-purple-500"
                  />
                  <span className="text-sm">Join anonymously</span>
                </label>
                
                <button
                  onClick={enterMeditationRoom}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 font-medium text-lg shadow-lg hover:shadow-purple-500/25 transform hover:-translate-y-0.5"
                >
                  Enter Meditation Room
                </button>
              </div>
            </div>
          </div>

          {/* Sacred Candle Room Card */}
          <div className="group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-600/20 to-orange-600/20 rounded-3xl transform transition-transform group-hover:scale-105"></div>
            <div className="relative bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10 hover:border-amber-400/30 transition-all duration-500">
              
              {/* Floating Candle Icon */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-500/30 rounded-full blur-2xl animate-pulse"></div>
                  <div className="relative w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shadow-2xl transform transition-transform group-hover:scale-110">
                    <span className="text-4xl">🕯️</span>
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-light text-center text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-orange-200 mb-4">
                Sacred Candle Room
              </h2>
              
              <p className="text-white/70 text-center mb-6 leading-relaxed">
                Light a candle for loved ones who have passed, or send healing light to those in need
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-amber-100/60 text-sm">
                  <span className="text-amber-400">✨</span>
                  <span>Honor those who've transitioned</span>
                </div>
                <div className="flex items-center gap-3 text-amber-100/60 text-sm">
                  <span className="text-amber-400">💝</span>
                  <span>Send healing energy</span>
                </div>
                <div className="flex items-center gap-3 text-amber-100/60 text-sm">
                  <span className="text-amber-400">🙏</span>
                  <span>Set sacred intentions</span>
                </div>
              </div>
              
              <a
                href="/meditation/candles"
                className="block w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl hover:from-amber-700 hover:to-orange-700 transition-all duration-300 font-medium text-lg text-center shadow-lg hover:shadow-amber-500/25 transform hover:-translate-y-0.5"
              >
                Enter Candle Room
              </a>
            </div>
          </div>
        </div>

        {/* Schedule Session Strip */}
        <div className="mb-8">
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">📅</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-indigo-200">Schedule Your Session</h3>
                  <p className="text-sm text-white/60">Plan your meditation practice ahead</p>
                </div>
              </div>
              
              {!showScheduler ? (
                <button
                  onClick={() => {
                    if (!currentUser) {
                      alert('Please sign in to schedule a session');
                      return;
                    }
                    setShowScheduler(true);
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    setScheduledDate(tomorrow.toISOString().split('T')[0]);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-indigo-500/25"
                >
                  Schedule Session
                </button>
              ) : (
                <div className="flex flex-wrap gap-3 items-center">
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <button
                    onClick={scheduleSession}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                    disabled={!scheduledDate || !scheduledTime}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => {
                      setShowScheduler(false);
                      setScheduledDate('');
                      setScheduledTime('');
                    }}
                    className="px-4 py-2 border border-white/20 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Community Chat - Full Width Below */}
        <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-xl">💝</span>
                </div>
                <div>
                  <h3 className="text-xl font-medium text-emerald-200">Community Heart Space</h3>
                  <p className="text-sm text-white/60">Share with kindness and compassion</p>
                </div>
              </div>
              {activeParticipants > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 rounded-full">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-emerald-200">{activeParticipants} active</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Chat Messages Area */}
          <div className="h-96 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-transparent to-black/10">
            {chatMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4 opacity-20">🕊️</div>
                  <p className="text-white/40 text-lg">Be the first to share your light...</p>
                </div>
              </div>
            ) : (
              chatMessages.slice().reverse().map((msg, index) => (
                <div 
                  key={index} 
                  className="group bg-white/5 hover:bg-white/10 rounded-2xl p-4 transition-all duration-300 backdrop-blur-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">{msg.is_anonymous ? '✨' : '🙏'}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="font-medium text-emerald-300">
                          {msg.is_anonymous ? 'Anonymous Soul' : (msg.user_name || 'Light Worker')}
                        </span>
                        <span className="text-xs text-white/40">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-white/80 leading-relaxed">{msg.message}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Chat Input */}
          {currentUser ? (
            <div className="p-6 border-t border-white/10 bg-black/10">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Share your heart..."
                  className="flex-1 px-5 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  maxLength={200}
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatMessage.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-emerald-500/25"
                >
                  Send
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 border-t border-white/10 bg-black/10">
              <div className="text-center">
                <p className="text-white/50 mb-3">Sign in to join the conversation</p>
                <a 
                  href="/signin" 
                  className="inline-block px-6 py-2 bg-emerald-600/20 text-emerald-300 rounded-xl hover:bg-emerald-600/30 transition-all"
                >
                  Sign In
                </a>
              </div>
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
