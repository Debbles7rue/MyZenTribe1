// components/NotificationBell.tsx
"use client";

import React, { useEffect, useState } from "react";
import { unreadCount, subscribeNotifications } from "@/lib/notifications";
import { useRouter } from "next/navigation";

export default function NotificationBell({ href = "/notifications" }: { href?: string }) {
  const [count, setCount] = useState<number>(0);
  const router = useRouter();

  async function refresh() {
    const n = await unreadCount();
    setCount(n);
  }

  useEffect(() => {
    refresh();
    (async () => {
      const ch = await subscribeNotifications(() => refresh());
      return () => {
        try {
          // @ts-ignore
          if (ch && (window as any).supabase?.removeChannel) (window as any).supabase.removeChannel(ch);
        } catch {}
      };
    })();
  }, []);

  return (
    <button
      onClick={() => router.push(href)}
      className="relative inline-flex items-center justify-center rounded-full border bg-white px-3 py-2 text-sm"
      title="Notifications"
    >
      <span className="mr-1.5">🔔</span>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] rounded-full bg-violet-600 px-1.5 py-0.5 text-center text-[11px] font-semibold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
