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

function fallbackHref(n: NotificationRow) {
  // If backend didn’t set target_url, make a best guess:
  if (n.target_url) return n.target_url;
  if (n.type.startsWith("event.")) return "/calendar";
  if (n.type.startsWith("todo.") || n.type.startsWith("reminder.")) return "/calendar";
  if (n.type.startsWith("friend.")) {
    const id = n.entity_id ?? n.actor_id ?? "";
    return id ? `/friends/${id}/edit` : "/profile";
  }
  if (n.type.startsWith("community.")) return "/communities";
  return "/"; // safe fallback
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
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Notifications</h2>
        </div>
        <div className="rounded-xl border bg-white p-6 text-sm text-gray-500">Loading…</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            className={`px-3 py-1.5 rounded-lg text-sm border ${tab === "all" ? "bg-violet-600 text-white border-violet-600" : "bg-white"}`}
            onClick={() => setTab("all")}
          >
            All
          </button>
          <button
            className={`px-3 py-1.5 rounded-lg text-sm border ${tab === "unread" ? "bg-violet-600 text-white border-violet-600" : "bg-white"}`}
            onClick={() => setTab("unread")}
          >
            Unread
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded-lg text-sm border bg-white" onClick={() => load(true)}>
            Refresh
          </button>
          <button className="px-3 py-1.5 rounded-lg text-sm border bg-white" onClick={handleMarkAll}>
            Mark all read
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error.includes("relation") ? (
            <>
              The <code>notifications</code> table doesn’t exist yet. You can still use the UI; once
              the table is created, items will appear here. (Ask me for the minimal SQL when you’re ready.)
            </>
          ) : error.includes("RLS") || error.toLowerCase().includes("permission") ? (
            <>Your account isn’t allowed to read notifications yet (RLS). I can fix the policy for you.</>
          ) : (
            <>Error: {error}</>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-sm text-gray-500">No notifications.</div>
      ) : (
        <ul className="rounded-xl border bg-white divide-y">
          {filtered.map((n) => {
            const label = typeLabel[n.type] ?? n.type;
            const emoji = typeEmoji[n.type] ?? "🔔";
            const when = n.due_at ?? n.created_at;
            const href = fallbackHref(n);
            const unread = !n.read_at;

            return (
              <li key={n.id} className={`p-3 sm:p-4 ${unread ? "bg-violet-50/40" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className="text-xl leading-none">{emoji}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium truncate">{label}</div>
                      <div className="text-xs text-gray-500 shrink-0">{relativeTime(when)}</div>
                    </div>
                    <div className="text-sm font-semibold mt-0.5">{n.title}</div>
                    {n.body && <div className="text-sm text-gray-600 mt-0.5">{n.body}</div>}

                    <div className="mt-2 flex items-center gap-2">
                      <button
                        className="px-2.5 py-1 rounded-md border text-sm"
                        onClick={() => router.push(href)}
                        title="Open"
                      >
                        Open
                      </button>
                      {unread && (
                        <button
                          className="px-2.5 py-1 rounded-md border text-sm"
                          onClick={() => handleMarkRead(n.id)}
                          title="Mark as read"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {filtered.length >= 20 && (
        <div className="flex justify-center mt-3">
          <button
            className="px-3 py-1.5 rounded-lg text-sm border bg-white"
            onClick={() => {
              setLoadingMore(true);
              load(false);
            }}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
