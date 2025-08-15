"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  userId: string | null;
  value?: string | null;          // existing public URL (if any)
  onChange?: (url: string) => void;
  bucket?: string;                // e.g. "event-photos" | "avatars"
  label?: string;
};

export default function AvatarUpload({
  userId,
  value,
  onChange,
  bucket = "event-photos",
  label = "Upload photo",
}: Props) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handlePick = () => fileRef.current?.click();

  const upload = async (file: File) => {
    if (!userId) return alert("Please sign in.");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      const url = data.publicUrl;
      onChange?.(url);
    } catch (e: any) {
      alert(e.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <img
          src={value || "/avatar-placeholder.png"}
          alt="Avatar"
          width={72}
          height={72}
          style={{ borderRadius: 12, objectFit: "cover", border: "1px solid #e5e7eb" }}
        />
        <button className="btn" onClick={handlePick} disabled={uploading}>
          {uploading ? "Uploading…" : label}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}
