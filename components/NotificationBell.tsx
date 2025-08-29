// components/NotificationBell.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { unreadCount, subscribeNotifications } from "@/lib/notifications";

export default function NotificationBell({ href = "/notifications" }: { href?: string }) {
  const [count, setCount] = useState(0);
  const router = useRouter();

  async function refresh() {
    const n = await unreadCount();
    setCount(n || 0);
  }

  useEffect(() => {
    let channel: any;

    // initial fetch
    refresh();

    // subscribe to realtime updates
    (async () => {
      channel = await subscribeNotifications(() => {
        // re-check when an INSERT/UPDATE/DELETE hits my notifications
        void refresh();
      });
    })();

    // proper cleanup (no window.supabase access needed)
    return () => {
      try {
        channel?.unsubscribe?.();
      } catch {
        /* noop */
      }
    };
  }, []);

  return (
    <button
      onClick={() => router.push(href)}
      className="relative inline-flex items-center justify-center rounded-full border bg-white px-3 py-2 text-sm"
      title="Notifications"
      aria-label={count > 0 ? `${count} unread notifications` : "Notifications"}
    >
      <span className="mr-1.5" aria-hidden>🔔</span>
      {count > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[20px] rounded-full bg-violet-600 px-1.5 py-0.5 text-center text-[11px] font-semibold text-white"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
