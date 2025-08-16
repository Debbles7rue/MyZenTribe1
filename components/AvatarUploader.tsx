"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/**
 * Drag to position + wheel/pinch to zoom.
 * Preview is a square "book frame". We pre-load the image (FileReader or URL)
 * so it always renders, then export an exact 512x512 PNG to Supabase Storage.
 */
type Props = {
  userId: string | null;
  value?: string | null;            // profiles.avatar_url
  onChange?: (url: string) => void; // called with public URL after save
  label?: string;
  size?: number;                    // preview square size (px)
};

export default function AvatarUploader({
  userId,
  value,
  onChange,
  label = "Profile photo",
  size = 200,
}: Props) {
  // Preview image as a CSS background (reliable and fast for pan/zoom visuals)
  const [src, setSrc] = useState<string | null>(value ?? null);

  // Natural dimensions of the actual image
  const [imgW, setImgW] = useState(0);
  const [imgH, setImgH] = useState(0);
  const imgElRef = useRef<HTMLImageElement | null>(null); // used for export

  // Ready flag -> only allow save once image has loaded
  const [ready, setReady] = useState(false);

  // Pan & zoom state
  const [zoom, setZoom] = useState(1); // 1..4 (multiplies base "cover" scale)
  const [dx, setDx] = useState(0);     // translation X within the square (px)
  const [dy, setDy] = useState(0);     // translation Y within the square (px)
  const minZoom = 1;
  const maxZoom = 4;

  const containerRef = useRef<HTMLDivElement>(null);

  // Base scale to cover the square at zoom=1
  const baseScale = useMemo(() => {
    if (!imgW || !imgH) return 1;
    return Math.max(size / imgW, size / imgH);
  }, [imgW, imgH, size]);

  const scaledW = useMemo(() => imgW * baseScale * zoom, [imgW, baseScale, zoom]);
  const scaledH = useMemo(() => imgH * baseScale * zoom, [imgH, baseScale, zoom]);

  // Clamp pan so you never see blank edges
  function clampPan(nx: number, ny: number) {
    const minX = Math.min(0, size - scaledW);
    const minY = Math.min(0, size - scaledH);
    const maxX = 0;
    const maxY = 0;
    return {
      nx: Math.min(maxX, Math.max(minX, nx)),
      ny: Math.min(maxY, Math.max(minY, ny)),
    };
  }

  // Load image (from file or URL) into an <img> for natural sizes and export
  async function loadImage(url: string) {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  }

  // Initialize/calc centered pan
  function recenter(zw = zoom) {
    const w = imgW * baseScale * zw;
    const h = imgH * baseScale * zw;
    const startX = (size - w) / 2;
    const startY = (size - h) / 2;
    const { nx, ny } = clampPan(startX, startY);
    setDx(nx);
    setDy(ny);
  }

  // When initial avatar URL from DB changes, preload it
  useEffect(() => {
    (async () => {
      if (!value) {
        setSrc(null);
        setReady(false);
        return;
      }
      try {
        setReady(false);
        const img = await loadImage(value);
        imgElRef.current = img;
        setImgW(img.naturalWidth);
        setImgH(img.naturalHeight);
        setSrc(value);
        setZoom(1);
        // center after sizes set
        setTimeout(() => { recenter(1); setReady(true); }, 0);
      } catch {
        // ignore — user can upload a new photo
        setReady(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // File picker → read as data URL, then preload
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const img = await loadImage(dataUrl);
        imgElRef.current = img;
        setImgW(img.naturalWidth);
        setImgH(img.naturalHeight);
        setSrc(dataUrl);
        setZoom(1);
        setReady(true);
        recenter(1);
      } catch {
        setReady(false);
      }
    };
    reader.readAsDataURL(f);
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
    if (!ready || !dragging.current || !last.current) return;
    const nx = dx + (e.clientX - last.current.x);
    const ny = dy + (e.clientY - last.current.y);
    const { nx: cx, ny: cy } = clampPan(nx, ny);
    setDx(cx); setDy(cy);
    last.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerUp() {
    dragging.current = false;
    last.current = null;
  }

  // Wheel/pinch zoom (zoom around cursor)
  function zoomAt(clientX: number, clientY: number, factor: number) {
    if (!ready) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const cx = rect ? clientX - rect.left : size / 2;
    const cy = rect ? clientY - rect.top : size / 2;

    const oldZoom = zoom;
    let newZoom = Math.min(maxZoom, Math.max(minZoom, oldZoom * factor));
    if (newZoom === oldZoom) return;

    const scaleOld = baseScale * oldZoom;
    const scaleNew = baseScale * newZoom;

    // Keep the pixel under cursor stationary
    const ix = (cx - dx) / scaleOld;
    const iy = (cy - dy) / scaleOld;

    const newDx = cx - ix * scaleNew;
    const newDy = cy - iy * scaleNew;

    const { nx, ny } = clampPan(newDx, newDy);
    setZoom(newZoom);
    setDx(nx);
    setDy(ny);
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    zoomAt(e.clientX, e.clientY, factor);
  }

  // Touch pinch
  const pinch = useRef<{ d: number; cx: number; cy: number; z0: number } | null>(null);
  function dist(t1: Touch, t2: Touch) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.hypot(dx, dy);
  }
  function onTouchStart(e: React.TouchEvent) {
    if (!ready) return;
    if (e.touches.length === 2 && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
      pinch.current = { d: dist(e.touches[0], e.touches[1]), cx, cy, z0: zoom };
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
      zoomAt(p.cx + (containerRef.current?.getBoundingClientRect().left ?? 0),
             p.cy + (containerRef.current?.getBoundingClientRect().top ?? 0),
             Math.min(maxZoom, Math.max(minZoom, p.z0 * ratio)) / zoom);
    } else if (e.touches.length === 1 && dragging.current && last.current) {
      const nx = dx + (e.touches[0].clientX - last.current.x);
      const ny = dy + (e.touches[0].clientY - last.current.y);
      const { nx: cx, ny: cy } = clampPan(nx, ny);
      setDx(cx); setDy(cy);
      last.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }
  function onTouchEnd() {
    dragging.current = false;
    last.current = null;
    pinch.current = null;
  }

  function onReset() {
    setZoom(1);
    recenter(1);
  }

  async function onSave() {
    if (!userId) return alert("Please sign in first.");
    if (!ready || !imgElRef.current) return alert("Choose a photo first.");

    // Render what you see to a 512x512 PNG
    const N = 512;
    const c = document.createElement("canvas");
    c.width = N;
    c.height = N;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const scaleRatio = N / size;
    const drawDx = dx * scaleRatio;
    const drawDy = dy * scaleRatio;
    const drawW = scaledW * scaleRatio;
    const drawH = scaledH * scaleRatio;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, N, N);
    ctx.drawImage(imgElRef.current, drawDx, drawDy, drawW, drawH);

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

  // Background style (this is the visible “frame”)
  const bgStyle: React.CSSProperties = src && ready
    ? {
        backgroundImage: `url(${src})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: `${dx}px ${dy}px`,
        backgroundSize: `${scaledW}px ${scaledH}px`,
      }
    : { background: "#fafafa" };

  return (
    <div className="uploader">
      <div className="stack">
        <label className="text-sm">{label}</label>

        {/* Square, clearly framed preview */}
        <div
          ref={containerRef}
          className="rounded-2xl overflow-hidden select-none touch-none"
          style={{
            width: size,
            height: size,
            border: "2px solid rgba(196,181,253,.9)",      // lavender frame
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,.03)",
            borderRadius: 16,
            cursor: ready ? "grab" : "default",
            ...bgStyle,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          aria-label="Drag to position. Scroll to zoom."
          role="img"
        />

        <input type="file" accept="image/*" onChange={onFile} />

        <div className="controls" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-neutral" onClick={onReset} disabled={!ready}>
            Reset
          </button>
          <button type="button" className="btn btn-brand" onClick={onSave} disabled={!ready}>
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
