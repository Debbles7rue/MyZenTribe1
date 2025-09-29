// app/(protected)/friend-requests/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { createNotification } from "@/lib/notifications";
import FriendQuestionnaire from "@/components/FriendQuestionnaire";

interface FriendRequest {
  id: string;
  from_user: string;
  to_user: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  from_profile?: {
    full_name: string | null;
    avatar_url: string | null;
    location_text: string | null;
    bio: string | null;
  };
  to_profile?: {
    full_name: string | null;
    avatar_url: string | null;
    location_text: string | null;
  };
}

export default function FriendRequestsPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [processing, setProcessing] = useState<string | null>(null);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [questionnaireData, setQuestionnaireData] = useState<{
    friendId: string;
    friendName: string;
    friendshipId?: string;
  } | null>(null);

  useEffect(() => {
    checkAuthAndLoadRequests();
  }, []);

  async function checkAuthAndLoadRequests() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setCurrentUserId(user.id);
    await loadFriendRequests(user.id);
  }

  async function loadFriendRequests(userId: string) {
    try {
      setLoading(true);

      // Get received requests
      const { data: received, error: receivedError } = await supabase
        .from('friend_requests')
        .select(`
          id,
          from_user,
          to_user,
          status,
          created_at
        `)
        .eq('to_user', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (receivedError) throw receivedError;

      // Get sent requests  
      const { data: sent, error: sentError } = await supabase
        .from('friend_requests')
        .select(`
          id,
          from_user,
          to_user,
          status,
          created_at
        `)
        .eq('from_user', userId)
        .in('status', ['pending', 'declined'])
        .order('created_at', { ascending: false });

      if (sentError) throw sentError;

      // Get profiles for all users involved
      const userIds = new Set<string>();
      received?.forEach(r => userIds.add(r.from_user));
      sent?.forEach(r => userIds.add(r.to_user));

      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, location_text, bio')
          .in('id', Array.from(userIds));

        // Attach profiles to requests
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const receivedWithProfiles = received?.map(r => ({
          ...r,
          from_profile: profileMap.get(r.from_user)
        })) || [];

        const sentWithProfiles = sent?.map(r => ({
          ...r,
          to_profile: profileMap.get(r.to_user)
        })) || [];

        setReceivedRequests(receivedWithProfiles);
        setSentRequests(sentWithProfiles);
      } else {
        setReceivedRequests([]);
        setSentRequests([]);
      }
    } catch (error) {
      console.error('Error loading friend requests:', error);
    } finally {
      setLoading(false);
    }
  }

  async function acceptRequest(requestId: string, fromUserId: string) {
    if (!currentUserId) return;
    
    try {
      setProcessing(requestId);

      // Update request status
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Create friendship
      const { error: friendshipError } = await supabase
        .from('friendships')
        .insert({
          user_id: currentUserId,
          friend_id: fromUserId
        });

      if (!friendshipError || friendshipError.code === '23505') {
        // Get accepter's profile for notification
        const { data: accepterProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', currentUserId)
          .single();

        const accepterName = accepterProfile?.full_name || 'Someone';

        // Create notification for the person who sent the request
        await createNotification({
          recipient_id: fromUserId,
          type: 'friend.accepted',
          title: 'Friend Request Accepted!',
          body: `${accepterName} accepted your friend request`,
          target_url: `/profile/${currentUserId}`,
          entity_table: 'friendships',
          actor_id: currentUserId,
        });

        // Success or duplicate (already friends)
        setReceivedRequests(prev => prev.filter(r => r.id !== requestId));
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Failed to accept friend request. Please try again.');
    } finally {
      setProcessing(null);
    }
  }

  async function declineRequest(requestId: string) {
    try {
      setProcessing(requestId);

      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'declined' })
        .eq('id', requestId);

      if (!error) {
        setReceivedRequests(prev => prev.filter(r => r.id !== requestId));
      }
    } catch (error) {
      console.error('Error declining request:', error);
      alert('Failed to decline friend request. Please try again.');
    } finally {
      setProcessing(null);
    }
  }

  async function cancelRequest(requestId: string) {
    try {
      setProcessing(requestId);

      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId);

      if (!error) {
        setSentRequests(prev => prev.filter(r => r.id !== requestId));
      }
    } catch (error) {
      console.error('Error canceling request:', error);
      alert('Failed to cancel friend request. Please try again.');
    } finally {
      setProcessing(null);
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-48"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Friend Requests
            </h1>
            
            <Link
              href="/find-friends"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Find Friends</span>
            </Link>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm p-1 flex gap-1">
            <button
              onClick={() => setActiveTab('received')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'received'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Received ({receivedRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'sent'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Sent ({sentRequests.length})
            </button>
          </div>
        </div>

        {/* Received Requests */}
        {activeTab === 'received' && (
          <>
            {receivedRequests.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  No pending friend requests
                </h3>
                <p className="text-gray-500 mb-4">
                  When someone sends you a friend request, it will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {receivedRequests.map(request => (
                  <div
                    key={request.id}
                    className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Avatar */}
                      <Link href={`/profile/${request.from_user}`} className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-xl overflow-hidden">
                          {request.from_profile?.avatar_url ? (
                            <img
                              src={request.from_profile.avatar_url}
                              alt={request.from_profile.full_name || 'User'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{request.from_profile?.full_name?.charAt(0) || '?'}</span>
                          )}
                        </div>
                      </Link>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div>
                            <Link 
                              href={`/profile/${request.from_user}`}
                              className="font-semibold text-gray-900 hover:text-purple-600 transition-colors"
                            >
                              {request.from_profile?.full_name || 'Anonymous User'}
                            </Link>
                            
                            {request.from_profile?.location_text && (
                              <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>{request.from_profile.location_text}</span>
                              </div>
                            )}

                            <p className="text-xs text-gray-400 mt-1">
                              {formatDate(request.created_at)}
                            </p>
                          </div>

                          {/* Actions - Mobile Optimized */}
                          <div className="flex gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => acceptRequest(request.id, request.from_user)}
                              disabled={processing === request.id}
                              className="flex-1 sm:flex-initial px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                            >
                              {processing === request.id ? 'Processing...' : 'Accept'}
                            </button>
                            <button
                              onClick={() => declineRequest(request.id)}
                              disabled={processing === request.id}
                              className="flex-1 sm:flex-initial px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                            >
                              Decline
                            </button>
                          </div>
                        </div>

                        {request.from_profile?.bio && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {request.from_profile.bio}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Sent Requests */}
        {activeTab === 'sent' && (
          <>
            {sentRequests.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  No pending sent requests
                </h3>
                <p className="text-gray-500 mb-4">
                  Friend requests you've sent will appear here
                </p>
                <Link
                  href="/find-friends"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Find Friends
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {sentRequests.map(request => (
                  <div
                    key={request.id}
                    className="bg-white rounded-xl shadow-sm p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Avatar */}
                      <Link href={`/profile/${request.to_user}`} className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-xl overflow-hidden">
                          {request.to_profile?.avatar_url ? (
                            <img
                              src={request.to_profile.avatar_url}
                              alt={request.to_profile.full_name || 'User'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{request.to_profile?.full_name?.charAt(0) || '?'}</span>
                          )}
                        </div>
                      </Link>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div>
                            <Link 
                              href={`/profile/${request.to_user}`}
                              className="font-semibold text-gray-900 hover:text-purple-600 transition-colors"
                            >
                              {request.to_profile?.full_name || 'Anonymous User'}
                            </Link>
                            
                            {request.to_profile?.location_text && (
                              <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>{request.to_profile.location_text}</span>
                              </div>
                            )}

                            <p className="text-xs text-gray-400 mt-1">
                              {request.status === 'declined' ? (
                                <span className="text-red-500">Declined</span>
                              ) : (
                                <>Sent {formatDate(request.created_at)}</>
                              )}
                            </p>
                          </div>

                          {/* Actions */}
                          <button
                            onClick={() => cancelRequest(request.id)}
                            disabled={processing === request.id}
                            className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                          >
                            {processing === request.id ? 'Canceling...' : 'Cancel Request'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Navigation Links */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/friends"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            My Friends
          </Link>
          <Link
            href="/profile"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            My Profile
          </Link>
        </div>
      </div>

      {/* Friend Questionnaire Modal */}
      {showQuestionnaire && questionnaireData && (
        <FriendQuestionnaire
          isOpen={showQuestionnaire}
          onClose={() => {
            setShowQuestionnaire(false);
            setQuestionnaireData(null);
          }}
          friendshipId={questionnaireData.friendshipId}
          friendId={questionnaireData.friendId}
          friendName={questionnaireData.friendName}
          isNewFriend={true}
        />
      )}
    </div>
  );
}
