"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setHasSession(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setHasSession(!!session);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }
    setMsg("Password updated. You can now sign in.");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: "#F4ECFF" }}>
      <div className="w-full max-w-md rounded-2xl border border-purple-100 bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold mb-2 text-center">Set a new password</h1>

        {!hasSession ? (
          <>
            <p className="text-sm text-neutral-600">
              Auth session missing. Please open the reset link from your email on this device,
              or request a new link on the <Link href="/forgot-password" className="underline">Forgot password</Link> page.
            </p>
            <div className="text-center mt-4">
              <Link href="/signin" className="underline">Back to sign in</Link>
            </div>
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 mt-2">
            <label className="block">
              <span className="text-sm">New password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                placeholder="••••••••"
              />
            </label>

            {err && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
            {msg && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</div>}

            <button type="submit" disabled={loading} className="btn btn-brand w-full">
              {loading ? "Updating…" : "Update password"}
            </button>

            <div className="flex items-center justify-between text-sm">
              <Link href="/" className="underline">Back to welcome</Link>
              <Link href="/signin" className="underline">Sign in</Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
