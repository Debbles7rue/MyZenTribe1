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
      case 'private': return 'Just you two';
      case 'custom': return `${selectedFriends.length} friends`;
      default: return 'Mutual friends';
    }
  };

  return (
    <div className="profile-post-composer">
      <div className="composer-card">
        <div className="composer-header">
          <span className="wall-icon">✍️</span>
          <span className="wall-text">Write on <strong>{profileUserName}'s</strong> wall</span>
        </div>

        {message && (
          <div className={`message ${message.includes('❌') || message.includes('⚠️') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        <textarea
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          placeholder={`Share something with ${profileUserName}...`}
          className="post-textarea"
          rows={3}
          maxLength={MAX_CHARS}
          disabled={posting || uploading}
        />

        {characterCount > 0 && (
          <div className="char-counter">
            <span className={characterCount > MAX_CHARS * 0.9 ? 'warning' : ''}>
              {characterCount} / {MAX_CHARS}
            </span>
          </div>
        )}

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
                <div className="option-title">Mutual Friends</div>
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

        {/* Friend Selector for Custom Privacy */}
        {privacy === 'custom' && showFriendSelector && (
          <div className="friend-selector">
            <div className="selector-header">
              <h4>Select Friends</h4>
              <button onClick={() => setShowFriendSelector(false)} type="button">✕</button>
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
            {selectedFriends.length > 0 && (
              <div className="selector-footer">
                <span className="selected-count">{selectedFriends.length} selected</span>
              </div>
            )}
          </div>
        )}

        {/* Action Bar */}
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
            className="action-icon-btn"
            type="button"
            disabled={posting || uploading || selectedMedia.length >= 10}
            title="Add photo/video"
          >
            📷
          </button>

          <button
            onClick={() => setShowPrivacyMenu(!showPrivacyMenu)}
            className="privacy-compact-btn"
            type="button"
            title="Privacy settings"
          >
            <span className="privacy-icon-small">{getPrivacyIcon()}</span>
            <span className="privacy-label-small">{getPrivacyLabel()}</span>
          </button>

          <button
            onClick={handlePost}
            disabled={posting || uploading || (!postText.trim() && selectedMedia.length === 0)}
            className="post-btn"
            type="button"
          >
            {posting ? '⏳' : uploading ? '📤' : 'Post'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .profile-post-composer {
          margin-bottom: 1.5rem;
        }

        .composer-card {
          background: white;
          border-radius: 1rem;
          padding: 1.25rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          border: 2px solid transparent;
          background-image: linear-gradient(white, white), 
                            linear-gradient(135deg, #c084fc, #a78bfa);
          background-origin: border-box;
          background-clip: padding-box, border-box;
          transition: all 0.3s ease;
        }

        .composer-card:focus-within {
          box-shadow: 0 4px 16px rgba(139,92,246,0.15);
        }

        .composer-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.875rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #f3f4f6;
        }

        .wall-icon {
          font-size: 1.25rem;
        }

        .wall-text {
          font-size: 0.9375rem;
          color: #6b7280;
          font-weight: 500;
        }

        .wall-text strong {
          color: #8b5cf6;
          font-weight: 600;
        }

        .message {
          padding: 0.625rem 0.875rem;
          border-radius: 0.5rem;
          margin-bottom: 0.875rem;
          font-size: 0.8125rem;
          font-weight: 500;
          text-align: center;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .message.success {
          background: linear-gradient(135deg, #d1fae5, #a7f3d0);
          color: #065f46;
        }

        .message.error {
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          color: #991b1b;
        }

        .post-textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1.5px solid #e5e7eb;
          border-radius: 0.625rem;
          font-size: 0.9375rem;
          font-family: inherit;
          resize: vertical;
          min-height: 80px;
          transition: all 0.2s ease;
          background: #fafafa;
        }

        .post-textarea:focus {
          outline: none;
          border-color: #c084fc;
          background: white;
          box-shadow: 0 0 0 3px rgba(192, 132, 252, 0.1);
        }

        .post-textarea:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .post-textarea::placeholder {
          color: #9ca3af;
        }

        .char-counter {
          text-align: right;
          font-size: 0.6875rem;
          color: #9ca3af;
          margin-top: 0.375rem;
          margin-bottom: 0.5rem;
        }

        .char-counter .warning {
          color: #dc2626;
          font-weight: 600;
        }

        .media-previews {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          gap: 0.5rem;
          margin-top: 0.875rem;
          margin-bottom: 0.875rem;
        }

        .media-preview {
          position: relative;
          aspect-ratio: 1;
          border-radius: 0.5rem;
          overflow: hidden;
          border: 2px solid #e5e7eb;
          transition: transform 0.2s ease;
        }

        .media-preview:hover {
          transform: scale(1.02);
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
          background: rgba(0, 0, 0, 0.75);
          color: white;
          border: none;
          border-radius: 50%;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 0.75rem;
          transition: all 0.2s ease;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .remove-media-btn:hover {
          background: rgba(220, 38, 38, 0.9);
          transform: scale(1.1);
        }

        .remove-media-btn:active {
          transform: scale(0.95);
        }

        .privacy-menu {
          position: absolute;
          bottom: calc(100% + 0.5rem);
          right: 0;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
          z-index: 20;
          overflow: hidden;
          min-width: 240px;
          animation: slideUp 0.2s ease;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .privacy-option {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.875rem 1rem;
          border: none;
          background: white;
          cursor: pointer;
          transition: background 0.2s ease;
          text-align: left;
          min-height: 44px;
          -webkit-tap-highlight-color: rgba(139, 92, 246, 0.1);
          touch-action: manipulation;
        }

        .privacy-option:hover {
          background: #f9fafb;
        }

        .privacy-option.active {
          background: linear-gradient(135deg, rgba(196, 132, 252, 0.1), rgba(167, 139, 250, 0.1));
        }

        .privacy-option:not(:last-child) {
          border-bottom: 1px solid #f3f4f6;
        }

        .option-icon {
          font-size: 1.375rem;
        }

        .option-text {
          flex: 1;
        }

        .option-title {
          font-weight: 600;
          color: #1f2937;
          font-size: 0.875rem;
          line-height: 1.3;
        }

        .option-desc {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.125rem;
        }

        .friend-selector {
          background: #f9fafb;
          border: 1.5px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 0.875rem;
          margin-top: 0.875rem;
        }

        .selector-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .selector-header h4 {
          font-size: 0.875rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .selector-header button {
          background: none;
          border: none;
          font-size: 1.125rem;
          color: #6b7280;
          cursor: pointer;
          padding: 0.25rem;
          line-height: 1;
          transition: color 0.2s;
          min-height: 32px;
          min-width: 32px;
        }

        .selector-header button:hover {
          color: #374151;
        }

        .friends-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 180px;
          overflow-y: auto;
          padding: 0.25rem;
        }

        .friends-list::-webkit-scrollbar {
          width: 6px;
        }

        .friends-list::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 3px;
        }

        .friends-list::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }

        .friend-item {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.5rem;
          background: white;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 44px;
          -webkit-tap-highlight-color: rgba(139, 92, 246, 0.1);
          touch-action: manipulation;
        }

        .friend-item:hover {
          background: #f3f4f6;
          transform: translateX(2px);
        }

        .friend-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #8b5cf6;
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
          background: linear-gradient(135deg, #c084fc, #a78bfa);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.8125rem;
        }

        .friend-name {
          font-size: 0.8125rem;
          color: #374151;
          font-weight: 500;
        }

        .no-friends {
          text-align: center;
          color: #9ca3af;
          font-size: 0.8125rem;
          padding: 1.5rem 1rem;
          margin: 0;
        }

        .selector-footer {
          margin-top: 0.75rem;
          padding-top: 0.625rem;
          border-top: 1px solid #e5e7eb;
        }

        .selected-count {
          font-size: 0.75rem;
          color: #8b5cf6;
          font-weight: 600;
        }

        .composer-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          margin-top: 0.875rem;
          padding-top: 0.875rem;
          border-top: 1px solid #f3f4f6;
          position: relative;
        }

        .hidden-input {
          display: none;
        }

        .action-icon-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f9fafb;
          border: 1.5px solid #e5e7eb;
          border-radius: 0.5rem;
          font-size: 1.25rem;
          cursor: pointer;
          transition: all 0.2s ease;
          -webkit-tap-highlight-color: rgba(139, 92, 246, 0.1);
          touch-action: manipulation;
        }

        .action-icon-btn:hover:not(:disabled) {
          background: white;
          border-color: #c084fc;
          transform: translateY(-1px);
        }

        .action-icon-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .action-icon-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .privacy-compact-btn {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0 0.75rem;
          height: 40px;
          background: #f9fafb;
          border: 1.5px solid #e5e7eb;
          border-radius: 0.5rem;
          font-size: 0.8125rem;
          font-weight: 500;
          color: #4b5563;
          cursor: pointer;
          transition: all 0.2s ease;
          -webkit-tap-highlight-color: rgba(139, 92, 246, 0.1);
          touch-action: manipulation;
        }

        .privacy-compact-btn:hover {
          background: white;
          border-color: #c084fc;
        }

        .privacy-icon-small {
          font-size: 1rem;
        }

        .privacy-label-small {
          font-size: 0.8125rem;
        }

        .post-btn {
          padding: 0 1.25rem;
          height: 40px;
          background: linear-gradient(135deg, #c084fc, #a78bfa);
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-left: auto;
          box-shadow: 0 2px 8px rgba(192, 132, 252, 0.3);
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .post-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #a78bfa, #9333ea);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(192, 132, 252, 0.4);
        }

        .post-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .post-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        @media (max-width: 640px) {
          .composer-card {
            padding: 1rem;
            border-radius: 0.875rem;
          }

          .wall-text {
            font-size: 0.875rem;
          }

          .post-textarea {
            font-size: 0.875rem;
            padding: 0.625rem;
            min-height: 70px;
          }

          .media-previews {
            grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
          }

          .composer-actions {
            gap: 0.375rem;
          }

          .privacy-label-small {
            display: none;
          }

          .privacy-compact-btn {
            width: 40px;
            padding: 0;
            justify-content: center;
          }

          .post-btn {
            padding: 0 1rem;
            font-size: 0.8125rem;
          }
        }
      `}</style>
    </div>
  );
}
