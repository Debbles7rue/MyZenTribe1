// components/HomeFeed.tsx - UPDATED BOTTOM BAR
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
  const [intentionExpanded, setIntentionExpanded] = useState(false);

  // Placeholder data - connect to real data later
  const [upcomingEvents] = useState(3);
  const [eventInvites] = useState(2);
  const [friendRequests] = useState(5);
  const [unreadMessages] = useState(3);
  const [suggestedFriends] = useState([
    { id: 1, name: "Sarah M.", mutualFriends: 12 },
    { id: 2, name: "Mike K.", mutualFriends: 8 },
    { id: 3, name: "Jen L.", mutualFriends: 15 },
  ]);

  async function load() {
    console.log("🔄 Refreshing posts...");
    setLoading(true);
    
    const userId = await me();
    setCurrentUserId(userId);
    
    const { rows, error } = await listHomeFeed();
    if (error) {
      console.error("Error loading posts:", error);
    }
    
    console.log(`✅ Loaded ${rows.length} posts`);
    rows.forEach(post => {
      if (post.comment_count > 0) {
        console.log(`Post ${post.id.substring(0, 8)}: ${post.comment_count} comments`);
      }
    });
    
    setRows(rows);
    setLoading(false);
  }

  useEffect(() => { 
    console.log("🚀 HomeFeed mounted, loading initial posts");
    load(); 
  }, []);

  return (
    <>
      {/* Main Container with Sidebar Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        <div className="flex gap-6">
          
          {/* Main Feed Column */}
          <div className="flex-1 max-w-2xl mx-auto lg:mx-0">
            
            {/* Welcome Banner */}
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

            {/* Post Composer */}
            <PostComposer 
              onPostCreated={() => {
                console.log("📝 New post created, refreshing feed");
                load();
              }} 
              className="mb-5" 
            />

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
                    onChanged={() => {
                      console.log(`💬 Post ${p.id.substring(0, 8)} changed, refreshing feed`);
                      load();
                    }}
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

            {/* Daily Intention - Mobile Only (Bottom, Collapsible) */}
            <div className="lg:hidden mt-6">
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl overflow-hidden border border-purple-200">
                <button 
                  onClick={() => setIntentionExpanded(!intentionExpanded)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-purple-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">✨</span>
                    <span className="font-semibold text-purple-800 text-sm">Daily Intention</span>
                  </div>
                  <span className="text-purple-600 text-xl transform transition-transform" style={{ transform: intentionExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    ▼
                  </span>
                </button>
                
                {intentionExpanded && (
                  <div className="px-4 pb-4 animate-fadeIn">
                    <p className="text-purple-700 text-sm italic mb-2">"Today I choose peace, presence, and compassion."</p>
                    <button className="text-xs text-purple-600 hover:underline">Set your intention →</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Sidebar - Hidden on Mobile/Tablet */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-4 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-200 scrollbar-track-transparent">
              
              {/* Daily Intention Widget */}
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4 border border-purple-200">
                <h3 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                  <span>✨</span> Daily Intention
                </h3>
                <p className="text-purple-700 text-sm italic mb-3">"Today I choose peace, presence, and compassion."</p>
                <button className="text-xs text-purple-600 hover:text-purple-800 hover:underline transition-colors">
                  Set your intention →
                </button>
              </div>

              {/* Events Widget */}
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span>🎉</span> Events
                </h3>
                <div className="space-y-2">
                  {upcomingEvents > 0 && (
                    <a href="/events" className="block text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 p-2 rounded-lg transition-colors">
                      📅 {upcomingEvents} events coming up this week
                    </a>
                  )}
                  {eventInvites > 0 && (
                    <a href="/events/invites" className="block text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 p-2 rounded-lg transition-colors">
                      📨 You have {eventInvites} event invites - Respond?
                    </a>
                  )}
                  {upcomingEvents === 0 && eventInvites === 0 && (
                    <p className="text-sm text-gray-500">No upcoming events</p>
                  )}
                </div>
              </div>

              {/* Friend Requests Widget */}
              {friendRequests > 0 && (
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span>👥</span> Friend Requests
                  </h3>
                  <a href="/friends/requests" className="block text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 p-2 rounded-lg transition-colors">
                    {friendRequests} pending friend requests
                  </a>
                </div>
              )}

              {/* Messages Widget */}
              {unreadMessages > 0 && (
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span>💬</span> Messages
                  </h3>
                  <a href="/messages" className="block text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 p-2 rounded-lg transition-colors">
                    {unreadMessages} unread messages
                  </a>
                </div>
              )}

              {/* Suggested Connections Widget */}
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span>🤝</span> Suggested Connections
                </h3>
                <div className="space-y-2">
                  {suggestedFriends.map((friend) => (
                    <div key={friend.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{friend.name}</p>
                        <p className="text-xs text-gray-500">{friend.mutualFriends} mutual friends</p>
                      </div>
                      <button className="text-xs bg-purple-600 text-white px-3 py-1 rounded-full hover:bg-purple-700 transition-colors">
                        Connect
                      </button>
                    </div>
                  ))}
                  <a href="/friends/suggestions" className="block text-xs text-purple-600 hover:underline text-center mt-2">
                    See all suggestions
                  </a>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* SOS Floating Button */}
      <div className="fixed bottom-20 right-4 sm:right-6 z-50">
        <SOSFloatingButton />
      </div>

      {/* Fixed Bottom Navigation Bar - NOW WITH 5 ITEMS */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
        <div className="max-w-2xl mx-auto px-2 sm:px-4 py-2">
          <div className="flex gap-1 justify-start overflow-x-auto scrollbar-hide">
            {/* Safety */}
            <a 
              href="/safety" 
              className="group flex flex-col items-center justify-center py-2 px-3 text-center hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
            >
              <span className="text-xl mb-1 group-hover:scale-110 transition-transform">🛡️</span>
              <span className="text-xs text-gray-600 group-hover:text-red-700 whitespace-nowrap">Safety</span>
            </a>

            {/* Commitment */}
            <a 
              href="/commitment" 
              className="group flex flex-col items-center justify-center py-2 px-3 text-center hover:bg-purple-50 rounded-lg transition-all flex-shrink-0"
            >
              <span className="text-xl mb-1 group-hover:scale-110 transition-transform">💜</span>
              <span className="text-xs text-gray-600 group-hover:text-purple-700 whitespace-nowrap">Commitment</span>
            </a>

            {/* Contact */}
            <a 
              href="/contact" 
              className="group flex flex-col items-center justify-center py-2 px-3 text-center hover:bg-purple-50 rounded-lg transition-all flex-shrink-0"
            >
              <span className="text-xl mb-1 group-hover:scale-110 transition-transform">📧</span>
              <span className="text-xs text-gray-600 group-hover:text-purple-700 whitespace-nowrap">Contact</span>
            </a>

            {/* Suggest */}
            <a 
              href="/suggestions" 
              className="group flex flex-col items-center justify-center py-2 px-3 text-center hover:bg-green-50 rounded-lg transition-all flex-shrink-0"
            >
              <span className="text-xl mb-1 group-hover:scale-110 transition-transform">💡</span>
              <span className="text-xs text-gray-600 group-hover:text-green-700 whitespace-nowrap">Suggest</span>
            </a>

            {/* Donate */}
            <a 
              href="/donate" 
              className="group flex flex-col items-center justify-center py-2 px-3 text-center hover:bg-blue-50 rounded-lg transition-all flex-shrink-0"
            >
              <span className="text-xl mb-1 group-hover:scale-110 transition-transform">💝</span>
              <span className="text-xs text-gray-600 group-hover:text-blue-700 whitespace-nowrap">Donate</span>
            </a>
          </div>
        </div>
        
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300"></div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}
