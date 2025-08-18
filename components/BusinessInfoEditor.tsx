// components/BusinessInfoEditor.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AvatarUploader from "@/components/AvatarUploader";

type Props = { userId: string | null };

type Biz = {
  business_name: string | null;
  business_logo_url: string | null;
  business_bio: string | null;
  business_location_text: string | null;
  business_location_is_public: boolean | null;
};

export default function BusinessInfoEditor({ userId }: Props) {
  const [b, setB] = useState<Biz>({
    business_name: "",
    business_logo_url: "",
    business_bio: "",
    business_location_text: "",
    business_location_is_public: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!userId) return;
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("profiles")
        .select("business_name, business_logo_url, business_bio, business_location_text, business_location_is_public")
        .eq("id", userId)
        .maybeSingle();
      if (error) setError(error.message);
      else if (data) {
        setB({
          business_name: data.business_name ?? "",
          business_logo_url: data.business_logo_url ?? "",
          business_bio: data.business_bio ?? "",
          business_location_text: data.business_location_text ?? "",
          business_location_is_public: !!data.business_location_is_public,
        });
      }
      setLoading(false);
    })();
  }, [userId]);

  async function save() {
    if (!userId) return;
    setSaving(true);
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
      setError(e?.message || "Could not save business details");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="biz-edit" className="card p-3">
      <div className="section-row">
        <h2 className="section-title" style={{ marginBottom: 4 }}>Business details</h2>
      </div>

      {loading ? (
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
              <button className="btn btn-brand" onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save business details"}
              </button>
            </div>

            {error && <p className="muted" style={{ color: "#b91c1c" }}>{error}</p>}
          </div>
        </div>
      )}
    </section>
  );
}
