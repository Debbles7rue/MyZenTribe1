"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  userId: string | null;
  embed?: boolean;
  /** Optional: overrides QR size (px). Defaults to 200. */
  qrSize?: number;
  /** Optional: passed by callers; not used here but accepted to avoid TS errors. */
  context?: string;
};

export default function ProfileInviteQR({ userId, embed = false, qrSize = 200, context }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [qrOk, setQrOk] = useState(true);

  // Fetch (or create) a reusable invite token
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId) return;
      setLoading(true);
      setErr(null);
      const { data, error } = await supabase.rpc("get_or_create_reusable_invite", { p_target: userId });
      if (!cancelled) {
        if (error || !data) setErr(error?.message || "Could not load invite link");
        else {
          setToken(String(data));
          setQrOk(true); // reset QR error when token changes
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Canonical link (used by both QR and copy/share)
  const inviteUrl = useMemo(() => {
    if (!token || typeof window === "undefined") return "";
    return new URL(`/invite/${token}`, window.location.origin).toString();
  }, [token]);

  // Small QR, cache-busted so CDNs never serve an old image
  const qrUrl = useMemo(() => {
    if (!inviteUrl) return "";
    // external lightweight QR service; we add a cb to avoid stale caching
    return `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(
      inviteUrl
    )}&_cb=${encodeURIComponent(token || "")}`;
  }, [inviteUrl, token, qrSize]);

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);

  const sendEmail = useCallback(() => {
    if (!inviteUrl || !emailValid) return;
    const subject = encodeURIComponent("Join me on MyZenTribe");
    const body = encodeURIComponent(`Hi,\n\nHere is my invite link:\n${inviteUrl}\n\nSee you there!`);
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
  }, [email, emailValid, inviteUrl]);

  const shareNative = useCallback(async () => {
    if (!inviteUrl || !("share" in navigator)) return;
    try {
      // @ts-ignore
      await navigator.share({ title: "Join me on MyZenTribe", text: "Here’s my invite link:", url: inviteUrl });
    } catch {
      /* user cancelled or not supported */
    }
  }, [inviteUrl]);

  const copyLink = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      alert("Invite link copied!");
    } catch {
      prompt("Copy this link:", inviteUrl);
    }
  }, [inviteUrl]);

  const openLink = useCallback(() => {
    if (!inviteUrl) return;
    window.open(inviteUrl, "_blank", "noopener,noreferrer");
  }, [inviteUrl]);

  const Content = (
    <div className="stack" style={{ gap: 10 }}>
      <div className="label" style={{ fontWeight: 600 }}>
        Invite friends
      </div>

      {/* QR */}
      {inviteUrl ? (
        <div className="card p-3" style={{ textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt="Invite QR"
            width={qrSize}
            height={qrSize}
            style={{
              width: qrSize,
              height: qrSize,
              margin: "0 auto",
              borderRadius: 12,
              border: "1px solid #eee",
              display: qrOk ? "block" : "none",
            }}
            onError={() => setQrOk(false)}
          />
          {!qrOk && (
            <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
              (QR preview unavailable; use the link or buttons below)
            </div>
          )}

          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Scan the QR or share your link.
          </div>

          <div className="right mt-2" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn" onClick={openLink} disabled={!inviteUrl}>
              Open link
            </button>
            <button className="btn" onClick={copyLink} disabled={!inviteUrl}>
              Copy
            </button>
            {"share" in navigator && (
              <button className="btn" onClick={shareNative} disabled={!inviteUrl}>
                Share
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="muted">Generating your invite…</div>
      )}

      {/* Link + copy (same exact URL the QR encodes) */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
