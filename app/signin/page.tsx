"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { TERMS_VERSION } from "@/lib/terms";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already signed in, bounce to Profile (Terms gate runs there too)
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (data.user) router.replace("/profile");
    });
    return () => { mounted = false; };
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    // Ensure a profiles row exists for new users
    const uid = data.user?.id;
    if (uid) {
      await supabase.from("profiles").upsert({ id: uid }, { onConflict: "id" });
      // Check terms state
      const { data: prof } = await supabase
        .from("profiles")
        .select("terms_version, terms_accepted_at")
        .eq("id", uid)
        .maybeSingle();

      if (!prof?.terms_accepted_at || (prof?.terms_version ?? 0) < TERMS_VERSION) {
        setLoading(false);
        router.replace("/legal/terms");
        return;
      }
    }

    setLoading(false);
    router.replace("/profile");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: "#F4ECFF" }}>
      <div className="w-full max-w-md rounded-2xl border border-purple-100 bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold mb-2 text-center">Sign in</h1>
        <p className="text-sm text-neutral-600 mb-4 text-center">Use your email and password.</p>

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
              placeholder="••••••••"
            />
          </label>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-brand w-full">
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <div className="flex items-center justify-between text-sm mt-1">
            <Link href="/" className="underline">Back to welcome</Link>
            <div className="space-x-4">
              <Link href="/signup" className="underline">Create profile</Link>
              <Link href="/forgot-password" className="underline">Forgot password?</Link>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
