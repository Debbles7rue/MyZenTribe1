// app/profile/components/ProfileEditForm.tsx
"use client";

import * as React from "react";
import type { Profile } from "../types/profile";

export type ProfileEditFormProps = {
  profile: Profile;
  onChange: (updates: Partial<Profile>) => void;
  onSave: () => void;
  saving?: boolean;
  isDesktop?: boolean;
};

function Field({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="form-field">
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

function Row({
  desktop,
  children,
}: {
  desktop?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`form-row ${desktop ? "desktop" : "mobile"}`}>{children}</div>
  );
}

/**
 * Minimal, safe, client-only edit form.
 * Matches the field names already used elsewhere in your app.
 * Default export to avoid import mismatch errors during build.
 */
export default function ProfileEditForm({
  profile,
  onChange,
  onSave,
  saving = false,
  isDesktop = false,
}: ProfileEditFormProps) {
  // Local conveniences that write-through to parent via onChange
  const handle = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ [k]: (e.target as HTMLInputElement).value } as Partial<Profile>);

  const handleBool = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ [k]: e.target.checked } as Partial<Profile>);

  const handleCSV =
    (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const arr = e.target.value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      onChange({ [k]: arr as any });
    };

  const toggleInterest = (interest: string) => {
    const list = Array.isArray(profile.interests) ? [...profile.interests] : [];
    const exists = list.includes(interest);
    onChange({
      interests: exists ? list.filter((i) => i !== interest) : [...list, interest],
    });
  };

  return (
    <div className="edit-form">
      {/* About */}
      <Field label="Name">
        <input
          className="form-input"
          value={profile.full_name || ""}
          onChange={handle("full_name")}
          placeholder="Your full name"
          autoComplete="name"
          inputMode="text"
        />
      </Field>

      <Field label="Username">
        <div className="username-input-group">
          <span className="username-prefix">@</span>
          <input
            className="form-input"
            value={profile.username || ""}
            onChange={(e) =>
              onChange({
                username: e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9_]/g, ""),
              })
            }
            placeholder="username"
            autoComplete="off"
            inputMode="text"
          />
        </div>
      </Field>

      <Field label="Tagline">
        <input
          className="form-input"
          value={profile.tagline || ""}
          onChange={handle("tagline")}
          placeholder="Short status or description"
          maxLength={100}
          autoComplete="off"
          inputMode="text"
        />
      </Field>

      <Row desktop={isDesktop}>
        <div className="form-field flex-grow">
          <label className="form-label">Location</label>
          <input
            className="form-input"
            value={profile.location_text || ""}
            onChange={handle("location_text")}
            placeholder="City, State"
            autoComplete="address-level2"
            inputMode="text"
          />
        </div>
        <div className="form-field checkbox-field">
          <label className="checkbox-label compact">
            <input
              type="checkbox"
              checked={!!profile.location_is_public}
              onChange={handleBool("location_is_public")}
            />
            <span>Public</span>
          </label>
        </div>
      </Row>

      <Field label="Bio">
        <textarea
          className="form-input textarea"
          rows={3}
          value={profile.bio || ""}
          onChange={handle("bio")}
          placeholder="Tell people about yourself..."
          inputMode="text"
        />
      </Field>

      <Field label="🌐 Website">
        <input
          className="form-input"
          type="url"
          value={profile.website_url || ""}
          onChange={handle("website_url")}
          placeholder="https://yourwebsite.com"
          autoComplete="url"
          inputMode="url"
        />
      </Field>

      <Field label="Languages">
        <input
          className="form-input"
          value={(profile.languages || []).join(", ")}
          onChange={handleCSV("languages")}
          placeholder="English, Spanish, French"
          autoComplete="off"
          inputMode="text"
        />
      </Field>

      <div className="form-field">
        <label className="form-label"># Interests</label>
        <div className="interests-picker">
          {[
            "Meditation",
            "Yoga",
            "Reiki",
            "Nature",
            "Music",
            "Art",
            "Travel",
            "Reading",
            "Cooking",
            "Photography",
          ].map((interest) => (
            <button
              key={interest}
              type="button"
              onClick={() => toggleInterest(interest)}
              className={`interest-chip ${
                profile.interests?.includes(interest) ? "active" : ""
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
        <input
          className="form-input"
          placeholder="Add custom interests (comma separated)"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const input = e.currentTarget as HTMLInputElement;
              const newItems = input.value
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean);
              onChange({
                interests: [...(profile.interests || []), ...newItems],
              });
              input.value = "";
            }
          }}
        />
      </div>

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={!!profile.show_mutuals}
          onChange={handleBool("show_mutuals")}
        />
        <span>Show mutual friends</span>
      </label>

      {/* Private (creator-only) */}
      <div className="private-section">
        <h4 className="section-subtitle">🔒 Private Information (only you see this)</h4>

        <Field label="📝 Personal Notes">
          <textarea
            className="form-input textarea"
            rows={2}
            value={profile.internal_notes || ""}
            onChange={handle("internal_notes")}
            placeholder="Reminders, drafts, private thoughts..."
            inputMode="text"
          />
        </Field>

        <Field label="📱 Phone Number">
          <input
            className="form-input"
            type="tel"
            value={profile.phone || ""}
            onChange={handle("phone")}
            placeholder="Your phone number"
            autoComplete="tel"
            inputMode="tel"
          />
        </Field>

        <Field label="🎂 Birthday">
          <input
            className="form-input"
            type="date"
            value={(profile as any).birthday || ""}
            onChange={handle("birthday" as any)}
          />
        </Field>
      </div>

      <div className="form-actions">
        <button
          className="btn btn-primary save-button"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "💾 Saving..." : "✨ Save Changes"}
        </button>
      </div>
    </div>
  );
}
