// app/login/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// tiny helper: timeout any async call so the UI never gets stuck
async function withTimeout<T>(p: Promise<T>, ms = 12000): Promise<T> {
  return await Promise.race<T>([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error("Request timed out")), ms)
    ),
  ]);
}

export default function LoginPage() {
  const router = useRouter();

  // read ?redirect=… once on the client (no Suspense needed)
  const redirectTarget = useMemo(() => {
    if (typeof window === "undefined") return "/calendar";
    const url = new URL(window.location.href);
    return url.searchParams.get("redirect") || "/calendar";
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // If already signed in, go immediately
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(redirectTarget);
    });
  }, [router, redirectTarget]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      // 1) sign in
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
      );
      if (error) throw error;

      // 2) wait until session is available (cookie/local storage propagation)
      //    poll briefly so router.replace happens reliably
      let ok = false;
      for (let i = 0; i < 15; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          ok = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 150));
      }
      if (!ok) {
        // Don’t leave the UI spinning forever
        throw new Error("Signed in, but session wasn’t detected. Please try again.");
      }

      router.replace(redirectTarget);
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMsg(err?.message || "Login failed. Please try again.");
    } finally {
      // ensure the button resets even if navigation didn’t happen yet
      setTimeout(() => setStatus("idle"), 300);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold mb-2">Log in</h1>
        <p className="text-sm text-neutral-600 mb-4">Use your email and password.</p>

        <form onSubmit={onSubmit} className="space-y-4">
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
          </
