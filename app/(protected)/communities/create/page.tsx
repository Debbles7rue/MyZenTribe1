"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import CommunityPhotoUploader from "@/components/CommunityPhotoUploader";

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
  "Retreats",
  "Qi Gong",
  "Sound Bath",
  "Kirtan",
  "Reiki"
];

const REGIONS = [
  "Online Only",
  "Dallas-Fort Worth",
  "Austin",
  "Houston",
  "San Antonio",
  "Phoenix",
  "Los Angeles",
  "San Francisco",
  "New York",
  "Chicago",
  "Miami",
  "Seattle",
  "Denver",
  "Portland",
  "Other"
];

const COMMUNITY_GUIDELINES = [
  "Kindness first - treat all members with respect",
  "No spam or self-promotion without permission",
  "Respect privacy - don't share personal information",
  "Keep discussions relevant to the community",
  "No hate speech, discrimination, or harassment",
  "Report concerns to moderators",
  "Celebrate diverse perspectives and beliefs"
];

export default function CreateCommunityPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState("Online Only");
  const [customRegion, setCustomRegion] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [guidelines, setGuidelines] = useState(COMMUNITY_GUIDELINES.join("\n"));
  
  // Character counts
  const maxDescriptionLength = 500;

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/signin?redirect=/communities/create");
      return;
    }
    setUserId(user.id);
  }

  function toggleTag(tag: string) {
    if (tags.includes(tag)) {
      setTags(tags.filter(t => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  }

  function addCustomTag() {
    const trimmedTag = customTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setCustomTag("");
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter(t => t !== tag));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!userId) {
      alert("Please sign in to create a community");
      return;
    }

    if (!name.trim()) {
      alert("Please enter a community name");
      return;
    }

    if (tags.length === 0) {
      alert("Please select at least one tag");
      return;
    }

    const finalRegion = region === "Other" && customRegion ? customRegion : region;

    setLoading(true);

    try {
      // Create the community
      const { data: community, error: communityError } = await supabase
        .from("communities")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          region: finalRegion,
          tags,
          is_private: isPrivate,
          cover_url: coverUrl,
          created_by: userId,
          status: "active"
        })
        .select()
        .single();

      if (communityError) throw communityError;

      // Make creator the owner
      const { error: memberError } = await supabase
        .from("community_members")
        .insert({
          community_id: community.id,
          user_id: userId,
          role: "owner",
          status: "member"
        });

      if (memberError) throw memberError;

      // Create initial announcement
      await supabase
        .from("community_announcements")
        .insert({
          community_id: community.id,
          title: "Welcome to our community!",
          body: `Welcome to ${community.name}! We're excited to have you here. Please take a moment to read our community guidelines and introduce yourself.`,
          created_by: userId,
          is_pinned: true,
          published_at: new Date().toISOString()
        });

      router.push(`/communities/${community.id}`);
    } catch (error: any) {
      console.error("Error creating community:", error);
      alert(error.message || "Failed to create community");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5]">
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Create Your Community</h1>
          <p className="text-gray-600">Build a space for like-minded individuals in your area or online</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              {/* Community Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Community Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Dallas Drum Circle, Online Meditation Group"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="What is your community about? What makes it special?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, maxDescriptionLength))}
                  rows={4}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {description.length}/{maxDescriptionLength} characters
                </p>
              </div>

              {/* Cover Photo */}
              {userId && (
                <CommunityPhotoUploader
                  value={coverUrl}
                  onChange={setCoverUrl}
                  userId={userId}
                  label="Cover Photo (optional)"
                />
              )}
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Location</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Region *
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  required
                >
                  {REGIONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Choose "Online Only" if your community doesn't have a physical location
                </p>
              </div>

              {region === "Other" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Region
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your region"
                    value={customRegion}
                    onChange={(e) => setCustomRegion(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Tags * (Select at least one)</h2>
            
            {/* Selected Tags */}
            {tags.length > 0 && (
              <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-700 mb-2">Selected tags:</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-purple-600 text-white rounded-full text-sm flex items-center gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-purple-200"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Tags */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
              {SUGGESTED_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-2 rounded-lg text-sm transition ${
                    tags.includes(tag)
                      ? "bg-purple-100 text-purple-700 border-2 border-purple-300"
                      : "bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-purple-200"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Custom Tag Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add custom tag..."
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCustomTag())}
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={addCustomTag}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Add
              </button>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Privacy Settings</h2>
            
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50">
                <input
                  type="radio"
                  checked={!isPrivate}
                  onChange={() => setIsPrivate(false)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium">Public Community</div>
                  <div className="text-sm text-gray-600">Anyone can view and join immediately</div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50">
                <input
                  type="radio"
                  checked={isPrivate}
                  onChange={() => setIsPrivate(true)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium">Private Community</div>
                  <div className="text-sm text-gray-600">People must request to join and be approved</div>
                </div>
              </label>
            </div>
          </div>

          {/* Community Guidelines */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Community Guidelines</h2>
            <p className="text-sm text-gray-600 mb-3">
              You'll be the community owner. As the creator, you'll have full admin rights including:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mb-4">
              <li>Appointing moderators to help manage the community</li>
              <li>Moderating content and managing members</li>
              <li>Setting community rules and guidelines</li>
              <li>Creating announcements and pinned posts</li>
            </ul>
            
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom Guidelines (optional)
            </label>
            <textarea
              value={guidelines}
              onChange={(e) => setGuidelines(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
              placeholder="Add any specific rules for your community..."
            />
          </div>

          {/* Tips */}
          <div className="bg-blue-50 rounded-2xl p-6">
            <h3 className="font-semibold text-blue-900 mb-3">Tips for Building a Great Community</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Choose a clear, descriptive name that reflects your community's purpose</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Start with a public community to grow faster, you can change it later</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Post regularly and encourage members to share their experiences</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Appoint trusted moderators as your community grows</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Host events and activities to bring members together</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !name.trim() || tags.length === 0}
            >
              {loading ? "Creating..." : "Create Community"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
