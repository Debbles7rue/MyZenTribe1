// components/TaskTray.tsx
"use client";

import React, { useMemo, useState } from "react";

export type PlannerItem = {
  id: string;
  user_id: string;
  kind: "todo" | "reminder";
  title: string;
  notes: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  created_at: string;
  updated_at: string;
};

export default function TaskTray({
  items,
  onCreate,
  onDelete,
  onBeginDrag,
  onEndDrag,
}: {
  items: PlannerItem[];
  onCreate: (payload: { kind: "todo" | "reminder"; title: string }) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  onBeginDrag: (item: PlannerItem) => void;
  onEndDrag: () => void;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"todo" | "reminder">("todo");

  const unscheduled = useMemo(
    () => (items || []).filter((i) => !i.scheduled_start || !i.scheduled_end),
    [items]
  );

  const color = (k: "todo" | "reminder") => (k === "reminder" ? "#ef4444" : "#16a34a");

  return (
    <aside className="task-tray card p-3" aria-label="To-dos and reminders">
      <div className="mb-2 font-semibold">To-dos & Reminders</div>

      <div className="flex gap-2 mb-2">
        <select
          className="select"
          value={kind}
          onChange={(e) => setKind(e.target.value as any)}
          aria-label="Item type"
        >
          <option value="todo">To-do</option>
          <option value="reminder">Reminder</option>
        </select>
        <input
          className="input flex-1"
          placeholder={kind === "todo" ? "New to-do…" : "New reminder…"}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && title.trim()) {
              onCreate({ kind, title: title.trim() });
              setTitle("");
            }
          }}
        />
        <button
          className="btn btn-brand"
          onClick={() => {
            if (!title.trim()) return;
            onCreate({ kind, title: title.trim() });
            setTitle("");
          }}
        >
          Add
        </button>
      </div>

      <div className="muted text-sm mb-2">Drag onto the calendar to schedule.</div>

      <ul className="space-y-2">
        {unscheduled.length === 0 ? (
          <li className="text-sm text-neutral-500">Nothing here — add one above.</li>
        ) : (
          unscheduled.map((i) => (
            <li
              key={i.id}
              className="tray-chip"
              draggable
              onDragStart={() => onBeginDrag(i)}
              onDragEnd={() => onEndDrag()}
              style={{ borderLeft: `4px solid ${color(i.kind)}` }}
            >
              <div className="flex items-center justify-between gap-2">
                <span>{i.title}</span>
                <button className="btn" onClick={() => onDelete(i.id)} aria-label="Delete">
                  ✕
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}
