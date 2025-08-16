"use client";

import Link from "next/link";
import { useState } from "react";

export default function GratitudePanel({ userId }: { userId: string | null }) {
  const [imgError, setImgError] = useState(false);

  return (
    <section className="card p-3">
      <div className="section-row">
        <h2 className="section-title" style={{ margin: 0 }}>Gratitude</h2>
        <Link className="btn btn-brand" href="/gratitude">Open</Link>
      </div>

      <div className="grid grid-cols-[120px_1fr] gap-3 items-start">
        <div
          className="rounded-xl overflow-hidden border"
          style={{ borderColor: "#e5e7eb", boxShadow: "0 8px 18px rgba(0,0,0,.08)" }}
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {!imgError ? (
            <img
              src="/images/gratitude-cover.png"
              alt=""
              className="w-full h-[80px] object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-[80px]" style={{ background: "linear-gradient(120deg,#5B2A86,#FF6A3D)" }} />
          )}
        </div>
        <p className="muted">
          Capture daily gratitude. Prompts & a gentle recap live on the full page.
        </p>
      </div>
    </section>
  );
}
