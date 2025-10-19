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
      const isValidSize = file.size <= 50 * 1024 * 1024;
      
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
        const previewUrl = URL.createObjectURL(file);
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}/post-${timestamp}-${i}.${fileExt}`;
        
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
      const mediaItems = uploadedMedia.map(m => ({
        url: m.storagePath,
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
      
      uploadedMedia.forEach(m => {
        if (m.preview.startsWith('blob:')) {
          URL.revokeObjectURL(m.preview);
        }
      });
      
      setBody("");
      setUploadedMedia([]);
      setCoCreators([]);
      setTaggedFriends([]);
      setShowCoCreators(false);
      setShowTaggedFriends(false);
      setShowPrivacyOptions(false);
      setIsExpanded(false);
      setStatus({ type: 'success', message: 'Post shared successfully!' });
      
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
        {status && (
          <div className={`status-message ${status.type}`}>
            <span className="status-icon">
              {status.type === 'success' ? '✅' : status.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            {status.message}
          </div>
        )}

        <div className="collapsed-card">
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

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleMediaSelect}
          style={{ display: 'none' }}
          disabled={uploadingMedia}
        />

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
      </div>
    );
  }

  // EXPANDED VIEW
  return (
    <div className={`post-composer ${className}`}>
      {status && (
        <div className={`status-message ${status.type}`}>
          <span className="status-icon">
            {status.type === 'success' ? '✅' : status.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          {status.message}
        </div>
      )}

      <div className="composer-card">
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
          color: #374151;
        }

        .main-textarea {
          width: 100%;
          padding: 0;
          border: none;
          font-size: 1.1rem;
          resize: none;
          font-family: inherit;
          background: transparent;
          min-height: 60px;
          overflow-y: hidden;
        }

        .main-textarea:focus {
          outline: none;
        }

        .main-textarea::placeholder {
          color: #9ca3af;
        }

        .char-count {
          text-align: right;
          font-size: 0.75rem;
          color: #9ca3af;
          margin-top: 0.5rem;
        }

        .media-preview {
          padding: 0 1.5rem 1rem;
        }

        .media-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .media-item {
          position: relative;
          aspect-ratio: 1;
          border-radius: 0.75rem;
          overflow: hidden;
          background: #f3f4f6;
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
          top: 0.375rem;
          right: 0.375rem;
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
          padding: 0.5rem;
          background: #f9fafb;
          border-radius: 0.5rem;
        }

        .upload-spinner {
          width: 1rem;
          height: 1rem;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .collaborators-section,
        .privacy-section {
          padding: 1rem 1.5rem;
          border-top: 1px solid #f3f4f6;
          background: #fafafa;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .section-header h4 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
        }

        .section-close {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #e5e7eb;
          border: none;
          cursor: pointer;
          font-size: 14px;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .section-close:hover {
          background: #d1d5db;
        }

        .section-description {
          margin: 0 0 1rem 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .clear-btn {
          background: none;
          border: none;
          color: #dc2626;
          cursor: pointer;
          font-size: 0.875rem;
          text-decoration: underline;
          margin-top: 0.75rem;
          min-height: 44px;
        }

        .privacy-options {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .privacy-option {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .privacy-option:hover {
          border-color: #8b5cf6;
          background: rgba(139,92,246,0.02);
        }

        .option-content {
          flex: 1;
        }

        .option-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.125rem;
        }

        .option-icon {
          font-size: 1rem;
        }

        .option-description {
          font-size: 0.75rem;
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

        .action-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-top: 1px solid #f3f4f6;
          background: #fafafa;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.75rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
          color: #374151;
          transition: all 0.2s;
          position: relative;
          min-height: 44px;
        }

        .action-btn:hover {
          border-color: #8b5cf6;
          background: rgba(139,92,246,0.02);
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .count-badge {
          background: #8b5cf6;
          color: white;
          font-size: 0.75rem;
          padding: 0.125rem 0.375rem;
          border-radius: 9999px;
          margin-left: 0.25rem;
          min-width: 1.25rem;
          text-align: center;
        }

        .privacy-icon {
          font-size: 1rem;
        }

        .post-btn {
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 80px;
          min-height: 48px;
          justify-content: center;
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

        .file-input {
          display: none;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .action-buttons {
            gap: 0.375rem;
          }

          .action-btn {
            font-size: 0.8125rem;
            padding: 0.4375rem 0.625rem;
          }

          .media-grid {
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          }

          .privacy-options {
            gap: 0.375rem;
          }

          .privacy-option {
            padding: 0.625rem;
          }

          .option-description {
            font-size: 0.6875rem;
          }

          .text-section {
            padding: 1.25rem 1.25rem 1rem;
          }

          .main-textarea {
            font-size: 16px;
          }
        }

        @media (max-width: 480px) {
          .action-buttons {
            width: 100%;
          }

          .action-btn {
            flex: 1;
            min-width: calc(50% - 0.25rem);
          }
        }
      `}</style>
    </div>
  );
}
