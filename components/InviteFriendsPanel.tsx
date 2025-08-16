"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabaseClient";

type Props = { userId: string | null };

// Optional config via env:
// - NEXT_PUBLIC_INVITE_RPC_NAME: if set, we'll try an RPC first, then fall back to table flow
// - NEXT_PUBLIC_INVITE_PATH: path segment for invite links, default "/i" (set to "/e" to keep your current links)
const RPC_NAME = process.env.NEXT_PUBLIC_INVITE_RPC_NAME;
const INVITE_PATH = process.env.NEXT_PUBLIC_INVITE_PATH || "/i";

type InviteData = { token?: string } | string | null | any;

function extractToken(data: InviteData): string | null {
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof data === "object" && data.token) return String(data.token);
  if (Array.isArray(data) && data.length && data[0]?.token) return String(data[0].token);
  return null;
}

export default function InviteFriendsPanel({ userId }: Props) {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>(""); // data: URL PNG if we can generate locally

  // Build the share link from the token
  const link = useMemo(() => {
    if (!token) return "";
    if (typeof window === "undefined") return "";
    return `${window.location.origin}${INVITE_PATH}/${token}`;
  }, [token]);

  // Fallback QR (Google Charts) if QRCode generation fails or hasn't run yet
  const fallbackQrSrc = useMemo(() => {
    if (!link) return "";
    const base = "https://chart.googleapis.com/chart";
    const params = new URLSearchParams({
      cht: "qr",
      chs: "200x200",
      chl: link,
      chld: "L|0",
    });
    return `${base}?${params.toString()}`;
  }, [link]);

  const triedRef = useRef(false);

  const ensureToken = useCallback(async () => {
    if (triedRef.current) return;
    triedRef.current = true;

    if (!userId) {
      setError("You need to be signed in to generate an invite.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1) Prefer RPC if provided
      if (RPC_NAME) {
        const { data, error: rpcErr } = await supabase.rpc(RPC_NAME as any);
        if (!rpcErr) {
          const t = extractToken(data);
          if (t) {
            setToken(t);
          } else {
            // Fall back to table if RPC returned no token
            console.warn("Invite RPC returned no token; falling back to table flow.");
          }
        } else {
          console.warn("Invite RPC failed; falling back to table flow:", rpcErr.message);
        }
      }

      // 2) Table flow (your original logic) if no token yet
      if (!token) {
        // try to reuse newest token
        const { data: exist, error: selErr } = await supabase
          .from("friend_invites")
          .select("token")
          .eq("to_user", userId) // Keeping your schema usage
          .order("created_at", { ascending: false })
          .limit(1);

        if (selErr) throw selErr;

        if (exist && exist.length) {
          setToken(exist[0].token);
        } else {
          // create a new one
          const { data: ins, error: insErr } = await supabase
            .from("friend_invites")
            .insert({ to_user: userId })
            .select("token")
            .limit(1);

          if (insErr) throw insErr;
          if (ins && ins.length) setToken(ins[0].token);
        }
      }
    } catch (e: any) {
      setError(e?.message || "Could not create or fetch an invite token.");
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  // Generate a high-res data:URL QR after we have the link
  const makeQr = useCallback(async () => {
    if (!link) return;
    try {
      const dataUrl = await QRCode.toDataURL(link, {
        margin: 1,
        width: 512,
        errorCorrectionLevel: "M",
      });
      setQrDataUrl(dataUrl);
    } catch (e) {
      // it's fine — we'll show the Google Charts fallback
      console.warn("Local QR generation failed; using fallback image.");
    }
  }, [link]);

  useEffect(() => {
    ensureToken();
  }, [ensureToken]);

  useEffect(() => {
    setQrDataUrl("");
    makeQr();
  }, [makeQr]);

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (e: any) {
      setError(e?.message || "Could not copy.");
    }
  }

  function downloadPng() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = "myzentribe-invite.png";
    a.click();
  }

  return (
    <section className="card p-3">
      <h2 className="section-title">Invite friends</h2>
      <p className="muted">
        Share your personal invite link. When your friend opens it, they’ll be asked to sign in (or sign up) and can send you a friend request.
      </p>

      {loading && <p className="muted">Preparing your invite…</p>}
      {error && <p className="text-red-600 text-sm">Error: {error}</p>}

      {!loading && token && (
        <div className="stack" style={{ alignItems: "center" }}>
          <img
            src={qrDataUrl || fallbackQrSrc}
            alt="Invite QR"
            width={200}
            height={200}
            style={{ borderRadius: 12, boxShadow: "0 6px 18px rgba(0,0,0,.12)" }}
          />

          <div className="stack" style={{ width: "100%", maxWidth: 520 }}>
            <input
              className="input"
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className="controls" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-brand" onClick={copyLink} aria-label="Copy invite link">
                {copied ? "Copied!" : "Copy link"}
              </button>
              <a className="btn btn-neutral" href={link} target="_blank" rel="noreferrer">
                Open link
              </a>
              <button
                className="btn btn-neutral"
                onClick={downloadPng}
                disabled={!qrDataUrl}
                title={qrDataUrl ? "Download QR as PNG" : "QR file download available after local generation"}
              >
                Download QR PNG
              </button>
            </div>
            <p className="muted" style={{ fontSize: 12 }}>
              Tip: Put this QR on flyers, business cards, or your website.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
