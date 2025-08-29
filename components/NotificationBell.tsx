// components/NotificationBell.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { unreadCount, subscribeNotifications } from "@/lib/notifications";

/**
 * Small bell + unread badge.
 * - Click routes to /notifications (or custom href)
 * - Live-updates via Supabase realtime on the user's notifications
 */
export default function NotificationBell({ href = "/notifications" }: { href?: string }) {
  const [count, setCount] = useState<number>(0);
  const router = useRouter();

  async function refresh() {
    try {
      const n = await unreadCount();
      setCount(n || 0);
    } catch {
      // keep it quiet; bell should never block UI
    }
  }

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    (async () => {
      await refresh();

      // subscribe to changes in notifications for this user
      const channel: any = await subscribeNotifications(() => refresh());

      // try both possible cleanup shapes (SDKs vary slightly)
      cleanup = () => {
        try {
          if (channel?.unsubscribe) channel.unsubscribe();
          // @ts-ignore — some projects expose a global supabase with removeChannel
          else if ((window as any).supabase?.removeChannel) {
            (window as any).supabase.removeChannel(channel);
          }
        } catch {}
      };
    })();

    return () => {
      try { cleanup?.(); } catch {}
    };
  }, []);

  return (
    <button
      onClick={() => router.push(href)}
      className="relative inline-flex items-center justify-center rounded-full border bg-white px-3 py-2 text-sm"
      title="Notifications"
      aria-label="Open notifications"
    >
      <span className="mr-1.5">🔔</span>
      {count > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[20px] rounded-full bg-violet-600 px-1.5 py-0.5 text-center text-[11px] font-semibold text-white"
          aria-label={`${count} unread notifications`}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
