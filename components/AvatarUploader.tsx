"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  /** Optional current avatar URL to show on load */
  initialUrl?: string | null;
  /** Square preview size in px (UI only, not saved size) */
  size?: number;
  /** Callback after save so parents can refresh UI */
  onSaved?: (publicUrl: string) => void;
};

/**
 * AvatarUploader
 * - Lets user pick an image, adjust center (X/Y) and zoom
 * - Saves a square 512x512 PNG to Supabase Storage bucket "avatars"
 * - Updates "profiles.avatar_url" for the current user
 *
 * Requirements:
 * - Supabase Storage bucket named "avatars" (public read is easiest)
 * - Table "profiles" with columns: id (uuid PK = auth.uid) and avatar_url (text)
 */
export default function AvatarUploader({ initialUrl, size = 180, onSaved }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(initialUrl ?? null);

  const [fileUrl, setFileUrl] = useState<string | null>(null); // object URL for preview
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null);

  const [zoom, setZoom] = useState(1.2); // 1.0–2.5
  const [posX, setPosX] = useState(50);  // 0–100 (%)
  const [posY, setPosY] = useState(50);  // 0–100 (%)

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // get the signed-in user id
  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (data?.user?.id) setUserId(data.user.id);
      if (error) setError(error.message);
    });
  }, []);

  // load the selected image element so we can read natural size
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setFileUrl(url);
    setCurrentUrl(null); // we’ll show the selected file instead
    setError(null);
  };

  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const handleLoad = () => setImgNatural({ w: el.naturalWidth, h: el.naturalHeight });
    el.addEventListener("load", handleLoad);
    setImgEl(el);
    return () => el.removeEventListener("load", handleLoad);
  }, [fileUrl]);

  const hasImage = Boolean(fileUrl || currentUrl);

  // Canvas export: draw a 512x512 square using current center/zoom
  async function exportPng(): Promise<Blob> {
    if (!imgEl) throw new Error("Image not ready");
    const N = 512;
    const c = document.createElement("canvas");
    c.width = N;
    c.height = N;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    const iw = imgEl.naturalWidth;
    const ih = imgEl.naturalHeight;

    // base cover scale to fill a square
    const coverScale = Math.max(N / iw, N / ih);
    const scale = coverScale * zoom;

    // center (0–1) picked by the sliders
    const cx = posX / 100; // 0..1
    const cy = posY / 100;

    // where that center should appear on canvas (middle)
    const drawX = N / 2 - cx * iw * scale;
    const drawY = N / 2 - cy * ih * scale;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, N, N);
    ctx.drawImage(imgEl, drawX, drawY, iw * scale, ih * scale);

    return await new Promise<Blob>((resolve, reject) =>
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png", 0.92)
    );
  }

  async function onSave() {
    try {
      setSaving(true);
      setError(null);
      if (!userId) throw new Error("Not signed in.");
      if (!hasImage) throw new Error("Choose a photo first.");

      const blob = await exportPng();
      const path = `public/${userId}.png`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/png", cacheControl: "3600" });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = pub?.publicUrl;
      if (!publicUrl) throw new Error("Could not get public URL.");

      // write to profiles.avatar_url
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);
      if (dbErr) throw dbErr;

      setCurrentUrl(publicUrl);
      setFileUrl(null);
      onSaved?.(publicUrl);
    } catch (e: any) {
      setError(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function resetAdjust() {
    setZoom(1.2);
    setPosX(50);
    setPosY(50);
  }

  const previewSrc = fileUrl || currentUrl || "";

  return (
    <section className="card p-3">
      <h3 className="section-title">Profile photo</h3>
      <p className="muted">Upload and adjust your image. Square crop is used across the app.</p>

      <div className="grid gap-4 sm:grid-cols-[auto,1fr] items-start">
        {/* Square preview */}
        <div
          className="rounded-2xl overflow-hidden border"
          style={{
            width: size,
            height: size,
            background: "#fafafa",
            borderColor: "#e5e7eb",
          }}
        >
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={previewSrc}
              alt="Avatar preview"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                // for visual preview only; final crop is done in canvas
                objectPosition: `${posX}% ${posY}%`,
                transform: `scale(${zoom})`,
                transformOrigin: "center",
              }}
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-sm text-zinc-500">
              No photo yet
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-3">
          <label className="grid gap-1">
            <span className="text-sm">Choose image</span>
            <input type="file" accept="image/*" onChange={onFileChange} />
          </label>

          <label className="grid gap-1">
            <span className="text-sm">Zoom</span>
            <input
              type="range"
              min={1}
              max={2.5}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-sm">Center X</span>
              <input
                type="range"
                min={0}
                max={100}
                value={posX}
                onChange={(e) => setPosX(parseInt(e.target.value))}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Center Y</span>
              <input
                type="range"
                min={0}
                max={100}
                value={posY}
                onChange={(e) => setPosY(parseInt(e.target.value))}
              />
            </label>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="controls" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-neutral" type="button" onClick={resetAdjust} disabled={!previewSrc}>
              Reset
            </button>
            <button className="btn btn-brand" type="button" onClick={onSave} disabled={saving || !previewSrc}>
              {saving ? "Saving…" : "Save photo"}
            </button>
          </div>

          <p className="muted" style={{ fontSize: 12 }}>
            Tip: We store a 512×512 square. You can re-upload and re-center anytime.
          </p>
        </div>
      </div>
    </section>
  );
}
