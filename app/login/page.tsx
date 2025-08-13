"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  // 👉 change this ONE line if your calendar URL changes (e.g. "/cal")
  const AFTER_LOGIN = "/calendar";

  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // If already logged in, send to calendar
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(AFTER_LOGIN);
    });
  }, [router, AFTER_LOGIN]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password, // do not trim passwords
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message || "Login failed");
      return;
    }

    router.replace(AFTER_LOGIN);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold mb-2">Log in</h1>
        <p className="text-sm text-neutral-600 mb-4">
          Use your email and password.
        </p>

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
          </label>

          {status === "error" && (
            <p className="text-sm text-rose-600">{errorMsg || "Login failed"}</p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="btn btn-brand w-full"
          >
            {status === "loading" ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-sm text-gray-500 mt-2">
            <a href="/forgot-password" className="text-indigo-600 hover:underline">
              Forgot password?
            </a>
          </p>
        </form>
      </div>
    </main>
  );
}
