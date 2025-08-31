// components/AvatarUploader.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  const [broken, setBroken] = useState(false); // if <img> fails to render (e.g., HEIC on some browsers)

  // Keep preview in sync if the parent value changes outside
  useEffect(() => {
    setPreview(null);
    setBroken(false);
  }, [value]);

  const src = useMemo(() => {
    if (preview) return preview;
    if (value && !broken) return value;
    return "/default-avatar.png";
  }, [preview, value, broken]);

  function pickFile() {
    inputRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setErr(null);

    // Show an immediate local preview (works even before upload finishes)
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setBroken(false);
    setBusy(true);

    try {
      // Resize to max 1024px on the long edge, encode JPEG if possible
      const processed = await tryResizeToJpeg(file, 1024);
      const blob = processed?.blob ?? file;
      const ext = processed?.ext ?? guessExt(file.type) ?? "bin";
      const contentType = processed?.type ?? (file.type || "application/octet-stream");

      // If the original is HEIC/HEIF and we couldn't convert, warn (we’ll still upload)
      if (!processed && /heic|heif/i.test(file.type)) {
        // Most browsers can’t render HEIC; upload will succeed but preview may not.
        // We'll keep our local preview and later fall back to default if the URL can't render.
        console.warn("HEIC image detected. Uploaded original; some browsers cannot display HEIC.");
      }

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

      // Persist immediately to profiles
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);
      if (dbErr) throw dbErr;

      // Swap preview to the final public URL
      setPreview(publicUrl);
      onChange?.(publicUrl);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Upload failed");
      // Keep the local preview so the user still sees something
    } finally {
      // Clear the file input and free the local object URL after a moment
      if (inputRef.current) inputRef.current.value = "";
      setTimeout(() => {
        try { URL.revokeObjectURL(localUrl); } catch {}
      }, 1500);
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
          onError={() => setBroken(true)}
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
          <div className="flex gap-2">
            <button className="btn btn-brand" onClick={pickFile} disabled={!userId || busy}>
              {busy ? "Uploading…" : "Change photo"}
            </button>
            {/* Optional: quick remove sets avatar to null */}
            <button
              className="btn"
              disabled={!userId || busy}
              onClick={async () => {
                setBusy(true);
                setErr(null);
                try {
                  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
                  if (error) throw error;
                  setPreview(null);
                  setBroken(false);
                  onChange?.("");
                } catch (e: any) {
                  setErr(e?.message || "Could not remove photo");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Remove
            </button>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"   // Important: no `capture` so mobile can pick Camera OR Photo Library
            hidden
            onChange={handleFile}
          />

          <div className="text-xs" style={{ color: "#6b7280" }}>
            JPG/PNG/WebP recommended. Large photos auto-resize. HEIC uploads are supported, but some browsers can’t display them—try JPG if your photo doesn’t appear.
          </div>
          {err && <div className="text-xs" style={{ color: "#b91c1c" }}>{err}</div>}
        </div>
      </div>

      <style jsx>{`
        .btn-brand {
          background: #8b5cf6; /* lavender */
          color: #fff;
          border: 1px solid rgba(0,0,0,.06);
        }
        .btn-brand:hover { filter: brightness(.95); }
      `}</style>
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
    // revoke after decode to avoid timing issues
    setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 1500);
  }
}

// Avoid TS narrowing to never; prefer event listeners/Promise wrapper
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
