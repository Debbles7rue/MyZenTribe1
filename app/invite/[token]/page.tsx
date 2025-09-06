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
};

export default function InviteAcceptPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [inviterProfile, setInviterProfile] = useState<ProfileData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    handleInvite();
  }, [params.token]);

  async function handleInvite() {
    try {
      setLoading(true);
      setError(null);

      // 1. Check if user is signed in
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) {
        // Redirect to sign in with return URL
        const returnUrl = `/invite/${params.token}`;
        router.push(`/signin?returnUrl=${encodeURIComponent(returnUrl)}`);
        return;
      }

      setCurrentUserId(user.id);

      // 2. Validate the invite token
      const { data: inviteData, error: inviteError } = await supabase
        .from("friend_invites")
        .select("*")
        .eq("token", params.token)
        .single();

      if (inviteError || !inviteData) {
        setError("This invite link is invalid or has expired.");
        setLoading(false);
        return;
      }

      const invite = inviteData as InviteData;

      // 3. Check if already accepted
      if (invite.accepted_at) {
        setError("This invite has already been used.");
        setLoading(false);
        return;
      }

      // 4. Can't friend yourself
      if (invite.to_user === user.id) {
        setError("You cannot send a friend request to yourself.");
        setLoading(false);
        return;
      }

      // 5. Get inviter's profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", invite.to_user)
        .single();

      if (profileData) {
        setInviterProfile(profileData as ProfileData);
      }

      // 6. Check if friendship already exists
      const { data: existingFriendship } = await supabase
        .from("friendships")
        .select("*")
        .or(
          `and(user_id.eq.${user.id},friend_id.eq.${invite.to_user}),and(user_id.eq.${invite.to_user},friend_id.eq.${user.id})`
        )
        .single();

      if (existingFriendship) {
        setError("You are already friends with this person.");
        setLoading(false);
        return;
      }

      // 7. Create the friendship (bidirectional)
      const { error: friendshipError } = await supabase.from("friendships").insert([
        {
          user_id: user.id,
          friend_id: invite.to_user,
          status: "accepted",
          created_at: new Date().toISOString(),
        },
        {
          user_id: invite.to_user,
          friend_id: user.id,
          status: "accepted",
          created_at: new Date().toISOString(),
        },
      ]);

      if (friendshipError) {
        console.error("Friendship creation error:", friendshipError);
        setError("Failed to create friendship. Please try again.");
        setLoading(false);
        return;
      }

      // 8. Mark invite as accepted
      const { error: updateError } = await supabase
        .from("friend_invites")
        .update({ accepted_at: new Date().toISOString() })
        .eq("token", params.token);

      if (updateError) {
        console.error("Invite update error:", updateError);
      }

      // 9. Create notification for the inviter
      await supabase.from("notifications").insert({
        user_id: invite.to_user,
        type: "friend.accepted",
        title: "Friend Request Accepted",
        body: `${user.user_metadata?.full_name || user.email} accepted your friend request!`,
        actor_id: user.id,
        entity_id: user.id,
        target_url: `/profile/${user.id}`,
      });

      setSuccess(true);
      
      // Redirect to friend's profile or friends list after 2 seconds
      setTimeout(() => {
        router.push(`/profile/${invite.to_user}`);
      }, 2000);

    } catch (err: any) {
      console.error("Invite acceptance error:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-lavender-50">
        <div className="card p-8 max-w-md text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
          </div>
          <p className="mt-4 text-gray-600">Processing invite...</p>
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
          <button
            onClick={() => router.push("/friends")}
            className="btn btn-brand"
          >
            Go to Friends
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-lavender-50">
        <div className="card p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold mb-4 text-gray-800">You're Now Friends!</h1>
          {inviterProfile && (
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                You are now connected with{" "}
                <span className="font-semibold">
                  {inviterProfile.full_name || "your friend"}
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
          <p className="text-sm text-gray-500">Redirecting to their profile...</p>
        </div>
      </div>
    );
  }

  return null;
}
