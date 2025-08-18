"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import BusinessProfilePanel from "@/components/BusinessProfilePanel";

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
          </div>

          <div className="h-px bg-violet-200/60" style={{ margin: "12px 0 16px" }} />

          <div className="stack">
            <BusinessProfilePanel userId={userId} />
          </div>
        </div>
      </div>
    </div>
  );
}
