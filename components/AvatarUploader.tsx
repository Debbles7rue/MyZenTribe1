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
  const [showInstructions, setShowInstructions] = useState(false);

  const src = useMemo(() => preview || value || "/default-avatar.png", [preview, value]);

  function pickFile() {
    setShowInstructions(true); // Show instructions when user initiates upload
    inputRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) {
      setShowInstructions(false); // Hide if cancelled
      return;
    }
    
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
      
      // Hide instructions after successful upload
      setShowInstructions(false);
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
      // Keep instructions visible if there's an error
    } finally {
      if (inputRef.current) inputRef.current.value = "";
      setBusy(false);
    }
  }

  return (
    <div className="avatar-uploader">
      {label && <div className="label">{label}</div>}

      <div className="avatar-container">
        {/* Avatar Image */}
        <img
          src={src}
          alt="Avatar"
          width={size}
          height={size}
          className="avatar-image"
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            objectFit: "cover",
            border: "2px solid rgba(139,92,246,0.2)",
            background: "#fafafa",
            transition: "all 0.2s ease",
            cursor: userId ? "pointer" : "default",
          }}
          onClick={userId ? pickFile : undefined}
          onMouseEnter={() => setShowInstructions(true)}
          onMouseLeave={() => !busy && !err && setShowInstructions(false)}
        />
        
        {/* Upload Button */}
        <div className="upload-controls">
          <button 
            className="upload-button" 
            onClick={pickFile} 
            disabled={!userId || busy}
            style={{
              padding: "0.5rem 1rem",
              background: busy ? "#9ca3af" : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: "500",
              cursor: busy || !userId ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              boxShadow: "0 2px 4px rgba(139,92,246,0.2)",
            }}
          >
            {busy ? "Uploading…" : "Change photo"}
          </button>
          
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFile}
          />
        </div>
      </div>

      {/* Instructions - Only when needed */}
      {(showInstructions || busy) && (
        <div className="upload-instructions" style={{
          marginTop: "0.5rem",
          padding: "0.5rem 0.75rem",
          background: "rgba(139,92,246,0.1)",
          border: "1px solid rgba(139,92,246,0.2)",
          borderRadius: "0.5rem",
          fontSize: "0.75rem",
          color: "#6b7280",
          animation: "fadeIn 0.2s ease-in-out",
        }}>
          📸 JPG/PNG/WebP supported. Large photos are auto-resized.
        </div>
      )}
      
      {/* Error Message */}
      {err && (
        <div className="error-message" style={{
          marginTop: "0.5rem",
          padding: "0.5rem 0.75rem",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "0.5rem",
          fontSize: "0.75rem",
          color: "#dc2626",
          animation: "fadeIn 0.2s ease-in-out",
        }}>
          ❌ {err}
        </div>
      )}

      <style jsx>{`
        .avatar-uploader {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .avatar-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .avatar-image:hover {
          border-color: rgba(139,92,246,0.4);
          box-shadow: 0 4px 8px rgba(139,92,246,0.15);
          transform: scale(1.02);
        }

        .upload-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #7c3aed, #6d28d9) !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(139,92,246,0.3) !important;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.25rem;
        }
      `}</style>
    </div>
  );
}

/**
 * Resize to maxDim and encode JPEG. Returns { blob, type, ext } or null if we can't decode (e.g., some HEIC).
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
    // Fallback: upload the original (may be HEIC; upload still works even if we can't preview)
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
      (bmp as any).close();
      return canvas as any; // Return canvas disguised as an image for the drawing function
    } catch {
      // Fall back to URL approach
    }
  }

  // Fallback: create <img> and wait for load
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not load image: ${file.name}`));
    };
    img.src = url;
  });
}

function drawToCanvas(img: HTMLImageElement | HTMLCanvasElement, maxDim: number) {
  const iw = img.width || (img as any).naturalWidth;
  const ih = img.height || (img as any).naturalHeight;
  const scale = Math.min(maxDim / iw, maxDim / ih, 1); // Don't upscale
  const newW = Math.round(iw * scale);
  const newH = Math.round(ih * scale);

  const canvas = document.createElement("canvas");
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img as any, 0, 0, newW, newH);

  return { canvas, mime: "image/jpeg" };
}
