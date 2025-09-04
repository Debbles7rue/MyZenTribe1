"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const SUGGESTED_TAGS = [
  "Drum Circle",
  "Meditation",
  "Yoga",
  "Breathwork",
  "Sound Healing",
  "Ecstatic Dance",
  "Mindfulness",
  "Wellness",
  "Spiritual Growth",
  "Community Garden",
  "Art & Creativity",
  "Music",
  "Healing",
  "Nature",
  "Workshops",
  "Retreats"
];

const REGIONS = [
  "Online Only",
  "Northeast US",
  "Southeast US",
  "Midwest US",
  "Southwest US",
  "West Coast US",
  "Pacific Northwest",
  "International",
  "Europe",
  "Asia",
  "Australia",
  "South America",
  "Africa"
];

export default function CreateCommunityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_private: false,
    region: "Online Only",
    tags: [] as string[],
    guidelines: "",
  });

  const handleTagToggle = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Please enter a community name");
      return;
    }

    if (formData.tags.length === 0) {
      alert("Please select at least one tag to help people find your community");
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/signin");
        return;
      }

      // Create the community
      const { data: community, error: createError } = await supabase
        .from("communities")
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          owner_id: user.id,
          is_private: formData.is_private,
          region: formData.region,
          tags: formData.tags,
          guidelines: formData.guidelines.trim() || null,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Add the creator as the owner in community_members
      const { error: memberError } = await supabase
        .from("community_members")
        .insert({
          community_id: community.id,
          user_id: user.id,
          role: "owner",
          status: "approved"
        });

      if (memberError) throw memberError;

      // Create a welcome post
      await supabase
        .from("community_posts")
        .insert({
          community_id: community.id,
          author_id: user.id,
          title: "Welcome to " + formData.name + "!",
          content: "This is the beginning of our community. Feel free to introduce yourself and start connecting with others.",
          is_pinned: true
        });

      // Redirect to the new community
      router.push(`/communities/${community.id}`);
    } catch (error: any) {
      console.error("Error creating community:", error);
      alert("Failed to create community. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5]">
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Create Your Community</h1>
          <p className="text-gray-600">
            Build a space for like-minded individuals in your area or online
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-6">
          {/* Community Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Community Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Dallas Drum Circle, Online Meditation Group"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              maxLength={100}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What is your community about? What makes it special?"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 h-32"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.description.length}/500 characters
            </p>
          </div>

          {/* Region */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Region *
            </label>
            <select
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {REGIONS.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Choose "Online Only" if your community doesn't have a physical location
            </p>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags * (Select at least one)
            </label>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-1 rounded-full text-sm transition ${
                    formData.tags.includes(tag)
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Privacy Settings
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="privacy"
                  checked={!formData.is_private}
                  onChange={() => setFormData({ ...formData, is_private: false })}
                  className="text-purple-600"
                />
                <div>
                  <div className="font-medium">Public Community</div>
                  <div className="text-sm text-gray-600">
                    Anyone can view and join immediately
                  </div>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="privacy"
                  checked={formData.is_private}
                  onChange={() => setFormData({ ...formData, is_private: true })}
                  className="text-purple-600"
                />
                <div>
                  <div className="font-medium">Private Community</div>
                  <div className="text-sm text-gray-600">
                    People must request to join and be approved
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Community Guidelines */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Community Guidelines
            </label>
            <textarea
              value={formData.guidelines}
              onChange={(e) => setFormData({ ...formData, guidelines: e.target.value })}
              placeholder="What are the rules and expectations for members? (optional)"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 h-24"
              maxLength={1000}
            />
          </div>

          {/* Admin Notice */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-purple-900 mb-1">
              You'll be the community owner
            </h3>
            <p className="text-sm text-purple-700">
              As the creator, you'll have full admin rights including:
            </p>
            <ul className="text-sm text-purple-700 mt-2 space-y-1 list-disc list-inside">
              <li>Appointing moderators to help manage the community</li>
              <li>Moderating content and managing members</li>
              <li>Setting community rules and guidelines</li>
              <li>Creating announcements and pinned posts</li>
            </ul>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push("/communities")}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name.trim() || formData.tags.length === 0}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Community"}
            </button>
          </div>
        </form>

        {/* Tips */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold mb-3">Tips for Building a Great Community</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="text-purple-600">✓</span>
              <span>Choose a clear, descriptive name that reflects your community's purpose</span>
            </li>
            <li className="flex gap-2">
              <span className="text-purple-600">✓</span>
              <span>Start with a public community to grow faster, you can change it later</span>
            </li>
            <li className="flex gap-2">
              <span className="text-purple-600">✓</span>
              <span>Post regularly and encourage members to share their experiences</span>
            </li>
            <li className="flex gap-2">
              <span className="text-purple-600">✓</span>
              <span>Appoint trusted moderators as your community grows</span>
            </li>
            <li className="flex gap-2">
              <span className="text-purple-600">✓</span>
              <span>Host events and activities to bring members together</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
