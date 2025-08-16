"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // if email confirmations are ON, this shows in the email link
        emailRedirectTo: `${window.location.origin}/profile`,
      },
    });
    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    // If confirmations are OFF you'll have a session immediately.
    if (data.session) {
      router.replace("/profile");
      return;
    }

    // Otherwise tell the user to verify email.
    setMsg("Check your email to confirm your account, then sign in.");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: "#F4ECFF" }}>
      <div className="w-full max-w-md rounded-2xl border border-purple-100 bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold mb-2 text-center">Create profile</h1>
        <p className="text-sm text-neutral-600 mb-4 text-center">Use your email and a password.</p>

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

          <label className="block">
            <span className="text-sm">Confirm password</span>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
              placeholder="••••••••"
            />
          </label>

          {err && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          {msg && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</div>}

          <button type="submit" disabled={loading} className="btn btn-brand w-full">
            {loading ? "Creating…" : "Create profile"}
          </button>

          <div className="flex items-center justify-between text-sm mt-1">
            <Link href="/" className="underline">Back to welcome</Link>
            <Link href="/signin" className="underline">Already have an account?</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
