// app/business/[slug]/page.tsx - PUBLIC CREATOR PROFILE VIEW
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type CreatorProfile = {
  id: string;
  business_name: string | null;
  business_logo_url: string | null;
  business_bio: string | null;
  business_location_text: string | null;
  business_location_is_public: boolean | null;
  business_services: any[] | null;
  external_links: any[] | null;
  creator_type: string | null;
  verification_status: "unverified" | "verified" | "trusted" | null;
};

type UpcomingEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
};

export default function PublicCreatorProfilePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (slug) {
      loadCreatorProfile();
      loadUpcomingEvents();
    }
  }, [slug, currentUserId]);

  async function loadCreatorProfile() {
    try {
      // First try to find by business_name slug
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .or(`business_name.ilike.${slug},id.eq.${slug}`)
        .single();

      if (error) throw error;

      setProfile(data);
      
      // Check if owner (redirect to dashboard if yes)
      if (currentUserId && data.id === currentUserId) {
        window.location.href = "/business";
      }
      
      // Load follower count
      const { count } = await supabase
        .from("creator_followers")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", data.id);
      
      setFollowerCount(count || 0);

      // Check if following
      if (currentUserId) {
        const { data: followData } = await supabase
          .from("creator_followers")
          .select("*")
          .eq("creator_id", data.id)
          .eq("follower_id", currentUserId)
          .single();
        
        setIsFollowing(!!followData);
      }
    } catch (err) {
      console.error("Error loading creator profile:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadUpcomingEvents() {
    // Load events hosted by this creator
    try {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("host_id", slug)
        .gte("date", new Date().toISOString())
        .order("date", { ascending: true })
        .limit(5);
      
      setUpcomingEvents(data || []);
    } catch (err) {
      console.error("Error loading events:", err);
    }
  }

  async function toggleFollow() {
    if (!currentUserId || !profile) return;

    try {
      if (isFollowing) {
        await supabase
          .from("creator_followers")
          .delete()
          .eq("creator_id", profile.id)
          .eq("follower_id", currentUserId);
        
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase
          .from("creator_followers")
          .insert({
            creator_id: profile.id,
            follower_id: currentUserId
          });
        
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  }

  async function sendMessage() {
    if (!currentUserId || !profile) return;
    window.location.href = `/messages/chat/${profile.id}`;
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <span>Loading creator profile...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="error-container">
        <h2>Creator Not Found</h2>
        <p>This creator profile doesn't exist.</p>
        <Link href="/" className="btn btn-primary">Go Home</Link>
      </div>
    );
  }

  const getVerificationBadge = () => {
    switch(profile.verification_status) {
      case "verified":
        return <span className="verification-badge verified">✓ Verified</span>;
      case "trusted":
        return <span className="verification-badge trusted">⭐ Trusted</span>;
      default:
        return null;
    }
  };

  const getCreatorTypeLabel = () => {
    switch(profile.creator_type) {
      case "business": return "Service Provider";
      case "event_host": return "Event Host";
      case "both": return "Service Provider & Event Host";
      default: return "Creator";
    }
  };

  return (
    <div className="creator-page">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="creator-avatar">
            <img
              src={profile.business_logo_url || "/default-creator.png"}
              alt={profile.business_name || "Creator"}
            />
          </div>
          
          <div className="creator-info">
            <div className="name-row">
              <h1 className="creator-name">{profile.business_name || "Unnamed Creator"}</h1>
              {getVerificationBadge()}
            </div>
            
            <p className="creator-type">{getCreatorTypeLabel()}</p>
            
            {profile.business_location_is_public && profile.business_location_text && (
              <div className="location">
                <span className="location-icon">📍</span>
                {profile.business_location_text}
              </div>
            )}
            
            <div className="stats">
              <div className="stat">
                <span className="stat-number">{followerCount}</span>
                <span className="stat-label">Followers</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button 
                className={`btn ${isFollowing ? 'btn-following' : 'btn-primary'}`}
                onClick={toggleFollow}
              >
                {isFollowing ? (
                  <>
                    <span className="btn-icon">✓</span>
                    Following
                  </>
                ) : (
                  <>
                    <span className="btn-icon">➕</span>
                    Follow
                  </>
                )}
              </button>

              <button 
                className="btn btn-neutral"
                onClick={sendMessage}
              >
                <span className="btn-icon">💬</span>
                Contact
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="content-container">
        {/* About Section */}
        {profile.business_bio && (
          <section className="card">
            <h2 className="section-title">About</h2>
            <p className="bio-text">{profile.business_bio}</p>
          </section>
        )}

        {/* Services/Offerings */}
        {profile.business_services && profile.business_services.length > 0 && (
          <section className="card">
            <h2 className="section-title">What I Offer</h2>
            <div className="services-grid">
              {profile.business_services.map((service, idx) => (
                <div key={idx} className="service-card">
                  {service.image_url && (
                    <img src={service.image_url} alt={service.title} className="service-image" />
                  )}
                  <h3 className="service-title">{service.title}</h3>
                  {service.description && (
                    <p className="service-desc">{service.description}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Shop Links */}
        {profile.external_links && profile.external_links.length > 0 && (
          <section className="card">
            <h2 className="section-title">Shop My Work</h2>
            <div className="links-grid">
              {profile.external_links.map((link: any, idx) => (
                <a 
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shop-link"
                >
                  {link.image_url && (
                    <img src={link.image_url} alt={link.title} className="link-image" />
                  )}
                  <div className="link-content">
                    <h4>{link.title}</h4>
                    {link.description && <p>{link.description}</p>}
                    <span className="link-cta">Visit →</span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <section className="card">
            <h2 className="section-title">Upcoming Events</h2>
            <div className="events-list">
              {upcomingEvents.map(event => (
                <Link 
                  key={event.id} 
                  href={`/events/${event.id}`}
                  className="event-item"
                >
                  <div className="event-date">
                    <span className="event-day">{new Date(event.date).getDate()}</span>
                    <span className="event-month">{new Date(event.date).toLocaleDateString('en', { month: 'short' })}</span>
                  </div>
                  <div className="event-details">
                    <h4>{event.title}</h4>
                    <p>{event.time} • {event.location}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <style jsx>{`
        .creator-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 20%, #f1f5f9 40%, #e0e7ff 60%, #f3e8ff 80%, #fdf4ff 100%);
        }

        .loading-container, .error-container {
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

        .hero-section {
          background: white;
          padding: 3rem 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .hero-content {
          max-width: 1000px;
          margin: 0 auto;
          display: flex;
          gap: 2rem;
          align-items: flex-start;
        }

        @media (max-width: 768px) {
          .hero-content {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
        }

        .creator-avatar img {
          width: 150px;
          height: 150px;
          border-radius: 1rem;
          object-fit: cover;
          border: 3px solid rgba(139,92,246,0.2);
        }

        .creator-info {
          flex-grow: 1;
        }

        .name-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .creator-name {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .verification-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .verification-badge.verified {
          background: #d1fae5;
          color: #065f46;
        }

        .verification-badge.trusted {
          background: #fef3c7;
          color: #92400e;
        }

        .creator-type {
          color: #6b7280;
          margin: 0 0 1rem 0;
        }

        .location {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #8b5cf6;
          margin-bottom: 1rem;
        }

        .stats {
          display: flex;
          gap: 2rem;
          margin-bottom: 1.5rem;
        }

        .stat {
          display: flex;
          flex-direction: column;
        }

        .stat-number {
          font-size: 1.5rem;
          font-weight: 700;
          color: #8b5cf6;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          border: none;
          cursor: pointer;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
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

        .btn-following {
          background: #10b981;
          color: white;
        }

        .btn-neutral {
          background: white;
          color: #374151;
          border: 1px solid #e5e7eb;
        }

        .content-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .card {
          background: white;
          border-radius: 1rem;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 1.5rem 0;
        }

        .bio-text {
          color: #4b5563;
          line-height: 1.6;
        }

        .services-grid {
          display: grid;
          gap: 1.5rem;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        }

        .service-card {
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          overflow: hidden;
        }

        .service-image {
          width: 100%;
          height: 150px;
          object-fit: cover;
        }

        .service-title {
          font-size: 1.125rem;
          font-weight: 600;
          padding: 1rem 1rem 0.5rem;
          margin: 0;
        }

        .service-desc {
          padding: 0 1rem 1rem;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .links-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        }

        .shop-link {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          text-decoration: none;
          color: inherit;
          transition: all 0.2s;
        }

        .shop-link:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border-color: #8b5cf6;
        }

        .link-image {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: 0.5rem;
        }

        .link-content h4 {
          margin: 0 0 0.25rem 0;
          color: #1f2937;
        }

        .link-content p {
          margin: 0 0 0.5rem 0;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .link-cta {
          color: #8b5cf6;
          font-weight: 500;
          font-size: 0.875rem;
        }

        .events-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .event-item {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          text-decoration: none;
          color: inherit;
          transition: all 0.2s;
        }

        .event-item:hover {
          background: #f9fafb;
          border-color: #8b5cf6;
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

        .event-day {
          font-size: 1.5rem;
          font-weight: 700;
          color: #7c3aed;
        }

        .event-month {
          font-size: 0.75rem;
          color: #6d28d9;
          text-transform: uppercase;
        }

        .event-details h4 {
          margin: 0 0 0.25rem 0;
          color: #1f2937;
        }

        .event-details p {
          margin: 0;
          color: #6b7280;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}
