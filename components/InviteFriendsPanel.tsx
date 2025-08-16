"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = { userId: string | null };

export default function InviteFriendsPanel({ userId }: Props) {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Build the share link from the token
  const link = useMemo(() => {
    if (!token) return "";
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/e/${token}`;
  }, [token]);

  // Google Chart API QR (no dependencies)
  const qrSrc = useMemo(() => {
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

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      setError(null);

      // Try to reuse the newest token
      const { data: exist, error: selErr } = await supabase
        .from("friend_invites")
        .select("token")
        .eq("to_user", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (selErr) {
        setError(selErr.message);
        setLoading(false);
        return;
      }

      if (exist && exist.length) {
        setToken(exist[0].token);
        setLoading(false);
        return;
      }

      // None? create a new one
      const { data: ins, error: insErr } = await supabase
        .from("friend_invites")
        .insert({ to_user: userId })
        .select("token")
        .limit(1);

      if (insErr) {
        setError(insErr.message);
      } else if (ins && ins.length) {
        setToken(ins[0].token);
      }
      setLoading(false);
    })();
  }, [userId]);

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

  return (
    <section className="card p-3">
      <h2 className="section-title">Invite friends</h2>
      <p className="muted">
        Share your personal invite link. When your friend opens it, they’ll be asked
        to sign in (or sign up) and can send you a friend request.
      </p>

      {loading && <p className="muted">Preparing your invite…</p>}
      {error && <p className="text-red-600 text-sm">Error: {error}</p>}

      {!loading && token && (
        <div className="stack" style={{ alignItems: "center" }}>
          {qrSrc && (
            <img
              src={qrSrc}
              alt="Invite QR"
              width={200}
              height={200}
              style={{ borderRadius: 12, boxShadow: "0 6px 18px rgba(0,0,0,.12)" }}
            />
          )}

          <div className="stack" style={{ width: "100%", maxWidth: 520 }}>
            <input
              className="input"
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className="controls">
              <button className="btn btn-brand" onClick={copyLink}>
                {copied ? "Copied!" : "Copy link"}
              </button>
              <a className="btn btn-neutral" href={link} target="_blank" rel="noreferrer">
                Open link
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
