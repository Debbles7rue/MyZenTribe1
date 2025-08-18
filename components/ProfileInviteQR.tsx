"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  userId: string | null;
  /** Back-compat wrapper style for the full widget */
  embed?: boolean;
  /** Render mode: 'full' (inputs + link + QR) or 'qr-only' (just the QR image) */
  mode?: "full" | "qr-only";
  /** QR pixel size (applies to both modes). Default 220. */
  size?: number;
};

export default function ProfileInviteQR({
  userId,
  embed = false,
  mode = "full",
  size = 220,
}: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  // Load or create the permanent invite token via RPC
  useEffect(() => {
    (async () => {
      if (!userId) return;
      setLoading(true);
      setErr(null);
      const { data, error } = await supabase.rpc("get_or_create_reusable_invite", { p_target: userId });
      if (error || !data) setErr(error?.message || "Could not load invite link");
      else setToken(String(data));
      setLoading(false);
    })();
  }, [userId]);

  const inviteUrl = useMemo(() => {
    if (!token || typeof window === "undefined") return "";
    return `${window.location.origin}/invite/${token}`;
  }, [token]);

  const qrUrl = inviteUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(inviteUrl)}`
    : "";

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);

  const sendEmail = useCallback(() => {
    if (!inviteUrl || !emailValid) return;
    const subject = encodeURIComponent("Join me on MyZenTribe");
    const body = encodeURIComponent(`Hi,\n\nHere is my invite link:\n${inviteUrl}\n\nSee you there!`);
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
  }, [email, emailValid, inviteUrl]);

  // --- QR-ONLY MODE ---
  if (mode === "qr-only") {
    if (!inviteUrl) {
      // keep the slot stable while loading
      return (
        <div
          className="rounded-xl"
          style={{
            width: size,
            height: size,
            background: "rgba(0,0,0,0.03)",
          }}
          aria-busy="true"
          aria-label="Loading invite QR"
        />
      );
    }

    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={qrUrl}
        alt="Invite QR"
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: 12,
          border: "1px solid #eee",
          display: "block",
        }}
      />
    );
  }

  // --- FULL WIDGET MODE (original behavior) ---
  const Content = (
    <div className="stack" style={{ gap: 8 }}>
      <div className="label" style={{ fontWeight: 600 }}>
        Invite friends <span className="muted text-xs">v2</span>
      </div>

      {/* Email input + send */}
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
          onClick={sendEmail}
          disabled={!emailValid || !inviteUrl || loading}
          title={!inviteUrl ? "Loading invite link..." : ""}
        >
          Email invite
        </button>
      </div>

      {/* Link + copy */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          className="input"
          value={inviteUrl}
          readOnly
          placeholder={loading ? "Loading invite link..." : ""}
          style={{ minWidth: 260, flex: 1 }}
        />
        <button
          className="btn btn-brand"
          onClick={() => inviteUrl && navigator.clipboard.writeText(inviteUrl)}
          disabled={!inviteUrl || loading}
        >
          Copy link
        </button>
      </div>

      {/* QR image */}
      {inviteUrl && (
        <div className="card p-3" style={{ textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt="Invite QR"
            width={size}
            height={size}
            style={{ width: size, height: size, margin: "0 auto", borderRadius: 12, border: "1px solid #eee" }}
          />
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Scan the QR or share your link.
          </div>
        </div>
      )}

      {err && <p className="muted" style={{ color: "#b91c1c" }}>{err}</p>}
    </div>
  );

  if (embed) return <div style={{ marginTop: 10, maxWidth: 640 }}>{Content}</div>;
  return <section className="card p-3">{Content}</section>;
}
