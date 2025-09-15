// app/profile/components/ProfileAnalytics.tsx
"use client";

import * as React from "react";
import type { Profile } from "../types/profile";

type ProfileAnalyticsProps = {
  profile?: Profile | null;
  isOwner?: boolean;
};

/**
 * Minimal, safe analytics panel.
 * - Renders only if there’s something to show.
 * - Reads numbers from flexible locations without crashing.
 * - Default export to satisfy existing imports.
 */
export default function ProfileAnalytics({
  profile,
  isOwner = true,
}: ProfileAnalyticsProps) {
  if (!profile) return null;

  // Be tolerant of schema differences:
  const anyProfile = profile as any;
  const a = anyProfile.analytics_json || anyProfile.analytics || anyProfile.stats || {};

  const posts = Number(anyProfile.posts_count ?? a.posts_count ?? 0) || 0;
  const friends = Number(anyProfile.friends_count ?? a.friends_count ?? 0) || 0;
  const views30 = Number(a.views_30d ?? a.profile_views_30d ?? 0) || 0;
  const reach30 = Number(a.reach_30d ?? 0) || 0;
  const clicks30 = Number(a.clicks_30d ?? a.profile_clicks_30d ?? 0) || 0;

  const items = [
    { label: "Views (30d)", value: views30 },
    { label: "Reach (30d)", value: reach30 },
    { label: "Clicks (30d)", value: clicks30 },
    { label: "Posts", value: posts },
    { label: "Friends", value: friends },
  ].filter((i) => Number.isFinite(i.value) && i.value > 0);

  if (items.length === 0) {
    // Owners get a gentle empty state; viewers see nothing.
    return isOwner ? (
      <div className="card">
        <h3 className="card-title">
          <span className="title-icon">📊</span>
          Insights
        </h3>
        <p className="muted">No analytics yet. Come back after you post and connect with friends.</p>
        <style jsx>{styles}</style>
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
        {items.map((it) => (
          <div key={it.label} className="stat-card">
            <div className="stat-number">{formatNumber(it.value)}</div>
            <div className="stat-label">{it.label}</div>
          </div>
        ))}
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return n.toLocaleString();
}

const styles = /* css */ `
.card {
  background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.9));
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.6);
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
  background: linear-gradient(135deg, var(--brand, #8b5cf6), #8b5cf6);
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.875rem;
}

.muted {
  color: #6b7280;
  font-size: 0.9rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
  gap: 0.75rem;
}

.stat-card {
  background: rgba(255,255,255,0.8);
  border: 1px solid rgba(139,92,246,0.2);
  border-radius: 0.75rem;
  padding: 0.75rem;
  text-align: center;
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139,92,246,0.2);
  background: rgba(255,255,255,0.95);
  border-color: rgba(139,92,246,0.3);
}

.stat-number {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--brand, #8b5cf6);
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
}

/* Mobile polish */
@media (max-width: 640px) {
  .card { padding: 1rem; }
  .stats-grid { gap: 0.5rem; }
}
`;
