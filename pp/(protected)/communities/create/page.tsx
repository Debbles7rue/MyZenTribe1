// app/(protected)/communities/create/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const SUGGESTED_TAGS = [
  "Drum Circle", "Sound Bath", "Qi Gong", "Yoga", "Zen Tangle",
  "Meditation", "Wellness", "Healing", "Nature", "Art",
  "Music", "Dance", "Mindfulness", "Breathwork", "Energy Work",
  "Community Garden", "Book Club", "Walking Group", "Support Group",
  "Parenting", "Seniors", "Youth", "Women's Circle", "Men's Circle"
];

const REGIONS = [
  "North America", "South America", "Europe", "Asia", 
  "Africa", "Australia", "Middle East", "Online Only"
];

const SUGGESTED_TOPICS = [
  "Give advice, take advice",
  "How to start a Drum Circle?",
  "Monthly wellness challenges",
  "Local event planning",
  "Resource sharing",
  "Success stories",
  "Questions & Support",
  "Introductions",
  "General Discussion"
];

export default function CreateCommunityPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState(1);

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [rules, setRules] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [initialTopics, setInitialTopics] = useState<string[]>([]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else if (selectedTags.length < 5) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const toggleTopic = (topic: string) => {
    if (initialTopics.includes(topic)) {
      setInitialTopics(initialTopics.filter(t => t !== topic));
    } else {
      setInitialTopics([...initialTopics, topic]);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return name.trim().length >= 3 && description.trim().length >= 10;
      case 2:
        return region !== "" && selectedTags.length > 0;
      case 3:
        return true; // Rules and welcome message are optional
      default:
        return false;
    }
  };

  async function createCommunity() {
    setCreating(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Please sign in to create a community");
        return;
      }

      // Create the community
      const { data: community, error: communityError } = await supabase
        .from("communities")
        .insert({
          name: name.trim(),
          description: description.trim(),
          is_private: isPrivate,
          region: region,
          city: city.trim() || null,
          tags: selectedTags,
          rules: rules.trim() || null,
          welcome_message: welcomeMessage.trim() || null,
          creator_id: user.id
        })
        .select()
        .single();

      if (communityError) throw communityError;

      // Add creator as owner
      const { error: memberError } = await supabase
        .from("community_members")
        .insert({
          community_id: community.id,
          user_id: user.id,
          role: "owner"
        });

      if (memberError) throw memberError;

      // Create initial discussion topics
      if (initialTopics.length > 0) {
        const topicsToCreate = initialTopics.map((topic, index) => ({
          community_id: community.id,
          title: topic,
          sort_order: index,
          is_locked: false
        }));

        await supabase.from("community_topics").insert(topicsToCreate);
      }

      // Create welcome announcement if provided
      if (welcomeMessage.trim()) {
        await supabase.from("community_announcements").insert({
          community_id: community.id,
          title: "Welcome to " + name,
          body: welcomeMessage,
          created_by: user.id,
          is_pinned: true
        });
      }

      // Redirect to the new community
      router.push(`/communities/${community.id}`);
    } catch (error) {
      console.error("Error creating community:", error);
      alert("Failed to create community. Please try again.");
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="container-app py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/communities"
            className="text-purple-600 hover:text-purple-700 mb-4 inline-block"
          >
            ← Back to Communities
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Create Your Community
          </h1>
          <p className="text-gray-600 mt-2">
            Build a space for your local area or shared interest
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-semibold
                  ${step >= s 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-200 text-gray-500'}
                `}
              >
                {s}
              </div>
              {s < 3 && (
                <div className={`
                  flex-1 h-1 mx-2
                  ${step > s ? 'bg-purple-600' : 'bg-gray-200'}
                `} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Community Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Dallas Meditation Circle, Brooklyn Drum Collective"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  maxLength={50}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {name.length}/50 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is your community about? Who should join?"
                  rows={4}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {description.length}/500 characters
                </p>
              </div>

              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="font-medium">Make this a private community</span>
                    <p className="text-sm text-gray-500">
                      Private communities require approval to join. Content is hidden from non-members.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Step 2: Location & Tags */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Location & Categories</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Region *
                  </label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select a region</option>
                    {REGIONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City/Area (Optional)
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g., Dallas, Brooklyn, Online"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categories/Tags * (Choose up to 5)
                </label>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`
                        px-3 py-1 rounded-full text-sm transition
                        ${selectedTags.includes(tag)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                        ${!selectedTags.includes(tag) && selectedTags.length >= 5
                          ? 'opacity-50 cursor-not-allowed'
                          : ''}
                      `}
                      disabled={!selectedTags.includes(tag) && selectedTags.length >= 5}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Selected: {selectedTags.length}/5 tags
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Rules & Setup */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Community Setup</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Community Rules (Optional)
                </label>
                <textarea
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  placeholder="What are the ground rules for your community? (e.g., Be kind, No spam, Respect all beliefs)"
                  rows={4}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Welcome Message (Optional)
                </label>
                <textarea
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  placeholder="A message to welcome new members to your community"
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Initial Discussion Topics (Optional)
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Create some topics to get discussions started
                </p>
                <div className="space-y-2">
                  {SUGGESTED_TOPICS.map(topic => (
                    <label
                      key={topic}
                      className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={initialTopics.includes(topic)}
                        onChange={() => toggleTopic(topic)}
                        className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm">{topic}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-semibold text-purple-900 mb-2">Community Preview</h3>
                <div className="text-sm space-y-1">
                  <p><strong>Name:</strong> {name}</p>
                  <p><strong>Type:</strong> {isPrivate ? "Private" : "Public"}</p>
                  <p><strong>Location:</strong> {city ? `${city}, ${region}` : region}</p>
                  <p><strong>Tags:</strong> {selectedTags.join(", ")}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-6 py-2 text-purple-600 hover:text-purple-700"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={createCommunity}
              disabled={creating || !canProceed()}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {creating ? "Creating..." : "Create Community"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
