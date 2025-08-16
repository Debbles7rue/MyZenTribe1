"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  userId: string | null;
  /** Current avatar URL (from profiles.avatar_url) */
  value?: string | null;
  /** Called after save with the new public URL */
  onChange?: (url: string) => void;
  label?: string;
  /** Preview size in px */
  size?: number;
};

/**
 * AvatarUploader
 * - Choose image, adjust center/zoom, save
 * - Saves square 512x512 PNG to storage bucket "avatars" (path: public/<userId>.png)
 * - Updates profiles.avatar_url to the new public URL
 */
export default function AvatarUploader({
  userId,
  value,
  onChange,
  label = "Upload photo",
  size = 180,
}: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(value ?? null);
  const [fileUrl, setFileUrl] = useState<string | null>(null); // object URL of chosen file
  const [zoom, setZoom] = useState(1.2); // 1.0–2.5
  const [posX, setPosX] = useState(50);  // 0–100
  const [posY, setPosY] = useState(50);  // 0–100
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (value) setPreviewUrl(value);
  }, [value]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setFileUrl(url);
    setPreviewUrl(url);
    setError(null);
  };

  const reset = () => {
    setZoom(1.2);
    setPosX(50);
    setPosY(50);
  };

  const exportPng = useCallback(async (): Promise<Blob> => {
    const img = imgRef.current;
    if (!img) throw new Error("Image not ready");
    const N = 512;
    const c = document.createElement("canvas");
    c.width = N;
    c.height = N;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const cover = Math.max(N / iw, N / ih);
    const scale = cover * zoom;

    const cx = posX / 100;
    const cy = posY / 100;

    const dx = N / 2 - cx * iw * scale;
    const dy = N / 2 - cy * ih * scale;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, N, N);
    ctx.drawImage(img, dx, dy, iw * scale, ih * scale);

    return await new Promise<Blob>((res, rej) =>
      c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png", 0.92)
    );
  }, [zoom, posX, posY]);

  const onSave = async () => {
    try {
      setSaving(true);
      setError(null);
      if (!userId) throw new Error("Not signed in.");
      if (!previewUrl) throw new Error("Choose a photo first.");

      const blob = await exportPng();
      const path = `public/${userId}.png`;

      const { error: upErr } = await supabase
        .storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/png", cacheControl: "3600" });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = pub?.publicUrl;
      if (!publicUrl) throw new Error("Could not get public URL");

      // persist to profiles.avatar_url
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);
      if (dbErr) throw dbErr;

      setFileUrl(null);
      setPreviewUrl(publicUrl);
      onChange?.(publicUrl);
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="uploader">
      <div className="stack">
        <label className="text-sm">{label}</label>

        {/* square preview */}
        <div
          className="rounded-2xl overflow-hidden border"
          style={{
            width: size,
            height: size,
            borderColor: "#e5e7eb",
            background: "#fafafa",
          }}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={previewUrl}
              alt="Avatar preview"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: `${posX}% ${posY}%`, // visual only (final crop uses canvas)
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

        <input type="file" accept="image/*" onChange={onFile} />

        {/* adjusters */}
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm">Zoom</span>
            <input type="range" min={1} max={2.5} step={0.01} value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-sm">Center X</span>
              <input type="range" min={0} max={100} value={posX}
                onChange={(e) => setPosX(parseInt(e.target.value))} />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Center Y</span>
              <input type="range" min={0} max={100} value={posY}
                onChange={(e) => setPosY(parseInt(e.target.value))} />
            </label>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="controls" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-neutral" onClick={() => { setPreviewUrl(value ?? null); setFileUrl(null); reset(); }}>
            Reset
          </button>
          <button type="button" className="btn btn-brand" onClick={onSave} disabled={!previewUrl || saving}>
            {saving ? "Saving…" : "Save photo"}
          </button>
        </div>

        <p className="muted" style={{ fontSize: 12 }}>We save a 512×512 square. You can re-center any time.</p>
      </div>
    </div>
  );
}
