// components/CoCreatorEditModal.tsx
"use client";

import { useState, useRef, useEffect } from "react";
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
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Helper function to add debug messages that appear in UI
  const addDebug = (message: string) => {
    console.log(message);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Load existing media and validate permissions on mount
  useEffect(() => {
    async function loadPostData() {
      // Log device/browser info for debugging
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      addDebug(`Loading post data for user: ${currentUserId}`);
      addDebug(`Device info - Mobile: ${isMobile}, iOS: ${isIOS}, Online: ${navigator.onLine}`);
      
      // Check authentication state
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      addDebug(`Auth state - Has session: ${!!session}, User ID: ${session?.user?.id}, Token: ${session?.access_token ? 'present' : 'missing'}`);
      
      if (authError) {
        addDebug(`Auth error: ${authError.message}`);
      }
      
      // First, get the post to verify co-creator status
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('user_id, co_creators, visibility')
        .eq('id', postId)
        .single();
      
      if (postError) {
        addDebug(`Error loading post: ${postError.message} (Code: ${postError.code})`);
        return;
      }
      
      addDebug(`Post data - Creator: ${post.user_id}, Co-creators: [${post.co_creators?.join(', ') || 'none'}]`);
      addDebug(`User status - Is creator: ${post.user_id === currentUserId}, Is co-creator: ${post.co_creators?.includes(currentUserId)}, Passed isCreator: ${isCreator}`);
      
      // Load existing media
      const { data: media, error: mediaError } = await supabase
        .from('post_media')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      if (mediaError) {
        addDebug(`Error loading media: ${mediaError.message} (Code: ${mediaError.code})`);
      } else {
        addDebug(`Media loaded: ${media?.length || 0} items`);
        setExistingMedia(media || []);
      }
    }
    loadPostData();
  }, [postId, currentUserId, isCreator]);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  async function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const tempMedia: MediaUpload[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file size
      const maxSize = type === 'image' ? 10 * 1024 * 1024 : 100 * 1024 * 1024; // 10MB images, 100MB videos
      if (file.size > maxSize) {
        alert(`File "${file.name}" is too large. Max size: ${type === 'image' ? '10MB' : '100MB'}`);
        continue;
      }
      
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
    console.log('💾 Starting save process...');
    console.log('📊 Save data:', {
      newMediaCount: newMedia.length,
      mediaToRemoveCount: mediaToRemove.length,
      hasComment: !!additionalComment.trim(),
      isCreator,
      currentUserId
    });

    setLoading(true);
    setUploadingMedia(true);

    try {
      // Upload new media files
      const uploadedMedia = [];
      for (const media of newMedia) {
        if (media.file) {
          console.log(`⬆️ Uploading ${media.type}:`, media.file.name);
          const { url, error } = await uploadMedia(media.file, media.type);
          if (!error && url) {
            const mediaRecord = {
              post_id: postId,
              storage_path: url, // Store storage path, not public URL
              type: media.type,
              uploaded_by: currentUserId,
              created_by: currentUserId,
              sort_order: existingMedia.length + uploadedMedia.length
            };
            console.log('✅ Upload successful, will insert:', mediaRecord);
            uploadedMedia.push(mediaRecord);
          } else {
            console.error('❌ Upload failed:', error);
            throw new Error(`Failed to upload ${media.type}: ${error}`);
          }
        }
      }

      // Insert new media records
      if (uploadedMedia.length > 0) {
        console.log('📝 Inserting media records:', uploadedMedia.length);
        const { error: insertError } = await supabase
          .from('post_media')
          .insert(uploadedMedia);
        
        if (insertError) {
          console.error('❌ Media insert error:', insertError);
          throw insertError;
        }
        console.log('✅ Media records inserted successfully');
      }

      // Remove media if user has permission
      if (mediaToRemove.length > 0) {
        console.log('🗑️ Attempting to remove media:', mediaToRemove);
        
        if (isCreator) {
          console.log('👑 User is creator, can remove any media');
          // Creators can remove any media, but delete from storage too
          const mediaToDelete = existingMedia.filter(m => mediaToRemove.includes(m.id));
          const storagePaths = mediaToDelete.map(m => m.storage_path).filter(Boolean);
          
          if (storagePaths.length > 0) {
            console.log('🗄️ Deleting from storage:', storagePaths);
            const { error: storageError } = await supabase.storage.from('post-media').remove(storagePaths);
            if (storageError) console.error('⚠️ Storage deletion warning:', storageError);
          }
          
          const { error: deleteError } = await supabase
            .from('post_media')
            .delete()
            .in('id', mediaToRemove);
            
          if (deleteError) {
            console.error('❌ Media deletion error:', deleteError);
            throw deleteError;
          }
          console.log('✅ Media deleted successfully');
        } else {
          console.log('👥 User is co-creator, can only remove own media');
          // Co-creators can only remove media they uploaded
          const userMedia = existingMedia.filter(m => 
            mediaToRemove.includes(m.id) && m.uploaded_by === currentUserId
          );
          
          console.log('🔍 User media to remove:', userMedia.map(m => ({
            id: m.id,
            uploadedBy: m.uploaded_by,
            isUsers: m.uploaded_by === currentUserId
          })));
          
          if (userMedia.length > 0) {
            const storagePaths = userMedia.map(m => m.storage_path).filter(Boolean);
            
            if (storagePaths.length > 0) {
              console.log('🗄️ Deleting user media from storage:', storagePaths);
              const { error: storageError } = await supabase.storage.from('post-media').remove(storagePaths);
              if (storageError) console.error('⚠️ Storage deletion warning:', storageError);
            }
            
            const { error: deleteError } = await supabase
              .from('post_media')
              .delete()
              .in('id', mediaToRemove)
              .eq('uploaded_by', currentUserId);
              
            if (deleteError) {
              console.error('❌ User media deletion error:', deleteError);
              throw deleteError;
            }
            console.log('✅ User media deleted successfully');
          } else {
            console.warn('⚠️ No user media found to delete');
          }
        }
      }

      // Add collaboration comment if provided
      if (additionalComment.trim()) {
        console.log('💬 Adding collaboration comment');
        const { error: commentError } = await supabase
          .from('post_collaborations')
          .insert({
            post_id: postId,
            user_id: currentUserId,
            action: 'added_content',
            comment: additionalComment.trim(),
            media_count: uploadedMedia.length
          });
          
        if (commentError) {
          console.error('❌ Comment insert error:', commentError);
          // Don't throw - comments are not critical
        } else {
          console.log('✅ Comment added successfully');
        }
      }

      // Update post's updated_at timestamp
      console.log('🕒 Updating post timestamp');
      const { error: updateError } = await supabase
        .from('posts')
        .update({ 
          updated_at: new Date().toISOString(),
          last_edited_by: currentUserId
        })
        .eq('id', postId);
        
      if (updateError) {
        console.error('❌ Post update error:', updateError);
        // Don't throw - timestamp update is not critical
      } else {
        console.log('✅ Post timestamp updated');
      }

      // Clean up preview URLs
      newMedia.forEach(m => {
        if (m.preview.startsWith('blob:')) {
          URL.revokeObjectURL(m.preview);
        }
      });

      console.log('🎉 Save completed successfully!');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('💥 Save failed with error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to update post: ${errorMessage}\n\nCheck console for details.`);
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

  const hasChanges = newMedia.length > 0 || mediaToRemove.length > 0 || additionalComment.trim();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isCreator ? 'Edit Post' : 'Add to Post'}</h2>
          <button 
            className="close-btn" 
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Existing Media */}
          {existingMedia.length > 0 && (
            <div className="existing-media-section">
              <h3>Current Media ({existingMedia.length})</h3>
              <div className="media-grid">
                {existingMedia.map((media) => {
                  const canRemove = isCreator || media.uploaded_by === currentUserId;
                  const isMarkedForRemoval = mediaToRemove.includes(media.id);
                  
                  // Get public URL from storage path
                  const { data } = supabase.storage
                    .from('post-media')
                    .getPublicUrl(media.storage_path || media.media_url);
                  
                  const mediaUrl = data.publicUrl;
                  
                  return (
                    <div 
                      key={media.id} 
                      className={`media-item ${isMarkedForRemoval ? 'marked-remove' : ''}`}
                    >
                      {media.type === 'image' || media.media_type === 'image' ? (
                        <img src={mediaUrl} alt="" loading="lazy" />
                      ) : (
                        <video src={mediaUrl} preload="metadata" />
                      )}
                      
                      {canRemove && (
                        <button
                          className="remove-btn"
                          onClick={() => toggleRemoveExisting(media.id)}
                          title={isMarkedForRemoval ? 'Undo remove' : 'Mark for removal'}
                        >
                          {isMarkedForRemoval ? '↩️' : '×'}
                        </button>
                      )}
                      
                      {media.uploaded_by !== currentUserId && (
                        <div className="media-badge">
                          {isCreator ? '👑' : '👥'}
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

            {/* Upload Progress */}
            {uploadingMedia && (
              <div className="upload-progress">
                <div className="progress-bar">
                  <div className="progress-fill"></div>
                </div>
                <p>Uploading media...</p>
              </div>
            )}

            {/* Preview New Media */}
            {newMedia.length > 0 && (
              <div className="new-media-preview">
                <h4>New Media to Add ({newMedia.length})</h4>
                <div className="media-grid">
                  {newMedia.map((media, index) => (
                    <div key={index} className="media-item">
                      {media.type === 'image' ? (
                        <img src={media.preview} alt="" />
                      ) : (
                        <video src={media.preview} preload="metadata" />
                      )}
                      <button
                        onClick={() => removeNewMedia(index)}
                        className="remove-btn"
                        title="Remove from upload"
                      >
                        ×
                      </button>
                      <div className="media-badge new">
                        NEW
                      </div>
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
              maxLength={500}
            />
            <div className="char-count">
              {additionalComment.length}/500
            </div>
          </div>

          {/* Co-Creator Actions */}
          {!isCreator && (
            <div className="cocreator-actions">
              <button 
                className="remove-tag-btn"
                onClick={handleRemoveTag}
                disabled={loading}
              >
                🚪 Remove My Tag
              </button>
              <p className="remove-tag-info">
                This will remove you from the post completely
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="cancel-btn" 
            onClick={onClose} 
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            className="save-btn" 
            onClick={handleSave} 
            disabled={loading || !hasChanges}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 9998;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          overflow-y: auto;
        }

        .modal-content {
          background: white;
          border-radius: 1rem;
          max-width: 900px;
          width: 100%;
          max-height: calc(100vh - 2rem);
          max-height: calc(100dvh - 2rem);
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          border: 1px solid #e2e8f0;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 1rem 1rem 0 0;
        }

        .modal-header h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0;
          color: #1a202c;
        }

        .close-btn {
          background: #f7fafc;
          border: 1px solid #e2e8f0;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          font-size: 1.5rem;
          cursor: pointer;
          color: #4a5568;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: #edf2f7;
          border-color: #cbd5e0;
        }

        .modal-body {
          padding: 1.5rem;
          overflow-y: auto;
          flex: 1;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e0 #f7fafc;
        }

        .modal-body::-webkit-scrollbar {
          width: 6px;
        }

        .modal-body::-webkit-scrollbar-track {
          background: #f7fafc;
        }

        .modal-body::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 3px;
        }

        .existing-media-section,
        .upload-section,
        .comment-section {
          margin-bottom: 2rem;
        }

        h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0 0 1rem 0;
          color: #2d3748;
        }

        h4 {
          font-size: 1rem;
          font-weight: 500;
          margin: 1rem 0 0.5rem 0;
          color: #4a5568;
        }

        .media-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 0.75rem;
        }

        .media-item {
          position: relative;
          aspect-ratio: 1;
          border-radius: 0.75rem;
          overflow: hidden;
          background: #f7fafc;
          border: 2px solid #e2e8f0;
          transition: all 0.2s;
        }

        .media-item:hover {
          border-color: #cbd5e0;
          transform: translateY(-1px);
        }

        .media-item img,
        .media-item video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .media-item.marked-remove {
          opacity: 0.4;
          border-color: #fc8181;
          background: #fed7d7;
        }

        .remove-btn {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: rgba(239, 68, 68, 0.9);
          color: white;
          border: none;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          cursor: pointer;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          backdrop-filter: blur(4px);
        }

        .remove-btn:hover {
          background: rgba(239, 68, 68, 1);
          transform: scale(1.1);
        }

        .media-badge {
          position: absolute;
          bottom: 0.5rem;
          left: 0.5rem;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 500;
          backdrop-filter: blur(4px);
        }

        .media-badge.new {
          background: rgba(59, 130, 246, 0.9);
        }

        .upload-buttons {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .upload-btn {
          padding: 0.75rem 1.25rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .upload-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .upload-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .upload-progress {
          margin: 1rem 0;
          padding: 1rem;
          background: #f7fafc;
          border-radius: 0.5rem;
          border: 1px solid #e2e8f0;
        }

        .progress-bar {
          width: 100%;
          height: 4px;
          background: #e2e8f0;
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          border-radius: 2px;
          animation: progress-animation 2s infinite;
        }

        @keyframes progress-animation {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }

        .upload-progress p {
          margin: 0;
          font-size: 0.875rem;
          color: #4a5568;
          text-align: center;
        }

        .comment-section textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          resize: vertical;
          font-family: inherit;
          transition: border-color 0.2s;
        }

        .comment-section textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .char-count {
          text-align: right;
          font-size: 0.75rem;
          color: #718096;
          margin-top: 0.25rem;
        }

        .cocreator-actions {
          text-align: center;
          padding: 1.5rem;
          border-top: 1px solid #e2e8f0;
          background: #fef5e7;
          border-radius: 0.5rem;
          margin-top: 1rem;
        }

        .remove-tag-btn {
          padding: 0.75rem 1.5rem;
          background: #fed7d7;
          color: #c53030;
          border: 1px solid #feb2b2;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .remove-tag-btn:hover:not(:disabled) {
          background: #fbb6ce;
          border-color: #f687b3;
        }

        .remove-tag-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .remove-tag-info {
          margin: 0.5rem 0 0 0;
          font-size: 0.75rem;
          color: #d69e2e;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1.5rem;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 0 0 1rem 1rem;
        }

        .cancel-btn,
        .save-btn {
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-height: 44px;
        }

        .cancel-btn {
          background: white;
          color: #4a5568;
          border: 1px solid #e2e8f0;
        }

        .cancel-btn:hover:not(:disabled) {
          background: #f7fafc;
          border-color: #cbd5e0;
        }

        .save-btn {
          background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
          color: white;
          border: none;
          box-shadow: 0 2px 4px rgba(72, 187, 120, 0.2);
        }

        .save-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(72, 187, 120, 0.3);
        }

        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .spinner {
          display: inline-block;
          width: 1rem;
          height: 1rem;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Mobile Optimizations */
        @media (max-width: 768px) {
          .modal-overlay {
            align-items: flex-end;
            padding: 0;
          }
          
          .modal-content {
            max-height: 100vh;
            max-height: 100dvh;
            border-radius: 1rem 1rem 0 0;
            margin: 0;
          }
          
          .modal-header,
          .modal-body,
          .modal-footer {
            padding: 1rem;
          }
          
          .media-grid {
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 0.5rem;
          }
          
          .upload-buttons {
            flex-direction: column;
          }
          
          .upload-btn {
            width: 100%;
            justify-content: center;
          }
          
          .modal-footer {
            flex-direction: column;
            padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
          }
          
          .cancel-btn,
          .save-btn {
            width: 100%;
            justify-content: center;
            min-height: 48px;
          }
        }

        @media (max-width: 480px) {
          .modal-header h2 {
            font-size: 1.25rem;
          }
          
          .media-grid {
            grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          }
        }
      `}</style>
    </div>
  );
}
