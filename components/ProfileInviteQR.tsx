// components/ProfileInviteQR.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  userId: string | null;
  embed?: boolean;
  mode?: string;
  size?: number;
  qrSize?: number;
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
  const [copied, setCopied] = useState(false);

  // Fetch or create a reusable invite token
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!userId) return;
      setLoading(true);
      setErr(null);
      
      try {
        // Try RPC function first
        const { data, error } = await supabase.rpc("get_or_create_reusable_invite", { 
          p_target: userId 
        });
        
        if (error) {
          console.error("RPC error:", error);
          // Fallback to direct table access
          const { data: inviteData, error: inviteError } = await supabase
            .from("friend_invites")
            .select("token")
            .eq("to_user", userId)
            .is("accepted_at", null)
            .order("created_at", { ascending: false })
            .limit(1);
          
          if (inviteError) throw inviteError;
          
          if (inviteData && inviteData.length > 0) {
            setToken(inviteData[0].token);
          } else {
            // Create new invite
            const { data: newInvite, error: createError } = await supabase
              .from("friend_invites")
              .insert({ to_user: userId })
              .select("token")
              .single();
            
            if (createError) throw createError;
            setToken(newInvite.token);
          }
        } else {
          setToken(String(data));
        }
      } catch (error: any) {
        console.error("Error getting/creating invite:", error);
        if (!alive) return;
        setErr(error?.message || "Could not load invite link");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    
    return () => {
      alive = false;
    };
  }, [userId]);

  // Build the invite URL
  const inviteUrl = useMemo(() => {
    if (!token || typeof window === "undefined") return "";
    return new URL(`/invite/${token}`, window.location.origin).toString();
  }, [token]);

  // QR size (default 180px)
  const finalSize = useMemo(() => {
    if (typeof size === "number" && size > 0) return size;
    if (typeof qrSize === "number" && qrSize > 0) return qrSize;
    return 180;
  }, [size, qrSize]);

  // QR code URL using free QR service
  const qrUrl = useMemo(() => {
    if (!inviteUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=${finalSize}x${finalSize}&data=${encodeURIComponent(
      inviteUrl
    )}`;
  }, [inviteUrl, finalSize]);

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

  const copyLink = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      alert("Failed to copy link. You can select and copy it manually.");
    }
  }, [inviteUrl]);

  const showEmailUI = mode !== "compact";

  const Content = (
    <div className="stack" style={{ gap: 10 }}>
      <div className="label" style={{ fontWeight: 600 }}>
        Invite friends
      </div>

      {loading ? (
        <div className="text-center py-4">
          <div className="animate-pulse">
            <div className="h-32 w-32 bg-gray-200 rounded-lg mx-auto mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
          </div>
          <p className="text-sm text-gray-500 mt-2">Generating your invite...</p>
        </div>
      ) : err ? (
        <div className="text-center py-4">
          <p className="text-red-600 text-sm mb-2">{err}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn btn-sm btn-neutral"
          >
            Try Again
          </button>
        </div>
      ) : inviteUrl ? (
        <>
          {/* QR Code */}
          <div className="card p-3" style={{ textAlign: "center" }}>
            <img
              src={qrUrl}
              alt="Invite QR Code"
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
              onLoad={() => setQrOk(true)}
            />
            {!qrOk && (
              <div 
                className="bg-gray-100 rounded-lg flex items-center justify-center"
                style={{ 
                  width: finalSize, 
                  height: finalSize, 
                  margin: "0 auto" 
                }}
              >
                <div className="text-center p-4">
                  <div className="text-4xl mb-2">📱</div>
                  <div className="text-sm text-gray-600">QR Code Loading...</div>
                </div>
              </div>
            )}

            <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              Scan QR or share your link
            </div>

            <div className="mt-3" style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button className="btn btn-sm" onClick={openLink}>
                Open link
              </button>
              <button className="btn btn-sm btn-brand" onClick={copyLink}>
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
          </div>

          {/* Link input */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="input"
              value={inviteUrl}
              readOnly
              style={{ minWidth: 260, flex: 1 }}
              onFocus={(e) => e.target.select()}
            />
          </div>

          {/* Email input (if not compact mode) */}
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
                disabled={!emailValid || !inviteUrl}
              >
                Email invite
              </button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );

  if (embed) return <div style={{ marginTop: 10, maxWidth: 640 }}>{Content}</div>;
  return <section className="card p-3">{Content}</section>;
}
