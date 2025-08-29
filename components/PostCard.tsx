// components/PostCard.tsx
"use client";
import Image from "next/image";
import { Post, toggleLike, addComment, timeAgo } from "@/lib/posts";
import { useState } from "react";

export default function PostCard({ post, onChanged }: { post: Post; onChanged?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");

  async function like() {
    if (busy) return;
    setBusy(true);
    await toggleLike(post.id);
    setBusy(false);
    onChanged?.();
  }

  async function sendComment() {
    if (!comment.trim() || busy) return;
    setBusy(true);
    await addComment(post.id, comment.trim());
    setComment("");
    setBusy(false);
    onChanged?.();
  }

  return (
    <article className="card p-3">
      <div className="flex items-center gap-2 mb-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={(post.author?.avatar_url || "/default-avatar.png") + "?t=1"}
          alt=""
          width={36}
          height={36}
          className="rounded-full object-cover"
        />
        <div className="text-sm">
          <div className="font-medium">{post.author?.full_name || "Member"}</div>
          <div className="muted">{timeAgo(post.created_at)}</div>
        </div>
      </div>

      <div className="whitespace-pre-wrap text-[15px]">{post.body}</div>
      {!!post.image_url && (
        <div className="mt-2 overflow-hidden rounded-lg border">
          {/* Use plain img to keep it simple */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.image_url} alt="" />
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 text-sm">
        <button className={`btn ${post.liked_by_me ? "btn-brand" : ""}`} onClick={like} disabled={busy}>
          ❤ {post.like_count ?? 0}
        </button>
        <div className="muted">{post.comment_count ?? 0} comments</div>
        <div className="ml-auto muted">{post.privacy}</div>
      </div>

      <div className="mt-2 flex gap-2">
        <input
          className="input flex-1"
          placeholder="Write a comment…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendComment()}
        />
        <button className="btn" onClick={sendComment} disabled={busy || !comment.trim()}>
          Send
        </button>
      </div>
    </article>
  );
}
