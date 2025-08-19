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
      // Resize to max 1024px on the long edge, encode JPEG
      const processed = await tryResizeToJpeg(file, 1024);
      const blob = processed?.blob ?? file;
      const ext = processed?.ext ?? guessExt(file.type) ?? "bin";
      const contentType = processed?.type ?? (file.type || "application/octet-stream");

      const path = `${userId}/avatar_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, blob, {
          cacheControl: "3600",
          upsert: true,
          contentType,
        });
      if (upErr) throw upErr;

      // Public URL
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      // Persist immediately
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);
      if (dbErr) throw dbErr;

      // Update UI
      setPreview(publicUrl);
      onChange?.(publicUrl);
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
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
            // Important: no `capture` so mobile can pick Camera OR Photo Library
            hidden
            onChange={handleFile}
          />
          <div className="muted text-xs">
            JPG/PNG/WebP supported. Large photos are auto-resized.
          </div>
          {err && <div className="text-xs" style={{ color: "#b91c1c" }}>{err}</div>}
        </div>
      </div>
    </div>
  );
}

/**
 * Resize to maxDim and encode JPEG. Returns { blob, type, ext } or null if we can’t decode (e.g., some HEIC).
 */
async function tryResizeToJpeg(file: File, maxDim: number): Promise<{ blob: Blob; type: string; ext: string } | null> {
  try {
    const img = await fileToImage(file);
    const { canvas, mime } = drawToCanvas(img, maxDim);
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Encode failed"))), mime, 0.85)
    );
    return { blob, type: mime, ext: "jpg" };
  } catch {
    // Fallback: upload the original (may be HEIC; upload still works even if we can’t preview)
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

async function fileToImage(file: File): Promise<HTMLImageElement> {
  // Try createImageBitmap (fast path). If it fails (e.g., unsupported HEIC), fallback to <img>.
  if ("createImageBitmap" in window) {
    try {
      const bmp = await createImageBitmap(file as any);
      const canvas = document.createElement("canvas");
      canvas.width = (bmp as any).width;
      canvas.height = (bmp as any).height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bmp as any, 0, 0);
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
    // Let browser revoke when safe; revoking too early can break decode on some devices.
    // URL.revokeObjectURL(url);
  }
}

// ✅ Avoid TS narrowing to `never` by not using `"decode" in img` and prefer event listeners.
function imgDecode(img: HTMLImageElement): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const anyImg = img as any;
    if (typeof anyImg.decode === "function") {
      anyImg.decode().then(() => resolve()).catch(() => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => reject(new Error("Image load failed")), { once: true });
      });
    } else {
      img.addEventListener("load", () => resolve(), { once: true });
      img.addEventListener("error", () => reject(new Error("Image load failed")), { once: true });
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
