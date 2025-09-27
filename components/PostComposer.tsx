// components/PostComposer.tsx - Enhanced with PhotosFeed features
"use client";

import { useState, useRef, useEffect } from "react";
import { createPost, Post } from "@/lib/posts";
import SimpleFriendDropdown from "@/components/SimpleFriendDropdown";
import { supabase } from "@/lib/supabaseClient";

type MediaUpload = {
  url: string;
  type: 'image' | 'video';
  preview: string;
  storagePath: string;
  filename: string;
};

interface PostComposerProps {
  onPostCreated?: () => void;
  className?: string;
}

type StatusMessage = {
  type: 'success' | 'error' | 'info';
  message: string;
};

const VISIBILITY_OPTIONS = [
  { value: "private", label: "🔒 Only Me", description: "Only appears on your profile" },
  { value: "friends", label: "🤝 Friends", description: "Shows in friends' feeds" },
  { value: "public", label: "🌍 Everyone", description: "Visible to all users" },
] as const;

export default function PostComposer({ onPostCreated, className = "" }: PostComposerProps) {
  const [body, setBody] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<Post["privacy"]>("friends");
  const [allowShare, setAllowShare] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<MediaUpload[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCoCreators, setShowCoCreators] = useState(false);
  const [coCreators, setCoCreators] = useState<string[]>([]);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-dismiss status messages
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Meditation-themed emojis
  const zenEmojis = ['🧘', '🙏', '✨', '💜', '🌸', '☮️', '🕉️', '💫', '🌟', '🤲', '🧘‍♀️', '🧘‍♂️', '🌺', '🍃', '🌿'];

  async function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate files
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit
      
      if (!isImage && !isVideo) {
        setStatus({ type: 'error', message: `${file.name}: Please select images or videos only` });
        return false;
      }
      
      if (!isValidSize) {
        setStatus({ type: 'error', message: `${file.name} is too large (max 50MB)` });
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) return;

    // Check total file limit
    const totalFiles = uploadedMedia.length + validFiles.length;
    if (totalFiles > 10) {
      setStatus({ type: 'error', message: 'Maximum 10 files per post' });
      return;
    }

    setUploadingMedia(true);
    setStatus({ type: 'info', message: `Uploading ${validFiles.length} file${validFiles.length > 1 ? 's' : ''}...` });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus({ type: 'error', message: "You must be logged in to upload media" });
        setUploadingMedia(false);
        return;
      }

      const timestamp = Date.now();
      const newMedia: MediaUpload[] = [];
      
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        
        // Create unique filename
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}/post-${timestamp}-${i}.${fileExt}`;
        
        // Upload to post-media bucket
        const { data, error } = await supabase.storage
          .from('post-media')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });
        
        if (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          setStatus({ type: 'error', message: `Failed to upload ${file.name}: ${error.message}` });
          URL.revokeObjectURL(previewUrl);
          continue;
        }

        if (data) {
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('post-media')
            .getPublicUrl(fileName);
          
          newMedia.push({
            url: publicUrl,
            type: file.type.startsWith('video/') ? 'video' : 'image',
            preview: previewUrl,
            storagePath: fileName,
            filename: file.name
          });
        }
      }

      setUploadedMedia(prev => [...prev, ...newMedia]);
      setStatus({ type: 'success', message: `Successfully uploaded ${newMedia.length} file${newMedia.length > 1 ? 's' : ''}` });
    } catch (error) {
      console.error("Error in handleMediaSelect:", error);
      setStatus({ type: 'error', message: "Failed to upload files. Please try again." });
    } finally {
      setUploadingMedia(false);
      if (e.target) e.target.value = '';
    }
  }

  function removeMedia(index: number) {
    const media = uploadedMedia[index];
    if (media.preview.startsWith('blob:')) {
      URL.revokeObjectURL(media.preview);
    }
    setUploadedMedia(prev => prev.filter((_, i) => i !== index));
  }

  function clearAllMedia() {
    uploadedMedia.forEach(media => {
      if (media.preview.startsWith('blob:')) {
        URL.revokeObjectURL(media.preview);
      }
    });
    setUploadedMedia([]);
  }

  async function post() {
    if (!body.trim() && uploadedMedia.length === 0) {
      setStatus({ type: 'error', message: "Please add some text or media to your post" });
      return;
    }
    
    setSaving(true);
    setStatus({ type: 'info', message: 'Creating your post...' });
    
    try {
      // Prepare media array
      const mediaItems = uploadedMedia.map(m => ({
        url: m.storagePath,  // Use storage path for database
        type: m.type
      }));

      // Create post with enhanced description
      const postBody = body.trim() || "Shared a moment";
      const fullDescription = description.trim() ? `${postBody}\n\n${description.trim()}` : postBody;

      const result = await createPost(fullDescription, privacy, {
        allow_share: allowShare,
        co_creators: coCreators.length > 0 ? coCreators : null,
        media: mediaItems.length > 0 ? mediaItems : undefined
      });
      
      if (!result.ok) {
        setStatus({ type: 'error', message: result.error || 'Failed to create post' });
        setSaving(false);
        return;
      }
      
      // Clean up preview URLs
      uploadedMedia.forEach(m => {
        if (m.preview.startsWith('blob:')) {
          URL.revokeObjectURL(m.preview);
        }
      });
      
      // Reset form
      setBody("");
      setDescription("");
      setUploadedMedia([]);
      setCoCreators([]);
      setShowCoCreators(false);
      setStatus({ type: 'success', message: 'Post created successfully!' });
      
      // Call callback
      if (onPostCreated) {
        setTimeout(() => onPostCreated(), 500);
      }
    } catch (error) {
      console.error("Error posting:", error);
      setStatus({ type: 'error', message: "Failed to create post. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  function insertEmoji(emoji: string) {
    setBody(body + emoji);
    setShowEmojiPicker(false);
  }

  const canPost = body.trim() || uploadedMedia.length > 0;

  return (
    <div className={`post-composer ${className}`}>
      {/* Status Messages */}
      {status && (
        <div className={`status-message ${status.type}`}>
          <span className="status-icon">
            {status.type === 'success' ? '✅' : status.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          {status.message}
        </div>
      )}

      <div className="composer-card">
        <h3 className="composer-title">Share Your Journey</h3>
        
        {/* Mood Check-in */}
        <div className="mood-section">
          <p className="mood-prompt">How are you feeling today?</p>
          <div className="mood-buttons">
            {['😌 Peaceful', '😊 Grateful', '💪 Energized', '😔 Struggling', '🤗 Loved'].map(mood => (
              <button
                key={mood}
                className="mood-btn"
                onClick={() => setBody(`Feeling ${mood} today. ${body}`)}
              >
                {mood}
              </button>
            ))}
          </div>
        </div>

        {/* Main Text Input */}
        <div className="input-group">
          <label className="input-label">Share your thoughts</label>
          <div className="text-input-container">
            <textarea
              className="main-textarea"
              rows={3}
              placeholder="What's on your mind? Share your gratitude, intention, or moment..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
            />
            <button
              className="emoji-btn"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Add emoji"
            >
              🧘
            </button>
          </div>
          <div className="char-count">{body.length}/500</div>
          
          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="emoji-picker">
              <div className="emoji-grid">
                {zenEmojis.map(emoji => (
                  <button
                    key={emoji}
                    className="emoji-option"
                    onClick={() => insertEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Description Field */}
        <div className="input-group">
          <label className="input-label">Tell the full story (optional)</label>
          <textarea
            className="description-textarea"
            rows={2}
            placeholder="Add more details... Friends you tag can contribute to this story!"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
          />
          <div className="char-count">{description.length}/1000</div>
        </div>

        {/* Media Upload Section */}
        <div className="media-section">
          <label className="input-label">Photos & Videos</label>
          
          <div className="file-upload-area">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleMediaSelect}
              className="file-input"
              id="media-upload"
              disabled={uploadingMedia}
            />
            <label htmlFor="media-upload" className="file-upload-label">
              <span className="upload-icon">📁</span>
              <span className="upload-text">Choose photos & videos</span>
              <span className="upload-hint">Up to 10 files, 50MB each</span>
            </label>
          </div>

          {/* Media Preview Grid */}
          {uploadedMedia.length > 0 && (
            <div className="media-preview">
              <div className="media-header">
                <span className="media-count">Selected Files ({uploadedMedia.length}/10)</span>
                <button 
                  onClick={clearAllMedia}
                  className="clear-all-btn"
                  type="button"
                >
                  Clear All
                </button>
              </div>
              <div className="media-grid">
                {uploadedMedia.map((media, index) => (
                  <div key={index} className="media-item">
                    {media.type === 'image' ? (
                      <img 
                        src={media.preview} 
                        alt="Preview"
                        className="media-thumbnail"
                      />
                    ) : (
                      <div className="video-preview">
                        <span className="video-icon">🎥</span>
                        <span className="video-name">{media.filename}</span>
                      </div>
                    )}
                    <button 
                      onClick={() => removeMedia(index)}
                      className="remove-media-btn"
                      title="Remove file"
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploadingMedia && (
            <div className="uploading-indicator">
              <div className="upload-spinner"></div>
              <span>Uploading files...</span>
            </div>
          )}
        </div>

        {/* Co-creators Section */}
        <div className="collaborators-section">
          <button
            type="button"
            className="collaborators-toggle"
            onClick={() => setShowCoCreators(!showCoCreators)}
          >
            👥 Tag Friends for Collaboration {coCreators.length > 0 && `(${coCreators.length})`}
          </button>
          
          {showCoCreators && (
            <div className="collaborators-content">
              <p className="collaborators-help">
                Tagged friends can add their own photos and videos to this post!
              </p>
              <SimpleFriendDropdown
                value={coCreators}
                onChange={setCoCreators}
              />
              {coCreators.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCoCreators([])}
                  className="clear-collaborators-btn"
                >
                  Clear all selections
                </button>
              )}
            </div>
          )}
        </div>

        {/* Visibility & Options */}
        <div className="options-section">
          <div className="visibility-group">
            <label className="input-label">Who can see this?</label>
            <div className="visibility-options">
              {VISIBILITY_OPTIONS.map(option => (
                <label key={option.value} className="visibility-option">
                  <input
                    type="radio"
                    name="visibility"
                    value={option.value}
                    checked={privacy === option.value}
                    onChange={(e) => setPrivacy(e.target.value as Post["privacy"])}
                  />
                  <div className="option-content">
                    <div className="option-label">{option.label}</div>
                    <div className="option-description">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          
          <label className="share-option">
            <input
              type="checkbox"
              checked={allowShare}
              onChange={(e) => setAllowShare(e.target.checked)}
            />
            <span>Allow others to share this post</span>
          </label>
        </div>

        {/* Post Button */}
        <button 
          className="post-btn"
          onClick={post} 
          disabled={saving || uploadingMedia || !canPost}
        >
          {saving ? (
            <>
              <span className="btn-spinner">⏳</span>
              Creating...
            </>
          ) : (
            <>
              ✨ Share Post
            </>
          )}
        </button>
      </div>

      <style jsx>{`
        .post-composer {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
        }

        /* Status Messages */
        .status-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          margin-bottom: 1rem;
          font-weight: 500;
          animation: slideIn 0.3s ease-out;
        }

        .status-message.success {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .status-message.error {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .status-message.info {
          background: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        }

        @keyframes slideIn {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        /* Main Card */
        .composer-card {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          border: 1px solid rgba(139,92,246,0.1);
        }

        .composer-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 1.5rem 0;
        }

        /* Mood Section */
        .mood-section {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-radius: 0.75rem;
        }

        .mood-prompt {
          font-size: 0.875rem;
          color: #4b5563;
          margin: 0 0 0.75rem 0;
        }

        .mood-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .mood-btn {
          padding: 0.5rem 0.75rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 9999px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mood-btn:hover {
          background: #8b5cf6;
          color: white;
          border-color: #8b5cf6;
        }

        /* Input Groups */
        .input-group {
          margin-bottom: 1.5rem;
        }

        .input-label {
          display: block;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .text-input-container {
          position: relative;
        }

        .main-textarea,
        .description-textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 1rem;
          resize: vertical;
          font-family: inherit;
          transition: all 0.2s;
        }

        .main-textarea {
          padding-right: 3rem;
        }

        .main-textarea:focus,
        .description-textarea:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
        }

        .emoji-btn {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 0.375rem;
          transition: background 0.2s;
        }

        .emoji-btn:hover {
          background: rgba(139,92,246,0.1);
        }

        .char-count {
          text-align: right;
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }

        /* Emoji Picker */
        .emoji-picker {
          position: absolute;
          top: 100%;
          right: 0;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 0.75rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          z-index: 10;
        }

        .emoji-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0.25rem;
        }

        .emoji-option {
          background: none;
          border: none;
          font-size: 1.25rem;
          padding: 0.5rem;
          cursor: pointer;
          border-radius: 0.25rem;
          transition: background 0.2s;
        }

        .emoji-option:hover {
          background: #f3f4f6;
        }

        /* Media Section */
        .media-section {
          margin-bottom: 1.5rem;
        }

        .file-input {
          display: none;
        }

        .file-upload-area {
          margin-bottom: 1rem;
        }

        .file-upload-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          border: 2px dashed #d1d5db;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          background: #f9fafb;
        }

        .file-upload-label:hover {
          border-color: #8b5cf6;
          background: rgba(139,92,246,0.02);
        }

        .upload-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .upload-text {
          font-weight: 500;
          color: #374151;
        }

        .upload-hint {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }

        /* Media Preview */
        .media-preview {
          padding: 1rem;
          background: #f9fafb;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
        }

        .media-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }

        .media-count {
          font-weight: 500;
          color: #374151;
        }

        .clear-all-btn {
          background: none;
          border: none;
          color: #dc2626;
          cursor: pointer;
          font-size: 0.875rem;
          text-decoration: underline;
        }

        .media-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 0.75rem;
        }

        .media-item {
          position: relative;
          aspect-ratio: 1;
          border-radius: 0.5rem;
          overflow: hidden;
          background: white;
          border: 1px solid #e5e7eb;
        }

        .media-thumbnail {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .video-preview {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 0.5rem;
          text-align: center;
          background: #f3f4f6;
        }

        .video-icon {
          font-size: 1.5rem;
          margin-bottom: 0.25rem;
        }

        .video-name {
          font-size: 0.65rem;
          color: #6b7280;
          word-break: break-all;
          line-height: 1.2;
        }

        .remove-media-btn {
          position: absolute;
          top: 0.25rem;
          right: 0.25rem;
          width: 1.5rem;
          height: 1.5rem;
          background: rgba(0,0,0,0.7);
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .remove-media-btn:hover {
          background: #dc2626;
        }

        .uploading-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #6b7280;
          font-size: 0.875rem;
          margin-top: 0.5rem;
        }

        .upload-spinner {
          width: 1rem;
          height: 1rem;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* Collaborators Section */
        .collaborators-section {
          margin-bottom: 1.5rem;
        }

        .collaborators-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.75rem 1rem;
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border: 1px solid #f59e0b;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 500;
          color: #92400e;
          transition: all 0.2s;
        }

        .collaborators-toggle:hover {
          background: linear-gradient(135deg, #fde68a, #fcd34d);
        }

        .collaborators-content {
          margin-top: 1rem;
          padding: 1rem;
          background: #fffbeb;
          border-radius: 0.5rem;
          border: 1px solid #fde68a;
        }

        .collaborators-help {
          font-size: 0.875rem;
          color: #92400e;
          margin: 0 0 1rem 0;
        }

        .clear-collaborators-btn {
          background: none;
          border: none;
          color: #dc2626;
          cursor: pointer;
          font-size: 0.875rem;
          text-decoration: underline;
          margin-top: 0.5rem;
        }

        /* Options Section */
        .options-section {
          margin-bottom: 1.5rem;
        }

        .visibility-group {
          margin-bottom: 1rem;
        }

        .visibility-options {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .visibility-option {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .visibility-option:hover {
          border-color: #8b5cf6;
          background: rgba(139,92,246,0.02);
        }

        .visibility-option input[type="radio"] {
          margin-top: 0.125rem;
        }

        .option-content {
          flex: 1;
        }

        .option-label {
          font-weight: 500;
          margin-bottom: 0.25rem;
          color: #374151;
        }

        .option-description {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .share-option {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
          color: #374151;
        }

        /* Post Button */
        .post-btn {
          width: 100%;
          padding: 0.875rem;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .post-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139,92,246,0.3);
        }

        .post-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .btn-spinner {
          display: inline-block;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Mobile Responsiveness */
        @media (max-width: 640px) {
          .composer-card {
            padding: 1rem;
          }

          .mood-buttons {
            justify-content: center;
          }

          .media-grid {
            grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          }

          .visibility-options {
            gap: 0.5rem;
          }

          .visibility-option {
            padding: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
