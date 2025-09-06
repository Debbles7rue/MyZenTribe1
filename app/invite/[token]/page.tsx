// app/invite/[token]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type InviteData = {
  token: string;
  to_user: string;
  accepted_at: string | null;
  created_at: string;
};

type ProfileData = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
};

export default function InviteAcceptPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [inviterProfile, setInviterProfile] = useState<ProfileData | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    handleInvite();
  }, [params.token]);

  async function handleInvite() {
    try {
      setLoading(true);
      setError(null);
      setDebugInfo({ step: "Starting", token: params.token });

      // 1. Check if user is signed in
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        setDebugInfo(prev => ({ ...prev, authError: authError.message }));
      }
      
      const user = userData?.user;

      if (!user) {
        // Redirect to sign in with return URL
        const returnUrl = `/invite/${params.token}`;
        router.push(`/signin?returnUrl=${encodeURIComponent(returnUrl)}`);
        return;
      }

      setDebugInfo(prev => ({ ...prev, userId: user.id, userEmail: user.email }));

      // 2. Validate the invite token
      const { data: inviteData, error: inviteError } = await supabase
        .from("friend_invites")
        .select("*")
        .eq("token", params.token)
        .single();

      if (inviteError || !inviteData) {
        setDebugInfo(prev => ({ ...prev, inviteError: inviteError?.message }));
        setError("This invite link is invalid or has expired.");
        setLoading(false);
        return;
      }

      const invite = inviteData as InviteData;
      setDebugInfo(prev => ({ ...prev, invite }));

      // 3. Check if already accepted
      if (invite.accepted_at) {
        setError("This invite has already been used.");
        setLoading(false);
        return;
      }

      // 4. Can't friend yourself
      if (invite.to_user === user.id) {
        setError("You cannot accept your own invite.");
        setLoading(false);
        return;
      }

      // 5. Get inviter's profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email")
        .eq("id", invite.to_user)
        .single();

      if (profileData) {
        setInviterProfile(profileData as ProfileData);
      }

      // 6. Check if friendship already exists (in either direction)
      const { data: existingFriendships, error: checkError } = await supabase
        .from("friendships")
        .select("*")
        .or(
          `and(user_id.eq.${user.id},friend_id.eq.${invite.to_user}),and(user_id.eq.${invite.to_user},friend_id.eq.${user.id})`
        );

      setDebugInfo(prev => ({ 
        ...prev, 
        existingFriendships,
        checkError: checkError?.message 
      }));

      if (existingFriendships && existingFriendships.length > 0) {
        setError("You are already friends with this person.");
        setLoading(false);
        return;
      }

      // 7. Create BOTH direction friendship records in a single insert
      const friendshipRecords = [
        {
          user_id: user.id,
          friend_id: invite.to_user,
          status: "accepted",
        },
        {
          user_id: invite.to_user,
          friend_id: user.id,
          status: "accepted",
        }
      ];

      setDebugInfo(prev => ({ ...prev, attemptingToCreate: friendshipRecords }));

      const { data: createdFriendships, error: friendshipError } = await supabase
        .from("friendships")
        .insert(friendshipRecords)
        .select();

      if (friendshipError) {
        console.error("Friendship creation error:", friendshipError);
        setDebugInfo(prev => ({ ...prev, friendshipError: friendshipError.message }));
        
        // Try creating them one by one if bulk insert fails
        let successCount = 0;
        for (const record of friendshipRecords) {
          const { error: singleError } = await supabase
            .from("friendships")
            .insert(record);
          
          if (!singleError) {
            successCount++;
          } else {
            setDebugInfo(prev => ({ 
              ...prev, 
              [`singleError_${successCount}`]: singleError.message 
            }));
          }
        }

        if (successCount === 0) {
          setError("Failed to create friendship. You might already be friends or there was a database error.");
          setLoading(false);
          return;
        }
      }

      setDebugInfo(prev => ({ ...prev, createdFriendships }));

      // 8. Mark invite as accepted
      const { error: updateError } = await supabase
        .from("friend_invites")
        .update({ accepted_at: new Date().toISOString() })
        .eq("token", params.token);

      if (updateError) {
        console.error("Invite update error:", updateError);
        setDebugInfo(prev => ({ ...prev, inviteUpdateError: updateError.message }));
      }

      // 9. Create notification for the inviter
      const notificationData = {
        user_id: invite.to_user,
        kind: "friend", // Add the required kind field
        type: "friend.accepted",
        title: "New Friend!",
        body: `${user.user_metadata?.full_name || user.email} accepted your friend request!`,
        actor_id: user.id,
        entity_id: user.id,
        target_url: `/friends`,
        is_read: false
      };

      setDebugInfo(prev => ({ ...prev, attemptingNotification: notificationData }));

      const { data: notifData, error: notifError } = await supabase
        .from("notifications")
        .insert(notificationData)
        .select();

      if (notifError) {
        console.error("Notification error:", notifError);
        setDebugInfo(prev => ({ ...prev, notificationError: notifError.message }));
        // Don't fail the whole process if notification fails
      } else {
        setDebugInfo(prev => ({ ...prev, notificationCreated: notifData }));
      }

      setSuccess(true);
      
      // Redirect to friends list after 3 seconds
      setTimeout(() => {
        router.push(`/friends`);
      }, 3000);

    } catch (err: any) {
      console.error("Invite acceptance error:", err);
      setDebugInfo(prev => ({ ...prev, unexpectedError: err.message }));
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  // Debug mode toggle
  const [showDebug, setShowDebug] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-lavender-50">
        <div className="card p-8 max-w-md text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
          </div>
          <p className="mt-4 text-gray-600">Processing invite...</p>
          
          {/* Debug toggle */}
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="mt-4 text-xs text-gray-500 underline"
          >
            {showDebug ? "Hide" : "Show"} Debug Info
          </button>
          
          {showDebug && (
            <pre className="mt-4 text-left text-xs bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-lavender-50">
        <div className="card p-8 max-w-md text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold mb-4 text-gray-800">Invite Issue</h1>
          <p className="text-red-600 mb-6">{error}</p>
          
          <div className="space-y-2">
            <button
              onClick={() => router.push("/friends")}
              className="btn btn-brand w-full"
            >
              Go to Friends
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-neutral w-full"
            >
              Try Again
            </button>
          </div>

          {/* Debug info */}
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="mt-4 text-xs text-gray-500 underline"
          >
            {showDebug ? "Hide" : "Show"} Debug Info
          </button>
          
          {showDebug && (
            <pre className="mt-4 text-left text-xs bg-gray-100 p-2 rounded overflow-auto max-h-64">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          )}
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-lavender-50">
          <div className="card p-8 max-w-md text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold mb-4 text-gray-800">You're Now Friends!</h1>
            {inviterProfile && (
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  You are now connected with{" "}
                  <span className="font-semibold">
                    {inviterProfile.full_name || inviterProfile.email || "your friend"}
                  </span>
                </p>
                {inviterProfile.avatar_url && (
                  <img
                    src={inviterProfile.avatar_url}
                    alt={inviterProfile.full_name || "Friend"}
                    className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-purple-200"
                  />
                )}
              </div>
            )}
            
            {!showQuestionnaire && (
              <p className="text-sm text-gray-500">Preparing friend questionnaire...</p>
            )}
            
            <div className="mt-4">
              <button
                onClick={() => setShowQuestionnaire(true)}
                className="btn btn-brand"
              >
                Categorize Friend
              </button>
            </div>

            {/* Debug info for success case */}
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="mt-4 text-xs text-gray-500 underline"
            >
              {showDebug ? "Hide" : "Show"} Debug Info
            </button>
            
            {showDebug && (
              <pre className="mt-4 text-left text-xs bg-gray-100 p-2 rounded overflow-auto max-h-64">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Friend Questionnaire Modal */}
        {inviterProfile && (
          <FriendQuestionnaire
            isOpen={showQuestionnaire}
            onClose={() => {
              setShowQuestionnaire(false);
              router.push("/friends");
            }}
            friendId={inviterProfile.id}
            friendName={inviterProfile.full_name || inviterProfile.email || "Friend"}
            isNewFriend={true}
          />
        )}
      </>
    );
  }

  return null;
}
