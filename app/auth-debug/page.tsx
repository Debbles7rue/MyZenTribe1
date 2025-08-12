"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthDebug() {
  const [envUrl, setEnvUrl] = useState<string>("");
  const [envKey, setEnvKey] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionSet, setSessionSet] = useState<boolean>(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    // Show what the client is actually using
    setEnvUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
    const k = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    setEnvKey(k ? `${k.slice(0, 8)}…${k.slice(-6)}` : "");

    // Current user/session
    supabase.auth.getSession().then(({ data }) => {
      setSessionSet(!!data.session);
    });
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  const tryLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult("Signing in…");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setResult(error ? { error: error.message } : { ok: true, session: !!data.session });
    // refresh user
    const u = await supabase.auth.getUser();
    setUserId(u.data.user?.id ?? null);
    const s = await supabase.auth.getSession();
    setSessionSet(!!s.data.session);
  };

  const tryLogout = async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setSessionSet(false);
    setResult("Signed out");
  };

  return (
    <main className="max-w-lg mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Auth debug</h1>

      <div className="rounded-xl border p-4 text-sm">
        <p><b>Supabase URL:</b> {envUrl || "(empty)"} </p>
        <p><b>Anon key (trimmed):</b> {envKey || "(empty)"} </p>
        <p><b>Session present:</b> {String(sessionSet)}</p>
        <p><b>User ID:</b> {userId ?? "(none)"}</p>
      </div>

      <form onSubmit={tryLogin} className="space-y-3 rounded-xl border p-4">
        <div>
          <label className="text-sm block">Email</label>
          <input
            type="email"
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            required
          />
        </div>
        <div className="flex gap-2">
          <button className="btn btn-brand" type="submit">Sign in (debug)</button>
          <button className="btn btn-neutral" type="button" onClick={tryLogout}>Sign out</button>
        </div>
      </form>

      <div className="rounded-xl border p-4 text-sm">
        <b>Result:</b>
        <pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
      </div>

      <p className="text-xs text-neutral-500">
        Remove this page after testing. It only uses public NEXT_PUBLIC vars.
      </p>
    </main>
  );
}
