// components/NotificationBell.tsx
"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { unreadCount, subscribeNotifications } from "@/lib/notifications";

/**
 * Small bell + unread badge that matches the header button styling
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
      cleanup = () => {
        try {
          if (channel?.unsubscribe) channel.unsubscribe();
          // @ts-ignore
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
      className="nav-icon-btn notification-btn"
      title="Notifications"
      aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ''}`}
      style={{ position: 'relative' }}
    >
      <span className="nav-icon">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
        </svg>
      </span>
      <span className="nav-label">Alerts</span>
      {count > 0 && (
        <span
          className="notification-badge"
          aria-label={`${count} unread`}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
      
      <style jsx>{`
        .notification-btn {
          position: relative;
        }
        
        .notification-badge {
          position: absolute;
          top: 2px;
          right: 2px;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          background: #dc2626;
          color: white;
          border-radius: 9px;
          font-size: 11px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        @media (max-width: 768px) {
          .notification-badge {
            top: 0;
            right: 0;
            min-width: 16px;
            height: 16px;
            font-size: 10px;
            border-width: 1.5px;
          }
        }
      `}</style>
    </button>
  );
}
