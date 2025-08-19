"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

function extractUuidFromHref(href: string): string | null {
  const m = href.match(
    /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/
  );
  return m ? m[0] : null;
}

export default function InviteAcceptPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "working" | "ok" | "invalid" | "error">("idle");
  const [msg, setMsg] = useState("");

  // Load auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // Accept when authed
  useEffect(() => {
    if (userId === null) return; // still loading auth

    const href = typeof window === "undefined" ? "" : window.location.href;
    const token = extractUuidFromHref(href);

    if (!token) {
      setStatus("invalid");
      setMsg("Invalid invite link.");
      return;
    }

    if (!userId) {
      setStatus("idle");
      return;
    }

    (async () => {
      try {
        setStatus("working");
        const { error } = await supabase.rpc("accept_friend_invite", { p_token: token });
        if (error) throw error;
        setStatus("ok");
        setMsg("Invite accepted! You’re connected.");
      } catch (e: any) {
        setStatus("error");
        setMsg(e?.message || "Invite invalid or expired.");
      }
    })();
  }, [userId]);

  if (userId === null) {
    return (
      <main className="container-app" style={{ paddingTop: 24 }}>
        <div className="card p-3"><p className="muted">Loading…</p></div>
      </main>
    );
  }

  if (!userId) {
    const next =
      typeof window === "undefined"
        ? "/invite"
        : window.location.pathname + window.location.search;

    return (
      <main className="container-app" style={{ paddingTop: 24 }}>
        <div className="card p-3">
          <h1 className="section-title">Join request</h1>
          <p className="muted">Please sign in to accept this invite.</p>
          <Link className="btn btn-brand" href={`/signin?next=${encodeURIComponent(next)}`}>
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container-app" style={{ paddingTop: 24 }}>
      <div className="card p-3">
        <h1 className="section-title">Add friend</h1>

        {status === "working" && <p className="muted">Working…</p>}
        {status === "ok" && (
          <div className="stack">
            <p>{msg}</p>
            <div className="controls">
              <Link className="btn btn-brand" href="/profile">Go to profile</Link>
              <Link className="btn" href="/messages">Open messages</Link>
            </div>
          </div>
        )}
        {status === "invalid" && <p className="muted">Invalid invite link.</p>}
        {status === "error" && <p className="muted" style={{ color: "#b91c1c" }}>{msg}</p>}
      </div>
    </main>
  );
}
