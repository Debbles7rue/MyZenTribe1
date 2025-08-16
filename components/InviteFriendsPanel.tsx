// components/InviteFriendsPanel.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function InviteFriendsPanel({ userId }: { userId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const inviteUrl = token ? `${origin}/i/${token}` : "";

  useEffect(() => {
    if (!userId) return;

    (async () => {
      setErr(null);

      // 1) Try the RPC if you created it (get_or_create_friend_invite)
      let t: string | null = null;
      const rpc = await supabase.rpc("get_or_create_friend_invite");
      if (!rpc.error && rpc.data) {
        t = rpc.data as string;
      } else {
        // 2) Fallback: select existing token
        const { data: found } = await supabase
          .from("friend_invites")
          .select("token")
          .eq("to_user", userId)
          .maybeSingle();

        if (found?.token) {
          t = found.token as string;
        } else {
          // 3) Insert a new token row
          const ins = await supabase
            .from("friend_invites")
            .insert({ to_user: userId })
            .select("token")
            .single();

          if (ins.error) {
            setErr(ins.error.message);
            return;
          }
          t = ins.data.token as string;
        }
      }

      setToken(t);

      // Generate QR in the browser via dynamic import (avoids SSR issues)
      const QR = (await import("qrcode")).default;
      const dataUrl = await QR.toDataURL(`${origin}/i/${t}`, {
        margin: 1,
        scale: 6,
      });
      setQrDataUrl(dataUrl);
    })().catch((e) => setErr(String(e)));
  }, [userId, origin]);

  const copy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
  };

  return (
    <section className="card p-3">
      <div className="section-row">
        <h2 className="section-title">Invite friends</h2>
      </div>

      {err && <div className="note">Error: {err}</div>}

      {!token && !err && <p className="muted">Preparing your invite…</p>}

      {token && (
        <div className="stack" style={{ alignItems: "center", textAlign: "center" }}>
          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt="Invite QR code"
              style={{ width: 160, height: 160, borderRadius: 8 }}
            />
          )}
          <code className="muted" style={{ wordBreak: "break-all" }}>
            {inviteUrl}
          </code>
          <div className="controls" style={{ justifyContent: "center" }}>
            <button className="btn btn-brand" onClick={copy}>Copy link</button>
          </div>
        </div>
      )}
    </section>
  );
}
