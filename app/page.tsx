"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function HomePage() {
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-8 shadow">
        <h1 className="text-3xl font-semibold mb-3 logoText">Welcome to MyZenTribe</h1>
        <p className="text-neutral-600 mb-6">
          Feel the vibe, find your tribe.
        </p>

        <div className="flex flex-wrap gap-3">
          {hasSession ? (
            <>
              <Link href="/calendar" className="btn btn-brand">Go to calendar</Link>
              <Link href="/profile" className="btn btn-neutral">My profile</Link>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-brand">Log in</Link>
              <Link href="/signup" className="btn btn-neutral">Create account</Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
