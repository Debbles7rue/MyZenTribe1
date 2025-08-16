// app/signin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // sanitize ?next so we only allow same-site, absolute-path redirects
  const rawNext = searchParams.get("next") || "";
  const fallback = "/profile"; // change to "/calendar" if you prefer
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : fallback;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already signed in, bounce straight to next/fallback
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (data.user) router.replace(next);
    });
    return () => {
      mounted = false;
    };
  }, [router, next]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message || "Invalid login credentials");
      return;
    }

    router.replace(next);
  }

  // --- simple inline styles to match your current look ---
  const shell: React.CSSProperties = {
    minHeight: "100vh",
    backgroundColor: "#F4ECFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 16px",
  };
  const card: React.CSSProperties = {
    width: "100%",
    maxWidth: 520,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 10px 20px rgba(0,0,0,0.06)",
  };
  const h1: React.CSSProperties = { fontSize: 28, fontWeight: 700, textAlign: "center", margin: 0 };
  const sub: React.CSSProperties = {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 6,
    marginBottom: 16,
  };

  return (
    <main style={shell}>
      <div style={card}>
        <h1 style={h1}>Sign in</h1>
        <p style={sub}>Use your email and password.</p>

        <form onSubmit={onSubmit} className="grid gap-4">
          <label className="grid gap-1">
            <span className="text-sm">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border px-3 py-2"
              placeholder="you@example.com"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border px-3 py-2"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-brand w-full"
            style={{ marginTop: 4 }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="flex items-center justify-between text-sm mt-3">
          <Link href="/" className="underline">
            Back to welcome
          </Link>
          <Link href="/forgot-password" className="underline">
            Forgot password?
          </Link>
        </div>

        <div className="text-center text-sm mt-4">
          New here?{" "}
          <Link href="/signup" className="underline">
            Create profile
          </Link>
        </div>
      </div>
    </main>
  );
}
