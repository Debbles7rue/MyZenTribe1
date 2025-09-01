// app/demo/profile-editor/page.tsx
"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";
import EnvBadge from "@/components/EnvBadge";

export default function ProfileEditorPage() {
  const [displayName, setDisplayName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);

      // load profile if exists
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", data.user?.id)
        .maybeSingle();

      if (prof) {
        setDisplayName(prof.display_name ?? "");
        setAvatarUrl(prof.avatar_url ?? "");
      }
      setLoading(false);
    })();
  }, []);

  async function uploadAvatar() {
    if (!avatarFile || !userId) return "";
    const ext = (avatarFile.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, avatarFile, {
      upsert: false,
      cacheControl: "3600",
      contentType: avatarFile.type || undefined,
    });
    if (error) throw error;
    // avatars bucket is public → we can use public URL
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  }

  async function save() {
    try {
      setSaving(true);
      let url = avatarUrl;
      if (avatarFile) url = await uploadAvatar();
      const { error } = await supabase.rpc("upsert_my_profile", {
        p_display_name: displayName,
        p_avatar_url: url,
      });
      if (error) throw error;
      alert("Saved!");
      setAvatarFile(null);
      setAvatarUrl(url);
    } catch (e: any) {
      alert("Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5] text-neutral-800">
      <div className="max-w-md mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">Edit Profile</h1>
        <p className="text-sm mb-4">Mobile-friendly editor for name + avatar.</p>

        <label className="block text-sm mb-1">Display name</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full border rounded-lg p-2 mb-4 bg-white"
          placeholder="Your name"
        />

        <label className="block text-sm mb-1">Avatar image</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
          className="mb-2"
        />
        {avatarUrl && (
          <img src={avatarUrl} alt="avatar" className="w-24 h-24 rounded-full object-cover border mb-4" />
        )}

        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-xl bg-purple-500 hover:bg-purple-600 text-white py-2"
        >
          {saving ? "Saving…" : "Save Profile"}
        </button>

        <div className="text-xs text-gray-500 mt-4">
          User ID: <code className="font-mono">{userId}</code>
        </div>
      </div>
      <EnvBadge />
    </div>
  );
}
