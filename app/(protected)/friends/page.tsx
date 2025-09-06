// app/(protected)/friends/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import InvitePanel from "@/components/InvitePanel";

type Friend = {
  friend_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  status: string;
  created_at: string;
};

export default function FriendsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"friends" | "pending" | "invite">("friends");

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadFriends();
    }
  }, [userId]);

  async function loadUser() {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      setUserId(data.user.id);
    } else {
      router.push("/signin");
    }
  }

  async function loadFriends() {
    if (!userId) return;
    
    setLoading(true);
    setError(null);

    try {
      // Get friendships where user is either user_id or friend_id
      const { data: friendships, error: friendError } = await supabase
        .from("friendships")
        .select("*")
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq("status", "accepted");

      if (friendError) throw friendError;

      // Get unique friend IDs
      const friendIds = new Set<string>();
      friendships?.forEach(f => {
        if (f.user_id === userId) {
          friendIds.add(f.friend_id);
        } else {
          friendIds.add(f.user_id);
        }
      });

      // Get friend profiles
      if (friendIds.size > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, email")
          .in("id", Array.from(friendIds));

        if (profileError) throw profileError;

        // Map profiles to friend format
        const friendList: Friend[] = enrichedProfiles?.map(profile => {
          const friendship = friendships?.find(f => 
            (f.user_id === userId && f.friend_id === profile.id) ||
            (f.friend_id === userId && f.user_id === profile.id)
          );
          
          return {
            friend_id: profile.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            email: profile.email,
            status: friendship?.status || "accepted",
            created_at: friendship?.created_at || new Date().toISOString(),
          };
        }) || [];

        setFriends(friendList);
      } else {
        setFriends([]);
      }
    } catch (err: any) {
      console.error("Error loading friends:", err);
      setError(err.message || "Failed to load friends");
    } finally {
      setLoading(false);
    }
  }

  async function removeFriend(friendId: string) {
    if (!userId || !confirm("Are you sure you want to remove this friend?")) return;

    try {
      // Delete both friendship records
      await supabase
        .from("friendships")
        .delete()
        .or(
          `and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`
        );

      // Reload friends list
      await loadFriends();
    } catch (err: any) {
      console.error("Error removing friend:", err);
      alert("Failed to remove friend. Please try again.");
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Friends</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab("friends")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "friends"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          My Friends ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab("invite")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "invite"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Invite Friends
        </button>
      </div>

      {/* Content */}
      {activeTab === "friends" && (
        <div>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-32 mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
              <button onClick={loadFriends} className="btn btn-brand mt-4">
                Try Again
              </button>
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <div className="text-6xl mb-4">👥</div>
              <h2 className="text-xl font-semibold mb-2">No friends yet</h2>
              <p className="text-gray-600 mb-6">
                Start building your MyZenTribe community!
              </p>
              <button
                onClick={() => setActiveTab("invite")}
                className="btn btn-brand"
              >
                Invite Your First Friend
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {friends.map((friend) => (
                <div
                  key={friend.friend_id}
                  className="card p-4 flex items-center gap-4 hover:shadow-lg transition-shadow"
                >
                  {/* Avatar */}
                  {friend.avatar_url ? (
                    <img
                      src={friend.avatar_url}
                      alt={friend.full_name || friend.business_name || "Friend"}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-lavender-400 flex items-center justify-center text-white text-xl font-bold">
                      {friend.is_business && friend.business_name 
                        ? friend.business_name[0].toUpperCase()
                        : (friend.full_name || friend.email || "?")[0].toUpperCase()}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">
                      {friend.full_name || friend.email || "Friend"}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Friends since {new Date(friend.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/profile/${friend.friend_id}`}
                      className="btn btn-sm btn-neutral"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => removeFriend(friend.friend_id)}
                      className="btn btn-sm hover:bg-red-50 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "invite" && (
        <div>
          <InvitePanel userId={userId} />
          
          <div className="mt-8 card p-6 bg-purple-50">
            <h3 className="font-semibold text-lg mb-3">How Friend Invites Work:</h3>
            <ol className="space-y-2 text-gray-700">
              <li className="flex gap-2">
                <span className="font-semibold">1.</span>
                <span>Generate your unique invite link or QR code above</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">2.</span>
                <span>Share it with friends via message, email, or in person</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">3.</span>
                <span>When they open the link, they'll sign in or create an account</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">4.</span>
                <span>Once accepted, you'll automatically become friends!</span>
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
