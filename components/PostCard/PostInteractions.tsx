// components/PostCard/PostInteractions.tsx
"use client";

import { Post } from "@/lib/posts";
import styles from "./styles.module.css";

interface Comment {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  author?: {
    full_name: string;
    avatar_url: string;
  };
}

interface PostInteractionsProps {
  post: Post;
  localLikeCount: number;
  localLikedByMe: boolean;
  isLiking: boolean;
  currentUserId?: string;
  comments: Comment[];
  showAllComments: boolean;
  showCommentInput: boolean;
  commentText: string;
  isCommenting: boolean;
  allCommentsCount: number;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onToggleCommentInput: () => void;
  onCommentTextChange: (text: string) => void;
  onShowAllComments: () => void;
}

export default function PostInteractions({
  post,
  localLikeCount,
  localLikedByMe,
  isLiking,
  currentUserId,
  comments,
  showAllComments,
  showCommentInput,
  commentText,
  isCommenting,
  allCommentsCount,
  onLike,
  onComment,
  onShare,
  onToggleCommentInput,
  onCommentTextChange,
  onShowAllComments
}: PostInteractionsProps) {
  
  return (
    <div className={styles.postFooter}>
      <div className={styles.engagementStats}>
        {localLikeCount > 0 && (
          <span>{localLikeCount} likes</span>
        )}
        {post.comment_count > 0 && (
          <span>{post.comment_count} comments</span>
        )}
      </div>
      
      <div className={styles.actionButtons}>
        <button 
          className={`${styles.actionBtn} ${localLikedByMe ? styles.liked : ''}`}
          onClick={onLike}
          disabled={isLiking || !currentUserId}
        >
          {localLikedByMe ? '❤️' : '🤍'} Like
        </button>
        <button 
          className={styles.actionBtn}
          onClick={onToggleCommentInput}
          disabled={!currentUserId}
        >
          💬 Comment
        </button>
        {post.allow_share && (
          <button 
            className={styles.actionBtn}
            onClick={onShare}
          >
            🔄 Share
          </button>
        )}
      </div>
      
      {comments.length > 0 && (
        <div className={styles.commentsSection}>
          {comments.map((comment) => (
            <div key={comment.id} className={styles.comment}>
              <img 
                src={comment.author?.avatar_url || '/default-avatar.png'} 
                alt=""
                className={styles.commentAvatar}
              />
              <div className={styles.commentContent}>
                <div className={styles.commentAuthor}>{comment.author?.full_name}</div>
                <div className={styles.commentText}>{comment.body}</div>
                <div className={styles.commentTime}>
                  {new Date(comment.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
          
          {allCommentsCount > 3 && !showAllComments && (
            <button 
              className={styles.showMoreComments}
              onClick={onShowAllComments}
            >
              View all {allCommentsCount} comments
            </button>
          )}
        </div>
      )}
      
      {showCommentInput && (
        <div className={styles.commentInputSection}>
          <input
            type="text"
            className={styles.commentInput}
            placeholder="Write a comment..."
            value={commentText}
            onChange={(e) => onCommentTextChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onComment()}
            disabled={isCommenting}
          />
          <button 
            className={styles.commentSubmit}
            onClick={onComment}
            disabled={!commentText.trim() || isCommenting}
          >
            {isCommenting ? 'Posting...' : 'Post'}
          </button>
        </div>
      )}
    </div>
  );
}
