// app/business/page.tsx - BUSINESS OWNER DASHBOARD
"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AvatarUploader from "@/components/AvatarUploader";
import ProfileInviteQR from "@/components/ProfileInviteQR";
import BusinessServicesEditor, { Service } from "@/components/BusinessServicesEditor";

type BusinessProfile = {
  business_name: string | null;
  business_slug: string | null;
  business_tagline: string | null;
  business_logo_url: string | null;
  business_hero_image_url: string | null;
  business_bio: string | null;
  business_location_text: string | null;
  business_location_city: string | null;
  business_location_region: string | null;
  business_location_is_public: boolean | null;
  show_exact_address: boolean | null;
  creator_type: "business" | "event_host" | "both" | null;
  business_services: Service[] | null;
  external_links: ExternalLink[] | null;
  business_email: string | null;
  business_phone: string | null;
  show_phone: boolean | null;
  business_website: string | null;
  business_social: SocialLinks | null;
  business_categories: string[] | null;
  business_tags: string[] | null;
  verification_status: "unverified" | "verified" | "trusted" | null;
  verification_sources: any[] | null;
  is_business_public: boolean | null;
};

type ExternalLink = {
  id: string;
  title: string;
  url: string;
  image_url?: string;
  description?: string;
};

type SocialLinks = {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  tiktok?: string;
  linkedin?: string;
};

type Event = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description?: string;
  host_type: "personal" | "business";
};

const BusinessDashboard: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<BusinessProfile>({
    business_name: "",
    business_slug: null,
    business_tagline: "",
    business_logo_url: "",
    business_hero_image_url: "",
    business_bio: "",
    business_location_text: "",
    business_location_city: "",
    business_location_region: "",
    business_location_is_public: false,
    show_exact_address: false,
    creator_type: "event_host",
    business_services: [],
    external_links: [],
    business_email: "",
    business_phone: "",
    show_phone: false,
    business_website: "",
    business_social: {},
    business_categories: [],
    business_tags: [],
    verification_status: "unverified",
    verification_sources: [],
    is_business_public: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "services" | "events" | "links">("details");
  const [followerCount, setFollowerCount] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [editingServices, setEditingServices] = useState(false);
  const [editingLinks, setEditingLinks] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (userId) {
      loadProfile();
      loadFollowerCount();
      loadUpcomingEvents();
    }
  }, [userId]);

  async function loadProfile() {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;

      setProfile({
        business_name: data.business_name || "",
        business_slug: data.business_slug || null,
        business_tagline: data.business_tagline || "",
        business_logo_url: data.business_logo_url || "",
        business_hero_image_url: data.business_hero_image_url || "",
        business_bio: data.business_bio || "",
        business_location_text: data.business_location_text || "",
        business_location_city: data.business_location_city || "",
        business_location_region: data.business_location_region || "",
        business_location_is_public: data.business_location_is_public || false,
        show_exact_address: data.show_exact_address || false,
        creator_type: data.creator_type || "event_host",
        business_services: data.business_services || [],
        external_links: data.external_links || [],
        business_email: data.business_email || "",
        business_phone: data.business_phone || "",
        show_phone: data.show_phone || false,
        business_website: data.business_website || "",
        business_social: data.business_social || {},
        business_categories: data.business_categories || [],
        business_tags: data.business_tags || [],
        verification_status: data.verification_status || "unverified",
        verification_sources: data.verification_sources || [],
        is_business_public: data.is_business_public ?? true,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadFollowerCount() {
    if (!userId) return;
    const { count } = await supabase
      .from("business_followers")
      .select("*", { count: "exact", head: true })
      .eq("business_id", userId);
    setFollowerCount(count || 0);
  }

  async function loadUpcomingEvents() {
    if (!userId) return;
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("host_business_id", userId)
      .gte("date", new Date().toISOString())
      .order("date", { ascending: true })
      .limit(5);
    setUpcomingEvents(data || []);
  }

  async function saveProfile() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const { error } = await supabase
        .from("profiles")
        .update(profile)
        .eq("id", userId);

      if (error) throw error;

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveServices() {
    if (!userId) return;
    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ business_services: profile.business_services })
        .eq("id", userId);

      if (error) throw error;
      setEditingServices(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveLinks() {
    if (!userId) return;
    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ external_links: profile.external_links })
        .eq("id", userId);

      if (error) throw error;
      setEditingLinks(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const getTypeIcon = () => {
    switch(profile.creator_type) {
      case "business": return "💼";
      case "event_host": return "✨";
      case "both": return "🌟";
      default: return "✨";
    }
  };

  const getTypeLabel = () => {
    switch(profile.creator_type) {
      case "business": return "Service Provider";
      case "event_host": return "Event Host";
      case "both": return "Service Provider & Event Host";
      default: return "Creator";
    }
  };

  const getVerificationBadge = () => {
    switch(profile.verification_status) {
      case "verified":
        return <span className="badge verified">✓ Verified</span>;
      case "trusted":
        return <span className="badge trusted">⭐ Trusted</span>;
      default:
        return <span className="badge unverified">⚠️ Unverified - Add social links to verify</span>;
    }
  };

  const addLink = () => {
    const newLink: ExternalLink = {
      id: crypto.randomUUID(),
      title: "",
      url: "",
      description: "",
    };
    setProfile({
      ...profile,
      external_links: [...(profile.external_links || []), newLink]
    });
  };

  const updateLink = (id: string, updates: Partial<ExternalLink>) => {
    setProfile({
      ...profile,
      external_links: profile.external_links?.map(link => 
        link.id === id ? { ...link, ...updates } : link
      ) || []
    });
  };

  const removeLink = (id: string) => {
    setProfile({
      ...profile,
      external_links: profile.external_links?.filter(link => link.id !== id) || []
    });
  };

  const profileUrl = profile.business_slug 
    ? `${window.location.origin}/business/${profile.business_slug}`
    : null;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <span>Loading your business profile...</span>
      </div>
    );
  }

  return (
    <div className="business-dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-content">
            <div className="header-left">
              <h1 className="dashboard-title">
                <span className="title-icon">{getTypeIcon()}</span>
                Business Dashboard
              </h1>
              {getVerificationBadge()}
            </div>
            <div className="header-actions">
              {profileUrl && (
                <Link href={profileUrl} target="_blank" className="btn btn-neutral">
                  <span className="btn-icon">👁️</span>
                  View Public Profile
                </Link>
              )}
              <Link href="/profile" className="btn btn-neutral">
                <span className="btn-icon">👤</span>
                Personal Profile
              </Link>
            </div>
          </div>
        </header>

        {/* Stats Bar */}
        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-value">{followerCount}</div>
            <div className="stat-label">Followers</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{upcomingEvents.length}</div>
            <div className="stat-label">Upcoming Events</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{profile.business_services?.length || 0}</div>
            <div className="stat-label">Services</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {profile.is_business_public ? "Public" : "Hidden"}
            </div>
            <div className="stat-label">Profile Status</div>
          </div>
        </div>

        {/* Status Messages */}
        {saveSuccess && (
          <div className="alert alert-success">
            <span className="alert-icon">✅</span>
            Changes saved successfully!
          </div>
        )}
        
        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            {error}
          </div>
        )}

        {/* Profile Type Selector */}
        <section className="type-selector">
          <h3 className="selector-title">What do you offer?</h3>
          <div className="type-buttons">
            <button
              className={`type-btn ${profile.creator_type === "event_host" ? "active" : ""}`}
              onClick={() => setProfile({ ...profile, creator_type: "event_host" })}
            >
              <span className="type-icon">✨</span>
              <span className="type-label">Event Host</span>
              <span className="type-desc">I organize gatherings & workshops</span>
            </button>
            <button
              className={`type-btn ${profile.creator_type === "business" ? "active" : ""}`}
              onClick={() => setProfile({ ...profile, creator_type: "business" })}
            >
              <span className="type-icon">💼</span>
              <span className="type-label">Service Provider</span>
              <span className="type-desc">I offer professional services</span>
            </button>
            <button
              className={`type-btn ${profile.creator_type === "both" ? "active" : ""}`}
              onClick={() => setProfile({ ...profile, creator_type: "both" })}
            >
              <span className="type-icon">🌟</span>
              <span className="type-label">Both!</span>
              <span className="type-desc">Services and events</span>
            </button>
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="content-grid">
          {/* Left Column - Main Content */}
          <div className="main-content">
            {/* Tabs */}
            <div className="tabs">
              <button 
                className={`tab ${activeTab === "details" ? "active" : ""}`}
                onClick={() => setActiveTab("details")}
              >
                Profile Details
              </button>
              {(profile.creator_type === "business" || profile.creator_type === "both") && (
                <button 
                  className={`tab ${activeTab === "services" ? "active" : ""}`}
                  onClick={() => setActiveTab("services")}
                >
                  Services ({profile.business_services?.length || 0})
                </button>
              )}
              {(profile.creator_type === "event_host" || profile.creator_type === "both") && (
                <button 
                  className={`tab ${activeTab === "events" ? "active" : ""}`}
                  onClick={() => setActiveTab("events")}
                >
                  Events ({upcomingEvents.length})
                </button>
              )}
              <button 
                className={`tab ${activeTab === "links" ? "active" : ""}`}
                onClick={() => setActiveTab("links")}
              >
                External Links ({profile.external_links?.length || 0})
              </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              {/* Details Tab */}
              {activeTab === "details" && (
                <div className="details-form">
                  <div className="form-grid">
                    {/* Logo Upload */}
                    <div className="form-section">
                      <AvatarUploader
                        userId={userId}
                        value={profile.business_logo_url || ""}
                        onChange={(url) => setProfile({ ...profile, business_logo_url: url })}
                        label={profile.creator_type === "business" ? "Business Logo" : "Profile Photo"}
                        size={120}
                      />
                    </div>

                    {/* Basic Info */}
                    <div className="form-fields">
                      <div className="form-field">
                        <label className="field-label">
                          {profile.creator_type === "business" ? "Business Name" : "Creator Name"}
                          <span className="required">*</span>
                        </label>
                        <input
                          className="field-input"
                          value={profile.business_name || ""}
                          onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
                          placeholder={
                            profile.creator_type === "business" 
                              ? "The Healing Space" 
                              : "Sacred Drum Circle"
                          }
                        />
                      </div>

                      <div className="form-field">
                        <label className="field-label">
                          Tagline
                          <span className="optional">(optional)</span>
                        </label>
                        <input
                          className="field-input"
                          value={profile.business_tagline || ""}
                          onChange={(e) => setProfile({ ...profile, business_tagline: e.target.value })}
                          placeholder="Your inspiring message"
                        />
                      </div>

                      <div className="form-field">
                        <label className="field-label">
                          Email Contact
                        </label>
                        <input
                          className="field-input"
                          type="email"
                          value={profile.business_email || ""}
                          onChange={(e) => setProfile({ ...profile, business_email: e.target.value })}
                          placeholder="contact@example.com"
                        />
                      </div>

                      <div className="form-field">
                        <label className="field-label">
                          Website
                          <span className="optional">(optional)</span>
                        </label>
                        <input
                          className="field-input"
                          value={profile.business_website || ""}
                          onChange={(e) => setProfile({ ...profile, business_website: e.target.value })}
                          placeholder="https://yourwebsite.com"
                        />
                      </div>

                      <div className="location-group">
                        <div className="form-field flex-grow">
                          <label className="field-label">
                            Location
                            <span className="optional">(optional)</span>
                          </label>
                          <input
                            className="field-input"
                            value={profile.business_location_text || ""}
                            onChange={(e) => setProfile({ ...profile, business_location_text: e.target.value })}
                            placeholder="City, State"
                          />
                        </div>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={!!profile.business_location_is_public}
                            onChange={(e) => setProfile({ ...profile, business_location_is_public: e.target.checked })}
                          />
                          <span>Show publicly</span>
                        </label>
                      </div>

                      <div className="form-field">
                        <label className="field-label">
                          About
                          <span className="optional">(optional)</span>
                        </label>
                        <textarea
                          className="field-input textarea"
                          rows={4}
                          value={profile.business_bio || ""}
                          onChange={(e) => setProfile({ ...profile, business_bio: e.target.value })}
                          placeholder={
                            profile.creator_type === "event_host"
                              ? "I host weekly drum circles focused on community connection..."
                              : "I offer sound healing, Reiki sessions, and energy work..."
                          }
                        />
                      </div>

                      {/* Social Links */}
                      <div className="social-section">
                        <h4 className="section-subtitle">Social Proof (for verification)</h4>
                        <div className="social-grid">
                          <input
                            className="field-input"
                            placeholder="Facebook URL"
                            value={profile.business_social?.facebook || ""}
                            onChange={(e) => setProfile({
                              ...profile,
                              business_social: { ...profile.business_social, facebook: e.target.value }
                            })}
                          />
                          <input
                            className="field-input"
                            placeholder="Instagram URL"
                            value={profile.business_social?.instagram || ""}
                            onChange={(e) => setProfile({
                              ...profile,
                              business_social: { ...profile.business_social, instagram: e.target.value }
                            })}
                          />
                        </div>
                      </div>

                      <div className="form-actions">
                        <button 
                          className="btn btn-primary"
                          onClick={saveProfile}
                          disabled={saving}
                        >
                          {saving ? "Saving..." : "Save Details"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Services Tab */}
              {activeTab === "services" && (
                <div className="services-section">
                  {editingServices ? (
                    <>
                      <BusinessServicesEditor
                        userId={userId}
                        value={profile.business_services || []}
                        onChange={(services) => setProfile({ ...profile, business_services: services })}
                        disabled={saving}
                      />
                      <div className="form-actions">
                        <button 
                          className="btn btn-neutral"
                          onClick={() => {
                            setEditingServices(false);
                            loadProfile();
                          }}
                          disabled={saving}
                        >
                          Cancel
                        </button>
                        <button 
                          className="btn btn-primary"
                          onClick={saveServices}
                          disabled={saving}
                        >
                          {saving ? "Saving..." : "Save Services"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {profile.business_services && profile.business_services.length > 0 ? (
                        <div className="services-grid">
                          {profile.business_services.map((service, idx) => (
                            <div key={idx} className="service-card">
                              {service.image_url && (
                                <img src={service.image_url} alt={service.title} />
                              )}
                              <div className="service-content">
                                <h4>{service.title}</h4>
                                {service.description && <p>{service.description}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state">
                          <p>No services added yet</p>
                        </div>
                      )}
                      <button 
                        className="btn btn-primary"
                        onClick={() => setEditingServices(true)}
                      >
                        {profile.business_services?.length ? "Edit Services" : "Add Services"}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Events Tab */}
              {activeTab === "events" && (
                <div className="events-section">
                  <div className="section-header">
                    <h3>Your Events</h3>
                    <button 
                      className="btn btn-primary"
                      onClick={() => window.location.href = '/events/create?type=business'}
                    >
                      <span className="btn-icon">➕</span>
                      Create Event
                    </button>
                  </div>
                  
                  {upcomingEvents.length > 0 ? (
                    <div className="events-list">
                      {upcomingEvents.map(event => (
                        <div key={event.id} className="event-card">
                          <div className="event-date">
                            <span className="day">{new Date(event.date).getDate()}</span>
                            <span className="month">
                              {new Date(event.date).toLocaleDateString('en', { month: 'short' })}
                            </span>
                          </div>
                          <div className="event-info">
                            <h4>{event.title}</h4>
                            <p>{event.time} • {event.location}</p>
                            {event.description && (
                              <p className="event-desc">{event.description}</p>
                            )}
                          </div>
                          <div className="event-actions">
                            <Link href={`/events/${event.id}/edit`} className="btn btn-small">
                              Edit
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <p>No upcoming events</p>
                      <p className="hint">Events you create will appear on your profile and in followers' calendars</p>
                    </div>
                  )}
                </div>
              )}

              {/* External Links Tab */}
              {activeTab === "links" && (
                <div className="links-section">
                  {editingLinks ? (
                    <>
                      <div className="links-editor">
                        {profile.external_links?.map(link => (
                          <div key={link.id} className="link-editor-card">
                            <input
                              className="field-input"
                              placeholder="Product name"
                              value={link.title}
                              onChange={(e) => updateLink(link.id, { title: e.target.value })}
                            />
                            <input
                              className="field-input"
                              placeholder="URL"
                              value={link.url}
                              onChange={(e) => updateLink(link.id, { url: e.target.value })}
                            />
                            <textarea
                              className="field-input"
                              placeholder="Description (optional)"
                              rows={2}
                              value={link.description || ""}
                              onChange={(e) => updateLink(link.id, { description: e.target.value })}
                            />
                            <button 
                              className="btn btn-danger btn-small"
                              onClick={() => removeLink(link.id)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button 
                          className="btn btn-neutral"
                          onClick={addLink}
                        >
                          Add Link
                        </button>
                      </div>
                      <div className="form-actions">
                        <button 
                          className="btn btn-neutral"
                          onClick={() => {
                            setEditingLinks(false);
                            loadProfile();
                          }}
                        >
                          Cancel
                        </button>
                        <button 
                          className="btn btn-primary"
                          onClick={saveLinks}
                          disabled={saving}
                        >
                          {saving ? "Saving..." : "Save Links"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {profile.external_links && profile.external_links.length > 0 ? (
                        <div className="links-grid">
                          {profile.external_links.map(link => (
                            <a 
                              key={link.id}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="link-card"
                            >
                              <h4>{link.title}</h4>
                              {link.description && <p>{link.description}</p>}
                              <span className="link-url">🔗 Visit</span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state">
                          <p>No external links added</p>
                          <p className="hint">Add links to your Etsy store, books, or other work</p>
                        </div>
                      )}
                      <button 
                        className="btn btn-primary"
                        onClick={() => setEditingLinks(true)}
                      >
                        {profile.external_links?.length ? "Edit Links" : "Add Links"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <aside className="sidebar">
            {/* Quick Actions */}
            <div className="sidebar-card">
              <h3 className="card-title">Quick Actions</h3>
              <div className="quick-actions">
                <Link href="/messages" className="action-btn">
                  <span className="action-icon">💬</span>
                  <span>Messages</span>
                </Link>
                {(profile.creator_type === "event_host" || profile.creator_type === "both") && (
                  <button 
                    className="action-btn"
                    onClick={() => window.location.href = '/events/create?type=business'}
                  >
                    <span className="action-icon">📅</span>
                    <span>Create Event</span>
                  </button>
                )}
                <button className="action-btn">
                  <span className="action-icon">📊</span>
                  <span>View Analytics</span>
                </button>
              </div>
            </div>

            {/* Share Profile */}
            <div className="sidebar-card">
              <h3 className="card-title">Share Profile</h3>
              <ProfileInviteQR 
                userId={userId} 
                embed 
                context="creator" 
                qrSize={120}
              />
              {profileUrl && (
                <div className="share-link">
                  <input 
                    className="link-input"
                    value={profileUrl}
                    readOnly
                  />
                  <button 
                    className="btn btn-small"
                    onClick={() => navigator.clipboard.writeText(profileUrl)}
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>

            {/* Profile Status */}
            <div className="sidebar-card">
              <h3 className="card-title">Profile Status</h3>
              <div className="status-info">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={profile.is_business_public}
                    onChange={(e) => setProfile({ ...profile, is_business_public: e.target.checked })}
                  />
                  <span>Public Profile</span>
                </label>
                <p className="hint">
                  {profile.is_business_public 
                    ? "Your profile is visible to everyone"
                    : "Your profile is hidden from public view"}
                </p>
              </div>
            </div>

            {/* Testimonials Preview */}
            <div className="sidebar-card testimonials-preview">
              <h3 className="card-title">💝 Testimonials</h3>
              <p className="coming-soon">Coming soon!</p>
              <p className="hint">Collect kind words from your community</p>
            </div>
          </aside>
        </div>
      </div>

      <style jsx>{`
        .business-dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 20%, #f1f5f9 40%, #e0e7ff 60%, #f3e8ff 80%, #fdf4ff 100%);
          padding: 2rem 1rem;
        }

        .dashboard-container {
          max-width: 1400px;
          margin: 0 auto;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
          gap: 1rem;
        }

        .loading-spinner {
          width: 2rem;
          height: 2rem;
          border: 3px solid #e5e7eb;
          border-top: 3px solid #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Header */
        .dashboard-header {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .dashboard-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .title-icon {
          font-size: 1.5rem;
        }

        .badge {
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .badge.verified {
          background: #d1fae5;
          color: #065f46;
        }

        .badge.trusted {
          background: #fef3c7;
          color: #92400e;
        }

        .badge.unverified {
          background: #fee2e2;
          color: #991b1b;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
        }

        /* Stats Bar */
        .stats-bar {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          padding: 1rem;
          border-radius: 0.75rem;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #8b5cf6;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #6b7280;
        }

        /* Alerts */
        .alert {
          padding: 1rem;
          border-radius: 0.75rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .alert-success {
          background: linear-gradient(135deg, #d1fae5, #a7f3d0);
          color: #065f46;
          border: 1px solid #6ee7b7;
        }

        .alert-error {
          background: linear-gradient(135deg, #fef2f2, #fecaca);
          color: #dc2626;
          border: 1px solid #fca5a5;
        }

        .alert-icon {
          font-size: 1.125rem;
        }

        /* Type Selector */
        .type-selector {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .selector-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 1rem 0;
        }

        .type-buttons {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .type-btn {
          background: linear-gradient(135deg, #f9fafb, #f3f4f6);
          border: 2px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }

        .type-btn:hover {
          background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(139,92,246,0.2);
        }

        .type-btn.active {
          background: linear-gradient(135deg, #ede9fe, #ddd6fe);
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
        }

        .type-icon {
          display: block;
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .type-label {
          display: block;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.25rem;
        }

        .type-desc {
          display: block;
          font-size: 0.75rem;
          color: #6b7280;
        }

        /* Content Grid */
        .content-grid {
          display: grid;
          gap: 2rem;
        }

        @media (min-width: 1024px) {
          .content-grid {
            grid-template-columns: 1fr 320px;
          }
        }

        /* Main Content */
        .main-content {
          background: white;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        /* Tabs */
        .tabs {
          display: flex;
          border-bottom: 2px solid #e5e7eb;
          background: #f9fafb;
        }

        .tab {
          padding: 1rem 1.5rem;
          background: none;
          border: none;
          cursor: pointer;
          font-weight: 500;
          color: #6b7280;
          transition: all 0.2s ease;
          position: relative;
        }

        .tab:hover {
          color: #1f2937;
          background: rgba(139,92,246,0.05);
        }

        .tab.active {
          color: #8b5cf6;
          background: white;
        }

        .tab.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background: #8b5cf6;
        }

        /* Tab Content */
        .tab-content {
          padding: 2rem;
        }

        /* Forms */
        .form-grid {
          display: grid;
          gap: 2rem;
        }

        @media (min-width: 768px) {
          .form-grid {
            grid-template-columns: 150px 1fr;
          }
        }

        .form-fields {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-field {
          display: flex;
          flex-direction: column;
        }

        .field-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .required {
          color: #ef4444;
        }

        .optional {
          font-size: 0.75rem;
          color: #9ca3af;
          font-weight: 400;
        }

        .field-input {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          background: #f9fafb;
          transition: all 0.2s ease;
          font-size: 16px;
        }

        .field-input:focus {
          outline: none;
          border-color: #8b5cf6;
          background: white;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
        }

        .textarea {
          resize: vertical;
          min-height: 6rem;
        }

        .location-group {
          display: grid;
          gap: 1rem;
          grid-template-columns: 1fr auto;
          align-items: end;
        }

        .flex-grow {
          flex-grow: 1;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
          color: #374151;
          padding-bottom: 0.75rem;
        }

        .checkbox-label input[type="checkbox"] {
          width: 1rem;
          height: 1rem;
          accent-color: #8b5cf6;
        }

        .social-section {
          margin-top: 1rem;
        }

        .section-subtitle {
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 0.75rem 0;
        }

        .social-grid {
          display: grid;
          gap: 0.75rem;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
          margin-top: 1rem;
        }

        /* Services */
        .services-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .services-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        }

        .service-card {
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .service-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .service-card img {
          width: 100%;
          height: 150px;
          object-fit: cover;
        }

        .service-content {
          padding: 1rem;
        }

        .service-content h4 {
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .service-content p {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
        }

        /* Events */
        .events-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .section-header h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .events-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .event-card {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          background: #f9fafb;
        }

        .event-date {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.5rem;
          background: linear-gradient(135deg, #ede9fe, #ddd6fe);
          border-radius: 0.5rem;
          min-width: 60px;
        }

        .event-date .day {
          font-size: 1.5rem;
          font-weight: 700;
          color: #7c3aed;
        }

        .event-date .month {
          font-size: 0.75rem;
          color: #6d28d9;
          text-transform: uppercase;
        }

        .event-info {
          flex-grow: 1;
        }

        .event-info h4 {
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 0.25rem 0;
        }

        .event-info p {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
        }

        .event-desc {
          margin-top: 0.5rem !important;
        }

        .event-actions {
          display: flex;
          align-items: center;
        }

        /* Links */
        .links-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .links-editor {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .link-editor-card {
          background: #f9fafb;
          padding: 1rem;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .links-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        }

        .link-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 1rem;
          text-decoration: none;
          color: inherit;
          transition: all 0.2s ease;
        }

        .link-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border-color: #8b5cf6;
        }

        .link-card h4 {
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 0.25rem 0;
        }

        .link-card p {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0 0 0.5rem 0;
        }

        .link-url {
          font-size: 0.75rem;
          color: #8b5cf6;
          font-weight: 500;
        }

        /* Empty States */
        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: #6b7280;
        }

        .empty-state p {
          margin: 0 0 0.5rem 0;
        }

        .hint {
          font-size: 0.875rem;
          color: #9ca3af;
        }

        /* Sidebar */
        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .sidebar-card {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .card-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 1rem 0;
        }

        .quick-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: linear-gradient(135deg, #f9fafb, #f3f4f6);
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          color: #374151;
          font-weight: 500;
        }

        .action-btn:hover {
          background: linear-gradient(135deg, #ede9fe, #ddd6fe);
          border-color: #8b5cf6;
          transform: translateX(2px);
        }

        .action-icon {
          font-size: 1.25rem;
        }

        .share-link {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .link-input {
          flex-grow: 1;
          padding: 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          background: #f9fafb;
        }

        .status-info {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .toggle-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-weight: 500;
          color: #374151;
        }

        .testimonials-preview {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border: 1px solid #fbbf24;
        }

        .coming-soon {
          font-weight: 600;
          color: #78350f;
          margin: 0 0 0.5rem 0;
        }

        /* Buttons */
        .btn {
          padding: 0.75rem 1.25rem;
          border-radius: 0.5rem;
          border: none;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 16px;
        }

        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .btn-primary {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
        }

        .btn-primary:hover {
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
        }

        .btn-neutral {
          background: white;
          color: #374151;
          border: 1px solid #e5e7eb;
        }

        .btn-neutral:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .btn-danger {
          background: #ef4444;
          color: white;
        }

        .btn-danger:hover {
          background: #dc2626;
        }

        .btn-small {
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }

        .btn-icon {
          font-size: 0.875rem;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .dashboard-container {
            padding: 0 0.5rem;
          }

          .dashboard-header {
            padding: 1rem;
          }

          .header-content {
            flex-direction: column;
            align-items: flex-start;
          }

          .header-actions {
            width: 100%;
            flex-direction: column;
          }

          .header-actions .btn {
            width: 100%;
            justify-content: center;
          }

          .stats-bar {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
          }

          .stat-card {
            padding: 0.75rem;
          }

          .stat-value {
            font-size: 1.25rem;
          }

          .type-selector {
            padding: 1rem;
          }

          .type-buttons {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }

          .type-btn {
            padding: 0.875rem;
          }

          .content-grid {
            grid-template-columns: 1fr;
          }

          .main-content {
            border-radius: 0.75rem;
          }

          .tabs {
            overflow-x: auto;
            white-space: nowrap;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }

          .tabs::-webkit-scrollbar {
            display: none;
          }

          .tab {
            padding: 0.875rem 1rem;
            font-size: 0.875rem;
            flex-shrink: 0;
          }

          .tab-content {
            padding: 1.25rem;
          }

          .form-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .form-section {
            display: flex;
            justify-content: center;
          }

          .location-group {
            grid-template-columns: 1fr;
          }

          .checkbox-label {
            padding-bottom: 0;
            margin-top: 0.5rem;
          }

          .social-grid {
            grid-template-columns: 1fr;
          }

          .services-grid {
            grid-template-columns: 1fr;
          }

          .event-card {
            flex-direction: column;
            text-align: center;
          }

          .event-date {
            width: 100%;
            flex-direction: row;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.5rem;
          }

          .links-grid {
            grid-template-columns: 1fr;
          }

          .sidebar {
            margin-top: 1rem;
          }

          .sidebar-card {
            padding: 1.25rem;
          }

          .quick-actions {
            flex-direction: row;
            flex-wrap: wrap;
          }

          .action-btn {
            flex: 1;
            min-width: 140px;
            padding: 0.625rem;
            font-size: 0.875rem;
          }

          .action-icon {
            font-size: 1rem;
          }

          .form-actions {
            flex-direction: column;
          }

          .form-actions .btn {
            width: 100%;
          }

          /* Ensure all inputs are 16px to prevent zoom on iOS */
          .field-input,
          .field-input.textarea,
          input[type="text"],
          input[type="email"],
          textarea {
            font-size: 16px !important;
          }

          /* Better touch targets */
          .btn {
            min-height: 44px;
            font-size: 16px;
          }

          .btn-small {
            min-height: 38px;
          }

          /* Modal adjustments */
          .modal {
            margin: 1rem;
            padding: 1.5rem;
          }
        }

        @media (max-width: 480px) {
          .dashboard-title {
            font-size: 1.5rem;
          }

          .title-icon {
            font-size: 1.25rem;
          }

          .badge {
            font-size: 0.75rem;
            padding: 0.2rem 0.5rem;
          }

          .type-icon {
            font-size: 1.5rem;
          }

          .type-label {
            font-size: 0.875rem;
          }

          .type-desc {
            font-size: 0.7rem;
          }

          .tab-content {
            padding: 1rem;
          }

          .section-header h3 {
            font-size: 1.125rem;
          }

          /* Ensure profile sections stack properly */
          .edit-form {
            grid-template-columns: 1fr;
          }

          /* Make save buttons more prominent on mobile */
          .save-button {
            background: linear-gradient(135deg, #8b5cf6, #7c3aed);
            min-height: 48px;
            font-size: 16px;
            font-weight: 600;
          }
        }

        /* iOS-specific fixes */
        @supports (-webkit-touch-callout: none) {
          /* Prevent double-tap zoom */
          .btn, .type-btn, .tab, .checkbox-label {
            touch-action: manipulation;
          }
          
          /* Ensure smooth scrolling */
          .tabs {
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>
    </div>
  );
};

export default BusinessDashboard;
