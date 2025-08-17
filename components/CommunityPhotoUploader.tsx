"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  value?: string | null;
  onChange: (url: string) => void;
  label?: string;
  disabled?: boolean;
  communityId?: string | null; // optional; falls back to user id path
  userId?: string | null;
};

export default function CommunityPhotoUploader({
  value,
  onChange,
  label = "Cover photo",
  disabled,
  communityId,
  userId,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const display = value || "";

  const path = `${userId}/${Date.now()}-${file.name}`;
  await supabase.storage.from("community-photos").upload(path, file, { upsert: true });

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const keyBase = communityId || userId || "anon";
      const fileName = `${keyBase}/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
      const { error } = await supabase.storage
        .from("community-photos")
        .upload(fileName, file, { upsert: true, cacheControl: "3600" });
      if (error) throw error;

      const { data } = supabase.storage.from("community-photos").getPublicUrl(fileName);
      if (data?.publicUrl) onChange(data.publicUrl);
    } catch (err: any) {
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="field">
      <div className="label">{label}</div>
      {display ? (
        <div style={{ marginBottom: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={display}
            alt="Community cover"
            style={{ width: "100%", maxWidth: 420, borderRadius: 12, display: "block" }}
          />
        </div>
      ) : (
        <div className="muted" style={{ marginBottom: 8 }}>No image selected.</div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onPick}
        disabled={disabled || uploading}
      />
      <div className="muted" style={{ marginTop: 6 }}>
        JPG/PNG recommended. We’ll host this in “community-photos”.
      </div>
    </div>
  );
}
