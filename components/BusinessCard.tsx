// components/BusinessCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ProfileInviteQR from "@/components/ProfileInviteQR";

type Props = { userId: string | null };

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location_text?: string | null;
  location_is_public?: boolean | null;
};

export default function BusinessCard({ userId }: Props) {
  const [p, setP] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!userId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, bio, location_text, location_is_public")
        .eq("id", userId)
        .maybeSingle();
      if (!error && data) setP(data as Profile);
      setLoading(false);
    })();
  }, [userId]);

  const businessName = useMemo(() => p?.full_name || "My Business", [p?.full_name]);

  return (
    <section
      className="card p-3"
      style={{ borderColor: "rgba(196,181,253,.7)", background: "rgba(245,243,255,.35)" }}
    >
      {loading ? (
        <p className="muted">Loading...</p>
      ) : (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "140px 1fr 160px", alignItems: "center" }}
        >
          {/* Logo / photo */}
          <div className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p?.avatar_url || "/placeholder.png"}
              alt="Business logo"
              width={120}
              height={120}
              style={{
                width: 120,
                height: 120,
                objectFit: "cover",
                borderRadius: 16,
                border: "1px solid #eee",
              }}
            />
          </div>

          {/* Name + basic info */}
          <div className="min-w-0">
            <h2 className="text-xl font-semibold" style={{ marginBottom: 6 }}>
              {businessName}
            </h2>
            {p?.location_is_public && p?.location_text ? (
              <div className="muted">Based in {p.location_text}</div>
            ) : (
              <div className="muted">Location hidden</div>
            )}
            {p?.bio ? (
              <p className="muted mt-2" style={{ whiteSpace: "pre-wrap" }}>
                {p.bio}
              </p>
            ) : null}
          </div>

          {/* Quick share (compact QR) */}
          <div className="flex flex-col items-center justify-center gap-2">
            <ProfileInviteQR userId={userId} mode="qr-only" size={140} />
            <span className="muted text-xs">Share your invite</span>
          </div>
        </div>
      )}
    </section>
  );
}
