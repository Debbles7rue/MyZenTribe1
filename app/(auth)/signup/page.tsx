"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
// ...
await supabase.auth.signUp({ email, password });

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setNotice(null);
    setBusy(true);

    const { data, error } = await supabase.auth.signUp({ email, password });

    setBusy(false);
    if (error) {
      setErrorMsg(error.message);
      return;
    }

    // If "Confirm email" is ON in Supabase, user must click confirmation link.
    // Show a friendly notice. If OFF, Supabase signs them in immediately.
    if (data.user && !data.session) {
      setNotice("Check your email to confirm your account, then come back to log in.");
    } else {
      router.push("/"); // immediate login
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
              className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-brand"
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
              className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-brand"
            />
          </label>

          {errorMsg && <p className="text-sm text-rose-600">{errorMsg}</p>}
          {notice && <p className="text-sm text-green-700">{notice}</p>}

          <button type="submit" disabled={busy} className="w-full btn btn-brand">
            {busy ? "Creating..." : "Create account"}
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
