// components/PostComposer.tsx - UPDATED: Compact Collapsible Design
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

const PRIVACY_OPTIONS = [
  { value: "private", label: "Only Me", icon: "🔒", description: "Only appears on your profile" },
  { value: "friends", label: "Friends", icon: "👥", description: "Visible to your friends" },
  { value: "public", label: "Everyone", icon: "🌍", description: "Visible to all users" },
] as const;

export default function PostComposer({ onPostCreated, className = "" }: PostComposerProps) {
  const [body, setBody] = useState("");
  const [privacy, setPrivacy] = useState<Post["privacy"]>("friends");
  const [allowShare, setAllowShare] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<MediaUpload[]>([]);
  const [showCoCreators, setShowCoCreators] = useState(false);
  const [showTaggedFriends, setShowTaggedFriends] = useState(false);
  const [coCreators, setCoCreators] = useState<string[]>([]);
  const [taggedFriends, setTaggedFriends] = useState<string[]>([]);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [showPrivacyOptions, setShowPrivacyOptions] = useState(false);
  
  // NEW: Collapsed/Expanded state
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string>('/default-avatar.png');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get current user avatar
  useEffect(() => {
    const getUserAvatar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();
        
        if (profile?.avatar_url) {
          setCurrentUserAvatar(profile.avatar_url);
        }
      }
    };
    getUserAvatar();
  }, []);

  // Auto-dismiss status messages
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && isExpanded) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [body, isExpanded]);

  // Focus textarea when expanded
  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isExpanded]);

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

      const result = await createPost(body.trim() || "Shared a moment", privacy, {
        allow_share: allowShare,
        co_creators: coCreators.length > 0 ? coCreators : null,
        tagged_users: taggedFriends.length > 0 ? taggedFriends : null,
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
      setUploadedMedia([]);
      setCoCreators([]);
      setTaggedFriends([]);
      setShowCoCreators(false);
      setShowTaggedFriends(false);
      setShowPrivacyOptions(false);
      setIsExpanded(false); // Collapse after posting
      setStatus({ type: 'success', message: 'Post shared successfully!' });
      
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

  const canPost = body.trim() || uploadedMedia.length > 0;
  const selectedPrivacy = PRIVACY_OPTIONS.find(opt => opt.value === privacy);

  // COLLAPSED VIEW
  if (!isExpanded) {
    return (
      <div className={`post-composer-collapsed ${className}`}>
        {/* Status Messages */}
        {status && (
          <div className={`status-message ${status.type}`}>
            <span className="status-icon">
              {status.type === 'success' ? '✅' : status.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            {status.message}
          </div>
        )}

        <div className="collapsed-card">
          {/* Click to expand */}
          <div 
            className="collapsed-input-area"
            onClick={() => setIsExpanded(true)}
          >
            <img 
              src={currentUserAvatar} 
              alt="Your avatar"
              className="collapsed-avatar"
            />
            <div className="collapsed-placeholder">
              Share with friends...
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="collapsed-actions">
            <button
              type="button"
              className="quick-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(true);
                setTimeout(() => fileInputRef.current?.click(), 100);
              }}
            >
              <span className="action-icon">📷</span>
              <span className="action-label">Photo/Video</span>
            </button>
            
            <button
              type="button"
              className="quick-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(true);
                setShowTaggedFriends(true);
              }}
            >
              <span className="action-icon">🏷️</span>
              <span className="action-label">Tag Friends</span>
            </button>
            
            <button
              type="button"
              className="quick-action-btn privacy-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(true);
                setShowPrivacyOptions(true);
              }}
            >
              <span className="action-icon">{selectedPrivacy?.icon}</span>
              <span className="action-label">{selectedPrivacy?.label}</span>
            </button>
          </div>
        </div>

        <style jsx>{`
          .post-composer-collapsed {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
          }

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

          .collapsed-card {
            background: white;
            border-radius: 1rem;
            padding: 1rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border: 1px solid rgba(139,92,246,0.1);
          }

          .collapsed-input-area {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem;
            background: #f9fafb;
            border-radius: 2rem;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-bottom: 0.75rem;
            -webkit-tap-highlight-color: rgba(139, 92, 246, 0.1);
            touch-action: manipulation;
          }

          .collapsed-input-area:hover {
            background: #f3f4f6;
            box-shadow: 0 0 0 2px rgba(139,92,246,0.1);
          }

          .collapsed-input-area:active {
            transform: scale(0.99);
          }

          .collapsed-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #f8fafc;
            flex-shrink: 0;
          }

          .collapsed-placeholder {
            flex: 1;
            color: #9ca3af;
            font-size: 15px;
            user-select: none;
          }

          .collapsed-actions {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.5rem;
          }

          .quick-action-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.75rem 0.5rem;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 14px;
            color: #374151;
            transition: all 0.2s ease;
            min-height: 44px;
            -webkit-tap-highlight-color: rgba(139, 92, 246, 0.1);
            touch-action: manipulation;
          }

          .quick-action-btn:hover {
            border-color: #8b5cf6;
            background: rgba(139,92,246,0.02);
            transform: translateY(-1px);
          }

          .quick-action-btn:active {
            transform: translateY(0);
          }

          .action-icon {
            font-size: 18px;
          }

          .action-label {
            font-weight: 500;
            white-space: nowrap;
          }

          /* Mobile Responsiveness */
          @media (max-width: 640px) {
            .collapsed-card {
              padding: 0.875rem;
            }

            .collapsed-input-area {
              padding: 0.625rem;
            }

            .collapsed-avatar {
              width: 36px;
              height: 36px;
            }

            .collapsed-placeholder {
              font-size: 14px;
            }

            .quick-action-btn {
              padding: 0.625rem 0.375rem;
              font-size: 13px;
            }

            .action-icon {
              font-size: 16px;
            }

            .action-label {
              font-size: 12px;
            }
          }

          @media (max-width: 480px) {
            .collapsed-actions {
              gap: 0.375rem;
            }

            .quick-action-btn {
              flex-direction: column;
              gap: 0.25rem;
              padding: 0.5rem 0.25rem;
            }

            .action-icon {
              font-size: 20px;
            }

            .action-label {
              font-size: 10px;
            }
          }
        `}</style>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleMediaSelect}
          style={{ display: 'none' }}
          disabled={uploadingMedia}
        />
      </div>
    );
  }

  // EXPANDED VIEW (Original Full Composer - ALL FEATURES PRESERVED)
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
        {/* Header with Close Button */}
        <div className="composer-header">
          <h3>Create Post</h3>
          <button 
            className="close-btn"
            onClick={() => {
              if (body.trim() || uploadedMedia.length > 0) {
                if (confirm("Discard this post?")) {
                  setIsExpanded(false);
                  setBody("");
                  setUploadedMedia([]);
                  setCoCreators([]);
                  setTaggedFriends([]);
                  setShowCoCreators(false);
                  setShowTaggedFriends(false);
                  setShowPrivacyOptions(false);
                }
              } else {
                setIsExpanded(false);
              }
            }}
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Main Text Input */}
        <div className="text-section">
          <div className="user-info">
            <img 
              src={currentUserAvatar} 
              alt="Your avatar"
              className="user-avatar"
            />
            <div className="privacy-display">
              <span className="privacy-badge">
                <span className="privacy-icon">{selectedPrivacy?.icon}</span>
                {selectedPrivacy?.label}
              </span>
            </div>
          </div>
          
          <textarea
            ref={textareaRef}
            className="main-textarea"
            placeholder="Share with friends..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1000}
            rows={3}
          />
          <div className="char-count">{body.length}/1000</div>
        </div>

        {/* Media Preview Grid */}
        {uploadedMedia.length > 0 && (
          <div className="media-preview">
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
            {uploadingMedia && (
              <div className="uploading-indicator">
                <div className="upload-spinner"></div>
                <span>Uploading files...</span>
              </div>
            )}
          </div>
        )}

        {/* Co-creators Section */}
        {showCoCreators && (
          <div className="collaborators-section">
            <div className="section-header">
              <h4>Add Co-creators</h4>
              <button 
                className="section-close"
                onClick={() => {
                  setShowCoCreators(false);
                  setCoCreators([]);
                }}
                type="button"
              >
                ✕
              </button>
            </div>
            <p className="section-description">Co-creators can add their own photos and videos to this post!</p>
            <SimpleFriendDropdown
              value={coCreators}
              onChange={setCoCreators}
            />
            {coCreators.length > 0 && (
              <button
                type="button"
                onClick={() => setCoCreators([])}
                className="clear-btn"
              >
                Clear selections
              </button>
            )}
          </div>
        )}

        {/* Tagged Friends Section */}
        {showTaggedFriends && (
          <div className="collaborators-section">
            <div className="section-header">
              <h4>Tag Friends</h4>
              <button 
                className="section-close"
                onClick={() => {
                  setShowTaggedFriends(false);
                  setTaggedFriends([]);
                }}
                type="button"
              >
                ✕
              </button>
            </div>
            <p className="section-description">Tagged friends will be notified and see this post on their feed.</p>
            <SimpleFriendDropdown
              value={taggedFriends}
              onChange={setTaggedFriends}
            />
            {taggedFriends.length > 0 && (
              <button
                type="button"
                onClick={() => setTaggedFriends([])}
                className="clear-btn"
              >
                Clear selections
              </button>
            )}
          </div>
        )}

        {/* Privacy Options */}
        {showPrivacyOptions && (
          <div className="privacy-section">
            <div className="section-header">
              <h4>Who can see this post?</h4>
              <button 
                className="section-close"
                onClick={() => setShowPrivacyOptions(false)}
                type="button"
              >
                ✕
              </button>
            </div>
            <div className="privacy-options">
              {PRIVACY_OPTIONS.map(option => (
                <label key={option.value} className="privacy-option">
                  <input
                    type="radio"
                    name="privacy"
                    value={option.value}
                    checked={privacy === option.value}
                    onChange={(e) => setPrivacy(e.target.value as Post["privacy"])}
                  />
                  <div className="option-content">
                    <div className="option-label">
                      <span className="option-icon">{option.icon}</span>
                      {option.label}
                    </div>
                    <div className="option-description">{option.description}</div>
                  </div>
                </label>
              ))}
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
        )}

        {/* Action Bar */}
        <div className="action-bar">
          <div className="action-buttons">
            <button
              type="button"
              className="action-btn media-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingMedia}
            >
              <span>📷</span>
              Photos & Videos
              {uploadedMedia.length > 0 && (
                <span className="count-badge">{uploadedMedia.length}</span>
              )}
            </button>
            
            <button
              type="button"
              className="action-btn collaborators-btn"
              onClick={() => setShowCoCreators(!showCoCreators)}
            >
              <span>👥</span>
              Co-creators
              {coCreators.length > 0 && (
                <span className="count-badge">{coCreators.length}</span>
              )}
            </button>

            <button
              type="button"
              className="action-btn tag-btn"
              onClick={() => setShowTaggedFriends(!showTaggedFriends)}
            >
              <span>🏷️</span>
              Tag Friends
              {taggedFriends.length > 0 && (
                <span className="count-badge">{taggedFriends.length}</span>
              )}
            </button>
            
            <button
              type="button"
              className="action-btn privacy-btn"
              onClick={() => setShowPrivacyOptions(!showPrivacyOptions)}
            >
              <span className="privacy-icon">{selectedPrivacy?.icon}</span>
              {selectedPrivacy?.label}
            </button>
          </div>

          <button 
            className="post-btn"
            onClick={post} 
            disabled={saving || uploadingMedia || !canPost}
          >
            {saving ? (
              <>
                <span className="btn-spinner">⏳</span>
                Sharing...
              </>
            ) : (
              'Share'
            )}
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleMediaSelect}
          className="file-input"
          disabled={uploadingMedia}
        />
      </div>

      <style jsx>{`
        .post-composer {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          animation: expandIn 0.3s ease-out;
        }

        @keyframes expandIn {
          from { 
            opacity: 0;
            transform: scale(0.95);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }

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

        .composer-card {
          background: white;
          border-radius: 1rem;
          padding: 0;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          border: 1px solid rgba(139,92,246,0.2);
          overflow: hidden;
        }

        .composer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #f3f4f6;
          background: #fafafa;
        }

        .composer-header h3 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 700;
          color: #1a202c;
        }

        .close-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #f3f4f6;
          border: none;
          cursor: pointer;
          font-size: 18px;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          -webkit-tap-highlight-color: rgba(139, 92, 246, 0.1);
          touch-action: manipulation;
        }

        .close-btn:hover {
          background: #e5e7eb;
          color: #374151;
          transform: scale(1.05);
        }

        .close-btn:active {
          transform: scale(0.95);
        }

        .text-section {
          padding: 1.5rem 1.5rem 1rem;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .user-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #f8fafc;
        }

        .privacy-display {
          flex: 1;
        }

        .privacy-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          background: #f3f4f6;
          border-radius: 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          color
