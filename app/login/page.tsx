// app/login/page.tsx
"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  // Read ?redirect=... on the client (no Suspense needed)
  const redirectTarget = useMemo(() => {
    if (typeof window === "undefined") return "/calendar";
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get("redirect") || "/calendar";
    } catch {
      return "/calendar";
    }
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If already signed in, go immediately
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(redirectTarget);
    });
  }, [router, redirectTarget]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMsg(error.message || "Login failed");
      setSubmitting(false);
      return;
    }

    // Give the session a tick to propagate, then navigate
    setTimeout(() => router.replace(redirectTarget), 50);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold mb-2">Log in</h1>
        <p className="text-sm text-neutral-600 mb-4">Use your email and password.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="text-sm">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
              placeholder="Your password"
            />
          </label>

          {errorMsg && <p className="text-sm text-rose-600">{errorMsg}</p>}

          <div className="grid grid-cols-2 gap-2">
            <button type="submit" disabled={submitting} className="btn btn-brand w-full">
              {submitting ? "Signing in…" : "Sign in"}
            </button>
            <a href="/forgot-password" className="btn w-full flex items-center justify-center">
              Forgot password?
            </a>
          </div>
        </form>
      </div>
    </main>
  );
}
