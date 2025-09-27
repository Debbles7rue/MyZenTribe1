// components/PostCard/EditPostModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Post, updatePost, addMediaToPost, uploadMedia } from "@/lib/posts";
import { supabase } from "@/lib/supabaseClient";
import SimpleFriendDropdown from "@/components/SimpleFriendDropdown";
import styles from "./styles.module.css";

interface EditPostModalProps {
  post: Post;
  currentMedia: Array<{url: string; type: 'image' | 'video'}>;
  onClose: () => void;
  onSave: () => void;
}

interface Friend {
  id: string;
  full_name: string;
  avatar_url?: string;
}

export default function EditPostModal({ 
  post, 
  currentMedia,
  onClose, 
  onSave 
}: EditPostModalProps) {
  const [editBody, setEditBody] = useState(post.body || '');
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showCoCreators, setShowCoCreators] = useState(false);
  const [showTagging, setShowTagging] = useState(false);
  const [coCreators, setCoCreators] = useState<string[]>(post.co_creators || []);
  const [taggedUsers, setTaggedUsers] = useState<string[]>(post.tagged_users || []);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [privacy, setPrivacy] = useState(post.privacy || 'friends');
  const [allowShare, setAllowShare] = useState(post.allow_share !== false);
  const [allowComments, setAllowComments] = useState(post.allow_comments !== false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [mediaToRemove, setMediaToRemove] = useState<string[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

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

  return (
    <div className={styles.editModalOverlay} onClick={onClose}>
      <div className={`${styles.editModalContent} ${styles.professional}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.editModalHeader}>
          <h2>{isPostOwner ? 'Edit Post' : 'Add to Post'}</h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>
        
        <div className={styles.editModalBody}>
          {/* Text Content Section */}
          <div className={styles.editSection}>
            <label className={styles.editLabel}>
              {isPostOwner ? 'Edit Caption' : 'Add Caption'}
            </label>
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              placeholder="What's on your mind?"
              rows={4}
              className={styles.editTextareaClean}
              disabled={!isPostOwner && !isCoCreator}
            />
          </div>

          {/* Current Media Preview */}
          {filteredCurrentMedia.length > 0 && (
            <div className={styles.editSection}>
              <label className={styles.editLabel}>Current Photos & Videos</label>
              <div className={styles.currentMediaGrid}>
                {filteredCurrentMedia.map((media, index) => (
                  <div key={index} className={styles.mediaPreviewItem}>
                    {media.type === 'video' ? (
                      <video src={media.url} className={styles.mediaPreview} />
                    ) : (
                      <img src={media.url} alt="" className={styles.mediaPreview} />
                    )}
                    {isPostOwner && (
                      <button
                        onClick={() => removeExistingMedia(media.url)}
                        className={styles.removeMediaBtn}
                        title="Remove this media"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Removed Media (can be restored) */}
          {mediaToRemove.length > 0 && (
            <div className={styles.editSection}>
              <label className={styles.editLabel}>Removed Media (click to restore)</label>
              <div className={styles.removedMediaGrid}>
                {currentMedia
                  .filter(media => mediaToRemove.includes(media.url))
                  .map((media, index) => (
                    <div key={index} className={styles.removedMediaItem} onClick={() => restoreExistingMedia(media.url)}>
                      {media.type === 'video' ? (
                        <video src={media.url} className={styles.mediaPreview} />
                      ) : (
                        <img src={media.url} alt="" className={styles.mediaPreview} />
                      )}
                      <div className={styles.removedOverlay}>
                        <span>Click to restore</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className={styles.editActionsGrid}>
            {/* Add Photos & Videos */}
            <div className={styles.actionCard}>
              <h3>📸 Add Photos & Videos</h3>
              <p>Add more memories to this post</p>
              <label className={`${styles.actionButton} ${styles.primary}`}>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                Choose Files
              </label>
              {selectedFiles.length > 0 && (
                <div className={styles.filePreview}>
                  <div className={styles.selectedFiles}>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className={styles.fileItem}>
                        <span className={styles.fileName}>{file.name}</span>
                        <span className={styles.fileSize}>
                          ({(file.size / 1024 / 1024).toFixed(1)}MB)
                        </span>
                        <button 
                          onClick={() => removeFile(index)}
                          className={styles.removeFileBtn}
                          type="button"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Preview new images */}
                  {previewUrls.length > 0 && (
                    <div className={styles.newMediaPreview}>
                      {previewUrls.map((url, index) => (
                        <img 
                          key={index}
                          src={url} 
                          alt="Preview" 
                          className={styles.mediaPreview}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Co-Creators (Owner only) */}
            {isPostOwner && (
              <div className={styles.actionCard}>
                <h3>👥 Co-Creators</h3>
                <p>Tag friends who can add photos</p>
                <button 
                  className={`${styles.actionButton} ${styles.secondary}`}
                  onClick={() => setShowCoCreators(!showCoCreators)}
                >
                  {coCreators.length > 0 ? `${coCreators.length} Tagged` : 'Tag Friends'}
                </button>
                {showCoCreators && (
                  <div className={styles.dropdownSection}>
                    <SimpleFriendDropdown
                      value={coCreators}
                      onChange={setCoCreators}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Tag People (Owner only) */}
            {isPostOwner && (
              <div className={styles.actionCard}>
                <h3>🏷️ Tag People</h3>
                <p>Tag people in this post</p>
                <button 
                  className={`${styles.actionButton} ${styles.secondary}`}
                  onClick={() => setShowTagging(!showTagging)}
                >
                  {taggedUsers.length > 0 ? `${taggedUsers.length} Tagged` : 'Tag People'}
                </button>
                {showTagging && (
                  <div className={styles.dropdownSection}>
                    <SimpleFriendDropdown
                      value={taggedUsers}
                      onChange={setTaggedUsers}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Privacy Settings (Owner only) */}
            {isPostOwner && (
              <div className={styles.actionCard}>
                <h3>🔒 Privacy & Settings</h3>
                <div className={styles.privacySettings}>
                  <div className={styles.settingItem}>
                    <label>Who can see this post</label>
                    <select 
                      className={styles.privacySelect}
                      value={privacy}
                      onChange={(e) => setPrivacy(e.target.value)}
                    >
                      <option value="friends">Friends</option>
                      <option value="public">Everyone</option>
                      <option value="private">Only Me</option>
                    </select>
                  </div>
                  
                  <div className={styles.settingItem}>
                    <label>
                      <input
                        type="checkbox"
                        checked={allowShare}
                        onChange={(e) => setAllowShare(e.target.checked)}
                        className={styles.checkbox}
                      />
                      Allow sharing
                    </label>
                  </div>
                  
                  <div className={styles.settingItem}>
                    <label>
                      <input
                        type="checkbox"
                        checked={allowComments}
                        onChange={(e) => setAllowComments(e.target.checked)}
                        className={styles.checkbox}
                      />
                      Allow comments
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.editModalFooter}>
          <button onClick={onClose} disabled={isSaving} className={styles.cancelButton}>
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving || uploadingFiles}
            className={`${styles.saveButton} ${styles.primary}`}
          >
            {isSaving ? 'Saving...' : uploadingFiles ? 'Uploading...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
