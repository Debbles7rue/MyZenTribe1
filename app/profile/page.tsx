// app/profile/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AvatarUploader from "@/components/AvatarUploader";
import PhotosFeed from "@/components/PhotosFeed";
import ProfileInviteQR from "@/components/ProfileInviteQR";
import { getEmergencySettings, saveEmergencySettings } from "@/lib/sos";

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location?: string | null;
  location_text?: string | null;
  location_is_public?: boolean | null;
  show_mutuals: boolean | null;
};

function useIsDesktop(minWidth = 1024) {
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(min-width:${minWidth}px)`);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [minWidth]);
  return isDesktop;
}

// Animated Counter Component
function AnimatedCounter({ value, label, icon }: { value: number; label: string; icon?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    if (value === 0) return;
    let start = 0;
    const duration = 1000;
    const increment = value / (duration / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);
    
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="group cursor-pointer transform transition-all duration-300 hover:scale-105">
      <div className="flex flex-col items-center space-y-1 p-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-300">
        {icon && <span className="text-xl">{icon}</span>}
        <div className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
          {displayValue.toLocaleString()}
        </div>
        <div className="text-sm text-violet-700 font-medium">{label}</div>
      </div>
    </div>
  );
}

// Enhanced Quick Action Card
function QuickActionCard({ 
  title, 
  description, 
  href, 
  buttonText, 
  icon, 
  status, 
  onClick,
  children 
}: {
  title: string;
  description: string;
  href?: string;
  buttonText: string;
  icon: string;
  status?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  const content = (
    <div className="group p-6 rounded-2xl bg-white/40 backdrop-blur-md border border-white/50 hover:bg-white/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-200/50 hover:-translate-y-1">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center text-white text-lg shadow-lg">
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        {status && (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            status === 'Enabled' 
              ? 'bg-green-100 text-green-700' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {status}
          </span>
        )}
      </div>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">{description}</p>
      
      {children ? (
        <div className="space-y-3">{children}</div>
      ) : href ? (
        <Link 
          href={href}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-lg hover:from-violet-600 hover:to-purple-600 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
        >
          {buttonText}
          <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      ) : (
        <button 
          onClick={onClick}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-lg hover:from-violet-600 hover:to-purple-600 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
        >
          {buttonText}
        </button>
      )}
    </div>
  );

  return content;
}

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editPersonal, setEditPersonal] = useState(false);
  const [friendsCount, setFriendsCount] = useState<number>(0);
  const [inviteExpanded, setInviteExpanded] = useState(false);
  const isDesktop = useIsDesktop(1024);

  const [p, setP] = useState<Profile>({
    id: "",
    full_name: "",
    avatar_url: "",
    bio: "",
    location: "",
    location_text: "",
    location_is_public: false,
    show_mutuals: true,
  });

  // Safety/SOS UI state
  const [editSafety, setEditSafety] = useState(false);
  const [sosEnabled, setSosEnabled] = useState(false);
  const [ecName, setEcName] = useState("");
  const [ecMethod, setEcMethod] = useState<"sms" | "email" | "">("");
  const [ecValue, setEcValue] = useState("");
  const [savingSafety, setSavingSafety] = useState(false);
  const [saveSafetyMsg, setSaveSafetyMsg] = useState<string | null>(null);

  useEffect(() => { 
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)); 
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
        if (error) throw error;
        if (data) {
          setP({
            id: data.id,
            full_name: data.full_name ?? "",
            avatar_url: data.avatar_url ?? "",
            bio: data.bio ?? "",
            location: data.location ?? "",
            location_text: (data.location_text ?? data.location) ?? "",
            location_is_public: data.location_is_public ?? false,
            show_mutuals: data.show_mutuals ?? true,
          });
        } else setP(prev => ({ ...prev, id: userId }));
      } catch { setTableMissing(true); }
      finally { setLoading(false); }
    };
    load();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { count } = await supabase.from("friendships").select("a", { count: "exact", head: true }).or(`a.eq.${userId},b.eq.${userId}`);
      if (typeof count === "number") setFriendsCount(count);
    })();
  }, [userId]);

  // Load emergency settings
  useEffect(() => {
    (async () => {
      const s = await getEmergencySettings();
      setSosEnabled(!!s.sos_enabled);
      setEcName(s.emergency_contact_name ?? "");
      setEcMethod((s.emergency_contact_method as "sms" | "email" | null) ?? "");
      setEcValue(s.emergency_contact_value ?? "");
    })();
  }, []);

  const displayName = useMemo(() => p.full_name || "Member", [p.full_name]);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        full_name: p.full_name?.trim() || null,
        bio: p.bio?.trim() || null,
        location_text: p.location_text?.trim() || null,
        location_is_public: !!p.location_is_public,
        avatar_url: p.avatar_url?.trim() || null,
        show_mutuals: !!p.show_mutuals,
      }).eq("id", userId);
      if (error) throw error;
      
      // Success feedback with smooth transition
      const successMsg = document.createElement('div');
      successMsg.textContent = '✨ Profile saved successfully!';
      successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-bounce';
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);
      
      setEditPersonal(false);
    } catch (e: any) { 
      alert(e.message || "Save failed"); 
    } finally { 
      setSaving(false); 
    }
  };

  async function onAvatarChange(url: string) {
    setP(prev => ({ ...prev, avatar_url: url }));
    if (!userId) return;
    const { error } = await supabase.from("profiles").update({ avatar_url: url || null }).eq("id", userId);
    if (error) alert("Could not save photo: " + error.message);
  }

  async function saveSafety() {
    setSavingSafety(true);
    setSaveSafetyMsg(null);
    try {
      const { ok, error } = await saveEmergencySettings({
        sos_enabled: sosEnabled,
        emergency_contact_name: ecName?.trim() || null,
        emergency_contact_method: (ecMethod || null) as any,
        emergency_contact_value: ecValue?.trim() || null,
      });
      if (!ok) throw new Error(error || "Failed to save");
      setSaveSafetyMsg("✅ Safety settings saved!");
      setEditSafety(false);
    } catch (e: any) {
      setSaveSafetyMsg(e?.message || "Could not save settings. If columns are missing, run the migration.");
    } finally {
      setSavingSafety(false);
      setTimeout(() => setSaveSafetyMsg(null), 3000);
    }
  }

  const QuickActions = (
    <div className="space-y-4">
      <QuickActionCard
        title="Friends"
        description="Browse, search, and add private notes about your connections."
        href="/friends"
        buttonText="Explore Friends"
        icon="👥"
      />

      <QuickActionCard
        title="Safety & SOS"
        description="Configure your emergency contact and use the SOS button when needed."
        buttonText={editSafety ? "Cancel" : "Configure"}
        icon="🛡️"
        status={sosEnabled ? "Enabled" : "Disabled"}
        onClick={() => setEditSafety(!editSafety)}
      >
        {editSafety && (
          <>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact name</label>
                <input 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200"
                  value={ecName} 
                  onChange={(e) => setEcName(e.target.value)} 
                  placeholder="e.g., Mom / Alex / Partner" 
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200"
                    value={ecMethod} 
                    onChange={(e) => setEcMethod(e.target.value as any)}
                  >
                    <option value="">Select…</option>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {ecMethod === "sms" ? "Phone (E.164)" : "Email"}
                  </label>
                  <input 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200"
                    value={ecValue} 
                    onChange={(e) => setEcValue(e.target.value)} 
                    placeholder={ecMethod === "sms" ? "+15551234567" : "name@example.com"} 
                  />
                </div>
              </div>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="form-checkbox h-4 w-4 text-violet-600 transition duration-150 ease-in-out"
                  checked={sosEnabled} 
                  onChange={(e) => setSosEnabled(e.target.checked)} 
                />
                <span className="text-sm text-gray-700">Enable SOS quick button</span>
              </label>

              <div className="flex justify-end space-x-2 pt-2">
                <Link 
                  href="/safety"
                  className="px-4 py-2 text-violet-600 hover:text-violet-700 font-medium transition-colors duration-200"
                >
                  Open Safety Page
                </Link>
                <button 
                  className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-lg hover:from-violet-600 hover:to-purple-600 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={saveSafety} 
                  disabled={savingSafety}
                >
                  {savingSafety ? "Saving…" : "Save Settings"}
                </button>
              </div>
              {saveSafetyMsg && (
                <div className={`text-sm p-2 rounded ${
                  saveSafetyMsg.includes('✅') ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
                }`}>
                  {saveSafetyMsg}
                </div>
              )}
            </div>
          </>
        )}
      </QuickActionCard>

      <QuickActionCard
        title="Gratitude Journal"
        description="Capture daily moments of gratitude and positive reflections."
        href="/gratitude"
        buttonText="Open Journal"
        icon="🙏"
      />

      <QuickActionCard
        title="Messages"
        description="Private conversations and connections with your friends."
        href="/messages"
        buttonText="View Messages"
        icon="💬"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-violet-400 to-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-pink-400 to-violet-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative z-10">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-4 sm:mb-0">
              Your Profile
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <Link 
                href="/business" 
                className="px-4 py-2 bg-white/60 backdrop-blur-sm border border-white/80 text-gray-700 rounded-lg hover:bg-white/80 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
              >
                Business Profile
              </Link>
              <Link 
                href="/friends" 
                className="px-4 py-2 bg-white/60 backdrop-blur-sm border border-white/80 text-gray-700 rounded-lg hover:bg-white/80 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
              >
                Friends
              </Link>
              <Link 
                href="/messages" 
                className="px-4 py-2 bg-white/60 backdrop-blur-sm border border-white/80 text-gray-700 rounded-lg hover:bg-white/80 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
              >
                Messages
              </Link>
              <button 
                className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-lg hover:from-violet-600 hover:to-purple-600 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                onClick={() => setEditPersonal(!editPersonal)}
              >
                {editPersonal ? "✓ Done" : "✏️ Edit"}
              </button>
            </div>
          </div>

          {/* Error State */}
          {tableMissing && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-800 font-medium">Tables not found</div>
              <div className="text-red-600 text-sm">Run the SQL migration, then reload.</div>
            </div>
          )}

          {/* Main Profile Card */}
          <div className="mb-8 p-8 rounded-3xl bg-white/50 backdrop-blur-lg border border-white/60 shadow-xl">
            <div className={`flex ${isDesktop ? 'flex-row' : 'flex-col'} ${isDesktop ? 'items-start' : 'items-center'} gap-8`}>
              {/* Avatar Section */}
              <div className="flex-shrink-0 relative group">
                <div className="w-40 h-40 rounded-full bg-gradient-to-r from-violet-400 to-purple-400 p-1 shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <AvatarUploader 
                    userId={userId} 
                    value={p.avatar_url} 
                    onChange={onAvatarChange} 
                    label="Profile photo" 
                    size={160} 
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm shadow-lg">
                  ✨
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-grow min-w-0 text-center sm:text-left">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">{displayName}</h2>
                
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6 max-w-md">
                  <AnimatedCounter value={0} label="Followers" icon="👤" />
                  <AnimatedCounter value={0} label="Following" icon="➕" />
                  <AnimatedCounter value={friendsCount} label="Friends" icon="🤝" />
                </div>

                {/* Invite Friends */}
                <div className="max-w-lg">
                  <button
                    onClick={() => setInviteExpanded(!inviteExpanded)}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all duration-200 shadow-lg hover:shadow-xl font-medium transform hover:scale-105"
                  >
                    🎉 Invite Friends
                    <svg 
                      className={`w-4 h-4 ml-2 transition-transform duration-200 ${inviteExpanded ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {inviteExpanded && (
                    <div className="mt-4 p-4 bg-white/60 rounded-xl border border-white/80 animate-fade-in">
                      <ProfileInviteQR userId={userId} embed qrSize={180} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className={`grid gap-8 ${isDesktop ? 'grid-cols-3' : 'grid-cols-1'}`}>
            {/* Main Content */}
            <div className="col-span-2 space-y-6">
              {/* Mobile Quick Actions */}
              {!isDesktop && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h3>
                  {QuickActions}
                </div>
              )}

              {/* About Section */}
              {editPersonal ? (
                <div className="p-6 rounded-2xl bg-white/50 backdrop-blur-md border border-white/60 shadow-lg">
                  <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                    <span className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-500 rounded-lg flex items-center justify-center text-white mr-3">
                      ✏️
                    </span>
                    Edit Your Information
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input 
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200 bg-white/80"
                        value={p.full_name ?? ""} 
                        onChange={(e) => setP({ ...p, full_name: e.target.value })} 
                        placeholder="Your full name"
                      />
                    </div>

                    <div className={`grid gap-4 ${isDesktop ? 'grid-cols-4' : 'grid-cols-1'}`}>
                      <div className="col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <input 
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200 bg-white/80"
                          value={p.location_text ?? ""} 
                          onChange={(e) => setP({ ...p, location_text: e.target.value })} 
                          placeholder="City, State" 
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center space-x-2 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors duration-200">
                          <input 
                            type="checkbox" 
                            className="form-checkbox h-4 w-4 text-violet-600"
                            checked={!!p.location_is_public} 
                            onChange={(e) => setP({ ...p, location_is_public: e.target.checked })} 
                          />
                          <span className="text-sm text-gray-700">Public</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                      <textarea 
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200 bg-white/80 resize-none"
                        rows={4} 
                        value={p.bio ?? ""} 
                        onChange={(e) => setP({ ...p, bio: e.target.value })} 
                        placeholder="Tell people about yourself..."
                      />
                    </div>

                    <label className="flex items-center space-x-2 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors duration-200">
                      <input 
                        type="checkbox" 
                        className="form-checkbox h-4 w-4 text-violet-600"
                        checked={!!p.show_mutuals} 
                        onChange={(e) => setP({ ...p, show_mutuals: e.target.checked })} 
                      />
                      <span className="text-sm text-gray-700">Show mutual friends</span>
                    </label>

                    <div className="flex justify-end pt-4">
                      <button 
                        className="px-8 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl hover:from-violet-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium transform hover:scale-105"
                        onClick={save} 
                        disabled={saving}
                      >
                        {saving ? "💾 Saving..." : "✨ Save Changes"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-white/50 backdrop-blur-md border border-white/60 shadow-lg">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-500 rounded-lg flex items-center justify-center text-white mr-3">
                      👤
                    </span>
                    About
                  </h3>
                  
                  <div className="space-y-3">
                    {p.location_is_public && p.location_text && (
                      <div className="flex items-center space-x-2 text-gray-700">
                        <span className="text-violet-500">📍</span>
                        <span><strong>Location:</strong> {p.location_text}</span>
                      </div>
                    )}
                    
                    {p.bio ? (
                      <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">{p.bio}</div>
                    ) : (
                      <div className="text-gray-500 italic">Add a bio and location using the Edit button above.</div>
                    )}
                    
                    {!p.location_is_public && p.location_text && (
                      <div className="text-gray-400 text-sm flex items-center space-x-1">
                        <span>🔒</span>
                        <span>Location is private</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Photos Feed */}
              <PhotosFeed userId={userId} />
            </div>

            {/* Desktop Sidebar */}
            {isDesktop && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-800">Quick Actions</h3>
                {QuickActions}
              </div>
            )}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
              <span className="ml-3 text-gray-600">Loading your amazing profile...</span>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .form-checkbox:checked {
          background-color: #8b5cf6;
          border-color: #8b5cf6;
        }
        
        .form-checkbox {
          border-radius: 4px;
          border: 2px solid #d1d5db;
          transition: all 0.2s ease-in-out;
        }
        
        .form-checkbox:focus {
          ring: 2px;
          ring-color: rgba(139, 92, 246, 0.3);
          ring-offset: 2px;
        }
      `}</style>
    </div>
  );
}
