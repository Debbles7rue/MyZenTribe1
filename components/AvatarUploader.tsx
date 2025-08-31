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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  // Cropper state
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null); // object URL
  const [imgWH, setImgWH] = useState<{w:number;h:number} | null>(null);
  const [zoom, setZoom] = useState(1);          // user-controlled zoom
  const [dx, setDx] = useState(0);              // drag offset x (px)
  const [dy, setDy] = useState(0);              // drag offset y (px)
  const cropSize = 260;                          // viewport size (square px)

  useEffect(() => { setPreview(null); setBroken(false); }, [value]);

  const showSrc = useMemo(() => {
    if (preview) return preview;
    if (value && !broken) return value;
    return "/default-avatar.png";
  }, [preview, value, broken]);

  function pickFile() { fileInputRef.current?.click(); }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setErr(null);

    // Open cropper with local object URL
    const objUrl = URL.createObjectURL(file);
    setCropSrc(objUrl);
    setZoom(1);
    setDx(0); setDy(0);
    // Load image dims
    const img = new Image();
    img.onload = () => {
      setImgWH({ w: img.naturalWidth, h: img.naturalHeight });
      setCropOpen(true);
    };
    img.onerror = () => {
      setErr("Could not read image.");
    };
    img.src = objUrl;

    // Clear the input so picking the same file twice still triggers change
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function saveCrop() {
    if (!userId || !cropSrc || !imgWH) return;
    setBusy(true);
    setErr(null);

    try {
      // Draw the cropped square to canvas (JPEG)
      const blob = await renderCroppedBlob(cropSrc, imgWH, { dx, dy, zoom, cropSize });
      const path = `${userId}/avatar_${Date.now()}.jpg`;

      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, blob, {
          cacheControl: "3600",
          upsert: true,
          contentType: "image/jpeg",
        });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);
      if (dbErr) throw dbErr;

      // Update UI
      setPreview(publicUrl);
      onChange?.(publicUrl);
      setCropOpen(false);
      cleanupCrop();
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  function cleanupCrop() {
    if (cropSrc) {
      try { URL.revokeObjectURL(cropSrc); } catch {}
    }
    setCropSrc(null);
    setImgWH(null);
    setDx(0); setDy(0); setZoom(1);
  }

  // Drag to move image inside viewport
  const drag = useDrag(({dx: mx, dy: my}) => {
    setDx((v) => v + mx);
    setDy((v) => v + my);
  });

  return (
    <div className="stack" style={{ gap: 8 }}>
      {label && <div className="label">{label}</div>}

      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={showSrc}
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
            <button
              className="btn"
              disabled={!userId || busy}
              onClick={async () => {
                try {
                  setBusy(true);
                  setErr(null);
                  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
                  if (error) throw error;
                  setPreview(null); setBroken(false);
                  onChange?.("");
                } catch (e: any) {
                  setErr(e?.message || "Could not remove photo");
                } finally { setBusy(false); }
              }}
            >
              Remove
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"     // no `capture`, so iOS lets users choose Camera or Photo Library
            hidden
            onChange={onFileSelected}
          />

          <div className="text-xs" style={{ color: "#6b7280" }}>
            Crop to fit. JPG/PNG/WebP recommended. HEIC uploads are supported but may not display in some browsers.
          </div>
          {err && <div className="text-xs" style={{ color: "#b91c1c" }}>{err}</div>}
        </div>
      </div>

      {/* Crop dialog */}
      {cropOpen && cropSrc && imgWH && (
        <div className="crop-modal">
          <div className="crop-sheet" role="dialog" aria-modal="true">
            <div className="crop-header">
              <div>Adjust your photo</div>
              <button className="crop-x" aria-label="Close" onClick={() => { setCropOpen(false); cleanupCrop(); }}>✕</button>
            </div>

            <div className="crop-body">
              <div
                className="crop-viewport"
                style={{ width: cropSize, height: cropSize }}
                {...drag.bindings}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cropSrc}
                  alt=""
                  draggable={false}
                  style={imageTransformStyle(imgWH, cropSize, zoom, dx, dy)}
                />
              </div>

              <div className="crop-controls">
                <label className="text-xs">Zoom</label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div className="crop-footer">
              <button className="btn" onClick={() => { setCropOpen(false); cleanupCrop(); }} disabled={busy}>Cancel</button>
              <button className="btn btn-brand" onClick={saveCrop} disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
          <div className="crop-backdrop" onClick={() => { setCropOpen(false); cleanupCrop(); }} />
        </div>
      )}

      <style jsx>{`
        .btn-brand {
          background: #8b5cf6;
          color: #fff;
          border: 1px solid rgba(0,0,0,.06);
        }
        .btn-brand:hover { filter: brightness(.95); }

        .crop-modal { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; }
        .crop-backdrop { position: fixed; inset:0; background: rgba(0,0,0,.4); }
        .crop-sheet {
          position: relative;
          width: min(94vw, 520px);
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 20px 50px rgba(0,0,0,.25);
          z-index: 101;
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .crop-header, .crop-footer { padding: 12px 14px; display:flex; align-items:center; justify-content:space-between; }
        .crop-header { border-bottom: 1px solid rgba(0,0,0,.06); font-weight: 600; }
        .crop-footer { border-top: 1px solid rgba(0,0,0,.06); gap: 8px; justify-content: flex-end; }
        .crop-x { background:transparent; border:none; font-size: 18px; cursor:pointer; padding:4px 6px; }
        .crop-body { padding: 14px; display: grid; gap: 14px; place-items:center; }
        .crop-viewport {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(0,0,0,.08);
          background: #111;
          touch-action: none; /* enables pointer drag without scroll hijack */
        }
        .crop-viewport img { user-select: none; will-change: transform; }
        .crop-controls { width: 100%; display: grid; gap: 6px; }
        input[type="range"] { width: 100%; }
      `}</style>
    </div>
  );
}

/* -------- Helpers -------- */

function useDrag(onDelta: (d: {dx:number; dy:number}) => void) {
  const last = useRef<{x:number;y:number}|null>(null);
  function onDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    last.current = { x: e.clientX, y: e.clientY };
  }
  function onMove(e: React.PointerEvent) {
    if (!last.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    onDelta({ dx, dy });
  }
  function onUp() { last.current = null; }
  return {
    bindings: { onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp },
  };
}

function imageTransformStyle(
  imgWH: {w:number;h:number},
  viewport: number,
  zoom: number,
  dx: number,
  dy: number
): React.CSSProperties {
  // Base cover scale so the shorter side fits the square, then multiply by user zoom.
  const cover = Math.max(viewport / imgWH.w, viewport / imgWH.h);
  const scale = cover * zoom;

  const imgW = imgWH.w * scale;
  const imgH = imgWH.h * scale;

  // Center the image, then apply user drag offsets.
  const left = (viewport - imgW) / 2 + dx;
  const top  = (viewport - imgH) / 2 + dy;

  return {
    position: "absolute",
    left, top,
    width: imgW,
    height: imgH,
  };
}

async function renderCroppedBlob(
  srcUrl: string,
  imgWH: {w:number;h:number},
  opts: { dx:number; dy:number; zoom:number; cropSize:number }
): Promise<Blob> {
  const { dx, dy, zoom, cropSize } = opts;

  // Compute same geometry as imageTransformStyle
  const cover = Math.max(cropSize / imgWH.w, cropSize / imgWH.h);
  const scale = cover * zoom;
  const imgW = imgWH.w * scale;
  const imgH = imgWH.h * scale;
  const left = (cropSize - imgW) / 2 + dx;
  const top  = (cropSize - imgH) / 2 + dy;

  // Map the viewport square to source rect on the original image
  const sx = Math.max(0, (-left) / scale);
  const sy = Math.max(0, (-top)  / scale);
  const sw = Math.min(imgWH.w, cropSize / scale);
  const sh = Math.min(imgWH.h, cropSize / scale);

  const canvas = document.createElement("canvas");
  canvas.width = 512;  // output size
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const img = await urlToImage(srcUrl);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  const blob = await canvasToBlob(canvas, "image/jpeg", 0.9);
  return blob;
}

function urlToImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Image load failed"));
    i.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve) => {
    if (canvas.toBlob) {
      canvas.toBlob((b) => {
        if (b) return resolve(b);
        // Fallback via dataURL
        const data = canvas.toDataURL(type, quality);
        resolve(dataURLtoBlob(data));
      }, type, quality);
    } else {
      const data = canvas.toDataURL(type, quality);
      resolve(dataURLtoBlob(data));
    }
  });
}

function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(",");
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}
