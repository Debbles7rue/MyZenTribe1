"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AvatarUploader from "@/components/AvatarUploader";
import BusinessServicesEditor, { Service } from "@/components/BusinessServicesEditor";
import ProfileInviteQR from "@/components/ProfileInviteQR";

type BizFields = {
  business_name: string | null;
  business_logo_url: string | null;
  business_bio: string | null;
  business_location_text: string | null;
  business_location_is_public: boolean | null;
};

export default function BizPage() {
  const [userId, setUserId] = useState<string | null>(null);

  // business details
  const [b, setB] = useState<BizFields>({
    business_name: "",
    business_logo_url: "",
    business_bio: "",
    business_location_text: "",
    business_location_is_public: false,
  });
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsUnavailable, setDetailsUnavailable] = useState(false);

  // services
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesEditing, setServicesEditing] = useState(false);
  const [servicesSaving, setServicesSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // load details + services
  useEffect(() => {
    (async () => {
      if (!userId) return;
      setError(null);
      setDetailsLoading(true);
      setServicesLoading(true);
      setDetailsUnavailable(false);

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "business_name, business_logo_url, business_bio, business_location_text, business_location_is_public, business_services"
        )
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (msg.includes("column") && msg.includes("does not exist")) {
          setDetailsUnavailable(true);
          const svcOnly = await supabase
            .from("profiles")
            .select("business_services")
            .eq("id", userId)
            .maybeSingle();
          const list = (svcOnly.data?.business_services ?? []) as Service[];
          setServices(Array.isArray(list) ? list : []);
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
        const list = (data.business_services ?? []) as Service[];
        setServices(Array.isArray(list) ? list : []);
      }

      setDetailsLoading(false);
      setServicesLoading(false);
    })();
  }, [userId]);

  const hasServices = useMemo(() => Array.isArray(services) && services.length > 0, [services]);

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

  async function saveServices() {
    if (!userId) return;
    setServicesSaving(true);
    setError(null);
    try {
      const payload = { business_services: services };
      const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
      if (error) throw error;
      setServicesEditing(false);
      alert("Services saved");
    } catch (e: any) {
      setError(e?.message || "Could not save services.");
    } finally {
      setServicesSaving(false);
    }
  }

  async function reloadServices() {
    if (!userId) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("business_services")
      .eq("id", userId)
      .maybeSingle();
    if (error) setError(error.message);
    const list = (data?.business_services ?? []) as Service[];
    setServices(Array.isArray(list) ? list : []);
  }

  function cancelServices() {
    setServicesEditing(false);
    reloadServices();
  }

  const displayBizName = b.business_name || "Your business name";
  const displayLogo = b.business_logo_url || "/placeholder.png";
  const showLoc = !!b.business_location_is_public && !!b.business_location_text;

  return (
    <div className="page-wrap">
      <div className="page">
        <div className="container-app mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="header-bar">
            <h1 className="page-title" style={{ marginBottom: 0 }}>Business</h1>
            <div className="controls flex items-center gap-2">
              <span className="btn" aria-hidden>biz-page v8</span>
              <Link href="/profile" className="btn">Personal profile</Link>
              <Link href="/messages" className="btn">Messages</Link>
            </div>
          </div>

          <div className="h-px bg-violet-200/60" style={{ margin: "12px 0 16px" }} />

          {/* Header card */}
          <section
            className="card p-3 mb-3"
            style={{ borderColor: "rgba(196,181,253,.7)", background: "rgba(245,243,255,.35)" }}
          >
            <div className="grid gap-4" style={{ gridTemplateColumns: "140px 1fr 160px", alignItems: "center" }}>
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayLogo}
                  alt="Business logo"
                  width={120}
                  height={120}
                  style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 16, border: "1px solid #eee" }}
                />
              </div>

              <div className="min-w-0">
                <h2 className="text-xl font-semibold" style={{ marginBottom: 6 }}>{displayBizName}</h2>
                <div className="muted">{showLoc ? `Based in ${b.business_location_text}` : "Location hidden"}</div>
                {b.business_bio ? (
                  <p className="muted mt-2" style={{ whiteSpace: "pre-wrap" }}>{b.business_bio}</p>
                ) : (
                  <p className="muted mt-2">Add a short description of what you offer.</p>
                )}
              </div>

              <div className="flex flex-col items-center justify-center gap-2">
                <ProfileInviteQR userId={userId} mode="qr-only" size={140} />
                <span className="muted text-xs">Share your invite</span>
              </div>
            </div>
          </section>

          {/* Business details editor */}
          <section className="card p-3 mb-3">
            <div className="section-row">
              <h2 className="section-title" style={{ marginBottom: 4 }}>Business details</h2>
            </div>

            {detailsUnavailable ? (
              <p className="muted">
                Business details are not available yet. Run this one-time SQL in Supabase:
                <br />
                <code style={{ fontSize: 12 }}>
                  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_name text;
                  {" "}ADD COLUMN IF NOT EXISTS business_logo_url text;
                  {" "}ADD COLUMN IF NOT EXISTS business_bio text;
                  {" "}ADD COLUMN IF NOT EXISTS business_location_text text;
                  {" "}ADD COLUMN IF NOT EXISTS business_location_is_public boolean DEFAULT false;
                </code>
              </p>
            ) : detailsLoading ? (
              <p className="muted">Loading…</p>
            ) : (
              <div className="grid gap-4" style={{ gridTemplateColumns: "200px 1fr" }}>
                <div>
                  <AvatarUploader
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

                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <label className="field">
                      <span className="label">Business location</span>
                      <input
                        className="input"
                        value={b.business_location_text ?? ""}
                        onChange={(e) => setB({ ...b, business_location_text: e.target.value })}
                        placeholder="City, State"
                      />
                    </label>
                    <label className="mt-[1.85rem] flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!b.business_location_is_public}
                        onChange={(e) => setB({ ...b, business_location_is_public: e.target.checked })}
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
                </div>
              </div>
            )}
          </section>

          {/* Services */}
          <section className="card p-3">
            <div className="section-row">
              <h2 className="section-title" style={{ marginBottom: 4 }}>Services</h2>
              {!servicesEditing && (
                <div className="right">
                  <button className="btn btn-brand" onClick={() => setServicesEditing(true)} disabled={servicesLoading}>
                    {hasServices ? "Edit services" : "Add service"}
                  </button>
                </div>
              )}
            </div>

            {servicesLoading ? (
              <p className="muted">Loading services…</p>
            ) : servicesEditing ? (
              <div className="stack">
                <BusinessServicesEditor userId={
