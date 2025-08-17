// components/ProfileCard.tsx
"use client";

import AvatarUploader from "@/components/AvatarUploader";

export type ProfileCardProps = {
  userId: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  location_text?: string | null;
  location_is_public?: boolean | null;
  show_mutuals?: boolean | null;

  followersCount?: number;
  followingCount?: number;
  friendsCount?: number;

  editable?: boolean;
  onNameChange?: (v: string) => void;
  onBioChange?: (v: string) => void;
  onLocationChange?: (v: string) => void;
  onLocationPublicChange?: (v: boolean) => void;
  onShowMutualsChange?: (v: boolean) => void;
  onAvatarChange?: (url: string) => void;

  onSave?: () => Promise<void> | void;
  saving?: boolean;
  editMode?: boolean;
  setEditMode?: (v: boolean) => void;
};

export default function ProfileCard({
  userId,
  full_name,
  avatar_url,
  bio,
  location_text,
  location_is_public,
  show_mutuals,

  followersCount = 0,
  followingCount = 0,
  friendsCount = 0,

  editable = false,
  onNameChange,
  onBioChange,
  onLocationChange,
  onLocationPublicChange,
  onShowMutualsChange,
  onAvatarChange,

  onSave,
  saving,
  editMode = false,
  setEditMode,
}: ProfileCardProps) {
  const displayName = full_name?.trim() || "Member";

  return (
    <div className="card p-3" style={{ borderColor: "rgba(196,181,253,.7)", background: "rgba(245,243,255,.4)" }}>
      {/* Header */}
      <div className="profile-header flex gap-4 items-start">
        <AvatarUploader
          userId={userId}
          value={avatar_url || ""}
          onChange={(url) => onAvatarChange?.(url)}
          label="Profile photo"
          size={140}
        />
        <div className="grow min-w-0">
          <div className="flex items-center justify-between gap-2">
            {editMode && editable ? (
              <input
                className="input text-xl font-semibold"
                value={full_name || ""}
                onChange={(e) => onNameChange?.(e.target.value)}
                placeholder="Your name"
              />
            ) : (
              <div className="profile-name text-xl font-semibold">{displayName}</div>
            )}

            {editable && (
              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <button
                      className="btn"
                      onClick={() => setEditMode?.(false)}
                      disabled={!!saving}
                      aria-label="Done editing"
                    >
                      Done
                    </button>
                    <button
                      className="btn btn-brand"
                      onClick={() => onSave?.()}
                      disabled={!!saving}
                      aria-label="Save profile"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </>
                ) : (
                  <button className="btn" onClick={() => setEditMode?.(true)} aria-label="Edit profile">
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="kpis mt-2 flex gap-4 text-sm">
            <span className="kpi">
              <strong>{followersCount}</strong> Followers
            </span>
            <span className="kpi">
              <strong>{followingCount}</strong> Following
            </span>
            <span className="kpi">
              <strong>{friendsCount}</strong> Friends
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mt-4">
        {editMode && editable ? (
          <div className="stack">
            <label className="field">
              <span className="label">Location</span>
              <input
                className="input"
                value={location_text || ""}
                onChange={(e) => onLocationChange?.(e.target.value)}
                placeholder="City, State (e.g., Greenville, TX)"
              />
            </label>
            <label className="mt-1 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!location_is_public}
                onChange={(e) => onLocationPublicChange?.(e.target.checked)}
              />
              Show on public profile
            </label>
            <label className="field">
              <span className="label">Bio</span>
              <textarea
                className="input"
                rows={4}
                value={bio || ""}
                onChange={(e) => onBioChange?.(e.target.value)}
                placeholder="Tell people a little about you"
              />
            </label>
            <label className="mt-1 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!show_mutuals}
                onChange={(e) => onShowMutualsChange?.(e.target.checked)}
              />
              Show mutual friends
            </label>
          </div>
        ) : (
          <div className="stack">
            {location_is_public && location_text ? (
              <div>
                <strong>Location:</strong> {location_text}
              </div>
            ) : null}
            {bio ? <div style={{ whiteSpace: "pre-wrap" }}>{bio}</div> : null}
            {!location_text && !bio ? (
              <div className="muted">Add a bio and location using Edit.</div>
            ) : null}
            {!location_is_public && location_text ? (
              <div className="muted text-sm">(Location is private)</div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
