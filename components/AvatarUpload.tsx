// components/AvatarUpload.tsx
// DEPRECATED: This component is deprecated. Use AvatarUploader instead.
// This file now redirects to AvatarUploader for backwards compatibility.

"use client";

import AvatarUploader from "@/components/AvatarUploader";

/**
 * @deprecated Use AvatarUploader instead
 * This is a compatibility wrapper that redirects to the new AvatarUploader component
 */
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
  // Just pass everything through to the better component
  return (
    <AvatarUploader
      userId={userId}
      bucket={bucket}
      value={value}
      onChange={onChange}
      label={label}
      size={120} // Default size for legacy usage
    />
  );
}
