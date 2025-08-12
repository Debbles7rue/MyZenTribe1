"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthDebug() {
  const [envUrl, setEnvUrl] = useState("");
  const [envKeyTrimmed, setEnvKeyTrimmed] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    // What the app is actually using (from NEXT_PUBLIC_…)
    setEnvUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
    const k = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    setEnvKeyTrimmed(k ? `${k.slice(0, 8)}…${k.slice(-6)}` : "(empty)");

    // Current auth state
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const tryLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult("Signing in…");
    const cleanEmail = email.trim(); // avoid invisible spaces
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password, // don't trim password
    });
    setResult(error ? { error: error.message } : { ok: true, session: !!data.session });

    // refresh visible state
    const u = await supabase.auth.getUser();
    setUserId(u.data.user?.id ?? null);
    const s = await supabase.auth.getSession();
    setHasSession(!!s.data.session);
  };

  const tryLogout = async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setHasSession(false);
    setResult("Signed out");
  };

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Auth debug</h1>

      <section className="rounded-xl border p-4 text-sm">
        <p><b>Supabase URL:</b> {envUrl || "(empty)"} </p>
        <p><b>Anon key (trimmed):</b> {envKeyTrimmed}</p>
        <p><b>Session present:</b> {String(hasSession)}</p>
        <p><b>User ID:</b> {userId ?? "(none)"} </p>
      </section>

      <form onSubmit={tryLogin} className="rounded-xl border p-4 space-y-3">
        <div>
          <label className="text-sm block">Email</label>
          <input
            type="email"
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label className="text-sm block">Password</label>
          <input
            type="password"
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            required
          />
        </div>
        <div className="flex gap-2">
          <button className="btn btn-brand" type="submit">Sign in (debug)</button>
          <button className="btn btn-neutral" type="button" onClick={tryLogout}>Sign out</button>
        </div>
      </form>

      <section className="rounded-xl border p-4 text-sm">
        <b>Result:</b>
        <pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
      </section>

      <p className="text-xs text-neutral-500">
        Remove this page after testing. It only reads public NEXT_PUBLIC vars.
      </p>
    </main>
  );
}
