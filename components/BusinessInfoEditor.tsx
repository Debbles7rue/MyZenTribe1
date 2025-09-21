// components/BusinessInfoEditor.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AvatarUploader from "@/components/AvatarUploader";

type Props = { userId: string | null };

type Biz = {
  business_name: string | null;
  business_logo_url: string | null;
  business_cover_url: string | null;
  business_bio: string | null;
  business_location_text: string | null;
  business_location_is_public: boolean | null;
  business_allow_messages: boolean | null;
  business_phone: string | null;
  business_phone_public: boolean | null;
  business_email: string | null;
  business_email_public: boolean | null;
  business_website_url: string | null;
};

export default function BusinessInfoEditor({ userId }: Props) {
  const [b, setB] = useState<Biz>({
    business_name: "",
    business_logo_url: "",
    business_cover_url: "",
    business_bio: "",
    business_location_text: "",
    business_location_is_public: false,
    business_allow_messages: true,
    business_phone: "",
    business_phone_public: false,
    business_email: "",
    business_email_public: false,
    business_website_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!userId) return;
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          business_name, 
          business_logo_url, 
          business_cover_url,
          business_bio, 
          business_location_text, 
          business_location_is_public,
          business_allow_messages,
          business_phone,
          business_phone_public,
          business_email,
          business_email_public,
          business_website_url
        `)
        .eq("id", userId)
        .maybeSingle();
      
      if (error) setError(error.message);
      else if (data) {
        setB({
          business_name: data.business_name ?? "",
          business_logo_url: data.business_logo_url ?? "",
          business_cover_url: data.business_cover_url ?? "",
          business_bio: data.business_bio ?? "",
          business_location_text: data.business_location_text ?? "",
          business_location_is_public: !!data.business_location_is_public,
          business_allow_messages: data.business_allow_messages !== false,
          business_phone: data.business_phone ?? "",
          business_phone_public: !!data.business_phone_public,
          business_email: data.business_email ?? "",
          business_email_public: !!data.business_email_public,
          business_website_url: data.business_website_url ?? "",
        });
      }
      setLoading(false);
    })();
  }, [userId]);

  async function save() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const payload = {
        business_name: b.business_name?.trim() || null,
        business_logo_url: b.business_logo_url?.trim() || null,
        business_cover_url: b.business_cover_url?.trim() || null,
        business_bio: b.business_bio?.trim() || null,
        business_location_text: b.business_location_text?.trim() || null,
        business_location_is_public: !!b.business_location_is_public,
        business_allow_messages: !!b.business_allow_messages,
        business_phone: b.business_phone?.trim() || null,
        business_phone_public: !!b.business_phone_public,
        business_email: b.business_email?.trim() || null,
        business_email_public: !!b.business_email_public,
        business_website_url: b.business_website_url?.trim() || null,
      };
      
      const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
      if (error) throw error;
      
      setSuccess("Business details saved successfully!");
      setTimeout(() => setSuccess(null), 3000);
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

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">
          {success}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          {/* Logo and Cover Photos Section */}
          <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "200px 200px" }}>
            <div>
              <label className="block text-sm font-medium mb-2">Business Logo</label>
              <AvatarUploader
                userId={userId}
                value={b.business_logo_url ?? ""}
                onChange={(url) => setB((prev) => ({ ...prev, business_logo_url: url }))}
                label="Upload Logo"
                size={160}
              />
              <p className="text-xs text-gray-500 mt-1">Click to upload logo</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Cover Photo</label>
              <AvatarUploader
                userId={userId}
                value={b.business_cover_url ?? ""}
                onChange={(url) => setB((prev) => ({ ...prev, business_cover_url: url }))}
                label="Upload Cover"
                size={160}
              />
              <p className="text-xs text-gray-500 mt-1">Click to upload cover</p>
            </div>
          </div>

          <div className="stack">
            <label className="field">
              <span className="label">Business name</span>
              <input
                className="input"
                value={b.business_name ?? ""}
                onChange={(e) => setB({ ...b, business_name: e.target.value })}
                placeholder="Example: The Beautiful Healer"
                style={{ fontSize: "16px" }}
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
                  style={{ fontSize: "16px" }}
                />
              </label>
              <label className="mt-[1.85rem] flex items-center gap-2 text-sm min-h-[44px]">
                <input
                  type="checkbox"
                  checked={!!b.business_location_is_public}
                  onChange={(e) => setB({ ...b, business_location_is_public: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                Show publicly
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
                style={{ fontSize: "16px" }}
              />
            </label>

            {/* Contact Information Section */}
            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium mb-3">Contact Information</h3>
              
              {/* Phone */}
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] mb-3">
                <label className="field">
                  <span className="label">Phone</span>
                  <input
                    className="input"
                    type="tel"
                    value={b.business_phone ?? ""}
                    onChange={(e) => setB({ ...b, business_phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    style={{ fontSize: "16px" }}
                  />
                </label>
                <label className="mt-[1.85rem] flex items-center gap-2 text-sm min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={!!b.business_phone_public}
                    onChange={(e) => setB({ ...b, business_phone_public: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                  Show publicly
                </label>
              </div>

              {/* Email */}
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] mb-3">
                <label className="field">
                  <span className="label">Email</span>
                  <input
                    className="input"
                    type="email"
                    value={b.business_email ?? ""}
                    onChange={(e) => setB({ ...b, business_email: e.target.value })}
                    placeholder="contact@business.com"
                    style={{ fontSize: "16px" }}
                  />
                </label>
                <label className="mt-[1.85rem] flex items-center gap-2 text-sm min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={!!b.business_email_public}
                    onChange={(e) => setB({ ...b, business_email_public: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                  Show publicly
                </label>
              </div>

              {/* Website */}
              <label className="field">
                <span className="label">Website</span>
                <input
                  className="input"
                  type="url"
                  value={b.business_website_url ?? ""}
                  onChange={(e) => setB({ ...b, business_website_url: e.target.value })}
                  placeholder="https://example.com"
                  style={{ fontSize: "16px" }}
                />
              </label>
            </div>

            {/* Messaging Toggle */}
            <div className="border-t pt-4 mt-4">
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                <input
                  type="checkbox"
                  checked={!!b.business_allow_messages}
                  onChange={(e) => setB({ ...b, business_allow_messages: e.target.checked })}
                  className="w-5 h-5 rounded text-purple-600"
                />
                <div>
                  <div className="font-medium">Allow Messages</div>
                  <div className="text-sm text-gray-600">
                    Let customers message you directly from your business profile
                  </div>
                </div>
              </label>
            </div>

            <div className="right mt-4">
              <button 
                className="btn btn-brand px-6 py-2.5 min-h-[44px]" 
                onClick={save} 
                disabled={saving}
              >
                {saving ? "Saving…" : "Save business details"}
              </button>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        /* Mobile optimizations */
        @media (max-width: 640px) {
          .grid {
            grid-template-columns: 1fr !important;
          }
          
          input, textarea, button, label {
            min-height: 44px;
          }
          
          .btn {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
