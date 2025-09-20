// app/(protected)/messages/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

interface Friend {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
  online_status?: boolean;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  recipient_id: string;
  created_at: string;
  read: boolean;
}

export default function MessagesPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Mobile enhancements
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [swipingMessage, setSwipingMessage] = useState<string | null>(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize and load data
  useEffect(() => {
    initializeUser();
  }, []);

  async function initializeUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        await loadFriends(user.id);
      }
    } catch (err) {
      console.error('Error initializing:', err);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  }

  async function loadFriends(userId: string) {
    setFriendsLoading(true);
    setError(null);
    
    try {
      // Query friendships from both directions
      // Get friendships where user is the initiator
      const { data: friendships1, error: error1 } = await supabase
        .from('friendships')
        .select(`
          friend_id,
          status,
          relationship,
          friend:profiles!friendships_friend_id_fkey(
            id,
            full_name,
            avatar_url,
            email,
            show_online_status
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'accepted');

      if (error1) throw error1;

      // Get friendships where user is the recipient
      const { data: friendships2, error: error2 } = await supabase
        .from('friendships')
        .select(`
          user_id,
          status,
          relationship,
          friend:profiles!friendships_user_id_fkey(
            id,
            full_name,
            avatar_url,
            email,
            show_online_status
          )
        `)
        .eq('friend_id', userId)
        .eq('status', 'accepted');

      if (error2) throw error2;

      // Combine and format friends list
      const allFriends: Friend[] = [];
      
      // Process friendships where user is initiator
      if (friendships1) {
        friendships1.forEach(f => {
          if (f.friend) {
            allFriends.push({
              id: f.friend.id,
              full_name: f.friend.full_name,
              avatar_url: f.friend.avatar_url,
              email: f.friend.email,
              online_status: f.friend.show_online_status
            });
          }
        });
      }

      // Process friendships where user is recipient
      if (friendships2) {
        friendships2.forEach(f => {
          if (f.friend) {
            allFriends.push({
              id: f.friend.id,
              full_name: f.friend.full_name,
              avatar_url: f.friend.avatar_url,
              email: f.friend.email,
              online_status: f.friend.show_online_status
            });
          }
        });
      }

      // Remove duplicates (in case of any data issues)
      const uniqueFriends = Array.from(
        new Map(allFriends.map(friend => [friend.id, friend])).values()
      );

      // Load last messages for each friend
      for (const friend of uniqueFriends) {
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, created_at')
          .or(`and(sender_id.eq.${userId},recipient_id.eq.${friend.id}),and(sender_id.eq.${friend.id},recipient_id.eq.${userId})`)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (lastMsg) {
          friend.last_message = lastMsg.content;
          friend.last_message_time = lastMsg.created_at;
        }

        // Count unread messages
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', friend.id)
          .eq('recipient_id', userId)
          .eq('read', false);

        friend.unread_count = count || 0;
      }

      // Sort by last message time
      uniqueFriends.sort((a, b) => {
        if (!a.last_message_time && !b.last_message_time) return 0;
        if (!a.last_message_time) return 1;
        if (!b.last_message_time) return -1;
        return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
      });

      setFriends(uniqueFriends);

      // Debug logging
      console.log(`Loaded ${uniqueFriends.length} friends for user ${userId}`);
      
    } catch (err) {
      console.error('Error loading friends:', err);
      setError('Failed to load friends. Please refresh the page.');
    } finally {
      setFriendsLoading(false);
    }
  }

  async function loadMessages(friendId: string) {
    if (!currentUserId) return;
    
    setMessagesLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('sender_id', friendId)
        .eq('recipient_id', currentUserId)
        .eq('read', false);

      // Update unread count
      setFriends(prev => prev.map(f => 
        f.id === friendId ? { ...f, unread_count: 0 } : f
      ));

    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  }

  async function sendMessage() {
    if (!currentUserId || !selectedFriend || !newMessage.trim()) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUserId,
          recipient_id: selectedFriend.id,
          content: newMessage.trim(),
          read: false
        })
        .select()
        .single();

      if (error) throw error;

      setMessages(prev => [...prev, data]);
      setNewMessage('');

      // Update friend's last message
      setFriends(prev => prev.map(f => 
        f.id === selectedFriend.id 
          ? { 
              ...f, 
              last_message: newMessage.trim(), 
              last_message_time: data.created_at 
            }
          : f
      ));

    } catch (err) {
      console.error('Error sending message:', err);
    }
  }

  // Pull to refresh handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      const currentY = e.touches[0].clientY;
      const distance = currentY - touchStartY.current;
      
      if (distance > 0 && distance < 150) {
        setPullDistance(distance);
        if (distance > 80) {
          setIsPulling(true);
        }
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (isPulling && currentUserId) {
      loadFriends(currentUserId);
      if (selectedFriend) {
        loadMessages(selectedFriend.id);
      }
    }
    setIsPulling(false);
    setPullDistance(0);
  }, [isPulling, currentUserId, selectedFriend]);

  // Add touch listeners for pull to refresh
  useEffect(() => {
    if (isMobile) {
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isMobile, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Handle friend selection with mobile sidebar close
  const handleSelectFriend = useCallback(async (friend: Friend) => {
    setSelectedFriend(friend);
    await loadMessages(friend.id);
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [currentUserId, isMobile]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!currentUserId || !selectedFriend) return;

    const subscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id=eq.${currentUserId},recipient_id=eq.${selectedFriend.id}),and(sender_id=eq.${selectedFriend.id},recipient_id=eq.${currentUserId}))`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUserId, selectedFriend]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50 relative">
      {/* Pull to Refresh Indicator */}
      {isMobile && pullDistance > 0 && (
        <div 
          className="absolute top-0 left-0 right-0 flex justify-center z-50 transition-transform"
          style={{ transform: `translateY(${Math.min(pullDistance, 100)}px)` }}
        >
          <div className={`mt-4 px-4 py-2 rounded-full ${
            isPulling ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {isPulling ? '↓ Release to refresh' : '↓ Pull to refresh'}
          </div>
        </div>
      )}

      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold">Messages</h1>
            <div className="w-10"></div>
          </div>
        </div>
      )}

      {/* Sidebar - Desktop always visible, Mobile slide-out */}
      <div className={`
        ${isMobile 
          ? `fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }` 
          : 'relative'
        }
        w-80 bg-white border-r border-gray-200 flex flex-col
        ${isMobile ? 'pt-16' : ''}
      `}>
        <div className={`p-4 border-b border-gray-200 ${isMobile ? 'hidden' : ''}`}>
          <h1 className="text-xl font-semibold text-gray-800">Messages</h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          {friendsLoading ? (
            <div className="p-4 text-center text-gray-500">
              Loading friends...
            </div>
          ) : error ? (
            <div className="p-4">
              <div className="text-red-500 text-sm">{error}</div>
              <button 
                onClick={() => currentUserId && loadFriends(currentUserId)}
                className="mt-2 text-purple-600 hover:text-purple-700 text-sm"
              >
                Try again
              </button>
            </div>
          ) : friends.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-gray-500 mb-4">You have no friends yet.</p>
              <Link 
                href="/friends/browse"
                className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Browse Friends
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {friends.map(friend => (
                <button
                  key={friend.id}
                  onClick={() => handleSelectFriend(friend)}
                  className={`w-full p-4 hover:bg-gray-50 transition flex items-start gap-3 ${
                    selectedFriend?.id === friend.id ? 'bg-purple-50' : ''
                  }`}
                >
                  <img
                    src={friend.avatar_url || '/default-avatar.png'}
                    alt={friend.full_name || 'Friend'}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">
                        {friend.full_name || friend.email || 'Friend'}
                      </h3>
                      {friend.unread_count > 0 && (
                        <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                          {friend.unread_count}
                        </span>
                      )}
                    </div>
                    {friend.last_message && (
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {friend.last_message}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${isMobile ? 'pt-16' : ''}`}>
        {selectedFriend ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-200 flex items-center gap-3">
              <img
                src={selectedFriend.avatar_url || '/default-avatar.png'}
                alt={selectedFriend.full_name || 'Friend'}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1">
                <h2 className="font-semibold text-gray-900">
                  {selectedFriend.full_name || selectedFriend.email || 'Friend'}
                </h2>
                {selectedFriend.online_status && (
                  <p className="text-xs text-green-500">Online</p>
                )}
              </div>
              <Link
                href={`/profile/${selectedFriend.id}`}
                className="text-purple-600 hover:text-purple-700 text-sm"
              >
                View Profile
              </Link>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="text-center text-gray-500">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500">
                  No messages yet. Start a conversation!
                </div>
              ) : (
                messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender_id === currentUserId ? 'justify-end' : 'justify-start'
                    }`}
                    onTouchStart={(e) => {
                      if (isMobile && message.sender_id === currentUserId) {
                        touchStartX.current = e.touches[0].clientX;
                        setSwipingMessage(message.id);
                      }
                    }}
                    onTouchEnd={(e) => {
                      if (isMobile && swipingMessage === message.id) {
                        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
                        if (Math.abs(deltaX) > 100) {
                          // Swipe to delete
                          if (confirm('Delete this message?')) {
                            // Add delete logic here
                            setMessages(prev => prev.filter(m => m.id !== message.id));
                          }
                        }
                        setSwipingMessage(null);
                      }
                    }}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg transition-transform ${
                        swipingMessage === message.id ? 'transform -translate-x-2' : ''
                      } ${
                        message.sender_id === currentUserId
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender_id === currentUserId ? 'text-purple-200' : 'text-gray-500'
                      }`}>
                        {new Date(message.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>Select a friend to start chatting.</p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Floating Action Button */}
      {isMobile && !selectedFriend && (
        <Link
          href="/friends/browse"
          className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-purple-700 transform hover:scale-110 transition-all z-30"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      )}
    </div>
  );
}
