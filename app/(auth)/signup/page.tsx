"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);

    const { data, error } = await supabase.auth.signUp({ email, password });

    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }

    // If “Confirm email” is ON, Supabase returns user but no session → show notice
    if (data.user && !data.session) {
      setMsg("Check your email to confirm your account, then log in.");
    } else {
      router.push("/"); // immediate login if confirmation is off
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-4">Create account</h1>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="text-sm">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm">Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
            />
          </label>

          {msg && <p className="text-sm">{msg}</p>}

          <button type="submit" disabled={busy} className="w-full btn btn-brand">
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-sm text-neutral-600">
          Already have an account?{" "}
          <Link href="/login" className="text-brand hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
