// app/(protected)/notifications/page.tsx
"use client";

import React from "react";
import NotificationsPanel from "@/components/NotificationsPanel";

export default function NotificationsPage() {
  return (
    <div className="max-w-3xl mx-auto w-full">
      <NotificationsPanel />
    </div>
  );
}
