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

interface Settings {
  members_can_post: boolean;
  members_can_invite: boolean;
  require_post_approval: boolean;
  allow_events: boolean;
  members_can_create_events: boolean;
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

  // Danger zone
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Transfer ownership
  const [showTransferOwnership, setShowTransferOwnership] = useState(false);
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

      // Load settings (if you have a settings table)
      // For now, we'll use default values or add these columns to communities table later
      
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
      <main className="min-h-screen p-6" style={{ background: "#F4ECFF" }}>
        <div className="mx-auto max-w-4xl">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="bg-white rounded-2xl p-6">
              <div className="space-y-4">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const isOwner = userRole === "owner";

  return (
    <main className="min-h-screen p-6" style={{ background: "#F4ECFF" }}>
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href={`/communities/${communityId}`}
              className="text-purple-600 hover:text-purple-700 mb-2 inline-block"
            >
              ← Back to Community
            </Link>
            <h1 className="text-2xl font-semibold">Community Settings</h1>
            <p className="text-gray-600 text-sm">{community?.title}</p>
          </div>
          <Link
            href={`/communities/${communityId}/edit`}
            className="btn"
          >
            Edit Details
          </Link>
        </div>

        {/* Member Permissions */}
        <div className="bg-white rounded-2xl border border-purple-100 shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Member Permissions</h2>
          <p className="text-sm text-gray-600 mb-4">
            Control what members can do in this community
          </p>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <div className="font-medium">Members can create posts</div>
                <div className="text-sm text-gray-600">Allow all members to create discussions</div>
              </div>
              <input
                type="checkbox"
                checked={membersCanPost}
                onChange={(e) => setMembersCanPost(e.target.checked)}
                className="w-5 h-5 text-purple-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <div className="font-medium">Members can invite others</div>
                <div className="text-sm text-gray-600">Let members send invite links</div>
              </div>
              <input
                type="checkbox"
                checked={membersCanInvite}
                onChange={(e) => setMembersCanInvite(e.target.checked)}
                className="w-5 h-5 text-purple-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <div className="font-medium">Require post approval</div>
                <div className="text-sm text-gray-600">All posts must be approved by admins</div>
              </div>
              <input
                type="checkbox"
                checked={requirePostApproval}
                onChange={(e) => setRequirePostApproval(e.target.checked)}
                className="w-5 h-5 text-purple-600 rounded"
              />
            </label>
          </div>
        </div>

        {/* Event Settings */}
        <div className="bg-white rounded-2xl border border-purple-100 shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Event Settings</h2>
          
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <div className="font-medium">Enable events</div>
                <div className="text-sm text-gray-600">Allow events to be created in this community</div>
              </div>
              <input
                type="checkbox"
                checked={allowEvents}
                onChange={(e) => setAllowEvents(e.target.checked)}
                className="w-5 h-5 text-purple-600 rounded"
              />
            </label>

            {allowEvents && (
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <div>
                  <div className="font-medium">Members can create events</div>
                  <div className="text-sm text-gray-600">Let members create and manage events</div>
                </div>
                <input
                  type="checkbox"
                  checked={membersCanCreateEvents}
                  onChange={(e) => setMembersCanCreateEvents(e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded"
                />
              </label>
            )}
          </div>
        </div>

        {/* Save Settings Button */}
        <div className="mb-6">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="btn btn-brand w-full"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Note: Add settings columns to your database to persist these changes
          </p>
        </div>

        {/* Transfer Ownership (Owner only) */}
        {isOwner && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-amber-900 mb-2">Transfer Ownership</h2>
            <p className="text-sm text-amber-800 mb-4">
              Transfer community ownership to another member. You will become an admin.
            </p>

            {!showTransferOwnership ? (
              <button
                onClick={() => setShowTransferOwnership(true)}
                className="btn bg-amber-600 text-white hover:bg-amber-700"
              >
                Transfer Ownership
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-amber-900 mb-1">
                    New Owner User ID
                  </label>
                  <input
                    type="text"
                    value={transferToUserId}
                    onChange={(e) => setTransferToUserId(e.target.value)}
                    placeholder="Paste user ID here..."
                    className="input w-full"
                  />
                  <p className="text-xs text-amber-700 mt-1">
                    The user must be a member of this community
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowTransferOwnership(false);
                      setTransferToUserId("");
                    }}
                    className="btn flex-1"
                    disabled={transferring}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTransferOwnership}
                    disabled={transferring || !transferToUserId.trim()}
                    className="btn bg-amber-600 text-white hover:bg-amber-700 flex-1"
                  >
                    {transferring ? "Transferring..." : "Confirm Transfer"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Danger Zone (Owner only) */}
        {isOwner && (
          <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-rose-900 mb-2">Danger Zone</h2>
            <p className="text-sm text-rose-800 mb-4">
              Deleting a community is permanent and cannot be undone. All posts, members, and data will be lost.
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn bg-rose-600 text-white hover:bg-rose-700"
              >
                Delete Community
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-rose-900 mb-1">
                    Type the community name to confirm: <strong>{community?.title}</strong>
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type community name exactly..."
                    className="input w-full"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText("");
                    }}
                    className="btn flex-1"
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteCommunity}
                    disabled={deleting || deleteConfirmText !== community?.title}
                    className="btn bg-rose-600 text-white hover:bg-rose-700 flex-1 disabled:opacity-50"
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
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
            <p className="text-gray-600 text-center">
              You are an admin. Only the owner can transfer ownership or delete this community.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
