"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import BusinessProfilePanel from "@/components/BusinessProfilePanel";
import BusinessCard from "@/components/BusinessCard";
import BusinessInfoEditor from "@/components/BusinessInfoEditor";

export default function BusinessPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  return (
    <div className="page-wrap">
      <div className="page">
        <div className="container-app mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="header-bar">
            <h1 className="page-title" style={{ marginBottom: 0 }}>Business</h1>
            <div className="controls flex items-center gap-2">
              <Link href="/profile" className="btn" aria-label="Go to personal profile">
                Personal profile
              </Link>
              <Link href="/messages" className="btn" aria-label="Open messages">
                Messages
              </Link>
            </div>
          </div>

          <div className="h-px bg-violet-200/60" style={{ margin: "12px 0 16px" }} />

          {/* Business branding (uses business_* fields only) */}
          <div className="stack mb-3">
            <BusinessCard userId={userId} />
          </div>

          {/* Business details editor (name, logo, bio, location) */}
          <div className="stack mb-3">
            <BusinessInfoEditor userId={userId} />
          </div>

          {/* Services editor/view (still stored on profiles.business_services) */}
          <div className="stack">
            <BusinessProfilePanel userId={userId} />
          </div>
        </div>
      </div>
    </div>
  );
}
