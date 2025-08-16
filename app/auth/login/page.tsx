"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function HomePage() {
  // Change only if your calendar route is different
  const AFTER_LOGIN = "/calendar";

  const router = useRouter();
  const [session, setSession] = useState<null | { user: { id: string } }>(null);

  // Auth form state (only used when logged out)
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    // If already signed in, show logged-in state
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setSession({ user: { id: data.session.user.id } });
      } else {
        setSession(null);
      }
    });

    // Keep in sync with auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, newSession) => {
      if (newSession?.user) {
        setSession({ user: { id: newSession.user.id } });
      } else {
        setSession(null);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMsg("");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setStatus("error");
      setMsg(error.message || "Sign in failed");
      return;
    }
    setStatus("idle");
    router.replace(AFTER_LOGIN);
  }

  async function onSignUp(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMsg("");
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (error) {
      setStatus("error");
      setMsg(error.message || "Sign up failed");
      return;
    }
    // Many Supabase projects require email confirmation:
    setStatus("success");
    setMsg(
      data.user
        ? "Check your email to confirm your account, then sign in."
        : "If sign-up requires confirmation, please check your email."
    );
  }

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-10">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Welcome to <span className="text-brand-600">MyZenTribe</span>
            </h1>
            <p className="mt-3 text-base text-neutral-600">
              Your calm center for community, events, and mindful routines. Keep personal and
              business worlds tidy — your way.
            </p>

            {session ? (
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/calendar" className="btn btn-brand">
                  Go to Calendar
                </Link>
                <Link href="/profile" className="btn btn-neutral">
                  Open Profile
                </Link>
                <Link href="/communities" className="btn">
                  Explore Communities
                </Link>
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#auth" className="btn btn-brand">
                  Sign in
                </a>
                <Link href="/communities" className="btn">
                  Browse public communities
                </Link>
              </div>
            )}
          </div>

          {/* Card: Sign in / Sign up (only when logged out) */}
          {!session && (
            <div id="auth" className="w-full">
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow">
                <div className="mb-4 flex items-center gap-2">
                  <button
                    className={`seg-btn ${mode === "signin" ? "active" : ""}`}
                    onClick={() => {
                      setMode("signin");
                      setStatus("idle");
                      setMsg("");
                    }}
                  >
                    Sign in
                  </button>
                  <button
                    className={`seg-btn ${mode === "signup" ? "active" : ""}`}
                    onClick={() => {
                      setMode("signup");
                      setStatus("idle");
                      setMsg("");
                    }}
                  >
                    Create account
                  </button>
                </div>

                {mode === "signin" ? (
                  <form onSubmit={onSignIn} className="space-y-4">
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

                    {status === "error" && (
                      <p className="text-sm text-rose-600">{msg || "Sign in failed"}</p>
                    )}

                    <button type="submit" disabled={status === "loading"} className="btn btn-brand w-full">
                      {status === "loading" ? "Signing in…" : "Sign in"}
                    </button>

                    <p className="mt-2 text-sm text-gray-500">
                      <a href="/forgot-password" className="text-indigo-600 hover:underline">
                        Forgot password?
                      </a>
                    </p>
                  </form>
                ) : (
                  <form onSubmit={onSignUp} className="space-y-4">
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
                        placeholder="Create a password"
                      />
                    </label>

                    {status !== "idle" && (
                      <p
                        className={`text-sm ${
                          status === "error" ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {msg}
                      </p>
                    )}

                    <button type="submit" disabled={status === "loading"} className="btn btn-brand w-full">
                      {status === "loading" ? "Creating account…" : "Create account"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
