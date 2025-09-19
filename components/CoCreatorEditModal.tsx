// components/CoCreatorEditModal.tsx
"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { uploadMedia } from "@/lib/posts";

interface CoCreatorEditModalProps {
  postId: string;
  currentUserId: string;
  isCreator: boolean; // true if original author, false if co-creator
  onClose: () => void;
  onUpdate: () => void;
}

type MediaUpload = {
  url: string;
  type: 'image' | 'video';
  preview: string;
  file?: File;
};

export default function CoCreatorEditModal({
  postId,
  currentUserId,
  isCreator,
  onClose,
  onUpdate
}: CoCreatorEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [newMedia, setNewMedia] = useState<MediaUpload[]>([]);
  const [additionalComment, setAdditionalComment] = useState("");
  const [existingMedia, setExistingMedia] = useState<any[]>([]);
  const [mediaToRemove, setMediaToRemove] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Load existing media on mount
  useState(() => {
    async function loadPostMedia() {
      const { data, error } = await supabase
        .from('post_media')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      if (data) {
        setExistingMedia(data);
      }
    }
    loadPostMedia();
  });

  async function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const tempMedia: MediaUpload[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const previewUrl = URL.createObjectURL(file);
      
      tempMedia.push({
        url: previewUrl,
        type,
        preview: previewUrl,
        file
      });
    }
    
    setNewMedia([...newMedia, ...tempMedia]);
    
    // Clear the file input
    if (e.target) {
      e.target.value = '';
    }
  }

  function removeNewMedia(index: number) {
    const media = newMedia[index];
    if (media.preview.startsWith('blob:')) {
      URL.revokeObjectURL(media.preview);
    }
    setNewMedia(newMedia.filter((_, i) => i !== index));
  }

  function toggleRemoveExisting(mediaId: string) {
    if (mediaToRemove.includes(mediaId)) {
      setMediaToRemove(mediaToRemove.filter(id => id !== mediaId));
    } else {
      setMediaToRemove([...mediaToRemove, mediaId]);
    }
  }

  async function handleSave() {
    setLoading(true);
    setUploadingMedia(true);

    try {
      // Upload new media files
      const uploadedMedia = [];
      for (const media of newMedia) {
        if (media.file) {
          const { url, error } = await uploadMedia(media.file, media.type);
          if (!error && url) {
            uploadedMedia.push({
              post_id: postId,
              media_url: url,
              media_type: media.type,
              uploaded_by: currentUserId,
              is_collaborative: true
            });
          }
        }
      }

      // Insert new media records
      if (uploadedMedia.length > 0) {
        const { error: insertError } = await supabase
          .from('post_media')
          .insert(uploadedMedia);
        
        if (insertError) {
          throw insertError;
        }
      }

      // Remove media if user is creator or uploaded by them
      if (mediaToRemove.length > 0) {
        // For co-creators: only remove media they uploaded
        // For creators: can remove any media
        if (isCreator) {
          await supabase
            .from('post_media')
            .delete()
            .in('id', mediaToRemove);
        } else {
          await supabase
            .from('post_media')
            .delete()
            .in('id', mediaToRemove)
            .eq('uploaded_by', currentUserId);
        }
      }

      // Add collaboration comment if provided
      if (additionalComment.trim()) {
        await supabase
          .from('post_collaborations')
          .insert({
            post_id: postId,
            user_id: currentUserId,
            action: 'added_content',
            comment: additionalComment.trim(),
            media_count: uploadedMedia.length
          });
      }

      // Update post's updated_at timestamp
      await supabase
        .from('posts')
        .update({ 
          updated_at: new Date().toISOString(),
          last_edited_by: currentUserId
        })
        .eq('id', postId);

      // Clean up preview URLs
      newMedia.forEach(m => {
        if (m.preview.startsWith('blob:')) {
          URL.revokeObjectURL(m.preview);
        }
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating post:', error);
      alert('Failed to update post. Please try again.');
    } finally {
      setLoading(false);
      setUploadingMedia(false);
    }
  }

  async function handleRemoveTag() {
    if (!confirm('Remove yourself from this post? You can be re-added by the creator.')) {
      return;
    }

    setLoading(true);
    try {
      // Remove from co_creators array
      const { data: post } = await supabase
        .from('posts')
        .select('co_creators')
        .eq('id', postId)
        .single();
      
      if (post?.co_creators) {
        const updatedCoCreators = post.co_creators.filter((id: string) => id !== currentUserId);
        
        await supabase
          .from('posts')
          .update({ co_creators: updatedCoCreators })
          .eq('id', postId);
        
        // Log the removal
        await supabase
          .from('post_collaborations')
          .insert({
            post_id: postId,
            user_id: currentUserId,
            action: 'removed_tag',
            comment: 'Removed themselves from the post'
          });
      }
      
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error removing tag:', error);
      alert('Failed to remove tag. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isCreator ? 'Edit Post' : 'Add to Post'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Existing Media */}
          {existingMedia.length > 0 && (
            <div className="existing-media-section">
              <h3>Current Media</h3>
              <div className="media-grid">
                {existingMedia.map((media) => {
                  const canRemove = isCreator || media.uploaded_by === currentUserId;
                  const isMarkedForRemoval = mediaToRemove.includes(media.id);
                  
                  return (
                    <div 
                      key={media.id} 
                      className={`media-item ${isMarkedForRemoval ? 'marked-remove' : ''}`}
                    >
                      {media.media_type === 'image' ? (
                        <img src={media.media_url} alt="" />
                      ) : (
                        <video src={media.media_url} />
                      )}
                      
                      {canRemove && (
                        <button
                          className="remove-btn"
                          onClick={() => toggleRemoveExisting(media.id)}
                        >
                          {isMarkedForRemoval ? '↩️' : '×'}
                        </button>
                      )}
                      
                      {media.uploaded_by !== currentUserId && (
                        <div className="media-badge">
                          {media.is_collaborative ? '👥' : '👤'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* New Media Upload */}
          <div className="upload-section">
            <h3>Add New Media</h3>
            <div className="upload-buttons">
              <button
                className="upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingMedia}
              >
                📷 Add Photos
              </button>
              <button
                className="upload-btn"
                onClick={() => videoInputRef.current?.click()}
                disabled={uploadingMedia}
              >
                🎥 Add Videos
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleMediaSelect(e, 'image')}
            />
            <input
              ref={videoInputRef}
              type="file"
              multiple
              accept="video/*"
              style={{ display: 'none' }}
              onChange={(e) => handleMediaSelect(e, 'video')}
            />

            {/* Preview New Media */}
            {newMedia.length > 0 && (
              <div className="new-media-preview">
                <div className="media-grid">
                  {newMedia.map((media, index) => (
                    <div key={index} className="media-item">
                      {media.type === 'image' ? (
                        <img src={media.preview} alt="" />
                      ) : (
                        <video src={media.preview} />
                      )}
                      <button
                        onClick={() => removeNewMedia(index)}
                        className="remove-btn"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Additional Comment */}
          <div className="comment-section">
            <h3>Add a Comment (Optional)</h3>
            <textarea
              value={additionalComment}
              onChange={(e) => setAdditionalComment(e.target.value)}
              placeholder="Say something about your additions..."
              rows={3}
            />
          </div>

          {/* Co-Creator Actions */}
          {!isCreator && (
            <div className="cocreator-actions">
              <button 
                className="remove-tag-btn"
                onClick={handleRemoveTag}
                disabled={loading}
              >
                Remove My Tag
              </button>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button 
            className="save-btn" 
            onClick={handleSave} 
            disabled={loading || (newMedia.length === 0 && mediaToRemove.length === 0 && !additionalComment.trim())}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 9998;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border-radius: 0.75rem;
          max-width: 800px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .modal-header h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 2rem;
          cursor: pointer;
          color: #718096;
        }

        .modal-body {
          padding: 1.5rem;
          overflow-y: auto;
          flex: 1;
        }

        .existing-media-section,
        .upload-section,
        .comment-section {
          margin-bottom: 1.5rem;
        }

        h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0 0 0.75rem 0;
        }

        .media-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 0.5rem;
        }

        .media-item {
          position: relative;
          aspect-ratio: 1;
          border-radius: 0.5rem;
          overflow: hidden;
          background: #f7fafc;
        }

        .media-item img,
        .media-item video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .media-item.marked-remove {
          opacity: 0.3;
        }

        .remove-btn {
          position: absolute;
          top: 0.25rem;
          right: 0.25rem;
          background: rgba(239, 68, 68, 0.9);
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          cursor: pointer;
          font-size: 1rem;
        }

        .media-badge {
          position: absolute;
          bottom: 0.25rem;
          left: 0.25rem;
          background: rgba(0, 0, 0, 0.5);
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
        }

        .upload-buttons {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .upload-btn {
          padding: 0.5rem 1rem;
          background: #f7fafc;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .upload-btn:hover {
          background: #edf2f7;
        }

        .comment-section textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          resize: vertical;
        }

        .cocreator-actions {
          text-align: center;
          padding-top: 1rem;
          border-top: 1px solid #e2e8f0;
        }

        .remove-tag-btn {
          padding: 0.5rem 1rem;
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
          padding: 1.5rem;
          border-top: 1px solid #e2e8f0;
        }

        .cancel-btn,
        .save-btn {
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
        }

        .cancel-btn {
          background: white;
          color: #4a5568;
          border: 1px solid #e2e8f0;
        }

        .save-btn {
          background: linear-gradient(135deg, #805ad5, #6b46c1);
          color: white;
          border: none;
        }

        .save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
