// components/HomeFeed.tsx
"use client";

import { useEffect, useState } from "react";
import { listHomeFeed, Post, me } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import SOSFloatingButton from "@/components/SOSFloatingButton";
import PostComposer from "@/components/PostComposer";

export default function HomeFeed() {
  const [rows, setRows] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    
    // Get current user ID
    const userId = await me();
    setCurrentUserId(userId);
    
    const { rows, error } = await listHomeFeed();
    if (error) {
      console.error("Error loading posts:", error);
    }
    setRows(rows);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <>
      {/* Main Content Area - Added padding bottom for fixed nav and SOS button */}
      <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-32">
        {/* Community Guidelines Disclaimer */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mb-5 border border-purple-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🕊️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-purple-900 mb-1">Welcome to Your Peaceful Space</h3>
              <p className="text-sm text-purple-700">
                This is a sanctuary free from political discourse and divisive content. 
                We're bombarded with terrible news everywhere else—here we celebrate only good news and positive moments. 
                Share your joy, gratitude, and uplifting experiences with your tribe. 💜
              </p>
            </div>
          </div>
        </div>

        {/* Post Composer Component */}
        <PostComposer onPostCreated={load} className="mb-5" />

        {/* Daily Intention Card */}
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4 mb-5">
          <h3 className="font-semibold text-purple-800 mb-2">✨ Daily Intention</h3>
          <p className="text-purple-700 text-sm italic">"Today I choose peace, presence, and compassion."</p>
          <button className="mt-2 text-xs text-purple-600 hover:underline">Set your intention →</button>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-3">
              <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              <span className="text-gray-500">Loading your tribe's moments...</span>
            </div>
          </div>
        ) : rows.length ? (
          <div className="space-y-4">
            {rows.map((p) => (
              <PostCard 
                key={p.id} 
                post={p} 
                onChanged={load}
                currentUserId={currentUserId || undefined}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-6xl mb-4">🧘</div>
            <div className="text-xl font-semibold text-gray-700">Your feed awaits</div>
            <div className="text-gray-500 mt-2">Share your first moment of mindfulness above.</div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Navigation Bar - Shows on both mobile and desktop */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
        <div className="max-w-2xl mx-auto px-4 py-2">
          <div className="grid grid-cols-4 gap-1">
            <a 
              href="/notifications" 
              className="group flex flex-col items-center justify-center py-2 px-1 text-center hover:bg-purple-50 rounded-lg transition-all relative"
            >
              <span className="text-xl mb-1 group-hover:scale-110 transition-transform">🔔</span>
              <span className="text-xs text-gray-600 group-hover:text-purple-700">Alerts</span>
            </a>
            <a 
              href="/contact" 
              className="group flex flex-col items-center justify-center py-2 px-1 text-center hover:bg-purple-50 rounded-lg transition-all"
            >
              <span className="text-xl mb-1 group-hover:scale-110 transition-transform">📧</span>
              <span className="text-xs text-gray-600 group-hover:text-purple-700">Contact</span>
            </a>
            <a 
              href="/suggestions" 
              className="group flex flex-col items-center justify-center py-2 px-1 text-center hover:bg-green-50 rounded-lg transition-all"
            >
              <span className="text-xl mb-1 group-hover:scale-110 transition-transform">💡</span>
              <span className="text-xs text-gray-600 group-hover:text-green-700">Suggest</span>
            </a>
            <a 
              href="/donate" 
              className="group flex flex-col items-center justify-center py-2 px-1 text-center hover:bg-blue-50 rounded-lg transition-all"
            >
              <span className="text-xl mb-1 group-hover:scale-110 transition-transform">💝</span>
              <span className="text-xs text-gray-600 group-hover:text-blue-700">Donate</span>
            </a>
          </div>
        </div>
        
        {/* Subtle gradient decoration */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300"></div>
      </div>

      <SOSFloatingButton />
    </>
  );
}
