"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AvatarUpload({
  userId,
  bucket = "avatars",
  value,
  onChange,
  label = "Upload",
}: {
  userId: string | null;
  bucket?: string;
  value: string;
  onChange: (publicUrl: string) => void;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!userId) return alert("Please sign in.");

    try {
      setUploading(true);
      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file);
      if (error) throw error;

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (err: any) {
      alert(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} />
        <button className="btn" type="button" disabled>{uploading ? "Uploading…" : label}</button>
      </div>
      {value && (
        <div className="mt-2">
          <img src={value} alt="" style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid #eee" }} />
        </div>
      )}
    </div>
  );
}
