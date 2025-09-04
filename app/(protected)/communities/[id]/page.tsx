// app/(protected)/communities/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { isUserCommunityAdmin } from "@/lib/admin-utils";

type Community = {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  region: string | null;
  tags: string[];
  creator_id: string;
  created_at: string;
  rules?: string;
  welcome_message?: string;
};

type Post = {
  id: string;
  community_id: string;
  author_id: string;
  author_name?: string;
  title: string;
  content: string;
  image_url?: string;
  is_pinned: boolean;
  is_locked: boolean;
  is_anonymous: boolean;
  created_at: string;
  reply_count?: number;
};

type Member = {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  role: 'owner' | 'moderator' | 'member';
  joined_at: string;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  created_by: string;
  created_at: string;
  is_pinned: boolean;
};

export default function CommunityDetailPage() {
  const router = useRouter();
  const params = useParams();
  const communityId = params.id as string;
  
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeTab, setActiveTab] = useState<'discussions' | 'events' | 'members' | 'chat' | 'admin'>('discussions');
  
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'owner' | 'moderator' | 'member' | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Post creation
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', is_anonymous: false });
  const [creatingPost, setCreatingPost] = useState(false);
  
  // Admin modals
  const [showWarningModal, setShowWarningModal] = useState<{ userId: string; userName: string } | null>(null);
  const [showBanModal, setShowBanModal] = useState<{ userId: string; userName: string } | null>(null);
  const [warningMessage, setWarningMessage] = useState("");
  const [banReason, setBanReason] = useState("");

  useEffect(() => {
    loadCommunityData();
  }, [communityId]);

  async function loadCommunityData() {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      // Load community details
      const { data: communityData, error: communityError } = await supabase
        .from("communities")
        .select("*")
        .eq("id", communityId)
        .single();

      if (communityError) throw communityError;
      setCommunity(communityData);

      // Check user's role in the community
      if (user?.id) {
        const { data: memberData } = await supabase
          .from("community_members")
          .select("role")
          .eq("community_id", communityId)
          .eq("user_id", user.id)
          .single();

        if (memberData) {
          setUserRole(memberData.role);
          setIsMember(true);
          setIsAdmin(memberData.role === 'owner' || memberData.role === 'moderator');
        }
      }

      // Load posts with author info
      const { data: postsData } = await supabase
        .from("community_posts")
        .select(`
          *,
          profiles:author_id (full_name),
          community_replies (count)
        `)
        .eq("community_id", communityId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      const processedPosts = postsData?.map((p: any) => ({
        ...p,
        author_name: p.is_anonymous ? "Anonymous" : p.profiles?.full_name || "Unknown",
        reply_count: p.community_replies?.[0]?.count || 0
      })) || [];

      setPosts(processedPosts);

      // Load members
      const { data: membersData } = await supabase
        .from("community_members")
        .select(`
          user_id,
          role,
          joined_at,
          profiles:user_id (full_name, avatar_url)
        `)
        .eq("community_id", communityId)
        .order("joined_at", { ascending: true });

      const processedMembers = membersData?.map((m: any) => ({
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        full_name: m.profiles?.full_name || "Unknown",
        avatar_url: m.profiles?.avatar_url
      })) || [];

      setMembers(processedMembers);

      // Load announcements
      const { data: announcementsData } = await supabase
        .from("community_announcements")
        .select("*")
        .eq("community_id", communityId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      setAnnouncements(announcementsData || []);

    } catch (error) {
      console.error("Error loading community:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createPost() {
    if (!userId || !newPost.title.trim()) return;
    
    setCreatingPost(true);
    try {
      const { error } = await supabase
        .from("community_posts")
        .insert({
          community_id: communityId,
          author_id: userId,
          title: newPost.title.trim(),
          content: newPost.content.trim(),
          is_anonymous: newPost.is_anonymous
        });

      if (error) throw error;

      await loadCommunityData();
      setShowCreatePost(false);
      setNewPost({ title: '', content: '', is_anonymous: false });
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post");
    } finally {
      setCreatingPost(false);
    }
  }

  async function deletePost(postId: string) {
    if (!isAdmin) return;
    
    if (confirm("Are you sure you want to delete this post?")) {
      try {
        const { error } = await supabase
          .from("community_posts")
          .delete()
          .eq("id", postId);

        if (error) throw error;
        setPosts(posts.filter(p => p.id !== postId));
      } catch (error) {
        console.error("Error deleting post:", error);
        alert("Failed to delete post");
      }
    }
  }

  async function togglePinPost(postId: string, currentPinned: boolean) {
    if (!isAdmin) return;
    
    try {
      const { error } = await supabase
        .from("community_posts")
        .update({ is_pinned: !currentPinned })
        .eq("id", postId);

      if (error) throw error;
      await loadCommunityData();
    } catch (error) {
      console.error("Error toggling pin:", error);
    }
  }

  async function toggleLockPost(postId: string, currentLocked: boolean) {
    if (!isAdmin) return;
    
    try {
      const { error } = await supabase
        .from("community_posts")
        .update({ is_locked: !currentLocked })
        .eq("id", postId);

      if (error) throw error;
      setPosts(posts.map(p => 
        p.id === postId ? { ...p, is_locked: !currentLocked } : p
      ));
    } catch (error) {
      console.error("Error toggling lock:", error);
    }
  }

  async function warnUser() {
    if (!isAdmin || !showWarningModal) return;
    
    try {
      // Send warning notification
      await supabase.from("notifications").insert({
        recipient_id: showWarningModal.userId,
        type: "community.warning",
        title: `Warning from ${community?.name}`,
        body: warningMessage,
        target_url: `/communities/${communityId}`
      });

      // Log moderation action
      await supabase.from("moderation_logs").insert({
        community_id: communityId,
        moderator_id: userId,
        target_user_id: showWarningModal.userId,
        action: "warning",
        reason: warningMessage
      });

      alert(`Warning sent to ${showWarningModal.userName}`);
      setShowWarningModal(null);
      setWarningMessage("");
    } catch (error) {
      console.error("Error warning user:", error);
      alert("Failed to send warning");
    }
  }

  async function banUser() {
    if (!isAdmin || !showBanModal) return;
    
    try {
      // Remove from community
      await supabase
        .from("community_members")
        .delete()
        .eq("community_id", communityId)
        .eq("user_id", showBanModal.userId);

      // Add to banned list
      await supabase.from("community_bans").insert({
        community_id: communityId,
        user_id: showBanModal.userId,
        banned_by: userId,
        reason: banReason
      });

      // Log moderation action
      await supabase.from("moderation_logs").insert({
        community_id: communityId,
        moderator_id: userId,
        target_user_id: showBanModal.userId,
        action: "ban",
        reason: banReason
      });

      setMembers(members.filter(m => m.user_id !== showBanModal.userId));
      alert(`${showBanModal.userName} has been banned from the community`);
      setShowBanModal(null);
      setBanReason("");
    } catch (error) {
      console.error("Error banning user:", error);
      alert("Failed to ban user");
    }
  }

  async function promoteMember(memberId: string, newRole: 'moderator' | 'member') {
    if (userRole !== 'owner') return;
    
    try {
      const { error } = await supabase
        .from("community_members")
        .update({ role: newRole })
        .eq("community_id", communityId)
        .eq("user_id", memberId);

      if (error) throw error;
      
      setMembers(members.map(m => 
        m.user_id === memberId ? { ...m, role: newRole } : m
      ));
    } catch (error) {
      console.error("Error updating member role:", error);
      alert("Failed to update member role");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 text-center">
        <p className="text-gray-600">Community not found</p>
        <Link href="/communities" className="text-purple-600 hover:underline mt-4 inline-block">
          Back to communities
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Community Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="container-app py-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">{community.name}</h1>
              <p className="text-white/90">{community.description}</p>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span>{members.length} members</span>
                {community.region && <span>📍 {community.region}</span>}
                {community.is_private && <span>🔒 Private Community</span>}
              </div>
            </div>
            
            {isAdmin && (
              <Link
                href={`/communities/${communityId}/settings`}
                className="px-4 py-2 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition"
              >
                ⚙️ Settings
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Announcements Banner */}
      {announcements.filter(a => a.is_pinned).map(announcement => (
        <div key={announcement.id} className="bg-yellow-50 border-b border-yellow-200">
          <div className="container-app py-3">
            <div className="flex items-start gap-2">
              <span>📢</span>
              <div>
                <p className="font-medium text-yellow-900">{announcement.title}</p>
                <p className="text-sm text-yellow-800">{announcement.body}</p>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="container-app">
          <nav className="flex gap-6">
            {['discussions', 'events', 'members', 'chat', ...(isAdmin ? ['admin'] : [])].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm capitalize transition ${
                  activeTab === tab
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container-app py-8">
        {/* Discussions Tab */}
        {activeTab === 'discussions' && (
          <div className="space-y-6">
            {/* Create Post Button */}
            {isMember && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                {!showCreatePost ? (
                  <button
                    onClick={() => setShowCreatePost(true)}
                    className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg text-gray-600 hover:bg-gray-100 transition"
                  >
                    Start a discussion...
                  </button>
                ) : (
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Discussion title"
                      value={newPost.title}
                      onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                    <textarea
                      placeholder="Share your thoughts..."
                      value={newPost.content}
                      onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="flex justify-between items-center">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newPost.is_anonymous}
                          onChange={(e) => setNewPost({ ...newPost, is_anonymous: e.target.checked })}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-600">Post anonymously</span>
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setShowCreatePost(false);
                            setNewPost({ title: '', content: '', is_anonymous: false });
                          }}
                          className="px-4 py-2 text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={createPost}
                          disabled={creatingPost || !newPost.title.trim()}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                        >
                          {creatingPost ? "Posting..." : "Post"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Posts List */}
            <div className="space-y-4">
              {posts.map(post => (
                <div key={post.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {post.is_pinned && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">📌 Pinned</span>
                        )}
                        {post.is_locked && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">🔒 Locked</span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{post.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <Link 
                          href={post.is_anonymous ? '#' : `/profile/${post.author_id}`}
                          className={post.is_anonymous ? 'cursor-default' : 'hover:text-purple-600 hover:underline'}
                        >
                          {post.author_name}
                        </Link>
                        <span>•</span>
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{post.reply_count} replies</span>
                      </div>
                    </div>
                    
                    {/* Admin Actions */}
                    {isAdmin && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => togglePinPost(post.id, post.is_pinned)}
                          className="p-2 hover:bg-gray-100 rounded"
                          title={post.is_pinned ? "Unpin" : "Pin"}
                        >
                          📌
                        </button>
                        <button
                          onClick={() => toggleLockPost(post.id, post.is_locked)}
                          className="p-2 hover:bg-gray-100 rounded"
                          title={post.is_locked ? "Unlock" : "Lock"}
                        >
                          🔒
                        </button>
                        <button
                          onClick={() => deletePost(post.id)}
                          className="p-2 hover:bg-red-50 text-red-600 rounded"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-gray-700">{post.content}</p>
                  
                  {!post.is_locked && (
                    <Link
                      href={`/communities/${communityId}/posts/${post.id}`}
                      className="text-purple-600 hover:underline text-sm mt-3 inline-block"
                    >
                      View discussion →
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {posts.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p>No discussions yet</p>
                {isMember && <p className="mt-2">Be the first to start one!</p>}
              </div>
            )}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Community Members</h2>
              
              <div className="space-y-3">
                {members.map(member => (
                  <div key={member.user_id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-semibold">
                        {member.full_name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <Link
                          href={`/profile/${member.user_id}`}
                          className="font-medium text-gray-900 hover:text-purple-600 hover:underline"
                        >
                          {member.full_name}
                        </Link>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            member.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                            member.role === 'moderator' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {member.role}
                          </span>
                          <span>Joined {new Date(member.joined_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Member Actions */}
                    {isAdmin && member.user_id !== userId && member.role !== 'owner' && (
                      <div className="flex gap-2">
                        {userRole === 'owner' && (
                          <button
                            onClick={() => promoteMember(
                              member.user_id, 
                              member.role === 'moderator' ? 'member' : 'moderator'
                            )}
                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            {member.role === 'moderator' ? 'Remove Mod' : 'Make Mod'}
                          </button>
                        )}
                        <button
                          onClick={() => setShowWarningModal({ 
                            userId: member.user_id, 
                            userName: member.full_name 
                          })}
                          className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
                        >
                          Warn
                        </button>
                        <button
                          onClick={() => setShowBanModal({ 
                            userId: member.user_id, 
                            userName: member.full_name 
                          })}
                          className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Ban
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Admin Tab */}
        {activeTab === 'admin' && isAdmin && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Community Admin Panel</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-purple-600 font-medium">Total Members</p>
                  <p className="text-2xl font-bold text-purple-900">{members.length}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600 font-medium">Total Posts</p>
                  <p className="text-2xl font-bold text-blue-900">{posts.length}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600 font-medium">Moderators</p>
                  <p className="text-2xl font-bold text-green-900">
                    {members.filter(m => m.role === 'moderator').length}
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-sm text-yellow-600 font-medium">Announcements</p>
                  <p className="text-2xl font-bold text-yellow-900">{announcements.length}</p>
                </div>
              </div>

              <div className="space-y-4">
                <Link
                  href={`/communities/${communityId}/settings`}
                  className="block w-full px-4 py-3 bg-purple-600 text-white text-center rounded-lg hover:bg-purple-700 transition"
                >
                  Community Settings
                </Link>
                <Link
                  href={`/communities/${communityId}/moderation`}
                  className="block w-full px-4 py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition"
                >
                  Moderation Logs
                </Link>
                <Link
                  href={`/communities/${communityId}/announcements`}
                  className="block w-full px-4 py-3 bg-green-600 text-white text-center rounded-lg hover:bg-green-700 transition"
                >
                  Manage Announcements
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Community Events</h2>
            <p className="text-gray-600">Community events feature coming soon!</p>
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Tea Time / Coffee Connect</h2>
            <p className="text-gray-600">Live chat feature coming soon!</p>
          </div>
        )}
      </div>

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              Send Warning to {showWarningModal.userName}
            </h3>
            <textarea
              placeholder="Reason for warning..."
              value={warningMessage}
              onChange={(e) => setWarningMessage(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 mb-4"
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowWarningModal(null);
                  setWarningMessage("");
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={warnUser}
                disabled={!warningMessage.trim()}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
              >
                Send Warning
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {showBanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4 text-red-600">
              Ban {showBanModal.userName} from Community
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              This will remove the user from the community and prevent them from rejoining.
            </p>
            <textarea
              placeholder="Reason for ban (required)..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 mb-4"
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowBanModal(null);
                  setBanReason("");
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={banUser}
                disabled={!banReason.trim()}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
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
