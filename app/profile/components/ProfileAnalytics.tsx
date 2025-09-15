// app/profile/components/ProfileAnalytics.tsx
"use client";

import React from 'react';
import type { Profile } from '../types/profile';

interface ProfileAnalyticsProps {
  profile: Profile | null;
  isOwner?: boolean;
}

export default function ProfileAnalytics({ profile, isOwner = true }: ProfileAnalyticsProps) {
  if (!profile) return null;

  const stats = [
    { label: "Profile Views (30d)", value: profile.profile_views_30d || 0 },
    { label: "Posts", value: profile.posts_count || 0 },
    { label: "Collaborative Posts", value: profile.collab_posts_count || 0 },
    { label: "Friends", value: profile.friends_count || 0 },
  ].filter(item => item.value > 0);

  if (stats.length === 0) {
    return isOwner ? (
      <div className="card">
        <h3 className="card-title">
          <span className="title-icon">📊</span>
          Insights
        </h3>
        <p className="muted">No analytics yet. Come back after you post and connect with friends.</p>
      </div>
    ) : null;
  }

  return (
    <div className="card">
      <h3 className="card-title">
        <span className="title-icon">📊</span>
        Insights
      </h3>
      <div className="stats-grid">
        {stats.map(stat => (
          <div key={stat.label} className="stat-card">
            <div className="stat-number">{stat.value.toLocaleString()}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>
      
      <style jsx>{`
        .card {
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.9));
          border-radius: 0.75rem;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .card-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 1rem 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .title-icon {
          width: 1.75rem;
          height: 1.75rem;
          background: linear-gradient(135deg, var(--brand), #8b5cf6);
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 0.875rem;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 0.75rem;
        }
        .stat-card {
          background: rgba(255,255,255,0.8);
          border: 1px solid rgba(139,92,246,0.2);
          border-radius: 0.75rem;
          padding: 0.75rem;
          text-align: center;
        }
        .stat-number {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--brand);
        }
        .stat-label {
          font-size: 0.75rem;
          color: #6b7280;
        }
        .muted {
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}
