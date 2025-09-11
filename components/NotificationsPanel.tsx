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
  "friend.accepted": "Friend accepted",
  "friend.connected": "Friend connected",
  "event.invited": "Event invite",
  "event.rsvp": "Event RSVP",
  "event.upcoming": "Event soon",
  "todo.due": "To-do due",
  "reminder.due": "Reminder",
  "community.invited": "Community invite",
  "community.announcement": "Community news",
};

const typeEmoji: Record<string, string> = {
  "friend.accepted": "🤝",
  "friend.connected": "🧑‍🤝‍🧑",
  "event.invited": "🎟️",
  "event.rsvp": "📩",
  "event.upcoming": "⏰",
  "todo.due": "✅",
  "reminder.due": "🔔",
  "community.invited": "🏘️",
  "community.announcement": "📣",
};

const typeColors: Record<string, { bg: string; border: string; text: string }> = {
  "friend.accepted": { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
  "friend.connected": { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700" },
  "event.invited": { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-700" },
  "event.rsvp": { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  "event.upcoming": { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" },
  "todo.due": { bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
  "reminder.due": { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700" },
  "community.invited": { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700" },
  "community.announcement": { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700" },
};

function fallbackHref(n: NotificationRow) {
  if (n.target_url) return n.target_url;
  if (n.type.startsWith("event.") || n.type.startsWith("todo.") || n.type.startsWith("reminder."))
    return "/calendar";
  if (n.type.startsWith("friend.")) {
    const id = n.entity_id ?? n.actor_id ?? "";
    return id ? `/friends/${id}/edit` : "/profile";
  }
  if (n.type.startsWith("community.")) return "/communities";
  return "/";
}

export default function NotificationsPanel() {
  const [tab, setTab] = useState<FilterTab>("all");
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
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
    await markRead(id);
    setRows((r) => r.map((x) => (x.id === id ? { ...x, read_at: new Date().toISOString() } : x)));
  }

  async function handleMarkAll() {
    await markAllRead();
    setRows((r) => r.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
  }

  if (loading && rows.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Notifications
            </h1>
            <p className="text-gray-600 mt-2">Stay connected with your tribe</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-8 text-center">
            <div className="animate-pulse">
              <div className="w-12 h-12 bg-purple-200 rounded-full mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Notifications
          </h1>
          <p className="text-gray-600 mt-2">Stay connected with your tribe</p>
        </div>

        {/* Tabs and Actions */}
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl p-3 shadow-sm border border-purple-100">
          <div className="flex gap-2">
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === "all" 
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md" 
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
              onClick={() => setTab("all")}
            >
              All
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === "unread" 
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md" 
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
              onClick={() => setTab("unread")}
            >
              Unread
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors" 
              onClick={() => load(true)}
            >
              🔄 Refresh
            </button>
            <button 
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-green-200 text-green-700 hover:bg-green-50 transition-colors" 
              onClick={handleMarkAll}
            >
              ✓ Mark all read
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <div className="flex items-start gap-2">
              <span className="text-lg">⚠️</span>
              <div>
                {error.includes("relation") ? (
                  <>The notifications system is being set up. Please check back soon!</>
                ) : error.includes("RLS") || error.toLowerCase().includes("permission") ? (
                  <>We're updating your notification permissions. Please try again in a moment.</>
                ) : (
                  <>Error: {error}</>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notifications List */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-12 text-center">
            <div className="text-6xl mb-4">🔔</div>
            <div className="text-xl font-semibold text-gray-700">No notifications</div>
            <div className="text-gray-500 mt-2">
              {tab === "unread" ? "You're all caught up!" : "Your notification center is empty"}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((n) => {
              const label = typeLabel[n.type] ?? n.type;
              const emoji = typeEmoji[n.type] ?? "🔔";
              const colors = typeColors[n.type] ?? { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700" };
              const when = n.due_at ?? n.created_at;
              const href = fallbackHref(n);
              const unread = !n.read_at;

              return (
                <div 
                  key={n.id} 
                  className={`${colors.bg} ${colors.border} border rounded-xl p-4 transition-all hover:shadow-md ${
                    unread ? "ring-2 ring-purple-300 ring-opacity-50" : ""
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`text-2xl flex items-center justify-center w-12 h-12 rounded-full ${colors.bg} border-2 ${colors.border}`}>
                      {emoji}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <span className={`text-xs font-medium ${colors.text} uppercase tracking-wider`}>
                            {label}
                          </span>
                          {unread && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              New
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">{relativeTime(when)}</span>
                      </div>
                      
                      <div className="font-semibold text-gray-900 mb-1">{n.title}</div>
                      {n.body && <div className="text-sm text-gray-600">{n.body}</div>}

                      {/* Actions */}
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          className="px-3 py-1.5 rounded-lg bg-white border border-purple-200 text-purple-700 text-sm font-medium hover:bg-purple-50 transition-colors"
                          onClick={() => router.push(href)}
                        >
                          Open →
                        </button>
                        {unread && (
                          <button
                            className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                            onClick={() => handleMarkRead(n.id)}
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
          <div className="flex justify-center mt-6">
            <button
              className="px-6 py-2 rounded-lg bg-white border border-purple-200 text-purple-700 font-medium hover:bg-purple-50 transition-colors disabled:opacity-50"
              onClick={() => {
                setLoadingMore(true);
                load(false);
              }}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
