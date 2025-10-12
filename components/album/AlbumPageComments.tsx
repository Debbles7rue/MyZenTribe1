// components/album/AlbumPageComments.tsx
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Comment = {
  id: string;
  comment_text: string;
  created_at: string;
  user_id: string;
  user?: {
    full_name: string;
    avatar_url: string;
  };
  reactions?: Reaction[];
};

type Reaction = {
  id: string;
  reaction_type: string;
  user_id: string;
};

type ReactionCount = {
  type: string;
  count: number;
  userReacted: boolean;
};

const REACTIONS = [
  { type: 'thumbs_up', emoji: '👍', label: 'Like' },
  { type: 'heart', emoji: '❤️', label: 'Love' },
  { type: 'laugh', emoji: '😂', label: 'Funny' },
  { type: 'wow', emoji: '😮', label: 'Wow' },
  { type: 'sad', emoji: '😢', label: 'Sad' },
  { type: 'clap', emoji: '👏', label: 'Applause' }
];

type Props = {
  pageId: string;
  albumId: string;
  currentUserId: string | null;
};

export default function AlbumPageComments({ pageId, albumId, currentUserId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);

  useEffect(() => {
    if (isExpanded) {
      loadComments();
    }
  }, [pageId, isExpanded]);

  // Real-time subscription to comments
  useEffect(() => {
    if (!isExpanded) return;

    const commentsSubscription = supabase
      .channel(`comments-${pageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'album_page_comments',
          filter: `page_id=eq.${pageId}`
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    const reactionsSubscription = supabase
      .channel(`reactions-${pageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'album_comment_reactions'
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      commentsSubscription.unsubscribe();
      reactionsSubscription.unsubscribe();
    };
  }, [pageId, isExpanded]);

  async function loadComments() {
    setLoading(true);
    try {
      // Load comments with user info
      const { data: commentsData, error: commentsError } = await supabase
        .from('album_page_comments')
        .select(`
          *,
          user:profiles!user_id(full_name, avatar_url)
        `)
        .eq('page_id', pageId)
        .order('created_at', { ascending: false });

      if (commentsError) throw commentsError;

      if (commentsData) {
        // Load reactions for all comments
        const commentIds = commentsData.map(c => c.id);
        const { data: reactionsData } = await supabase
          .from('album_comment_reactions')
          .select('*')
          .in('comment_id', commentIds);

        // Attach reactions to comments
        const commentsWithReactions = commentsData.map(comment => ({
          ...comment,
          reactions: reactionsData?.filter(r => r.comment_id === comment.id) || []
        }));

        setComments(commentsWithReactions);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitComment() {
    if (!currentUserId || !newComment.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('album_page_comments')
        .insert({
          page_id: pageId,
          album_id: albumId,
          user_id: currentUserId,
          comment_text: newComment.trim()
        });

      if (error) throw error;

      setNewComment('');
      loadComments();
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm('Delete this comment?')) return;

    try {
      const { error } = await supabase
        .from('album_page_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      loadComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment.');
    }
  }

  async function handleReaction(commentId: string, reactionType: string) {
    if (!currentUserId) return;

    try {
      // Check if user already reacted with this type
      const existingReaction = comments
        .find(c => c.id === commentId)
        ?.reactions?.find(r => r.user_id === currentUserId && r.reaction_type === reactionType);

      if (existingReaction) {
        // Remove reaction
        await supabase
          .from('album_comment_reactions')
          .delete()
          .eq('id', existingReaction.id);
      } else {
        // Add reaction (remove other reactions from this user first)
        const userReactions = comments
          .find(c => c.id === commentId)
          ?.reactions?.filter(r => r.user_id === currentUserId);

        if (userReactions && userReactions.length > 0) {
          await supabase
            .from('album_comment_reactions')
            .delete()
            .in('id', userReactions.map(r => r.id));
        }

        await supabase
          .from('album_comment_reactions')
          .insert({
            comment_id: commentId,
            user_id: currentUserId,
            reaction_type: reactionType
          });
      }

      setShowReactionPicker(null);
      loadComments();
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  }

  function getReactionCounts(comment: Comment): ReactionCount[] {
    const counts: { [key: string]: ReactionCount } = {};

    comment.reactions?.forEach(reaction => {
      if (!counts[reaction.reaction_type]) {
        counts[reaction.reaction_type] = {
          type: reaction.reaction_type,
          count: 0,
          userReacted: false
        };
      }
      counts[reaction.reaction_type].count++;
      if (reaction.user_id === currentUserId) {
        counts[reaction.reaction_type].userReacted = true;
      }
    });

    return Object.values(counts).filter(c => c.count > 0);
  }

  function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden comments-container">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors comments-header"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <span className="font-semibold">Comments</span>
          <span className="text-sm text-gray-500">({comments.length})</span>
        </div>
        <span className="text-gray-400 text-xl">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {/* Comments Section */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {/* Add Comment */}
          {currentUserId && (
            <div className="p-4 border-b border-gray-200 bg-gray-50 add-comment-section">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none comment-textarea"
                rows={2}
                maxLength={500}
                disabled={submitting}
              />
              <div className="flex justify-between items-center mt-2 comment-actions">
                <span className="text-xs text-gray-500 char-count">
                  {newComment.length}/500
                </span>
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || submitting}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors post-button"
                >
                  {submitting ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </div>
          )}

          {/* Comments List */}
          <div className="max-h-96 overflow-y-auto comments-list">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="loading-spinner mb-2"></div>
                Loading comments...
              </div>
            ) : comments.length === 0 ? (
              <div className="p-8 text-center text-gray-500 empty-state">
                <p className="text-3xl mb-2">💭</p>
                <p>No comments yet. Be the first to comment!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {comments.map((comment) => {
                  const reactionCounts = getReactionCounts(comment);
                  return (
                    <div key={comment.id} className="p-4 hover:bg-gray-50 transition-colors comment-item">
                      {/* Comment Header */}
                      <div className="flex items-start gap-3">
                        {comment.user?.avatar_url ? (
                          <img
                            src={comment.user.avatar_url}
                            alt={comment.user.full_name}
                            className="w-8 h-8 rounded-full comment-avatar"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-600 font-semibold comment-avatar">
                            {comment.user?.full_name?.[0] || '?'}
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0 comment-content">
                          <div className="flex items-center gap-2 flex-wrap comment-meta">
                            <span className="font-semibold text-sm">
                              {comment.user?.full_name || 'Unknown User'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(comment.created_at)}
                            </span>
                            {comment.user_id === currentUserId && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-xs text-red-500 hover:text-red-700 ml-auto delete-button"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                          
                          {/* Comment Text */}
                          <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap break-words comment-text">
                            {comment.comment_text}
                          </p>

                          {/* Reactions */}
                          <div className="mt-2 flex items-center gap-2 flex-wrap reactions-section">
                            {reactionCounts.map((reaction) => {
                              const reactionDef = REACTIONS.find(r => r.type === reaction.type);
                              return (
                                <button
                                  key={reaction.type}
                                  onClick={() => handleReaction(comment.id, reaction.type)}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all reaction-button ${
                                    reaction.userReacted
                                      ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  <span>{reactionDef?.emoji}</span>
                                  <span className="font-semibold">{reaction.count}</span>
                                </button>
                              );
                            })}

                            {/* Add Reaction Button */}
                            {currentUserId && (
                              <div className="relative add-reaction-container">
                                <button
                                  onClick={() => setShowReactionPicker(
                                    showReactionPicker === comment.id ? null : comment.id
                                  )}
                                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors add-reaction-button"
                                >
                                  + Add Reaction
                                </button>

                                {/* Reaction Picker */}
                                {showReactionPicker === comment.id && (
                                  <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex gap-1 z-10 reaction-picker">
                                    {REACTIONS.map((reaction) => (
                                      <button
                                        key={reaction.type}
                                        onClick={() => handleReaction(comment.id, reaction.type)}
                                        className="text-2xl hover:scale-125 transition-transform p-1 reaction-emoji"
                                        title={reaction.label}
                                      >
                                        {reaction.emoji}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .loading-spinner {
          width: 1.5rem;
          height: 1.5rem;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Mobile Optimizations */
        @media (max-width: 768px) {
          .comments-header {
            padding: 0.875rem 0.75rem;
            touch-action: manipulation;
          }

          .comments-header span {
            font-size: 14px;
          }

          .add-comment-section {
            padding: 0.875rem;
          }

          .comment-textarea {
            padding: 0.75rem;
            font-size: 16px; /* Prevents iOS zoom */
          }

          .comment-actions {
            flex-direction: row;
            gap: 0.5rem;
          }

          .char-count {
            font-size: 11px;
          }

          .post-button {
            padding: 0.75rem 1rem;
            font-size: 14px;
            touch-action: manipulation;
            white-space: nowrap;
          }

          .comments-list {
            max-height: 70vh;
          }

          .empty-state {
            padding: 2rem 1rem;
          }

          .empty-state p {
            font-size: 14px;
          }

          .comment-item {
            padding: 0.875rem;
          }

          .comment-avatar {
            width: 32px;
            height: 32px;
            flex-shrink: 0;
          }

          .comment-content {
            min-width: 0;
          }

          .comment-meta {
            gap: 0.5rem;
          }

          .comment-meta span {
            font-size: 13px;
          }

          .delete-button {
            font-size: 11px;
            padding: 0.25rem 0.5rem;
            touch-action: manipulation;
          }

          .comment-text {
            font-size: 14px;
            line-height: 1.5;
          }

          .reactions-section {
            gap: 0.375rem;
            margin-top: 0.5rem;
          }

          .reaction-button {
            padding: 0.375rem 0.625rem;
            font-size: 11px;
            touch-action: manipulation;
          }

          .reaction-button span {
            font-size: 14px;
          }

          .add-reaction-button {
            font-size: 11px;
            padding: 0.375rem 0.625rem;
            touch-action: manipulation;
          }

          .reaction-picker {
            padding: 0.5rem;
            gap: 0.375rem;
            flex-wrap: wrap;
            max-width: 90vw;
          }

          .reaction-emoji {
            font-size: 1.75rem;
            padding: 0.375rem;
            touch-action: manipulation;
          }
        }

        /* Small mobile screens */
        @media (max-width: 480px) {
          .comments-header {
            padding: 0.75rem;
          }

          .add-comment-section {
            padding: 0.75rem;
          }

          .comment-textarea {
            font-size: 16px;
          }

          .post-button {
            padding: 0.625rem 0.875rem;
            font-size: 13px;
          }

          .comment-item {
            padding: 0.75rem;
          }

          .comment-avatar {
            width: 28px;
            height: 28px;
          }

          .comment-meta span {
            font-size: 12px;
          }

          .comment-text {
            font-size: 13px;
          }

          .reaction-button {
            padding: 0.25rem 0.5rem;
          }

          .reaction-button span {
            font-size: 13px;
          }

          .add-reaction-button {
            font-size: 10px;
            padding: 0.25rem 0.5rem;
          }

          .reaction-emoji {
            font-size: 1.5rem;
          }
        }

        /* Landscape mobile orientation */
        @media (max-width: 768px) and (orientation: landscape) {
          .comments-list {
            max-height: 50vh;
          }
        }
      `}</style>
    </div>
  );
}
