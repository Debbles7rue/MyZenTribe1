"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function AcceptInvitePage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle"|"working"|"ok"|"invalid"|"self"|"error">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  async function accept() {
    setStatus("working");
    const { data, error } = await supabase.rpc("accept_friend_invite", { p_token: token });
    if (error) {
      setStatus("error");
      setMsg(error.message);
      return;
    }
    if (data === "ok") setStatus("ok");
    else if (data === "self") setStatus("self");
    else setStatus("invalid");
  }

  if (!userId) {
    return (
      <main className="container-app" style={{ paddingTop: 24 }}>
        <div className="card p-3">
          <h1 className="section-title">Join request</h1>
          <p className="muted">Please sign in to accept this invite.</p>
          <Link className="btn btn-brand" href="/signin">Sign in</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container-app" style={{ paddingTop: 24 }}>
      <div className="card p-3">
        <h1 className="section-title">Add friend</h1>
        {status === "idle" && (
          <>
            <p className="muted">Accept this invite to send a friend request.</p>
            <div className="controls">
              <button className="btn btn-brand" onClick={accept}>Accept</button>
              <Link className="btn btn-neutral" href="/profile">Go to profile</Link>
            </div>
          </>
        )}
        {status === "working" && <p className="muted">Sending…</p>}
        {status === "ok" && <p>Request sent! 🎉</p>}
        {status === "self" && <p className="muted">That invite points to your own profile.</p>}
        {status === "invalid" && <p className="muted">Invite is invalid or expired.</p>}
        {status === "error" && <p className="muted">Error: {msg}</p>}
      </div>
    </main>
  );
}
