// components/HomeFeed.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { createPost, listHomeFeed, Post, uploadMedia } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import SOSFloatingButton from "@/components/SOSFloatingButton";

export default function HomeFeed() {
  const [rows, setRows] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [privacy, setPrivacy] = useState<Post["privacy"]>("friends");
  const [allowShare, setAllowShare] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{ url: string; type: 'image' | 'video' | 'gif' } | null>(null);
  const [uploadedMedia, setUploadedMedia] = useState<{ url: string; type: 'image' | 'video' | 'gif' } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCoCreators, setShowCoCreators] = useState(false);
  const [coCreators, setCoCreators] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Meditation-themed emojis
  const zenEmojis = ['🧘', '🙏', '✨', '💜', '🌸', '☮️', '🕉️', '💫', '🌟', '🤲', '🧘‍♀️', '🧘‍♂️', '🌺', '🍃', '🌿'];

  async function load() {
    setLoading(true);
    const { rows, error } = await listHomeFeed();
    if (error) {
      console.error("Error loading posts:", error);
    }
    setRows(rows);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'gif') {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const url = URL.createObjectURL(file);
    setMediaPreview({ url, type });

    // Upload to Supabase
    setUploadingMedia(true);
    const { url: uploadedUrl, error } = await uploadMedia(file, type);
    setUploadingMedia(false);

    if (error) {
      alert(`Failed to upload ${type}. Please try again.`);
      setMediaPreview(null);
      return;
    }

    setUploadedMedia({ url: uploadedUrl!, type });
  }

  async function post() {
    if (!body.trim() && !uploadedMedia) return;
    setSaving(true);
    
    const options: any = {
      allow_share: allowShare,
      co_creators: coCreators.length > 0 ? coCreators : null,
    };

    if (uploadedMedia) {
      if (uploadedMedia.type === 'image') {
        options.image_url = uploadedMedia.url;
        options.media_type = 'image';
      } else if (uploadedMedia.type === 'video') {
        options.video_url = uploadedMedia.url;
        options.media_type = 'video';
      } else if (uploadedMedia.type === 'gif') {
        options.gif_url = uploadedMedia.url;
        options.media_type = 'gif';
      }
    }

    const result = await createPost(body.trim() || "Shared a moment", privacy, options);
    
    if (!result.ok) {
      alert("Unable to post right now. Please try again.");
      setSaving(false);
      return;
    }
    
    // Reset form
    setBody("");
    setMediaPreview(null);
    setUploadedMedia(null);
    setCoCreators([]);
    setSaving(false);
    await load();
  }

  function removeMedia() {
    setMediaPreview(null);
    setUploadedMedia(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function insertEmoji(emoji: string) {
    setBody(body + emoji);
    setShowEmojiPicker(false);
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      {/* Stories/Moments Bar - Mobile Optimized */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mb-5 overflow-x-auto">
        <div className="flex gap-3 min-w-max">
          <button className="flex flex-col items-center gap-1 min-w-[60px]">
            <div className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-0.5">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <span className="text-2xl">+</span>
              </div>
            </div>
            <span className="text-xs">Your Story</span>
          </button>
          {/* Placeholder for actual stories */}
          {[1,2,3,4,5].map(i => (
            <button key={i} className="flex flex-col items-center gap-1 min-w-[60px]">
              <div className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-0.5">
                <div className="w-full h-full rounded-full bg-gray-200"></div>
              </div>
              <span className="text-xs">User {i}</span>
            </button>
          ))}
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
        
        {/* Media Preview */}
        {mediaPreview && (
          <div className="mt-3 relative">
            <button
              onClick={removeMedia}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 z-10"
            >
              ×
            </button>
            {mediaPreview.type === 'image' && (
              <img src={mediaPreview.url} alt="Preview" className="w-full rounded-lg max-h-64 object-cover" />
            )}
            {mediaPreview.type === 'video' && (
              <video src={mediaPreview.url} controls className="w-full rounded-lg max-h-64" />
            )}
            {mediaPreview.type === 'gif' && (
              <img src={mediaPreview.url} alt="GIF Preview" className="w-full rounded-lg max-h-64 object-contain" />
            )}
            {uploadingMedia && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                <div className="text-white">Uploading...</div>
              </div>
            )}
          </div>
        )}
        
        {/* Enhanced Media Upload Section */}
        <div className="mt-3 flex flex-wrap items-center gap-2 pb-3 border-b border-gray-100">
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-lg transition-all"
            onClick={() => document.getElementById('photo-upload')?.click()}
            disabled={uploadingMedia}
          >
            📷 Photo
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 rounded-lg transition-all"
            onClick={() => document.getElementById('video-upload')?.click()}
            disabled={uploadingMedia}
          >
            🎥 Video
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gradient-to-r from-green-50 to-yellow-50 hover:from-green-100 hover:to-yellow-100 rounded-lg transition-all"
            onClick={() => document.getElementById('gif-upload')?.click()}
            disabled={uploadingMedia}
          >
            ✨ GIF
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gradient-to-r from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100 rounded-lg transition-all"
            onClick={() => setShowCoCreators(!showCoCreators)}
          >
            👥 Co-creators
          </button>
          
          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            id="photo-upload"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleMediaSelect(e, 'image')}
          />
          <input
            id="video-upload"
            type="file"
            accept="video/*"
            style={{ display: 'none' }}
            onChange={(e) => handleMediaSelect(e, 'video')}
          />
          <input
            id="gif-upload"
            type="file"
            accept="image/gif"
            style={{ display: 'none' }}
            onChange={(e) => handleMediaSelect(e, 'gif')}
          />
        </div>

        {/* Co-creators Section */}
        {showCoCreators && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Add co-creators (enter user IDs, separated by commas):</p>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              placeholder="user-id-1, user-id-2"
              value={coCreators.join(', ')}
              onChange={(e) => setCoCreators(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            />
          </div>
        )}
        
        {/* Post Options */}
        <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select 
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base"
            value={privacy} 
            onChange={(e) => setPrivacy(e.target.value as any)}
          >
            <option value="friends">🤝 Friends</option>
            <option value="public">🌍 Public</option>
            <option value="private">🔒 Only me</option>
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
            disabled={saving || uploadingMedia || (!body.trim() && !uploadedMedia)}
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
            <PostCard key={p.id} post={p} onChanged={load} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-6xl mb-4">🧘</div>
          <div className="text-xl font-semibold text-gray-700">Your feed awaits</div>
          <div className="text-gray-500 mt-2">Share your first moment of mindfulness above.</div>
        </div>
      )}

      {/* Bottom Action Buttons - Enhanced */}
      <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 mb-20">
        <a 
          href="/contact" 
          className="group px-4 py-3 bg-white border-2 border-purple-200 text-purple-700 rounded-xl font-medium hover:bg-purple-50 hover:border-purple-300 transition-all text-center shadow-sm hover:shadow-md"
        >
          <span className="group-hover:scale-110 inline-block transition-transform">📧</span> Contact
        </a>
        <a 
          href="/suggestions" 
          className="group px-4 py-3 bg-white border-2 border-green-200 text-green-700 rounded-xl font-medium hover:bg-green-50 hover:border-green-300 transition-all text-center shadow-sm hover:shadow-md"
        >
          <span className="group-hover:scale-110 inline-block transition-transform">💡</span> Suggestions
        </a>
        <a 
          href="/donate" 
          className="group px-4 py-3 bg-white border-2 border-blue-200 text-blue-700 rounded-xl font-medium hover:bg-blue-50 hover:border-blue-300 transition-all text-center shadow-sm hover:shadow-md"
        >
          <span className="group-hover:scale-110 inline-block transition-transform">💝</span> Donations
        </a>
        <a 
          href="/safety" 
          className="group px-4 py-3 bg-white border-2 border-red-200 text-red-700 rounded-xl font-medium hover:bg-red-50 hover:border-red-300 transition-all text-center shadow-sm hover:shadow-md"
        >
          <span className="group-hover:scale-110 inline-block transition-transform">🆘</span> SOS Setup
        </a>
      </div>

      {/* Floating SOS Button */}
      <SOSFloatingButton />
    </div>
  );
}
