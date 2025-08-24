// components/PlannerItemModal.tsx
"use client";

import { Dialog } from "@headlessui/react";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { PlannerItem } from "@/components/TaskTray";

export default function PlannerItemModal({
  open,
  item,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  item: PlannerItem | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    kind: "todo" as "todo" | "reminder",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      title: item?.title ?? "",
      kind: (item?.kind as any) ?? "todo",
    });
  }, [open, item?.id]);

  if (!open || !item) return null;

  const save = async () => {
    await supabase.from("planner_items").update({ title: form.title, kind: form.kind }).eq("id", item.id);
    onSaved();
  };

  const del = async () => {
    if (!confirm("Delete this item?")) return;
    await supabase.from("planner_items").delete().eq("id", item.id);
    onDeleted();
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[55]">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-end justify-center p-4 md:items-center">
        <Dialog.Panel className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl">
          <Dialog.Title className="text-lg font-semibold">Planner item</Dialog.Title>

          <div className="mt-3">
            <div className="field">
              <label className="label">Title</label>
              <input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="field mt-3">
              <label className="label">Type</label>
              <select className="select" value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as any }))}>
                <option value="todo">To-do</option>
                <option value="reminder">Reminder</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn" onClick={onClose}>Close</button>
            <button className="btn" onClick={del}>Delete</button>
            <button className="btn btn-brand" onClick={save}>Save</button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
