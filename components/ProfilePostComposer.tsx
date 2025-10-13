// components/ProfilePostComposer.tsx - Post on friend's profile wall
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface ProfilePostComposerProps {
  profileUserId: string; // The profile owner's ID
  currentUserId: string; // The person posting
  profileUserName: string; // The profile owner's name
  onPostCreated?: () => void;
}

interface MutualFriend {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export default function ProfilePostComposer({
  profileUserId,
  currentUserId,
  profileUserName,
  onPostCreated
}: ProfilePostComposerProps) {
  const [postText, setPostText] = useState('');
  const [privacy, setPrivacy] = useState<'friends' | 'private' | 'custom'>('friends');
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [mutualFriends, setMutualFriends] = useState<MutualFriend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [showFriendSelector, setShowFriendSelector] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [characterCount, setCharacterCount] = useState(0);
  const MAX_CHARS = 5000;

  useEffect(() => {
    if (privacy === 'custom') {
      loadMutualFriends();
    }
  }, [privacy]);

  useEffect(() => {
    setCharacterCount(postText.length);
  }, [postText]);

  async function loadMutualFriends() {
    try {
      // Get current user's friends
      const { data: myFriends } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
        .eq('status', 'accepted');

      // Get profile owner's friends
      const { data: theirFriends } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .or(`user_id.eq.${profileUserId},friend_id.eq.${profileUserId}`)
        .eq('status', 'accepted');

      if (myFriends && theirFriends) {
        const myFriendIds = myFriends.map(f => 
          f.user_id === currentUserId ? f.friend_id : f.user_id
        );
        const theirFriendIds = theirFriends.map(f => 
          f.user_id === profileUserId ? f.friend_id : f.user_id
        );

        const mutualIds = myFriendIds.filter(id => theirFriendIds.includes(id));

        if (mutualIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", mutualIds);

          setMutualFriends(profiles || []);
        }
      }
    } catch (err) {
      console.error('Error loading mutual friends:', err);
    }
  }

  function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    
    // Limit to 10 media items
    if (selectedMedia.length + files.length > 10) {
      setMessage('⚠️ Maximum 10 images/videos per post');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    // Validate file sizes (10MB each)
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        setMessage(`⚠️ ${file.name} exceeds 10MB limit`);
        setTimeout(() => setMessage(''), 3000);
        return false;
      }
      return true;
    });

    setSelectedMedia(prev => [...prev, ...validFiles]);

    // Generate previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }

  function removeMedia(index: number) {
    setSelectedMedia(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  }

  function toggleFriendSelection(friendId: string) {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  }

  async function handlePost() {
    if (!postText.trim() && selectedMedia.length === 0) {
      setMessage('⚠️ Please write something or add media');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setPosting(true);
    setMessage('');

    try {
      // Upload media if any
      let uploadedMediaUrls: string[] = [];
      
      if (selectedMedia.length > 0) {
        setUploading(true);
        
        for (const file of selectedMedia) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${currentUserId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('post-media')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            continue;
          }

          const { data } = supabase.storage
            .from('post-media')
            .getPublicUrl(fileName);

          uploadedMediaUrls.push(data.publicUrl);
        }
        
        setUploading(false);
      }

      // Determine visibility and tagged users
      let visibilityValue: 'public' | 'friends' | 'private';
      let taggedUsers: string[] = [];

      if (privacy === 'private') {
        visibilityValue = 'private';
        taggedUsers = [profileUserId]; // Only the two people
      } else if (privacy === 'custom') {
        visibilityValue = 'friends';
        taggedUsers = [profileUserId, ...selectedFriends];
      } else {
        visibilityValue = 'friends'; // All friends of both people
        taggedUsers = [profileUserId];
      }

      // Create the wall post
      const { data: newPost, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: currentUserId,
          posted_on_profile_id: profileUserId, // KEY: This marks it as a wall post
          body: postText.trim(),
          visibility: visibilityValue,
          co_creators: taggedUsers,
          image_url: uploadedMediaUrls[0] || null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (postError) {
        throw postError;
      }

      // If multiple media, save additional ones to post_media table
      if (uploadedMediaUrls.length > 1) {
        const mediaRows = uploadedMediaUrls.slice(1).map((url, index) => ({
          post_id: newPost.id,
          storage_path: url,
          type: selectedMedia[index + 1].type.startsWith('video') ? 'video' : 'image',
          sort_order: index + 1
        }));

        await supabase
          .from('post_media')
          .insert(mediaRows);
      }

      // Success!
      setMessage('✨ Posted on wall!');
      setPostText('');
      setSelectedMedia([]);
      setMediaPreviews([]);
      setSelectedFriends([]);
      setPrivacy('friends');
      
      setTimeout(() => {
        setMessage('');
        if (onPostCreated) onPostCreated();
      }, 2000);

    } catch (err: any) {
      console.error('Error posting:', err);
      setMessage('❌ Failed to post: ' + (err.message || 'Unknown error'));
      setTimeout(() => setMessage(''), 4000);
    } finally {
      setPosting(false);
      setUploading(false);
    }
  }

  const getPrivacyIcon = () => {
    switch (privacy) {
      case 'private': return '🔒';
      case 'custom': return '👥';
      default: return '👫';
    }
  };

  const getPrivacyLabel = () => {
    switch (privacy) {
      case 'private': return 'Private (just you two)';
      case 'custom': return `Custom (${selectedFriends.length} friends)`;
      default: return 'Friends (all mutual friends)';
    }
  };

  return (
    <div className="profile-post-composer">
      <div className="composer-header">
        <h3 className="composer-title">✍️ Write on {profileUserName}'s wall</h3>
      </div>

      {message && (
        <div className={`message ${message.includes('❌') || message.includes('⚠️') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="composer-body">
        <textarea
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          placeholder={`Write something on ${profileUserName}'s wall...`}
          className="post-textarea"
          rows={4}
          maxLength={MAX_CHARS}
          disabled={posting || uploading}
        />

        <div className="char-counter">
          <span className={characterCount > MAX_CHARS * 0.9 ? 'warning' : ''}>
            {characterCount} / {MAX_CHARS}
          </span>
        </div>

        {/* Media Previews */}
        {mediaPreviews.length > 0 && (
          <div className="media-previews">
            {mediaPreviews.map((preview, index) => (
              <div key={index} className="media-preview">
                <img src={preview} alt={`Preview ${index + 1}`} />
                <button
                  onClick={() => removeMedia(index)}
                  className="remove-media-btn"
                  type="button"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Privacy Selector */}
        <div className="privacy-section">
          <button
            onClick={() => setShowPrivacyMenu(!showPrivacyMenu)}
            className="privacy-btn"
            type="button"
          >
            <span className="privacy-icon">{getPrivacyIcon()}</span>
            <span className="privacy-label">{getPrivacyLabel()}</span>
            <span className="dropdown-arrow">▼</span>
          </button>

          {showPrivacyMenu && (
            <div className="privacy-menu">
              <button
                onClick={() => {
                  setPrivacy('friends');
                  setShowPrivacyMenu(false);
                }}
                className={`privacy-option ${privacy === 'friends' ? 'active' : ''}`}
              >
                <span className="option-icon">👫</span>
                <div className="option-text">
                  <div className="option-title">Friends</div>
                  <div className="option-desc">All mutual friends can see</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setPrivacy('private');
                  setShowPrivacyMenu(false);
                }}
                className={`privacy-option ${privacy === 'private' ? 'active' : ''}`}
              >
                <span className="option-icon">🔒</span>
                <div className="option-text">
                  <div className="option-title">Private</div>
                  <div className="option-desc">Only you and {profileUserName}</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setPrivacy('custom');
                  setShowPrivacyMenu(false);
                  setShowFriendSelector(true);
                }}
                className={`privacy-option ${privacy === 'custom' ? 'active' : ''}`}
              >
                <span className="option-icon">👥</span>
                <div className="option-text">
                  <div className="option-title">Custom</div>
                  <div className="option-desc">Select specific friends</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Friend Selector for Custom Privacy */}
        {privacy === 'custom' && showFriendSelector && (
          <div className="friend-selector">
            <div className="selector-header">
              <h4>Select Mutual Friends</h4>
              <button onClick={() => setShowFriendSelector(false)}>✕</button>
            </div>
            <div className="friends-list">
              {mutualFriends.length === 0 ? (
                <p className="no-friends">No mutual friends</p>
              ) : (
                mutualFriends.map(friend => (
                  <label key={friend.id} className="friend-item">
                    <input
                      type="checkbox"
                      checked={selectedFriends.includes(friend.id)}
                      onChange={() => toggleFriendSelection(friend.id)}
                    />
                    <div className="friend-avatar">
                      {friend.avatar_url ? (
                        <img src={friend.avatar_url} alt={friend.full_name || 'Friend'} />
                      ) : (
                        <div className="avatar-placeholder">
                          {(friend.full_name || '?')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="friend-name">{friend.full_name || 'Friend'}</span>
                  </label>
                ))
              )}
            </div>
            <div className="selector-footer">
              <span className="selected-count">
                {selectedFriends.length} selected
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="composer-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleMediaSelect}
            className="hidden-input"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="media-btn"
            type="button"
            disabled={posting || uploading || selectedMedia.length >= 10}
          >
            📷 Add Photo/Video
          </button>

          <button
            onClick={handlePost}
            disabled={posting || uploading || (!postText.trim() && selectedMedia.length === 0)}
            className="post-btn"
            type="button"
          >
            {posting ? 'Posting...' : uploading ? 'Uploading...' : 'Post'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .profile-post-composer {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          margin-bottom: 1.5rem;
        }

        .composer-header {
          margin-bottom: 1rem;
        }

        .composer-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .message {
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .message.success {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #6ee7b7;
        }

        .message.error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }

        .composer-body {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .post-textarea {
          width: 100%;
          padding: 0.875rem;
          border: 2px solid #e5e7eb;
          border-radius: 0.75rem;
          font-size: 0.9375rem;
          font-family: inherit;
          resize: vertical;
          min-height: 100px;
          transition: border-color 0.2s;
        }

        .post-textarea:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .post-textarea:disabled {
          background: #f9fafb;
          cursor: not-allowed;
        }

        .char-counter {
          text-align: right;
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .char-counter .warning {
          color: #dc2626;
          font-weight: 600;
        }

        .media-previews {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 0.75rem;
        }

        .media-preview {
          position: relative;
          aspect-ratio: 1;
          border-radius: 0.5rem;
          overflow: hidden;
          border: 2px solid #e5e7eb;
        }

        .media-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .remove-media-btn {
          position: absolute;
          top: 0.25rem;
          right: 0.25rem;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 0.875rem;
          transition: background 0.2s;
        }

        .remove-media-btn:hover {
          background: rgba(0, 0, 0, 0.9);
        }

        .privacy-section {
          position: relative;
        }

        .privacy-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
          justify-content: space-between;
          min-height: 44px;
        }

        .privacy-btn:hover {
          background: #e5e7eb;
        }

        .privacy-icon {
          font-size: 1.125rem;
        }

        .privacy-label {
          flex: 1;
          text-align: left;
          font-weight: 500;
          color: #374151;
        }

        .dropdown-arrow {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .privacy-menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 10;
          margin-top: 0.5rem;
          overflow: hidden;
        }

        .privacy-option {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 1rem;
          border: none;
          background: white;
          cursor: pointer;
          transition: background 0.2s;
          text-align: left;
          min-height: 44px;
        }

        .privacy-option:hover {
          background: #f9fafb;
        }

        .privacy-option.active {
          background: #ede9fe;
        }

        .privacy-option:not(:last-child) {
          border-bottom: 1px solid #f3f4f6;
        }

        .option-icon {
          font-size: 1.5rem;
        }

        .option-text {
          flex: 1;
        }

        .option-title {
          font-weight: 600;
          color: #1f2937;
          font-size: 0.9375rem;
        }

        .option-desc {
          font-size: 0.8125rem;
          color: #6b7280;
          margin-top: 0.125rem;
        }

        .friend-selector {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 1rem;
        }

        .selector-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .selector-header h4 {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .selector-header button {
          background: none;
          border: none;
          font-size: 1.25rem;
          color: #6b7280;
          cursor: pointer;
          padding: 0.25rem;
          line-height: 1;
        }

        .friends-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 200px;
          overflow-y: auto;
        }

        .friend-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.625rem;
          background: white;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: background 0.2s;
          min-height: 44px;
        }

        .friend-item:hover {
          background: #f3f4f6;
        }

        .friend-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .friend-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
        }

        .friend-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .friend-name {
          font-size: 0.875rem;
          color: #374151;
          font-weight: 500;
        }

        .no-friends {
          text-align: center;
          color: #9ca3af;
          font-size: 0.875rem;
          padding: 1rem;
          margin: 0;
        }

        .selector-footer {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid #e5e7eb;
        }

        .selected-count {
          font-size: 0.8125rem;
          color: #6b7280;
          font-weight: 500;
        }

        .composer-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          padding-top: 0.5rem;
          border-top: 1px solid #f3f4f6;
        }

        .hidden-input {
          display: none;
        }

        .media-btn {
          padding: 0.625rem 1.25rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;
          min-height: 44px;
        }

        .media-btn:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .media-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .post-btn {
          padding: 0.625rem 1.5rem;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-left: auto;
          min-height: 44px;
        }

        .post-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .post-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .post-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .profile-post-composer {
            padding: 1rem;
            border-radius: 0.75rem;
          }

          .composer-title {
            font-size: 1rem;
          }

          .post-textarea {
            font-size: 0.875rem;
            padding: 0.75rem;
          }

          .composer-actions {
            flex-direction: column;
          }

          .media-btn,
          .post-btn {
            width: 100%;
          }

          .post-btn {
            margin-left: 0;
          }
        }
      `}</style>
    </div>
  );
}
