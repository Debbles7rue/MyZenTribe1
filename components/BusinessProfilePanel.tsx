"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AvatarUploader from "@/components/AvatarUploader";
import BusinessServicesEditor, { Service } from "@/components/BusinessServicesEditor";

type Props = { userId: string | null };

type BizFields = {
  business_name: string | null;
  business_logo_url: string | null;
  business_bio: string | null;
  business_location_text: string | null;
  business_location_is_public: boolean | null;
};

export default function BusinessProfilePanel({ userId }: Props) {
  // services
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesEditing, setServicesEditing] = useState(false);
  const [servicesSaving, setServicesSaving] = useState(false);

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
  const [detailsEditing, setDetailsEditing] = useState(false);
  const [detailsUnavailable, setDetailsUnavailable] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Load both services and (if available) business_* fields
  useEffect(() => {
    (async () => {
      if (!userId) return;
      setError(null);

      // try to load everything at once
      setServicesLoading(true);
      setDetailsLoading(true);
      setDetailsUnavailable(false);

      let svc: Service[] = [];
      let biz: Partial<BizFields> = {};

      // attempt to fetch including business_* columns
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "business_services, business_name, business_logo_url, business_bio, business_location_text, business_location_is_public"
        )
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        // If columns don't exist yet, fall back to services only
        const msg = String(error.message || "").toLowerCase();
        if (msg.includes("column") && msg.includes("does not exist")) {
          setDetailsUnavailable(true);
          const onlySvc = await supabase
            .from("profiles")
            .select("business_services")
            .eq("id", userId)
            .maybeSingle();
          if (onlySvc.data) {
            const list = (onlySvc.data.business_services ?? []) as Service[];
            svc = Array.isArray(list) ? list : [];
          }
        } else {
          setError(error.message);
        }
      } else if (data) {
        const list = (data.business_services ?? []) as Service[];
        svc = Array.isArray(list) ? list : [];

        biz = {
          business_name: data.business_name ?? "",
          business_logo_url: data.business_logo_url ?? "",
          business_bio: data.business_bio ?? "",
          business_location_text: data.business_location_text ?? "",
          business_location_is_public: !!data.business_location_is_public,
        };
      }

      setServices(svc);
      if (!detailsUnavailable) {
        setB((prev) => ({
          business_name: (biz.business_name ?? "") as string,
          business_logo_url: (biz.business_logo_url ?? "") as string,
          business_bio: (biz.business_bio ?? "") as string,
          business_location_text: (biz.business_location_text ?? "") as string,
          business_location_is_public: !!biz.business_location_is_public,
        }));
      }

      setServicesLoading(false);
      setDetailsLoading(false);
    })();
  }, [userId]);

  const hasServices = useMemo(() => Array.isArray(services) && services.length > 0, [services]);

  // --- save services
  async function saveServices() {
    if (!userId) return;
    setServicesSaving(true);
    setError(null);
    try {
      const payload = { business_services: services };
      const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
      if (error) throw error;
      setServicesEditing(false);
    } catch (e: any) {
      setError(e?.message || "Could not save services.");
    } finally {
      setServicesSaving(false);
    }
  }

  // --- reload services only
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

  // --- save business details
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
      setDetailsEditing(false);
    } catch (e: any) {
      setError(e?.message || "Could not save business details.");
    } finally {
      setDetailsSaving(false);
    }
  }

  // ---------- RENDER ----------
  return (
    <section className="card p-3">
      {/* BUSINESS DETAILS */}
      <div className="section-row">
        <h2 className="section-title" style={{ marginBottom: 4 }}>Business details</h2>
        {!detailsUnavailable && !detailsEditing && (
          <div className="right">
            <button className="btn" onClick={() => setDetailsEditing(true)} disabled={detailsLoading}>
              Edit details
            </button>
          </div>
        )}
      </div>

      {detailsUnavailable ? (
        <p className="muted">
          Business details are not available yet. To enable them, run this one-time SQL in Supabase:
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
        <p className="muted">Loading business details…</p>
      ) : detailsEditing ? (
        <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "200px 1fr" }}>
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

            <div className="right flex gap-2">
              <button className="btn" onClick={() => setDetailsEditing(false)} disabled={detailsSaving}>
                Cancel
              </button>
              <button className="btn btn-brand" onClick={saveDetails} disabled={detailsSaving}>
                {detailsSaving ? "Saving…" : "Save details"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="muted mb-2" style={{ fontSize: 12 }}>
          Use “Edit details” to set your business name, logo, bio, and location.
        </div>
      )}

      <div className="h-px bg-violet-200/60 my-3" />

      {/* SERVICES */}
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
          <BusinessServicesEditor userId={userId} value={services} onChange={setServices} disabled={servicesSaving} />
          <div className="right flex gap-2">
            <button className="btn" onClick={cancelServices} disabled={servicesSaving}>Cancel</button>
            <button className="btn btn-brand" onClick={saveServices} disabled={servicesSaving}>
              {servicesSaving ? "Saving…" : "Save services"}
            </button>
          </div>
        </div>
      ) : hasServices ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((s, i) => (
            <article key={(s.id ?? "") + ":" + i} className="card p-3">
              {s.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.image_url}
                  alt={s.title || "Service photo"}
                  className="mb-2"
                  style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 12, border: "1px solid #eee" }}
                />
              ) : null}
              <h3 className="text-base font-semibold">{s.title || "Untitled service"}</h3>
              {s.description ? (
                <p className="muted" style={{ whiteSpace: "pre-wrap" }}>{s.description}</p>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="stack">
          <p className="muted">Add your first service. Examples: Sound Bath, Reiki Session, Drum Circle, Qi Gong Class.</p>
          <div>
            <button className="btn btn-brand" onClick={() => setServicesEditing(true)}>Add service</button>
          </div>
        </div>
      )}

      {error && <p className="muted mt-3" style={{ color: "#b91c1c" }}>{error}</p>}
    </section>
  );
}
