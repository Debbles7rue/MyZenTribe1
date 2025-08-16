"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = { userId: string | null };

export default function ProfileInviteQR({ userId }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const inviteUrl = useMemo(() => {
    if (!token) return "";
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/invite/${token}`;
  }, [token]);

  const qrUrl = inviteUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        inviteUrl
      )}`
    : "";

  const generate = useCallback(async () => {
    if (!userId) return;
    setBusy(true);
    setErr(null);
    try {
      const newToken = crypto.randomUUID();
      const { error } = await supabase.from("friend_invites").insert({
        token: newToken,
        target_user: userId,
        created_by: userId,
        single_use: true,
      });
      if (error) throw error;
      setToken(newToken);
    } catch (e: any) {
      setErr(e.message || "Failed to create invite.");
    } finally {
      setBusy(false);
    }
  }, [userId]);

  // Optional: load latest invite created by me
  useEffect(() => {
    (async () => {
      if (!userId) return;
      const { data, error } = await supabase
        .from("friend_invites")
        .select("token, created_at")
        .eq("created_by", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error && data?.token) setToken(data.token);
    })();
  }, [userId]);

  if (!userId) return null;

  return (
    <section className="card p-3">
      <div className="section-row">
        <h2 className="section-title">Share your profile</h2>
        <div className="muted">Show this QR to send you a friend request.</div>
      </div>

      {token ? (
        <div className="stack items-center" style={{ alignItems: "center" as any }}>
          <img
            src={qrUrl}
            alt="Invite QR"
            style={{ width: 220, height: 220, borderRadius: 12, border: "1px solid #eee" }}
          />
          <div className="controls" style={{ justifyContent: "center" }}>
            <button
              className="btn"
              onClick={() => {
                navigator.clipboard.writeText(inviteUrl);
              }}
            >
              Copy link
            </button>
            <button className="btn btn-neutral" onClick={generate} disabled={busy}>
              {busy ? "Generating…" : "Regenerate"}
            </button>
          </div>
        </div>
      ) : (
        <div className="stack items-center" style={{ alignItems: "center" as any }}>
          <button className="btn btn-brand" onClick={generate} disabled={busy}>
            {busy ? "Generating…" : "Generate QR"}
          </button>
        </div>
      )}

      {err && <p className="muted" style={{ color: "#b91c1c" }}>{err}</p>}
    </section>
  );
}
