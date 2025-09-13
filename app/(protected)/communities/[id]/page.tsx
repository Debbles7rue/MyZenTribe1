"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

interface Community {
  id: string;
  title: string;
  about: string | null;
  category: string | null;
  zip: string | null;
  visibility: string;
  photo_url: string | null;
  cover_url: string | null;
  created_at: string;
  created_by: string;
}

interface Member {
  id: string;
  user_id: string;
  role: "admin" | "member";
  status: "member" | "pending" | "banned";
  joined_at: string;
  user: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface Post {
  id: string;
  author_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  is_anonymous: boolean;
  created_at: string;
  author?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export default function CommunityDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "member" | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [activeTab, setActiveTab] = useState<"discussions" | "members" | "events" | "admin">("discussions");
  
  // Moderation modals
  const [showWarnModal, setShowWarnModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Member | null>(null);
  const [moderationReason, setModerationReason] = useState("");

  // New post modal
  const [showNewPost, setShowNewPost] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postAnonymous, setPostAnonymous] = useState(false);

  // Announcement modal
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");

  useEffect(() => {
    loadCommunityData();
  }, [params.id]);

  async function loadCommunityData() {
    setLoading(true);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    }

    // Load community details
    const { data: communityData, error: communityError } = await supabase
      .from("communities")
      .select("*")
      .eq("id", params.id)
      .single();

    if (communityError || !communityData) {
      router.push("/communities");
      return;
    }

    setCommunity(communityData);

    // Check if user is the creator or admin
    if (user) {
      // Check if user created this community
      setIsCreator(communityData.created_by === user.id);

      // Get user's role in community
      const { data: memberData } = await supabase
        .from("community_members")
        .select("role, status")
        .eq("community_id", params.id)
        .eq("user_id", user.id)
        .single();

      if (memberData) {
        setUserRole(memberData.role);
        // User is admin if they have admin role OR if they created the community
        setIsAdmin(memberData.role === "admin" || communityData.created_by === user.id);
      } else if (communityData.created_by === user.id) {
        // Creator might not be in members table yet
        setUserRole("admin");
        setIsAdmin(true);
        setIsCreator(true);
      }
    }

    // Load members - simplified query
    const { data: membersData, error: membersError } = await supabase
      .from("community_members")
      .select("*")
      .eq("community_id", params.id)
      .eq("status", "member")
      .order("role", { ascending: true });

    if (membersData && !membersError) {
      // Load user profiles separately
      const memberProfiles = await Promise.all(
        membersData.map(async (member) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("user_id", member.user_id)
            .single();
          
          return {
            ...member,
            user: profile || { full_name: null, avatar_url: null }
          };
        })
      );
      setMembers(memberProfiles);
    } else {
      setMembers([]);
    }

    // Load posts - simplified query
    const { data: postsData, error: postsError } = await supabase
      .from("community_posts")
      .select("*")
      .eq("community_id", params.id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (postsData && !postsError) {
      // Load author profiles separately
      const postsWithAuthors = await Promise.all(
        postsData.map(async (post) => {
          if (post.is_anonymous) {
            return { ...post, author: null };
          }
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("user_id", post.author_id)
            .single();
          
          return {
            ...post,
            author: profile || null
          };
        })
      );
      setPosts(postsWithAuthors);
    } else {
      setPosts([]);
    }
    
    setLoading(false);
  }

  async function handleWarnUser() {
    if (!selectedUser || !moderationReason) return;

    // Send warning notification
    const { error } = await supabase
      .from("notifications")
      .insert({
        user_id: selectedUser.user_id,
        type: "warning",
        title: "Community Warning",
        message: `You have received a warning in ${community?.title}: ${moderationReason}`,
        community_id: params.id
      });

    if (!error) {
      alert("Warning sent to user");
      setShowWarnModal(false);
      setSelectedUser(null);
      setModerationReason("");
    }
  }

  async function handleBanUser() {
    if (!selectedUser || !moderationReason) return;

    // Update member status to banned
    const { error: banError } = await supabase
      .from("community_members")
      .update({ status: "banned" })
      .eq("community_id", params.id)
      .eq("user_id", selectedUser.user_id);

    if (!banError) {
      alert("User has been banned from the community");
      setShowBanModal(false);
      setSelectedUser(null);
      setModerationReason("");
      loadCommunityData();
    }
  }

  async function handleDeletePost(postId: string) {
    if (!confirm("Are you sure you want to delete this post?")) return;

    const { error } = await supabase
      .from("community_posts")
      .delete()
      .eq("id", postId);

    if (!error) {
      setPosts(posts.filter(p => p.id !== postId));
    }
  }

  async function handlePinPost(postId: string, currentPinned: boolean) {
    const { error } = await supabase
      .from("community_posts")
      .update({ is_pinned: !currentPinned })
      .eq("id", postId);

    if (!error) {
      loadCommunityData();
    }
  }

  async function handlePromoteToAdmin(member: Member) {
    const { error } = await supabase
      .from("community_members")
      .update({ role: "admin" })
      .eq("community_id", params.id)
      .eq("user_id", member.user_id);

    if (!error) {
      alert(`${member.user.full_name || "User"} is now an admin`);
      loadCommunityData();
    }
  }

  async function createPost() {
    if (!postTitle.trim() || !userId) return;

    const { error } = await supabase
      .from("community_posts")
      .insert({
        community_id: params.id,
        author_id: userId,
        title: postTitle,
        content: postContent,
        is_anonymous: postAnonymous
      });

    if (!error) {
      setShowNewPost(false);
      setPostTitle("");
      setPostContent("");
      setPostAnonymous(false);
      loadCommunityData();
    }
  }

  async function createAnnouncement() {
    if (!announcementTitle.trim() || !userId) return;

    const { error } = await supabase
      .from("community_posts")
      .insert({
        community_id: params.id,
        author_id: userId,
        title: `📢 ${announcementTitle}`,
        content: announcementContent,
        is_pinned: true
      });

    if (!error) {
      setShowAnnouncementModal(false);
      setAnnouncementTitle("");
      setAnnouncementContent("");
      loadCommunityData();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5] p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5] p-6">
        <div className="text-center">Community not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5]">
      <div className="max-w-6xl mx-auto p-6">
        {/* Community Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{community.title}</h1>
              {community.about && (
                <p className="text-gray-600">{community.about}</p>
              )}
              <div className="flex gap-2 mt-3">
                {community.category && (
                  <span className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                    {community.category}
                  </span>
                )}
                {community.zip && (
                  <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                    📍 {community.zip}
                  </span>
                )}
              </div>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Link
                  href={`/communities/${params.id}/edit`}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Edit
                </Link>
                <Link
                  href={`/communities/${params.id}/settings`}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Settings
                </Link>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-t pt-4">
            {["discussions", "members", "events", ...(isAdmin ? ["admin"] : [])].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 rounded-lg transition ${
                  activeTab === tab
                    ? "bg-purple-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Discussions Tab */}
        {activeTab === "discussions" && (
          <div className="space-y-4">
            {userRole && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowNewPost(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    💬 New Discussion
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => setShowAnnouncementModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      📢 Announcement
                    </button>
                  )}
                  <button
                    onClick={() => router.push("/meditation?type=group")}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                  >
                    🧘 Group Meditation
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        const inviteLink = `${window.location.origin}/communities/${params.id}`;
                        navigator.clipboard.writeText(inviteLink);
                        alert("Invite link copied to clipboard!");
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      🔗 Copy Invite Link
                    </button>
                  )}
                </div>
              </div>
            )}

            {posts.map(post => (
              <div key={post.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {post.is_pinned && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          📌 Pinned
                        </span>
                      )}
                      {post.is_locked && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          🔒 Locked
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold mb-1">{post.title}</h3>
                    {post.content && (
                      <p className="text-gray-600 mb-2">{post.content}</p>
                    )}
                    <div className="text-sm text-gray-500">
                      {post.is_anonymous ? (
                        <span>Anonymous</span>
                      ) : post.author ? (
                        <Link href={`/profile/${post.author_id}`} className="hover:underline">
                          {post.author.full_name || "Unknown"}
                        </Link>
                      ) : (
                        <span>Unknown</span>
                      )}
                      {" • "}
                      {new Date(post.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePinPost(post.id, post.is_pinned)}
                        className="text-sm text-gray-600 hover:text-purple-600"
                      >
                        {post.is_pinned ? "Unpin" : "Pin"}
                      </button>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {posts.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No discussions yet. Start the conversation!
              </div>
            )}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === "members" && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Members ({members.length})</h2>
            <div className="space-y-3">
              {/* Show creator first if they're not in the members list */}
              {isCreator && !members.some(m => m.user_id === community.created_by) && (
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center">
                      👑
                    </div>
                    <div>
                      <div className="font-medium text-purple-700">
                        You (Creator)
                      </div>
                      <div className="text-sm text-purple-600">
                        Community Founder
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {member.user.avatar_url ? (
                      <img
                        src={member.user.avatar_url}
                        alt=""
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    )}
                    <div>
                      <Link
                        href={`/profile/${member.user_id}`}
                        className="font-medium hover:text-purple-600"
                      >
                        {member.user.full_name || "Anonymous"}
                      </Link>
                      <div className="text-sm text-gray-500">
                        {member.user_id === community.created_by && "👑 Creator • "}
                        {member.role === "admin" && "⚡ Admin"}
                        {member.role === "member" && "Member"}
                      </div>
                    </div>
                  </div>

                  {isAdmin && member.role === "member" && member.user_id !== userId && (
                    <div className="flex gap-2">
                      {isCreator && (
                        <button
                          onClick={() => handlePromoteToAdmin(member)}
                          className="text-sm text-purple-600 hover:text-purple-700"
                        >
                          Make Admin
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedUser(member);
                          setShowWarnModal(true);
                        }}
                        className="text-sm text-yellow-600 hover:text-yellow-700"
                      >
                        Warn
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(member);
                          setShowBanModal(true);
                        }}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Ban
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin Tab */}
        {activeTab === "admin" && isAdmin && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">Admin Dashboard</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold">{members.length}</div>
                <div className="text-gray-600">Total Members</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold">{posts.length}</div>
                <div className="text-gray-600">Discussions</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold">
                  {members.filter(m => m.role === "admin").length}
                </div>
                <div className="text-gray-600">Admins</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Quick Actions</h3>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowAnnouncementModal(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Create Announcement
                  </button>
                  <Link
                    href={`/communities/${params.id}/edit`}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Edit Community
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Events Tab - Placeholder */}
        {activeTab === "events" && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-center py-12 text-gray-500">
              Community events coming soon!
            </div>
          </div>
        )}
      </div>

      {/* New Post Modal */}
      {showNewPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Start a Discussion</h3>
            <input
              type="text"
              placeholder="Title"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg mb-3"
            />
            <textarea
              placeholder="Content (optional)"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg mb-3 h-32"
            />
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={postAnonymous}
                onChange={(e) => setPostAnonymous(e.target.checked)}
              />
              <span className="text-sm">Post anonymously</span>
            </label>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowNewPost(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={createPost}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Create Announcement</h3>
            <input
              type="text"
              placeholder="Announcement title"
              value={announcementTitle}
              onChange={(e) => setAnnouncementTitle(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg mb-3"
            />
            <textarea
              placeholder="Announcement content"
              value={announcementContent}
              onChange={(e) => setAnnouncementContent(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg mb-4 h-32"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAnnouncementModal(false);
                  setAnnouncementTitle("");
                  setAnnouncementContent("");
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={createAnnouncement}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Post Announcement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {showWarnModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              Warn {selectedUser.user.full_name || "User"}
            </h3>
            <textarea
              placeholder="Reason for warning..."
              value={moderationReason}
              onChange={(e) => setModerationReason(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg mb-4 h-32"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowWarnModal(false);
                  setSelectedUser(null);
                  setModerationReason("");
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleWarnUser}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                Send Warning
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4 text-red-600">
              Ban {selectedUser.user.full_name || "User"}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              This will permanently remove the user from the community.
            </p>
            <textarea
              placeholder="Reason for ban..."
              value={moderationReason}
              onChange={(e) => setModerationReason(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg mb-4 h-32"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowBanModal(false);
                  setSelectedUser(null);
                  setModerationReason("");
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleBanUser}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Ban User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
