// components/ProfileInviteQR.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  userId: string | null;
  embed?: boolean;

  /** Optional display mode. "compact" = QR + basic actions (no email UI) */
  mode?: string; // accept any string to avoid TS friction (e.g., "compact")
  /** Preferred QR size (px). Also supports legacy `qrSize`. */
  size?: number;
  qrSize?: number;

  /** Accept legacy prop some pages might pass; unused here but keeps TS happy. */
  context?: string;
};

export default function ProfileInviteQR({
  userId,
  embed = false,
  mode = "full",
  size,
  qrSize,
}: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [qrOk, setQrOk] = useState(true);

  // Fetch (or create) a reusable invite token
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!userId) return;
      setLoading(true);
      setErr(null);
      const { data, error } = await supabase.rpc("get_or_create_reusable_invite", { p_target: userId });
      if (!alive) return;
      if (error || !data) setErr(error?.message || "Could not load invite link");
      else setToken(String(data));
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  // One canonical link used for BOTH QR and copy
  const inviteUrl = useMemo(() => {
    if (!token || typeof window === "undefined") return "";
    return new URL(`/invite/${token}`, window.location.origin).toString();
  }, [token]);

  // Final QR size preference (default ~180)
  const finalSize = useMemo(() => {
    if (typeof size === "number" && size > 0) return size;
    if (typeof qrSize === "number" && qrSize > 0) return qrSize;
    return 180;
  }, [size, qrSize]);

  // Small QR, cache-busted so CDNs never serve an older data URL
  const qrUrl = useMemo(() => {
    if (!inviteUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=${finalSize}x${finalSize}&data=${encodeURIComponent(
      inviteUrl
    )}&_cb=${encodeURIComponent(token || "")}`;
  }, [inviteUrl, token, finalSize]);

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);

  const sendEmail = useCallback(() => {
    if (!inviteUrl || !emailValid) return;
    const subject = encodeURIComponent("Join me on MyZenTribe");
    const body = encodeURIComponent(`Hi,\n\nHere is my invite link:\n${inviteUrl}\n\nSee you there!`);
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
  }, [email, emailValid, inviteUrl]);

  const openLink = useCallback(() => {
    if (!inviteUrl) return;
    window.open(inviteUrl, "_blank", "noopener,noreferrer");
  }, [inviteUrl]);

  const copyLink = useCallback(() => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl).catch(() => {});
  }, [inviteUrl]);

  const showEmailUI = mode !== "compact";

  const Content = (
    <div className="stack" style={{ gap: 10 }}>
      <div className="label" style={{ fontWeight: 600 }}>
        Invite friends <span className="muted text-xs">v2</span>
      </div>

      {/* QR */}
      {inviteUrl ? (
        <div className="card p-3" style={{ textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt="Invite QR"
            width={finalSize}
            height={finalSize}
            style={{
              width: finalSize,
              height: finalSize,
              margin: "0 auto",
              borderRadius: 12,
              border: "1px solid #eee",
              display: qrOk ? "block" : "none",
            }}
            onError={() => setQrOk(false)}
          />
          {!qrOk && (
            <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
              (QR preview unavailable; use the link or Open button below)
            </div>
          )}

          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Scan the QR or share your link.
          </div>

          <div className="right mt-2" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn" onClick={openLink} disabled={!inviteUrl}>
              Open link
            </button>
            <button className="btn btn-brand" onClick={copyLink} disabled={!inviteUrl || loading}>
              Copy link
            </button>
          </div>
        </div>
      ) : (
        <div className="muted">Generating your invite…</div>
      )}

      {/* Link + copy (same exact URL the QR encodes) */}
      <div style={{ display: showEmailUI ? "flex" : "none", gap: 8, flexWrap: "wrap" }}>
        <input
          className="input"
          value={inviteUrl}
          readOnly
          placeholder={loading ? "Loading invite link..." : ""}
          style={{ minWidth: 260, flex: 1 }}
        />
        <button className="btn btn-brand" onClick={copyLink} disabled={!inviteUrl || loading}>
          Copy link
        </button>
      </div>

      {/* Email input + send (hidden in compact mode) */}
      {showEmailUI && (
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
      )}

      {err && (
        <p className="muted" style={{ color: "#b91c1c" }}>
          {err}
        </p>
      )}
    </div>
  );

  if (embed) return <div style={{ marginTop: 10, maxWidth: 640 }}>{Content}</div>;
  return <section className="card p-3">{Content}</section>;
}
