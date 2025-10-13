// File: /app/communities/[id]/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

interface Community {
  id: string;
  title: string;
  owner_id: string;
  created_by: string;
}

export default function CommunitySettingsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const communityId = params?.id;

  const [userId, setUserId] = useState<string | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings
  const [membersCanPost, setMembersCanPost] = useState(true);
  const [membersCanInvite, setMembersCanInvite] = useState(true);
  const [requirePostApproval, setRequirePostApproval] = useState(false);
  const [allowEvents, setAllowEvents] = useState(true);
  const [membersCanCreateEvents, setMembersCanCreateEvents] = useState(false);

  // UI state
  const [showTransferSection, setShowTransferSection] = useState(false);
  const [showDeleteSection, setShowDeleteSection] = useState(false);

  // Danger zone
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Transfer ownership
  const [transferToUserId, setTransferToUserId] = useState("");
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    checkAuthAndLoad();
  }, [communityId]);

  async function checkAuthAndLoad() {
    if (!communityId) return;

    try {
      // Check auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/login?next=${encodeURIComponent(`/communities/${communityId}/settings`)}`);
        return;
      }
      setUserId(user.id);

      // Load community
      const { data: comm, error: commError } = await supabase
        .from("communities")
        .select("id, title, owner_id, created_by")
        .eq("id", communityId)
        .single();

      if (commError) throw commError;
      setCommunity(comm);

      // Check if user is owner or admin
      const { data: membership } = await supabase
        .from("community_members")
        .select("role")
        .eq("community_id", communityId)
        .eq("user_id", user.id)
        .single();

      const role = membership?.role;
      setUserRole(role || null);

      if (role !== "owner" && role !== "admin") {
        router.push(`/communities/${communityId}`);
        return;
      }
      
    } catch (error: any) {
      console.error("Error loading:", error);
      alert("Failed to load settings");
      router.push("/communities");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings() {
    if (!communityId) return;

    setSaving(true);
    try {
      // You can add these as columns to your communities table
      // or create a separate community_settings table
      const updates = {
        // members_can_post: membersCanPost,
        // members_can_invite: membersCanInvite,
        // require_post_approval: requirePostApproval,
        // allow_events: allowEvents,
        // members_can_create_events: membersCanCreateEvents,
        updated_at: new Date().toISOString()
      };

      // const { error } = await supabase
      //   .from("communities")
      //   .update(updates)
      //   .eq("id", communityId);

      // if (error) throw error;

      alert("Settings saved! (Note: Add settings columns to database to persist these)");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      alert(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCommunity() {
    if (!communityId || !community) return;
    
    if (deleteConfirmText !== community.title) {
      alert("Please type the community name exactly to confirm deletion");
      return;
    }

    if (!confirm("This action cannot be undone. Are you absolutely sure?")) {
      return;
    }

    setDeleting(true);
    try {
      // Delete all related data first
      await supabase.from("community_members").delete().eq("community_id", communityId);
      await supabase.from("community_posts").delete().eq("community_id", communityId);
      // Add more deletions as needed for your schema

      // Finally delete the community
      const { error } = await supabase
        .from("communities")
        .delete()
        .eq("id", communityId);

      if (error) throw error;

      alert("Community deleted successfully");
      router.push("/communities");
    } catch (error: any) {
      console.error("Error deleting community:", error);
      alert(error.message || "Failed to delete community");
      setDeleting(false);
    }
  }

  async function handleTransferOwnership() {
    if (!communityId || !transferToUserId.trim()) return;

    if (!confirm(`Transfer ownership to user ID: ${transferToUserId}? You will become an admin.`)) {
      return;
    }

    setTransferring(true);
    try {
      // Update the new owner
      const { error: newOwnerError } = await supabase
        .from("community_members")
        .update({ role: "owner" })
        .eq("community_id", communityId)
        .eq("user_id", transferToUserId);

      if (newOwnerError) throw newOwnerError;

      // Downgrade current owner to admin
      const { error: oldOwnerError } = await supabase
        .from("community_members")
        .update({ role: "admin" })
        .eq("community_id", communityId)
        .eq("user_id", userId);

      if (oldOwnerError) throw oldOwnerError;

      // Update community owner_id
      const { error: commError } = await supabase
        .from("communities")
        .update({ owner_id: transferToUserId })
        .eq("id", communityId);

      if (commError) throw commError;

      alert("Ownership transferred successfully!");
      router.push(`/communities/${communityId}`);
    } catch (error: any) {
      console.error("Error transferring ownership:", error);
      alert(error.message || "Failed to transfer ownership");
      setTransferring(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5] pb-20">
        <div className="container mx-auto px-4 py-4 max-w-3xl">
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 rounded w-2/3 mb-6"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded-2xl"></div>
              <div className="h-32 bg-gray-200 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = userRole === "owner";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5] pb-24">
      {/* Mobile-Optimized Sticky Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-[#EDE7F6] to-[#EDE7F6]/95 backdrop-blur-sm border-b border-purple-100">
        <div className="container mx-auto px-4 py-3 max-w-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href={`/communities/${communityId}`}
                className="p-2 -ml-2 hover:bg-purple-100 rounded-full transition"
              >
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Settings</h1>
                <p className="text-xs text-gray-600">{community?.title}</p>
              </div>
            </div>
            <Link
              href={`/communities/${communityId}/edit`}
              className="px-4 py-2 bg-white text-gray-700 rounded-full text-sm font-medium shadow-sm hover:bg-gray-50 transition"
            >
              Edit
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 max-w-3xl space-y-4">
        {/* Member Permissions */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">Member Permissions</h2>
          <p className="text-sm text-gray-600 mb-4">
            Control what members can do in this community
          </p>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer active:bg-gray-100 transition">
              <div className="flex-1 pr-3">
                <div className="font-medium text-gray-900">Members can create posts</div>
                <div className="text-sm text-gray-600">Allow all members to create discussions</div>
              </div>
              <input
                type="checkbox"
                checked={membersCanPost}
                onChange={(e) => setMembersCanPost(e.target.checked)}
                className="w-6 h-6 text-purple-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer active:bg-gray-100 transition">
              <div className="flex-1 pr-3">
                <div className="font-medium text-gray-900">Members can invite others</div>
                <div className="text-sm text-gray-600">Let members send invite links</div>
              </div>
              <input
                type="checkbox"
                checked={membersCanInvite}
                onChange={(e) => setMembersCanInvite(e.target.checked)}
                className="w-6 h-6 text-purple-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer active:bg-gray-100 transition">
              <div className="flex-1 pr-3">
                <div className="font-medium text-gray-900">Require post approval</div>
                <div className="text-sm text-gray-600">All posts must be approved by admins</div>
              </div>
              <input
                type="checkbox"
                checked={requirePostApproval}
                onChange={(e) => setRequirePostApproval(e.target.checked)}
                className="w-6 h-6 text-purple-600 rounded"
              />
            </label>
          </div>
        </div>

        {/* Event Settings */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">Event Settings</h2>
          
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer active:bg-gray-100 transition">
              <div className="flex-1 pr-3">
                <div className="font-medium text-gray-900">Enable events</div>
                <div className="text-sm text-gray-600">Allow events to be created in this community</div>
              </div>
              <input
                type="checkbox"
                checked={allowEvents}
                onChange={(e) => setAllowEvents(e.target.checked)}
                className="w-6 h-6 text-purple-600 rounded"
              />
            </label>

            {allowEvents && (
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer active:bg-gray-100 transition">
                <div className="flex-1 pr-3">
                  <div className="font-medium text-gray-900">Members can create events</div>
                  <div className="text-sm text-gray-600">Let members create and manage events</div>
                </div>
                <input
                  type="checkbox"
                  checked={membersCanCreateEvents}
                  onChange={(e) => setMembersCanCreateEvents(e.target.checked)}
                  className="w-6 h-6 text-purple-600 rounded"
                />
              </label>
            )}
          </div>
        </div>

        {/* Save Settings Button */}
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="w-full px-6 py-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition disabled:opacity-50 shadow-md"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
        <p className="text-xs text-gray-500 text-center -mt-2">
          Note: Add settings columns to your database to persist these changes
        </p>

        {/* Transfer Ownership (Owner only) */}
        {isOwner && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowTransferSection(!showTransferSection)}
              className="w-full p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">👑</span>
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-amber-900">Transfer Ownership</h2>
                  <p className="text-sm text-amber-800">Give community ownership to another member</p>
                </div>
              </div>
              <svg className={`w-5 h-5 text-amber-900 transition-transform ${showTransferSection ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showTransferSection && (
              <div className="px-4 pb-4 space-y-3 animate-in slide-in-from-top">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <p className="text-sm text-amber-800">
                    ⚠️ You will become an admin after transfer. This cannot be undone.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-amber-900 mb-2">
                    New Owner User ID
                  </label>
                  <input
                    type="text"
                    value={transferToUserId}
                    onChange={(e) => setTransferToUserId(e.target.value)}
                    placeholder="Paste user ID here..."
                    className="w-full px-4 py-3 border-2 border-amber-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-xs text-amber-700 mt-1">
                    The user must be a member of this community
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowTransferSection(false);
                      setTransferToUserId("");
                    }}
                    className="flex-1 px-6 py-3 bg-white border-2 border-amber-300 text-amber-900 rounded-xl font-medium hover:bg-amber-50 transition"
                    disabled={transferring}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTransferOwnership}
                    disabled={transferring || !transferToUserId.trim()}
                    className="flex-1 px-6 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition disabled:opacity-50"
                  >
                    {transferring ? "Transferring..." : "Transfer"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Danger Zone (Owner only) */}
        {isOwner && (
          <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowDeleteSection(!showDeleteSection)}
              className="w-full p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-rose-900">Danger Zone</h2>
                  <p className="text-sm text-rose-800">Delete this community permanently</p>
                </div>
              </div>
              <svg className={`w-5 h-5 text-rose-900 transition-transform ${showDeleteSection ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDeleteSection && (
              <div className="px-4 pb-4 space-y-3 animate-in slide-in-from-top">
                <div className="p-3 bg-rose-100 rounded-lg">
                  <p className="text-sm text-rose-800">
                    🚨 This will permanently delete the community, all posts, members, and data. This cannot be undone.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-rose-900 mb-2">
                    Type <strong>{community?.title}</strong> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type community name exactly..."
                    className="w-full px-4 py-3 border-2 border-rose-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowDeleteSection(false);
                      setDeleteConfirmText("");
                    }}
                    className="flex-1 px-6 py-3 bg-white border-2 border-rose-300 text-rose-900 rounded-xl font-medium hover:bg-rose-50 transition"
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteCommunity}
                    disabled={deleting || deleteConfirmText !== community?.title}
                    className="flex-1 px-6 py-3 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 transition disabled:opacity-50"
                  >
                    {deleting ? "Deleting..." : "Delete Forever"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Admin view (not owner) */}
        {!isOwner && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center">
            <div className="text-3xl mb-2">👤</div>
            <p className="text-gray-600 font-medium">
              You are an admin. Only the owner can transfer ownership or delete this community.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
