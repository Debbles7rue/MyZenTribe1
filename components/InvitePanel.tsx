"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

/**
 * InvitePanel
 * - Gets (or creates) a single invite token for the current user
 * - Builds a share URL:  https://your-site.com/invite/<token>
 * - Renders a QR image (using a simple QR image service to avoid extra deps)
 * - Copy / Share helpers
 */
export default function InvitePanel({ userId }: { userId: string | null }) {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const baseUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.protocol}//${window.location.host}`;

  const inviteUrl = useMemo(
    () => (token ? `${baseUrl}/invite/${token}` : ""),
    [baseUrl, token]
  );

  const qrSrc = useMemo(() => {
    if (!inviteUrl) return "";
    // zero-dependency QR (server generates a PNG). Keeps bundle small.
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
      inviteUrl
    )}`;
  }, [inviteUrl]);

  const loadOrCreate = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      // 1) try to fetch last invite
      const { data: existing, error: selErr } = await supabase
        .from("friend_invites")
        .select("token")
        .eq("to_user", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (selErr) throw selErr;

      if (existing?.token) {
        setToken(existing.token);
        setLoading(false);
        return;
      }

      // 2) none yet? create one
      const { data: ins, error: insErr } = await supabase
        .from("friend_invites")
        .insert({ to_user: userId })
        .select("token")
        .single();

      if (insErr) throw insErr;
      setToken(ins.token);
    } catch (e: any) {
      setError(
        e?.message ||
          "Could not create invite. Make sure the database table & policies exist."
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const copy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      alert("Invite link copied!");
    } catch {
      alert("Copy failed. You can select and copy it manually.");
    }
  };

  const share = async () => {
    if (!inviteUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "MyZenTribe invite",
          text: "Join me on MyZenTribe ✨",
          url: inviteUrl,
        });
      } catch {
        // ignore
      }
    } else {
      copy();
    }
  };

  return (
    <section className="card p-3">
      <div className="section-row">
        <h2 className="section-title">Invite a friend</h2>
      </div>

      {!userId ? (
        <p className="muted">Sign in to create an invite.</p>
      ) : (
        <>
          {!token ? (
            <div className="stack">
              <p className="muted">
                Generate a one-time link and QR code to add you as a friend.
              </p>
              <button className="btn btn-brand" onClick={loadOrCreate} disabled={loading}>
                {loading ? "Working…" : "Create invite"}
              </button>
              {error && (
                <div className="note">
                  <div className="note-title">Invite not ready</div>
                  <div className="note-body">
                    {error}
                    <br />
                    If this keeps happening, ensure the{" "}
                    <code>friend_invites</code> table exists with RLS policies.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="stack">
              <div className="flex items-center justify-center">
                {/* QR Image */}
                {qrSrc && (
                  <img
                    src={qrSrc}
                    alt="Invite QR"
                    width={220}
                    height={220}
                    style={{ borderRadius: 12, border: "1px solid #eee" }}
                  />
                )}
              </div>

              <div className="stack">
                <label className="label">Invite link</label>
                <input className="input" value={inviteUrl} readOnly />
                <div className="controls">
                  <button className="btn btn-brand" onClick={copy}>
                    Copy link
                  </button>
                  <button className="btn btn-neutral" onClick={share}>
                    Share…
                  </button>
                  <Link className="btn" href={`/invite/${token}`} target="_blank">
                    Open invite page
                  </Link>
                </div>
              </div>

              <div className="muted text-xs">
                Tip: Save the image to your phone to scan in person. The QR adds a friend request.
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
