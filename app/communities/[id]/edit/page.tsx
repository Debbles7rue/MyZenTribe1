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
      <main className="min-h-screen p-6" style={{ background: "#F4ECFF" }}>
        <div className="mx-auto max-w-4xl">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="bg-white rounded-2xl p-6">
              <div className="space-y-4">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!isAuthorized) {
    return (
      <main className="min-h-screen p-6" style={{ background: "#F4ECFF" }}>
        <div className="mx-auto max-w-4xl">
          <div className="bg-white rounded-2xl p-6 text-center">
            <p className="text-rose-600 mb-4">You don't have permission to edit this community.</p>
            <Link href={`/communities/${communityId}`} className="btn">
              Back to Community
            </Link>
          </div>
        </div>
      </main>
    );
  }

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
            <h1 className="text-2xl font-semibold">Edit Community</h1>
          </div>
          <Link
            href={`/communities/${communityId}/settings`}
            className="btn"
          >
            Settings
          </Link>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
            {successMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-2xl border border-purple-100 shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Community Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input w-full"
                  placeholder="e.g., Dallas Meditation Circle"
                  required
                />
              </div>

              {/* Name (handle/slug) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Community Name (URL friendly)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input w-full"
                  placeholder="e.g., dallas-meditation"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used in URLs. Leave blank to auto-generate from title.
                </p>
              </div>

              {/* About/Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  About
                </label>
                <textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  className="input w-full"
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

          {/* Category & Tags */}
          <div className="bg-white rounded-2xl border border-purple-100 shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Category & Tags</h2>
            
            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Select a category...</option>
                  {Object.entries(CATEGORY_STRUCTURE).map(([main, subs]) => (
                    <optgroup key={main} label={main}>
                      {subs.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                
                {/* Selected Tags */}
                {tags.length > 0 && (
                  <div className="mb-3 p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-700 mb-2">Selected:</p>
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                  {ALL_CATEGORIES.slice(0, 12).map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-2 rounded-lg text-sm transition ${
                        tags.includes(tag)
                          ? "bg-purple-100 text-purple-700 border-2 border-purple-300"
                          : "bg-gray-50 text-gray-700 border border-gray-200 hover:border-purple-200"
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
                    className="input flex-1"
                    placeholder="Add custom tag..."
                  />
                  <button
                    type="button"
                    onClick={addCustomTag}
                    className="btn btn-brand"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-2xl border border-purple-100 shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Location</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Region
                </label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="input w-full"
                  placeholder="e.g., Dallas-Fort Worth"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  className="input w-full"
                  placeholder="e.g., 75001"
                  maxLength={5}
                />
              </div>
            </div>
          </div>

          {/* Photos */}
          <div className="bg-white rounded-2xl border border-purple-100 shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Photos</h2>
            
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
          <div className="bg-white rounded-2xl border border-purple-100 shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Privacy</h2>
            
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 border">
                <input
                  type="radio"
                  value="public"
                  checked={visibility === "public"}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">Public</div>
                  <div className="text-sm text-gray-600">Anyone can view and join</div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 border">
                <input
                  type="radio"
                  value="private"
                  checked={visibility === "private"}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">Private</div>
                  <div className="text-sm text-gray-600">Requires approval to join</div>
                </div>
              </label>
            </div>
          </div>

          {/* Guidelines */}
          <div className="bg-white rounded-2xl border border-purple-100 shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Community Guidelines</h2>
            
            <textarea
              value={guidelines}
              onChange={(e) => setGuidelines(e.target.value)}
              className="input w-full"
              rows={6}
              placeholder="Community rules and guidelines..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push(`/communities/${communityId}`)}
              className="btn flex-1"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-brand flex-1"
              disabled={saving || !title.trim()}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
