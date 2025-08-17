"use client";

import { useEffect, useMemo, useState } from "react";
import AvatarUpload from "@/components/AvatarUpload";

export type Service = {
  id?: string;
  title: string;
  description?: string;
  image_url?: string;
};

type Props = {
  value: Service[];
  onChange: (next: Service[]) => void;
  disabled?: boolean;
  userId: string | null;
};

// Local shape with a stable key for React rendering
type LocalService = Service & { _key: string };

function normalize(list: Service[]): LocalService[] {
  return (list ?? []).map((s) => ({
    ...s,
    _key: s.id ?? (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Math.random()}`),
  }));
}

export default function BusinessServicesEditor({ value, onChange, disabled, userId }: Props) {
  const [local, setLocal] = useState<LocalService[]>(() => normalize(value));

  // Keep local state in sync if parent value changes
  useEffect(() => {
    setLocal(normalize(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value)]);

  function apply(next: LocalService[]) {
    setLocal(next);
    // Strip the local-only _key before bubbling up
    const out: Service[] = next.map(({ _key, ...rest }) => rest);
    onChange(out);
  }

  function add() {
    const blank: LocalService = {
      _key: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Math.random()}`,
      title: "",
      description: "",
      image_url: "",
    };
    apply([...local, blank]);
  }

  function remove(i: number) {
    const next = [...local];
    next.splice(i, 1);
    apply(next);
  }

  function duplicate(i: number) {
    const src = local[i];
    const copy: LocalService = {
      ...src,
      id: undefined, // avoid accidental id reuse
      _key: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Math.random()}`,
    };
    const next = [...local];
    next.splice(i + 1, 0, copy);
    apply(next);
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= local.length) return;
    const next = [...local];
    const [item] = next.splice(i, 1);
    next.splice(j, 0, item);
    apply(next);
  }

  function update(i: number, patch: Partial<Service>) {
    const next = [...local];
    next[i] = { ...next[i], ...patch };
    apply(next);
  }

  // simple required validation for title
  const errors = useMemo(() => {
    return local.map((s) => ({
      title: !s.title?.trim() ? "Service name is required" : null,
    }));
  }, [local]);

  return (
    <div className="stack">
      {local.map((s, i) => (
        <div key={s._key} className="card p-3" style={{ borderStyle: "dashed" }}>
          {/* Image uploader */}
          <div style={{ marginBottom: 8 }}>
            <AvatarUpload
              userId={userId}
              value={s.image_url || ""}
              onChange={(url) => update(i, { image_url: url })}
              bucket="service-photos"
              label="Upload service photo"
            />
            {!!s.image_url && (
              <div className="mt-2">
                <button
                  type="button"
                  className="btn"
                  onClick={() => update(i, { image_url: "" })}
                  disabled={disabled}
                >
                  Remove photo
                </button>
              </div>
            )}
          </div>

          {/* Title */}
          <label className="field">
            <span className="label">Service name <span className="text-red-600">*</span></span>
            <input
              className="input"
              value={s.title}
              onChange={(e) => update(i, { title: e.target.value })}
              placeholder="Qi Gong / Sound Bath / Drum Circle"
              disabled={disabled}
              aria-invalid={!!errors[i].title}
              aria-describedby={errors[i].title ? `svc-${s._key}-title-err` : undefined}
            />
            {errors[i].title && (
              <small id={`svc-${s._key}-title-err`} className="text-red-600">
                {errors[i].title}
              </small>
            )}
          </label>

          {/* Description */}
          <label className="field">
            <span className="label">Short description (optional)</span>
            <textarea
              className="input"
              rows={3}
              value={s.description || ""}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder="Describe this service."
              disabled={disabled}
            />
          </label>

          {/* Row actions: reorder / duplicate / remove */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn"
              onClick={() => move(i, -1)}
              disabled={disabled || i === 0}
              aria-label="Move up"
              title="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => move(i, +1)}
              disabled={disabled || i === local.length - 1}
              aria-label="Move down"
              title="Move down"
            >
              ↓
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => duplicate(i)}
              disabled={disabled}
              aria-label="Duplicate"
              title="Duplicate"
            >
              Duplicate
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => remove(i)}
              disabled={disabled}
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      <div className="right">
        <button type="button" className="btn btn-brand" onClick={add} disabled={disabled}>
          + Add another service
        </button>
      </div>
    </div>
  );
}
