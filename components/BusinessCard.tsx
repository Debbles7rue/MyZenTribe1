// components/BusinessCard.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ProfileInviteQR from "@/components/ProfileInviteQR";

type Props = { userId: string | null };

type BizRow = {
  business_name: string | null;
  business_logo_url: string | null;
  business_bio: string | null;
  business_location_text: string | null;
  business_location_is_public: boolean | null;
};

export default function BusinessCard({ userId }: Props) {
  const [biz, setBiz] = useState<BizRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!userId) return;
      setLoading(true);
      // Only request business_* columns; if they don't exist yet, we'll catch the error and show placeholders.
      const { data } = await supabase
        .from("profiles")
        .select("business_name, business_logo_url, business_bio, business_location_text, business_location_is_public")
        .eq("id", userId)
        .maybeSingle();
      setBiz((data as BizRow) ?? null);
      setLoading(false);
    })();
  }, [userId]);

  const name = biz?.business_name || "Your business name";
  const logo = biz?.business_logo_url || "/placeholder.png";
  const showLoc = !!biz?.business_location_is_public && !!biz?.business_location_text;

  return (
    <section
      className="card p-3"
      style={{ borderColor: "rgba(196,181,253,.7)", background: "rgba(245,243,255,.35)" }}
    >
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "140px 1fr 160px", alignItems: "center" }}>
          {/* Logo (business-only; never personal) */}
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logo}
              alt="Business logo"
              width={120}
              height={120}
              style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 16, border: "1px solid #eee" }}
            />
          </div>

          {/* Business text */}
          <div className="min-w-0">
            <h2 className="text-xl font-semibold" style={{ marginBottom: 6 }}>{name}</h2>
            <div className="muted">
              {showLoc ? `Based in ${biz!.business_location_text}` : "Location hidden"}
            </div>
            {biz?.business_bio ? (
              <p className="muted mt-2" style={{ whiteSpace: "pre-wrap" }}>{biz.business_bio}</p>
            ) : (
              <p className="muted mt-2">Add a short description of what you offer.</p>
            )}
          </div>

          {/* Compact QR share — no email UI on business page */}
          <div className="flex flex-col items-center justify-center gap-2">
            <ProfileInviteQR userId={userId} mode="qr-only" size={140} />
            <span className="muted text-xs">Share your invite</span>
          </div>
        </div>
      )}
    </section>
  );
}
