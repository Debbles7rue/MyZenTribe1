// components/FriendQuestionnaire.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  friendshipId?: string;
  friendId: string;
  friendName: string;
  isNewFriend: boolean;
};

export default function FriendQuestionnaire({
  isOpen,
  onClose,
  friendshipId,
  friendId,
  friendName,
  isNewFriend = true,
}: Props) {
  const router = useRouter();
  const [category, setCategory] = useState<"Friend" | "Acquaintance" | "Restricted">("Friend");
  const [howWeMet, setHowWeMet] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);

    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error("Not authenticated");
      }

      // Update the friendship record for this user's perspective
      const { error } = await supabase
        .from("friendships")
        .update({
          category,
          how_we_met: howWeMet,
          notes,
          categorized_at: new Date().toISOString(),
        })
        .eq("user_id", userData.user.id)
        .eq("friend_id", friendId);

      if (error) throw error;

      // Create a notification for successful categorization
      await supabase.from("notifications").insert({
        user_id: userData.user.id,
        kind: "info",
        type: "friend.categorized",
        title: "Friend Categorized",
        body: `You've categorized ${friendName} as ${category}`,
        is_read: false,
      });

      onClose();
      
      // Refresh the page or redirect
      if (isNewFriend) {
        router.push("/friends");
      } else {
        router.refresh();
      }
    } catch (error: any) {
      console.error("Error saving friend categorization:", error);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    onClose();
    if (isNewFriend) {
      router.push("/friends");
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {isNewFriend ? "Welcome Your New Friend!" : "Update Friend Details"}
          </h2>
          <p className="text-gray-600">
            Tell us about {friendName || "your friend"}
          </p>
        </div>

        {/* Category Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            How would you categorize this relationship?
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(["Friend", "Acquaintance", "Restricted"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  category === cat
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-medium">{cat}</div>
                <div className="text-xs mt-1">
                  {cat === "Friend" && "Close connection"}
                  {cat === "Acquaintance" && "Casual connection"}
                  {cat === "Restricted" && "Limited sharing"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* How We Met */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How did you meet? (optional)
          </label>
          <input
            type="text"
            value={howWeMet}
            onChange={(e) => setHowWeMet(e.target.value)}
            placeholder="e.g., Met at yoga class, Work colleague, Old friend from school"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            maxLength={200}
          />
          <p className="text-xs text-gray-500 mt-1">
            This helps you remember your connection
          </p>
        </div>

        {/* Private Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Private notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes about this person..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-gray-500 mt-1">
            Only visible to you
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={saving}
          >
            {isNewFriend ? "Skip for now" : "Cancel"}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Details"}
          </button>
        </div>

        {/* Info Note */}
        {isNewFriend && (
          <p className="text-xs text-gray-500 text-center mt-4">
            You can always update these details later from your friends list
          </p>
        )}
      </div>
    </div>
  );
}
