// app/profile/components/ProfileAboutSection.tsx
"use client";

import React from 'react';
import type { Profile } from '../types/profile';

type ProfileAboutSectionProps = {
  profile: Profile | null;
  isOwner: boolean;
};

const styles = {
  card: {
    padding: '1.5rem',
    marginBottom: '1.5rem',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(248,250,252,0.8))',
    backdropFilter: 'blur(5px)',
    borderRadius: '0.75rem',
  },
  cardTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 1rem 0',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  titleIcon: {
    width: '1.75rem',
    height: '1.75rem',
    background: 'linear-gradient(135deg, var(--brand), #8b5cf6)',
    borderRadius: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '0.875rem',
  },
  aboutContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
  },
  aboutItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#374151',
  },
  aboutIcon: {
    color: 'var(--brand)',
  },
  bioText: {
    color: '#374151',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap' as const,
  },
  emptyState: {
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  interestsDisplay: {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e5e7eb',
  },
  interestsList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.5rem',
    marginTop: '0.5rem',
  },
  interestTag: {
    padding: '0.25rem 0.75rem',
    background: 'linear-gradient(135deg, #ede9fe, #fce7f3)',
    color: '#7c3aed',
    borderRadius: '1rem',
    fontSize: '0.875rem',
  },
  link: {
    color: 'var(--brand)',
    textDecoration: 'none',
  },
};

export default function ProfileAboutSection({ profile, isOwner }: ProfileAboutSectionProps) {
  if (!profile) return null;

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>
        <span style={styles.titleIcon}>👤</span>
        About
      </h3>
      
      <div style={styles.aboutContent}>
        {profile.location_is_public && profile.location_text && (
          <div style={styles.aboutItem}>
            <span style={styles.aboutIcon}>📍</span>
            <span><strong>Location:</strong> {profile.location_text}</span>
          </div>
        )}
        
        {profile.website_url && (
          <div style={styles.aboutItem}>
            <span style={styles.aboutIcon}>🌐</span>
            <span>
              <strong>Website:</strong>{" "}
              <a 
                href={profile.website_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={styles.link}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                {profile.website_url.replace(/^https?:\/\//, "")}
              </a>
            </span>
          </div>
        )}
        
        {profile.languages && profile.languages.length > 0 && (
          <div style={styles.aboutItem}>
            <span style={styles.aboutIcon}>💬</span>
            <span><strong>Languages:</strong> {profile.languages.join(", ")}</span>
          </div>
        )}
        
        {profile.bio ? (
          <div style={styles.bioText}>{profile.bio}</div>
        ) : (
          isOwner && (
            <div style={styles.emptyState}>Add a bio and location using the Edit button above.</div>
          )
        )}
        
        {profile.interests && profile.interests.length > 0 && (
          <div style={styles.interestsDisplay}>
            <strong>Interests:</strong>
            <div style={styles.interestsList}>
              {profile.interests.map(interest => (
                <span key={interest} style={styles.interestTag}>
                  #{interest}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
