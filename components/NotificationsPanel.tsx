// components/NotificationsPanel.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  listNotifications,
  markAllRead,
  markRead,
  relativeTime,
  subscribeNotifications,
  type NotificationRow,
} from "@/lib/notifications";
import { useRouter } from "next/navigation";

type FilterTab = "all" | "unread";

const typeLabel: Record<string, string> = {
  // Friend notifications
  "friend.accepted": "Friend accepted",
  "friend.connected": "Friend connected",
  "friend.request": "Friend request",
  
  // Event notifications
  "event.invited": "Event invite",
  "event.rsvp": "Event RSVP",
  "event.upcoming": "Event soon",
  "event.update": "Event update",
  "event.comment": "Event comment",
  
  // Todo/Reminder
  "todo.due": "To-do due",
  "reminder.due": "Reminder",
  
  // Community notifications
  "community.invited": "Community invite",
  "community.announcement": "Community news",
  "community.update": "Community update",
  
  // Carpool notifications
  "carpool.invited": "Carpool invite",
  "carpool.accepted": "Carpool joined",
  "carpool.update": "Carpool update",
  "carpool.safe_friends": "Carpool opportunity",
  
  // Post/Album notifications
  "post.comment": "New comment",
  "post.tagged": "Tagged in post",
  "post.reaction": "Post reaction",
  "post.cocreator": "Post co-creator",
  "album.comment": "Album comment",
  "album.tagged": "Tagged in album",
  "album.reaction": "Album reaction",
  "album.cocreator": "Album co-creator",
  
  // Comment reactions
  "comment.reaction": "Comment reaction",
  
  // Message notifications
  "message.received": "New message",
  
  // Gift notifications
  "gift.received": "Gift received",
};

const typeEmoji: Record<string, string> = {
  // Friend notifications
  "friend.accepted": "🤝",
  "friend.connected": "🧑‍🤝‍🧑",
  "friend.request": "👋",
  
  // Event notifications
  "event.invited": "🎟️",
  "event.rsvp": "📩",
  "event.upcoming": "⏰",
  "event.update": "📅",
  "event.comment": "💬",
  
  // Todo/Reminder
  "todo.due": "✅",
  "reminder.due": "🔔",
  
  // Community notifications
  "community.invited": "🏘️",
  "community.announcement": "📣",
  "community.update": "📢",
  
  // Carpool notifications
  "carpool.invited": "🚗",
  "carpool.accepted": "✅",
  "carpool.update": "🚙",
  "carpool.safe_friends": "👥",
  
  // Post/Album notifications
  "post.comment": "💬",
  "post.tagged": "🏷️",
  "post.reaction": "❤️",
  "post.cocreator": "🤝",
  "album.comment": "💬",
  "album.tagged": "🏷️",
  "album.reaction": "❤️",
  "album.cocreator": "🤝",
  
  // Comment reactions
  "comment.reaction": "👍",
  
  // Message notifications
  "message.received": "✉️",
  
  // Gift notifications
  "gift.received": "🎁",
};

function fallbackHref(n: NotificationRow) {
  // If backend set target_url, use it
  if (n.target_url) return n.target_url;
  
  // Carpool notifications
  if (n.type.startsWith("carpool.")) {
    if (n.entity_id) {
      return `/calendar?openCarpool=${n.entity_id}`;
    }
    return "/calendar";
  }
  
  // Event notifications
  if (n.type.startsWith("event.")) {
    if (n.entity_id) {
      return `/calendar?event=${n.entity_id}`;
    }
    return "/calendar";
  }
  
  // Todo/Reminder notifications
  if (n.type.startsWith("todo.") || n.type.startsWith("reminder.")) {
    return "/calendar";
  }
  
  // Friend notifications
  if (n.type.startsWith("friend.")) {
    const id = n.entity_id ?? n.actor_id ?? "";
    return id ? `/friends/${id}/edit` : "/profile";
  }
  
  // Community notifications
  if (n.type.startsWith("community.")) {
    if (n.entity_id) {
      return `/communities/${n.entity_id}`;
    }
    return "/communities";
  }
  
  // 🔥 FIXED: Post/Album notifications now go to home feed "/"
  if (n.type.startsWith("post.") || n.type.startsWith("album.")) {
    return "/"; // All posts live on the home feed
  }
  
  // 🔥 FIXED: Comment notifications go to home feed "/"
  if (n.type === "comment.reaction") {
    return "/"; // Comments are on posts which live on home feed
  }
  
  // Message notifications
  if (n.type === "message.received") {
    return n.actor_id ? `/messages/${n.actor_id}` : "/messages";
  }
  
  // Gift notifications
  if (n.type === "gift.received") {
    return n.entity_id ? `/gifts/${n.entity_id}` : "/gifts";
  }
  
  return "/"; // safe fallback
}

export default function NotificationsPanel() {
  const [tab, setTab] = useState<FilterTab>("all");
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fadingOut, setFadingOut] = useState<Set<string>>(new Set());
  const last = useRef<string | null>(null);
  const router = useRouter();

  async function load(reset = false) {
    setError(null);
    if (reset) {
      last.current = null;
      setRows([]);
      setLoading(true);
    }
    const { rows: data, error } = await listNotifications({
      onlyUnread: tab === "unread",
      before: last.current,
      pageSize: 20,
    });
    if (error) {
      setError(error);
    } else {
      setRows((prev) => (reset ? data : [...prev, ...data]));
      if (data.length > 0) last.current = data[data.length - 1].created_at;
    }
    setLoading(false);
    setLoadingMore(false);
  }

  useEffect(() => {
    load(true);
    (async () => {
      const ch = await subscribeNotifications(() => load(true));
      return () => {
        try {
          // @ts-ignore
          if (ch) window?.supabase?.removeChannel?.(ch);
        } catch {}
      };
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const filtered = useMemo(() => rows, [rows]);

  async function handleMarkRead(id: string) {
    // Fade out animation
    setFadingOut((prev) => new Set(prev).add(id));
    
    await markRead(id);
    
    setTimeout(() => {
      setRows((r) => r.map((x) => (x.id === id ? { ...x, read_at: new Date().toISOString() } : x)));
      setFadingOut((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  }

  async function handleOpen(n: NotificationRow) {
    const href = fallbackHref(n);
    
    // Auto-mark as read when opening
    if (!n.read_at) {
      handleMarkRead(n.id);
    }
    
    router.push(href);
  }

  async function handleMarkAll() {
    await markAllRead();
    setRows((r) => r.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
  }

  if (loading && rows.length === 0) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-violet-600 border-r-transparent"></div>
          <p className="mt-3 text-sm text-gray-500">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Tabs */}
          <div className="flex gap-2">
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === "all" 
                  ? "bg-violet-600 text-white shadow-sm" 
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
              onClick={() => setTab("all")}
            >
              All
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === "unread" 
                  ? "bg-violet-600 text-white shadow-sm" 
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
              onClick={() => setTab("unread")}
            >
              Unread
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button 
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
              onClick={() => load(true)}
              title="Refresh notifications"
            >
              🔄 Refresh
            </button>
            <button 
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
              onClick={handleMarkAll}
              title="Mark all as read"
            >
              ✓ Mark all read
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error.includes("relation") ? (
            <>
              The <code className="px-1 py-0.5 bg-rose-100 rounded">notifications</code> table doesn't exist yet. 
              You can still use the UI; once the table is created, items will appear here.
            </>
          ) : error.includes("RLS") || error.toLowerCase().includes("permission") ? (
            <>Your account isn't allowed to read notifications yet (RLS). Database policy needs updating.</>
          ) : (
            <>Error: {error}</>
          )}
        </div>
      )}

      {/* Notifications List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <div className="text-5xl mb-3">🔔</div>
          <p className="text-base font-medium text-gray-900 mb-1">No notifications yet</p>
          <p className="text-sm text-gray-500">
            {tab === "unread" ? "You're all caught up!" : "When you get notifications, they'll appear here"}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          {filtered.map((n, index) => {
            const label = typeLabel[n.type] ?? n.type;
            const emoji = typeEmoji[n.type] ?? "🔔";
            const when = n.due_at ?? n.created_at;
            const unread = !n.read_at;
            const isFading = fadingOut.has(n.id);

            return (
              <div
                key={n.id}
                className={`
                  p-4 sm:p-5 transition-all duration-300
                  ${index !== filtered.length - 1 ? "border-b border-gray-100" : ""}
                  ${unread ? "bg-violet-50/50" : "bg-white"}
                  ${isFading ? "opacity-0" : "opacity-100"}
                  hover:bg-gray-50
                `}
              >
                <div className="flex items-start gap-4">
                  {/* Emoji Icon */}
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-2xl bg-white rounded-full border-2 border-gray-100 shadow-sm">
                    {emoji}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide">
                          {label}
                        </span>
                        {unread && (
                          <span className="w-2 h-2 bg-violet-600 rounded-full"></span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 font-medium flex-shrink-0">
                        {relativeTime(when)}
                      </span>
                    </div>
                    
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      {n.title}
                    </h3>
                    
                    {n.body && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {n.body}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        className="px-4 py-1.5 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-sm"
                        onClick={() => handleOpen(n)}
                        title="Open and mark as read"
                      >
                        Open
                      </button>
                      
                      {unread && (
                        <button
                          className="px-4 py-1.5 rounded-lg text-sm font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
                          onClick={() => handleMarkRead(n.id)}
                          title="Mark as read"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load More */}
      {filtered.length >= 20 && (
        <div className="flex justify-center mt-4">
          <button
            className="px-6 py-2.5 rounded-lg text-sm font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            onClick={() => {
              setLoadingMore(true);
              load(false);
            }}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-gray-600 border-r-transparent mr-2"></span>
                Loading...
              </>
            ) : (
              "Load more"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
