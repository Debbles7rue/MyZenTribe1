// components/HomeFeed.tsx - UPDATED BOTTOM BAR
"use client";

import { useEffect, useState } from "react";
import { listHomeFeed, Post, me } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import SOSFloatingButton from "@/components/SOSFloatingButton";
import PostComposer from "@/components/PostComposer";
import { 
  loadAllSidebarData, 
  SuggestedFriend 
} from "@/lib/sidebarQueries";

export default function HomeFeed() {
  const [rows, setRows] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [intentionExpanded, setIntentionExpanded] = useState(false);

const [intentionExpanded, setIntentionExpanded] = useState(false);

  // Real data from Supabase - no more hardcoded!
  const [upcomingEvents, setUpcomingEvents] = useState(0);
  const [eventInvites, setEventInvites] = useState(0);
  const [friendRequests, setFriendRequests] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [suggestedFriends, setSuggestedFriends] = useState<SuggestedFriend[]>([]);
  const [sidebarLoading, setSidebarLoading] = useState(true);

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

  async function loadSidebarData() {
    console.log("🔄 Loading sidebar data...");
    setSidebarLoading(true);
    
    try {
      const data = await loadAllSidebarData();
      
      setFriendRequests(data.friendRequests);
      setUnreadMessages(data.unreadMessages);
      setUpcomingEvents(data.upcomingEvents);
      setEventInvites(data.eventInvites);
      setSuggestedFriends(data.suggestedFriends);
      
      console.log("✅ Sidebar data loaded:", data);
    } catch (error) {
      console.error("Error loading sidebar data:", error);
    } finally {
      setSidebarLoading(false);
    }
  }

    useEffect(() => { 
    console.log("🚀 HomeFeed mounted, loading initial data");
    load();
    loadSidebarData();
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
                {sidebarLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingEvents > 0 && (
                      <a href="/events" className="block text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 p-2 rounded-lg transition-colors">
                        📅 {upcomingEvents} event{upcomingEvents !== 1 ? 's' : ''} coming up this week
                      </a>
                    )}
                    {eventInvites > 0 && (
                      <a href="/events" className="block text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 p-2 rounded-lg transition-colors">
                        📨 You have {eventInvites} event invite{eventInvites !== 1 ? 's' : ''} - Respond?
                      </a>
                    )}
                    {upcomingEvents === 0 && eventInvites === 0 && (
                      <p className="text-sm text-gray-500">No upcoming events</p>
                    )}
                  </div>
                )}
              </div>

              {/* Friend Requests Widget */}
              {(sidebarLoading || friendRequests > 0) && (
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span>👥</span> Friend Requests
                  </h3>
                  {sidebarLoading ? (
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  ) : (
                    <a href="/friend-requests" className="block text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 p-2 rounded-lg transition-colors">
                      {friendRequests} pending friend request{friendRequests !== 1 ? 's' : ''}
                    </a>
                  )}
                </div>
              )}

             {/* Messages Widget */}
              {(sidebarLoading || unreadMessages > 0) && (
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span>💬</span> Messages
                  </h3>
                  {sidebarLoading ? (
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  ) : (
                    <a href="/messages" className="block text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 p-2 rounded-lg transition-colors">
                      {unreadMessages} unread message{unreadMessages !== 1 ? 's' : ''}
                    </a>
                  )}
                </div>
              )}

              {/* Suggested Connections Widget */}
              {(sidebarLoading || suggestedFriends.length > 0) && (
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span>🤝</span> Suggested Connections
                  </h3>
                  {sidebarLoading ? (
                    <div className="animate-pulse space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center justify-between p-2">
                          <div className="flex-1">
                            <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded w-20"></div>
                          </div>
                          <div className="h-6 bg-gray-200 rounded w-16"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {suggestedFriends.map((friend) => (
                        <div key={friend.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {friend.avatar_url ? (
                              <img 
                                src={friend.avatar_url} 
                                alt={friend.name}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                {friend.name.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-800 truncate">{friend.name}</p>
                              <p className="text-xs text-gray-500">{friend.mutualFriends} mutual friend{friend.mutualFriends !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          
                            href={`/profile/${friend.id}`}
                            className="text-xs bg-purple-600 text-white px-3 py-1 rounded-full hover:bg-purple-700 transition-colors flex-shrink-0 ml-2"
                          >
                            View
                          </a>
                        </div>
                      ))}
                      <a href="/find-friends" className="block text-xs text-purple-600 hover:underline text-center mt-2">
                        See all suggestions
                      </a>
                    </div>
                  )}
                </div>
              )}

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
