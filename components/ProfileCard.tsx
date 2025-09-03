// components/ProfileCard.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
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

type Friendship = {
  id: string;
  friend_id: string;
  relationship_type: "friend" | "acquaintance" | "restricted";
  status: "pending" | "accepted" | "blocked";
  private_notes: string | null;
  how_we_met: string | null;
  friend_profile: {
    full_name: string | null;
    avatar_url: string | null;
  };
};

type FriendInvite = {
  token: string;
  expires_at: string;
  uses_remaining: number;
};

// Friend Tier Selector Component
function FriendTierSelector({
  friendship,
  onUpdate
}: {
  friendship: Friendship;
  onUpdate: () => void;
}) {
  const [updating, setUpdating] = useState(false);

  const updateTier = async (newTier: "friend" | "acquaintance" | "restricted") => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ relationship_type: newTier })
        .eq("id", friendship.id);
      
      if (error) throw error;
      onUpdate();
    } catch (err) {
      console.error("Failed to update friendship tier:", err);
    } finally {
      setUpdating(false);
    }
  };

  const tierColors = {
    friend: "bg-green-100 text-green-800 border-green-300",
    acquaintance: "bg-blue-100 text-blue-800 border-blue-300", 
    restricted: "bg-gray-100 text-gray-800 border-gray-300"
  };

  return (
    <div className="friend-tier-selector">
      <label className="block text-sm font-medium mb-2">Relationship Type:</label>
      <div className="flex gap-2 flex-wrap">
        {(['friend', 'acquaintance', 'restricted'] as const).map((tier) => (
          <button
            key={tier}
            onClick={() => updateTier(tier)}
            disabled={updating || friendship.relationship_type === tier}
            className={`
              px-3 py-1 text-sm border rounded-full transition-all
              ${friendship.relationship_type === tier 
                ? tierColors[tier] 
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }
              ${updating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

// Friend Notes Component
function FriendNotes({
  friendship,
  onUpdate
}: {
  friendship: Friendship;
  onUpdate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [howWeMet, setHowWeMet] = useState(friendship.how_we_met || "");
  const [notes, setNotes] = useState(friendship.private_notes || "");
  const [saving, setSaving] = useState(false);

  const saveNotes = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("friendships")
        .update({
          how_we_met: howWeMet.trim() || null,
          private_notes: notes.trim() || null
        })
        .eq("id", friendship.id);
      
      if (error) throw error;
      setEditing(false);
      onUpdate();
    } catch (err) {
      console.error("Failed to save notes:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="friend-notes">
      {!editing ? (
        <div className="notes-display">
          {friendship.how_we_met && (
            <div className="note-item">
              <strong>How we met:</strong> {friendship.how_we_met}
            </div>
          )}
          {friendship.private_notes && (
            <div className="note-item">
              <strong>Notes:</strong> {friendship.private_notes}
            </div>
          )}
          <button
            onClick={() => setEditing(true)}
            className="text-xs px-2 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            {(friendship.how_we_met || friendship.private_notes) ? "Edit Notes" : "Add Notes"}
          </button>
        </div>
      ) : (
        <div className="notes-editor">
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">How we met:</label>
            <input
              type="text"
              value={howWeMet}
              onChange={(e) => setHowWeMet(e.target.value)}
              placeholder="e.g., College roommates, Met at yoga class"
              className="w-full p-2 border rounded text-sm"
              maxLength={100}
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Private notes:</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Personal notes about this friend"
              className="w-full p-2 border rounded text-sm"
              rows={2}
              maxLength={300}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={saveNotes}
              disabled={saving}
              className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Notes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// QR/Link Invite Generator
function InviteGenerator({ userId }: { userId: string }) {
  const [invite, setInvite] = useState<FriendInvite | null>(null);
  const [generating, setGenerating] = useState(false);
  const [inviteExpanded, setInviteExpanded] = useState(false);

  const generateInvite = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase
        .rpc("generate_friend_invite", { uses: 10 });
      
      if (error) throw error;
      setInvite(data);
    } catch (err) {
      console.error("Failed to generate invite:", err);
    } finally {
      setGenerating(false);
    }
  };

  const copyInviteLink = () => {
    if (invite) {
      const link = `${window.location.origin}/i/${invite.token}`;
      navigator.clipboard.writeText(link);
      alert("Invite link copied to clipboard!");
    }
  };

  const generateQRCode = () => {
    if (invite) {
      const link = `${window.location.origin}/i/${invite.token}`;
      // Your existing QR code generation logic here
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`;
      window.open(qrUrl, '_blank');
    }
  };

  return (
    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
      <button
        onClick={() => setInviteExpanded(!inviteExpanded)}
        className="w-full flex justify-between items-center text-sm font-medium text-blue-700"
      >
        <span>Invite Friends</span>
        <span>{inviteExpanded ? "▼" : "▶"}</span>
      </button>
      
      {inviteExpanded && (
        <div className="mt-3">
          {!invite ? (
            <button
              onClick={generateInvite}
              disabled={generating}
              className="w-full p-2 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate Friend Invite"}
            </button>
          ) : (
            <div>
              <p className="text-xs text-blue-600 mb-3 text-center">
                Expires: {new Date(invite.expires_at).toLocaleDateString()}
                <br />
                Uses remaining: {invite.uses_remaining}
              </p>
              
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={copyInviteLink} 
                  className="p-2 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600"
                >
                  📋 Copy Link
                </button>
                <button 
                  onClick={generateQRCode} 
                  className="p-2 bg-purple-500 text-white rounded text-xs font-medium hover:bg-purple-600"
                >
                  📱 QR Code
                </button>
                <button 
                  onClick={() => setInvite(null)} 
                  className="p-2 bg-gray-400 text-white rounded text-xs font-medium hover:bg-gray-500"
                >
                  🔄 New
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  
  // Enhanced profile state
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [aboutExpanded, setAboutExpanded] = useState(true);
  const [friendsExpanded, setFriendsExpanded] = useState(false);
  const [offeringsExpanded, setOfferingsExpanded] = useState(false);
  
  // Enhanced profile fields
  const [offeringsEnabled, setOfferingsEnabled] = useState(false);
  const [offeringsDescription, setOfferingsDescription] = useState("");

  useEffect(() => {
    if (editable && userId) {
      loadFriendships();
      loadEnhancedProfile();
    }
  }, [userId, editable]);

  const loadFriendships = async () => {
    if (!userId) return;
    try {
      // Use correct column names: a and b (not user_id and friend_id)
      const { data, error } = await supabase
        .from("friendships")
        .select(`
          a,
          b,
          relationship_type,
          private_notes,
          how_we_met
        `)
        .or(`a.eq.${userId},b.eq.${userId}`)
        .order("relationship_type");
      
      if (error) throw error;
      
      // Get friend profiles - determine which ID is the friend
      const friendships: Friendship[] = [];
      for (const friendship of data || []) {
        const friendId = friendship.a === userId ? friendship.b : friendship.a;
        
        const { data: friendProfile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", friendId)
          .single();
        
        friendships.push({
          id: `${friendship.a}-${friendship.b}`, // Composite ID
          friend_id: friendId,
          relationship_type: friendship.relationship_type || "friend",
          status: "accepted", // Since no status column, assume all are accepted
          private_notes: friendship.private_notes,
          how_we_met: friendship.how_we_met,
          friend_profile: friendProfile || { full_name: null, avatar_url: null }
        });
      }
      
      setFriendships(friendships);
    } catch (err) {
      console.error("Failed to load friendships:", err);
    }
  };

  const loadEnhancedProfile = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("offerings_enabled, offerings_description")
        .eq("id", userId)
        .single();
      
      if (error) return; // Ignore if columns don't exist yet
      
      setOfferingsEnabled(data.offerings_enabled || false);
      setOfferingsDescription(data.offerings_description || "");
    } catch (err) {
      console.error("Failed to load enhanced profile:", err);
    }
  };

  const saveEnhancedProfile = async () => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          offerings_enabled: offeringsEnabled,
          offerings_description: offeringsDescription.trim() || null,
        })
        .eq("id", userId);
      
      if (error) throw error;
    } catch (err) {
      console.error("Failed to save enhanced profile:", err);
    }
  };

  const handleSave = async () => {
    await onSave?.();
    await saveEnhancedProfile();
  };

  return (
    <div className="card p-3" style={{ 
      borderColor: "rgba(196,181,253,.7)", 
      background: "linear-gradient(135deg, rgba(245,243,255,.6), rgba(248,250,252,.4))",
      backdropFilter: "blur(10px)"
    }}>
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
                      onClick={handleSave}
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

      {/* Invite Generator (Own Profile Only) */}
      {editable && userId && <InviteGenerator userId={userId} />}

      {/* About Section (Collapsible) */}
      <div className="mt-4">
        <button
          onClick={() => setAboutExpanded(!aboutExpanded)}
          className="w-full flex justify-between items-center p-2 bg-purple-100 rounded-lg text-purple-800 font-medium hover:bg-purple-200"
        >
          <span>About</span>
          <span>{aboutExpanded ? "▼" : "▶"}</span>
        </button>
        
        {aboutExpanded && (
          <div className="mt-3">
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
        )}
      </div>

      {/* Friends Section (Own Profile Only) */}
      {editable && friendships.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setFriendsExpanded(!friendsExpanded)}
            className="w-full flex justify-between items-center p-2 bg-blue-100 rounded-lg text-blue-800 font-medium hover:bg-blue-200"
          >
            <span>Friends ({friendships.length})</span>
            <span>{friendsExpanded ? "▼" : "▶"}</span>
          </button>
          
          {friendsExpanded && (
            <div className="mt-3 space-y-4">
              {friendships.map((friendship) => (
                <div key={friendship.id} className="p-3 bg-white rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3 mb-3">
                    {friendship.friend_profile.avatar_url ? (
                      <img 
                        src={friendship.friend_profile.avatar_url} 
                        alt="" 
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-semibold">
                        {(friendship.friend_profile.full_name || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-sm">
                        {friendship.friend_profile.full_name || "Unknown User"}
                      </div>
                      <div className="text-xs text-purple-600 capitalize">
                        {friendship.relationship_type}
                      </div>
                    </div>
                  </div>
                  
                  <FriendTierSelector 
                    friendship={friendship} 
                    onUpdate={loadFriendships}
                  />
                  
                  <div className="mt-3">
                    <FriendNotes 
                      friendship={friendship} 
                      onUpdate={loadFriendships}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Services/Offerings Section */}
      <div className="mt-4">
        <button
          onClick={() => setOfferingsExpanded(!offeringsExpanded)}
          className="w-full flex justify-between items-center p-2 bg-green-100 rounded-lg text-green-800 font-medium hover:bg-green-200"
        >
          <span>Services & Offerings</span>
          <span>{offeringsExpanded ? "▼" : "▶"}</span>
        </button>
        
        {offeringsExpanded && (
          <div className="mt-3">
            {editMode && editable ? (
              <div className="stack">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={offeringsEnabled}
                    onChange={(e) => setOfferingsEnabled(e.target.checked)}
                  />
                  I offer services (Reiki, coaching, etc.)
                </label>
                
                {offeringsEnabled && (
                  <label className="field">
                    <span className="label">Services Description</span>
                    <textarea
                      className="input"
                      rows={3}
                      value={offeringsDescription}
                      onChange={(e) => setOfferingsDescription(e.target.value)}
                      placeholder="Describe the services you offer..."
                      maxLength={500}
                    />
                  </label>
                )}
              </div>
            ) : (
              <div>
                {offeringsEnabled && offeringsDescription ? (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm mb-3">{offeringsDescription}</p>
                    <button className="px-4 py-2 bg-green-500 text-white rounded font-medium hover:bg-green-600">
                      Book Now
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    {editable ? "Enable services to showcase your offerings" : "No services listed"}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
