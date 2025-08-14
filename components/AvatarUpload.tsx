"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AvatarUpload({
  userId, value, onChange, bucket = "avatars", label = "Upload photo"
}: {
  userId: string | null;
  value: string | null | undefined;
  onChange: (url: string) => void;
  bucket?: string;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    try {
      const filename = `${Date.now()}-${file.name}`;
      const path = `${userId}/${filename}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: false, cacheControl: "3600",
      });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (err: any) {
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.currentTarget.value = "";
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, alignItems: "center" }}>
      <img src={value || "/avatar-placeholder.png"} alt="Avatar"
        style={{ width: 80, height: 80, borderRadius: 16, objectFit: "cover", border: "1px solid #e5e7eb" }} />
      <label className="btn btn-neutral" style={{ width: "fit-content" }}>
        <input type="file" accept="image/*" style={{ display: "none" }} onChange={onFile} />
        {uploading ? "Uploading…" : label}
      </label>
    </div>
  );
}
