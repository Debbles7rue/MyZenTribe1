"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMsg("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${siteUrl}/profile` },
      });
      if (error) throw error;
      setStatus("sent");
      setMsg("Check your email for the magic link.");
    } catch (err: any) {
      setStatus("error");
      setMsg(err.message ?? "Could not send magic link.");
    }
  }

  return (
    <main className="min-h-[60vh] grid place-items-center">
      <form onSubmit={sendMagicLink} className="w-full max-w-md rounded-3xl border bg-white/90 p-6 shadow">
        <h1 className="mb-4 text-2xl font-semibold">Sign up / Sign in</h1>

        <label className="block text-sm font-medium">
          Email
          <input
            type="email"
            required
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <button
          type="submit"
          disabled={status === "sending"}
          className="mt-4 w-full rounded-2xl bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Email me a magic link"}
        </button>

        {msg && (
          <p className={`mt-3 text-sm ${status === "error" ? "text-red-600" : "text-green-700"}`}>
            {msg}
          </p>
        )}
      </form>
    </main>
  );
}
