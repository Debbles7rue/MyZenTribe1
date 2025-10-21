// components/PostsFeed.tsx - Updated to use PostCard component with Wall Post Support
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";
import PostCard from "@/components/PostCard";
import { Post } from "@/lib/posts";

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
  console.log('🔍 PostsFeed Debug:', { userId, viewerUserId, maxPosts });
    
    try {
      // Get posts for this user - including wall posts and posted_on_profile_id
      let query = supabase
        .from('posts')
        .select('*, posted_on_profile_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(maxPosts);

      const { data: postsData, error: postsError } = await query;
      
      if (postsError) {
        console.error('Posts query error:', postsError);
        setError('Failed to load posts');
        return;
      }

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        return;
      }

      // Filter posts based on privacy settings
      const visiblePosts = postsData.filter(post => {
        // If viewer is the post owner, show all posts
        if (viewerUserId === post.user_id) {
          return true;
        }
        
        // Public posts are visible to everyone
        if (post.visibility === 'public') {
          return true;
        }
        
        // Friends posts are visible to friends
        if (post.visibility === 'friends' && viewerRelationship === 'friend') {
          return true;
        }
        
        // Private posts are only visible to owner (already checked above)
        return false;
      });

      // Get author profiles for all visible posts
      const authorIds = [...new Set(visiblePosts.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", authorIds);

      // 🔥 NEW: Get wall post target profiles (posted_on_profile_id)
      const wallPostTargetIds = [...new Set(
        visiblePosts
          .filter(p => p.posted_on_profile_id)
          .map(p => p.posted_on_profile_id)
      )];
      
      let wallPostProfiles: any[] = [];
      if (wallPostTargetIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", wallPostTargetIds);
        wallPostProfiles = data || [];
      }

      // Get co-creator info if they exist
      const coCreatorIds = visiblePosts
        .filter((p: any) => p.co_creators && p.co_creators.length > 0)
        .flatMap((p: any) => p.co_creators);
      
      let coCreatorProfiles: any[] = [];
      if (coCreatorIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", coCreatorIds);
        coCreatorProfiles = data || [];
      }
      
      const coCreatorMap = Object.fromEntries(
        coCreatorProfiles.map((p: any) => [p.id, p])
      );

      const wallPostProfileMap = Object.fromEntries(
        wallPostProfiles.map((p: any) => [p.id, p])
      );

      // Get likes and comments for these posts
      const postIds = visiblePosts.map(p => p.id);
      
      let likeCountBy: Record<string, number> = {};
      let myLikeSet = new Set<string>();
      let commentCountBy: Record<string, number> = {};

      try {
        // Get all likes for these posts
        const { data: likeCounts } = await supabase
          .from("post_likes")
          .select("post_id")
          .in("post_id", postIds);

        // Get my likes
        if (viewerUserId) {
          const { data: myLikes } = await supabase
            .from("post_likes")
            .select("post_id")
            .eq("user_id", viewerUserId)
            .in("post_id", postIds);

          if (myLikes) {
            myLikeSet = new Set(myLikes.map((r: any) => r.post_id));
          }
        }

        // Get all comments for these posts
        const { data: commentCounts } = await supabase
          .from("post_comments")
          .select("post_id")
          .in("post_id", postIds);

        // Count likes per post
        if (likeCounts) {
          likeCounts.forEach((like: any) => {
            likeCountBy[like.post_id] = (likeCountBy[like.post_id] || 0) + 1;
          });
        }
        
        // Count comments per post
        if (commentCounts) {
          commentCounts.forEach((comment: any) => {
            commentCountBy[comment.post_id] = (commentCountBy[comment.post_id] || 0) + 1;
          });
        }
      } catch (e) {
        console.log("Error fetching likes/comments:", e);
      }

      // Get additional media from post_media table
      let mediaByPost: Record<string, Array<{url: string; type: 'image' | 'video'}>> = {};
      
      try {
        const { data: allMediaRows, error: mediaError } = await supabase
          .from("post_media")
          .select("post_id, storage_path, type")
          .in("post_id", postIds)
          .order("sort_order", { ascending: true });
        
        if (!mediaError && allMediaRows) {
          // Group media by post_id
          for (const media of allMediaRows) {
            if (!mediaByPost[media.post_id]) {
              mediaByPost[media.post_id] = [];
            }
            
            // Get public URL from storage path
            const { data } = supabase.storage
              .from('post-media')
              .getPublicUrl(media.storage_path);
            
            mediaByPost[media.post_id].push({
              url: data.publicUrl,
              type: media.type as 'image' | 'video'
            });
          }
        }
      } catch (e) {
        console.log("Error fetching media:", e);
      }

      // Format posts for PostCard component
      const formattedPosts: Post[] = visiblePosts.map((p: any) => {
        const author = profiles?.find(profile => profile.id === p.user_id);
        const postMedia = mediaByPost[p.id] || [];
        
        return {
          id: p.id,
          user_id: p.user_id,
          body: p.body,
          image_url: p.image_url || null,
          video_url: p.video_url || null,
          privacy: p.visibility || 'public',
          created_at: p.created_at,
          allow_share: p.allow_share ?? true,
          co_creators: p.co_creators || null,
          author: author || null,
          additional_media: postMedia,
          co_creators_info: p.co_creators?.map((id: string) => coCreatorMap[id]).filter(Boolean) || [],
          like_count: likeCountBy[p.id] ?? 0,
          liked_by_me: myLikeSet.has(p.id),
          comment_count: commentCountBy[p.id] ?? 0,
          // 🔥 NEW: Include wall post data
          posted_on_profile_id: p.posted_on_profile_id || null,
          posted_on_profile: p.posted_on_profile_id ? wallPostProfileMap[p.posted_on_profile_id] : null,
        };
      });

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
          <PostCard 
            key={post.id} 
            post={post} 
            onChanged={loadUserPosts}
            currentUserId={viewerUserId || undefined}
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
      `}</style>
    </div>
  );
}
