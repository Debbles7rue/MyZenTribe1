"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/**
 * Drag to position. Scroll/pinch to zoom. Save to Supabase Storage "avatars".
 * - Preview area is a square (size px)
 * - We render the image as an absolutely-positioned <img> with translate + scale
 * - We clamp panning so you never see blank edges
 * - Export uses the same math to render a 512x512 PNG to the bucket
 */
type Props = {
  userId: string | null;
  value?: string | null;           // current avatar_url
  onChange?: (url: string) => void;
  label?: string;
  size?: number;                   // preview square size (px)
};

export default function AvatarUploader({
  userId,
  value,
  onChange,
  label = "Profile photo",
  size = 180,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const objUrlRef = useRef<string | null>(null);

  const [src, setSrc] = useState<string | null>(value ?? null);
  const [imgW, setImgW] = useState<number>(0);
  const [imgH, setImgH] = useState<number>(0);
  const [ready, setReady] = useState(false);

  // Pan & zoom state
  const [zoom, setZoom] = useState(1);            // 1..4 (multiplier on base "cover" scale)
  const [dx, setDx] = useState(0);                // translation X in preview px
  const [dy, setDy] = useState(0);                // translation Y in preview px
  const minZoom = 1;
  const maxZoom = 4;

  // Derived: cover scale to ensure image fills the square at zoom=1
  const baseScale = useMemo(() => {
    if (!imgW || !imgH) return 1;
    return Math.max(size / imgW, size / imgH);
  }, [imgW, imgH, size]);

  const scaledW = useMemo(() => imgW * baseScale * zoom, [imgW, baseScale, zoom]);
  const scaledH = useMemo(() => imgH * baseScale * zoom, [imgH, baseScale, zoom]);

  // Clamp pan so no blank edges
  function clampPan(nx: number, ny: number) {
    const minX = Math.min(0, size - scaledW);
    const minY = Math.min(0, size - scaledH);
    const maxX = 0;
    const maxY = 0;
    nx = Math.min(maxX, Math.max(minX, nx));
    ny = Math.min(maxY, Math.max(minY, ny));
    return { nx, ny };
  }

  // Initialize pan to center image
  useEffect(() => {
    if (!imgW || !imgH) return;
    const w = imgW * baseScale * zoom;
    const h = imgH * baseScale * zoom;
    const startX = (size - w) / 2;
    const startY = (size - h) / 2;
    const { nx, ny } = clampPan(startX, startY);
    setDx(nx);
    setDy(ny);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgW, imgH, baseScale]);

  // Handle file choose
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    // revoke previous object URL if any
    if (objUrlRef.current) URL.revokeObjectURL(objUrlRef.current);
    const url = URL.createObjectURL(f);
    objUrlRef.current = url;
    setSrc(url);
    setReady(false);
    setZoom(1);
  }

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (objUrlRef.current) URL.revokeObjectURL(objUrlRef.current);
    };
  }, []);

  // When remote/public URL changes from DB
  useEffect(() => {
    if (value && value !== src) setSrc(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Image onload → set natural size
  function onImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const el = e.currentTarget;
    setImgW(el.naturalWidth || 0);
    setImgH(el.naturalHeight || 0);
  }

  // Drag to pan (pointer events)
  const dragging = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    if (!ready) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current || !ready) return;
    const l = last.current;
    if (!l) return;
    const dxNew = dx + (e.clientX - l.x);
    const dyNew = dy + (e.clientY - l.y);
    const clamped = clampPan(dxNew, dyNew);
    setDx(clamped.nx);
    setDy(clamped.ny);
    last.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerUp(e: React.PointerEvent) {
    dragging.current = false;
    last.current = null;
  }

  // Wheel to zoom (cursor-centered)
  function onWheel(e: React.WheelEvent) {
    if (!ready) return;
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    const cx = rect ? e.clientX - rect.left : size / 2;
    const cy = rect ? e.clientY - rect.top : size / 2;

    const oldZoom = zoom;
    const delta = -e.deltaY; // scroll up = zoom in
    const zoomStep = (delta > 0 ? 1.05 : 0.95);
    let newZoom = Math.min(maxZoom, Math.max(minZoom, oldZoom * zoomStep));
    if (newZoom === oldZoom) return;

    // keep the point under cursor stable
    const scaleOld = baseScale * oldZoom;
    const scaleNew = baseScale * newZoom;

    // current image position at cursor in image-space → we adjust pan so same pixel stays under cursor
    const ix = (cx - dx) / scaleOld;
    const iy = (cy - dy) / scaleOld;

    const newDx = cx - ix * scaleNew;
    const newDy = cy - iy * scaleNew;

    const clamped = clampPan(newDx, newDy);
    setZoom(newZoom);
    setDx(clamped.nx);
    setDy(clamped.ny);
  }

  // Touch pinch to zoom (basic)
  const pinch = useRef<{ d: number; zx: number; zy: number; z0: number } | null>(null);
  function dist(t1: Touch, t2: Touch) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.hypot(dx, dy);
  }
  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2 && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
      pinch.current = { d: dist(e.touches[0], e.touches[1]), zx: cx, zy: cy, z0: zoom };
    } else if (e.touches.length === 1) {
      dragging.current = true;
      last.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!ready) return;
    if (e.touches.length === 2 && pinch.current) {
      e.preventDefault();
      const p = pinch.current;
      const nd = dist(e.touches[0], e.touches[1]);
      const ratio = nd / p.d;
      let newZoom = Math.min(maxZoom, Math.max(minZoom, p.z0 * ratio));

      const scaleOld = baseScale * zoom;
      const scaleNew = baseScale * newZoom;

      const ix = (p.zx - dx) / scaleOld;
      const iy = (p.zy - dy) / scaleOld;

      const newDx = p.zx - ix * scaleNew;
      const newDy = p.zy - iy * scaleNew;

      const clamped = clampPan(newDx, newDy);
      setZoom(newZoom);
      setDx(clamped.nx);
      setDy(clamped.ny);
    } else if (e.touches.length === 1 && dragging.current && last.current) {
      const lx = last.current.x;
      const ly = last.current.y;
      const cx = e.touches[0].clientX;
      const cy = e.touches[0].clientY;
      const clamped = clampPan(dx + (cx - lx), dy + (cy - ly));
      setDx(clamped.nx);
      setDy(clamped.ny);
      last.current = { x: cx, y: cy };
    }
  }
  function onTouchEnd() {
    dragging.current = false;
    last.current = null;
    pinch.current = null;
  }

  async function onSave() {
    if (!userId) return alert("Please sign in first.");
    if (!src || !imgRef.current) return alert("Choose a photo first.");

    // Render the exact view to a 512x512 PNG
    const N = 512;
    const c = document.createElement("canvas");
    c.width = N;
    c.height = N;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const scaleRatio = N / size;
    const drawDx = dx * scaleRatio;
    const drawDy = dy * scaleRatio;
    const drawW = scaledW * (N / size);
    const drawH = scaledH * (N / size);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, N, N);
    ctx.drawImage(imgRef.current, drawDx, drawDy, drawW, drawH);

    const blob: Blob = await new Promise((res) =>
      c.toBlob((b) => res(b as Blob), "image/png", 0.92)
    );

    const path = `public/${userId}.png`;
    const { error: upErr } = await supabase
      .storage
      .from("avatars")
      .upload(path, blob, { upsert: true, contentType: "image/png", cacheControl: "3600" });
    if (upErr) {
      alert(upErr.message || "Upload failed");
      return;
    }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    if (!pub?.publicUrl) {
      alert("Could not get public URL");
      return;
    }

    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_url: pub.publicUrl })
      .eq("id", userId);
    if (dbErr) {
      alert(dbErr.message || "Failed to update profile");
      return;
    }

    onChange?.(pub.publicUrl);
  }

  function onReset() {
    setZoom(1);
    // re-center
    const w = imgW * baseScale * 1;
    const h = imgH * baseScale * 1;
    const startX = (size - w) / 2;
    const startY = (size - h) / 2;
    const { nx, ny } = clampPan(startX, startY);
    setDx(nx);
    setDy(ny);
  }

  return (
    <div className="uploader">
      <div className="stack">
        <label className="text-sm">{label}</label>

        {/* Square preview */}
        <div
          ref={containerRef}
          className="rounded-2xl overflow-hidden border select-none touch-none"
          style={{
            width: size,
            height: size,
            borderColor: "#e5e7eb",
            background: "#fafafa",
            position: "relative",
            cursor: ready ? "grab" : "default",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={src}
              onLoad={onImgLoad}
              alt="Avatar"
              draggable={false}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                transform: `translate(${dx}px, ${dy}px) scale(${baseScale * zoom})`,
                transformOrigin: "top left",
                width: imgW,
                height: imgH,
                willChange: "transform",
                imageRendering: "auto",
              }}
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-sm text-zinc-500">
              No photo yet
            </div>
          )}
        </div>

        <input type="file" accept="image/*" onChange={onFile} />

        <div className="controls" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-neutral" onClick={onReset}>Reset</button>
          <button type="button" className="btn btn-brand" onClick={onSave} disabled={!src}>
            Save photo
          </button>
        </div>

        <p className="muted" style={{ fontSize: 12 }}>
          Drag to position. Use your mouse wheel (or pinch) to zoom. We save a 512×512 square.
        </p>
      </div>
    </div>
  );
}
