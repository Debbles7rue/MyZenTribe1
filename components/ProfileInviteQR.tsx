"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
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
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s?.user?.id)).data.subscription;
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session?.user?.id);
      setSessionReady(true);
    });
    return () => sub?.unsubscribe?.();
  }, []);

  useEffect(() => {
    (async () => {
      if (!open || !sessionReady || !authed || !userId) return;
      setLoading(true);
      setErr(null);
      const { data, error } = await supabase.rpc("get_or_create_reusable_invite", { p_target: userId });
      if (error || !data) setErr(error?.message || "Could not load invite link");
      else {
        setToken(String(data));
        setQrOk(true);
      }
      setLoading(false);
    })();
  }, [open, sessionReady, authed, userId]);

  const inviteUrl = useMemo(() => {
    if (!token || typeof window === "undefined") return "";
    return new URL(`/invite/${token}`, window.location.origin).toString();
  }, [token]);

  const qrUrl = useMemo(() => {
    if (!inviteUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(inviteUrl)}&_cb=${encodeURIComponent(token || "")}`;
  }, [inviteUrl, token, qrSize]);

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);

  const sendEmail = useCallback(() => {
    if (!inviteUrl || !emailValid) return;
    const subject = encodeURIComponent("Join me on MyZenTribe");
    const body = encodeURIComponent(`Hi,\n\nHere is my invite link:\n${inviteUrl}\n\nSee you there!`);
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
  }, [email, emailValid, inviteUrl]);

  const copyLink = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      alert("Invite link copied!");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = inviteUrl;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); alert("Invite link copied!"); }
      finally { document.body.removeChild(ta); }
    }
  }, [inviteUrl]);

  const openLink = useCallback(() => {
    if (inviteUrl) window.open(inviteUrl, "_blank", "noopener,noreferrer");
  }, [inviteUrl]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const el = panelRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  const Panel = (
    <div ref={panelRef} className="card p-3" style={{ marginTop: 10, maxWidth: 520, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", borderRadius: 12 }}>
      {!sessionReady ? (
        <div className="muted">Checking your session…</div>
      ) : !authed || !userId ? (
        <div style={{ textAlign: "center" }}>
          <div className="muted" style={{ fontSize: 13 }}>You’re not signed in on this device. Please sign in to generate your invite link.</div>
          <div className="mt-2"><a className="btn btn-brand" href="/login">Sign in</a></div>
        </div>
      ) : (
        <>
          {inviteUrl ? (
            <div style={{ textAlign: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="Invite QR" width={qrSize} height={qrSize}
                   style={{ width: qrSize, height: qrSize, margin: "0 auto", borderRadius: 12, border: "1px solid #eee", display: qrOk ? "block" : "none" }}
                   onError={() => setQrOk(false)} />
              {!qrOk && <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>(QR preview unavailable; use the link below)</div>}
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Scan the QR or share your link.</div>
              <div className="mt-2" style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                <button className="btn" onClick={openLink}>Open</button>
                <button className="btn" onClick={copyLink}>Copy</button>
                {"share" in navigator && (
                  <button className="btn" onClick={async () => {
                    // @ts-ignore
                    await navigator.share({ title: "Join me on MyZenTribe", text: "Here’s my invite link:", url: inviteUrl });
                  }}>Share</button>
                )}
              </div>
            </div>
          ) : (
            <div className="muted">{loading ? "Generating your invite…" : (err || "No invite available yet.")}</div>
          )}

          <div className="mt-3" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input className="input" value={inviteUrl} readOnly placeholder={loading ? "Loading…" : ""} style={{ minWidth: 220, flex: 1 }} />
            <button className="btn btn-brand" onClick={copyLink} disabled={!inviteUrl || loading}>Copy link</button>
          </div>

          <div className="mt-2" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input className="input" placeholder="friend@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ minWidth: 200, flex: 1 }} />
            <button className="btn" onClick={sendEmail} disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !inviteUrl || loading}>Email invite</button>
          </div>

          {err && <p className="muted" style={{ color: "#b91c1c", marginTop: 6 }}>{err}</p>}
        </>
      )}
    </div>
  );

  const Body = (
    <div className="stack" style={{ gap: 10 }}>
      <div className="label" style={{ fontWeight: 600 }}>Invite friends</div>
      <div><button className="btn btn-brand" onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }} aria-expanded={open} aria-controls="invite-panel">Invite</button></div>
      {open && <div id="invite-panel">{Panel}</div>}
    </div>
  );

  if (embed) return <div style={{ marginTop: 10, maxWidth: 640 }}>{Body}</div>;
  return <section className="card p-3">{Body}</section>;
}
