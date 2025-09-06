// app/(protected)/friends/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import InvitePanel from "@/components/InvitePanel";
import FriendQuestionnaire from "@/components/FriendQuestionnaire";

type Friend = {
  friend_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  status: string;
  created_at: string;
  category?: string;
  how_we_met?: string;
  notes?: string;
};

export default function FriendsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"friends" | "pending" | "invite">("friends");
  
  // For friend notes modal
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [privateNote, setPrivateNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  
  // For friend questionnaire
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [questionnaireTarget, setQuestionnaireTarget] = useState<Friend | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadFriends();
    }
  }, [userId]);

  useEffect(() => {
    // Load private note when a friend is selected
    if (!userId || !selectedFriend) return;
    
    (async () => {
      const { data } = await supabase
        .from("friend_notes")
        .select("note")
        .eq("owner_id", userId)
        .eq("friend_id", selectedFriend.friend_id)
        .maybeSingle();
      setPrivateNote(data?.note ?? "");
    })();
  }, [userId, selectedFriend]);

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

      // Get unique friend IDs and build friendship map
      const friendMap = new Map<string, any>();
      friendships?.forEach(f => {
        if (f.user_id === userId) {
          friendMap.set(f.friend_id, f);
        } else {
          friendMap.set(f.user_id, f);
        }
      });

      // Get friend profiles
      if (friendMap.size > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, email")
          .in("id", Array.from(friendMap.keys()));

        if (profileError) throw profileError;

        // Map profiles to friend format with friendship details
        const friendList: Friend[] = profiles?.map(profile => {
          const friendship = friendMap.get(profile.id);
          
          return {
            friend_id: profile.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            email: profile.email,
            status: friendship?.status || "accepted",
            created_at: friendship?.created_at || new Date().toISOString(),
            category: friendship?.category,
            how_we_met: friendship?.how_we_met,
            notes: friendship?.notes,
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

      // Also delete any friend notes
      await supabase
        .from("friend_notes")
        .delete()
        .eq("owner_id", userId)
        .eq("friend_id", friendId);

      // Reload friends list
      await loadFriends();
    } catch (err: any) {
      console.error("Error removing friend:", err);
      alert("Failed to remove friend. Please try again.");
    }
  }

  async function savePrivateNote() {
    if (!userId || !selectedFriend) return;
    
    setSavingNote(true);
    try {
      const { error } = await supabase
        .from("friend_notes")
        .upsert(
          { 
            owner_id: userId, 
            friend_id: selectedFriend.friend_id, 
            note: privateNote 
          }, 
          { onConflict: "owner_id,friend_id" }
        );
      
      if (error) throw error;
      
      // Close the modal
      setSelectedFriend(null);
      setPrivateNote("");
    } catch (e: any) {
      alert(e.message || "Could not save note");
    } finally {
      setSavingNote(false);
    }
  }

  function openQuestionnaire(friend: Friend) {
    setQuestionnaireTarget(friend);
    setShowQuestionnaire(true);
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
                  className="card p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    {friend.avatar_url ? (
                      <img
                        src={friend.avatar_url}
                        alt={friend.full_name || "Friend"}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-lavender-400 flex items-center justify-center text-white text-xl font-bold">
                        {(friend.full_name || friend.email || "?")[0].toUpperCase()}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">
                        {friend.full_name || friend.email || "Friend"}
                      </h3>
                      {friend.category && (
                        <span className="inline-block px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700 mt-1">
                          {friend.category}
                        </span>
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        Friends since {new Date(friend.created_at).toLocaleDateString()}
                      </p>
                      {friend.how_we_met && (
                        <p className="text-xs text-gray-400 italic mt-1">
                          Met: {friend.how_we_met}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Link
                      href={`/profile/${friend.friend_id}`}
                      className="btn btn-sm btn-neutral"
                    >
                      View
                    </Link>
                    <Link
                      href={`/messages?to=${friend.friend_id}`}
                      className="btn btn-sm btn-neutral"
                    >
                      Message
                    </Link>
                    <button
                      onClick={() => setSelectedFriend(friend)}
                      className="btn btn-sm btn-neutral"
                    >
                      Notes
                    </button>
                    <button
                      onClick={() => openQuestionnaire(friend)}
                      className="btn btn-sm btn-neutral"
                    >
                      Edit
                    </button>
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

      {/* Private Notes Modal */}
      {selectedFriend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">
                Private note about {selectedFriend.full_name || "this friend"}
              </h2>
              <button 
                className="text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setSelectedFriend(null);
                  setPrivateNote("");
                }}
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Only you can see this note.
            </p>
            <textarea 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
              rows={5} 
              value={privateNote} 
              onChange={(e) => setPrivateNote(e.target.value)} 
              placeholder="How you met, impressions, reminders, or anything else you want to remember..."
            />
            <div className="flex justify-end gap-2 mt-4">
              <button 
                className="btn btn-neutral" 
                onClick={() => {
                  setSelectedFriend(null);
                  setPrivateNote("");
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-brand" 
                onClick={savePrivateNote} 
                disabled={savingNote}
              >
                {savingNote ? "Saving..." : "Save Note"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Friend Questionnaire Modal */}
      {questionnaireTarget && (
        <FriendQuestionnaire
          isOpen={showQuestionnaire}
          onClose={() => {
            setShowQuestionnaire(false);
            setQuestionnaireTarget(null);
            loadFriends(); // Reload to show updated categories
          }}
          friendId={questionnaireTarget.friend_id}
          friendName={questionnaireTarget.full_name || questionnaireTarget.email || "Friend"}
          isNewFriend={false}
        />
      )}
    </div>
  );
}
