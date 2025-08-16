"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [msg, setMsg] = useState("Checking invite…");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setMsg("Please sign in to continue.");
        // Store token so /signin can bounce back
        try { localStorage.setItem("pending_invite_token", String(token)); } catch {}
        router.replace("/signin");
        return;
      }
      const me = userData.user.id;

      // Load invite
      const { data: inv, error: invErr } = await supabase
        .from("friend_invites")
        .select("target_user, created_by, single_use, used_at")
        .eq("token", token)
        .maybeSingle();

      if (invErr || !inv) {
        setMsg("Invite not found or expired.");
        return;
      }
      if (inv.target_user === me) {
        setMsg("That’s your own invite 🙂");
        return;
      }

      // Create/request friendship
      const { error: reqErr } = await supabase.from("friend_requests").insert({
        from_user: me,
        to_user: inv.target_user,
      });

      if (reqErr && !String(reqErr.message || "").includes("duplicate key")) {
        setMsg("Couldn’t send request: " + reqErr.message);
        return;
      }

      setOk(true);
      setMsg("Friend request sent!");
    })();
  }, [router, token]);

  return (
    <main className="page">
      <div className="container-app">
        <div className="card p-3" style={{ marginTop: 24 }}>
          <h1 className="page-title">Invite</h1>
          <p className="muted">{msg}</p>
          <div className="controls">
            <button className="btn btn-brand" onClick={() => router.replace("/profile")}>
              Open Profile
            </button>
            {ok && (
              <button className="btn" onClick={() => router.replace("/calendar")}>
                Go to Calendar
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
