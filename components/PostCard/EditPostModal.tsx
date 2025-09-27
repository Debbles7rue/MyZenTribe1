// components/PostCard/EditPostModal.tsx - Mobile-Optimized with ALL Features Preserved
"use client";

import { useState, useEffect, useRef } from "react";
import { Post, updatePost, addMediaToPost, uploadMedia } from "@/lib/posts";
import { supabase } from "@/lib/supabaseClient";
import SimpleFriendDropdown from "@/components/SimpleFriendDropdown";

interface EditPostModalProps {
  post: Post;
  currentMedia: Array<{url: string; type: 'image' | 'video'}>;
  onClose: () => void;
  onSave: () => void;
}

export default function EditPostModal({ 
  post, 
  currentMedia,
  onClose, 
  onSave 
}: EditPostModalProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'media' | 'people' | 'privacy'>('content');
  const [editBody, setEditBody] = useState(post.body || '');
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [coCreators, setCoCreators] = useState<string[]>(post.co_creators || []);
  const [taggedUsers, setTaggedUsers] = useState<string[]>(post.tagged_users || []);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [privacy, setPrivacy] = useState(post.privacy || 'friends');
  const [allowShare, setAllowShare] = useState(post.allow_share !== false);
  const [allowComments, setAllowComments] = useState(post.allow_comments !== false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [mediaToRemove, setMediaToRemove] = useState<string[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Handle file selection and preview
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const fileArray = Array.from(files);
    
    // Validate file types and sizes
    const validFiles = fileArray.filter(file => {
      const isValidType = file.type.startsWith('image/') || file.type.startsWith('video/');
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit
      
      if (!isValidType) {
        alert(`${file.name} is not a valid image or video file.`);
        return false;
      }
      
      if (!isValidSize) {
        alert(`${file.name} is too large. Maximum file size is 50MB.`);
        return false;
      }
      
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
    setNewFiles(prev => [...prev, ...validFiles]);

    // Create preview URLs for images
    const newPreviewUrls = validFiles
      .filter(file => file.type.startsWith('image/'))
      .map(file => URL.createObjectURL(file));
    
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  // Remove selected file
  const removeFile = (index: number) => {
    const fileToRemove = selectedFiles[index];
    if (fileToRemove && fileToRemove.type.startsWith('image/')) {
      const previewIndex = selectedFiles
        .slice(0, index + 1)
        .filter(f => f.type.startsWith('image/'))
        .length - 1;
      
      if (previewUrls[previewIndex]) {
        URL.revokeObjectURL(previewUrls[previewIndex]);
        setPreviewUrls(prev => prev.filter((_, i) => i !== previewIndex));
      }
    }
    
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Remove existing media
  const removeExistingMedia = (mediaUrl: string) => {
    setMediaToRemove(prev => [...prev, mediaUrl]);
  };

  // Restore existing media
  const restoreExistingMedia = (mediaUrl: string) => {
    setMediaToRemove(prev => prev.filter(url => url !== mediaUrl));
  };

  // Check if user is the post owner
  const isPostOwner = currentUserId === post.user_id;
  const isCoCreator = currentUserId && post.co_creators?.includes(currentUserId);

  // Handle saving changes
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const updates: Partial<Post> = {};

      // Update text content if changed
      if (editBody !== post.body) {
        updates.body = editBody;
      }

      // Update co-creators if user is owner
      if (isPostOwner && JSON.stringify(coCreators) !== JSON.stringify(post.co_creators)) {
        updates.co_creators = coCreators;
      }

      // Update tagged users if user is owner
      if (isPostOwner && JSON.stringify(taggedUsers) !== JSON.stringify(post.tagged_users)) {
        updates.tagged_users = taggedUsers;
      }

      // Update privacy settings if user is owner
      if (isPostOwner) {
        if (privacy !== post.privacy) {
          updates.privacy = privacy;
        }
        if (allowShare !== post.allow_share) {
          updates.allow_share = allowShare;
        }
        if (allowComments !== post.allow_comments) {
          updates.allow_comments = allowComments;
        }
      }

      // Save post updates if any
      if (Object.keys(updates).length > 0) {
        const result = await updatePost(post.id, updates);
        if (!result.ok) {
          throw new Error(result.error || 'Failed to update post');
        }
      }

      // Remove marked media
      if (mediaToRemove.length > 0 && isPostOwner) {
        for (const mediaUrl of mediaToRemove) {
          try {
            await supabase
              .from('post_media')
              .delete()
              .eq('post_id', post.id)
              .eq('url', mediaUrl);
          } catch (error) {
            console.error('Error removing media:', error);
          }
        }
      }

      // Upload and add new files
      if (newFiles.length > 0) {
        setUploadingFiles(true);
        
        for (const file of newFiles) {
          try {
            const type = file.type.startsWith('video') ? 'video' : 'image';
            const { url, error } = await uploadMedia(file, type);
            
            if (error) {
              console.error('Upload error:', error);
              alert(`Failed to upload ${file.name}: ${error}`);
              continue;
            }
            
            if (url) {
              const addResult = await addMediaToPost(post.id, url, type);
              if (!addResult.ok) {
                console.error('Error adding media to post:', addResult.error);
                alert(`Failed to add ${file.name} to post`);
              }
            }
          } catch (error) {
            console.error('Error processing file:', file.name, error);
            alert(`Failed to process ${file.name}`);
          }
        }
      }

      // Clean up preview URLs
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      
      onSave();
    } catch (error) {
      console.error('Error updating post:', error);
      alert('Failed to update post. Please try again.');
    } finally {
      setIsSaving(false);
      setUploadingFiles(false);
    }
  };

  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const filteredCurrentMedia = currentMedia.filter(media => 
    !mediaToRemove.includes(media.url)
  );

  const hasChanges = 
    editBody !== post.body ||
    JSON.stringify(coCreators) !== JSON.stringify(post.co_creators) ||
    JSON.stringify(taggedUsers) !== JSON.stringify(post.tagged_users) ||
    privacy !== post.privacy ||
    allowShare !== post.allow_share ||
    allowComments !== post.allow_comments ||
    newFiles.length > 0 ||
    mediaToRemove.length > 0;

  return (
    <div className="edit-modal-overlay" onClick={onClose}>
      <div className="edit-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Enhanced Mobile Header */}
        <div className="edit-modal-header">
          <div className="header-content">
            <h2>{isPostOwner ? 'Edit Post' : 'Add to Post'}</h2>
            <p className="header-subtitle">
              {isPostOwner ? 'Make changes to your post' : 'Add photos and videos to this post'}
            </p>
          </div>
          <button onClick={onClose} className="close-button">
            <span>✕</span>
          </button>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="mobile-tab-bar">
          <div className="tab-strip">
            <button 
              className={`mobile-tab ${activeTab === 'content' ? 'active' : ''}`}
              onClick={() => setActiveTab('content')}
            >
              <span className="tab-icon">📝</span>
              <span className="tab-label">Caption</span>
            </button>
            
            <button 
              className={`mobile-tab ${activeTab === 'media' ? 'active' : ''}`}
              onClick={() => setActiveTab('media')}
            >
              <span className="tab-icon">📷</span>
              <span className="tab-label">Media</span>
              {(filteredCurrentMedia.length + selectedFiles.length) > 0 && (
                <span className="tab-badge">{filteredCurrentMedia.length + selectedFiles.length}</span>
              )}
            </button>

            {isPostOwner && (
              <>
                <button 
                  className={`mobile-tab ${activeTab === 'people' ? 'active' : ''}`}
                  onClick={() => setActiveTab('people')}
                >
                  <span className="tab-icon">👥</span>
                  <span className="tab-label">People</span>
                  {(coCreators.length + taggedUsers.length) > 0 && (
                    <span className="tab-badge">{coCreators.length + taggedUsers.length}</span>
                  )}
                </button>

                <button 
                  className={`mobile-tab ${activeTab === 'privacy' ? 'active' : ''}`}
                  onClick={() => setActiveTab('privacy')}
                >
                  <span className="tab-icon">🔒</span>
                  <span className="tab-label">Privacy</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="edit-modal-body">
          {/* Desktop Sidebar (Hidden on Mobile) */}
          <div className="sidebar desktop-only">
            <nav className="tab-nav">
              <button 
                className={`tab-button ${activeTab === 'content' ? 'active' : ''}`}
                onClick={() => setActiveTab('content')}
              >
                <span className="tab-icon">📝</span>
                <span className="tab-label">Caption</span>
              </button>
              
              <button 
                className={`tab-button ${activeTab === 'media' ? 'active' : ''}`}
                onClick={() => setActiveTab('media')}
              >
                <span className="tab-icon">📷</span>
                <span className="tab-label">Photos & Videos</span>
                {(filteredCurrentMedia.length + selectedFiles.length) > 0 && (
                  <span className="tab-badge">{filteredCurrentMedia.length + selectedFiles.length}</span>
                )}
              </button>

              {isPostOwner && (
                <>
                  <button 
                    className={`tab-button ${activeTab === 'people' ? 'active' : ''}`}
                    onClick={() => setActiveTab('people')}
                  >
                    <span className="tab-icon">👥</span>
                    <span className="tab-label">Tag People</span>
                    {(coCreators.length + taggedUsers.length) > 0 && (
                      <span className="tab-badge">{coCreators.length + taggedUsers.length}</span>
                    )}
                  </button>

                  <button 
                    className={`tab-button ${activeTab === 'privacy' ? 'active' : ''}`}
                    onClick={() => setActiveTab('privacy')}
                  >
                    <span className="tab-icon">🔒</span>
                    <span className="tab-label">Privacy</span>
                  </button>
                </>
              )}
            </nav>

            {/* Desktop Save Actions */}
            <div className="sidebar-actions">
              <button 
                onClick={handleSave}
                disabled={isSaving || uploadingFiles || !hasChanges}
                className="save-button"
              >
                {isSaving ? (
                  <>
                    <span className="spinner"></span>
                    Saving...
                  </>
                ) : uploadingFiles ? (
                  <>
                    <span className="spinner"></span>
                    Uploading...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
              
              <button onClick={onClose} className="cancel-button">
                Cancel
              </button>
              
              {hasChanges && (
                <p className="changes-indicator">
                  <span className="changes-dot"></span>
                  You have unsaved changes
                </p>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="content-area">
            {/* Caption Tab */}
            {activeTab === 'content' && (
              <div className="tab-content">
                <div className="content-header">
                  <h3>Edit Caption</h3>
                  <p>Update the text content of your post</p>
                </div>
                
                <div className="input-group">
                  <label className="input-label">Caption</label>
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    placeholder="What's on your mind? Share your gratitude, intention, or moment..."
                    rows={6}
                    className="caption-textarea"
                    disabled={!isPostOwner && !isCoCreator}
                  />
                  <div className="char-count">{editBody.length}/1000</div>
                </div>
              </div>
            )}

            {/* Media Tab */}
            {activeTab === 'media' && (
              <div className="tab-content">
                <div className="content-header">
                  <h3>Photos & Videos</h3>
                  <p>Add new media or manage existing files</p>
                </div>

                {/* Mobile File Upload Zone */}
                <div 
                  className="mobile-file-upload"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="mobile-file-upload-icon">📁</span>
                  <div className="mobile-file-upload-text">Add Photos & Videos</div>
                  <div className="mobile-file-upload-hint">Tap to choose files from your device</div>
                </div>

                {/* Desktop Add Media Section */}
                <div className="section desktop-only">
                  <div className="section-header">
                    <h4>Add New Files</h4>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="add-media-button"
                      disabled={uploadingFiles}
                    >
                      <span>📁</span>
                      Choose Files
                    </button>
                  </div>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />

                {selectedFiles.length > 0 && (
                  <div className="new-files-preview">
                    <h5>New Files to Upload</h5>
                    <div className="file-list">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="file-item">
                          <div className="file-info">
                            <span className="file-icon">
                              {file.type.startsWith('video') ? '🎥' : '📷'}
                            </span>
                            <div className="file-details">
                              <span className="file-name">{file.name}</span>
                              <span className="file-size">
                                {(file.size / 1024 / 1024).toFixed(1)} MB
                              </span>
                            </div>
                          </div>
                          <button 
                            onClick={() => removeFile(index)}
                            className="remove-file-button"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Media */}
                {filteredCurrentMedia.length > 0 && (
                  <div className="section">
                    <div className="section-header">
                      <h4>Current Media</h4>
                      <p>{filteredCurrentMedia.length} files</p>
                    </div>
                    
                    <div className="media-grid">
                      {filteredCurrentMedia.map((media, index) => (
                        <div key={index} className="media-item">
                          {media.type === 'video' ? (
                            <video src={media.url} className="media-preview" />
                          ) : (
                            <img src={media.url} alt="" className="media-preview" />
                          )}
                          {isPostOwner && (
                            <button
                              onClick={() => removeExistingMedia(media.url)}
                              className="remove-media-button"
                              title="Remove this media"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Removed Media */}
                {mediaToRemove.length > 0 && (
                  <div className="section">
                    <div className="section-header">
                      <h4>Removed Media</h4>
                      <p>Tap any item to restore it</p>
                    </div>
                    
                    <div className="media-grid">
                      {currentMedia
                        .filter(media => mediaToRemove.includes(media.url))
                        .map((media, index) => (
                          <div 
                            key={index} 
                            className="media-item removed"
                            onClick={() => restoreExistingMedia(media.url)}
                          >
                            {media.type === 'video' ? (
                              <video src={media.url} className="media-preview" />
                            ) : (
                              <img src={media.url} alt="" className="media-preview" />
                            )}
                            <div className="restore-overlay">
                              <span>↺ Tap to restore</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* People Tab */}
            {activeTab === 'people' && isPostOwner && (
              <div className="tab-content">
                <div className="content-header">
                  <h3>Tag People</h3>
                  <p>Tag friends and add co-creators to your post</p>
                </div>

                <div className="section">
                  <div className="input-group">
                    <label className="input-label">
                      <span className="label-icon">👥</span>
                      Co-Creators
                    </label>
                    <p className="input-description">
                      Co-creators can add their own photos and videos to this post
                    </p>
                    <SimpleFriendDropdown
                      value={coCreators}
                      onChange={setCoCreators}
                    />
                  </div>
                </div>

                <div className="section">
                  <div className="input-group">
                    <label className="input-label">
                      <span className="label-icon">🏷️</span>
                      Tagged People
                    </label>
                    <p className="input-description">
                      People tagged in this post will be notified and can view it
                    </p>
                    <SimpleFriendDropdown
                      value={taggedUsers}
                      onChange={setTaggedUsers}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && isPostOwner && (
              <div className="tab-content">
                <div className="content-header">
                  <h3>Privacy & Settings</h3>
                  <p>Control who can see and interact with your post</p>
                </div>

                <div className="section">
                  <div className="input-group">
                    <label className="input-label">
                      <span className="label-icon">👁️</span>
                      Who can see this post
                    </label>
                    <select 
                      className="privacy-select"
                      value={privacy}
                      onChange={(e) => setPrivacy(e.target.value)}
                    >
                      <option value="private">🔒 Only Me</option>
                      <option value="friends">👥 Friends</option>
                      <option value="public">🌍 Everyone</option>
                    </select>
                  </div>
                </div>

                <div className="section">
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={allowShare}
                        onChange={(e) => setAllowShare(e.target.checked)}
                        className="checkbox-input"
                      />
                      <span className="checkbox-custom"></span>
                      <span className="checkbox-text">
                        <span className="checkbox-title">Allow sharing</span>
                        <span className="checkbox-description">Others can share this post</span>
                      </span>
                    </label>
                    
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={allowComments}
                        onChange={(e) => setAllowComments(e.target.checked)}
                        className="checkbox-input"
                      />
                      <span className="checkbox-custom"></span>
                      <span className="checkbox-text">
                        <span className="checkbox-title">Allow comments</span>
                        <span className="checkbox-description">People can comment on this post</span>
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Action Bar */}
        <div className="mobile-action-bar">
          <div className="mobile-actions">
            <button onClick={onClose} className="mobile-cancel-button">
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving || uploadingFiles || !hasChanges}
              className="mobile-save-button"
            >
              {isSaving ? (
                <>
                  <span className="spinner"></span>
                  Saving...
                </>
              ) : uploadingFiles ? (
                <>
                  <span className="spinner"></span>
                  Uploading...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
          
          {hasChanges && (
            <div className="mobile-changes-indicator">
              <span className="changes-dot"></span>
              You have unsaved changes
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .edit-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          backdrop-filter: blur(4px);
        }

        .edit-modal-container {
          background: white;
          border-radius: 20px;
          width: 100%;
          max-width: 1000px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }

        .edit-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 28px;
          border-bottom: 1px solid #f3f4f6;
          background: #fafafa;
        }

        .header-content h2 {
          margin: 0 0 4px 0;
          font-size: 24px;
          font-weight: 700;
          color: #1a202c;
        }

        .header-subtitle {
          margin: 0;
          font-size: 14px;
          color: #6b7280;
        }

        .close-button {
          width: 44px;
          height: 44px;
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

        .close-button:hover {
          background: #e5e7eb;
          color: #374151;
          transform: scale(1.05);
        }

        .close-button:active {
          transform: scale(0.95);
        }

        /* Mobile Tab Bar */
        .mobile-tab-bar {
          display: none;
          background: white;
          border-bottom: 1px solid #f3f4f6;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .mobile-tab-bar::-webkit-scrollbar {
          display: none;
        }

        .tab-strip {
          display: flex;
          min-width: 100%;
        }

        .mobile-tab {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 16px 20px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          color: #6b7280;
          transition: all 0.2s ease;
          position: relative;
          min-width: 80px;
          flex: 1;
          border-bottom: 3px solid transparent;
          -webkit-tap-highlight-color: rgba(139, 92, 246, 0.1);
          touch-action: manipulation;
        }

        .mobile-tab:hover {
          background: rgba(139,92,246,0.05);
          color: #8b5cf6;
        }

        .mobile-tab:active {
          transform: scale(0.95);
        }

        .mobile-tab.active {
          color: #8b5cf6;
          font-weight: 600;
          border-bottom-color: #8b5cf6;
        }

        .mobile-tab .tab-icon {
          font-size: 16px;
        }

        .mobile-tab .tab-label {
          font-size: 11px;
          text-align: center;
        }

        .mobile-tab .tab-badge {
          position: absolute;
          top: 8px;
          right: 12px;
          background: #8b5cf6;
          color: white;
          font-size: 10px;
          padding: 1px 6px;
          border-radius: 8px;
          min-width: 16px;
          text-align: center;
          font-weight: 600;
        }

        .edit-modal-body {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        /* Desktop Sidebar */
        .sidebar {
          width: 280px;
          background: #fafafa;
          border-right: 1px solid #f3f4f6;
          display: flex;
          flex-direction: column;
          padding: 0;
        }

        .tab-nav {
          flex: 1;
          padding: 20px 0;
        }

        .tab-button {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 24px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 15px;
          font-weight: 500;
          color: #6b7280;
          transition: all 0.2s ease;
          position: relative;
        }

        .tab-button:hover {
          background: rgba(139,92,246,0.05);
          color: #8b5cf6;
        }

        .tab-button.active {
          background: rgba(139,92,246,0.1);
          color: #8b5cf6;
          font-weight: 600;
        }

        .tab-button.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: #8b5cf6;
        }

        .tab-icon {
          font-size: 18px;
        }

        .tab-label {
          flex: 1;
          text-align: left;
        }

        .tab-badge {
          background: #8b5cf6;
          color: white;
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 12px;
          min-width: 20px;
          text-align: center;
          font-weight: 600;
        }

        .sidebar-actions {
          padding: 20px 24px;
          border-top: 1px solid #f3f4f6;
        }

        .save-button {
          width: 100%;
          padding: 14px 20px;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 12px;
          box-shadow: 0 4px 12px rgba(139,92,246,0.3);
          min-height: 48px;
        }

        .save-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(139,92,246,0.4);
        }

        .save-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .cancel-button {
          width: 100%;
          padding: 12px 20px;
          background: #f3f4f6;
          color: #6b7280;
          border: none;
          border-radius: 12px;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 44px;
        }

        .cancel-button:hover {
          background: #e5e7eb;
          color: #374151;
        }

        .changes-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          font-size: 13px;
          color: #f59e0b;
        }

        .changes-dot {
          width: 8px;
          height: 8px;
          background: #f59e0b;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .content-area {
          flex: 1;
          overflow-y: auto;
          padding: 0;
        }

        .tab-content {
          padding: 28px 32px;
          max-width: 600px;
        }

        .content-header {
          margin-bottom: 32px;
        }

        .content-header h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 700;
          color: #1a202c;
        }

        .content-header p {
          margin: 0;
          font-size: 14px;
          color: #6b7280;
        }

        .section {
          margin-bottom: 32px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .section-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #374151;
        }

        .section-header p {
          margin: 0;
          font-size: 13px;
          color: #9ca3af;
        }

        .input-group {
          margin-bottom: 24px;
        }

        .input-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 14px;
          color: #374151;
          margin-bottom: 8px;
        }

        .label-icon {
          font-size: 16px;
        }

        .input-description {
          margin: 0 0 12px 0;
          font-size: 13px;
          color: #6b7280;
        }

        .caption-textarea {
          width: 100%;
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 15px;
          resize: vertical;
          min-height: 120px;
          font-family: inherit;
          line-height: 1.5;
          -webkit-appearance: none;
        }

        .caption-textarea:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
        }

        .char-count {
          text-align: right;
          font-size: 12px;
          color: #9ca3af;
          margin-top: 8px;
        }

        /* Mobile File Upload */
        .mobile-file-upload {
          display: none;
          width: 100%;
          padding: 24px;
          border: 2px dashed #8b5cf6;
          border-radius: 12px;
          background: rgba(139,92,246,0.05);
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 24px;
          -webkit-tap-highlight-color: rgba(139, 92, 246, 0.1);
          touch-action: manipulation;
        }

        .mobile-file-upload:hover {
          background: rgba(139,92,246,0.1);
          border-color: #7c3aed;
        }

        .mobile-file-upload:active {
          transform: scale(0.98);
        }

        .mobile-file-upload-icon {
          font-size: 36px;
          margin-bottom: 12px;
          display: block;
        }

        .mobile-file-upload-text {
          font-size: 18px;
          font-weight: 600;
          color: #8b5cf6;
          margin-bottom: 6px;
        }

        .mobile-file-upload-hint {
          font-size: 14px;
          color: #6b7280;
        }

        .add-media-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: #8b5cf6;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 40px;
        }

        .add-media-button:hover:not(:disabled) {
          background: #7c3aed;
          transform: translateY(-1px);
        }

        .add-media-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .new-files-preview {
          margin-top: 20px;
          padding: 20px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .new-files-preview h5 {
          margin: 0 0 16px 0;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .file-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .file-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        .file-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .file-icon {
          font-size: 18px;
        }

        .file-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          flex: 1;
        }

        .file-name {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          word-break: break-word;
        }

        .file-size {
          font-size: 12px;
          color: #9ca3af;
        }

        .remove-file-button {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #fee2e2;
          color: #dc2626;
          border: none;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          flex-shrink: 0;
          -webkit-tap-highlight-color: rgba(220, 38, 38, 0.1);
          touch-action: manipulation;
        }

        .remove-file-button:hover {
          background: #fecaca;
          transform: scale(1.05);
        }

        .remove-file-button:active {
          transform: scale(0.95);
        }

        .media-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 16px;
        }

        .media-item {
          position: relative;
          aspect-ratio: 1;
          border-radius: 12px;
          overflow: hidden;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          cursor: pointer;
          transition: all 0.2s ease;
          -webkit-tap-highlight-color: rgba(139, 92, 246, 0.1);
          touch-action: manipulation;
        }

        .media-item:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .media-item:active {
          transform: scale(0.98);
        }

        .media-item.removed {
          opacity: 0.6;
        }

        .media-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .remove-media-button {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(0,0,0,0.7);
          color: white;
          border: none;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          -webkit-tap-highlight-color: rgba(220, 38, 38, 0.1);
          touch-action: manipulation;
        }

        .remove-media-button:hover {
          background: #dc2626;
          transform: scale(1.1);
        }

        .remove-media-button:active {
          transform: scale(0.9);
        }

        .restore-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 13px;
          font-weight: 500;
          text-align: center;
        }

        .privacy-select {
          width: 100%;
          padding: 14px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          font-size: 16px;
          cursor: pointer;
          -webkit-appearance: none;
          min-height: 48px;
        }

        .privacy-select:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
        }

        .checkbox-group {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          cursor: pointer;
          padding: 20px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          transition: all 0.2s ease;
          -webkit-tap-highlight-color: rgba(139, 92, 246, 0.1);
          touch-action: manipulation;
        }

        .checkbox-label:hover {
          border-color: #8b5cf6;
          background: rgba(139,92,246,0.02);
        }

        .checkbox-label:active {
          transform: scale(0.98);
        }

        .checkbox-input {
          display: none;
        }

        .checkbox-custom {
          width: 24px;
          height: 24px;
          border: 2px solid #e5e7eb;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .checkbox-input:checked + .checkbox-custom {
          background: #8b5cf6;
          border-color: #8b5cf6;
        }

        .checkbox-input:checked + .checkbox-custom::after {
          content: '✓';
          color: white;
          font-size: 14px;
          font-weight: 700;
        }

        .checkbox-text {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }

        .checkbox-title {
          font-weight: 500;
          font-size: 16px;
          color: #374151;
        }

        .checkbox-description {
          font-size: 14px;
          color: #6b7280;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Mobile Action Bar */
        .mobile-action-bar {
          display: none;
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 1px solid #e5e7eb;
          padding: 16px 20px;
          z-index: 10;
          box-shadow: 0 -4px 12px rgba(0,0,0,0.1);
        }

        .mobile-actions {
          display: flex;
          gap: 12px;
          margin-bottom: 8px;
        }

        .mobile-cancel-button {
          flex: 1;
          padding: 16px 20px;
          background: #f3f4f6;
          color: #6b7280;
          border: none;
          border-radius: 12px;
          font-weight: 500;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 52px;
          -webkit-tap-highlight-color: rgba(107, 114, 128, 0.1);
          touch-action: manipulation;
        }

        .mobile-cancel-button:hover {
          background: #e5e7eb;
          color: #374151;
        }

        .mobile-cancel-button:active {
          transform: scale(0.98);
        }

        .mobile-save-button {
          flex: 2;
          padding: 16px 20px;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(139,92,246,0.3);
          min-height: 52px;
          -webkit-tap-highlight-color: rgba(139, 92, 246, 0.1);
          touch-action: manipulation;
        }

        .mobile-save-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(139,92,246,0.4);
        }

        .mobile-save-button:active:not(:disabled) {
          transform: scale(0.98);
        }

        .mobile-save-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .mobile-changes-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 13px;
          color: #f59e0b;
          margin-top: 8px;
        }

        /* Responsive Styles */
        @media (max-width: 768px) {
          .edit-modal-overlay {
            padding: 0;
            align-items: flex-start;
          }

          .edit-modal-container {
            margin: 0;
            max-height: 100vh;
            height: 100vh;
            border-radius: 0;
            border-radius: 20px 20px 0 0;
            margin-top: 20px;
            position: relative;
          }

          .edit-modal-header {
            padding: 20px 24px 16px;
            position: sticky;
            top: 0;
            z-index: 10;
            background: white;
            border-bottom: 1px solid #f3f4f6;
          }

          .header-content h2 {
            font-size: 20px;
          }

          .close-button {
            width: 40px;
            height: 40px;
            font-size: 16px;
          }

          .mobile-tab-bar {
            display: block;
            position: sticky;
            top: 89px;
            z-index: 9;
            background: white;
          }

          .edit-modal-body {
            flex-direction: column;
            padding-bottom: 120px;
          }

          .sidebar {
            display: none;
          }

          .desktop-only {
            display: none !important;
          }

          .mobile-file-upload {
            display: block;
          }

          .tab-content {
            padding: 24px 20px;
            max-width: none;
            min-height: calc(100vh - 300px);
          }

          .content-header h3 {
            font-size: 18px;
          }

          .media-grid {
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 12px;
          }

          .mobile-action-bar {
            display: block;
          }

          /* Better touch targets */
          .caption-textarea {
            min-height: 140px;
            font-size: 16px;
            padding: 16px;
          }

          .checkbox-title {
            font-size: 15px;
          }

          .checkbox-description {
            font-size: 13px;
          }
        }

        @media (max-width: 480px) {
          .edit-modal-header {
            padding: 16px 20px 12px;
          }

          .header-content h2 {
            font-size: 18px;
          }

          .mobile-tab .tab-label {
            font-size: 10px;
          }

          .mobile-tab {
            min-width: 70px;
            padding: 12px 16px;
          }

          .tab-content {
            padding: 20px 16px;
          }

          .content-header h3 {
            font-size: 16px;
          }

          .mobile-actions {
            gap: 8px;
          }

          .mobile-save-button,
          .mobile-cancel-button {
            padding: 14px 16px;
            font-size: 15px;
            min-height: 48px;
          }

          .media-grid {
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 8px;
          }

          .mobile-file-upload {
            padding: 20px 16px;
          }

          .mobile-file-upload-icon {
            font-size: 32px;
          }

          .mobile-file-upload-text {
            font-size: 16px;
          }

          .file-item {
            padding: 10px 12px;
          }

          .remove-file-button {
            width: 28px;
            height: 28px;
            font-size: 12px;
          }

          .remove-media-button {
            width: 28px;
            height: 28px;
            font-size: 12px;
          }
        }

        /* Hide mobile elements on desktop */
        @media (min-width: 769px) {
          .mobile-tab-bar,
          .mobile-action-bar,
          .mobile-file-upload {
            display: none !important;
          }
        }

        /* Accessibility improvements */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
