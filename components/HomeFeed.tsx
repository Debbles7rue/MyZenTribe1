// components/HomeFeed.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createPost, listHomeFeed, Post } from "@/lib/posts";
import PostCard from "@/components/PostCard";

/**
 * HomeFeed: A friendly, mobile-first landing feed for MyZenTribe.
 * - Hero with quick actions
 * - Clean composer (Public / Friends / Only me)
 * - Privacy hints aligned with your platform rules
 * - Polished loading + empty states
 *
 * NOTE: This file intentionally keeps the same createPost/listHomeFeed API
 * you already use, so you can drop it in with no backend changes.
 */

export default function HomeFeed() {
  const [rows, setRows] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [privacy, setPrivacy] = useState<Post["privacy"]>("friends");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { rows } = await listHomeFeed();
    setRows(rows);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function post() {
    const text = body.trim();
    if (!text) return;
    setSaving(true);
    try {
      await createPost(text, privacy);
      setBody("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  // Tiny, friendly helper line under the privacy select
  const privacyHint = useMemo(() => {
    switch (privacy) {
      case "public":
        return "Public: Visible on Home for everyone.";
      case "friends":
        return "Friends: Shared with your friends (Restricted friends are not included).";
      case "private":
      case "only_me":
        return "Only me: Saved privately to your profile.";
      default:
        return undefined;
    }
  }, [privacy]);

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      {/* Hero / Welcome */}
      <section className="mb-6">
        <div className="rounded-2xl border border-[rgba(0,0,0,.06)] bg-white/70 p-5 shadow-[0_6px_24px_rgba(0,0,0,.06)] dark:bg-zinc-900/60 dark:border-zinc-800">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Welcome to <span className="text-brand-600">My</span>
            <span className="italic">Zen</span>Tribe
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Share uplifting moments, post photos, and spread the word about gatherings. Public posts appear on Home.
            Invited-only events show up on invitees’ <em>What’s Happening</em>.
          </p>

          {/* Quick Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/calendar?create=1" className="btn btn-brand">
              Share an Event
            </Link>
            <Link href="/profile#photos" className="btn">
              Upload Photos
            </Link>
            <a
              href="#composer"
              className="btn"
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById("composer");
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
            >
              Write a Post
            </a>
          </div>

          {/* Sharing rule hint */}
          <div className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
            <strong>Heads up:</strong> If you share an event to <em>Everyone</em>, it will appear on the Home page.
            If you invite specific friends, acquaintances, or communities, it will show only on their <em>What’s
            Happening</em> pages.
          </div>
        </div>
      </section>

      {/* Composer */}
      <section id="composer" className="mb-6">
        <div className="card p-3 sm:p-4">
          <label htmlFor="post-body" className="sr-only">
            Write a post
          </label>
          <textarea
            id="post-body"
            className="input min-h-[90px]"
            rows={3}
            placeholder="Share something kind, inspiring, or helpful…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <label htmlFor="privacy" className="sr-only">
                Privacy
              </label>
              <select
                id="privacy"
                className="input w-[170px]"
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value as Post["privacy"])}
              >
                <option value="public">Public</option>
                <option value="friends">Friends</option>
                <option value="private">Only me</option>
              </select>
              {privacyHint && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{privacyHint}</span>
              )}
            </div>

            <div className="sm:ml-auto flex items-center gap-2">
              {/* Optional future enhancement hooks (non-breaking): */}
              {/* <button className="btn" disabled>Attach Photo</button>
              <button className="btn" disabled>Tag Event</button> */}
              <button
                className="btn btn-brand"
                onClick={post}
                disabled={saving || !body.trim()}
                aria-disabled={saving || !body.trim()}
              >
                {saving ? "Posting…" : "Post"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Feed */}
      <section aria-busy={loading}>
        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : rows.length ? (
          <div className="stack gap-3">
            {rows.map((p) => (
              <PostCard key={p.id} post={p} onChanged={load} />
            ))}
          </div>
        ) : (
          <div className="card p-6 text-center">
            <div className="text-lg font-medium">Your Home is peaceful… for now 🕊️</div>
            <div className="muted mt-1">
              Say hello with your first post above, or{" "}
              <Link className="underline" href="/calendar?create=1">
                share an event
              </Link>
              .
            </div>
          </div>
        )}
      </section>

      {/* Footer quick links */}
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link className="btn" href="/contact">
          Contact
        </Link>
        <Link className="btn" href="/suggestions">
          Suggestions
        </Link>
        <Link className="btn btn-brand" href="/donations">
          Donations
        </Link>
      </div>
    </div>
  );
}

/** Simple loading placeholder that matches your card look */
function SkeletonCard() {
  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          <div className="h-4 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
