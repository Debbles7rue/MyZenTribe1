"use client";

import SiteHeader from "@/components/SiteHeader";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AvatarUpload from "@/components/AvatarUpload";
import BusinessServicesEditor, { type Service } from "@/components/BusinessServicesEditor";
import PhotosFeed from "@/components/PhotosFeed";
import GratitudePanel from "@/components/GratitudePanel";
import ShopEditor from "@/components/ShopEditor";
import InvitePanel from "@/components/InvitePanel"; // <-- NEW

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  show_mutuals: boolean | null;

  is_business: boolean | null;
  business_name: string | null;
  business_logo_url: string | null;
  business_contact_email: string | null;
  business_phone: string | null;
  website: string | null;
  offering_title: string | null;
  offering_description: string | null;
  booking_url: string | null;

  shop_enabled: boolean | null;
};

type Tab = "personal" | "business";

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("personal");

  const [editPersonal, setEditPersonal] = useState(false);
  const [editBusiness, setEditBusiness] = useState(false);

  const [p, setP] = useState<Profile>({
    id: "",
    full_name: "",
    avatar_url: "",
    bio: "",
    location: "",
    show_mutuals: true,

    is_business: false,
    business_name: "",
    business_logo_url: "",
    business_contact_email: "",
    business_phone: "",
    website: "",
    offering_title: "",
    offering_description: "",
    booking_url: "",

    shop_enabled: false,
  });

  const [services, setServices] = useState<Service[]>([]);
  const [shopItems, setShopItems] = useState<{ id: string; title: string; image_url: string | null; external_link: string }[]>([]);

  // auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // load data
  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(`
            id, full_name, avatar_url, bio, location, show_mutuals,
            is_business, business_name, business_logo_url, business_contact_email, business_phone,
            website, offering_title, offering_description, booking_url, shop_enabled
          `)
          .eq("id", userId)
          .maybeSingle();
        if (error) throw error;

        if (data) setP(data as Profile); else setP(prev => ({ ...prev, id: userId }));

        const svc = await supabase
          .from("business_services")
          .select("id, title, description, image_url")
          .eq("user_id", userId)
          .order("created_at", { ascending: true });
        setServices((svc.data ?? []).map(r => ({
          id: r.id, title: r.title, description: r.description ?? "", image_url: r.image_url ?? ""
        })));

        const shop = await supabase
          .from("business_shop_items")
          .select("id,title,image_url,external_link")
          .eq("user_id", userId)
          .order("created_at", { ascending: true });
        setShopItems((shop.data ?? []) as any[]);
      } catch {
        setTableMissing(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const displayName = useMemo(() => p.full_name || "Member", [p.full_name]);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const payload: Profile = {
        ...p,
        id: userId,
        full_name: p.full_name?.trim() || null,
        avatar_url: p.avatar_url?.trim() || null,
        bio: p.bio?.trim() || null,
        location: p.location?.trim() || null,
        show_mutuals: !!p.show_mutuals,

        is_business: !!p.is_business,
        business_name: p.business_name?.trim() || null,
        business_logo_url: p.business_logo_url?.trim() || null,
        business_contact_email: p.business_contact_email?.trim() || null,
        business_phone: p.business_phone?.trim() || null,
        website: p.website?.trim() || null,
        offering_title: p.offering_title?.trim() || null,
        offering_description: p.offering_description?.trim() || null,
        booking_url: p.booking_url?.trim() || null,

        shop_enabled: !!p.shop_enabled,
      };

      const up = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
      if (up.error) throw up.error;

      // replace services set
      await supabase.from("business_services").delete().eq("user_id", userId);
      const clean = services
        .filter(s => s.title.trim().length)
        .map(s => ({ user_id: userId, title: s.title.trim(), description: (s.description || "").trim() || null, image_url: (s.image_url || "").trim() || null }));
      if (clean.length) await supabase.from("business_services").insert(clean);

      alert("Saved!");
      setEditPersonal(false);
      setEditBusiness(false);
    } catch (e: any) {
      alert(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  async function signOut() { await supabase.auth.signOut(); router.replace("/"); }

  return (
    <div className="page-wrap">
      <SiteHeader />

      <div className="page">
        <div className="container-app">
          <div className="header-bar">
            <h1 className="page-title" style={{ marginBottom: 0 }}>Profile</h1>
            <div className="controls">
              <div className="segmented" role="tablist" aria-label="Profile mode">
                <button className={`seg-btn ${tab === "personal" ? "active" : ""}`} onClick={() => setTab("personal")} role="tab" aria-selected={tab === "personal"}>Personal</button>
                <button className={`seg-btn ${tab === "business" ? "active" : ""}`} onClick={() => setTab("business")} role="tab" aria-selected={tab === "business"}>Business</button>
              </div>
              {tab === "personal" ? (
                <button className="btn" onClick={() => setEditPersonal(!editPersonal)}>
                  {editPersonal ? "Done" : "Edit"}
                </button>
              ) : (
                <button className="btn" onClick={() => setEditBusiness(!editBusiness)}>
                  {editBusiness ? "Done" : "Edit"}
                </button>
              )}
              <button className="btn" onClick={signOut}>Sign out</button>
            </div>
          </div>

          {tableMissing && (
            <div className="note">
              <div className="note-title">Tables not found</div>
              <div className="note-body">Run the SQL migration, then reload.</div>
            </div>
          )}

          {/* Identity header (email hidden) */}
          <div className="card p-3 mb-3 profile-card">
            <div className="profile-header">
              {tab === "personal" ? (
                <AvatarUpload userId={userId} value={p.avatar_url} onChange={(url)=>setP(prev=>({...prev, avatar_url: url}))} />
              ) : (
                <AvatarUpload userId={userId} value={p.business_logo_url} onChange={(url)=>setP(prev=>({...prev, business_logo_url: url}))} label="Upload logo" />
              )}
              <div className="profile-heading">
                <div className="profile-name">
                  {tab === "personal" ? displayName : (p.business_name || "Your business name")}
                </div>
                {tab === "business" && p.offering_title && (
                  <div className="muted">{p.offering_title}</div>
                )}
                <div className="kpis">
                  <span className="kpi"><strong>0</strong> Followers</span>
                  <span className="kpi"><strong>0</strong> Following</span>
                  <span className="kpi"><strong>0</strong> Friends</span>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN two-column layout */}
          <div className="columns">
            {/* LEFT column */}
            <div className="stack">
              {tab === "personal" ? (
                editPersonal ? (
                  <section className="card p-3">
                    <h2 className="section-title">Edit your info</h2>
                    <div className="stack">
                      <label className="field">
                        <span className="label">Name</span>
                        <input className="input" value={p.full_name ?? ""} onChange={(e)=>setP({...p, full_name: e.target.value})}/>
                      </label>
                      <label className="field">
                        <span className="label">Location</span>
                        <input className="input" value={p.location ?? ""} onChange={(e)=>setP({...p, location: e.target.value})} placeholder="City, State"/>
                      </label>
                      <label className="field">
                        <span className="label">Bio</span>
                        <textarea className="input" rows={4} value={p.bio ?? ""} onChange={(e)=>setP({...p, bio: e.target.value})}/>
                      </label>
                      <label className="checkbox">
                        <input type="checkbox" checked={!!p.show_mutuals} onChange={(e)=>setP({...p, show_mutuals: e.target.checked})}/>
                        <span>Show mutual friends</span>
                      </label>
                      <div className="right">
                        <button className="btn btn-brand" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                      </div>
                    </div>
                  </section>
                ) : (
                  <section className="card p-3">
                    <h2 className="section-title">About</h2>
                    <div className="stack">
                      {p.location && <div><strong>Location:</strong> {p.location}</div>}
                      {p.bio && <div style={{ whiteSpace:"pre-wrap" }}>{p.bio}</div>}
                      {!p.location && !p.bio && <div className="muted">Add a bio and location using Edit.</div>}
                    </div>
                  </section>
                )
              ) : editBusiness ? (
                <>
                  <section className="card p-3">
                    <h2 className="section-title">Business identity</h2>
                    <div className="stack">
                      <label className="field">
                        <span className="label">Business name</span>
                        <input className="input" value={p.business_name ?? ""} onChange={(e)=>setP({...p, business_name: e.target.value})}/>
                      </label>
                      <label className="field">
                        <span className="label">Headline</span>
                        <input className="input" value={p.offering_title ?? ""} onChange={(e)=>setP({...p, offering_title: e.target.value})} placeholder="Qi Gong, Sound Baths, Drum Circles…"/>
                      </label>
                      <label className="field">
                        <span className="label">Description</span>
                        <textarea className="input" rows={4} value={p.offering_description ?? ""} onChange={(e)=>setP({...p, offering_description: e.target.value})}/>
                      </label>
                      <label className="field">
                        <span className="label">Business website</span>
                        <input className="input" value={p.website ?? ""} onChange={(e)=>setP({...p, website: e.target.value})} placeholder="https://example.com"/>
                      </label>
                      <label className="field">
                        <span className="label">Contact email (public)</span>
                        <input className="input" value={p.business_contact_email ?? ""} onChange={(e)=>setP({...p, business_contact_email: e.target.value})}/>
                      </label>
                      <label className="field">
                        <span className="label">Phone (optional)</span>
                        <input className="input" value={p.business_phone ?? ""} onChange={(e)=>setP({...p, business_phone: e.target.value})}/>
                      </label>
                      <label className="field">
                        <span className="label">Booking link (“Book now”)</span>
                        <input className="input" value={p.booking_url ?? ""} onChange={(e)=>setP({...p, booking_url: e.target.value})} placeholder="https://calendly.com/you"/>
                      </label>
                      <label className="checkbox">
                        <input type="checkbox" checked={!!p.is_business} onChange={(e)=>setP({...p, is_business: e.target.checked})}/>
                        <span>I offer services</span>
                      </label>
                      <div className="right">
                        <button className="btn btn-brand" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save business"}</button>
                      </div>
                    </div>
                  </section>

                  <section className="card p-3">
                    <div className="section-row">
                      <h2 className="section-title">Services</h2>
                      {p.booking_url && <a className="btn btn-brand" href={p.booking_url} target="_blank" rel="noreferrer">Book now</a>}
                    </div>
                    <BusinessServicesEditor value={services} onChange={setServices} disabled={!p.is_business} userId={userId}/>
                    <div className="right" style={{ marginTop: 10 }}>
                      <button className="btn btn-brand" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save services"}</button>
                    </div>
                  </section>

                  <section className="card p-3">
                    <div className="section-row">
                      <h2 className="section-title">Shop now (optional)</h2>
                      <label className="checkbox">
                        <input type="checkbox" checked={!!p.shop_enabled} onChange={(e)=>setP({...p, shop_enabled: e.target.checked})}/>
                        <span>Enable shop section</span>
                      </label>
                    </div>
                    {p.shop_enabled ? <ShopEditor userId={userId}/> : <p className="muted">Turn on to add up to 5 items (each with image + link).</p>}
                  </section>
                </>
              ) : (
                <>
                  {/* Pretty business view */}
                  <section className="card p-3">
                    <h2 className="section-title">About this business</h2>
                    <div className="stack">
                      {p.offering_title && <div><strong>{p.offering_title}</strong></div>}
                      {p.offering_description && <div style={{ whiteSpace:"pre-wrap" }}>{p.offering_description}</div>}
                      <div className="controls">
                        {p.booking_url && <a className="btn btn-brand" href={p.booking_url} target="_blank" rel="noreferrer">Book now</a>}
                        {p.website && <a className="btn btn-neutral" href={p.website} target="_blank" rel="noreferrer">Visit website</a>}
                      </div>
                      <div className="muted" style={{ fontSize:12 }}>
                        {p.business_contact_email || p.business_phone ? (
                          <>
                            {p.business_contact_email && <>Email: {p.business_contact_email} • </>}
                            {p.business_phone && <>Phone: {p.business_phone}</>}
                          </>
                        ) : "Add contact info via Edit."}
                      </div>
                    </div>
                  </section>

                  {services.length > 0 && (
                    <section className="card p-3">
                      <h2 className="section-title">Services</h2>
                      <div className="commitment-grid">
                        {services.map((s, i) => (
                          <div key={i} className="commitment-card">
                            {s.image_url && (
                              <img
                                src={s.image_url}
                                alt={s.title}
                                style={{ width:"100%", borderRadius:12, marginBottom:8 }}
                              />
                            )}
                            <h4>{s.title}</h4>
                            {s.description && <p>{s.description}</p>}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {p.shop_enabled && shopItems.length > 0 && (
                    <section className="card p-3">
                      <h2 className="section-title">Shop now</h2>
                      <div className="commitment-grid">
                        {shopItems.map((it) => (
                          <a key={it.id} className="commitment-card" href={it.external_link} target="_blank" rel="noreferrer">
                            {it.image_url && <img src={it.image_url} alt={it.title} style={{ width:"100%", borderRadius:12, marginBottom:8 }} />}
                            <h4>{it.title}</h4>
                            <p>Open link</p>
                          </a>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>

            {/* RIGHT column */}
            <div className="stack">
              {tab === "personal" && <InvitePanel userId={userId} />}   {/* <-- NEW */}
              {tab === "personal" && <GratitudePanel userId={userId} />}
              {tab === "personal" && <PhotosFeed userId={userId} />}
              {tab === "business" && (
                <section className="card p-3">
                  <h2 className="section-title">Privacy</h2>
                  <p className="muted">Your personal profile stays private. Business page is public-facing. We’ll wire friend/acquaintance visibility next.</p>
                </section>
              )}
            </div>
          </div>

          {loading && <p className="muted mt-3">Loading…</p>}
        </div>
      </div>
    </div>
  );
}
