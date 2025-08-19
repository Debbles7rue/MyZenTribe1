// components/AvatarUploader.tsx
"use client";

import React, { useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  userId: string | null;
  value?: string | null;           // current avatar URL (public)
  onChange?: (url: string) => void;
  label?: string;
  size?: number;                   // display size in px
  bucket?: string;                 // default 'avatars'
};

export default function AvatarUploader({
  userId,
  value,
  onChange,
  label = "Avatar",
  size = 160,
  bucket = "avatars",
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const src = useMemo(() => preview || value || "/default-avatar.png", [preview, value]);

  function pickFile() {
    inputRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setErr(null);
    setBusy(true);

    try {
      // Prefer a friendly, small JPEG (<=1024px). If decoding fails (e.g., HEIC),
      // fall back to original file.
      const processed = await tryResizeToJpeg(file, 1024);
      const blob = processed?.blob ?? file;
      const contentType = processed?.type ?? (file.type || "application/octet-stream");

      // Use a stable path so we can upsert & cache-bust the preview.
      const path = `${userId}/avatar.jpg`;

      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, blob, {
          cacheControl: "3600",
          upsert: true,
          contentType,
        });
      if (upErr) throw upErr;

      // Public URL (store the clean URL in DB)
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      // Save to profiles.avatar_url immediately so it persists
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);
      if (dbErr) throw dbErr;

      // Update UI; add ?t= to bust CDN/browser cache so the new photo shows instantly
      const busted = `${publicUrl}?t=${Date.now()}`;
      setPreview(busted);
      onChange?.(busted);
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    } finally {
      if (inputRef.current) inputRef.current.value = ""; // allow same-file reselect
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      {label && <div className="label">{label}</div>}

      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Avatar"
          width={size}
          height={size}
          style={{
            width: size,
            height: size,
            borderRadius: 9999,
            objectFit: "cover",
            border: "1px solid #e5e7eb",
            background: "#fafafa",
          }}
        />
        <div className="flex flex-col gap-2">
          <button className="btn" onClick={pickFile} disabled={!userId || busy}>
            {busy ? "Uploading…" : "Change photo"}
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            // IMPORTANT: no `capture` attribute → allows Photo Library on iOS/Android
            multiple={false}
            hidden
            onChange={handleFile}
          />

          <div className="muted text-xs">
            JPG/PNG/WebP recommended. Large photos are auto-resized.
          </div>
          {err && <div className="text-xs" style={{ color: "#b91c1c" }}>{err}</div>}
        </div>
      </div>
    </div>
  );
}

/**
 * Attempts to decode and resize an image to JPEG.
 * Returns { blob, type, ext } on success, or null if decoding fails (e.g. HEIC on some browsers).
 */
async function tryResizeToJpeg(file: File, maxDim: number): Promise<{ blob: Blob; type: string; ext: string } | null> {
  const canUseBitmap = "createImageBitmap" in window;

  try {
    const img = await fileToImage(file, canUseBitmap);
    const { canvas, mime } = drawToCanvas(img, maxDim);
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Encode failed"))), mime, 0.85)
    );
    return { blob, type: mime, ext: "jpg" };
  } catch {
    // Fallback: upload original file as-is (may be HEIC; upload succeeds even if browser can't preview)
    return null;
  }
}

function guessExt(mime?: string | null): string | null {
  if (!mime) return null;
  if (mime.includes("jpeg")) return "jpg";
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("heic") || mime.includes("heif")) return "heic";
  if (mime.includes("gif")) return "gif";
  return null;
}

async function fileToImage(file: File, preferBitmap: boolean): Promise<HTMLImageElement> {
  if (preferBitmap) {
    try {
      const bmp = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bmp, 0, 0);
      const img = new Image();
      img.src = canvas.toDataURL("image/jpeg", 0.95);
      await imgDecode(img);
      return img;
    } catch {
      // fall through
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    await imgDecode(img);
    return img;
  } finally {
    // Avoid early revoke on iOS which can cancel decode
    // URL.revokeObjectURL(url);
  }
}

function imgDecode(img: HTMLImageElement) {
  return new Promise<void>((resolve, reject) => {
    if ("decode" in img) {
      (img as any).decode().then(() => resolve()).catch(reject);
    } else {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image load failed"));
    }
  });
}

function drawToCanvas(img: HTMLImageElement, maxDim: number): { canvas: HTMLCanvasElement; mime: string } {
  const { width, height } = img;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  return { canvas, mime: "image/jpeg" };
}
