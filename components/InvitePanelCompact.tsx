"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import QRCode from "qrcode";

type Props = { userId: string | null };

const INVITE_PATH = process.env.NEXT_PUBLIC_INVITE_PATH || "/invite";

export default function InvitePanelCompact({ userId }: Props) {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const link = useMemo(() => {
    if (!token || typeof window === "undefined") return "";
    return `${window.location.origin}${INVITE_PATH}/${token}`;
  }, [token]);

  // fetch/create token (reuse newest)
  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true); setError(null);
      try {
        const { data: exist, error: selErr } = await supabase
          .from("friend_invites")
          .select("token")
          .eq("to_user", userId)
          .order("created_at", { ascending: false })
          .limit(1);
        if (selErr) throw selErr;

        if (exist && exist.length) {
          setToken(exist[0].token);
        } else {
          const { data: ins, error: insErr } = await supabase
            .from("friend_invites")
            .insert({ to_user: userId })
            .select("token")
            .limit(1);
          if (insErr) throw insErr;
          if (ins && ins.length) setToken(ins[0].token);
        }
      } catch (e: any) {
        setError(e?.message || "Could not get invite link.");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  useEffect(() => {
    if (!showQR || !link) return setQrDataUrl("");
    (async () => {
      try {
        const dataUrl = await QRCode.toDataURL(link, { margin: 1, width: 256, errorCorrectionLevel: "M" });
        setQrDataUrl(dataUrl);
      } catch { setQrDataUrl(""); }
    })();
  }, [showQR, link]);

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true); setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <section className="card p-3" style={{ padding: 12 }}>
      <div className="section-row">
        <h3 className="section-title" style={{ marginBottom: 4 }}>Invite friends</h3>
        {/* small toggle, keep card compact */}
        <button className="btn btn-neutral" onClick={() => setShowQR((s) => !s)} disabled={!link || !!error || loading}>
          {showQR ? "Hide QR" : "Show QR"}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">Error: {error}</p>}
      {loading && <p className="muted">Preparing link…</p>}

      {!!link && !loading && (
        <div className="stack" style={{ gap: 8 }}>
          <div className="controls" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-brand" onClick={copy}>{copied ? "Copied!" : "Copy link"}</button>
            <a className="btn btn-neutral" href={link} target="_blank" rel="noreferrer">Open invite</a>
          </div>
          {showQR && (
            <div className="grid place-items-center" style={{ paddingTop: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Invite QR" width={160} height={160} style={{ borderRadius: 10 }} />
            </div>
          )}
        </div>
      )}
      <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
        Share your link. New signups can send you a friend request.
      </p>
    </section>
  );
}
