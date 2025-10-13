// File: /app/communities/[id]/edit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import CommunityPhotoUploader from "@/components/CommunityPhotoUploader";

const CATEGORY_STRUCTURE = {
  "Wellness": ["Yoga", "Meditation", "Breathwork", "Qi Gong", "Tai Chi", "Reiki", "Sound Healing", "Energy Work"],
  "Music & Sound": ["Drum Circle", "Sound Bath", "Kirtan", "Singing Circle", "Music Jam", "Ecstatic Dance"],
  "Spiritual": ["Spiritual Growth", "Sacred Ceremony", "Prayer Circle", "Mindfulness", "Buddhist", "Christian", "Interfaith"],
  "Support": ["Recovery", "Grief Support", "Men's Circle", "Women's Circle", "Parenting", "Mental Health"],
  "Creative": ["Art & Creativity", "Writing", "Poetry", "Crafts", "Photography", "Dance"],
  "Nature": ["Nature Walks", "Community Garden", "Environmental", "Hiking", "Outdoor Activities"],
  "Learning": ["Workshops", "Book Club", "Language Exchange", "Skills Sharing", "Lectures"]
};

const ALL_CATEGORIES = Object.entries(CATEGORY_STRUCTURE).flatMap(([main, subs]) => [main, ...subs]);

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
  guidelines: string | null;
  owner_id: string;
  created_by: string;
}

export default function EditCommunityPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const communityId = params?.id;

  const [userId, setUserId] = useState<string | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [region, setRegion] = useState("");
  const [zip, setZip] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [guidelines, setGuidelines] = useState("");

  const [customTag, setCustomTag] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showTagSection, setShowTagSection] = useState(false);

  useEffect(() => {
    checkAuthAndLoad();
  }, [communityId]);

  async function checkAuthAndLoad() {
    if (!communityId) return;

    try {
      // Check auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/login?next=${encodeURIComponent(`/communities/${communityId}/edit`)}`);
        return;
      }
      setUserId(user.id);

      // Load community
      const { data: comm, error: commError } = await supabase
        .from("communities")
        .select("*")
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

      const isOwnerOrAdmin = membership?.role === "owner" || membership?.role === "admin";
      setIsAuthorized(isOwnerOrAdmin);

      if (!isOwnerOrAdmin) {
        router.push(`/communities/${communityId}`);
        return;
      }

      // Set form fields
      setTitle(comm.title || "");
      setName(comm.name || "");
      setAbout(comm.about || comm.description || "");
      setCategory(comm.category || "");
      setTags(comm.tags || []);
      setRegion(comm.region || "");
      setZip(comm.zip || "");
      setVisibility(comm.visibility || "public");
      setPhotoUrl(comm.photo_url);
      setCoverUrl(comm.cover_url);
      setGuidelines(comm.guidelines || "");

      // Show tag section if tags exist
      if (comm.tags && comm.tags.length > 0) {
        setShowTagSection(true);
      }

    } catch (error: any) {
      console.error("Error loading community:", error);
      alert("Failed to load community");
      router.push("/communities");
    } finally {
      setLoading(false);
    }
  }

  function toggleTag(tag: string) {
    if (tags.includes(tag)) {
      setTags(tags.filter(t => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  }

  function addCustomTag() {
    const trimmed = customTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setCustomTag("");
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter(t => t !== tag));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    
    if (!communityId || !isAuthorized) return;

    setSaving(true);
    setSuccessMessage("");

    try {
      const updates: any = {
        title: title.trim(),
        name: name.trim() || title.trim(),
        about: about.trim() || null,
        description: about.trim() || null,
        category: category || null,
        tags: tags.length > 0 ? tags : null,
        region: region || null,
        zip: zip || null,
        visibility: visibility,
        photo_url: photoUrl,
        cover_url: coverUrl,
        guidelines: guidelines.trim() || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("communities")
        .update(updates)
        .eq("id", communityId);

      if (error) throw error;

      setSuccessMessage("Community updated successfully!");
      
      // Redirect back to community after 1 second
      setTimeout(() => {
        router.push(`/communities/${communityId}`);
      }, 1000);

    } catch (error: any) {
      console.error("Error saving community:", error);
      alert(error.message || "Failed to save changes");
    } finally {
      setSaving(false);
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
              <div className="h-32 bg-gray-200 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5] pb-20">
        <div className="container mx-auto px-4 py-4 max-w-3xl">
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <div className="text-5xl mb-4">🔒</div>
            <p className="text-rose-600 mb-4 text-lg">You don't have permission to edit this community.</p>
            <Link 
              href={`/communities/${communityId}`} 
              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-full font-medium hover:bg-purple-700 transition"
            >
              Back to Community
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Edit Community</h1>
            </div>
            <Link
              href={`/communities/${communityId}/settings`}
              className="px-4 py-2 bg-white text-gray-700 rounded-full text-sm font-medium shadow-sm hover:bg-gray-50 transition"
            >
              Settings
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 max-w-3xl">
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border-2 border-green-200 text-green-800 px-4 py-3 rounded-xl mb-4 animate-in slide-in-from-top">
            <div className="flex items-center gap-2">
              <span className="text-xl">✓</span>
              <span className="font-medium">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Basic Information */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Basic Information</h2>
            
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Community Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Dallas Meditation Circle"
                  required
                />
              </div>

              {/* Name (handle/slug) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Community Name (URL)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., dallas-meditation"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank to auto-generate from title
                </p>
              </div>

              {/* About/Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  About
                </label>
                <textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  rows={4}
                  placeholder="Describe your community..."
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {about.length}/500 characters
                </p>
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Category</h2>
            
            {/* Selected Category Display */}
            <button
              type="button"
              onClick={() => setShowCategoryPicker(!showCategoryPicker)}
              className="w-full px-4 py-3 border rounded-xl text-left bg-white flex justify-between items-center"
            >
              <span className={category ? "text-gray-900" : "text-gray-500"}>
                {category || "Select category..."}
              </span>
              <svg className={`w-5 h-5 transition-transform ${showCategoryPicker ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Category Picker */}
            {showCategoryPicker && (
              <div className="mt-2 max-h-80 overflow-y-auto border rounded-xl p-2 bg-white animate-in slide-in-from-top">
                <button
                  type="button"
                  onClick={() => {
                    setCategory("");
                    setShowCategoryPicker(false);
                  }}
                  className="w-full px-3 py-3 text-left text-gray-600 hover:bg-gray-50 rounded-lg"
                >
                  No category
                </button>
                {Object.entries(CATEGORY_STRUCTURE).map(([main, subs]) => (
                  <div key={main} className="mt-2">
                    <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">
                      {main}
                    </div>
                    {subs.map(sub => (
                      <button
                        type="button"
                        key={sub}
                        onClick={() => {
                          setCategory(sub);
                          setShowCategoryPicker(false);
                        }}
                        className={`w-full px-3 py-3 text-left rounded-lg ${
                          category === sub 
                            ? "bg-purple-100 text-purple-700 font-medium" 
                            : "hover:bg-gray-50"
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags Section - Collapsible */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <button
              type="button"
              onClick={() => setShowTagSection(!showTagSection)}
              className="w-full flex items-center justify-between"
            >
              <h2 className="text-lg font-semibold text-gray-800">
                Tags {tags.length > 0 && `(${tags.length})`}
              </h2>
              <svg className={`w-5 h-5 transition-transform ${showTagSection ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showTagSection && (
              <div className="mt-4 space-y-3 animate-in slide-in-from-top">
                {/* Selected Tags */}
                {tags.length > 0 && (
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-700 mb-2 font-medium">Selected:</p>
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <button
                          type="button"
                          key={tag}
                          onClick={() => removeTag(tag)}
                          className="px-3 py-1.5 bg-purple-600 text-white rounded-full text-sm flex items-center gap-1"
                        >
                          {tag}
                          <span className="text-lg">×</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Tags */}
                <div className="grid grid-cols-2 gap-2">
                  {ALL_CATEGORIES.slice(0, 8).map(tag => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-2.5 rounded-lg text-sm transition ${
                        tags.includes(tag)
                          ? "bg-purple-100 text-purple-700 border-2 border-purple-300"
                          : "bg-gray-50 text-gray-700 border border-gray-200"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {/* Custom Tag */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCustomTag())}
                    className="flex-1 px-4 py-3 border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Add custom tag..."
                  />
                  <button
                    type="button"
                    onClick={addCustomTag}
                    className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Location</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Region
                </label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Dallas-Fort Worth"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code
                </label>
                <input
                  type="tel"
                  value={zip}
                  onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  className="w-full px-4 py-3 border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., 75001"
                  maxLength={5}
                />
              </div>
            </div>
          </div>

          {/* Photos */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Photos</h2>
            
            <div className="space-y-4">
              <CommunityPhotoUploader
                value={coverUrl}
                onChange={setCoverUrl}
                label="Cover Photo"
                communityId={communityId}
                userId={userId}
              />

              <CommunityPhotoUploader
                value={photoUrl}
                onChange={setPhotoUrl}
                label="Profile Photo"
                communityId={communityId}
                userId={userId}
              />
            </div>
          </div>

          {/* Privacy */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Privacy</h2>
            
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  value="public"
                  checked={visibility === "public"}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="mt-1 w-5 h-5"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Public</div>
                  <div className="text-sm text-gray-600">Anyone can view and join</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  value="private"
                  checked={visibility === "private"}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="mt-1 w-5 h-5"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Private</div>
                  <div className="text-sm text-gray-600">Requires approval to join</div>
                </div>
              </label>
            </div>
          </div>

          {/* Guidelines */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Guidelines</h2>
            
            <textarea
              value={guidelines}
              onChange={(e) => setGuidelines(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows={6}
              placeholder="Community rules and guidelines..."
            />
          </div>

          {/* Action Buttons - Fixed at bottom on mobile */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 sm:relative sm:bg-transparent sm:border-0 sm:shadow-none sm:p-0">
            <div className="flex gap-3 max-w-3xl mx-auto">
              <button
                type="button"
                onClick={() => router.push(`/communities/${communityId}`)}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition disabled:opacity-50"
                disabled={saving || !title.trim()}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
