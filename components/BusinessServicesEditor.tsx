"use client";

import { useState } from "react";

export type Service = { id?: string; title: string; description?: string };

export default function BusinessServicesEditor({
  value,
  onChange,
  disabled,
}: {
  value: Service[];
  onChange: (next: Service[]) => void;
  disabled?: boolean;
}) {
  const [local, setLocal] = useState<Service[]>(value);

  function apply(next: Service[]) {
    setLocal(next);
    onChange(next);
  }

  function add() {
    apply([...local, { title: "", description: "" }]);
  }

  function remove(i: number) {
    const next = [...local];
    next.splice(i, 1);
    apply(next);
  }

  function update(i: number, patch: Partial<Service>) {
    const next = [...local];
    next[i] = { ...next[i], ...patch };
    apply(next);
  }

  return (
    <div className="stack">
      {local.map((s, i) => (
        <div key={i} className="card p-3" style={{ borderStyle: "dashed" }}>
          <label className="field">
            <span className="label">Service name</span>
            <input
              className="input"
              value={s.title}
              onChange={(e) => update(i, { title: e.target.value })}
              placeholder="Qi Gong / Sound Bath / Drum Circle"
              disabled={disabled}
            />
          </label>
          <label className="field">
            <span className="label">Short description (optional)</span>
            <textarea
              className="input"
              rows={3}
              value={s.description || ""}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder="Describe this specific service."
              disabled={disabled}
            />
          </label>
          <div className="right">
            <button type="button" className="btn" onClick={() => remove(i)} disabled={disabled}>
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
