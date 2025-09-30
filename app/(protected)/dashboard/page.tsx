// app/(protected)/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import HomeFeed from "@/components/HomeFeed";
import FriendQuestionnaire from "@/components/FriendQuestionnaire";
import HomeTutorial from "@/components/HomeTutorial";

export default function DashboardPage() {
  const router = useRouter();
  const [processingInvite, setProcessingInvite] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [questionnaireData, setQuestionnaireData] = useState<{
    friendId: string;
    friendName: string;
    friendshipId?: string;
  } | null>(null);

  useEffect(() => {
    // Check for pending invite when component mounts
    checkPendingInvite();
  }, []);

  async function checkPendingInvite() {
    // Check if there's a pending invite token
    const pendingToken = localStorage.getItem("pending_invite_token");
    if (!pendingToken) return;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      setProcessingInvite(true);
      
      // Validate the token
      const { data: invite, error: inviteError } = await supabase
        .from("friend_invites")
        .select("id, to_user, accepted_at")
        .eq("token", pendingToken)
        .single();

      if (inviteError || !invite || invite.accepted_at) {
        // Invalid or already used token
        localStorage.removeItem("pending_invite_token");
        return;
      }

      // Check if already friends
      const { data: existingFriendship } = await supabase
        .from("friendships")
        .select("id")
        .or(
          `and(user_id.eq.${user.id},friend_id.eq.${invite.to_user}),` +
          `and(user_id.eq.${invite.to_user},friend_id.eq.${user.id})`
        )
        .single();

      if (!existingFriendship) {
        // Create friendship
        const { data: newFriendship } = await supabase
          .from("friendships")
          .insert([
            {
              user_id: user.id,
              friend_id: invite.to_user
            }
          ])
          .select()
          .single();

        // Mark invite as accepted
        await supabase
          .from("friend_invites")
          .update({ accepted_at: new Date().toISOString() })
          .eq("id", invite.id);

        // Get friend's name for questionnaire
        const { data: friendProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", invite.to_user)
          .single();

        // Clear the pending token
        localStorage.removeItem("pending_invite_token");

        // Show questionnaire
        setQuestionnaireData({
          friendId: invite.to_user,
          friendName: friendProfile?.full_name || "your new friend",
          friendshipId: newFriendship?.id
        });
        setShowQuestionnaire(true);
      } else {
        // Already friends, just clear the token
        localStorage.removeItem("pending_invite_token");
      }
    } catch (error) {
      console.error("Error processing pending invite:", error);
      localStorage.removeItem("pending_invite_token");
    } finally {
      setProcessingInvite(false);
    }
  }

  if (processingInvite) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Processing friend connection...</p>
          <p className="text-sm text-gray-500 mt-2">Just a moment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="container-app py-8">
        <div className="max-w-4xl mx-auto">
          {/* Simple Welcome Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Welcome to MyZenTribe
            </h1>
            <p className="text-gray-600 mt-2">
              Connect • Share • Support
            </p>
          </div>

          {/* Your existing HomeFeed with the integrated SOS feature */}
          <HomeFeed />
        </div>
      </div>

      {/* Friend Questionnaire Modal */}
      {showQuestionnaire && questionnaireData && (
        <FriendQuestionnaire
          isOpen={showQuestionnaire}
          onClose={() => {
            setShowQuestionnaire(false);
            setQuestionnaireData(null);
            // Optionally navigate to the new friend's profile
            if (questionnaireData.friendId) {
              router.push(`/profile/${questionnaireData.friendId}`);
            }
          }}
          friendshipId={questionnaireData.friendshipId}
          friendId={questionnaireData.friendId}
          friendName={questionnaireData.friendName}
          isNewFriend={true}
        />
      )}
      {/* Home Tutorial */}
<HomeTutorial />
    </div>
  );
}
