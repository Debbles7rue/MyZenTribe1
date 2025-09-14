// components/HomeFeed.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { createPost, listHomeFeed, Post, uploadMedia, me } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import SOSFloatingButton from "@/components/SOSFloatingButton";
import SimpleFriendDropdown from "@/components/SimpleFriendDropdown";

type MediaUpload = {
  url: string;
  type: 'image' | 'video';
  preview: string;
};

export default function HomeFeed() {
  const [rows, setRows] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [privacy, setPrivacy] = useState<Post["privacy"]>("friends");
  const [allowShare, setAllowShare] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<MediaUpload[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCoCreators, setShowCoCreators] = useState(false);
  const [coCreators, setCoCreators] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Meditation-themed emojis
  const zenEmojis = ['🧘', '🙏', '✨', '💜', '🌸', '☮️', '🕉️', '💫', '🌟', '🤲', '🧘‍♀️', '🧘‍♂️', '🌺', '🍃', '🌿'];

  async function load() {
    setLoading(true);
    
    // Get current user ID
    const userId = await me();
    setCurrentUserId(userId);
    
    const { rows, error } = await listHomeFeed();
    if (error) {
      console.error("Error loading posts:", error);
    }
    setRows(rows);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingMedia(true);
    const newMedia: MediaUpload[] = [];

    // Process all selected files
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      
      // Upload to Supabase
      const { url: uploadedUrl, error } = await uploadMedia(file, type);
      
      if (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        alert(`Failed to upload ${file.name}. ${error}`);
        continue;
      }

      if (uploadedUrl) {
        newMedia.push({
          url: uploadedUrl,
          type,
          preview: previewUrl
        });
      }
    }

    // Add all successfully uploaded media to state
    setUploadedMedia([...uploadedMedia, ...newMedia]);
    setUploadingMedia(false);
    
    // Clear the file input
    if (e.target) {
      e.target.value = '';
    }
  }

  async function post() {
    if (!body.trim() && uploadedMedia.length === 0) {
      alert("Please add some text or media to your post");
      return;
    }
    
    setSaving(true);
    
    try {
      // Prepare media arrays
      const mediaItems = uploadedMedia.map(m => ({
        url: m.url,
        type: m.type
      }));

      const result = await createPost(body.trim() || "Shared a moment", privacy, {
        allow_share: allowShare,
        co_creators: coCreators.length > 0 ? coCreators : null,
        media: mediaItems  // Pass all media as an array
      });
      
      if (!result.ok) {
        console.error("Post error:", result.error);
        alert(`Unable to post: ${result.error || 'Unknown error'}`);
        setSaving(false);
        return;
      }
      
      // Reset form
      setBody("");
      setUploadedMedia([]);
      setCoCreators([]);
      setShowCoCreators(false);
      setSaving(false);
      
      // Clean up preview URLs
      uploadedMedia.forEach(m => {
        if (m.preview.startsWith('blob:')) {
          URL.revokeObjectURL(m.preview);
        }
      });
      
      await load();
    } catch (error) {
      console.error("Error posting:", error);
      alert("Failed to create post. Please try again.");
      setSaving(false);
    }
  }

  function removeMedia(index: number) {
    const media = uploadedMedia[index];
    if (media.preview.startsWith('blob:')) {
      URL.revokeObjectURL(media.preview);
    }
    setUploadedMedia(uploadedMedia.filter((_, i) => i !== index));
  }

  function insertEmoji(emoji: string) {
    setBody(body + emoji);
    setShowEmojiPicker(false);
  }

  return (
    <>
      {/* Main Content Area - Added padding bottom for fixed nav and SOS button */}
      <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-32">
        {/* Community Guidelines Disclaimer */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mb-5 border border-purple-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🕊️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-purple-900 mb-1">Welcome to Your Peaceful Space</h3>
              <p className="text-sm text-purple-700">
                This is a sanctuary free from political discourse and divisive content. 
                We're bombarded with terrible news everywhere else—here we celebrate only good news and positive moments. 
                Share your joy, gratitude, and uplifting experiences with your tribe. 💜
              </p>
            </div>
          </div>
        </div>

        {/* Enhanced Composer - Mobile Optimized */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-5">
          {/* Mood Check-in */}
          <div className="mb-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">How are you feeling today?</p>
            <div className="flex gap-2 flex-wrap">
              {['😌 Peaceful', '😊 Grateful', '💪 Energized', '😔 Struggling', '🤗 Loved'].map(mood => (
                <button
                  key={mood}
                  className="px-3 py-1 bg-white rounded-full text-sm hover:bg-purple-100 transition-colors"
                  onClick={() => setBody(`Feeling ${mood} today. ${body}`)}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <textarea
              className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base pr-12"
              rows={3}
              placeholder="Share your journey, gratitude, or intention..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <button
              className="absolute right-2 top-2 text-2xl hover:scale-110 transition-transform"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              🧘
            </button>
            
            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute right-0 top-12 bg-white border rounded-lg shadow-lg p-3 z-10">
                <div className="grid grid-cols-5 gap-2">
                  {zenEmojis.map(emoji => (
                    <button
                      key={emoji}
                      className="text-2xl hover:bg-purple-100 rounded p-1 transition-colors"
                      onClick={() => insertEmoji(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Media Preview Grid */}
          {uploadedMedia.length > 0 && (
            <div className="mt-3">
              <div className={`grid gap-2 ${
                uploadedMedia.length === 1 ? 'grid-cols-1' : 
                uploadedMedia.length === 2 ? 'grid-cols-2' : 
                'grid-cols-3'
              }`}>
                {uploadedMedia.map((media, index) => (
                  <div key={index} className="relative rounded-lg overflow-hidden bg-gray-100">
                    {media.type === 'image' ? (
                      <img 
                        src={media.preview} 
                        alt={`Upload ${index + 1}`} 
                        className="w-full h-32 object-cover"
                      />
                    ) : (
                      <video 
                        src={media.preview} 
                        className="w-full h-32 object-cover"
                      />
                    )}
                    <button
                      onClick={() => removeMedia(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              {uploadingMedia && (
                <div className="mt-2 text-sm text-gray-500">
                  Uploading media...
                </div>
              )}
            </div>
          )}
          
          {/* Media Upload Section */}
          <div className="mt-3 flex flex-wrap items-center gap-2 pb-3 border-b border-gray-100">
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-lg transition-all"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingMedia}
            >
              📷 Photos {uploadedMedia.filter(m => m.type === 'image').length > 0 && 
                `(${uploadedMedia.filter(m => m.type === 'image').length})`}
            </button>
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 rounded-lg transition-all"
              onClick={() => videoInputRef.current?.click()}
              disabled={uploadingMedia}
            >
              🎥 Videos {uploadedMedia.filter(m => m.type === 'video').length > 0 && 
                `(${uploadedMedia.filter(m => m.type === 'video').length})`}
            </button>
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gradient-to-r from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100 rounded-lg transition-all"
              onClick={() => setShowCoCreators(!showCoCreators)}
            >
              👥 Co-creators {coCreators.length > 0 && `(${coCreators.length})`}
            </button>
            
            {/* Hidden file inputs with multiple attribute */}
            <input
              ref={fileInputRef}
              id="photo-upload"
              type="file"
              multiple
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleMediaSelect(e, 'image')}
            />
            <input
              ref={videoInputRef}
              id="video-upload"
              type="file"
              multiple
              accept="video/*"
              style={{ display: 'none' }}
              onChange={(e) => handleMediaSelect(e, 'video')}
            />
          </div>

          {/* Co-creators Section */}
          {showCoCreators && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                <strong>👥 Add Co-creators:</strong> They'll be notified and can add their own photos & videos!
              </p>
              <SimpleFriendDropdown
                value={coCreators}
                onChange={setCoCreators}
              />
              {coCreators.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCoCreators([]);
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-700 hover:underline"
                >
                  Clear all selections
                </button>
              )}
            </div>
          )}
          
          {/* Post Options */}
          <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select 
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base"
              value={privacy} 
              onChange={(e) => setPrivacy(e.target.value as any)}
            >
              <option value="friends">🤝 Friends Only</option>
              <option value="public">🌍 Everyone</option>
              <option value="private">🔒 Only Me</option>
            </select>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowShare}
                onChange={(e) => setAllowShare(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <span className="text-sm">Allow others to share</span>
            </label>
            
            <button 
              className="sm:ml-auto px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 text-base min-h-[44px] hover:scale-105 active:scale-95"
              onClick={post} 
              disabled={saving || uploadingMedia || (!body.trim() && uploadedMedia.length === 0)}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span> Posting…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  ✨ Post
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Daily Intention Card */}
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4 mb-5">
          <h3 className="font-semibold text-purple-800 mb-2">✨ Daily Intention</h3>
          <p className="text-purple-700 text-sm italic">"Today I choose peace, presence, and compassion."</p>
          <button className="mt-2 text-xs text-purple-600 hover:underline">Set your intention →</button>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-3">
              <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              <span className="text-gray-500">Loading your tribe's moments...</span>
            </div>
          </div>
        ) : rows.length ? (
          <div className="space-y-4">
            {rows.map((p) => (
              <PostCard 
                key={p.id} 
                post={p} 
                onChanged={load}
                currentUserId={currentUserId || undefined}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-6xl mb-4">🧘</div>
            <div className="text-xl font-semibold text-gray-700">Your feed awaits</div>
            <div className="text-gray-500 mt-2">Share your first moment of mindfulness above.</div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Navigation Bar - Shows on both mobile and desktop */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
        <div className="max-w-2xl mx-auto px-4 py-2">
          <div className="grid grid-cols-4 gap-1">
            <a 
              href="/notifications" 
              className="group flex flex-col items-center justify-center py-2 px-1 text-center hover:bg-purple-50 rounded-lg transition-all relative"
            >
              <span className="text-xl mb-1 group-hover:scale-110 transition-transform">🔔</span>
              <span className="text-xs text-gray-600 group-hover:text-purple-700">Alerts</span>
            </a>
            <a 
              href="/contact" 
              className="group flex flex-col items-center justify-center py-2 px-1 text-center hover:bg-purple-50 rounded-lg transition-all"
            >
              <span className="text-xl mb-1 group-hover:scale-110 transition-transform">📧</span>
              <span className="text-xs text-gray-600 group-hover:text-purple-700">Contact</span>
            </a>
            <a 
              href="/suggestions" 
              className="group flex flex-col items-center justify-center py-2 px-1 text-center hover:bg-green-50 rounded-lg transition-all"
            >
              <span className="text-xl mb-1 group-hover:scale-110 transition-transform">💡</span>
              <span className="text-xs text-gray-600 group-hover:text-green-700">Suggest</span>
            </a>
            <a 
              href="/donate" 
              className="group flex flex-col items-center justify-center py-2 px-1 text-center hover:bg-blue-50 rounded-lg transition-all"
            >
              <span className="text-xl mb-1 group-hover:scale-110 transition-transform">💝</span>
              <span className="text-xs text-gray-600 group-hover:text-blue-700">Donate</span>
            </a>
          </div>
        </div>
        
        {/* Subtle gradient decoration */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300"></div>
      </div>

      <SOSFloatingButton />
    </>
  );
}
