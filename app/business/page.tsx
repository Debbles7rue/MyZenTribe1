"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AvatarUploader from "@/components/AvatarUploader";
import ProfileInviteQR from "@/components/ProfileInviteQR";
import BusinessProfilePanel from "@/components/BusinessProfilePanel";

type BizFields = {
  business_name: string | null;
  business_logo_url: string | null;
  business_bio: string | null;
  business_location_text: string | null;
  business_location_is_public: boolean | null;
};

const BusinessPage: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);

  const [b, setB] = useState<BizFields>({
    business_name: "",
    business_logo_url: "",
    business_bio: "",
    business_location_text: "",
    business_location_is_public: false,
  });

  const [detailsLoading, setDetailsLoading] = useState<boolean>(true);
  const [detailsSaving, setDetailsSaving] = useState<boolean>(false);
  const [detailsUnavailable, setDetailsUnavailable] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    (async () => {
      if (!userId) return;
      setError(null);
      setDetailsLoading(true);
      setDetailsUnavailable(false);

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "business_name, business_logo_url, business_bio, business_location_text, business_location_is_public"
        )
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (msg.includes("column") && msg.includes("does not exist")) {
          setDetailsUnavailable(true);
        } else {
          setError(error.message);
        }
      } else if (data) {
        setB({
          business_name: data.business_name ?? "",
          business_logo_url: data.business_logo_url ?? "",
          business_bio: data.business_bio ?? "",
          business_location_text: data.business_location_text ?? "",
          business_location_is_public: !!data.business_location_is_public,
        });
      }

      setDetailsLoading(false);
    })();
  }, [userId]);

  const displayBizName = useMemo(() => b.business_name || "Your business name", [b.business_name]);
  const showLoc = !!b.business_location_is_public && !!b.business_location_text;

  async function saveDetails() {
    if (!userId) return;
    setDetailsSaving(true);
    setError(null);
    try {
      const payload = {
        business_name: b.business_name?.trim() || null,
        business_logo_url: b.business_logo_url?.trim() || null,
        business_bio: b.business_bio?.trim() || null,
        business_location_text: b.business_location_text?.trim() || null,
        business_location_is_public: !!b.business_location_is_public,
      };
      const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
      if (error) throw error;
      alert("Business details saved");
    } catch (e: any) {
      setError(e?.message || "Could not save business details.");
    } finally {
      setDetailsSaving(false);
    }
  }

  return (
    <div className="page-wrap">
      <div className="page">
        <div className="container-app mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="header-bar">
            <h1 className="page-title" style={{ marginBottom: 0 }}>Business</h1>
            <div className="controls flex items-center gap-2">
              <a className="btn" href="#edit-details">Edit details</a>
              <Link href="/profile" className="btn">Personal profile</Link>
              <Link href="/messages" className="btn">Messages</Link>
            </div>
          </div>

          <div className="h-px bg-violet-200/60 my-3" />

          {/* Identity header (mobile-first) */}
          <section
            className="card p-3 mb-3"
            style={{ borderColor: "rgba(196,181,253,.7)", background: "rgba(245,243,255,.35)" }}
          >
            <div className="flex flex-col md:grid md:grid-cols-[140px_1fr] gap-4 items-start">
              <div className="shrink-0">
                {/* Unique business logo */}
                {b.business_logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.business_logo_url}
                    alt="Business logo"
                    className="rounded-2xl border"
                    width={120}
                    height={120}
                    style={{ width: 120, height: 120, objectFit: "cover" }}
                  />
                ) : (
                  <div
                    aria-label="No business logo"
                    className="rounded-2xl border border-dashed text-sm text-neutral-600 grid place-items-center"
                    style={{ width: 120, height: 120, background: "#fafafa" }}
                  >
                    Add a logo below
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <h2 className="text-xl font-semibold mb-1">{displayBizName}</h2>
                <div className="muted">{showLoc ? `Based in ${b.business_location_text}` : "Location hidden"}</div>
                {b.business_bio ? (
                  <p className="muted mt-2" style={{ whiteSpace: "pre-wrap" }}>{b.business_bio}</p>
                ) : (
                  <p className="muted mt-2">Add a short description of what you offer.</p>
                )}
              </div>
            </div>
          </section>

          {/* Two-column layout */}
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px] items-start">
            {/* LEFT: editor + services */}
            <div className="stack">
              <section id="edit-details" className="card p-3">
                <div className="section-row">
                  <h2 className="section-title mb-1">Business details</h2>
                </div>

                {detailsUnavailable ? (
                  <div className="stack">
                    <p className="muted">
                      Business detail columns are missing. Run this SQL once in Supabase, then reload:
                    </p>
                    <pre className="muted text-xs whitespace-pre-wrap">
{`ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS business_logo_url text,
  ADD COLUMN IF NOT EXISTS business_bio text,
  ADD COLUMN IF NOT EXISTS business_location_text text,
  ADD COLUMN IF NOT EXISTS business_location_is_public boolean DEFAULT false;`}
                    </pre>
                  </div>
                ) : detailsLoading ? (
                  <p className="muted">Loading…</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-[200px_1fr]">
                    <div>
                      <AvatarUploader
                        key={`biz-${userId ?? "anon"}`} // isolate from personal avatar cache
                        userId={userId}
                        value={b.business_logo_url ?? ""}
                        onChange={(url) => setB((prev) => ({ ...prev, business_logo_url: url }))}
                        label="Business logo"
                        size={160}
                      />
                    </div>

                    <div className="stack">
                      <label className="field">
                        <span className="label">Business name</span>
                        <input
                          className="input"
                          value={b.business_name ?? ""}
                          onChange={(e) => setB({ ...b, business_name: e.target.value })}
                          placeholder="Example: The Beautiful Healer"
                        />
                      </label>

                      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                        <label className="field">
                          <span className="label">Business location</span>
                          <input
                            className="input"
                            value={b.business_location_text ?? ""}
                            onChange={(e) => setB({ ...b, business_location_text: e.target.value })}
                            placeholder="City, State"
                          />
                        </label>

                        <label className="md:mt-[1.85rem] flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={!!b.business_location_is_public}
                            onChange={(e) =>
                              setB({ ...b, business_location_is_public: e.target.checked })
                            }
                          />
                          Show on business page
                        </label>
                      </div>

                      <label className="field">
                        <span className="label">Business bio</span>
                        <textarea
                          className="input"
                          rows={4}
                          value={b.business_bio ?? ""}
                          onChange={(e) => setB({ ...b, business_bio: e.target.value })}
                          placeholder="What you offer, specialties, etc."
                        />
                      </label>

                      <div className="right">
                        <button className="btn btn-brand" onClick={saveDetails} disabled={detailsSaving}>
                          {detailsSaving ? "Saving…" : "Save business details"}
                        </button>
                      </div>

                      {error && <p className="muted" style={{ color: "#b91c1c" }}>{error}</p>}
                    </div>
                  </div>
                )}
              </section>

              <section className="stack">
                <BusinessProfilePanel userId={userId} />
              </section>
            </div>

            {/* RIGHT */}
            <div className="stack">
              <section className="card p-3" style={{ padding: 12 }}>
                <div className="section-row">
                  <h3 className="section-title mb-1">Messages</h3>
                </div>
                <p className="muted text-xs sm:text-[12px]">Chat with clients and collaborators in one place.</p>
                <a className="btn mt-2" href="/messages">Open</a>
              </section>

              <section className="card p-3" style={{ padding: 12 }}>
                <div className="max-w-sm">
                  <ProfileInviteQR userId={userId} embed context="business" qrSize={140} />
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessPage;
