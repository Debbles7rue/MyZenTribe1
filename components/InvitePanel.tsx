"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function InvitePanel({ userId }: { userId: string | null }) {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openQR, setOpenQR] = useState(false);
  const [email, setEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState<string | null>(null);

  const inviteUrl = useMemo(() => {
    if (!token || typeof window === "undefined") return "";
    return `${window.location.origin}/invite/${token}`;
  }, [token]);

  const qrUrl = inviteUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        inviteUrl
      )}`
    : "";

  const generate = useCallback(async () => {
    if (!userId) return;
    setBusy(true);
    try {
      const newToken = crypto.randomUUID();
      const { error } = await supabase.from("friend_invites").insert({
        token: newToken,
        created_by: userId,
        target_user: userId, // people who scan will send a request to ME
        single_use: true,
      });
      if (error) throw error;
      setToken(newToken);
      setOpenQR(true);
    } catch (e: any) {
      alert(e.message || "Failed to create invite.");
    } finally {
      setBusy(false);
    }
  }, [userId]);

  // Load most recent token so the user has a stable QR if they already made one
  useEffect(() => {
    (async () => {
      if (!userId) return;
      const { data } = await supabase
        .from("friend_invites")
        .select("token, created_at")
        .eq("created_by", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.token) setToken(data.token);
    })();
  }, [userId]);

  async function inviteByEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailMsg(null);
    const p_email = email.trim();
    if (!p_email) return;
    const { data, error } = await supabase.rpc("send_friend_request_by_email", { p_email });
    if (error) {
      setEmailMsg(error.message);
      return;
    }
    if (data === "no_user") setEmailMsg("No account with that email yet.");
    else if (data === "self") setEmailMsg("That’s your own email 🙂");
    else setEmailMsg("Friend request sent!");
  }

  if (!userId) return null;

  return (
    <section className="card p-3">
      <h2 className="section-title">Invite friends</h2>

      {/* QR controls */}
      <div className="stack" style={{ gap: 8 }}>
        <div className="controls">
          {!openQR ? (
            <button className="btn" onClick={() => setOpenQR(true)}>Show QR</button>
          ) : (
            <button className="btn" onClick={() => setOpenQR(false)}>Hide QR</button>
          )}
          <button className="btn btn-neutral" onClick={generate} disabled={busy}>
            {busy ? "Generating…" : token ? "Regenerate QR" : "Generate QR"}
          </button>
          {token && (
            <button
              className="btn"
              onClick={() => navigator.clipboard.writeText(inviteUrl)}
              title="Copy invite link"
            >
              Copy link
            </button>
          )}
        </div>

        {openQR && token && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <img
              src={qrUrl}
              alt="Invite QR"
              style={{ width: 220, height: 220, borderRadius: 12, border: "1px solid #eee" }}
            />
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="muted" style={{ margin: "12px 0" }}>or</div>

      {/* Email invite */}
      <form onSubmit={inviteByEmail} className="stack" style={{ gap: 8 }}>
        <label className="field">
          <span className="label">Invite by email</span>
          <input
            type="email"
            className="input"
            placeholder="friend@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <div className="right">
          <button className="btn btn-brand" type="submit">Send request</button>
        </div>
        {emailMsg && <div className="muted">{emailMsg}</div>}
      </form>
    </section>
  );
}
