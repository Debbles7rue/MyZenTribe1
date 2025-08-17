"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import BusinessServicesEditor, { Service } from "@/components/BusinessServicesEditor";

type Props = { userId: string | null };

export default function BusinessProfilePanel({ userId }: Props) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!userId) return;
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("profiles")
        .select("business_services")
        .eq("id", userId)
        .maybeSingle();
      if (error) setError(error.message);
      const list = (data?.business_services ?? []) as Service[];
      setServices(Array.isArray(list) ? list : []);
      setLoading(false);
    })();
  }, [userId]);

  const hasServices = useMemo(() => Array.isArray(services) && services.length > 0, [services]);

  async function save() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      const payload = { business_services: services };
      const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
      if (error) throw error;
      setEditing(false);
    } catch (e: any) {
      setError(e?.message || "Could not save services.");
    } finally {
      setSaving(false);
    }
  }

  async function reload() {
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

  function cancel() {
    setEditing(false);
    reload();
  }

  return (
    <section className="card p-3">
      <div className="section-row">
        <h2 className="section-title" style={{ marginBottom: 4 }}>Business profile</h2>
        {!editing && (
          <div className="right">
            <button className="btn btn-brand" onClick={() => setEditing(true)} disabled={loading}>
              {hasServices ? "Edit services" : "Add services"}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="muted">Loading...</p>
      ) : editing ? (
        <div className="stack">
          <BusinessServicesEditor
            userId={userId}
            value={services}
            onChange={setServices}
            disabled={saving}
          />
          <div className="right flex gap-2">
            <button className="btn" onClick={cancel} disabled={saving}>Cancel</button>
            <button className="btn btn-brand" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save services"}
            </button>
          </div>
          {error && <p className="muted" style={{ color: "#b91c1c" }}>{error}</p>}
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
          <p className="muted">No services yet. Click "Add services" to create your first one.</p>
          <div>
            <button className="btn btn-brand" onClick={() => setEditing(true)}>Add services</button>
          </div>
        </div>
      )}
    </section>
  );
}
