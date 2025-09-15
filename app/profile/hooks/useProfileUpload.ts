"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/**
 * Minimal upload hook to satisfy imports from profile components.
 * Provides a single `uploadImage` helper that stores a file in a given bucket
 * and returns its public URL plus the saved storage path.
 */
export type UploadResult = { publicUrl: string; path: string } | null;

export default function useProfileUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Upload a file to a Supabase Storage bucket with a user-scoped filename.
   * @param bucket Storage bucket name (e.g., "avatars" or "profile-images")
   * @param userId The current user's ID (used to create a unique filename)
   * @param file File to upload
   * @returns `{ publicUrl, path }` on success, or `null` on failure
   */
  const uploadImage = async (
    bucket: string,
    userId: string,
    file: File
  ): Promise<UploadResult> => {
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const filename = `${userId}-${Date.now()}.${ext}`;
      const path = filename;

      const { error: uploadError } = await supabase
        .storage
        .from(bucket)
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = data?.publicUrl ?? null;
      if (!publicUrl) {
        throw new Error("Public URL not available after upload.");
      }

      return { publicUrl, path };
    } catch (e: any) {
      console.error("uploadImage error:", e);
      setError(e?.message || "Failed to upload image");
      return null;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploading,
    error,
    uploadImage,
  };
}
