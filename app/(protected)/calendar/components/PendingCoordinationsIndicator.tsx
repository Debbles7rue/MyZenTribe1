// app/(protected)/calendar/components/PendingCoordinationsIndicator.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ToastProvider';

interface PendingCoordination {
  id: string;
  event_title: string;
  start_time: string;
  end_time: string;
  total_invitations: number;
  accepted_count: number;
  declined_count: number;
  pending_count: number;
  created_at: string;
  is_organizer: boolean;
  organizer_name?: string;
}

interface PendingCoordinationsIndicatorProps {
  userId: string;
  onOpen?: (coordination: PendingCoordination) => void;
}

export default function PendingCoordinationsIndicator({ 
  userId, 
  onOpen 
}: PendingCoordinationsIndicatorProps) {
  const [pendingCoordinations, setPendingCoordinations] = useState<PendingCoordination[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    if (!userId) return;

    const loadPendingData = async () => {
      try {
        // Load coordinations you're organizing
        const { data: coordinations, error: coordError } = await supabase
          .from('pending_coordinations_view')
          .select('*')
          .eq('organizer_id', userId);

        if (coordError) {
          console.error('Error loading coordinations:', coordError);
        } else if (coordinations) {
          const organized = coordinations.map(c => ({
            ...c,
            is_organizer: true
          }));
          setPendingCoordinations(organized);
        }

        // Load invitations you've received
        const { data: invitations, error: invError } = await supabase
          .from('meeting_invitations')
          .select(`
            *,
            coordination:meeting_coordinations!inner(
              id,
              event_id,
              organizer_id,
              status
            ),
            event:events!inner(
              title,
              start_time,
              end_time
            )
          `)
          .eq('invitee_id', userId)
          .eq('status', 'pending')
          .eq('coordination.status', 'pending');

        if (invError) {
          console.error('Error loading invitations:', invError);
        } else if (invitations) {
          setPendingInvitations(invitations);
        }
      } catch (error) {
        console.error('Failed to load pending data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPendingData();

    // Set up realtime subscription
    const coordinationsSubscription = supabase
      .channel(`user-coordinations-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_coordinations',
          filter: `organizer_id=eq.${userId}`
        },
        () => {
          loadPendingData();
        }
      )
      .subscribe();

    const invitationsSubscription = supabase
      .channel(`user-invitations-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_invitations',
          filter: `invitee_id=eq.${userId}`
        },
        () => {
          loadPendingData();
        }
      )
      .subscribe();

    return () => {
      coordinationsSubscription.unsubscribe();
      invitationsSubscription.unsubscribe();
    };
  }, [userId]);

  const handleRespondToInvitation = async (invitationId: string, status: 'accepted' | 'declined') => {
    try {
      const { error } = await supabase
        .from('meeting_invitations')
        .update({ 
          status,
          responded_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (error) {
        throw error;
      }

      showToast({
        type: 'success',
        message: status === 'accepted' 
          ? '✅ Invitation accepted!' 
          : '❌ Invitation declined'
      });

      // Reload data
      setPendingInvitations(prev => prev.filter(i => i.id !== invitationId));
    } catch (error) {
      console.error('Error responding to invitation:', error);
      showToast({
        type: 'error',
        message: 'Failed to respond to invitation'
      });
    }
  };

  const totalPending = pendingCoordinations.length + pendingInvitations.length;

  if (loading) {
    return (
      <div className="animate-pulse w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
    );
  }

  if (totalPending === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Indicator Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Pending meeting coordinations"
      >
        <svg
          className="w-6 h-6 text-gray-600 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        
        {/* Badge */}
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
          {totalPending}
        </span>
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          {/* Click outside to close */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown Content - Mobile Optimized */}
          <div className={`absolute right-0 mt-2 ${
            window.innerWidth < 640 
              ? 'fixed inset-x-4 right-auto left-4 w-auto' 
              : 'w-96'
          } max-h-[500px] overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Meeting Coordinations
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {pendingCoordinations.length} organizing, {pendingInvitations.length} invitations
              </p>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {/* Your Coordinations */}
              {pendingCoordinations.length > 0 && (
                <div className="p-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    YOU'RE ORGANIZING
                  </p>
                  {pendingCoordinations.map(coord => (
                    <div
                      key={coord.id}
                      className="mb-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                      onClick={() => onOpen?.(coord)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm text-gray-900 dark:text-white">
                            {coord.event_title}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {new Date(coord.start_time).toLocaleDateString()} - 
                            {new Date(coord.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full">
                          Organizing
                        </span>
                      </div>
                      
                      {/* Response Status */}
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="text-green-600 dark:text-green-400">
                          ✓ {coord.accepted_count} accepted
                        </span>
                        <span className="text-yellow-600 dark:text-yellow-400">
                          ⏳ {coord.pending_count} pending
                        </span>
                        {coord.declined_count > 0 && (
                          <span className="text-red-600 dark:text-red-400">
                            ✗ {coord.declined_count} declined
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div 
                            className="bg-gradient-to-r from-purple-600 to-pink-600 h-1.5 rounded-full transition-all"
                            style={{ 
                              width: `${(coord.accepted_count / coord.total_invitations) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Invitations for You */}
              {pendingInvitations.length > 0 && (
                <div className="p-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    YOUR INVITATIONS
                  </p>
                  {pendingInvitations.map(invitation => (
                    <div
                      key={invitation.id}
                      className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm text-gray-900 dark:text-white">
                            {invitation.event?.title}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {new Date(invitation.event?.start_time).toLocaleDateString()} - 
                            {new Date(invitation.event?.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                          Invited
                        </span>
                      </div>
                      
                      {/* Action Buttons - Mobile Optimized */}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRespondToInvitation(invitation.id, 'accepted');
                          }}
                          className="flex-1 py-1.5 px-3 bg-green-600 text-white text-xs sm:text-sm rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors touch-manipulation"
                        >
                          Accept
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRespondToInvitation(invitation.id, 'declined');
                          }}
                          className="flex-1 py-1.5 px-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs sm:text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 active:bg-gray-400 transition-colors touch-manipulation"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Empty State */}
              {pendingCoordinations.length === 0 && pendingInvitations.length === 0 && (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <p className="text-sm">No pending coordinations</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
