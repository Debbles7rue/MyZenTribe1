// app/meditation/page.tsx - Sacred Entry to Meditation
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

export default function MeditationEntryPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pulseAnimation, setPulseAnimation] = useState(0);

  useEffect(() => {
    checkUser();
    // Gentle pulse animation
    const interval = setInterval(() => {
      setPulseAnimation(prev => (prev + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('User check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const enterLounge = () => {
    router.push('/meditation/lounge');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-900 to-indigo-950 flex items-center justify-center">
        <div className="text-white/80 text-center">
          <div className="relative mb-6">
            <div className="animate-pulse w-20 h-20 bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full mx-auto"></div>
            <div className="absolute inset-0 w-20 h-20 bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full mx-auto animate-ping opacity-20"></div>
          </div>
          <p className="text-lg">Preparing sacred space...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-900 to-indigo-950 relative overflow-hidden">
      
      {/* Animated cosmic background */}
      <div className="absolute inset-0">
        {/* Stars */}
        <div className="absolute inset-0">
          {[...Array(100)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            >
              <div 
                className="w-1 h-1 bg-white rounded-full"
                style={{
                  opacity: 0.3 + Math.random() * 0.7,
                  boxShadow: '0 0 6px rgba(255,255,255,0.5)'
                }}
              />
            </div>
          ))}
        </div>

        {/* Ethereal glow orbs */}
        <div 
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10"
          style={{
            background: `radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)`,
            transform: `translate(${Math.sin(pulseAnimation * 0.01) * 20}px, ${Math.cos(pulseAnimation * 0.01) * 20}px)`
          }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-10"
          style={{
            background: `radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)`,
            transform: `translate(${Math.cos(pulseAnimation * 0.01) * 20}px, ${Math.sin(pulseAnimation * 0.01) * 20}px)`
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        
        {/* Sacred Symbol */}
        <div className="relative mb-12">
          <div className="relative">
            {/* Outer rotating ring */}
            <div 
              className="absolute -inset-8 rounded-full border border-amber-400/30"
              style={{
                transform: `rotate(${pulseAnimation}deg)`,
                boxShadow: '0 0 40px rgba(251,191,36,0.2)'
              }}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
              </div>
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2">
                <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
              </div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2">
                <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
              </div>
            </div>

            {/* Center sacred symbol */}
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-400 flex items-center justify-center shadow-2xl relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-400 animate-pulse opacity-50"></div>
              <span className="text-6xl relative z-10">🕉️</span>
            </div>
          </div>
        </div>

        {/* Sacred Text */}
        <div className="text-center max-w-3xl mx-auto space-y-8">
          <h1 className="text-4xl md:text-6xl font-light text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200">
            Sacred Space of Unity
          </h1>

          <div className="space-y-6 text-white/90">
            <p className="text-xl md:text-2xl font-light leading-relaxed">
              In the stillness of meditation, we touch the infinite.<br/>
              In the power of prayer, we move mountains.
            </p>

            <div className="border-t border-b border-white/20 py-6 space-y-4">
              <p className="text-lg text-amber-200/90">
                When we gather in meditation, even across vast distances, our consciousness creates ripples of healing that touch every corner of existence.
              </p>
              
              <p className="text-base text-white/70 italic">
                "Where two or three gather in my name, there am I with them"
                <span className="block text-sm mt-1 not-italic">- Matthew 18:20</span>
              </p>
            </div>

            <div className="space-y-3 text-white/80">
              <h2 className="text-2xl font-light text-amber-200">The Power of Collective Consciousness</h2>
              <p className="leading-relaxed">
                Scientific studies have shown that group meditation creates measurable positive effects in the surrounding environment. 
                Crime rates decrease, hospital admissions drop, and a palpable sense of peace emerges.
              </p>
              <p className="leading-relaxed">
                By joining our continuous prayer and meditation circle, you become part of a living mandala of light workers, 
                holding space for healing, transformation, and awakening across our beautiful planet.
              </p>
            </div>
          </div>

          {/* Enter Button */}
          <div className="pt-8">
            <button
              onClick={enterLounge}
              className="group relative px-12 py-5 text-lg font-medium text-indigo-950 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 rounded-full shadow-2xl hover:shadow-amber-400/50 transition-all duration-500 hover:scale-105"
            >
              <span className="relative z-10 flex items-center gap-3">
                Enter the Meditation Lounge
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>
            </button>

            {!currentUser && (
              <p className="mt-4 text-amber-200/60 text-sm">
                Sign in to access all features and track your meditation journey
              </p>
            )}
          </div>
        </div>

        {/* Bottom quote */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <p className="text-white/40 text-sm italic">
            "Be still and know that I am God" - Psalm 46:10
          </p>
        </div>
      </div>
    </div>
  );
}
