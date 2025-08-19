"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  userId: string | null;
  embed?: boolean;
  qrSize?: number;
  context?: string;
};

export default function ProfileInviteQR({ userId, embed = false, qrSize = 200 }: Props) {
  const [sessionReady, setSessionReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [qrOk, setQrOk] = useState(true);

  // 1) Ensure we actually have a session on mobile before calling RPCs
  useEffect(() => {
    let unsub: any;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const has = !!data.session?.user?.id;
      setAuthed(has);
      setSessionReady(true);
      unsub = supabase.auth.onAuthStateChange((_evt, newSession) => {
        setAuthed(!!newSession?.user?.id);
      }).data.subscription;
    })();
    return () => unsub?.unsubscribe?.();
  }, []);

  // 2) Fetch (or create) a reusable invite token once we know we’re authed
  useEffect(() => {
    (async () => {
      if (!sessionReady) return;          // wait for auth hydration (mobile)
      if (!authed || !userId) return;     // show sign-in hint if not authed
      setLoading(true);
      setErr(null);
      const { data, error } = await supabase.rpc("get_or_create_reusable_invite", { p_target: userId });
      if (error || !data) {
        setErr(error?.message || "Could not load invite link");
      } else {
        setToken(String(data));
        setQrOk(true);
      }
      setLoading(false);
    })();
  }, [sessionReady, authed, userId]);

  const inviteUrl = useMemo(() => {
    if (!token || typeof window === "undefined") return "";
    return new URL(`/invite/${token}`, window.location.origin).toString();
  }, [token]);

  const qrUrl = useMemo(() => {
    if (!inviteUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(
      inviteUrl
    )}&_cb=${encodeURIComponent(token || "")}`;
  }, [inviteUrl, token, qrSize]);

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);

  const sendEmail = useCallback(() => {
    if (!inviteUrl || !emailValid) return;
    const subject = encodeURIComponent("Join me on MyZenTribe");
    const body = encodeURIComponent(`Hi,\n\nHere is my invite link:\n${inviteUrl}\n\nSee you there!`);
    // mailto works reliably in mobile browsers
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
  }, [email, emailValid, inviteUrl]);

  const copyLink = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      alert("Invite link copied!");
    } catch {
      // iOS fallback
      const ta = document.createElement("textarea");
      ta.value = inviteUrl;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        alert("Invite link copied!");
      } finally {
        document.body.removeChild(ta);
      }
    }
  }, [inviteUrl]);

  const openLink = useCallback(() => {
    if (!inviteUrl) return;
    window.open(inviteUrl, "_blank", "noopener,noreferrer");
  }, [inviteUrl]);

  // Sign-in help for mobile if no session
  const SignInNotice = (
    <div className="card p-3" style={{ textAlign: "center" }}>
      <div className="muted" style={{ fontSize: 13 }}>
        You’re not signed in on this device. Please sign in to generate your invite link.
      </div>
      <div className="mt-2" style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <a className="btn btn-brand" href="/login">Sign in</a>
        <button
          className="btn"
          onClick={async () => {
            // If you use OAuth, you can trigger it here; otherwise show /login.
            // await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.href }});
            window.location.href = "/login";
          }}
        >
          Use another method
        </button>
      </div>
    </div>
  );

  const Content = (
    <div className="stack" style={{ gap: 10 }}>
      <div className="label" style={{ fontWeight: 600 }}>Invite friends</div>

      {!sessionReady ? (
        <div className="muted">Checking your session…</div>
      ) : !authed || !userId ? (
        SignInNotice
      ) : (
        <>
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
                  (QR preview unavailable; use the link below)
                </div>
              )}

              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                Scan the QR or share your link.
              </div>

              <div className="right mt-2" style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button className="btn" onClick={openLink} disabled={!inviteUrl}>Open link</button>
                <button className="btn" onClick={copyLink} disabled={!inviteUrl}>Copy</button>
                {"share" in navigator && (
                  <button className="btn" onClick={async () => {
                    // @ts-ignore
                    await navigator.share({ title: "Join me on MyZenTribe", text: "Here’s my invite link:", url: inviteUrl });
                  }}>
                    Share
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="muted">{loading ? "Generating your invite…" : (err || "No invite available yet.")}</div>
          )}

          {/* Link + copy */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input className="input" value={inviteUrl} readOnly placeholder={loading ? "Loading invite link..." : ""} style={{ minWidth: 260, flex: 1 }} />
            <button className="btn btn-brand" onClick={copyLink} disabled={!inviteUrl || loading}>Copy link</button>
          </div>

          {/* Email input + send (works on mobile) */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input className="input" placeholder="friend@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ minWidth: 220, flex: 1 }} />
            <button className="btn" onClick={sendEmail} disabled={!inviteUrl || !emailValid || loading}>Email invite</button>
          </div>

          {err && <p className="muted" style={{ color: "#b91c1c" }}>{err}</p>}
        </>
      )}
    </div>
  );

  if (embed) return <div style={{ marginTop: 10, maxWidth: 640 }}>{Content}</div>;
  return <section className="card p-3">{Content}</section>;
}
