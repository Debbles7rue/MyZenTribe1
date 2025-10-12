"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

interface Community {
  id: string;
  title: string;
  name: string | null;
  about: string | null;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  region: string | null;
  zip: string | null;
  visibility: string;
  photo_url: string | null;
  cover_url: string | null;
  cover_image_url: string | null;
  owner_id: string;
  created_by: string;
  guidelines: string | null;
  created_at: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface Post {
  id: string;
  community_id: string;
  author_id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  is_pinned: boolean;
  is_locked: boolean;
  is_anonymous: boolean;
  created_at: string;
  author?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  comment_count?: number;
}

interface Business {
  id: string;
  business_name: string;
  business_description: string | null;
  business_logo: string | null;
  business_category: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
}

export default function CommunityDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Active tab
  const [activeTab, setActiveTab] = useState<"discussions" | "members" | "events" | "businesses" | "admin">("discussions");
  
  // Modals
  const [showNewPost, setShowNewPost] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postAnonymous, setPostAnonymous] = useState(false);
  const [commentText, setCommentText] = useState("");
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

    // Load community
    const { data: communityData, error: communityError } = await supabase
      .from("communities")
      .select("*")
      .eq("id", params.id)
      .single();

    if (communityError || !communityData) {
      console.error("Error loading community:", communityError);
      router.push("/communities");
      return;
    }

    setCommunity(communityData);

    // Check user's role and membership
    if (user) {
      const isCreator = communityData.owner_id === user.id || communityData.created_by === user.id;
      setIsOwner(isCreator);

      const { data: memberData } = await supabase
        .from("community_members")
        .select("role, status")
        .eq("community_id", params.id)
        .eq("user_id", user.id)
        .single();

      if (memberData) {
        setUserRole(memberData.role);
        setIsMember(memberData.status === "member");
        setIsAdmin(memberData.role === "admin" || memberData.role === "owner" || isCreator);
      } else if (isCreator) {
        setUserRole("owner");
        setIsMember(true);
        setIsAdmin(true);
      }
    }

    // Load members
    const { data: membersData } = await supabase
      .from("community_members")
      .select("*")
      .eq("community_id", params.id)
      .eq("status", "member")
      .order("role", { ascending: true })
      .order("created_at", { ascending: true });

    if (membersData) {
      const membersWithProfiles = await Promise.all(
        membersData.map(async (member) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("user_id", member.user_id)
            .single();
          
          return { ...member, profile: profile || null };
        })
      );
      setMembers(membersWithProfiles);
    }

    // Load posts
    const { data: postsData } = await supabase
      .from("community_posts")
      .select("*")
      .eq("community_id", params.id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (postsData) {
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
          
          return { ...post, author: profile || null };
        })
      );
      setPosts(postsWithAuthors);
    }

    // Load businesses
    const { data: businessData } = await supabase
      .from("business_communities")
      .select(`
        business_id,
        business_profiles!inner(
          id,
          business_name,
          business_description,
          business_logo,
          business_category,
          contact_email,
          contact_phone,
          website_url
        )
      `)
      .eq("community_id", params.id);

    if (businessData) {
      const businessList = businessData.map(item => item.business_profiles).filter(Boolean);
      setBusinesses(businessList as Business[]);
    }

    setLoading(false);
  }

  async function handleJoinCommunity() {
    if (!userId) {
      router.push("/signin");
      return;
    }

    const isPrivate = community?.visibility === "private";
    const { error } = await supabase
      .from("community_members")
      .insert({
        community_id: params.id,
        user_id: userId,
        role: "member",
        status: isPrivate ? "pending" : "member"
      });

    if (!error) {
      alert(isPrivate ? "Join request sent!" : "Successfully joined!");
      loadCommunityData();
    } else if (error.message.includes("duplicate")) {
      alert("You already have a pending request or are a member.");
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
        content: postContent || null,
        is_anonymous: postAnonymous,
        is_pinned: false,
        is_locked: false
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
        content: announcementContent || null,
        is_pinned: true,
        is_locked: false,
        is_anonymous: false
      });

    if (!error) {
      setShowAnnouncement(false);
      setAnnouncementTitle("");
      setAnnouncementContent("");
      loadCommunityData();
    }
  }

  async function handlePinPost(postId: string, currentPinned: boolean) {
    const { error } = await supabase
      .from("community_posts")
      .update({ is_pinned: !currentPinned })
      .eq("id", postId);

    if (!error) loadCommunityData();
  }

  async function handleDeletePost(postId: string) {
    if (!confirm("Delete this post?")) return;

    const { error } = await supabase
      .from("community_posts")
      .delete()
      .eq("id", postId);

    if (!error) {
      setPosts(posts.filter(p => p.id !== postId));
    }
  }

  async function copyInviteLink() {
    const inviteLink = `${window.location.origin}/communities/${params.id}`;
    await navigator.clipboard.writeText(inviteLink);
    alert("Invite link copied!");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5] pb-20">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          <div className="animate-pulse space-y-4">
            <div className="h-48 bg-gray-200 rounded-2xl"></div>
            <div className="h-12 bg-gray-200 rounded-xl"></div>
            <div className="h-64 bg-gray-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5] flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">Community not found</p>
          <Link href="/communities" className="text-purple-600 hover:underline">
            ← Back to Communities
          </Link>
        </div>
      </div>
    );
  }

  const displayName = community.title || community.name || "Untitled Community";
  const displayDescription = community.about || community.description;
  const coverImage = community.cover_url || community.cover_image_url || community.photo_url;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5] pb-24">
      {/* Header with Cover */}
      <div className="bg-white border-b">
        {/* Cover Image */}
        {coverImage && (
          <div className="h-32 sm:h-48 relative">
            <img
              src={coverImage}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Community Info */}
        <div className="container mx-auto px-4 py-4 max-w-6xl">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                {displayName}
              </h1>
              {displayDescription && (
                <p className="text-gray-600 mb-3">{displayDescription}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {community.category && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                    {community.category}
                  </span>
                )}
                {community.zip && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                    📍 {community.zip}
                  </span>
                )}
                {community.visibility === "private" && (
                  <span className="text-xs bg-gray-800 text-white px-3 py-1 rounded-full">
                    🔒 Private
                  </span>
                )}
                <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                  {members.length} {members.length === 1 ? "member" : "members"}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {isMember ? (
                <>
                  {isAdmin && (
                    <Link
                      href={`/communities/${params.id}/edit`}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm sm:text-base"
                    >
                      Edit
                    </Link>
                  )}
                  <button
                    onClick={copyInviteLink}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm sm:text-base"
                  >
                    📋 Invite
                  </button>
                  {isAdmin && (
                    <Link
                      href={`/communities/${params.id}/settings`}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm sm:text-base"
                    >
                      ⚙️
                    </Link>
                  )}
                </>
              ) : (
                <button
                  onClick={handleJoinCommunity}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium text-sm sm:text-base"
                >
                  {community.visibility === "private" ? "Request to Join" : "Join Community"}
                </button>
              )}
            </div>
          </div>

          {/* Tabs - Mobile optimized horizontal scroll */}
          <div className="mt-4 -mx-4 px-4 overflow-x-auto">
            <div className="flex gap-1 min-w-max border-b">
              {["discussions", "members", "events", "businesses", ...(isAdmin ? ["admin"] : [])].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-4 py-3 font-medium text-sm sm:text-base capitalize transition whitespace-nowrap ${
                    activeTab === tab
                      ? "text-purple-600 border-b-2 border-purple-600"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* DISCUSSIONS TAB */}
        {activeTab === "discussions" && (
          <div className="space-y-4">
            {/* Action Buttons */}
            {isMember && (
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowNewPost(true)}
                    className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm sm:text-base flex items-center gap-2"
                  >
                    <span>💬</span>
                    <span>New Discussion</span>
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => setShowAnnouncement(true)}
                      className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm sm:text-base flex items-center gap-2"
                    >
                      <span>📢</span>
                      <span>Announcement</span>
                    </button>
                  )}
                  <Link
                    href={`/meditation?community=${params.id}`}
                    className="px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm sm:text-base flex items-center gap-2"
                  >
                    <span>🧘</span>
                    <span>Group Meditation</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Posts List */}
            {posts.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <div className="text-5xl mb-4">💬</div>
                <p className="text-gray-600 mb-2">No discussions yet</p>
                <p className="text-sm text-gray-500">Be the first to start a conversation!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <div key={post.id} className="bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {post.is_anonymous ? (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-300 flex items-center justify-center text-lg">
                            👤
                          </div>
                        ) : post.author?.avatar_url ? (
                          <img
                            src={post.author.avatar_url}
                            alt=""
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-200" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {post.is_pinned && (
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                  📌 Pinned
                                </span>
                              )}
                              {post.is_locked && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                  🔒 Locked
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-gray-800 text-base sm:text-lg">
                              {post.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">
                              {post.is_anonymous ? (
                                "Anonymous"
                              ) : (
                                <Link href={`/profile/${post.author_id}`} className="hover:underline">
                                  {post.author?.full_name || "Unknown"}
                                </Link>
                              )}
                              {" • "}
                              {new Date(post.created_at).toLocaleDateString()}
                            </p>
                          </div>

                          {/* Admin Actions */}
                          {isAdmin && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handlePinPost(post.id, post.is_pinned)}
                                className="text-xs text-gray-600 hover:text-purple-600 px-2 py-1"
                              >
                                {post.is_pinned ? "Unpin" : "Pin"}
                              </button>
                              <button
                                onClick={() => handleDeletePost(post.id)}
                                className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>

                        {post.content && (
                          <p className="text-gray-700 mb-3 text-sm sm:text-base whitespace-pre-wrap">
                            {post.content}
                          </p>
                        )}

                        {post.image_url && (
                          <img
                            src={post.image_url}
                            alt=""
                            className="rounded-lg max-w-full h-auto mb-3"
                          />
                        )}

                        {/* Actions */}
                        <div className="flex gap-4 text-sm text-gray-500">
                          <button className="hover:text-purple-600">
                            💬 Comment
                          </button>
                          <button className="hover:text-purple-600">
                            ❤️ Like
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MEMBERS TAB */}
        {activeTab === "members" && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">
              Members ({members.length})
            </h2>
            {members.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No members yet</p>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition"
                  >
                    <div className="flex items-center gap-3">
                      {member.profile?.avatar_url ? (
                        <img
                          src={member.profile.avatar_url}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-full" />
                      )}
                      <div>
                        <Link
                          href={`/profile/${member.user_id}`}
                          className="font-medium hover:text-purple-600"
                        >
                          {member.profile?.full_name || "Anonymous"}
                        </Link>
                        <div className="text-sm text-gray-500">
                          {member.user_id === community.owner_id && "👑 Owner"}
                          {member.role === "admin" && "⚡ Admin"}
                          {member.role === "member" && "Member"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* EVENTS TAB */}
        {activeTab === "events" && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Community Events</h2>
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📅</div>
              <p className="text-gray-600 mb-2">Events calendar coming soon!</p>
              <p className="text-sm text-gray-500">
                Members will be able to create events and share them with the community.
              </p>
            </div>
          </div>
        )}

        {/* BUSINESSES TAB */}
        {activeTab === "businesses" && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">
              Community Businesses ({businesses.length})
            </h2>
            {businesses.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🏢</div>
                <p className="text-gray-600 mb-2">No businesses yet</p>
                <p className="text-sm text-gray-500">
                  Business members can add their profile here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {businesses.map((business) => (
                  <div
                    key={business.id}
                    className="border rounded-xl p-4 hover:shadow-md transition"
                  >
                    <div className="flex items-start gap-3">
                      {business.business_logo ? (
                        <img
                          src={business.business_logo}
                          alt=""
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 mb-1">
                          {business.business_name}
                        </h3>
                        {business.business_category && (
                          <p className="text-xs text-purple-600 mb-2">
                            {business.business_category}
                          </p>
                        )}
                        {business.business_description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {business.business_description}
                          </p>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          {business.contact_phone && (
                            <a
                              href={`tel:${business.contact_phone}`}
                              className="text-xs text-purple-600 hover:underline"
                            >
                              📞 Call
                            </a>
                          )}
                          {business.website_url && (
                            <a
                              href={business.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-purple-600 hover:underline"
                            >
                              🌐 Visit
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ADMIN TAB */}
        {activeTab === "admin" && isAdmin && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Community Stats</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{members.length}</div>
                  <div className="text-sm text-gray-600">Members</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{posts.length}</div>
                  <div className="text-sm text-gray-600">Posts</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-sm text-gray-600">Events</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{businesses.length}</div>
                  <div className="text-sm text-gray-600">Businesses</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href={`/communities/${params.id}/edit`}
                  className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-center"
                >
                  ✏️ Edit Community
                </Link>
                <button
                  onClick={copyInviteLink}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  📋 Copy Invite Link
                </button>
                <button
                  onClick={() => setShowAnnouncement(true)}
                  className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  📢 Create Announcement
                </button>
                <Link
                  href={`/communities/${params.id}/settings`}
                  className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-center"
                >
                  ⚙️ Settings
                </Link>
              </div>
            </div>

            {/* Guidelines */}
            {community.guidelines && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Community Guidelines</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{community.guidelines}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* NEW POST MODAL */}
      {showNewPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Start a Discussion</h3>
            <input
              type="text"
              placeholder="Title"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <textarea
              placeholder="What's on your mind? (optional)"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg mb-3 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={postAnonymous}
                onChange={(e) => setPostAnonymous(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span className="text-sm text-gray-700">Post anonymously</span>
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNewPost(false);
                  setPostTitle("");
                  setPostContent("");
                  setPostAnonymous(false);
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={createPost}
                disabled={!postTitle.trim()}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ANNOUNCEMENT MODAL */}
      {showAnnouncement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Create Announcement</h3>
            <input
              type="text"
              placeholder="Announcement title"
              value={announcementTitle}
              onChange={(e) => setAnnouncementTitle(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <textarea
              placeholder="Important message for the community..."
              value={announcementContent}
              onChange={(e) => setAnnouncementContent(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg mb-4 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAnnouncement(false);
                  setAnnouncementTitle("");
                  setAnnouncementContent("");
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={createAnnouncement}
                disabled={!announcementTitle.trim()}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Post Announcement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
