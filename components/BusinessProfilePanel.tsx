// components/BusinessServicesEditor.tsx
"use client";

import { useMemo } from "react";

export type Service = {
  id?: string;                 // client-side id for editing; not required in DB
  title?: string | null;
  description?: string | null;
  image_url?: string | null;   // optional: public URL to an image
  price?: string | null;       // keep as string for flexible '$75' or 'Varies'
  duration?: string | null;    // e.g., '60 min'
  active?: boolean | null;     // toggle visibility
  booking_url?: string | null; // optional link for direct booking
};

type Props = {
  userId: string | null;             // not used yet, kept for parity and future upload hooks
  value: Service[];
  onChange: (services: Service[]) => void;
  disabled?: boolean;
};

export default function BusinessServicesEditor({ value, onChange, disabled }: Props) {
  const services = Array.isArray(value) ? value : [];

  const add = () => {
    const next: Service[] = [
      ...services,
      {
        id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
        title: "",
        description: "",
        image_url: "",
        price: "",
        duration: "",
        active: true,
        booking_url: "",
      },
    ];
    onChange(next);
  };

  const removeAt = (idx: number) => {
    const next = [...services];
    next.splice(idx, 1);
    onChange(next);
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= services.length) return;
    const next = [...services];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const set = (idx: number, patch: Partial<Service>) => {
    const next = [...services];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const empty = useMemo(() => services.length === 0, [services.length]);

  return (
    <div className="stack">
      {empty ? (
        <div className="stack">
          <p className="muted">Add your first service. Examples: Sound Bath, Reiki Session, Drum Circle, Qi Gong Class.</p>
          <div>
            <button className="btn btn-brand" onClick={add} disabled={disabled}>
              Add service
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-3">
            {services.map((s, i) => (
              <article key={(s.id ?? "") + ":" + i} className="card p-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold">Service #{i + 1}</h3>
                  <div className="flex items-center gap-2">
                    <button className="btn" onClick={() => move(i, i - 1)} disabled={disabled || i === 0} aria-label="Move up">
                      ↑
                    </button>
                    <button
                      className="btn"
                      onClick={() => move(i, i + 1)}
                      disabled={disabled || i === services.length - 1}
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button className="btn" onClick={() => removeAt(i)} disabled={disabled} aria-label="Remove service">
                      Remove
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="field">
                    <span className="label">Title</span>
                    <input
                      className="input"
                      value={s.title ?? ""}
                      onChange={(e) => set(i, { title: e.target.value })}
                      placeholder="e.g., Crystal Bowl Sound Bath"
                      disabled={disabled}
                    />
                  </label>

                  <label className="field">
                    <span className="label">Image URL (optional)</span>
                    <input
                      className="input"
                      value={s.image_url ?? ""}
                      onChange={(e) => set(i, { image_url: e.target.value })}
                      placeholder="https://…/photo.jpg"
                      disabled={disabled}
                    />
                  </label>
                </div>

                <label className="field">
                  <span className="label">Description</span>
                  <textarea
                    className="input"
                    rows={4}
                    value={s.description ?? ""}
                    onChange={(e) => set(i, { description: e.target.value })}
                    placeholder="What people can expect, instruments used, who it helps, etc."
                    disabled={disabled}
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="field">
                    <span className="label">Price (optional)</span>
                    <input
                      className="input"
                      value={s.price ?? ""}
                      onChange={(e) => set(i, { price: e.target.value })}
                      placeholder="$75"
                      disabled={disabled}
                    />
                  </label>

                  <label className="field">
                    <span className="label">Duration (optional)</span>
                    <input
                      className="input"
                      value={s.duration ?? ""}
                      onChange={(e) => set(i, { duration: e.target.value })}
                      placeholder="60 min"
                      disabled={disabled}
                    />
                  </label>

                  <label className="field">
                    <span className="label">Booking URL (optional)</span>
                    <input
                      className="input"
                      value={s.booking_url ?? ""}
                      onChange={(e) => set(i, { booking_url: e.target.value })}
                      placeholder="https://…/book-now"
                      disabled={disabled}
                    />
                  </label>
                </div>

                <label className="mt-1 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!s.active}
                    onChange={(e) => set(i, { active: e.target.checked })}
                    disabled={disabled}
                  />
                  Active (show on business profile)
                </label>

                {s.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.image_url}
                    alt={s.title || "Service photo"}
                    className="mt-3"
                    style={{
                      width: "100%",
                      height: 140,
                      objectFit: "cover",
                      borderRadius: 12,
                      border: "1px solid #eee",
                    }}
                  />
                ) : null}
              </article>
            ))}
          </div>

          <div className="right">
            <button className="btn" onClick={add} disabled={disabled}>
              Add another service
            </button>
          </div>
        </>
      )}
    </div>
  );
}
