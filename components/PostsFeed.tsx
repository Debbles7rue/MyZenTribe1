// components/PostsFeed.tsx - Profile Posts Display
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";
import PostCard from '@/components/PostCard';
import { Post } from '@/lib/posts';

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
  const [relationshipType, setRelationshipType] = useState<'friend' | 'none'>('none');

  // Load posts on mount and when userId changes
  useEffect(() => {
    if (userId) {
      checkRelationshipAndLoadPosts();
    }
  }, [userId, viewerUserId]);

  async function checkRelationshipAndLoadPosts() {
    setLoading(true);
    setError(null);
    
    try {
      // Check relationship if viewer is different from profile owner
      if (viewerUserId && viewerUserId !== userId) {
        await checkRelationship();
      }
      
      await loadUserPosts();
    } catch (err) {
      console.error('Error loading posts:', err);
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }

  async function checkRelationship() {
    if (!viewerUserId) return;
    
    try {
      const { data: friendship } = await supabase
        .from("friendships")
        .select("*")
        .or(`and(user_id.eq.${viewerUserId},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${viewerUserId})`)
        .single();

      setRelationshipType(friendship ? 'friend' : 'none');
    } catch (err) {
      console.log('No friendship found');
      setRelationshipType('none');
    }
  }

  async function loadUserPosts() {
    try {
      // Get posts where user is creator OR co-creator
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .or(`user_id.eq.${userId},co_creators.cs.{${userId}}`)
        .order('created_at', { ascending: false })
        .limit(maxPosts);
      
      if (postsError) {
        console.error('Posts query error:', postsError);
        setPosts([]);
        return;
      }

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        return;
      }

      // Filter posts based on privacy and relationship
      const visiblePosts = postsData.filter(post => {
        const privacy = post.privacy || post.visibility || 'friends';
        
        // Own posts are always visible
        if (post.user_id === viewerUserId) return true;
        
        // Public posts are visible to everyone
        if (privacy === 'public') return true;
        
        // Friends posts are visible to friends
        if (privacy === 'friends' && relationshipType === 'friend') return true;
        
        // Private posts only visible to owner
        if (privacy === 'private') return post.user_id === viewerUserId;
        
        // Default to not visible
        return false;
      });

      // Get all unique author IDs
      const authorIds = [...new Set(visiblePosts.map(p => p.user_id))];
      
      // Get author profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", authorIds);

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

      // Get co-creator profiles
      const allCoCreatorIds = visiblePosts
        .filter(p => p.co_creators && p.co_creators.length > 0)
        .flatMap(p => p.co_creators);
      
      let coCreatorProfiles: any[] = [];
      if (allCoCreatorIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", allCoCreatorIds);
        coCreatorProfiles = data || [];
      }
      
      const coCreatorMap = Object.fromEntries(
        coCreatorProfiles.map(p => [p.id, p])
      );

      // Get likes and comments
      const postIds = visiblePosts.map(p => p.id);
      let likeCountBy: Record<string, number> = {};
      let myLikeSet = new Set<string>();
      let commentCountBy: Record<string, number> = {};

      if (postIds.length > 0) {
        try {
          const [{ data: likeCounts }, { data: myLikes }, { data: commentCounts }] = await Promise.all([
            supabase.from("post_likes").select("post_id").in("post_id", postIds),
            viewerUserId ? supabase.from("post_likes").select("post_id").eq("user_id", viewerUserId).in("post_id", postIds) : Promise.resolve({ data: [] }),
            supabase.from("post_comments").select("post_id").in("post_id", postIds),
          ]);

          // Count likes
          const likesPerPost: Record<string, number> = {};
          (likeCounts || []).forEach(like => {
            likesPerPost[like.post_id] = (likesPerPost[like.post_id] || 0) + 1;
          });
          likeCountBy = likesPerPost;
          
          myLikeSet = new Set((myLikes ?? []).map(r => r.post_id));
          
          // Count comments
          const commentsPerPost: Record<string, number> = {};
          (commentCounts || []).forEach(comment => {
            commentsPerPost[comment.post_id] = (commentsPerPost[comment.post_id] || 0) + 1;
          });
          commentCountBy = commentsPerPost;
        } catch (e) {
          console.log("Error loading engagement data:", e);
        }
      }

      // Get additional media
      let mediaByPost: Record<string, any[]> = {};
      if (postIds.length > 0) {
        try {
          const { data: media } = await supabase
            .from("post_media")
            .select("post_id, storage_path, media_type")
            .in("post_id", postIds);
          
          if (media) {
            media.forEach(m => {
              if (!mediaByPost[m.post_id]) mediaByPost[m.post_id] = [];
              
              // Get public URL
              const bucketName = m.media_type === 'video' ? 'post-videos' : 'post-media';
              const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(m.storage_path);
              
              mediaByPost[m.post_id].push({ 
                url: publicUrl, 
                type: m.media_type === 'video' ? 'video' : 'image'
              });
            });
          }
        } catch (e) {
          console.log("Error loading media:", e);
        }
      }

      // Format posts for PostCard component
      const formattedPosts: Post[] = visiblePosts.map(p => ({
        id: p.id,
        user_id: p.user_id,
        body: p.body,
        image_url: p.image_url || null,
        video_url: p.video_url || null,
        privacy: p.visibility || p.privacy || 'public',
        created_at: p.created_at,
        allow_share: p.allow_share ?? true,
        co_creators: p.co_creators || null,
        author: profileMap[p.user_id] || null,
        additional_media: mediaByPost[p.id] || [],
        co_creators_info: p.co_creators?.map((id: string) => coCreatorMap[id]).filter(Boolean) || [],
        like_count: likeCountBy[p.id] ?? 0,
        liked_by_me: myLikeSet.has(p.id),
        comment_count: commentCountBy[p.id] ?? 0,
      }));

      setPosts(formattedPosts);
    } catch (err) {
      console.error('Error loading posts:', err);
      throw err;
    }
  }

  // Refresh posts function for PostCard callbacks
  const handlePostChanged = () => {
    loadUserPosts();
  };

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
            text-align: center;
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
        <button 
          onClick={() => checkRelationshipAndLoadPosts()} 
          className="retry-btn"
        >
          Try Again
        </button>
        <style jsx>{`
          .posts-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 3rem 1rem;
            text-align: center;
          }
          .error-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
            opacity: 0.5;
          }
          .error-text {
            font-size: 1.125rem;
            font-weight: 600;
            color: #4b5563;
            margin: 0 0 1rem 0;
          }
          .retry-btn {
            padding: 0.5rem 1rem;
            background: #8b5cf6;
            color: white;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            transition: background 0.2s;
          }
          .retry-btn:hover {
            background: #7c3aed;
          }
        `}</style>
      </div>
    );
  }

  if (posts.length === 0) {
    const isOwnProfile = userId === viewerUserId;
    
    return (
      <div className="posts-empty">
        <div className="empty-icon">📝</div>
        <p className="empty-text">
          {isOwnProfile ? "No posts yet" : "No posts to show"}
        </p>
        <p className="empty-subtext">
          {isOwnProfile 
            ? "Share your first moment!" 
            : relationshipType === 'friend' 
              ? "Posts will appear here when shared"
              : "Connect as friends to see posts"
          }
        </p>
        <style jsx>{`
          .posts-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 3rem 1rem;
            text-align: center;
          }
          .empty-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
            opacity: 0.5;
          }
          .empty-text {
            font-size: 1.125rem;
            font-weight: 600;
            color: #4b5563;
            margin: 0 0 0.5rem 0;
          }
          .empty-subtext {
            color: #9ca3af;
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="posts-feed">
      <div className="posts-list">
        {posts.map((post) => (
          <PostCard 
            key={post.id} 
            post={post} 
            onChanged={handlePostChanged}
            currentUserId={viewerUserId}
          />
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
        
        /* Ensure PostCard styles are properly contained */
        .posts-list :global(.post-card) {
          width: 100%;
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
}
