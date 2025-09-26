// components/PostsFeed.tsx - CORRECTED for actual posts table structure
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";

interface Post {
  id: string;
  user_id: string;
  body: string;
  visibility: string;
  created_at: string;
  images: any[];
  image_url: string | null;
  video_url: string | null;
  media_type: string | null;
  co_creators: string[] | null;
  author?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface PostsFeedProps {
  userId: string;
  viewerUserId?: string | null;
  maxPosts?: number;
}

export default function PostsFeed({ 
  userId, 
  viewerUserId, 
  maxPosts = 20 
}: PostsFeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerRelationship, setViewerRelationship] = useState<'friend' | 'none'>('none');

  useEffect(() => {
    if (userId && viewerUserId) {
      checkViewerRelationship();
    } else {
      loadUserPosts();
    }
  }, [userId, viewerUserId]);

  async function checkViewerRelationship() {
    if (!viewerUserId || !userId) {
      setViewerRelationship('none');
      loadUserPosts();
      return;
    }

    try {
      // Check if viewer is friends with the profile owner
      const { data: friendships } = await supabase
        .from("friendships")
        .select("status")
        .or(`and(user_id.eq.${viewerUserId},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${viewerUserId})`)
        .eq('status', 'accepted');

      setViewerRelationship(friendships && friendships.length > 0 ? 'friend' : 'none');
    } catch (err) {
      console.error('Error checking viewer relationship:', err);
      setViewerRelationship('none');
    }
    
    loadUserPosts();
  }

  async function loadUserPosts() {
    setLoading(true);
    setError(null);
    
    console.log('🔍 DEBUG - Starting to load posts for userId:', userId);
    console.log('🔍 DEBUG - Viewer relationship:', viewerRelationship);
    console.log('🔍 DEBUG - Viewer is profile owner:', viewerUserId === userId);
    
    try {
      // Query the correct 'posts' table with correct column names
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, user_id, body, visibility, created_at, images, image_url, video_url, media_type, co_creators')
        .or(`user_id.eq.${userId},co_creators.cs.{${userId}}`) // Include posts user created OR was tagged as co-creator
        .order('created_at', { ascending: false })
        .limit(maxPosts);
      
      console.log('🔍 DEBUG - Posts query result:', { 
        data: postsData, 
        error: postsError,
        count: postsData?.length || 0
      });
      
      if (postsError) {
        console.error('❌ DEBUG - Posts query error:', postsError);
        setError('Failed to load posts');
        return;
      }

      if (!postsData || postsData.length === 0) {
        console.log('📭 DEBUG - No posts found');
        setPosts([]);
        return;
      }

      // Filter posts based on privacy settings
      const visiblePosts = postsData.filter(post => {
        console.log(`🔒 DEBUG - Checking post ${post.id}: visibility="${post.visibility}", viewer relationship="${viewerRelationship}"`);
        
        // If viewer is the post owner or co-creator, show all posts
        if (viewerUserId === post.user_id || (post.co_creators && post.co_creators.includes(viewerUserId))) {
          console.log('✅ DEBUG - Post visible: viewer is owner/co-creator');
          return true;
        }
        
        // Public posts are visible to everyone
        if (post.visibility === 'public') {
          console.log('✅ DEBUG - Post visible: public post');
          return true;
        }
        
        // Friends posts are visible to friends
        if (post.visibility === 'friends' && viewerRelationship === 'friend') {
          console.log('✅ DEBUG - Post visible: friends post and viewer is friend');
          return true;
        }
        
        // Private posts are only visible to owner (already checked above)
        console.log('❌ DEBUG - Post hidden: privacy restrictions');
        return false;
      });

      console.log(`🎯 DEBUG - Showing ${visiblePosts.length} of ${postsData.length} posts after privacy filtering`);

      // Get author profiles for all visible posts
      const authorIds = [...new Set(visiblePosts.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", authorIds);

      console.log('👤 DEBUG - Author profiles:', profiles);

      // Format posts for display
      const formattedPosts: Post[] = visiblePosts.map(p => {
        const author = profiles?.find(profile => profile.id === p.user_id);
        return {
          ...p,
          author: author || null,
        };
      });

      console.log('🎨 DEBUG - Final formatted posts:', formattedPosts.length);

      setPosts(formattedPosts);
    } catch (err) {
      console.error('❌ DEBUG - Error loading posts:', err);
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="posts-loading">
        <div className="loading-spinner"></div>
        <span>Loading posts...</span>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
          DEBUG: Loading posts for user {userId}
        </p>
        <style jsx>{`
          .posts-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.75rem;
            padding: 3rem 1rem;
          }
          .loading-spinner {
            width: 1.5rem;
            height: 1.5rem;
            border: 2px solid #e5e7eb;
            border-top: 2px solid #8b5cf6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="posts-error">
        <div className="error-icon">⚠️</div>
        <p className="error-text">Unable to load posts</p>
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
          DEBUG: {error} for user {userId}
        </p>
        <button onClick={() => loadUserPosts()} className="retry-btn">
          Try Again
        </button>
        <style jsx>{`
          .posts-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 3rem 1rem;
            text-align: center;
          }
          .error-icon { font-size: 3rem; margin-bottom: 1rem; opacity: 0.5; }
          .error-text { font-size: 1.125rem; font-weight: 600; color: #4b5563; margin: 0 0 1rem 0; }
          .retry-btn { padding: 0.5rem 1rem; background: #8b5cf6; color: white; border: none; border-radius: 0.5rem; cursor: pointer; }
          .retry-btn:hover { background: #7c3aed; }
        `}</style>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="posts-empty">
        <div className="empty-icon">📝</div>
        <p className="empty-text">No posts yet</p>
        <p className="empty-subtext">Posts will appear here when shared</p>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '16px' }}>
          DEBUG: Searched posts table for user {userId} with relationship "{viewerRelationship}"
        </p>
        <style jsx>{`
          .posts-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 3rem 1rem;
            text-align: center;
          }
          .empty-icon { font-size: 3rem; margin-bottom: 1rem; opacity: 0.5; }
          .empty-text { font-size: 1.125rem; font-weight: 600; color: #4b5563; margin: 0 0 0.5rem 0; }
          .empty-subtext { color: #9ca3af; margin: 0; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="posts-feed">
      <div style={{ fontSize: '12px', color: '#666', marginBottom: '16px', textAlign: 'center' }}>
        DEBUG: Showing {posts.length} posts for user {userId} (relationship: {viewerRelationship})
      </div>
      <div className="posts-list">
        {posts.map((post) => (
          <div key={post.id} className="post-card">
            <div className="post-header">
              <div className="author-info">
                <img 
                  src={post.author?.avatar_url || '/default-avatar.png'} 
                  alt=""
                  className="author-avatar"
                />
                <div>
                  <div className="author-name">
                    {post.author?.full_name || 'User'}
                  </div>
                  <div className="post-date">
                    {new Date(post.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="post-privacy-badge">
                {post.visibility}
              </div>
            </div>
            
            <div className="post-content">
              <p className="post-text">{post.body}</p>
              
              {/* Display images if available */}
              {post.images && post.images.length > 0 && (
                <div className="post-images">
                  {post.images.map((img, index) => (
                    <img 
                      key={index}
                      src={img.url} 
                      alt="" 
                      className="post-image"
                    />
                  ))}
                </div>
              )}
              
              {/* Display single image if available */}
              {post.image_url && (
                <div className="post-images">
                  <img src={post.image_url} alt="" className="post-image" />
                </div>
              )}
              
              {/* Display video if available */}
              {post.video_url && (
                <div className="post-video">
                  <video src={post.video_url} controls className="post-video-player" />
                </div>
              )}
              
              {/* Show co-creators if any */}
              {post.co_creators && post.co_creators.length > 0 && (
                <div className="co-creators">
                  <small>With: {post.co_creators.length} collaborator{post.co_creators.length > 1 ? 's' : ''}</small>
                </div>
              )}
              
              <div style={{ fontSize: '10px', color: '#999', marginTop: '8px' }}>
                DEBUG: Post ID {post.id}, Media: {post.media_type || 'none'}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <style jsx>{`
        .posts-feed {
          width: 100%;
        }
        
        .posts-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        
        .post-card {
          background: white;
          border-radius: 0.75rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        
        .post-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 1rem;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .author-info {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }
        
        .author-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }
        
        .author-name {
          font-weight: 600;
          color: #1a202c;
          font-size: 0.9rem;
        }
        
        .post-date {
          font-size: 0.8rem;
          color: #718096;
        }
        
        .post-privacy-badge {
          padding: 0.25rem 0.5rem;
          background: #ede9fe;
          color: #7c3aed;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 500;
        }
        
        .post-content {
          padding: 1rem;
        }
        
        .post-text {
          margin: 0 0 1rem 0;
          line-height: 1.6;
          color: #374151;
        }
        
        .post-images {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        
        .post-image {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
        }
        
        .post-video {
          margin-bottom: 1rem;
        }
        
        .post-video-player {
          width: 100%;
          max-height: 400px;
          border-radius: 0.5rem;
        }
        
        .co-creators {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: #f8f9fa;
          border-radius: 0.375rem;
          border-left: 3px solid #8b5cf6;
        }
        
        .co-creators small {
          color: #6b7280;
          font-style: italic;
        }
        
        @media (max-width: 640px) {
          .post-header {
            padding: 0.75rem;
          }
          
          .post-content {
            padding: 0.75rem;
          }
          
          .author-avatar {
            width: 36px;
            height: 36px;
          }
          
          .post-images {
            gap: 0.25rem;
          }
        }
      `}</style>
    </div>
  );
}
