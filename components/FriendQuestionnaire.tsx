// components/FriendQuestionnaire.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Car, Shield, Users, Info, Heart, X, Sparkles, UserCheck } from 'lucide-react';

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
  const [safeToCarpool, setSafeToCarpool] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animation on mount
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  // Load existing data if editing an existing friend
  useEffect(() => {
    if (!isNewFriend && friendId) {
      loadExistingData();
    }
  }, [friendId, isNewFriend]);

  async function loadExistingData() {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const { data, error } = await supabase
        .from("friendships")
        .select("category, how_we_met, notes, safe_to_carpool")
        .eq("user_id", userData.user.id)
        .eq("friend_id", friendId)
        .single();

      if (data && !error) {
        setCategory(data.category || "Friend");
        setHowWeMet(data.how_we_met || "");
        setNotes(data.notes || "");
        setSafeToCarpool(data.safe_to_carpool || false);
      }
    } catch (error) {
      console.error("Error loading friend data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error("Not authenticated");
      }

      const { error } = await supabase
        .from("friendships")
        .update({
          category,
          how_we_met: howWeMet,
          notes,
          safe_to_carpool: safeToCarpool,
          categorized_at: new Date().toISOString(),
        })
        .eq("user_id", userData.user.id)
        .eq("friend_id", friendId);

      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: userData.user.id,
        kind: "info",
        type: "friend.categorized",
        title: "Friend Settings Updated",
        body: `You've updated settings for ${friendName}`,
        is_read: false,
      });

      onClose();
      
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

  const categoryConfig = {
    Friend: {
      icon: "💜",
      color: "from-purple-400 to-pink-400",
      borderColor: "border-purple-400",
      bgColor: "bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20",
      description: "Close connection"
    },
    Acquaintance: {
      icon: "👋",
      color: "from-blue-400 to-cyan-400",
      borderColor: "border-blue-400",
      bgColor: "bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20",
      description: "Casual connection"
    },
    Restricted: {
      icon: "🔒",
      color: "from-gray-400 to-slate-400",
      borderColor: "border-gray-400",
      bgColor: "bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20",
      description: "Limited sharing"
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-2xl transform transition-all duration-500 ${
        isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        {/* Gradient Header */}
        <div className="relative bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 p-6 pb-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-3">
              {isNewFriend ? (
                <Sparkles className="text-white" size={32} />
              ) : (
                <UserCheck className="text-white" size={32} />
              )}
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {isNewFriend ? "Welcome Your New Friend!" : "Update Friend Settings"}
            </h2>
            <p className="text-white/90 text-sm">
              Configure your connection with {friendName}
            </p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] px-6 py-6 space-y-6">
          {/* Category Selection - Beautiful Cards */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              <Users size={16} />
              Relationship Type
            </label>
            <div className="space-y-3">
              {(["Friend", "Acquaintance", "Restricted"] as const).map((cat) => {
                const config = categoryConfig[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`w-full p-4 rounded-2xl border-2 transition-all transform hover:scale-[1.02] ${
                      category === cat
                        ? `${config.borderColor} ${config.bgColor} shadow-lg`
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{config.icon}</span>
                      <div className="text-left flex-1">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">{cat}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {config.description}
                        </div>
                      </div>
                      {category === cat && (
                        <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${config.color} flex items-center justify-center`}>
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CARPOOL SAFETY - Beautiful Toggle Card */}
          <div className={`relative overflow-hidden rounded-2xl border-2 transition-all ${
            safeToCarpool 
              ? 'border-green-400 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30' 
              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
          }`}>
            {/* Animated background pattern */}
            {safeToCarpool && (
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-green-400 rounded-full animate-pulse" />
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-emerald-400 rounded-full animate-pulse animation-delay-1000" />
              </div>
            )}
            
            <label className="relative flex items-start p-4 cursor-pointer">
              <input
                type="checkbox"
                checked={safeToCarpool}
                onChange={(e) => setSafeToCarpool(e.target.checked)}
                className="sr-only"
              />
              <div className={`relative w-12 h-7 rounded-full transition-colors ${
                safeToCarpool ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}>
                <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform transform ${
                  safeToCarpool ? 'translate-x-5' : 'translate-x-0'
                }`}>
                  {safeToCarpool && (
                    <Car className="w-4 h-4 text-green-500 absolute top-1 left-1" />
                  )}
                </div>
              </div>
              
              <div className="ml-4 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    Safe to Carpool
                  </span>
                  {safeToCarpool && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                      <Shield size={12} />
                      Enabled
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Allow {friendName} in carpool groups for events
                </p>
                {safeToCarpool && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-green-700 dark:text-green-300">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    You can coordinate rides together
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* How We Met - Elegant Input */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <Heart size={16} />
              How did you meet?
              <span className="text-xs font-normal text-gray-500">(Private)</span>
            </label>
            <input
              type="text"
              value={howWeMet}
              onChange={(e) => setHowWeMet(e.target.value)}
              placeholder="e.g., Yoga class, mutual friend, work..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400"
              maxLength={200}
            />
          </div>

          {/* Private Notes - Elegant Textarea */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <Info size={16} />
              Private notes
              <span className="text-xs font-normal text-gray-500">(Only you can see)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none"
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        {/* Beautiful Action Buttons */}
        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700">
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 px-5 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              disabled={saving}
            >
              {isNewFriend ? "Skip" : "Cancel"}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-5 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              disabled={saving || loading}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save Settings"
              )}
            </button>
          </div>
          
          {isNewFriend && (
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
              You can update these settings anytime from your friends list
            </p>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        .animation-delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}
