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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const src = useMemo(() => preview || value || "/default-avatar.png", [preview, value]);

  function pickFile() {
    setShowInstructions(true);
    setErr(null); // Clear any previous errors
    setSuccessMessage(null); // Clear any previous success message
    inputRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) {
      setShowInstructions(false);
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErr("File too large. Please choose an image under 10MB.");
      setShowInstructions(false);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErr("Please select an image file (JPG, PNG, WebP, etc.)");
      setShowInstructions(false);
      return;
    }
    
    setBusy(true);
    setUploadProgress(0);
    setErr(null);
    setSuccessMessage(null);

    try {
      // Show progress during processing
      setUploadProgress(20);
      
      // Resize to max 1024px on the long edge, encode JPEG
      const processed = await tryResizeToJpeg(file, 1024);
      const blob = processed?.blob ?? file;
      const ext = processed?.ext ?? guessExt(file.type) ?? "bin";
      const contentType = processed?.type ?? (file.type || "application/octet-stream");

      setUploadProgress(40);

      // Use timestamp to avoid conflicts
      const timestamp = Date.now();
      const path = `${userId}/avatar_${timestamp}.${ext}`;
      
      // Upload with timeout handling
      const uploadPromise = supabase.storage
        .from(bucket)
        .upload(path, blob, {
          cacheControl: "3600",
          upsert: false, // Changed to false to avoid conflicts
          contentType,
        });

      // Add timeout (30 seconds)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Upload timeout - please check your connection and try again")), 30000)
      );

      const { error: upErr } = await Promise.race([uploadPromise, timeoutPromise]) as any;
      if (upErr) {
        // Provide more specific error messages
        if (upErr.message?.includes('duplicate')) {
          throw new Error("Upload conflict - please try again");
        } else if (upErr.message?.includes('size')) {
          throw new Error("File too large - please use a smaller image");
        } else {
          throw new Error(upErr.message || "Upload failed - please try again");
        }
      }

      setUploadProgress(70);

      // Get public URL with cache busting
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = `${pub.publicUrl}?t=${timestamp}`;

      setUploadProgress(90);

      // Update database with retry logic
      let dbUpdateSuccess = false;
      let retryCount = 0;
      
      while (!dbUpdateSuccess && retryCount < 3) {
        try {
          const { error: dbErr } = await supabase
            .from("profiles")
            .update({ 
              avatar_url: publicUrl,
              updated_at: new Date().toISOString() 
            })
            .eq("id", userId);
          
          if (dbErr) throw dbErr;
          dbUpdateSuccess = true;
        } catch (dbError: any) {
          retryCount++;
          if (retryCount >= 3) {
            throw new Error("Failed to save profile - please try again");
          }
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      setUploadProgress(100);

      // Update UI
      setPreview(publicUrl);
      onChange?.(publicUrl);
      
      // Show success message
      setSuccessMessage("Profile photo updated successfully!");
      setShowInstructions(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (e: any) {
      console.error('Avatar upload error:', e);
      setErr(e?.message || "Upload failed - please check your connection and try again");
      setUploadProgress(0);
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
        <div className="avatar-wrapper" style={{ position: 'relative' }}>
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
          
          {/* Progress Ring */}
          {busy && uploadProgress > 0 && (
            <div 
              className="progress-ring"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: size + 10,
                height: size + 10,
                borderRadius: '50%',
                background: `conic-gradient(#8b5cf6 ${uploadProgress * 3.6}deg, rgba(139,92,246,0.2) 0deg)`,
                padding: '3px',
                pointerEvents: 'none'
              }}
            >
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'white'
              }} />
            </div>
          )}
        </div>
        
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
              minWidth: "120px", // Prevent button size jumping
            }}
          >
            {busy ? `Uploading... ${uploadProgress}%` : "Change photo"}
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
      {(showInstructions || busy) && !err && !successMessage && (
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
          📸 JPG/PNG/WebP supported. Max 10MB. Large photos are auto-resized.
        </div>
      )}
      
      {/* Success Message */}
      {successMessage && (
        <div className="success-message" style={{
          marginTop: "0.5rem",
          padding: "0.5rem 0.75rem",
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "0.5rem",
          fontSize: "0.75rem",
          color: "#15803d",
          animation: "fadeIn 0.2s ease-in-out",
        }}>
          ✅ {successMessage}
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
          <button 
            onClick={() => setErr(null)}
            style={{
              marginLeft: "0.5rem",
              background: "none",
              border: "none",
              color: "#dc2626",
              cursor: "pointer",
              fontSize: "0.75rem",
              padding: "0",
              textDecoration: "underline"
            }}
          >
            Dismiss
          </button>
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

        .avatar-wrapper {
          display: inline-block;
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

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .upload-button {
            -webkit-tap-highlight-color: transparent;
            font-size: 0.8rem !important;
            padding: 0.75rem 1rem !important;
            min-height: 44px; /* Touch target size */
          }
          
          .avatar-image {
            -webkit-tap-highlight-color: transparent;
          }
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
