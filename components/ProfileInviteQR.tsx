"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  userId: string | null;
  embed?: boolean;
  /** Distinguish where the invite is coming from; changes the URL so QR codes differ */
  context?: "personal" | "business";
  /** QR code size in pixels (square). Defaults to 160. Clamped between 96 and 300. */
  qrSize?: number;
};

export default function ProfileInviteQR({
  userId,
  embed = false,
  context = "personal",
  qrSize = 160,
}: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  // clamp size (avoid extremes / layout breaks)
  const size = Math.max(96, Math.min(qrSize || 160, 300));

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
    const base = `${window.location.origin}/invite/${token}`;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}src=${encodeURIComponent(context)}`;
  }, [token, context]);

  const qrUrl = inviteUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(inviteUrl)}`
    : "";

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);

  const sendEmail = useCallback(() => {
    if (!inviteUrl || !emailValid) return;
    const label = context === "business" ? " (Business)" : "";
    const subject = encodeURIComponent(`Join me on MyZenTribe${label}`);
    const body = encodeURIComponent(`Hi,\n\nHere is my invite link:\n${inviteUrl}\n\nSee you there!`);
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
  }, [email, emailValid, inviteUrl, context]);

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

      {/* QR auto (smaller by default) */}
      {inviteUrl && (
        <div className="card p-3" style={{ textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt="Invite QR"
            width={size}
            height={size}
            style={{
              width: size,
              height: size,
              margin: "0 auto",
              borderRadius: 12,
              border: "1px solid #eee",
            }}
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
