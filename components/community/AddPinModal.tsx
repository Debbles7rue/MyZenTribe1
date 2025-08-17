// components/community/AddPinModal.tsx
"use client";

import { useMemo, useState } from "react";
import AddCircleForm from "@/components/AddCircleForm";

type CommunityLite = {
  id: string;
  title: string;
  category: string | null;
  zip: string | null;
};

export default function AddPinModal({
  communities,
  onClose,
  onSaved,
}: {
  communities: CommunityLite[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pick, setPick] = useState<string>("");         // dropdown pick
  const [selected, setSelected] = useState<string[]>([]); // chosen community ids

  const byId = useMemo(() => {
    const m: Record<string, CommunityLite> = {};
    communities.forEach((c) => (m[c.id] = c));
    return m;
  }, [communities]);

  function addCommunity() {
    if (!pick) return;
    if (!selected.includes(pick)) setSelected((s) => [...s, pick]);
    setPick("");
  }
  function removeCommunity(id: string) {
    setSelected((s) => s.filter((x) => x !== id));
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-sheet" style={{ maxWidth: 780 }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="h3">Add a pin to the map</h3>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        {/* Multi-community picker (optional) */}
        <div className="card p-3" style={{ marginBottom: 12 }}>
          <div className="label">Communities (optional — add one or many)</div>
          <div className="grid" style={{ gridTemplateColumns: "1fr auto", gap: 8 }}>
            <select className="input" value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">Select a community…</option>
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} {c.category ? `· ${c.category}` : ""} {c.zip ? `· ${c.zip}` : ""}
                </option>
              ))}
            </select>
            <button className="btn" onClick={addCommunity} disabled={!pick}>Add</button>
          </div>

          {selected.length === 0 ? (
            <div className="muted" style={{ marginTop: 8 }}>
              No specific community selected — that’s ok! Your pin will still appear on the global map.
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {selected.map((id) => (
                <span key={id} className="tag" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {byId[id]?.title || id}
                  <button className="btn btn-xs" onClick={() => removeCommunity(id)} title="Remove">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* The questionnaire form (no map) */}
        <AddCircleForm
          key={selected.join("|") || "no-communities"}
          communityIds={selected}      // <— multiple
          zip={null}
          onClose={onClose}
          onSaved={onSaved}
        />
      </div>
    </div>
  );
}
