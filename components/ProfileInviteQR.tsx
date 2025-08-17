"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  userId: string | null;
  /** Render without card wrapper so it fits inside the profile header nicely */
  embed?: boolean;
};

export default function ProfileInviteQR({ userId, embed = false }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  // NEW: email invite state
  const [email, setEmail] = useState("");
  const emailValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    [email]
  );

  const inviteUrl = useMemo(() => {
    if (!token || typeof window === "undefined") return "";
    return `${window.location.origin}/invite/${token}`;
  }, [token]);

  // keep your external QR service
  const qrUrl = inviteUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(inviteUrl)}`
    : "";

  // Permanent token via RPC (reusable)
  const generate = useCallback(async () => {
    if (!userId) return;
    setBusy(true);
    setErr(null);
    try {
      const { data, error } = await supabase.rpc("get_or_create_reusable_invite", { p_target: userId });
      if (error || !data) throw error || new Error("Failed to create permanent invite.");
      setToken(data as string);
      setShowQR(true);
    } catch (e: any) {
      setErr(e.message || "Failed to create permanent invite.");
    } finally {
      setBusy(false);
    }
  }, [userId]);

  // Load existing permanent token after refresh (no creation)
  useEffect(() => {
    (async () => {
      if (!userId) return;
      // try REST read first
      const { data, error } = await supabase
        .from("friend_invites")
        .select("token")
        .eq("created_by", userId)
        .eq("target_user", userId)
        .eq("single_use", false)
        .limit(1)
        .maybeSingle();

      if (!error && data?.token) {
        setToken(data.token);
        return;
      }
      // fallback to RPC (also creates if missing)
      const { data: tkn, error: rpcErr } = await supabase.rpc("get_or_create_reusable_invite", { p_target: userId });
      if (!rpcErr && tkn) setToken(tkn as string);
    })();
  }, [userId]);

  // NEW: open the default mail app prefilled with the invite
  const emailInvite = useCallback(() => {
    if (!inviteUrl || !emailValid) return;
    const subject = encodeURIComponent("Join me on MyZenTribe");
    const body = encodeURIComponent(
      `Hi!\n\nI'd love to connect with you on MyZenTribe. Click this link to add me:\n\n${inviteUrl}\n\nSee you there!`
    );
    const href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
    // try open mail client; if blocked, copy link as fallback
    const opened = window.open(href, "_self");
    if (!opened) {
      navigator.clipboard.writeText(inviteUrl);
      alert("I copied your invite link since the mail app didn’t open.");
    }
  }, [email, emailValid, inviteUrl]);

  if (!userId) return null;

  const Content = (
    <div className="stack" style={{ gap: 8 }}>
      <div className="label" style={{ fontWeight: 600 }}>Invite friends</div>

      {/* NEW: Email entry row */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          className="input"
          placeholder="friend@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ minWidth: 220, flex: 1 }}
        />
        <button
          className="btn"
          onClick={emailInvite}
          disabled={!emailValid || !token}
          title={!token ? "Click Generate to create your permanent link first" : ""}
        >
          Email invite
        </button>
        {!token && (
          <button className="btn btn-neutral" onClick={generate} disabled={busy}>
            {busy ? "Generating…" : "Generate"}
          </button>
        )}
      </div>

      {/* Existing link/QR row (kept) */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input className="input" value={inviteUrl} readOnly style={{ minWidth: 260, flex: 1 }} />
        <button
          className="btn btn-brand"
          onClick={() => inviteUrl && navigator.clipboard.writeText(inviteUrl)}
          disabled={!inviteUrl}
        >
          Copy link
        </button>
        <button className="btn" onClick={() => setShowQR((v) => !v)} disabled={!inviteUrl && !token}>
          {showQR ? "Hide QR" : "Show QR"}
        </button>
      </div>

      {showQR && token && (
        <div className="card p-3" style={{ textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt="Invite QR"
            width={220}
            height={220}
            style={{ width: 220, height: 220, margin: "0 auto", borderRadius: 12, border: "1px solid #eee" }}
          />
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Scan or share your permanent invite link.
          </div>
        </div>
      )}

      {err && <p className="muted" style={{ color: "#b91c1c" }}>{err}</p>}
    </div>
  );

  if (embed) return <div style={{ marginTop: 10, maxWidth: 640 }}>{Content}</div>;
  return <section className="card p-3">{Content}</section>;
}
