// components/PostsFeed.tsx - CORRECTED for your actual database structure
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";

interface Post {
  id: string;
  user_id: string;
  content: string;
  post_type: string;
  created_at: string;
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

  useEffect(() => {
    if (userId) {
      loadUserPosts();
    }
  }, [userId]);

  async function loadUserPosts() {
    setLoading(true);
    setError(null);
    
    try {
      // Query feed_posts table with correct column names
      const { data: postsData, error: postsError } = await supabase
        .from('feed_posts')
        .select('id, user_id, content, post_type, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(maxPosts);
      
      if (postsError) {
        console.error('Posts query error:', postsError);
        setError('Failed to load posts');
        return;
      }

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        return;
      }

      // Get author profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", userId)
        .single();

      // Format posts for display
      const formattedPosts: Post[] = postsData.map(p => ({
        id: p.id,
        user_id: p.user_id,
        content: p.content || '',
        post_type: p.post_type || 'text',
        created_at: p.created_at,
        author: profile || null,
      }));

      setPosts(formattedPosts);
    } catch (err) {
      console.error('Error loading posts:', err);
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
        <style jsx>{`
          .posts-loading {
            display: flex;
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
              {post.post_type && (
                <div className="post-type-badge">
                  {post.post_type}
                </div>
              )}
            </div>
            
            <div className="post-content">
              <p className="post-text">{post.content}</p>
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
        
        .post-type-badge {
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
          margin: 0;
          line-height: 1.6;
          color: #374151;
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
        }
      `}</style>
    </div>
  );
}
