// app/meditation/page.tsx
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function MeditationContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Preparing your meditation space...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="text-center text-white max-w-2xl">
        <h1 className="text-4xl font-bold mb-6">🧘 Meditation Room</h1>
        
        {eventId && (
          <div className="mb-6 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
            <p className="text-lg">Welcome to your meditation session</p>
            <p className="text-sm opacity-75">Event ID: {eventId}</p>
          </div>
        )}

        <div className="space-y-6">
          <p className="text-xl mb-8">
            Find your center. Breathe deeply. Let peace flow through you.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <button className="p-6 bg-white/10 rounded-lg backdrop-blur-sm hover:bg-white/20 transition-all">
              <div className="text-3xl mb-2">🌅</div>
              <div className="font-medium">Sunrise Meditation</div>
              <div className="text-sm opacity-75">Start your day with intention</div>
            </button>

            <button className="p-6 bg-white/10 rounded-lg backdrop-blur-sm hover:bg-white/20 transition-all">
              <div className="text-3xl mb-2">🌙</div>
              <div className="font-medium">Evening Reflection</div>
              <div className="text-sm opacity-75">Wind down and reflect</div>
            </button>

            <button className="p-6 bg-white/10 rounded-lg backdrop-blur-sm hover:bg-white/20 transition-all">
              <div className="text-3xl mb-2">🌊</div>
              <div className="font-medium">Ocean Sounds</div>
              <div className="text-sm opacity-75">Peaceful wave meditation</div>
            </button>

            <button className="p-6 bg-white/10 rounded-lg backdrop-blur-sm hover:bg-white/20 transition-all">
              <div className="text-3xl mb-2">🕯️</div>
              <div className="font-medium">Candlelight Focus</div>
              <div className="text-sm opacity-75">Gentle flame meditation</div>
            </button>
          </div>

          <div className="mt-8 p-4 bg-white/5 rounded-lg">
            <p className="text-sm italic">
              "In the stillness of the present moment, we find infinite peace."
            </p>
          </div>

          <a 
            href="/calendar"
            className="inline-block mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium"
          >
            ← Back to Calendar
          </a>
        </div>
      </div>
    </div>
  );
}

export default function MeditationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading meditation room...</p>
        </div>
      </div>
    }>
      <MeditationContent />
    </Suspense>
  );
}
